'use strict';
// DOAJ: articles from fully open-access, peer-reviewed journals. https://doaj.org/api/docs
const { getJson } = require('../http');
const { result } = require('./util');

function map(item) {
  const b = item && item.bibjson;
  if (!b) return null;
  const doi = (b.identifier || []).find((i) => (i.type || '').toLowerCase() === 'doi');
  const link = (b.link || []).find((l) => l.type === 'fulltext');
  const url = link && link.url;
  return result({
    source: 'DOAJ',
    title: b.title,
    authors: (b.author || []).map((a) => a.name),
    year: b.year,
    doi: doi && doi.id,
    pdfUrl: link && (link.content_type || '').toLowerCase() === 'pdf' ? url : null,
    landingUrl: url,
    license: 'Open access journal',
  });
}

async function search(title) {
  const q = encodeURIComponent(`bibjson.title:"${title.replace(/["/]/g, ' ')}"`);
  const data = await getJson(`https://doaj.org/api/search/articles/${q}?pageSize=3`);
  return ((data && data.results) || []).map(map).filter(Boolean);
}

module.exports = { search, map };
