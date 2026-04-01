import { Component, ElementRef, ViewChild, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackbarService } from '../../shared/snackbar';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

marked.setOptions({ breaks: true });

@Component({
  selector: 'app-document-anthropic',
  imports: [CommonModule],
  templateUrl: './document-anthropic.html',
  styleUrl: './document-anthropic.scss',
})
export class DocumentAnthropic implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  uploadedFile: File | null = null;
  uploading = false;
  streaming = false;
  streamedText = '';
  renderedHtml: SafeHtml = '';
  documentObjectUrl: SafeResourceUrl | null = null;
  documentRawUrl: string | null = null;
  isImage = false;

  private abortController: AbortController | null = null;

  constructor(
    private snackbar: SnackbarService,
    private sanitizer: DomSanitizer,
    private zone: NgZone
  ) {}

  ngOnDestroy() {
    this.abortController?.abort();
  }

  triggerUpload() {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    this.uploadedFile = file;
    this.streamedText = '';
    this.renderedHtml = '';
    this.uploading = true;
    this.streaming = false;
    this.documentRawUrl = URL.createObjectURL(file);
    this.documentObjectUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentRawUrl);
    this.isImage = file.type.startsWith('image/');

    const formData = new FormData();
    formData.append('file', file);

    this.abortController = new AbortController();

    try {
      const response = await fetch('http://localhost:3000/api/analyze-anthropic', {
        method: 'POST',
        body: formData,
        signal: this.abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`);
      }

      this.zone.run(() => { this.uploading = false; this.streaming = true; });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') { this.zone.run(() => { this.streaming = false; }); break; }
          try {
            const json = JSON.parse(payload);
            if (json.error) throw new Error(json.error);
            if (json.text) this.zone.run(() => {
              this.streamedText += json.text;
              this.renderedHtml = this.sanitizer.bypassSecurityTrustHtml(marked.parse(this.streamedText) as string);
            });
          } catch (e: any) {
            if (e.message && !e.message.startsWith('JSON')) throw e;
          }
        }
      }

      this.zone.run(() => {
        this.streaming = false;
        this.snackbar.success(`"${file.name}" analyzed successfully`);
      });
    } catch (err: any) {
      this.zone.run(() => { this.uploading = false; this.streaming = false; });
      if (err.name !== 'AbortError') {
        this.zone.run(() => this.snackbar.error(err.message ?? 'Analysis failed'));
        this.fileInput.nativeElement.value = '';
      }
    }
  }
}
