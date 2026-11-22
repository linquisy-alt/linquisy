'use strict';

/**
 * Shadow libraries and piracy mirrors. The bot never links to these, even if
 * an upstream index happens to return one. Matching is on the host name and
 * any of its subdomains, plus keyword checks for the many rotating mirrors.
 */
const BLOCKED_HOSTS = [
  'sci-hub.se', 'sci-hub.st', 'sci-hub.ru', 'sci-hub.ee', 'sci-hub.wf', 'sci-hub.ren',
  'sci-hub.do', 'sci-hub.tw', 'sci-hub.cc', 'sci-hub.hk', 'sci-hub.mksa.top', 'sci-hub.shop',
  'libgen.rs', 'libgen.is', 'libgen.st', 'libgen.li', 'libgen.lc', 'libgen.gs', 'libgen.vg',
  'libgen.pm', 'libgen.fun', 'library.lol', 'gen.lib.rus.ec', 'lib.rus.ec',
  'z-lib.org', 'z-lib.io', 'z-lib.id', 'z-lib.gs', 'z-library.sk', 'z-library.se', 'zlibrary.to',
  'singlelogin.re', '1lib.sk', 'b-ok.cc', 'b-ok.org', 'bookfi.net', 'booksc.org', 'booksc.me',
  'annas-archive.org', 'annas-archive.se', 'annas-archive.li', 'annas-archive.gs',
  'pdfdrive.com', 'pdfdrive.to', 'ebook3000.com', 'freebookspot.es', 'ebookee.org',
  'library.genesis', 'sci-net.xyz', 'scihub.wikicn.top', 'twin.sci-hub.se',
];

const BLOCKED_KEYWORDS = ['sci-hub', 'scihub', 'libgen', 'z-lib', 'zlibrary', 'annas-archive', 'library.lol'];

function isBlocked(url) {
  if (!url) return true;
  let host;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return true;
    host = u.hostname.toLowerCase();
  } catch {
    return true;
  }
  if (BLOCKED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
  return BLOCKED_KEYWORDS.some((k) => host.includes(k));
}

module.exports = { isBlocked, BLOCKED_HOSTS };
