'use strict';

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Stream Anthropic analysis for an uploaded file buffer.
 * Returns an async iterable of SSE-style text chunks.
 * mimeType must be a supported image type or 'application/pdf'.
 */
async function* streamAnalysis(fileBuffer, mimeType) {
  const base64Data = fileBuffer.toString('base64');

  const contentBlock = mimeType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }
    : { type: 'image',    source: { type: 'base64', media_type: mimeType,           data: base64Data } };

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        contentBlock,
        { type: 'text', text: 'Analyze this document and show me text and all data in this document' },
      ],
    }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

module.exports = { streamAnalysis };
