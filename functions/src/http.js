'use strict';

const DEFAULT_TIMEOUT_MS = 8000;

function userAgent() {
  const contact = process.env.CONTACT_EMAIL || 'unset@example.org';
  return `PagoraLibrarian/0.1 (open-access lookup bot; mailto:${contact})`;
}

/** fetch with a timeout and a polite User-Agent. Returns null on any failure. */
async function getJson(url, { timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = {}) {
  const res = await getRaw(url, { timeoutMs, headers: { Accept: 'application/json', ...headers } });
  if (!res) return null;
  try {
    return JSON.parse(res);
  } catch {
    return null;
  }
}

async function getText(url, opts = {}) {
  return getRaw(url, opts);
}

async function getRaw(url, { timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await globalThis.fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': userAgent(), ...headers },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { getJson, getText, userAgent };
