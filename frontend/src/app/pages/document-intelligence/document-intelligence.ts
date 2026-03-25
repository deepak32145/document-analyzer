import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
  uploading = false;
  uploadBtnText = 'Upload PDF';

  documentTypes = [
    { value: 'not-known',      label: 'Not Known' },
    { value: 'bank-statement', label: 'Bank Statement' },
    { value: 'tax-return',     label: 'Tax Return' },
  ];

  constructor(private http: HttpClient, private snackbar: SnackbarService) {}

  triggerUpload() {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    this.uploading = true;
    this.uploadBtnText = 'Uploading...';

    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', this.documentType);

    this.http.post('http://localhost:3000/api/upload', formData).subscribe({
      next: () => {
        this.uploading = false;
        this.uploadBtnText = 'Upload PDF';
        this.uploadedFile = file;
        this.snackbar.success(`"${file.name}" uploaded successfully`);
      },
      error: (err: HttpErrorResponse) => {
        this.uploading = false;
        this.uploadBtnText = 'Upload PDF';
        const msg = err.status === 0
          ? 'Cannot reach the server. Please ensure the backend is running.'
          : err.error?.error ?? `Upload failed (${err.status})`;
        this.snackbar.error(msg);
        this.fileInput.nativeElement.value = '';
      }
    });
  }

  viewDocument() {
    if (!this.uploadedFile) return;
    const url = URL.createObjectURL(this.uploadedFile);
    window.open(url, '_blank');
  }
}
