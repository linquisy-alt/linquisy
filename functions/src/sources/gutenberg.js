'use strict';
// Project Gutenberg (via the Gutendex API): public-domain books. https://gutendex.com
const { getJson } = require('../http');
const { result } = require('./util');

function map(b) {
  if (!b || b.copyright) return null; // Only books Gutenberg marks as public domain in the US.
  const f = b.formats || {};
  const pdfKey = Object.keys(f).find((k) => k.startsWith('application/pdf'));
  const epubKey = Object.keys(f).find((k) => k.startsWith('application/epub'));
  return result({
    source: 'Project Gutenberg',
    kind: 'book',
    title: b.title,
    authors: (b.authors || []).map((a) => a.name),
    pdfUrl: pdfKey ? f[pdfKey] : null,
    landingUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
    license: 'Public domain (US)',
    extraUrl: epubKey ? f[epubKey] : null,
  });
}

async function search(title) {
  const data = await getJson(`https://gutendex.com/books?search=${encodeURIComponent(title)}`);
  return ((data && data.results) || []).slice(0, 5).map(map).filter(Boolean);
}

module.exports = { search, map };
