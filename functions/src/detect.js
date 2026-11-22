'use strict';

/**
 * Finds things in a chat message that the Librarian bot can look up:
 * DOIs, arXiv IDs, PubMed / PMC IDs, ISBNs, and publication or book titles.
 *
 * Identifiers are always picked up. Titles are only picked up when the
 * message clearly asks for something (an explicit command, a quoted title,
 * or a phrase like "pdf of ..."), so ordinary chat does not trigger lookups.
 */

const DOI_RE = /\b(10\.\d{4,9}\/[^\s"'<>]+)/gi;
const ARXIV_NEW_RE = /\barxiv[:\s/]*(\d{4}\.\d{4,5})(v\d+)?\b|\barxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})(v\d+)?/gi;
const ARXIV_OLD_RE = /\barxiv[:\s/]*([a-z-]+(?:\.[A-Z]{2})?\/\d{7})(v\d+)?\b/gi;
const PMCID_RE = /\b(PMC\d{5,9})\b/gi;
const PMID_RE = /\b(?:PMID|pubmed)[:\s#]*(\d{5,9})\b|pubmed\.ncbi\.nlm\.nih\.gov\/(\d{5,9})/gi;
const ISBN_RE = /\bISBN(?:-1[03])?[:\s]*((?:97[89][\s-]?)?(?:\d[\s-]?){9}[\dXx])\b/g;

const COMMAND_RE = /^\s*(?:\/(?:find|pdf|paper|book)|@librarian\b)[\s:,-]*(.+)$/i;
const QUOTED_RE = /["“”«»]([^"“”«»]{12,250})["“”«»]/g;
const REQUEST_RES = [
  // "pdf of X", "pdf for X", "need the pdf: X"
  /\bpdf\s*(?:of|for|on|:|-)\s*(?:the\s+)?(?:paper|article|book|publication|study)?\s*(?:titled|called|named)?\s*[:-]?\s*(.{8,250})$/i,
  // "paper titled X", "book called X", "article named X"
  /\b(?:paper|article|book|publication|study|review|chapter|textbook)\s+(?:titled|called|named|entitled)\s*[:-]?\s*(.{6,250})$/i,
  // "anyone have / looking for / need / share ... X pdf"
  /\b(?:anyone\s+(?:have|has|got)|looking\s+for|searching\s+for|need|share|send|find|get)\s+(?:me\s+)?(?:the\s+|a\s+)?(?:pdf\s+(?:of\s+)?|paper\s+|book\s+|article\s+)?(.{8,250}?)\s+(?:pdf|e-?book|full[\s-]?text|paper)\b/i,
  // "X pdf please", "X pdf?"
  /^(.{8,250}?)\s+pdf\b\s*(?:please|pls|plz|\?|!|$)/i,
];

function cleanDoi(raw) {
  // Trailing punctuation that is part of the sentence, not the DOI.
  let doi = raw.replace(/[.,;:!?)\]}>]+$/, '');
  // Unbalanced trailing ")" is common when a DOI is in brackets.
  while (doi.endsWith(')') && (doi.match(/\(/g) || []).length < (doi.match(/\)/g) || []).length) {
    doi = doi.slice(0, -1);
  }
  return doi.toLowerCase();
}

function cleanTitle(raw) {
  return raw
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\b(?:please|pls|plz|thanks|thank you|anyone|if available|in open access|open access)\b/gi, ' ')
    .replace(/\s+(?:pdf|e-?book|full[\s-]?text)\s*$/i, ' ')
    .replace(/["“”«»]/g, ' ')
    .replace(/[?!.,;:]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isbnValid(isbn) {
  const s = isbn.replace(/[\s-]/g, '').toUpperCase();
  if (s.length === 10) {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const c = s[i];
      const v = c === 'X' && i === 9 ? 10 : Number(c);
      if (Number.isNaN(v)) return false;
      sum += v * (10 - i);
    }
    return sum % 11 === 0;
  }
  if (s.length === 13) {
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      const v = Number(s[i]);
      if (Number.isNaN(v)) return false;
      sum += v * (i % 2 === 0 ? 1 : 3);
    }
    return sum % 10 === 0;
  }
  return false;
}

function uniqBy(items, key) {
  const seen = new Set();
  return items.filter((it) => {
    const k = key(it);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * @param {string} text the chat message
 * @param {{mode?: 'auto'|'command'|'off'}} [opts]
 * @returns {Array<{kind: 'doi'|'arxiv'|'pmcid'|'pmid'|'isbn'|'title', value: string, explicit: boolean}>}
 */
function detect(text, opts = {}) {
  const mode = opts.mode || 'auto';
  if (!text || mode === 'off') return [];

  const command = text.match(COMMAND_RE);
  if (mode === 'command' && !command) return [];
  const body = command ? command[1] : text;
  const explicit = Boolean(command);

  const found = [];
  let m;

  for (m of body.matchAll(DOI_RE)) found.push({ kind: 'doi', value: cleanDoi(m[1]), explicit });
  for (m of body.matchAll(ARXIV_NEW_RE)) found.push({ kind: 'arxiv', value: m[1] || m[3], explicit });
  for (m of body.matchAll(ARXIV_OLD_RE)) found.push({ kind: 'arxiv', value: m[1], explicit });
  for (m of body.matchAll(PMCID_RE)) found.push({ kind: 'pmcid', value: m[1].toUpperCase(), explicit });
  for (m of body.matchAll(PMID_RE)) found.push({ kind: 'pmid', value: m[1] || m[2], explicit });
  for (m of body.matchAll(ISBN_RE)) {
    const isbn = m[1].replace(/[\s-]/g, '').toUpperCase();
    if (isbnValid(isbn)) found.push({ kind: 'isbn', value: isbn, explicit });
  }

  // Titles: only when nothing more precise was given.
  if (found.length === 0) {
    if (command) {
      const t = cleanTitle(body);
      if (t.length >= 3) found.push({ kind: 'title', value: t, explicit: true });
    } else {
      for (m of body.matchAll(QUOTED_RE)) {
        const t = cleanTitle(m[1]);
        if (t.split(' ').length >= 3) found.push({ kind: 'title', value: t, explicit: false });
      }
      if (found.length === 0) {
        for (const re of REQUEST_RES) {
          const r = body.match(re);
          if (r) {
            const t = cleanTitle(r[1]);
            if (t.split(' ').length >= 2 && t.length >= 8) {
              found.push({ kind: 'title', value: t, explicit: false });
              break;
            }
          }
        }
      }
    }
  }

  return uniqBy(found, (f) => `${f.kind}:${f.value.toLowerCase()}`).slice(0, 3);
}

module.exports = { detect, cleanDoi, cleanTitle, isbnValid };
