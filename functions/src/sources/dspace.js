'use strict';
// OAPEN Library and DOAB (Directory of Open Access Books) run DSpace and share one REST API.
// https://www.oapen.org/resources/15635975-metadata-and-api  ·  https://www.doabooks.org/en/doab/api
const { getJson } = require('../http');
const { result } = require('./util');

function meta(item, key) {
  return (item.metadata || []).filter((m) => m.key === key).map((m) => m.value);
}

function mapper(base, source) {
  return (item) => {
    if (!item) return null;
    const pdf = (item.bitstreams || []).find(
      (b) => b.mimeType === 'application/pdf' && (b.bundleName || 'ORIGINAL') === 'ORIGINAL',
    );
    const handle = item.handle;
    return result({
      source,
      kind: 'book',
      title: meta(item, 'dc.title')[0] || item.name,
      authors: meta(item, 'dc.contributor.author').concat(meta(item, 'dc.contributor.editor')),
      year: (meta(item, 'dc.date.issued')[0] || '').slice(0, 4),
      doi: meta(item, 'oapen.identifier.doi')[0],
      pdfUrl: pdf ? `${base}${pdf.retrieveLink}` : null,
      landingUrl: handle ? `${base}/handle/${handle}` : meta(item, 'dc.identifier.uri')[0],
      license: meta(item, 'dc.rights.uri')[0] || meta(item, 'dc.rights')[0] || 'Open access book',
    });
  };
}

function makeSource(base, source) {
  const map = mapper(base, source);
  async function query(q) {
    const data = await getJson(`${base}/rest/search?query=${encodeURIComponent(q)}&expand=metadata,bitstreams&limit=5`);
    return (Array.isArray(data) ? data : []).map(map).filter(Boolean);
  }
  return {
    map,
    search: (title) => query(`dc.title:"${title.replace(/"/g, '')}"`).then((r) => (r.length ? r : query(title))),
    byIsbn: (isbn) => query(`oapen.relation.isbn:${isbn}`),
  };
}

const oapen = makeSource('https://library.oapen.org', 'OAPEN');
const doab = makeSource('https://directory.doabooks.org', 'DOAB');

module.exports = { oapen, doab, makeSource };
