#!/usr/bin/env node
'use strict';
// Try the bot without Firebase:  CONTACT_EMAIL=you@example.org node cli.js "anyone have the pdf of attention is all you need?"
const { detect } = require('./src/detect');
const { lookup } = require('./src/resolve');
const { formatReply } = require('./src/format');

(async () => {
  const text = process.argv.slice(2).join(' ');
  if (!text) {
    console.error('Usage: node cli.js "<chat message>"');
    process.exit(1);
  }
  const items = detect(text);
  console.log('Detected:', items);
  const outcomes = [];
  for (const item of items) outcomes.push({ item, outcome: await lookup(item, { messageText: text }) });
  const reply = formatReply(outcomes);
  console.log('\nBot reply:\n', reply ? reply.text : '(stays quiet)');
  if (reply) for (const r of reply.results) console.log('  PDF:', r.pdfUrl || '-', '\n  Page:', r.landingUrl || '-');
})();
