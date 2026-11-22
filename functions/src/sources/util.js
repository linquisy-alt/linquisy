'use strict';

function stripDoi(doi) {
  if (!doi) return null;
  return String(doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '').toLowerCase();
}

function looksLikePdf(url) {
  return Boolean(url) && /\.pdf($|[?#])|\/pdf(\/|$|[?#])|[?&](?:pdf=render|download=1)/i.test(url);
}

function decodeXml(s) {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

/** Every result from every source has this shape. */
function result(r) {
  return {
    title: r.title || null,
    authors: (r.authors || []).filter(Boolean).slice(0, 6),
    year: r.year ? Number(r.year) || null : null,
    doi: stripDoi(r.doi),
    pdfUrl: r.pdfUrl || null,
    landingUrl: r.landingUrl || null,
    epubUrl: r.extraUrl || null,
    license: r.license || null,
    isOpenAccess: r.isOpenAccess !== false,
    kind: r.kind || 'article',
    source: r.source,
  };
}

const mailto = () => encodeURIComponent(process.env.CONTACT_EMAIL || 'unset@example.org');

module.exports = { stripDoi, looksLikePdf, decodeXml, result, mailto };
