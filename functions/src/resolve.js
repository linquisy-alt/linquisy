'use strict';

const S = require('./sources');
const { isBlocked } = require('./blocklist');
const { titleScore } = require('./similarity');

const SOURCE_RANK = ['Unpaywall', 'Europe PMC', 'arXiv', 'OpenAlex', 'OAPEN', 'DOAB', 'DOAJ', 'CORE', 'Project Gutenberg'];

const settle = async (p) => {
  try {
    return await p;
  } catch {
    return null;
  }
};

/** Drop any link on a blocked host; keep the record if a safe link remains. */
function sanitize(r) {
  if (!r) return null;
  const out = { ...r };
  for (const k of ['pdfUrl', 'landingUrl', 'epubUrl']) if (out[k] && isBlocked(out[k])) out[k] = null;
  return out;
}

// Europe PMC lists its own PDF and an Unpaywall copy; either is fine.
const usable = (r) => r && r.isOpenAccess && (r.pdfUrl || r.landingUrl || r.epubUrl);

function rank(a, b) {
  if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
  if (Boolean(b.pdfUrl) !== Boolean(a.pdfUrl)) return b.pdfUrl ? 1 : -1;
  return SOURCE_RANK.indexOf(a.source) - SOURCE_RANK.indexOf(b.source);
}

/** Merge records of the same work found in several sources into one. */
function merge(records) {
  const groups = [];
  for (const r of records) {
    const key = r.doi || r.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, items: [] }));
    g.items.push(r);
  }
  return groups.map(({ items }) => {
    items.sort(rank);
    const best = { ...items[0] };
    const withPdf = items.find((i) => i.pdfUrl);
    if (!best.pdfUrl && withPdf) {
      best.pdfUrl = withPdf.pdfUrl;
      best.source = withPdf.source;
      best.license = best.license || withPdf.license;
    }
    best.score = Math.max(...items.map((i) => i.score || 0));
    best.alsoIn = [...new Set(items.map((i) => i.source))].filter((s) => s !== best.source);
    return best;
  });
}

/** Results for an identifier. `known` is metadata even when no open copy exists. */
async function byIdentifier(calls) {
  const rows = (await Promise.all(calls.map(settle))).map(sanitize).filter(Boolean);
  const open = rows.filter(usable).map((r) => ({ ...r, score: 1 }));
  if (open.length) return { status: 'found', results: merge(open).slice(0, 1) };
  if (rows.length) return { status: 'not_open_access', known: rows[0], results: [] };
  return { status: 'not_found', results: [] };
}

async function byTitle(title, { explicit, wantBooks }) {
  const calls = [
    S.openalex.search(title), S.europepmc.search(title), S.arxiv.search(title), S.doaj.search(title),
    S.core.search(title), S.oapen.search(title), S.doab.search(title), S.gutenberg.search(title),
  ];
  const lists = await Promise.all(calls.map(settle));
  const rows = lists.flat().map(sanitize).filter(usable).filter((r) => r.title);
  const min = explicit ? 0.55 : 0.75;
  const scored = rows
    .map((r) => ({ ...r, score: titleScore(title, r.title) }))
    .filter((r) => r.score >= min)
    .map((r) => (wantBooks && r.kind === 'book' ? { ...r, score: r.score + 0.05 } : r));
  const merged = merge(scored).sort(rank);
  if (!merged.length) return { status: 'not_found', results: [] };
  // An exact title match hides near-misses such as "Attention Is All You Need In Speech Separation".
  const top = merged[0].score;
  const slack = top >= 0.98 ? 0.02 : 0.1;
  return { status: 'found', results: merged.filter((r) => r.score >= top - slack).slice(0, 3) };
}

/**
 * Look one detected item up across the open-access sources.
 * @param {{kind: string, value: string, explicit?: boolean}} item from detect()
 */
async function lookup(item, { messageText = '' } = {}) {
  const v = item.value;
  switch (item.kind) {
    case 'doi':
      return byIdentifier([S.unpaywall.byDoi(v), S.europepmc.byDoi(v), S.openalex.byDoi(v)]);
    case 'arxiv':
      return byIdentifier([S.arxiv.byId(v)]);
    case 'pmcid':
      return byIdentifier([S.europepmc.byPmcid(v)]);
    case 'pmid':
      return byIdentifier([S.europepmc.byPmid(v)]);
    case 'isbn': {
      const direct = await byIdentifier([S.oapen.byIsbn(v).then((r) => r[0]), S.doab.byIsbn(v).then((r) => r[0])]);
      if (direct.status === 'found') return direct;
      const t = await settle(S.openlibrary.titleForIsbn(v));
      if (!t) return { status: 'not_found', results: [] };
      const r = await byTitle(t, { explicit: true, wantBooks: true });
      return r.status === 'found' ? r : { status: 'not_open_access', known: { title: t, kind: 'book' }, results: [] };
    }
    case 'title':
    default:
      return byTitle(v, { explicit: item.explicit, wantBooks: /\b(book|e-?book|textbook|novel)\b/i.test(messageText) });
  }
}

module.exports = { lookup, merge, sanitize };
