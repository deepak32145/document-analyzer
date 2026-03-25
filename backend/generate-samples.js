const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'sample-documents');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// ─── helpers ────────────────────────────────────────────────────────────────

function newDoc() {
  return new PDFDocument({ margin: 50, size: 'A4' });
}

function save(doc, filename) {
  return new Promise((resolve) => {
    const filePath = path.join(outDir, filename);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.end();
    stream.on('finish', () => { console.log('Created:', filename); resolve(); });
  });
}

function header(doc, bank, title) {
  doc.rect(0, 0, doc.page.width, 80).fill('#1a5c2e');
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
     .text(bank, 50, 22);
  doc.fontSize(11).font('Helvetica')
     .text(title, 50, 50);
  doc.fillColor('#000000').moveDown(3);
}

function sectionTitle(doc, text) {
  doc.moveDown(0.5)
     .fontSize(11).font('Helvetica-Bold').fillColor('#1a5c2e')
     .text(text)
     .moveDown(0.3)
     .moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a5c2e').lineWidth(1).stroke()
     .moveDown(0.4)
     .font('Helvetica').fontSize(10).fillColor('#000000');
}

function row(doc, label, value, y) {
  doc.font('Helvetica-Bold').text(label, 60, y, { continued: false, width: 200 });
  doc.font('Helvetica').text(value, 260, y, { width: 285 });
}

function tableHeader(doc, cols, y) {
  doc.rect(50, y, 495, 18).fill('#e8f4ec');
  doc.fillColor('#1a5c2e').font('Helvetica-Bold').fontSize(9);
  let x = 55;
  cols.forEach(([label, w]) => { doc.text(label, x, y + 4, { width: w }); x += w; });
  doc.fillColor('#000000').font('Helvetica').fontSize(9);
  return y + 18;
}

function tableRow(doc, cells, y, shade) {
  if (shade) doc.rect(50, y, 495, 16).fill('#f7fbf8');
  doc.fillColor('#000000').font('Helvetica').fontSize(9);
  let x = 55;
  cells.forEach(([val, w]) => { doc.text(val, x, y + 3, { width: w }); x += w; });
  return y + 16;
}

// ─── 1. Bank Statement — Checking Account ───────────────────────────────────
async function doc1() {
  const doc = newDoc();
  header(doc, 'First National Bank', 'Account Statement — Checking Account');

  sectionTitle(doc, 'Account Holder Information');
  const baseY = doc.y;
  row(doc, 'Account Holder:', 'James R. Thornton', baseY);
  row(doc, 'Account Number:', '****  ****  4821', baseY + 16);
  row(doc, 'Account Type:', 'Checking', baseY + 32);
  row(doc, 'Branch:', 'Downtown Chicago — IL 60601', baseY + 48);
  row(doc, 'Statement Period:', '01 February 2025 – 28 February 2025', baseY + 64);
  row(doc, 'Statement Date:', '01 March 2025', baseY + 80);
  doc.y = baseY + 104;

  sectionTitle(doc, 'Account Summary');
  const sumY = doc.y;
  row(doc, 'Opening Balance:', '$12,430.55', sumY);
  row(doc, 'Total Credits:', '$5,200.00', sumY + 16);
  row(doc, 'Total Debits:', '$3,840.78', sumY + 32);
  row(doc, 'Closing Balance:', '$13,789.77', sumY + 48);
  doc.y = sumY + 72;

  sectionTitle(doc, 'Transaction Details');
  const cols = [['Date', 70], ['Description', 200], ['Debit ($)', 80], ['Credit ($)', 80], ['Balance ($)', 80]];
  let ty = tableHeader(doc, cols, doc.y);

  const txns = [
    ['01 Feb', 'Opening Balance',         '',           '',         '12,430.55'],
    ['03 Feb', 'ACH Credit — Employer',   '',           '5,200.00', '17,630.55'],
    ['05 Feb', 'Rent Payment — AutoPay',  '1,850.00',   '',         '15,780.55'],
    ['07 Feb', 'Grocery Store — Whole Foods', '143.22', '',         '15,637.33'],
    ['10 Feb', 'Electric Bill — ComEd',   '98.50',      '',         '15,538.83'],
    ['12 Feb', 'Netflix Subscription',    '15.99',      '',         '15,522.84'],
    ['14 Feb', 'Amazon.com Purchase',     '234.07',     '',         '15,288.77'],
    ['17 Feb', 'ATM Withdrawal',          '300.00',     '',         '14,988.77'],
    ['19 Feb', 'Gas Station — Shell',     '62.00',      '',         '14,926.77'],
    ['21 Feb', 'Restaurant — Cheesecake', '87.00',      '',         '14,839.77'],
    ['24 Feb', 'Internet Bill — Comcast', '79.99',      '',         '14,759.78'],
    ['26 Feb', 'Gym Membership',          '45.00',      '',         '14,714.78'],
    ['27 Feb', 'Online Transfer Out',     '925.01',     '',         '13,789.77'],
    ['28 Feb', 'Closing Balance',         '',           '',         '13,789.77'],
  ];
  txns.forEach(([d, desc, deb, cr, bal], i) => {
    ty = tableRow(doc, [[d,70],[desc,200],[deb,80],[cr,80],[bal,80]], ty, i % 2 === 0);
  });

  doc.moveDown(2).fontSize(8).fillColor('#888888')
     .text('This is a system-generated statement. For queries contact 1-800-FNB-HELP.', { align: 'center' });

  await save(doc, '01_checking_statement_james_thornton.pdf');
}

