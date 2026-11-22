'use strict';
// Europe PMC: biomedical literature, including the PubMed Central open-access subset. https://europepmc.org/RestfulWebService
const { getJson } = require('../http');
const { result } = require('./util');

const BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

function map(r) {
  if (!r) return null;
  const urls = (r.fullTextUrlList && r.fullTextUrlList.fullTextUrl) || [];
  const free = urls.filter((u) => ['OA', 'F'].includes(u.availabilityCode));
  const pdf = free.find((u) => u.documentStyle === 'pdf');
  const html = free.find((u) => u.documentStyle === 'html');
  const isOa = r.isOpenAccess === 'Y' || free.length > 0;
  const pmcPdf = r.pmcid && r.isOpenAccess === 'Y' ? `https://europepmc.org/articles/${r.pmcid}?pdf=render` : null;
  return result({
    source: 'Europe PMC',
    title: r.title,
    authors: (r.authorString || '').split(/,\s*/).map((s) => s.replace(/\.$/, '')),
    year: r.pubYear,
    doi: r.doi,
    pdfUrl: (pdf && pdf.url) || pmcPdf,
    landingUrl: r.pmcid ? `https://europepmc.org/article/PMC/${r.pmcid}` : (html && html.url) || (r.pmid ? `https://europepmc.org/article/MED/${r.pmid}` : null),
    license: r.license,
    isOpenAccess: isOa,
  });
}

async function query(q, size = 5) {
  const data = await getJson(`${BASE}?query=${encodeURIComponent(q)}&format=json&resultType=core&pageSize=${size}`);
  return ((data && data.resultList && data.resultList.result) || []).map(map).filter(Boolean);
}

const byDoi = async (doi) => (await query(`DOI:"${doi}"`, 1))[0] || null;
const byPmcid = async (id) => (await query(`PMCID:${id}`, 1))[0] || null;
const byPmid = async (id) => (await query(`EXT_ID:${id} AND SRC:MED`, 1))[0] || null;
const search = (title) => query(`TITLE:"${title.replace(/"/g, '')}" AND (OPEN_ACCESS:y OR HAS_FREE_FULLTEXT:y)`);

module.exports = { byDoi, byPmcid, byPmid, search, map };
