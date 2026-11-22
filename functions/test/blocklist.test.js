'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { isBlocked } = require('../src/blocklist');

test('blocks shadow libraries and their mirrors', () => {
  for (const u of ['https://sci-hub.se/10.1/x', 'https://twin.sci-hub.st/x.pdf', 'http://libgen.rs/book', 'https://sci-hub.newmirror.xyz/a', 'https://annas-archive.org/md5/1', 'https://z-library.sk/b', 'ftp://example.org/a.pdf', 'not a url']) {
    assert.ok(isBlocked(u), u);
  }
});

test('allows legal open-access hosts', () => {
  for (const u of ['https://arxiv.org/pdf/1706.03762', 'https://europepmc.org/articles/PMC1?pdf=render', 'https://www.nature.com/articles/x.pdf', 'https://library.oapen.org/bitstream/1/2.pdf']) {
    assert.ok(!isBlocked(u), u);
  }
});
