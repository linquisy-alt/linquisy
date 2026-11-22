'use strict';
// CORE: full texts aggregated from university and subject repositories worldwide. Free API key: https://core.ac.uk/services/api
const { getJson } = require('../http');
const { result } = require('./util');

function map(w) {
  if (!w) return null;
  const dl = (w.links || []).find((l) => l.type === 'download');
  return result({
    source: 'CORE',
    title: w.title,
    authors: (w.authors || []).map((a) => a.name),
    year: w.yearPublished,
    doi: w.doi,
    pdfUrl: w.downloadUrl || (dl && dl.url),
    landingUrl: (w.links || []).find((l) => l.type === 'display')?.url || (w.id ? `https://core.ac.uk/works/${w.id}` : null),
  });
}

async function search(title) {
  const key = process.env.CORE_API_KEY;
  if (!key) return [];
  const q = encodeURIComponent(`title:"${title.replace(/"/g, '')}"`);
  const data = await getJson(`https://api.core.ac.uk/v3/search/works?q=${q}&limit=3`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  return ((data && data.results) || []).map(map).filter((r) => r && r.pdfUrl);
}

module.exports = { search, map };
