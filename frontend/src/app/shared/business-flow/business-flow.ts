import { Component, Input, ElementRef, ViewChild, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
    { id: 12, label: 'Welcome' },
    { id: 14, label: 'Product Selection' },
    { id: 15, label: 'Business Information' },
    { id: 16, label: 'Business Information' },
    { id: 17, label: 'Account Services & Funding' },
    { id: 18, label: 'Add-on Services' },
    { id: 19, label: 'Application Status' },
    { id: 1,  label: 'Business Information' },
    { id: 2,  label: 'Business Owner Information' },
    { id: 8,  label: 'KYC Details' },
    { id: 3,  label: 'Terms and Conditions' },
    { id: 4,  label: 'Document Upload' },
    { id: 5,  label: 'Account Services & Funding' },
    { id: 6,  label: 'Application Review' },
    { id: 9,  label: 'Disclosure Acceptance' },
    { id: 10, label: 'Card Selection' },
    { id: 11, label: 'Application Status' },
    { id: 7,  label: 'Document Analyzer' },
  ];

  private relayStepOrder = [1, 2, 8, 6, 9, 10, 4, 11, 7];
  private vistaStepOrder = [12, 14, 15, 16, 2, 3, 4, 17, 18, 19, 7];

  get stepOrder() {
    return this.useCase === 'relay' ? this.relayStepOrder : this.vistaStepOrder;
  }

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

  // ── Steps 12 & 13: Vista Welcome / Basic Information ──
  vistaBasicInfo = {
    firstName:    'Marcus',
    lastName:     'Reynolds',
    email:        'marcus.reynolds@vista.com',
    addressLine1: '1420 Harbor Blvd',
    addressLine2: 'Suite 300',
    city:         'San Francisco',
    state:        'CA',
    zipcode:      '94102',
  };

  // ── Step 14: Product Selection (Vista only) ───────────
  vistaProducts = [
    { id: 'advisor',  label: 'Business Advisor Checking',         description: 'A full-service checking account with dedicated advisory support and premium business tools.' },
    { id: 'clearly',  label: 'Clearly Better Business Checking',  description: 'Simple, transparent business checking with no hidden fees and unlimited transactions.' },
    { id: 'analysis', label: 'Citizens Analysis Business Checking', description: 'Earn earnings credit to offset service charges — ideal for businesses with high average balances.' },
    { id: 'market',   label: 'Business Money Market',             description: 'Higher-yield account that combines the flexibility of checking with money market earnings.' },
  ];

  vistaSelectedProducts: Record<string, boolean> = {
    advisor: false, clearly: false, analysis: false, market: false,
  };

  get vistaHasProductSelected(): boolean {
    return Object.values(this.vistaSelectedProducts).some(v => v);
  }

  // ── Step 15: Vista Business Information ───────────────
  vistaLegalStructure = '';

  vistaBusinessInfo = {
    natureOfBusiness:  'Retail & E-Commerce',
    legalBusinessName: 'Vista Capital Group LLC',
    taxIdType:         'EIN',
    tinNumber:         '82-4567890',
    businessPhone:     '(415) 555-0293',
    businessEmail:     'info@vistacapital.com',
    businessState:     'CA',
    annualRevenue:     '2500000',
    annualProfit:      '450000',
    addrLine1:         '1420 Harbor Blvd',
    addrLine2:         'Suite 300',
    city:              'San Francisco',
    addrState:         'CA',
    zip:               '94102',
    mailingAddressSame: true,
  };

  taxIdTypes = ['EIN', 'SSN', 'ITIN'];
  legalStructures15 = ['Sole Prop'];

  // ── Step 16: Vista Business Information (continued) ───
  vistaBusinessInfo2 = {
    naicsCode:         '523930',
    outsideUS:         'no',
    publiclyTraded:    'no',
    revenueExceeds200M:'no',
    customerBase:      'domestic',
    dateOfFormation:   '2018-03-15',
    isSoleProp:        'yes',
  };

  // ── Step 17: Vista Account Services & Funding ─────────
  vistaAccountFunding = {
    accountUsage:          'Day-to-day business operations and vendor payments',
    sourceOfFunds:         'Business Revenue',
    cashActivityIn:        '75000',
    cashActivityOut:       '60000',
    internalTransactions:  'yes',
  };

  accountUsageOptions = [
    'Day-to-day business operations and vendor payments',
    'Payroll processing',
    'Investment and savings',
    'Import / Export transactions',
    'Other',
  ];

  fundSourceOptions = [
    'Business Revenue',
    'Business Loans',
    'Investments',
    'Capital Contributions',
    'Other',
  ];

  // ── Step 18 / 19: Vista submission & status ───────────
  vistaDecision: 'approved' | 'declined' | null = null;

  startVistaSubmission() {
    this.applicationNumber  = String(Math.floor(100000 + Math.random() * 900000));
    this.isSubmitting       = true;
    this.submissionProgress = 0;

    const total = 10000;
    const tick  = 200;
    const elapsed = { v: 0 };

    const interval = setInterval(() => {
      elapsed.v += tick;
      this.submissionProgress = Math.min(95, (elapsed.v / total) * 100);

      if (elapsed.v >= total) {
        clearInterval(interval);
        this.submissionProgress = 100;
        setTimeout(() => {
          this.isSubmitting  = false;
          this.vistaDecision = this.evaluateCardDecision();
          this.nextStep();   // → step 19
        }, 300);
      }
    }, tick);
  }

  // ── Step 18: Vista Add-on Services ────────────────────
  vistaAddons = { estatements: false, debitCard: false };

  // ── Step 8: KYC Details (Relay only) ──────────────────
  step8 = {
    idType:             'Driver\'s License',
    idNumber:           'IL-D123-4567-8900',
    issuingState:       'IL',
    idExpiry:           '2028-03-22',
    fullSsn:            '123-45-7364',
    ein:                '82-4567890',
    citizenshipStatus:  'US Citizen',
    countryOfCitizenship: 'United States',
    countryOfBirth:     'United States',
    employmentStatus:   'Business Owner',
    employerName:       'Relay Business Solutions Inc.',
    occupation:         'Chief Executive Officer',
    annualIncome:       '$250,000 – $500,000',
    sourceOfFunds:      'Business Income',
    isPep:              'no',
    backupWithholding:  'no',
    fatcaStatus:        'US Person',
  };

  idTypes = ['Driver\'s License', 'Passport', 'State ID', 'Military ID'];
  citizenshipStatuses = ['US Citizen', 'Permanent Resident', 'Non-Resident Alien'];
  employmentStatuses = ['Employed', 'Self-Employed', 'Business Owner', 'Retired', 'Student', 'Unemployed'];
  incomeBrackets = ['Under $50,000', '$50,000 – $100,000', '$100,000 – $250,000', '$250,000 – $500,000', 'Over $500,000'];
  fundSources = ['Salary / Wages', 'Business Income', 'Investments', 'Inheritance', 'Real Estate', 'Other'];
  fatcaStatuses = ['US Person', 'Non-US Person'];

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

  vistaDocumentTypes = [
    { value: 'business-license',          label: 'Business License' },
    { value: 'dba',                       label: 'Doing Business As (DBA)' },
    { value: 'fictitious-name-registration', label: 'Fictitious Name Registration' },
  ];

  get activeDocumentTypes() {
    return this.useCase === 'vista' ? this.vistaDocumentTypes : this.documentTypes;
  }

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
    private snackbar: SnackbarService,
    private sanitizer: DomSanitizer,
    private zone: NgZone
  ) {}

  ngOnInit() {
    if (this.useCase === 'vista') {
      this.currentStep  = 12;
      this.documentType = 'business-license';
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

  get visibleSteps() {
    const order = this.stepOrder;
    return this.steps.filter(s => order.includes(s.id))
                     .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }

  isStepCompleted(stepId: number): boolean {
    const order = this.stepOrder;
    return order.indexOf(stepId) < order.indexOf(this.currentStep);
  }

  goToStep(step: number) {
    this.currentStep = step;
  }

  nextStep() {
    const order = this.stepOrder;
    const idx = order.indexOf(this.currentStep);
    if (idx < order.length - 1) this.currentStep = order[idx + 1];
  }

  prevStep() {
    const order = this.stepOrder;
    const idx = order.indexOf(this.currentStep);
    if (idx > 0) this.currentStep = order[idx - 1];
  }

  reviewConfirmed = false;

  // ── Submission animation ───────────────────────────────
  isSubmitting = false;
  submissionProgress = 0;
  applicationNumber = '';

  // ── Step 9: Disclosure Acceptance ─────────────────────
  disclosures = [
    { id: 1, title: 'BOA Account Agreement',               body: 'This Bank of America Account Agreement ("Agreement") governs the terms and conditions of your deposit account. By opening or maintaining an account, you agree to be bound by the terms set forth herein. Citizens Bank reserves the right to amend this Agreement at any time with reasonable notice. This Agreement is governed by the laws of the State of Illinois and applicable federal law.\n\nSection 1 — Account Ownership\nThe account holder agrees that this account is established for lawful business purposes only. Any fraudulent or unauthorized use will result in immediate account suspension and may be referred to law enforcement authorities.\n\nSection 2 — Fees and Charges\nMonthly maintenance fees, transaction fees, and other service charges are disclosed in the accompanying Fee Schedule, which is incorporated herein by reference.\n\nSection 3 — Dispute Resolution\nAny dispute arising under this Agreement shall be resolved by binding arbitration in accordance with the rules of the American Arbitration Association.' },
    { id: 2, title: 'Business Disclosure',                  body: 'Business Account Disclosure Statement\n\nThis disclosure provides important information about your Citizens Bank Business Account. Please read this document carefully and retain it for your records.\n\nAnti-Money Laundering (AML) Compliance\nCitizens Bank is required by law to verify the identity of all customers and beneficial owners under the Bank Secrecy Act and USA PATRIOT Act. By proceeding, you certify that all information provided is accurate and complete.\n\nBeneficial Ownership\nFederal regulations require financial institutions to collect and verify information about the beneficial owners of legal entity customers. A beneficial owner is an individual who owns 25% or more of the equity interests of the legal entity.\n\nCertification\nThe undersigned certifies, to the best of their knowledge, that the information provided above is complete and correct.' },
    { id: 3, title: 'Electronic Fund Transfer Disclosure',  body: 'Electronic Fund Transfer Act Disclosure (Regulation E)\n\nThis disclosure applies to electronic fund transfers (EFTs) initiated through your Citizens Bank Business Account, including ACH transfers, wire transfers, and debit card transactions.\n\nYour Liability for Unauthorized Transfers\nIf you believe your card or PIN has been lost or stolen, or that someone has transferred money from your account without permission, contact us immediately. Timely reporting limits your liability.\n\nBusiness Day Definition\nFor purposes of this disclosure, "business day" means Monday through Friday, excluding federal holidays.\n\nError Resolution Procedures\nIn case of errors or questions about your electronic transfers, contact Citizens Bank customer service within 60 days after we send you the first statement on which the problem appears.' },
    { id: 4, title: 'Privacy Policy Notice',               body: 'Privacy Policy — Facts: What Does Citizens Bank Do With Your Personal Information?\n\nWhy?\nFinancial companies choose how they share your personal information. Federal law gives consumers the right to limit some but not all sharing. Federal law also requires us to tell you how we collect, share, and protect your personal information.\n\nWhat We Collect\nWe collect personal information such as your name, address, Social Security number, assets, income, account balances, transaction history, and credit history.\n\nHow We Use It\nAll financial companies need to share customers\' personal information to run their everyday business. In the section below, we list the reasons financial companies can share their customers\' personal information.\n\nYour Choices\nIf you are a new customer, we can begin sharing your information from the date we sent this notice. You can contact us at any time to limit our sharing.' },
  ];

  activeDisclosure: { id: number; title: string; body: string } | null = null;
  disclosureAgreed = false;

  // ── Step 10: Card Selection ────────────────────────────
  selectedCard: 'points' | 'rewards' | null = null;

  // ── Step 11: Application Status ───────────────────────
  cardDecision: 'approved' | 'declined' | null = null;

  continueFromDocUpload() {
    this.cardDecision = this.evaluateCardDecision();
    this.nextStep();
  }

  private evaluateCardDecision(): 'approved' | 'declined' {
    const coinFlip = (): 'approved' | 'declined' => Math.random() > 0.5 ? 'approved' : 'declined';

    if (!this.ec2Result || this.ec2Result.structuredData.length === 0) {
      return coinFlip();
    }

    // Vista: check expiry date from structured data
    if (this.useCase === 'vista') {
      const expiryEntry = this.ec2Result.structuredData.find(kv =>
        /expir(y|ation|es?)/i.test(kv.key) || /valid\s*(through|until|to)/i.test(kv.key)
      );

      if (expiryEntry) {
        const parsed = new Date(expiryEntry.value);
        if (!isNaN(parsed.getTime())) {
          return parsed > new Date() ? 'approved' : 'declined';
        }
      }

      return coinFlip();
    }

    // Relay: check average balance
    const balances = this.ec2Result.structuredData
      .filter(kv => /balance/i.test(kv.key) && !/opening/i.test(kv.key))
      .map(kv => parseFloat(kv.value))
      .filter(v => !isNaN(v) && v > 0);

    if (balances.length === 0) return coinFlip();

    const avg = balances.reduce((sum, v) => sum + v, 0) / balances.length;
    return avg > 5000 ? 'approved' : 'declined';
  }

  openDisclosure(d: { id: number; title: string; body: string }) {
    this.activeDisclosure = d;
  }

  closeDisclosure() {
    this.activeDisclosure = null;
  }

  getDocTypeLabel(value: string): string {
    return this.documentTypes.find(d => d.value === value)?.label ?? value;
  }

  documentObjectUrl: SafeResourceUrl | null = null;
  documentRawUrl: string | null = null;
  ec2Result: Ec2Result | null = null;
  isImage = false;

  finish() { this.currentStep = 6; }

  startRelaySubmission() {
    this.applicationNumber  = String(Math.floor(100000 + Math.random() * 900000));
    this.isSubmitting       = true;
    this.submissionProgress = 0;

    const total   = 5000;
    const tick    = 200;
    const elapsed = { v: 0 };

    const interval = setInterval(() => {
      elapsed.v += tick;
      // Ease progress to ~95% over 20s, jump to 100 at end
      this.submissionProgress = Math.min(95, (elapsed.v / total) * 100);

      if (elapsed.v >= total) {
        clearInterval(interval);
        this.submissionProgress = 100;
        setTimeout(() => {
          this.isSubmitting = false;
          this.nextStep();   // → step 9 Disclosure Acceptance
        }, 300);
      }
    }, tick);
  }

  submitApplication() {
    if (this.uploadedFile) {
      this.documentRawUrl    = URL.createObjectURL(this.uploadedFile);
      this.documentObjectUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentRawUrl);
      this.isImage           = this.uploadedFile.type.startsWith('image/');
    }
    this.currentStep = 7;
  }

  // ── Upload ─────────────────────────────────────────────
  private apiCallStartTime = 0;
  apiCallDuration: string | null = null;
  uploadProgress    = 0;
  uploadCurrentStep = '';
  uploadSteps: { label: string; durationMs: number }[] = [];

  triggerUpload() {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    this.uploading        = true;
    this.uploadBtnText    = 'Analysing...';
    this.uploadProgress   = 0;
    this.uploadCurrentStep = '';
    this.uploadSteps      = [];
    this.apiCallStartTime = Date.now();
    this.apiCallDuration  = null;

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
                  this.uploadSteps.push({ label: lastEvent.current_step, durationMs });
                }
                this.uploadProgress    = msg.progress ?? this.uploadProgress;
                this.uploadCurrentStep = msg.current_step ?? '';
                lastEvent = msg;
              });
            } catch { /* skip non-JSON lines */ }
          }
        }

        // Stream ended — finalise with last event data
        this.zone.run(() => {
          if (lastEvent) {
            this.uploadSteps.push({ label: lastEvent.current_step, durationMs: Date.now() - lastEventTime });
          }
          this.uploadProgress    = 100;
          this.apiCallDuration   = ((Date.now() - this.apiCallStartTime) / 1000).toFixed(2) + 's';
          this.uploadedFile      = file;
          this.ec2Result         = this.parseEc2Response(lastEvent ?? {});
          this.documentRawUrl    = URL.createObjectURL(file);
          this.documentObjectUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentRawUrl);
          this.isImage           = file.type.startsWith('image/');
          this.uploading         = false;
          this.uploadBtnText     = 'Upload Document';
          this.snackbar.success(`"${file.name}" uploaded successfully`);
        });
      })
      .catch(() => {
        this.zone.run(() => {
          this.apiCallDuration   = ((Date.now() - this.apiCallStartTime) / 1000).toFixed(2) + 's';
          this.uploadedFile      = file;
          this.ec2Result         = null;
          this.documentRawUrl    = URL.createObjectURL(file);
          this.documentObjectUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.documentRawUrl);
          this.isImage           = file.type.startsWith('image/');
          this.uploading         = false;
          this.uploadBtnText     = 'Upload Document';
          this.snackbar.info('Analysis service unavailable — proceeding with fallback review.');
          this.startProcessingAnimation();
        });
      });
  }

  private extractKV(node: any, result: { key: string; value: string }[], parentKey = ''): void {
    if (node === null || node === undefined) return;

    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
      // Leaf — store with whatever parent key we have
      if (parentKey) result.push({ key: parentKey, value: String(node) });
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          // Array of objects — treat each as a key-value pair if it has key/value props,
          // otherwise recurse with the index as part of the key
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

  viewDocument() {
    if (!this.uploadedFile) return;
    window.open(URL.createObjectURL(this.uploadedFile), '_blank');
  }

  // ── Processing Pipeline Animation ─────────────────────
  processingStatus: 'idle' | 'running' | 'done' = 'idle';
  processingCurrentStep = -1;
  processingStepsDone: boolean[] = [];
  processingStepProgress = 0;

  private relayPipeline = [
    { label: 'Text Extraction',              detail: 'Extracting raw text from document',        time: '~1s'  },
    { label: 'Embedding Generation',         detail: 'Generating semantic vector embeddings',     time: '~10s' },
    { label: 'ChromaDB Storage',             detail: 'Persisting embeddings to vector store',     time: '~1s'  },
    { label: 'Structured Schema Extraction', detail: 'Parsing bank statement fields & schema',    time: '~30s' },
    { label: 'NER Generation',               detail: 'Identifying named entities in document',    time: '...'  },
  ];

  private vistaPipeline = [
    { label: 'Text Extraction',              detail: 'Extracting raw text from document',        time: '~2s'  },
    { label: 'Embedding Generation',         detail: 'Generating semantic vector embeddings',     time: '~1s'  },
    { label: 'ChromaDB Storage',             detail: 'Persisting embeddings to vector store',     time: '~1s'  },
    { label: 'Structured Schema Extraction', detail: 'Parsing driving licence fields & schema',   time: '~3s'  },
    { label: 'NER Generation',               detail: 'Identifying named entities in document',    time: '...'  },
  ];

  private relayDemoMs = [600, 1100, 500, 1700, -1];
  private vistaDemoMs  = [700, 500,  400, 1100, -1];

  get activePipeline() {
    return this.useCase === 'relay' ? this.relayPipeline : this.vistaPipeline;
  }

  get activeDemoMs() {
    return this.useCase === 'relay' ? this.relayDemoMs : this.vistaDemoMs;
  }

  startProcessingAnimation() {
    const pipeline = this.activePipeline;
    this.processingStatus    = 'running';
    this.processingCurrentStep = 0;
    this.processingStepsDone = pipeline.map(() => false);
    this.processingStepProgress = 0;
    this.runPipelineStep(0);
  }

  private runPipelineStep(idx: number) {
    const pipeline = this.activePipeline;
    if (idx >= pipeline.length) { this.processingStatus = 'done'; return; }

    this.processingCurrentStep  = idx;
    this.processingStepProgress = 0;
    const demoMs = this.activeDemoMs[idx];
    const isLast = idx === pipeline.length - 1;

    if (isLast) {
      this.runNerStep(idx);
      return;
    }

    const tickMs    = 40;
    const totalTicks = demoMs / tickMs;
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      this.processingStepProgress = Math.min(100, (tick / totalTicks) * 100);
      if (tick >= totalTicks) {
        clearInterval(timer);
        this.processingStepsDone[idx] = true;
        setTimeout(() => this.runPipelineStep(idx + 1), 120);
      }
    }, tickMs);
  }

  private runNerStep(idx: number) {
    this.processingStepProgress = 0;
    let progress = 0;

    const slowTimer = setInterval(() => {
      progress = Math.min(78, progress + 1.2);
      this.processingStepProgress = progress;

      const apiDone = this.ec2Result !== null || !this.uploading;
      if (progress >= 78 && apiDone) {
        clearInterval(slowTimer);

        const fastTimer = setInterval(() => {
          progress = Math.min(100, progress + 4);
          this.processingStepProgress = progress;
          if (progress >= 100) {
            clearInterval(fastTimer);
            this.processingStepsDone[idx] = true;
            setTimeout(() => { this.processingStatus = 'done'; }, 250);
          }
        }, 25);
      }
    }, 55);
  }
}
