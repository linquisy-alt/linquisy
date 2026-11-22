'use strict';
module.exports = {
  openalex: require('./openalex'),
  unpaywall: require('./unpaywall'),
  europepmc: require('./europepmc'),
  arxiv: require('./arxiv'),
  core: require('./core'),
  doaj: require('./doaj'),
  ...require('./dspace'),
  gutenberg: require('./gutenberg'),
  openlibrary: require('./openlibrary'),
};
