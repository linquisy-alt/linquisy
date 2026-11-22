'use strict';
// Unpaywall: finds legal open-access copies for a DOI. Needs a real contact email. https://unpaywall.org/products/api
const { getJson } = require('../http');
const { result } = require('./util');

function map(d) {
  if (!d || !d.doi) return null;
  const loc = d.best_oa_location || {};
  return result({
    source: 'Unpaywall',
    title: d.title,
    authors: (d.z_authors || []).map((a) => [a.given, a.family].filter(Boolean).join(' ')),
    year: d.year,
    doi: d.doi,
    pdfUrl: loc.url_for_pdf,
    landingUrl: loc.url_for_landing_page || loc.url || d.doi_url,
    license: loc.license,
    isOpenAccess: Boolean(d.is_oa),
    kind: d.genre === 'book' || d.genre === 'book-chapter' ? 'book' : 'article',
  });
}

async function byDoi(doi) {
  const email = process.env.CONTACT_EMAIL;
  if (!email) return null; // Unpaywall rejects requests without a real email.
  return map(await getJson(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`));
}

module.exports = { byDoi, map };
