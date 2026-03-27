import { Component, Input, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SnackbarService } from '../snackbar';
import { Ec2Result } from '../../pages/document-llm-ec2/document-llm-ec2';

@Component({
  selector: 'app-business-flow',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './business-flow.html',
  styleUrl: './business-flow.scss',
})
export class BusinessFlow implements OnInit {
  @Input() useCase: 'relay' | 'vista' = 'relay';
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  currentStep = 1;

  steps = [
    { id: 1, label: 'Business Information' },
    { id: 2, label: 'Business Owner Information' },
    { id: 3, label: 'Terms and Conditions' },
    { id: 4, label: 'Document Upload' },
    { id: 5, label: 'Account Services & Funding' },
    { id: 6, label: 'Application Review' },
    { id: 7, label: 'Document Analyzer' },
  ];

  // ── Step 1 ─────────────────────────────────────────────
  step1 = {
    legalStructure: 'LLC',
    highRiskBusiness: 'no',
  };

  legalStructures = ['LLC', 'Corporation', 'Sole Proprietorship', 'Partnership', 'Non-Profit'];

  requiredDocs: Record<string, string[]> = {
    'LLC': [
      'Certificate of Formation / Articles of Organization',
      'Operating Agreement / Banking Resolution',
      'Fictitious Name Registration (if DBA name differs from Legal Business Name)',
    ],
    'Corporation': [
      'Articles of Incorporation',
      'Corporate Resolution / Bylaws',
      'Fictitious Name Registration (if DBA name differs)',
    ],
    'Sole Proprietorship': [
      'Government-issued ID',
      'DBA / Trade Name Certificate (if applicable)',
    ],
    'Partnership': [
      'Partnership Agreement',
      'Certificate of Partnership',
      'Fictitious Name Registration (if applicable)',
    ],
    'Non-Profit': [
      'Articles of Incorporation',
      '501(c)(3) Determination Letter',
      'Meeting Minutes / Board Resolution',
    ],
  };

  // ── Step 2 ─────────────────────────────────────────────
  step2 = {
    firstName: 'John',
    lastName: 'Mitchell',
    dob: '1982-03-22',
    ssnLast4: '7364',
    ownershipPct: '100',
    address: '215 Oak Street',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    email: 'john.mitchell@email.com',
    phone: '(312) 555-0147',
  };

  // ── Step 3 ─────────────────────────────────────────────
  step3 = { agreed: true };

  // ── Step 4 ─────────────────────────────────────────────
  documentType = 'bank-statement';
  uploadedFile: File | null = null;
  uploading = false;
  uploadBtnText = 'Upload PDF';

  documentTypes = [
    { value: 'not-known',      label: 'Not Known' },
    { value: 'bank-statement', label: 'Bank Statement' },
    { value: 'tax-return',     label: 'Tax Return' },
  ];

  // ── Step 5 ─────────────────────────────────────────────
  step5 = {
    accountType: 'Business Checking',
    initialDeposit: '10000',
    overdraftProtection: true,
    onlineBanking: true,
    debitCard: true,
  };

  accountTypes = ['Business Checking', 'Business Savings', 'Business Money Market'];

  constructor(
    private http: HttpClient,
    private snackbar: SnackbarService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    if (this.useCase === 'vista') {
      this.step2.firstName = 'Marcus';
      this.step2.lastName  = 'Reynolds';
      this.step2.email     = 'marcus.reynolds@vista.com';
      this.step2.phone     = '(415) 555-0293';
    }
  }

  get businessName(): string {
    return this.useCase === 'relay' ? 'Relay Business Solutions Inc.' : 'Vista Capital Group LLC';
  }

  get ownerName(): string {
    return `${this.step2.firstName} ${this.step2.lastName}`;
  }

  goToStep(step: number) { this.currentStep = step; }

  nextStep() {
    if (this.currentStep < this.steps.length) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  reviewConfirmed = false;

  getDocTypeLabel(value: string): string {
    return this.documentTypes.find(d => d.value === value)?.label ?? value;
  }

  documentObjectUrl: SafeResourceUrl | null = null;
  documentRawUrl: string | null = null;
  ec2Result: Ec2Result | null = null;
  isImage = false;

  finish() { this.currentStep = 6; }

  submitApplication() {
    if (this.uploadedFile) {
      this.documentRawUrl    = URL.createObjectURL(this.uploadedFile);
      this.documentObjectUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentRawUrl);
      this.isImage           = this.uploadedFile.type.startsWith('image/');
    }
    this.currentStep = 7;
  }

  // ── Upload ─────────────────────────────────────────────
  triggerUpload() {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.uploading     = true;
    this.uploadBtnText = 'Uploading...';

    const formData = new FormData();
    formData.append('files', file);
    formData.append('documentType', this.documentType);

    this.http.post<any>('http://localhost:3000/api/upload-ec2', formData).subscribe({
      next: (res) => {
        this.uploading     = false;
        this.uploadBtnText = 'Upload Document';
        this.uploadedFile  = file;
        this.ec2Result     = this.parseEc2Response(res);
        this.snackbar.success(`"${file.name}" uploaded successfully`);
      },
      error: (err: HttpErrorResponse) => {
        this.uploading     = false;
        this.uploadBtnText = 'Upload Document';
        const msg = err.status === 0
          ? 'Cannot reach the server. Please ensure the backend is running.'
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

  viewDocument() {
    if (!this.uploadedFile) return;
    window.open(URL.createObjectURL(this.uploadedFile), '_blank');
  }
}
