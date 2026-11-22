'use strict';

function cite(r) {
  const who = r.authors && r.authors.length ? `${r.authors[0]}${r.authors.length > 1 ? ' et al.' : ''}` : null;
  return [who, r.year].filter(Boolean).join(', ');
}

/**
 * Turn lookup outcomes into the bot's chat message.
 * @returns {{text: string, results: object[]} | null} null when nothing should be posted.
 */
function formatReply(outcomes) {
  const results = [];
  const lines = [];
  for (const { item, outcome } of outcomes) {
    if (outcome.status === 'found') {
      results.push(...outcome.results);
    } else if (item.kind !== 'title' || item.explicit) {
      // Stay quiet on a guessed title with no match; always answer identifiers and commands.
      const label = item.kind === 'title' ? `“${item.value}”` : `${item.kind.toUpperCase()} ${item.value}`;
      if (outcome.status === 'not_open_access') {
        const t = outcome.known && outcome.known.title ? `“${outcome.known.title}” ` : '';
        lines.push(`${t}(${label}) has no legal open-access copy I can find. Try your library, the author's page, or an interlibrary loan.`);
      } else {
        lines.push(`I couldn't find an open-access copy for ${label}.`);
      }
    }
  }
  if (!results.length && !lines.length) return null;
  const head = results.length
    ? results.map((r) => `📄 ${r.title}${cite(r) ? ` (${cite(r)})` : ''} · ${r.source}`).join('\n')
    : '';
  return { text: [head, ...lines].filter(Boolean).join('\n'), results };
}

module.exports = { formatReply };
