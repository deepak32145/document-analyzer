import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
    private http: HttpClient,
    private snackbar: SnackbarService,
    private sanitizer: DomSanitizer
  ) {}

  triggerUpload() {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    this.uploading     = true;
    this.uploadBtnText = 'Analyzing...';
    this.ec2Result     = null;
    this.uploadedFile  = null;

    const formData = new FormData();
    formData.append('files', file);
    formData.append('documentType', this.documentType);

    this.http.post<any>('http://localhost:3000/api/upload-ec2', formData).subscribe({
      next: (res) => {
        this.uploading     = false;
        this.uploadBtnText = 'Upload & Analyze';
        this.uploadedFile  = file;
        this.isImage       = file.type.startsWith('image/');
        this.documentRawUrl    = URL.createObjectURL(file);
        this.documentObjectUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentRawUrl);
        this.ec2Result     = this.parseEc2Response(res);
        this.snackbar.success(`"${file.name}" analyzed successfully`);
      },
      error: (err: HttpErrorResponse) => {
        this.uploading     = false;
        this.uploadBtnText = 'Upload & Analyze';
        const msg = err.status === 0
          ? 'Cannot reach the backend. Please ensure the local server is running.'
          : err.error?.error ?? `Upload failed (${err.status})`;
        this.snackbar.error(msg);
        this.fileInput.nativeElement.value = '';
      }
    });
  }

  private parseEc2Response(res: any): Ec2Result {
    const textEntry   = res.text_extract?.[0];
    const classEntry  = res.classification_results?.[0];
    const nerEntry    = res.ner_results?.[0];
    const structured  = res.strucured_data_extraction_results ?? [];

    return {
      filename:           textEntry?.filename ?? '',
      docType:            textEntry?.doc_type ?? null,
      extractedText:      textEntry?.text ?? '',
      classificationText: classEntry?.text ?? '',
      structuredData:     structured.map((item: any) =>
        Object.entries(item).map(([k, v]) => ({ key: k, value: String(v ?? '') }))
      ).flat(),
      nerEntities: (nerEntry?.ner_entities ?? []).map((e: any) => ({
        text:  e.text,
        label: e.label,
        score: e.score,
      })),
    };
  }
}
