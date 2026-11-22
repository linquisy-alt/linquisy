'use strict';
const test = require('node:test');
const assert = require('node:assert');

process.env.CONTACT_EMAIL = 'test@example.org';
const { lookup } = require('../src/resolve');
const { formatReply } = require('../src/format');

/** Route fake responses by URL substring. Anything else returns 404. */
function mockFetch(routes) {
  globalThis.fetch = async (url) => {
    const hit = Object.keys(routes).find((k) => url.includes(k));
    if (!hit) return { ok: false, status: 404, text: async () => '' };
    const body = routes[hit];
    return { ok: true, status: 200, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) };
  };
}

test('DOI: prefers a real PDF and never returns a blocked host', async () => {
  mockFetch({
    'api.unpaywall.org': {
      doi: '10.1038/nature12373', title: 'Nanometre-scale thermometry in a living cell', year: 2013, is_oa: true,
      z_authors: [{ given: 'G.', family: 'Kucsko' }],
      best_oa_location: { url_for_pdf: 'https://sci-hub.se/10.1038/nature12373', url_for_landing_page: 'https://europepmc.org/articles/pmc4221854' },
    },
    'europepmc/webservices': { resultList: { result: [{ title: 'Nanometre-scale thermometry in a living cell.', doi: '10.1038/nature12373', pmcid: 'PMC4221854', isOpenAccess: 'N', pubYear: '2013', authorString: 'Kucsko G, Maurer PC',
      fullTextUrlList: { fullTextUrl: [{ availabilityCode: 'F', documentStyle: 'pdf', url: 'https://europepmc.org/articles/PMC4221854?pdf=render' }] } }] } },
  });
  const out = await lookup({ kind: 'doi', value: '10.1038/nature12373' });
  assert.strictEqual(out.status, 'found');
  assert.strictEqual(out.results[0].pdfUrl, 'https://europepmc.org/articles/PMC4221854?pdf=render');
  assert.ok(!JSON.stringify(out).includes('sci-hub'));
});

test('DOI that exists but is closed says so', async () => {
  mockFetch({ 'api.unpaywall.org': { doi: '10.1/closed', title: 'A paywalled paper', is_oa: false, best_oa_location: null } });
  const item = { kind: 'doi', value: '10.1/closed' };
  const out = await lookup(item);
  assert.strictEqual(out.status, 'not_open_access');
  const reply = formatReply([{ item, outcome: out }]);
  assert.match(reply.text, /no legal open-access copy/);
});

test('title search keeps only close matches and merges duplicates', async () => {
  mockFetch({
    'api.openalex.org/works?search': { results: [
      { display_name: 'Attention Is All You Need', doi: 'https://doi.org/10.48550/arxiv.1706.03762', publication_year: 2017,
        open_access: { is_oa: true, oa_url: 'https://arxiv.org/abs/1706.03762' }, best_oa_location: { landing_page_url: 'https://arxiv.org/abs/1706.03762' }, authorships: [{ author: { display_name: 'Ashish Vaswani' } }] },
      { display_name: 'Attention mechanisms in computer vision: a survey', doi: 'https://doi.org/10.1/other', open_access: { is_oa: true, oa_url: 'https://x.org/a' } },
    ] },
    'export.arxiv.org': `<feed><entry><id>http://arxiv.org/abs/1706.03762v7</id><published>2017-06-12T17:57:34Z</published><title>Attention Is All
      You Need</title><author><name>Ashish Vaswani</name></author><arxiv:doi>10.48550/arXiv.1706.03762</arxiv:doi></entry></feed>`,
  });
  const out = await lookup({ kind: 'title', value: 'Attention Is All You Need', explicit: false });
  assert.strictEqual(out.status, 'found');
  assert.strictEqual(out.results.length, 1);
  assert.strictEqual(out.results[0].pdfUrl, 'https://arxiv.org/pdf/1706.03762');
});

test('a guessed title with no match stays quiet; a command answers', async () => {
  mockFetch({});
  const guess = { kind: 'title', value: 'something nobody wrote', explicit: false };
  assert.strictEqual(formatReply([{ item: guess, outcome: await lookup(guess) }]), null);
  const cmd = { ...guess, explicit: true };
  assert.match(formatReply([{ item: cmd, outcome: await lookup(cmd) }]).text, /couldn't find/);
});

test('books: public-domain Gutenberg results, copyrighted ones dropped', async () => {
  mockFetch({
    'gutendex.com': { results: [
      { id: 1342, title: 'Pride and Prejudice', authors: [{ name: 'Austen, Jane' }], copyright: false, formats: { 'application/epub+zip': 'https://www.gutenberg.org/ebooks/1342.epub3.images' } },
      { id: 9, title: 'Pride and Prejudice (annotated)', copyright: true, formats: {} },
    ] },
  });
  const out = await lookup({ kind: 'title', value: 'Pride and Prejudice', explicit: true }, { messageText: 'book Pride and Prejudice' });
  assert.strictEqual(out.results.length, 1);
  assert.strictEqual(out.results[0].landingUrl, 'https://www.gutenberg.org/ebooks/1342');
  assert.strictEqual(out.results[0].epubUrl, 'https://www.gutenberg.org/ebooks/1342.epub3.images');
});

test('an exact title match hides longer near-miss titles', async () => {
  mockFetch({
    'api.openalex.org/works?search': { results: [
      { display_name: 'Attention Is All You Need', doi: 'https://doi.org/10.48550/arxiv.1706.03762', open_access: { is_oa: true, oa_url: 'https://proceedings.neurips.cc/x-Abstract.html' }, best_oa_location: { pdf_url: null, landing_page_url: 'https://proceedings.neurips.cc/x-Abstract.html' } },
      { display_name: 'Attention Is All You Need In Speech Separation', doi: 'https://doi.org/10.1109/icassp39728.2021.9413901', open_access: { is_oa: true, oa_url: 'https://arxiv.org/pdf/2010.13154' }, best_oa_location: { pdf_url: 'https://arxiv.org/pdf/2010.13154' } },
    ] },
  });
  const out = await lookup({ kind: 'title', value: 'Attention Is All You Need', explicit: false });
  assert.deepStrictEqual(out.results.map((r) => r.title), ['Attention Is All You Need']);
});
