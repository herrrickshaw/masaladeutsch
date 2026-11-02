'use strict';
/* Unit tests for the pure helpers exported by accordion.js, plus a smoke
   test that the file loads under a stub DOM without throwing. Run with
   `npm test` (node:test, no dependencies). */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const fs = require('node:fs');

const FILE = path.join(__dirname, '..', 'accordion.js');
const pure = require(FILE);
const BASE = 'https://masaladeutsch.blogspot.com';

test('speechLangFromCookie follows the googtrans cookie, defaults to en-IN', () => {
  assert.equal(pure.speechLangFromCookie('a=1; googtrans=/en/ta; b=2'), 'ta-IN');
  assert.equal(pure.speechLangFromCookie('googtrans=/en/de'), 'de-DE');
  assert.equal(pure.speechLangFromCookie('googtrans=/en/xx'), 'en-IN');
  assert.equal(pure.speechLangFromCookie(''), 'en-IN');
  assert.equal(pure.speechLangFromCookie(undefined), 'en-IN');
});

test('stripSiteSuffix removes the Blogger title suffix only', () => {
  assert.equal(pure.stripSiteSuffix('A post – Masala Deutsch'), 'A post');
  assert.equal(pure.stripSiteSuffix('A post - masala deutsch '), 'A post');
  assert.equal(pure.stripSiteSuffix('A post — Masala Deutsch'), 'A post');
  assert.equal(pure.stripSiteSuffix('Masala Deutsch'), 'Masala Deutsch');
  assert.equal(pure.stripSiteSuffix(''), '');
});

test('breadcrumbList is Home -> index -> post', () => {
  const ld = pure.breadcrumbList('My post', BASE + '/2026/09/x.html');
  assert.equal(ld['@type'], 'BreadcrumbList');
  assert.deepEqual(ld.itemListElement.map((i) => [i.position, i.name, i.item]), [
    [1, 'Masala Deutsch', BASE + '/'],
    [2, 'All Articles (Index)', BASE + pure.INDEX_PATH],
    [3, 'My post', BASE + '/2026/09/x.html'],
  ]);
});

test('alternateHref picks the rel=alternate link, last one wins, empty when absent', () => {
  assert.equal(pure.alternateHref({ link: [{ rel: 'self', href: 's' }, { rel: 'alternate', href: 'p' }] }), 'p');
  assert.equal(pure.alternateHref({ link: [{ rel: 'alternate', href: 'a' }, { rel: 'alternate', href: 'b' }] }), 'b');
  assert.equal(pure.alternateHref({}), '');
});

test('visibleLabels hides Shop and sorts case-insensitively', () => {
  const cats = ['Trade', 'Shop', 'agriculture', 'Energy', 'constructor'].map((term) => ({ term }));
  assert.deepEqual(pure.visibleLabels(cats), ['agriculture', 'constructor', 'Energy', 'Trade']);
  assert.deepEqual(pure.visibleLabels(undefined), []);
});

test('labelFeedUrl encodes the label and asks for 150 newest posts', () => {
  assert.equal(
    pure.labelFeedUrl('Energy & Gas'),
    BASE + '/feeds/posts/summary/-/Energy%20%26%20Gas?alt=json-in-script&orderby=published&max-results=150'
  );
});

test('readableText skips the bar and non-content tags, joins with ". "', () => {
  const bar = { tagName: 'DIV', innerText: 'Text size A A A' };
  const children = [
    bar,
    { tagName: 'SCRIPT', innerText: '', textContent: 'var x = 1;' },
    { tagName: 'P', innerText: '  First para. ' },
    { tagName: 'STYLE', innerText: '', textContent: 'p{}' },
    { tagName: 'P', innerText: '', textContent: 'fallback' },
    { tagName: 'P', innerText: '   ' },
  ];
  assert.equal(pure.readableText(children, bar), 'First para.. fallback');
  assert.equal(pure.readableText([], null), '');
});

test('file runs under a minimal stub DOM without throwing (no .artx, no #gs-idx)', () => {
  const el = () => ({ style: {}, appendChild() {}, setAttribute() {}, getAttribute: () => null });
  const document = {
    head: el(), body: el(), cookie: '', title: 't',
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: el, documentElement: el(),
  };
  const sandbox = {
    document, console, location: { hostname: 'x.blogspot.com', pathname: '/p', href: 'h' },
    MutationObserver: class { observe() {} },
  };
  sandbox.window = sandbox;
  const src = fs.readFileSync(FILE, 'utf8');
  assert.doesNotThrow(() => vm.runInNewContext(src, sandbox, { filename: 'accordion.js' }));
  assert.equal(sandbox.gsIdxCb, undefined, 'index branch must not run without #gs-idx');
});