// ─── 2. Bank Statement — Savings Account ────────────────────────────────────
async function doc2() {
  const doc = newDoc();
  header(doc, 'Citizens Bank', 'Account Statement — Savings Account');

  sectionTitle(doc, 'Account Holder Information');
  const baseY = doc.y;
  row(doc, 'Account Holder:', 'Priya Nair', baseY);
  row(doc, 'Account Number:', '****  ****  7703', baseY + 16);
  row(doc, 'Account Type:', 'High-Yield Savings', baseY + 32);
  row(doc, 'Branch:', 'San Jose — CA 95101', baseY + 48);
  row(doc, 'Statement Period:', '01 January 2025 – 31 January 2025', baseY + 64);
  row(doc, 'Interest Rate (APY):', '4.85%', baseY + 80);
  doc.y = baseY + 104;

  sectionTitle(doc, 'Account Summary');
  const sumY = doc.y;
  row(doc, 'Opening Balance:', '$28,500.00', sumY);
  row(doc, 'Total Deposits:', '$3,000.00', sumY + 16);
  row(doc, 'Total Withdrawals:', '$500.00', sumY + 32);
  row(doc, 'Interest Earned:', '$114.90', sumY + 48);
  row(doc, 'Closing Balance:', '$31,114.90', sumY + 64);
  doc.y = sumY + 88;

  sectionTitle(doc, 'Transaction Details');
  const cols = [['Date', 70], ['Description', 210], ['Withdrawal ($)', 90], ['Deposit ($)', 80], ['Balance ($)', 85]];
  let ty = tableHeader(doc, cols, doc.y);

  const txns = [
    ['01 Jan', 'Opening Balance',            '',         '',         '28,500.00'],
    ['05 Jan', 'Transfer from Checking',     '',         '1,500.00', '30,000.00'],
    ['12 Jan', 'Transfer from Checking',     '',         '1,500.00', '31,500.00'],
    ['20 Jan', 'ATM Withdrawal',             '500.00',   '',         '31,000.00'],
    ['31 Jan', 'Monthly Interest Credit',    '',         '114.90',   '31,114.90'],
  ];
  txns.forEach(([d, desc, wd, dep, bal], i) => {
    ty = tableRow(doc, [[d,70],[desc,210],[wd,90],[dep,80],[bal,85]], ty, i % 2 === 0);
  });

  doc.moveDown(2).fontSize(8).fillColor('#888888')
     .text('Citizens Bank is FDIC insured up to $250,000. Member FDIC.', { align: 'center' });

  await save(doc, '02_savings_statement_priya_nair.pdf');
}

