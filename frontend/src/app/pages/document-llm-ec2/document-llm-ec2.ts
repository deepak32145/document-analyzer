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
  confidenceClassify: number | null;
  structuredData: { key: string; value: string; confidence: number | null }[];
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
  uploadNextStep    = '';
  uploadSteps: { label: string; elapsed: string; progress: number }[] = [];

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

    this.uploading         = true;
    this.uploadBtnText     = 'Analyzing...';
    this.uploadProgress    = 0;
    this.uploadCurrentStep = '';
    this.uploadNextStep    = '';
    this.uploadSteps       = [];
    this.ec2Result         = null;
    this.uploadedFile      = null;

    const formData = new FormData();
    formData.append('files', file);
    formData.append('documentType', this.documentType);

    let lastEvent: any = null;
    // Accumulate result fields across all events — the API may send data
    // fields in earlier events and a bare status ping as the final event.
    const resultData: any = {};

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
            // Strip SSE "data: " prefix
            const jsonStr = trimmed.startsWith('data: ') ? trimmed.slice(6).trim() : trimmed;
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const msg = JSON.parse(jsonStr);

              // Merge data-bearing fields whenever they appear in any event
              if (msg.text_extract?.length)                        resultData.text_extract                        = msg.text_extract;
              if (msg.classification_results?.length)              resultData.classification_results              = msg.classification_results;
              if (msg.strucured_data_extraction_results?.length)   resultData.strucured_data_extraction_results   = msg.strucured_data_extraction_results;
              if (msg.ner_results?.length)                         resultData.ner_results                         = msg.ner_results;

              this.zone.run(() => {
                // Move previous active step into completed list
                if (lastEvent) {
                  this.uploadSteps.push({
                    label:    lastEvent.current_step,
                    elapsed:  lastEvent.elapsed_time ?? '',
                    progress: lastEvent.progress ?? 0,
                  });
                }
                this.uploadProgress    = msg.progress ?? this.uploadProgress;
                this.uploadCurrentStep = msg.current_step ?? '';
                this.uploadNextStep    = msg.next_step ?? '';
                lastEvent = msg;
              });
            } catch { /* skip non-JSON lines */ }
          }
        }

        this.zone.run(() => {
          if (lastEvent) {
            this.uploadSteps.push({
              label:    lastEvent.current_step,
              elapsed:  lastEvent.elapsed_time ?? '',
              progress: lastEvent.progress ?? 100,
            });
          }
          this.uploadProgress    = 100;
          this.uploadCurrentStep = '';
          this.uploadedFile      = file;
          this.isImage           = file.type.startsWith('image/');
          this.documentRawUrl    = URL.createObjectURL(file);
          this.documentObjectUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentRawUrl);
          this.ec2Result         = this.parseEc2Response(resultData);
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

  private flattenConfidence(node: any, result: Map<string, number>, parentKey = ''): void {
    if (node === null || node === undefined) return;
    if (typeof node === 'number') {
      if (parentKey) result.set(parentKey, node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(item => this.flattenConfidence(item, result, parentKey));
      return;
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        const compositeKey = parentKey ? `${parentKey} › ${k}` : k;
        this.flattenConfidence(v, result, compositeKey);
      }
    }
  }

  private parseEc2Response(res: any): Ec2Result {
    const textEntry       = res.text_extract?.[0];
    const classEntry      = res.classification_results?.[0];
    const nerEntry        = res.ner_results?.[0];
    const structuredEntry = res.strucured_data_extraction_results?.[0];

    const extractedData  = structuredEntry?.structured_data?.extracted_data ?? {};
    const confidenceData = structuredEntry?.structured_data?.confidence ?? {};

    const confidenceMap = new Map<string, number>();
    this.flattenConfidence(confidenceData, confidenceMap);

    const rawKV: { key: string; value: string }[] = [];
    this.extractKV(extractedData, rawKV);

    const structuredData = rawKV.map(kv => ({
      ...kv,
      confidence: confidenceMap.has(kv.key) ? (confidenceMap.get(kv.key) ?? null) : null,
    }));

    return {
      filename:           textEntry?.filename ?? '',
      docType:            textEntry?.doc_type ?? null,
      extractedText:      textEntry?.text ?? '',
      classificationText: classEntry?.text ?? '',
      confidenceClassify: textEntry?.confidence_classify ?? null,
      structuredData,
      nerEntities: (nerEntry?.ner_entities ?? []).map((e: any) => ({
        text:  e.text,
        label: e.label,
        score: e.score,
      })),
    };
  }
}
