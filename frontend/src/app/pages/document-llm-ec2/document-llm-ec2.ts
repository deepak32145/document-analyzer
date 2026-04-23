import { Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SnackbarService } from '../../shared/snackbar';

export interface NerEntity { text: string; label: string; score: number | null; }
export interface Ec2Result {
  filename: string;
  docType: string | null;
  extractedText: string;
  classificationText: string;
  structuredData: { key: string; value: string }[];
  nerEntities: NerEntity[];
}

@Component({
  selector: 'app-document-llm-ec2',
  imports: [FormsModule, CommonModule],
  templateUrl: './document-llm-ec2.html',
  styleUrl: './document-llm-ec2.scss',
})
export class DocumentLlmEc2 {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  documentType  = 'not-known';
  uploadedFile: File | null = null;
  uploading     = false;
  uploadBtnText = 'Upload & Analyze';

  uploadProgress    = 0;
  uploadCurrentStep = '';
  uploadSteps: { label: string; durationMs: number; progress: number }[] = [];

  ec2Result: Ec2Result | null = null;
  documentObjectUrl: SafeResourceUrl | null = null;
  documentRawUrl: string | null = null;
  isImage = false;

  documentTypes = [
    { value: 'not-known',      label: 'Not Known' },
    { value: 'bank-statement', label: 'Bank Statement' },
    { value: 'tax-return',     label: 'Tax Return' },
  ];

  constructor(
    private snackbar: SnackbarService,
    private sanitizer: DomSanitizer,
    private zone: NgZone
  ) {}

  triggerUpload() {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    this.uploading        = true;
    this.uploadBtnText    = 'Analyzing...';
    this.uploadProgress   = 0;
    this.uploadCurrentStep = '';
    this.uploadSteps      = [];
    this.ec2Result        = null;
    this.uploadedFile     = null;

    const formData = new FormData();
    formData.append('files', file);
    formData.append('documentType', this.documentType);

    let lastEventTime = Date.now();
    let lastEvent: any = null;

    fetch('http://172.16.3.190:80/upload/streams', { method: 'POST', body: formData })
      .then(async (response) => {
        if (!response.ok || !response.body) throw new Error('Upload failed');

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer  = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const msg = JSON.parse(trimmed);
              const now = Date.now();
              const durationMs = now - lastEventTime;
              lastEventTime = now;

              this.zone.run(() => {
                if (lastEvent) {
                  this.uploadSteps.push({ label: lastEvent.current_step, durationMs, progress: lastEvent.progress ?? 0 });
                }
                this.uploadProgress    = msg.progress ?? this.uploadProgress;
                this.uploadCurrentStep = msg.current_step ?? '';
                lastEvent = msg;
              });
            } catch { /* skip non-JSON lines */ }
          }
        }

        this.zone.run(() => {
          if (lastEvent) {
            this.uploadSteps.push({ label: lastEvent.current_step, durationMs: Date.now() - lastEventTime, progress: lastEvent.progress ?? 100 });
          }
          this.uploadProgress    = 100;
          this.uploadedFile      = file;
          this.isImage           = file.type.startsWith('image/');
          this.documentRawUrl    = URL.createObjectURL(file);
          this.documentObjectUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentRawUrl);
          this.ec2Result         = this.parseEc2Response(lastEvent ?? {});
          this.uploading         = false;
          this.uploadBtnText     = 'Upload & Analyze';
          this.snackbar.success(`"${file.name}" analyzed successfully`);
        });
      })
      .catch(() => {
        this.zone.run(() => {
          this.uploading     = false;
          this.uploadBtnText = 'Upload & Analyze';
          this.snackbar.error('Cannot reach EC2. Please check your connection.');
          this.fileInput.nativeElement.value = '';
        });
      });
  }

  private extractKV(node: any, result: { key: string; value: string }[], parentKey = ''): void {
    if (node === null || node === undefined) return;

    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
      if (parentKey) result.push({ key: parentKey, value: String(node) });
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          if ('key' in item && 'value' in item) {
            this.extractKV(item.value, result, item.key);
          } else {
            this.extractKV(item, result, parentKey);
          }
        } else {
          this.extractKV(item, result, parentKey || String(i));
        }
      });
      return;
    }

    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        const compositeKey = parentKey ? `${parentKey} › ${k}` : k;
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          result.push({ key: compositeKey, value: String(v) });
        } else {
          this.extractKV(v, result, compositeKey);
        }
      }
    }
  }

  private parseEc2Response(res: any): Ec2Result {
    const textEntry   = res.text_extract?.[0];
    const classEntry  = res.classification_results?.[0];
    const nerEntry    = res.ner_results?.[0];
    const rawStructured = res.strucured_data_extraction_results ?? [];

    const structuredData: { key: string; value: string }[] = [];
    this.extractKV(rawStructured, structuredData);

    return {
      filename:           textEntry?.filename ?? '',
      docType:            textEntry?.doc_type ?? null,
      extractedText:      textEntry?.text ?? '',
      classificationText: classEntry?.text ?? '',
      structuredData,
      nerEntities: (nerEntry?.ner_entities ?? []).map((e: any) => ({
        text:  e.text,
        label: e.label,
        score: e.score,
      })),
    };
  }
}
