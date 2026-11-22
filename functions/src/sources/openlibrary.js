'use strict';
// Open Library: used only to turn an ISBN into a title, which is then searched in open-access book sources.
const { getJson } = require('../http');

async function titleForIsbn(isbn) {
  const d = await getJson(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
  return (d && d.title) || null;
}

module.exports = { titleForIsbn };
