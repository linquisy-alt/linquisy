'use strict';
// OpenAlex: open index of ~250M scholarly works with open-access locations. https://docs.openalex.org
const { getJson } = require('../http');
const { result, mailto, looksLikePdf } = require('./util');

const BASE = 'https://api.openalex.org';

function keyParam() {
  return process.env.OPENALEX_API_KEY ? `&api_key=${encodeURIComponent(process.env.OPENALEX_API_KEY)}` : '';
}

function map(w) {
  if (!w) return null;
  const loc = w.best_oa_location || {};
  const oaUrl = w.open_access && w.open_access.oa_url;
  return result({
    source: 'OpenAlex',
    title: w.display_name || w.title,
    authors: (w.authorships || []).map((a) => a.author && a.author.display_name),
    year: w.publication_year,
    doi: w.doi,
    pdfUrl: loc.pdf_url || (looksLikePdf(oaUrl) ? oaUrl : null),
    landingUrl: loc.landing_page_url || oaUrl || w.doi,
    license: loc.license,
    isOpenAccess: Boolean(w.open_access && w.open_access.is_oa),
    kind: w.type === 'book' || w.type === 'book-chapter' ? 'book' : 'article',
  });
}

async function byDoi(doi) {
  return map(await getJson(`${BASE}/works/doi:${encodeURIComponent(doi)}?mailto=${mailto()}${keyParam()}`));
}

async function search(title) {
  const q = encodeURIComponent(title.replace(/[,:|]/g, ' '));
  const data = await getJson(`${BASE}/works?search=${q}&filter=is_oa:true&per-page=5&mailto=${mailto()}${keyParam()}`);
  return ((data && data.results) || []).map(map).filter(Boolean);
}

module.exports = { byDoi, search, map };
