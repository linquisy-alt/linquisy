'use strict';

const STOP = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'for', 'to', 'with', 'by', 'at', 'from', 'is', 'are']);

function tokens(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

/**
 * How well a result title matches what the user typed, from 0 to 1.
 * Uses the share of the query's words found in the title, lightly penalised
 * when the title is much longer than the query.
 */
function titleScore(query, title) {
  const q = tokens(query);
  const t = tokens(title);
  if (q.length === 0 || t.length === 0) return 0;
  const tset = new Set(t);
  const hit = q.filter((w) => tset.has(w)).length;
  const recall = hit / q.length;
  const precision = hit / t.length;
  return 0.75 * recall + 0.25 * precision;
}

module.exports = { titleScore, tokens };
