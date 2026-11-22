'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { detect, isbnValid } = require('../src/detect');

const kinds = (t, o) => detect(t, o).map((d) => `${d.kind}:${d.value}`);

test('finds DOIs and trims sentence punctuation', () => {
  assert.deepStrictEqual(kinds('see 10.1038/nature12373.'), ['doi:10.1038/nature12373']);
  assert.deepStrictEqual(kinds('(doi: 10.1016/S0140-6736(20)30183-5)'), ['doi:10.1016/s0140-6736(20)30183-5']);
  assert.deepStrictEqual(kinds('https://doi.org/10.1371/journal.pone.0000001'), ['doi:10.1371/journal.pone.0000001']);
});

test('finds arXiv, PMC, PubMed and ISBN identifiers', () => {
  assert.deepStrictEqual(kinds('arXiv:1706.03762v5'), ['arxiv:1706.03762']);
  assert.deepStrictEqual(kinds('https://arxiv.org/abs/2005.14165'), ['arxiv:2005.14165']);
  assert.deepStrictEqual(kinds('look at PMC3159421'), ['pmcid:PMC3159421']);
  assert.deepStrictEqual(kinds('PMID: 21876761'), ['pmid:21876761']);
  assert.deepStrictEqual(kinds('ISBN 978-3-16-148410-0'), ['isbn:9783161484100']);
  assert.deepStrictEqual(kinds('ISBN 978-3-16-148410-1'), []); // bad checksum
  assert.ok(isbnValid('0306406152'));
});

test('finds titles only when the message asks for something', () => {
  assert.deepStrictEqual(kinds('anyone have the pdf of Attention Is All You Need?'), ['title:Attention Is All You Need']);
  assert.deepStrictEqual(kinds('Can you share "Deep residual learning for image recognition"'), ['title:Deep residual learning for image recognition']);
  assert.deepStrictEqual(kinds('book called Pride and Prejudice'), ['title:Pride and Prejudice']);
  assert.deepStrictEqual(kinds('Harrison principles of internal medicine pdf please'), ['title:Harrison principles of internal medicine']);
  assert.deepStrictEqual(kinds('see you at the meeting tomorrow'), []);
  assert.deepStrictEqual(kinds('I read a paper yesterday'), []);
});

test('commands always search, and respect the chat mode', () => {
  assert.deepStrictEqual(kinds('/find crispr cas9 genome editing'), ['title:crispr cas9 genome editing']);
  assert.deepStrictEqual(kinds('@librarian 10.1038/nature12373'), ['doi:10.1038/nature12373']);
  assert.deepStrictEqual(kinds('pdf of Attention Is All You Need', { mode: 'command' }), []);
  assert.deepStrictEqual(kinds('/find Attention Is All You Need', { mode: 'command' }), ['title:Attention Is All You Need']);
  assert.deepStrictEqual(kinds('/find anything', { mode: 'off' }), []);
  assert.strictEqual(detect('/find x')[0], undefined);
});
