'use strict';
// arXiv: preprints in physics, maths, CS, biology and more; every paper is free to read. https://info.arxiv.org/help/api
const { getText } = require('../http');
const { result, decodeXml } = require('./util');

const BASE = 'https://export.arxiv.org/api/query';

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decodeXml(m[1]) : null;
}

function parse(xml) {
  if (!xml) return [];
  const entries = xml.split('<entry>').slice(1).map((e) => e.split('</entry>')[0]);
  return entries
    .map((e) => {
      const idUrl = tag(e, 'id') || '';
      const id = idUrl.replace(/^https?:\/\/arxiv\.org\/abs\//, '').replace(/v\d+$/, '');
      if (!id || /api\/errors/.test(idUrl)) return null;
      const authors = [...e.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)].map((m) => decodeXml(m[1]));
      return result({
        source: 'arXiv',
        title: tag(e, 'title'),
        authors,
        year: (tag(e, 'published') || '').slice(0, 4),
        doi: tag(e, 'arxiv:doi'),
        pdfUrl: `https://arxiv.org/pdf/${id}`,
        landingUrl: `https://arxiv.org/abs/${id}`,
        license: 'arXiv',
      });
    })
    .filter(Boolean);
}

async function byId(id) {
  return parse(await getText(`${BASE}?id_list=${encodeURIComponent(id)}`))[0] || null;
}

async function search(title) {
  const words = title.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).slice(0, 12).join(' ');
  return parse(await getText(`${BASE}?search_query=${encodeURIComponent(`ti:"${words}"`)}&max_results=3`));
}

module.exports = { byId, search, parse };
