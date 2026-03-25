'use strict';

const { extractText } = require('./pdf-reader');

// ── Helpers ─────────────────────────────────────────────────────────────────

function clean(text) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
}

function lines(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean);
}

// ── Document-type detector ───────────────────────────────────────────────────

const TYPE_SIGNATURES = {
  'Bank Statement': [
    /bank\s+statement/i,
    /account\s+(number|no\.?|#)/i,
    /opening\s+balance/i,
    /closing\s+balance/i,
    /available\s+balance/i,
    /transaction\s+(date|history)/i,
    /debit|credit/i,
    /deposits?\s+total/i,
  ],
  'Tax Return': [
    /form\s+1040/i,
    /adjusted\s+gross\s+income/i,
    /taxable\s+income/i,
    /federal\s+income\s+tax/i,
    /w-?2/i,
    /schedule\s+[abcde]/i,
    /irs/i,
    /filing\s+status/i,
  ],
  'KYC / Identity Document': [
    /know\s+your\s+customer/i,
    /date\s+of\s+birth/i,
    /passport/i,
    /driver'?s?\s+licen[sc]e/i,
    /national\s+id/i,
    /proof\s+of\s+(address|identity)/i,
    /government[-\s]issued/i,
  ],
  'Invoice': [
    /invoice\s*(no|number|#)?/i,
    /bill\s+to/i,
    /amount\s+due/i,
    /subtotal/i,
    /payment\s+terms/i,
    /purchase\s+order/i,
  ],
  'Pay Stub': [
    /pay\s+stub/i,
    /earnings\s+statement/i,
    /gross\s+pay/i,
    /net\s+pay/i,
    /ytd\s+(earnings|total)/i,
    /federal\s+withholding/i,
    /fica|social\s+security\s+tax/i,
  ],
};

function detectType(text, hintType) {
  // If user explicitly chose a known type, trust it but still scan
  const scores = {};
  for (const [type, patterns] of Object.entries(TYPE_SIGNATURES)) {
    scores[type] = patterns.filter(p => p.test(text)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best[1] > 0) return best[0];

  // Fallback to user hint
  const hintMap = {
    'bank-statement': 'Bank Statement',
    'tax-return':     'Tax Return',
    'not-known':      'Unknown Document',
  };
  return hintMap[hintType] || 'Unknown Document';
}

// ── Extractors ───────────────────────────────────────────────────────────────

function extractMoney(text) {
  const matches = [...text.matchAll(/\$\s?[\d,]+(?:\.\d{2})?/g)];
  return [...new Set(matches.map(m => m[0].replace(/\s/, '')))].slice(0, 20);
}

function extractDates(text) {
  const patterns = [
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi,
  ];
  const found = [];
  for (const p of patterns) found.push(...text.matchAll(p));
  return [...new Set(found.map(m => m[0]))].slice(0, 10);
}

function extractAccounts(text) {
  const matches = [...text.matchAll(/(?:account|acct|a\/c)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([\dX*\-]+)/gi)];
  return [...new Set(matches.map(m => m[1].trim()))].filter(v => v.length >= 4).slice(0, 5);
}

function extractNames(text) {
  // Look for lines with "Name:" or "Customer:" patterns
  const matches = [...text.matchAll(/(?:name|customer|payee|payer|taxpayer)\s*[:\-]\s*([A-Z][a-zA-Z\s,\.]+)/g)];
  return [...new Set(matches.map(m => m[1].trim()))].slice(0, 5);
}

function extractKeyValuePairs(text) {
  // Lines like  "Total:  $1,234.56"  or  "Period: Jan 2024"
  const pairs = [];
  const lns = lines(text);
  const kvRe = /^([A-Za-z][A-Za-z\s\(\)\/]{2,40})\s*[:\-]\s*(.{1,80})$/;
  for (const l of lns) {
    const m = l.match(kvRe);
    if (m) pairs.push({ key: m[1].trim(), value: m[2].trim() });
    if (pairs.length >= 30) break;
  }
  return pairs;
}

function extractTransactions(text) {
  // Rows that look like:  DATE  DESCRIPTION  AMOUNT
  const txRe = /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.{5,60}?)\s+(\$?[\d,]+\.\d{2})/g;
  const rows = [];
  let m;
  while ((m = txRe.exec(text)) !== null) {
    rows.push({ date: m[1], description: m[2].trim(), amount: m[3] });
    if (rows.length >= 30) break;
  }
  return rows;
}

// ── HTML builder ─────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(docType, meta, data, rawLines) {
  const sections = [];

  // ── Document Summary section
  const summaryRows = [
    ['Document Type', docType],
    ['Total Pages',   meta.pages],
    ['Word Count',    meta.wordCount],
    ...(meta.info?.Author  ? [['Author',  meta.info.Author]]  : []),
    ...(meta.info?.Creator ? [['Creator', meta.info.Creator]] : []),
    ...(meta.info?.CreationDate ? [['Created', meta.info.CreationDate]] : []),
  ];

  sections.push(`
    <div class="da-section">
      <h3 class="da-section-title">Document Summary</h3>
      <table class="da-table">
        ${summaryRows.map(([k, v]) => `
          <tr><td class="da-cell-key">${esc(k)}</td><td class="da-cell-val">${esc(v)}</td></tr>
        `).join('')}
      </table>
    </div>`);

  // ── Key-value pairs
  if (data.kvPairs.length) {
    sections.push(`
      <div class="da-section">
        <h3 class="da-section-title">Extracted Fields</h3>
        <table class="da-table">
          ${data.kvPairs.map(({ key, value }) => `
            <tr><td class="da-cell-key">${esc(key)}</td><td class="da-cell-val">${esc(value)}</td></tr>
          `).join('')}
        </table>
      </div>`);
  }

  // ── Accounts
  if (data.accounts.length) {
    sections.push(`
      <div class="da-section">
        <h3 class="da-section-title">Account References</h3>
        <div class="da-tag-list">
          ${data.accounts.map(a => `<span class="da-tag">${esc(a)}</span>`).join('')}
        </div>
      </div>`);
  }

  // ── Names
  if (data.names.length) {
    sections.push(`
      <div class="da-section">
        <h3 class="da-section-title">Identified Names</h3>
        <div class="da-tag-list">
          ${data.names.map(n => `<span class="da-tag">${esc(n)}</span>`).join('')}
        </div>
      </div>`);
  }

  // ── Dates
  if (data.dates.length) {
    sections.push(`
      <div class="da-section">
        <h3 class="da-section-title">Dates Found</h3>
        <div class="da-tag-list">
          ${data.dates.map(d => `<span class="da-tag da-tag--date">${esc(d)}</span>`).join('')}
        </div>
      </div>`);
  }

  // ── Monetary values
  if (data.amounts.length) {
    sections.push(`
      <div class="da-section">
        <h3 class="da-section-title">Monetary Values</h3>
        <div class="da-tag-list">
          ${data.amounts.map(a => `<span class="da-tag da-tag--money">${esc(a)}</span>`).join('')}
        </div>
      </div>`);
  }

  // ── Transactions table
  if (data.transactions.length) {
    sections.push(`
      <div class="da-section">
        <h3 class="da-section-title">Transactions (${data.transactions.length})</h3>
        <table class="da-table da-table--striped">
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            ${data.transactions.map(t => `
              <tr>
                <td class="da-cell-key">${esc(t.date)}</td>
                <td>${esc(t.description)}</td>
                <td class="da-cell-val">${esc(t.amount)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`);
  }

  // ── Raw text preview
  const preview = rawLines.slice(0, 60).map(l => esc(l)).join('\n');
  sections.push(`
    <div class="da-section da-section--collapsible">
      <h3 class="da-section-title">Raw Text Preview</h3>
      <pre class="da-raw">${preview}</pre>
    </div>`);

  return `
    <div class="da-report">
      <div class="da-report-header">
        <h2 class="da-report-title">${esc(docType)} — Analysis Report</h2>
        <p class="da-report-sub">Extracted using pdf-parse &bull; ${meta.wordCount} words across ${meta.pages} page(s)</p>
      </div>
      ${sections.join('\n')}
    </div>`;
}

// ── Main export ──────────────────────────────────────────────────────────────

async function analyzeDocument(filePath, hintType) {
  const { text: rawText, numPages, info } = await extractText(filePath);

  const text      = clean(rawText);
  const textLines = lines(rawText);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const docType = detectType(text, hintType);

  const data = {
    kvPairs:      extractKeyValuePairs(text),
    accounts:     extractAccounts(text),
    names:        extractNames(text),
    dates:        extractDates(text),
    amounts:      extractMoney(text),
    transactions: extractTransactions(text),
  };

  const meta = {
    pages:     numPages,
    wordCount,
    info:      info || {},
  };

  const html = buildHtml(docType, meta, data, textLines);

  return { docType, html, wordCount, pages: numPages };
}

module.exports = { analyzeDocument };