// ─── 3. KYC — Identity Verification Document ────────────────────────────────
async function doc3() {
  const doc = newDoc();
  header(doc, 'First National Bank', 'KYC — Customer Identity Verification');

  doc.moveDown(0.5).fontSize(9).fillColor('#555555')
     .text('KYC Reference No: KYC-2025-00441   |   Submitted: 10 March 2025   |   Status: VERIFIED', { align: 'center' });
  doc.moveDown(1).fillColor('#000000');

  sectionTitle(doc, 'Personal Information');
  const baseY = doc.y;
  row(doc, 'Full Legal Name:', 'Marcus Anthony Wells', baseY);
  row(doc, 'Date of Birth:', '14 July 1988', baseY + 16);
  row(doc, 'Gender:', 'Male', baseY + 32);
  row(doc, 'Nationality:', 'United States of America', baseY + 48);
  row(doc, 'SSN (last 4 digits):', '****  6214', baseY + 64);
  row(doc, 'Marital Status:', 'Married', baseY + 80);
  doc.y = baseY + 104;

  sectionTitle(doc, 'Contact Information');
  const contY = doc.y;
  row(doc, 'Residential Address:', '742 Evergreen Terrace, Springfield, IL 62701', contY);
  row(doc, 'Mailing Address:', 'Same as residential', contY + 16);
  row(doc, 'Phone Number:', '+1 (312) 555-0194', contY + 32);
  row(doc, 'Email Address:', 'marcus.wells@email.com', contY + 48);
  doc.y = contY + 72;

  sectionTitle(doc, 'Identity Documents Submitted');
  const idY = doc.y;
  row(doc, 'Primary ID Type:', "Driver's License", idY);
  row(doc, 'ID Number:', 'IL-DL-8821094', idY + 16);
  row(doc, 'Issuing Authority:', 'Illinois Secretary of State', idY + 32);
  row(doc, 'Issue Date:', '20 August 2021', idY + 48);
  row(doc, 'Expiry Date:', '20 August 2027', idY + 64);
  row(doc, 'Secondary ID Type:', 'US Passport', idY + 80);
  row(doc, 'Passport Number:', 'A12345678', idY + 96);
  row(doc, 'Passport Expiry:', '15 May 2030', idY + 112);
  doc.y = idY + 136;

  sectionTitle(doc, 'Employment & Financial Information');
  const empY = doc.y;
  row(doc, 'Occupation:', 'Software Engineer', empY);
  row(doc, 'Employer:', 'TechCorp Inc., Chicago, IL', empY + 16);
  row(doc, 'Annual Income:', '$145,000', empY + 32);
  row(doc, 'Source of Funds:', 'Salary & Investments', empY + 48);
  doc.y = empY + 72;

  sectionTitle(doc, 'Compliance Declaration');
  doc.fontSize(9).fillColor('#333333')
     .text('I, Marcus Anthony Wells, hereby declare that the information provided above is true, accurate, and complete to the best of my knowledge. I understand that providing false information may result in account termination and legal action.')
     .moveDown(1);
  row(doc, 'Customer Signature:', '_______________________', doc.y);
  doc.moveDown(0.5);
  row(doc, 'Date:', '10 March 2025', doc.y);
  doc.moveDown(0.5);
  row(doc, 'Verified By:', 'Sarah L. Benson — KYC Officer', doc.y);

  await save(doc, '03_kyc_identity_marcus_wells.pdf');
}

// ─── 4. Bank Account Opening Form ───────────────────────────────────────────
async function doc4() {
  const doc = newDoc();
  header(doc, 'Metro Business Bank', 'Business Bank Account Opening Form');

  doc.moveDown(0.5).fontSize(9).fillColor('#555555')
     .text('Application Ref: MBA-BUS-2025-3381   |   Date: 15 March 2025', { align: 'center' });
  doc.moveDown(1).fillColor('#000000');

  sectionTitle(doc, 'Business Information');
  const bizY = doc.y;
  row(doc, 'Legal Business Name:', 'Sunrise Tech Solutions LLC', bizY);
  row(doc, 'Trade Name (DBA):', 'Sunrise Tech', bizY + 16);
  row(doc, 'Business Type:', 'Limited Liability Company (LLC)', bizY + 32);
  row(doc, 'Industry:', 'Information Technology Services', bizY + 48);
  row(doc, 'EIN / Tax ID:', '82-****567', bizY + 64);
  row(doc, 'Date of Incorporation:', '03 April 2019', bizY + 80);
  row(doc, 'State of Incorporation:', 'Delaware', bizY + 96);
  row(doc, 'Annual Revenue:', '$2,400,000', bizY + 112);
  row(doc, 'No. of Employees:', '18', bizY + 128);
  doc.y = bizY + 152;

  sectionTitle(doc, 'Business Address');
  const addrY = doc.y;
  row(doc, 'Registered Address:', '1200 Innovation Drive, Suite 400, Austin, TX 78701', addrY);
  row(doc, 'Operating Address:', 'Same as registered', addrY + 16);
  row(doc, 'Business Phone:', '+1 (512) 555-0288', addrY + 32);
  row(doc, 'Business Email:', 'accounts@sunrisetech.com', addrY + 48);
  doc.y = addrY + 72;

  sectionTitle(doc, 'Account Details Requested');
  const accY = doc.y;
  row(doc, 'Account Type:', 'Business Checking', accY);
  row(doc, 'Initial Deposit:', '$10,000.00', accY + 16);
  row(doc, 'Overdraft Protection:', 'Yes — Linked Savings', accY + 32);
  row(doc, 'Online Banking:', 'Yes', accY + 48);
  row(doc, 'Debit Cards Required:', '2 (Primary + Officer)', accY + 64);
  doc.y = accY + 88;

  sectionTitle(doc, 'Authorized Signatories');
  const cols = [['Name', 160], ['Title', 130], ['SSN (last 4)', 90], ['Ownership %', 90], ['Signature Auth', 80]];
  let ty = tableHeader(doc, cols, doc.y);
  const sigs = [
    ['Elena Marchetti', 'CEO & Owner',  '****4491', '60%', 'Full'],
    ['Daniel Cho',      'CFO',          '****8823', '40%', 'Full'],
  ];
  sigs.forEach(([n,t,s,o,sa], i) => {
    ty = tableRow(doc, [[n,160],[t,130],[s,90],[o,90],[sa,80]], ty, i % 2 === 0);
  });

  doc.moveDown(2).fontSize(8).fillColor('#888888')
     .text('Metro Business Bank — Member FDIC. All information is subject to verification.', { align: 'center' });

  await save(doc, '04_business_account_opening_sunrise_tech.pdf');
}

