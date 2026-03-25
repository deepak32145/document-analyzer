import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { SnackbarService } from '../../shared/snackbar';

@Component({
  selector: 'app-document-intelligence',
  imports: [FormsModule, CommonModule],
  templateUrl: './document-intelligence.html',
  styleUrl: './document-intelligence.scss',
})
export class DocumentIntelligence {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  documentType = 'not-known';
  uploadedFile: File | null = null;
  uploading    = false;
  uploadBtnText = 'Upload & Analyze';

  analysisHtml: SafeHtml | null = null;
  analysisMeta: { pages: number; words: number } | null = null;
  documentObjectUrl: SafeResourceUrl | null = null;
  documentRawUrl: string | null = null;

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
    this.analysisHtml  = null;
    this.analysisMeta  = null;

    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', this.documentType);

    this.http.post<any>('http://localhost:3000/api/upload-llm', formData).subscribe({
      next: (res) => {
        this.uploading     = false;
        this.uploadBtnText = 'Upload & Analyze';
        this.uploadedFile  = file;
        this.documentRawUrl    = URL.createObjectURL(file);
        this.documentObjectUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentRawUrl);

        if (res.analysis?.html) {
          this.analysisHtml = this.sanitizer.bypassSecurityTrustHtml(res.analysis.html);
          this.analysisMeta = { pages: res.analysis.pages, words: res.analysis.words };
        }

        this.snackbar.success(`"${file.name}" analyzed successfully`);
      },
      error: (err: HttpErrorResponse) => {
        this.uploading     = false;
        this.uploadBtnText = 'Upload & Analyze';
        const msg = err.status === 0
          ? 'Cannot reach the server. Please ensure the backend is running.'
          : err.error?.error ?? `Upload failed (${err.status})`;
        this.snackbar.error(msg);
        this.fileInput.nativeElement.value = '';
      }
    });
  }
}
