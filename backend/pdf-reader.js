'use strict';

const fs          = require('fs');
const { pathToFileURL } = require('url');

// Lazily initialised so the dynamic import runs once
let _pdfjsLib = null;

async function getPdfjs() {
  if (_pdfjsLib) return _pdfjsLib;
  _pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  _pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  return _pdfjsLib;
}

/**
 * Extract text from a PDF file.
 * Returns { text: string, numPages: number, info: object }
 */
async function extractText(filePath) {
  const pdfjsLib = await getPdfjs();
  const data     = new Uint8Array(fs.readFileSync(filePath));

  const loadTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch:  false,
    isEvalSupported: false,
    useSystemFonts:  true,
  });

  const doc  = await loadTask.promise;
  const meta = await doc.getMetadata().catch(() => ({}));

  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page    = await doc.getPage(i);
    const content = await page.getTextContent();
    // Preserve rough layout by grouping items on the same Y position
    const lineMap = new Map();
    for (const item of content.items) {
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push(item.str);
    }
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    fullText += sortedYs.map(y => lineMap.get(y).join(' ')).join('\n') + '\n';
  }

  return {
    text:     fullText.replace(/\r\n/g, '\n').trim(),
    numPages: doc.numPages,
    info:     meta.info || {},
  };
}

module.exports = { extractText };

//"C:\Users\deepa\Downloads\ACK124459440080625.pdf"

//curl -X POST http://172.16.3.190:80/upload --form "files=@\"C:\Users\deepa\Downloads\ACK124459440080625.pdf\""