// ─── 5. KYC — Address Proof & AML Declaration ───────────────────────────────
async function doc5() {
  const doc = newDoc();
  header(doc, 'Apex Financial Services', 'KYC — Address Proof & AML Declaration');

  doc.moveDown(0.5).fontSize(9).fillColor('#555555')
     .text('AML Ref: AML-2025-8821   |   Risk Rating: LOW   |   Reviewed: 20 March 2025', { align: 'center' });
  doc.moveDown(1).fillColor('#000000');

  sectionTitle(doc, 'Customer Information');
  const cY = doc.y;
  row(doc, 'Full Name:', 'Sofia A. Lindqvist', cY);
  row(doc, 'Customer ID:', 'APEX-CUST-44821', cY + 16);
  row(doc, 'Date of Birth:', '02 November 1990', cY + 32);
  row(doc, 'Nationality:', 'Swedish / US Permanent Resident', cY + 48);
  row(doc, 'Green Card Number:', 'LIN-90-2019-PR', cY + 64);
  doc.y = cY + 88;

  sectionTitle(doc, 'Address Proof Documents Submitted');
  const adY = doc.y;
  row(doc, 'Document Type:', 'Utility Bill (Electricity)', adY);
  row(doc, 'Issuing Company:', 'Pacific Gas & Electric (PG&E)', adY + 16);
  row(doc, 'Bill Date:', '15 February 2025', adY + 32);
  row(doc, 'Address on Bill:', '390 Harbor View Lane, San Francisco, CA 94102', adY + 48);
  doc.moveDown(0.5);
  row(doc, 'Secondary Proof:', 'Bank Statement — Wells Fargo', adY + 80);
  row(doc, 'Statement Date:', 'January 2025', adY + 96);
  row(doc, 'Address Confirmed:', 'Yes — Matches primary', adY + 112);
  doc.y = adY + 136;

  sectionTitle(doc, 'AML / Financial Crime Declaration');
  doc.fontSize(9).fillColor('#333333')
     .text('The customer has declared:')
     .moveDown(0.3)
     .list([
       'I am not a Politically Exposed Person (PEP) nor related to one.',
       'I am not subject to any sanctions imposed by OFAC, UN, EU, or HM Treasury.',
       'The source of my funds is lawful income from employment and personal savings.',
       'I understand that the bank is required by law to report suspicious transactions.',
       'I consent to ongoing monitoring of my account for compliance purposes.',
     ], { bulletRadius: 2, textIndent: 10 })
     .moveDown(1);

  sectionTitle(doc, 'Risk Assessment Summary');
  const rY = doc.y;
  row(doc, 'PEP Status:', 'Non-PEP', rY);
  row(doc, 'Sanctions Check:', 'Clear', rY + 16);
  row(doc, 'Country Risk:', 'Low (USA / Sweden)', rY + 32);
  row(doc, 'Transaction Risk:', 'Low', rY + 48);
  row(doc, 'Overall AML Rating:', 'LOW RISK', rY + 64);
  row(doc, 'Next Review Due:', 'March 2027', rY + 80);
  doc.y = rY + 104;

  doc.fontSize(9).fillColor('#333333');
  row(doc, 'Customer Signature:', '_______________________', doc.y);
  doc.moveDown(0.5);
  row(doc, 'Date:', '20 March 2025', doc.y);
  doc.moveDown(0.5);
  row(doc, 'Compliance Officer:', 'David K. Park — AML Division', doc.y);

  await save(doc, '05_kyc_aml_sofia_lindqvist.pdf');
}

// ─── Run all ─────────────────────────────────────────────────────────────────
(async () => {
  await doc1();
  await doc2();
  await doc3();
  await doc4();
  await doc5();
  console.log('\nAll sample documents created in:', outDir);
})();
