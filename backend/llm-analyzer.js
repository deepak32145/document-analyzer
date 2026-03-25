'use strict';

const { extractText } = require('./pdf-reader');
const nlp             = require('compromise');
const natural         = require('natural');

// ── Stop-words for TF-IDF filtering ─────────────────────────
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'this','that','these','those','it','its','as','if','than','then',
  'your','our','their','his','her','we','you','they','i','my','page',
  'please','dear','sincerely','regarding','subject','re','cc','per',
]);

// ── Document-type signatures ─────────────────────────────────
const TYPE_SIGNATURES = {
  'Bank Statement': [
    /bank\s+statement/i, /account\s+(number|no\.?|#)/i,
    /opening\s+balance/i, /closing\s+balance/i, /available\s+balance/i,
    /transaction\s+(date|history)/i, /routing\s+number/i,
  ],
  'Tax Return': [
    /form\s+1040/i, /adjusted\s+gross\s+income/i, /taxable\s+income/i,
    /federal\s+income\s+tax/i, /w-?2/i, /schedule\s+[abcde]/i, /\birs\b/i,
  ],
  'Invoice': [
    /invoice\s*(no|number|#)?/i, /bill\s+to/i, /amount\s+due/i,
    /subtotal/i, /payment\s+terms/i, /purchase\s+order/i,
  ],
  'Pay Stub': [
    /pay\s+stub/i, /gross\s+pay/i, /net\s+pay/i,
    /ytd\s+(earnings|total)/i, /federal\s+withholding/i, /\bfica\b/i,
  ],
  'KYC / Identity Document': [
    /know\s+your\s+customer/i, /date\s+of\s+birth/i, /passport/i,
    /driver'?s?\s+licen[sc]e/i, /proof\s+of\s+(address|identity)/i,
  ],
};

function detectType(text) {
  const scores = {};
  for (const [type, patterns] of Object.entries(TYPE_SIGNATURES)) {
    scores[type] = patterns.filter(p => p.test(text)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'Document';
}

// ── Structure: detect section headings inside raw text ───────
function detectSections(rawLines) {
  const sections = [];
  let current = null;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Heading heuristics: ALL CAPS line, or short line ending with ':', or separator line
    const isHeading =
      (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 80 && !/^\d/.test(trimmed)) ||
      (trimmed.endsWith(':') && trimmed.length < 60 && !/[,$]/.test(trimmed)) ||
      /^[-=*]{4,}/.test(trimmed);

    if (isHeading && !/^page\s+\d/i.test(trimmed)) {
      if (current && current.lines.length) sections.push(current);
      current = { heading: trimmed.replace(/:$/, '').replace(/^[-=* ]+|[-=* ]+$/g, '').trim(), lines: [] };
    } else if (current) {
      current.lines.push(trimmed);
    } else {
      if (!current) current = { heading: null, lines: [] };
      current.lines.push(trimmed);
    }
  }
  if (current && current.lines.length) sections.push(current);
  return sections.filter(s => s.lines.length > 0);
}

// ── Regex extractors ─────────────────────────────────────────
function extractEmails(text) {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
  return [...new Set(m)].slice(0, 5);
}

function extractPhones(text) {
  const m = text.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g) || [];
  return [...new Set(m)].slice(0, 5);
}

function extractAccountNumbers(text) {
  const m = [...text.matchAll(/(?:account|acct|a\/c)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([\dX*\-]{4,20})/gi)];
  return [...new Set(m.map(x => x[1].trim()))].slice(0, 5);
}

function extractRoutingNumbers(text) {
  const m = [...text.matchAll(/(?:routing|aba|transit)\s*(?:no\.?|number|#)?\s*[:\-]?\s*(\d{9})/gi)];
  return [...new Set(m.map(x => x[1]))].slice(0, 3);
}

function extractDates(text) {
  const p = [
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{4}[-\/]\d{2}[-\/]\d{2}\b/g,
  ];
  const found = [];
  for (const pat of p) found.push(...(text.match(pat) || []));
  return [...new Set(found)].slice(0, 12);
}

function extractMoneyAmounts(text) {
  const m = text.match(/\$\s?[\d,]+(?:\.\d{2})?/g) || [];
  return [...new Set(m.map(v => v.replace(/\s/, '')))].slice(0, 20);
}

function extractKeyValues(rawLines) {
  const kvRe = /^([A-Za-z][A-Za-z\s\/\(\)\-]{2,40})\s*[:\-]\s*(.{1,100})$/;
  const pairs = [];
  for (const line of rawLines) {
    const m = line.trim().match(kvRe);
    if (m && m[2].trim().length > 0) {
      pairs.push({ key: m[1].trim(), value: m[2].trim() });
      if (pairs.length >= 40) break;
    }
  }
  return pairs;
}

function extractTransactions(text) {
  const txRe = /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.{5,60}?)\s+(\$?[\d,]+\.\d{2})\s*$/gm;
  const rows = [];
  let m;
  while ((m = txRe.exec(text)) !== null) {
    rows.push({ date: m[1], description: m[2].trim(), amount: m[3] });
    if (rows.length >= 30) break;
  }
  return rows;
}

// ── TF-IDF top keywords ──────────────────────────────────────
function extractTopKeywords(text, n = 12) {
  const TfIdf = natural.TfIdf;
  const tfidf = new TfIdf();
  // Split text into paragraphs so IDF has multiple docs to score against
  const chunks = text.match(/.{1,400}/g) || [text];
  chunks.forEach(c => tfidf.addDocument(c));
  const freq = {};
  chunks.forEach((_, i) => {
    tfidf.listTerms(i).forEach(({ term, tfidf: score }) => {
      if (term.length > 3 && !STOP_WORDS.has(term.toLowerCase()) && /^[a-z]+$/i.test(term)) {
        freq[term] = (freq[term] || 0) + score;
      }
    });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) => term);
}

// ── Dynamic title builder ────────────────────────────────────
function buildTitle(docType, orgs, people, dates) {
  const parts = [docType];
  if (orgs.length)    parts.push(orgs[0].replace(/\.$/, ''));
  else if (people.length) parts.push(people[0]);
  if (dates.length)   parts.push(dates[0]);
  return parts.join(' — ');
}

// ── HTML escape ──────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── HTML builder ─────────────────────────────────────────────
function buildHtml({ title, summary, docType, meta, entities, fields, transactions, keywords, sections, contacts }) {
  const parts = [];

  // Header
  parts.push(`
    <div class="llm-report">
      <h2 class="llm-title">${esc(title)}</h2>
      <p class="llm-summary">${esc(summary)}</p>`);

  // Document metadata
  parts.push(`
      <div class="llm-section">
        <h3 class="llm-section-title">Document Overview</h3>
        <table class="llm-table">
          <tr><td class="llm-key">Document Type</td><td class="llm-val"><span class="llm-badge llm-badge--neutral">${esc(docType)}</span></td></tr>
          <tr><td class="llm-key">Pages</td><td class="llm-val">${esc(meta.pages)}</td></tr>
          <tr><td class="llm-key">Word Count</td><td class="llm-val">${esc(meta.wordCount)}</td></tr>
          ${meta.infoAuthor  ? `<tr><td class="llm-key">Author</td><td class="llm-val">${esc(meta.infoAuthor)}</td></tr>` : ''}
          ${meta.infoCreated ? `<tr><td class="llm-key">Created</td><td class="llm-val">${esc(meta.infoCreated)}</td></tr>` : ''}
        </table>
      </div>`);

  // Entities: people & orgs
  if (entities.people.length || entities.orgs.length) {
    const rows = [
      ...entities.people.map(p => `<tr><td class="llm-key">Person</td><td class="llm-val">${esc(p)}</td></tr>`),
      ...entities.orgs.map(o =>   `<tr><td class="llm-key">Organization</td><td class="llm-val">${esc(o)}</td></tr>`),
      ...entities.places.map(l => `<tr><td class="llm-key">Location</td><td class="llm-val">${esc(l)}</td></tr>`),
    ];
    parts.push(`
      <div class="llm-section">
        <h3 class="llm-section-title">Identified Entities</h3>
        <table class="llm-table">${rows.join('')}</table>
      </div>`);
  }

  // Contact info
  if (contacts.emails.length || contacts.phones.length) {
    const rows = [
      ...contacts.emails.map(e => `<tr><td class="llm-key">Email</td><td class="llm-val">${esc(e)}</td></tr>`),
      ...contacts.phones.map(p => `<tr><td class="llm-key">Phone</td><td class="llm-val">${esc(p)}</td></tr>`),
    ];
    parts.push(`
      <div class="llm-section">
        <h3 class="llm-section-title">Contact Information</h3>
        <table class="llm-table">${rows.join('')}</table>
      </div>`);
  }

  // Financial data
  if (fields.accounts.length || fields.routing.length || entities.money.length) {
    const rows = [
      ...fields.accounts.map(a => `<tr><td class="llm-key">Account No.</td><td class="llm-val">${esc(a)}</td></tr>`),
      ...fields.routing.map(r =>  `<tr><td class="llm-key">Routing No.</td><td class="llm-val">${esc(r)}</td></tr>`),
      ...entities.money.slice(0, 10).map(m => `<tr><td class="llm-key">Amount</td><td class="llm-val"><span class="llm-badge llm-badge--positive">${esc(m)}</span></td></tr>`),
    ];
    if (rows.length) {
      parts.push(`
      <div class="llm-section">
        <h3 class="llm-section-title">Financial Data</h3>
        <table class="llm-table">${rows.join('')}</table>
      </div>`);
    }
  }

  // Key-value fields extracted from document
  if (fields.keyValues.length) {
    parts.push(`
      <div class="llm-section">
        <h3 class="llm-section-title">Extracted Fields</h3>
        <table class="llm-table">
          ${fields.keyValues.map(({ key, value }) =>
            `<tr><td class="llm-key">${esc(key)}</td><td class="llm-val">${esc(value)}</td></tr>`
          ).join('')}
        </table>
      </div>`);
  }

  // Dates
  if (fields.dates.length) {
    parts.push(`
      <div class="llm-section">
        <h3 class="llm-section-title">Dates Referenced</h3>
        <div class="llm-tag-row">
          ${fields.dates.map(d => `<span class="llm-badge llm-badge--date">${esc(d)}</span>`).join(' ')}
        </div>
      </div>`);
  }

  // Transactions table
  if (transactions.length) {
    parts.push(`
      <div class="llm-section">
        <h3 class="llm-section-title">Transactions (${transactions.length})</h3>
        <table class="llm-table">
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td class="llm-key">${esc(t.date)}</td>
                <td class="llm-val">${esc(t.description)}</td>
                <td class="llm-val"><span class="llm-badge llm-badge--positive">${esc(t.amount)}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`);
  }

  // Document sections (from structure detection)
  const namedSections = sections.filter(s => s.heading && s.lines.length >= 2);
  if (namedSections.length) {
    const sectionHtml = namedSections.slice(0, 8).map(s => `
      <div class="llm-doc-section">
        <div class="llm-doc-section-title">${esc(s.heading)}</div>
        <p class="llm-doc-section-body">${esc(s.lines.slice(0, 6).join(' '))}</p>
      </div>`).join('');
    parts.push(`
      <div class="llm-section">
        <h3 class="llm-section-title">Document Sections</h3>
        ${sectionHtml}
      </div>`);
  }

  // Top keywords
  if (keywords.length) {
    parts.push(`
      <div class="llm-section">
        <h3 class="llm-section-title">Key Terms</h3>
        <div class="llm-tag-row">
          ${keywords.map(k => `<span class="llm-badge llm-badge--neutral">${esc(k)}</span>`).join(' ')}
        </div>
      </div>`);
  }

  parts.push(`</div>`);
  return parts.join('\n');
}

// ── Main export ──────────────────────────────────────────────
async function analyzeLlm(filePath, hintType) {
  const { text: rawText, numPages, info } = await extractText(filePath);
  const rawLines  = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;

  if (!rawText || wordCount < 5) {
    throw new Error('Could not extract readable text from this PDF.');
  }

  // NLP with compromise
  const doc    = nlp(rawText.slice(0, 15000));
  const people = [...new Set(doc.people().out('array'))].slice(0, 8);
  const orgs   = [...new Set(doc.organizations().out('array').map(o => o.replace(/\.$/, '')))].slice(0, 6);
  const places = [...new Set(doc.places().out('array').map(p => p.replace(/\.$/, '')))].slice(0, 5);
  const money  = [...new Set(doc.match('#Money+').out('array'))].slice(0, 15);

  // Regex extractors
  const dates      = extractDates(rawText);
  const amounts    = extractMoneyAmounts(rawText);
  const allMoney   = [...new Set([...money, ...amounts])].slice(0, 15);
  const accounts   = extractAccountNumbers(rawText);
  const routing    = extractRoutingNumbers(rawText);
  const emails     = extractEmails(rawText);
  const phones     = extractPhones(rawText);
  const keyValues  = extractKeyValues(rawLines);
  const transactions = extractTransactions(rawText);

  // Structure
  const sections = detectSections(rawLines);

  // Keywords via TF-IDF
  const keywords = extractTopKeywords(rawText, 14);

  // Detect type
  const docType = detectType(rawText) || (
    hintType === 'bank-statement' ? 'Bank Statement' :
    hintType === 'tax-return'     ? 'Tax Return' : 'Document'
  );

  // Dynamic title
  const title = buildTitle(docType, orgs, people, dates);

  // Summary sentence
  const sentenceTokenizer = new natural.SentenceTokenizer();
  const sentences = sentenceTokenizer.tokenize(rawText.slice(0, 3000));
  const firstMeaningful = sentences.find(s => s.split(' ').length > 6) || sentences[0] || '';
  const summary = firstMeaningful.length > 180
    ? firstMeaningful.slice(0, 180) + '...'
    : firstMeaningful;

  const html = buildHtml({
    title,
    summary,
    docType,
    meta: {
      pages:      numPages,
      wordCount,
      infoAuthor:  info?.Author       || null,
      infoCreated: info?.CreationDate || null,
    },
    entities: { people, orgs, places, money: allMoney },
    fields:   { accounts, routing, dates, keyValues },
    transactions,
    keywords,
    sections,
    contacts: { emails, phones },
  });

  return { html, pages: numPages, wordCount };
}

module.exports = { analyzeLlm };
