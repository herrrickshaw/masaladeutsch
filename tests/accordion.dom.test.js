'use strict';
/* Characterisation test: load accordion.js under a tiny fake DOM, feed it
   canned Blogger JSONP responses, and check what it builds. No jsdom -- the
   stub implements only what the script touches. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const fs = require('node:fs');

const FILE = path.join(__dirname, '..', 'accordion.js');
const BASE = 'https://masaladeutsch.blogspot.com';

function el(tag) {
  let html = '';
  return {
    tag, tagName: tag.toUpperCase(), children: [], attrs: {}, style: {}, listeners: {}, textContent: '',
    /* like the real thing, assigning innerHTML discards existing children */
    get innerHTML() { return html; },
    set innerHTML(v) { html = v; this.children.length = 0; },
    appendChild(c) { this.children.push(c); return c; },
    insertBefore(c, ref) { const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); return c; },
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k] == null ? null : this.attrs[k]; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    querySelector(sel) { return this.children.find((c) => c.tag === sel) || null; },
    get firstChild() { return this.children[0] || null; },
  };
}

function loadPage() {
  const artx = el('div');
  artx.children.push(Object.assign(el('p'), { innerText: 'Hello world' }), Object.assign(el('script'), { textContent: 'var x;' }));
  const host = el('div');
  const store = {};
  const document = {
    head: el('head'), body: el('body'), documentElement: el('html'), createElement: el,
    cookie: 'googtrans=/en/hi', title: 'A post – Masala Deutsch',
    getElementById: (i) => (i === 'gs-idx' ? host : null),
    querySelector: (s) => (s === '.artx' ? artx : null),
    querySelectorAll: () => [],
  };
  const sb = {
    document, console, JSON, encodeURIComponent,
    localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    location: { hostname: 'masaladeutsch.blogspot.com', pathname: '/2026/09/x.html', href: BASE + '/2026/09/x.html' },
    MutationObserver: class { observe() {} },
    setInterval: () => 1, clearInterval() {}, addEventListener() {},
    speechSynthesis: { cancel() {}, pause() {}, resume() {}, speaking: true, speak(u) { sb.spoken = u; } },
    SpeechSynthesisUtterance: class { constructor(t) { this.text = t; } },
  };
  sb.window = sb;
  vm.runInNewContext(fs.readFileSync(FILE, 'utf8'), sb, { filename: 'accordion.js' });
  return { sb, document, artx, host, store };
}

const feedScripts = (document) => document.head.children.filter((c) => c.tag === 'script' && c.src).map((c) => c.src);

test('accessibility bar: text-size buttons scale :root and persist; Listen reads the page in the translate language', () => {
  const { sb, document, artx, store } = loadPage();
  const bar = artx.children[0];
  assert.equal(artx.attrs['data-a11y-done'], '1');
  assert.equal(document.documentElement.style.fontSize, '100%');
  const buttons = bar.children.filter((c) => c.tag === 'button');
  assert.deepEqual(buttons.map((b) => b.textContent), ['A', 'A', 'A', '🔊 Listen', '■ Stop']);
  assert.equal(buttons[1].attrs['aria-pressed'], 'true');
  buttons[2].listeners.click[0]();
  assert.equal(document.documentElement.style.fontSize, '115%');
  assert.equal(store['gs-fontsize'], 'lg');
  assert.equal(buttons[2].attrs['aria-pressed'], 'true');
  assert.equal(buttons[1].attrs['aria-pressed'], 'false');
  buttons[3].listeners.click[0]();
  assert.equal(sb.spoken.text, 'Hello world');
  assert.equal(sb.spoken.lang, 'hi-IN');
  assert.equal(sb.spoken.rate, 0.98);
  assert.equal(buttons[3].textContent, '⏸ Pause');
});

test('topic index: breadcrumbs, label feed, lazy fill on open, load-failure fallback', () => {
  const { sb, document, host } = loadPage();
  assert.equal(host.attrs['data-done'], '1');
  const ld = document.head.children.find((c) => c.type === 'application/ld+json');
  assert.equal(JSON.parse(ld.text).itemListElement[2].name, 'A post');
  assert.deepEqual(feedScripts(document), [BASE + '/feeds/posts/summary?alt=json-in-script&max-results=0&callback=gsIdxCb.c0']);

  sb.gsIdxCb.c0({ feed: { category: [{ term: 'Trade' }, { term: 'Shop' }, { term: 'agri' }] } });
  assert.deepEqual(host.children.map((c) => c.tag), ['p', 'details', 'details', 'p']);
  const [agri, trade] = host.children.filter((c) => c.tag === 'details');
  assert.deepEqual([agri, trade].map((d) => d.querySelector('summary').textContent), ['agri', 'Trade']);
  assert.match(host.children[3].innerHTML, /article-index-start-here\.html/);

  agri.open = true; agri.listeners.toggle[0]();
  assert.equal(feedScripts(document)[1], BASE + '/feeds/posts/summary/-/agri?alt=json-in-script&orderby=published&max-results=150&callback=gsIdxCb.c1');
  sb.gsIdxCb.c1({ feed: { entry: [{ title: { $t: 'T1' }, published: { $t: '2026-09-01T00:00:00' }, link: [{ rel: 'alternate', href: 'h1' }] }] } });
  const li = agri.querySelector('ul').children[0];
  assert.deepEqual(li.children.map((c) => [c.tag, c.textContent, c.href]), [['a', 'T1', 'h1'], ['span', ' · 2026-09-01', undefined]]);
  agri.listeners.toggle[0]();
  assert.equal(feedScripts(document).length, 2, 'a topic is fetched only once');

  trade.open = true; trade.listeners.toggle[0]();
  sb.gsIdxCb.c2(null);
  assert.equal(trade.querySelector('ul').innerHTML, '<li>Could not load.</li>');
});
