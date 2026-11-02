/* Masala Deutsch — site index, injected at the foot of every post.
   Discovers the label list from the blog's own feed and fills each topic on
   first open, so it can never go stale and never needs a post edit to update.
   Served from GitHub Pages so changing this ONE file changes every page.

   Deliberately one ES5 file with no build step: Blogger posts load it with a
   single <script src>, and readers include old mobile browsers. The pure
   helpers are exported for `node --test` when the file is `require`d; in a
   browser `module` is undefined and that branch is skipped. */
(function () {
  'use strict';

  /* ---- Site configuration -------------------------------------------- */
  var BASE = 'https://masaladeutsch.blogspot.com';
  var INDEX_PATH = '/2026/08/article-index-start-here.html';
  var INDEX_URL = BASE + INDEX_PATH;
  var FEED_SUMMARY_URL = BASE + '/feeds/posts/summary';
  var FEED_MAX_RESULTS = 150;
  /* Labels never shown in the topic index. Shop (Amazon affiliate lists and
     the author's shelf) was retired on 2026-10-09. */
  var HIDDEN_LABELS = ['Shop'];

  /* ---- AdSense unit, dormant until AD_SLOT is filled in. ----------------
     Set AD_SLOT to the data-ad-slot id of a display unit created in the
     AdSense console, push this file, and the unit appears above the index
     on every post -- one edit, site-wide, and as easy to remove.
     Renders only on the blog itself: the theme already loads adsbygoogle.js
     there, and the github.io mirror is not an approved AdSense site. */
  var AD_CLIENT = 'ca-pub-5664000309261019';
  var AD_SLOT = '';
  var AD_HOST_RE = /\.blogspot\.com$/;

  /* ---- Accessibility bar settings ------------------------------------- */
  var FS_KEY = 'gs-fontsize';
  var FS_DEFAULT = 'md';
  var FS_STEPS = { sm: '87.5%', md: '100%', lg: '115%' };
  /* [step, button text, button font-size, tooltip] */
  var FS_BUTTONS = [
    ['sm', 'A', '.8rem', 'Small text'],
    ['md', 'A', '.95rem', 'Medium text'],
    ['lg', 'A', '1.15rem', 'Large text']
  ];
  var TTS_DEFAULT_LANG = 'en-IN';
  var TTS_LANG = {
    en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN',
    kn: 'kn-IN', ml: 'ml-IN', gu: 'gu-IN', pa: 'pa-IN', bn: 'bn-IN',
    ur: 'ur-IN', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', ja: 'ja-JP',
    ko: 'ko-KR', ru: 'ru-RU', pt: 'pt-PT', it: 'it-IT', ar: 'ar-SA'
  };
  /* The SIMPLE-layout gadget never renders a select#goog-te-combo -- the
     active translation target lives only in the googtrans cookie, format
     "/en/<target>". */
  var GOOGTRANS_RE = /(?:^|;\s*)googtrans=\/[^\/]*\/([a-zA-Z-]+)/;
  var SPEECH_RATE = 0.98;
  /* Chrome silently stalls long utterances after ~15s of internal idle; a
     periodic pause/resume nudge works around the bug. */
  var SPEECH_NUDGE_MS = 10000;
  /* Top-level children whose innerText is empty (nothing renders), so the
     innerText||textContent fallback would otherwise read raw JS/JSON/CSS
     source aloud. Nested scripts inside a content block are already
     excluded, since innerText only reflects rendered text. */
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, IFRAME: 1, TEMPLATE: 1 };
  var LABEL_LISTEN = '🔊 Listen';
  var LABEL_PAUSE = '⏸ Pause';
  var LABEL_RESUME = '▶ Resume';
  var LABEL_STOP = '■ Stop';

  /* ---- Google Translate menu settings --------------------------------- */
  /* Major Indian languages promoted to the top of the otherwise alphabetical
     list. Matched by displayed-name prefix so script-variant entries Google
     lists separately -- "Punjabi (Gurmukhi)" / "Punjabi (Shahmukhi)",
     "Odia (Oriya)" -- are all caught under their base name. */
  var PRIORITY_LANGUAGES = ['Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
    'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Odia', 'Assamese'];
  var TE_MENU_BODY_SIZE = { width: '230px', height: '400px' };
  var TE_FRAME_SIZE = { width: '250px', height: '420px' };

  /* ---- Stylesheets ----------------------------------------------------- */
  var SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif';
  var A11Y_CSS =
    '.gs-a11y{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:0 0 1.2rem;' +
    'padding:.5rem .7rem;background:#F4F7FB;border:1px solid #dbe3ee;border-radius:4px;' +
    'font-family:' + SANS + '}' +
    '.gs-a11y .gs-a11y-lbl{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#8a8a8a;margin-right:.1rem}' +
    '.gs-a11y button{font-family:inherit;font-weight:600;color:#0B1F2D;background:#fff;' +
    'border:1px solid #c6d0dd;border-radius:3px;padding:.28rem .6rem;cursor:pointer;line-height:1}' +
    '.gs-a11y button:hover{background:#eaf0fa}' +
    '.gs-a11y button[aria-pressed="true"]{background:#0B1F2D;color:#fff;border-color:#0B1F2D}' +
    '.gs-a11y .gs-a11y-sep{width:1px;align-self:stretch;background:#dbe3ee;margin:0 .2rem}';
  var TE_MENU_CSS =
    'body{margin:0}' +
    'table{display:block !important}' +
    'tr{display:flex !important;flex-wrap:wrap !important;' +
    'align-content:flex-start !important;width:1px !important}' +
    'td{display:block !important;width:auto !important;' +
    'white-space:nowrap !important;padding:0 !important;flex:0 0 auto !important}' +
    'td a{display:block !important;padding:.15rem .4rem !important;font-size:13px !important;' +
    'white-space:nowrap !important}';
  var ADFIX_CSS_ID = 'gs-adfix-css';
  var ADFIX_CSS =
    '.gb-stats>.google-auto-placed,.gb-stats>ins.adsbygoogle{grid-column:1/-1;order:99;width:100%;margin:.4rem 0}' +
    '.gs-head-order>.google-auto-placed,.gs-head-order>ins.adsbygoogle{order:99}';
  var INDEX_CSS =
    '#gs-idx{margin:2.4rem 0 0;padding-top:1.2rem;border-top:2px solid #0B1F2D}' +
    '#gs-idx .gi-h{font-family:' + SANS + ';' +
    'font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#8a4b08;margin:0 0 .5rem}' +
    '#gs-idx details{border-top:1px solid #e2e2e2}' +
    '#gs-idx details:last-of-type{border-bottom:1px solid #e2e2e2}' +
    '#gs-idx summary{cursor:pointer;padding:.6rem .2rem;list-style:none;display:flex;align-items:baseline;gap:.5rem;' +
    'font-family:' + SANS + ';font-weight:700;font-size:.9rem;color:#0B1F2D}' +
    '#gs-idx summary::-webkit-details-marker{display:none}' +
    '#gs-idx summary::after{content:"+";margin-left:auto;color:#2251FF}' +
    '#gs-idx details[open] summary::after{content:"\\2212"}' +
    '#gs-idx ul{margin:.1rem 0 .8rem;padding-left:1.2rem}' +
    '#gs-idx li{font-size:.88rem;line-height:1.5;margin-bottom:.25rem}' +
    '#gs-idx .gi-d{font-size:.7rem;color:#8a8a8a;font-family:' + SANS + '}' +
    '#gs-idx .gi-more{font-size:.8rem;font-family:' + SANS + ';margin:.6rem 0 0}';

  /* ===================================================================== */
  /* Pure helpers: no DOM access, exported for tests.                        */
  /* ===================================================================== */

  /**
   * Map the Google Translate target in a `document.cookie` string to a
   * BCP-47 speech language, falling back to Indian English.
   * @param {string} cookie  raw `document.cookie` value
   * @returns {string}  e.g. 'ta-IN'
   */
  function speechLangFromCookie(cookie) {
    var m = (cookie || '').match(GOOGTRANS_RE);
    var code = m && m[1];
    return (code && TTS_LANG[code]) || TTS_DEFAULT_LANG;
  }

  /**
   * Drop the " – Masala Deutsch" site suffix Blogger appends to document.title.
   * @param {string} title
   * @returns {string}  trimmed page title, '' if nothing is left
   */
  function stripSiteSuffix(title) {
    return (title || '').replace(/\s*[–—-]\s*Masala Deutsch\s*$/i, '').trim();
  }

  /**
   * Build the schema.org BreadcrumbList for a post:
   * Home -> All Articles index -> this post's own title.
   * @param {string} pageTitle  the post title (already stripped of the suffix)
   * @param {string} href       the post's canonical URL
   * @returns {object}  JSON-LD object
   */
  function breadcrumbList(pageTitle, href) {
    return {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Masala Deutsch', 'item': BASE + '/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'All Articles (Index)', 'item': INDEX_URL },
        { '@type': 'ListItem', 'position': 3, 'name': pageTitle, 'item': href }
      ]
    };
  }

  /**
   * The `rel="alternate"` link of a Blogger feed entry (the post's own URL).
   * @param {object} entry  one element of `feed.entry`
   * @returns {string}  href, or '' when absent
   */
  function alternateHref(entry) {
    var links = entry.link || [], href = '';
    for (var j = 0; j < links.length; j++) {
      if (links[j].rel === 'alternate') href = links[j].href;
    }
    return href;
  }

  /**
   * Topic labels to show, from a feed's `category` array: hidden labels
   * removed, sorted case-insensitively.
   * @param {Array<{term: string}>} categories  `feed.category`
   * @returns {string[]}
   */
  function visibleLabels(categories) {
    return (categories || [])
      .map(function (c) { return c.term; })
      .filter(function (c) { return HIDDEN_LABELS.indexOf(c) === -1; })
      .sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
  }

  /**
   * JSONP feed URL listing the posts that carry one label, newest first.
   * @param {string} label
   * @returns {string}  URL without the `&callback=` parameter
   */
  function labelFeedUrl(label) {
    return FEED_SUMMARY_URL + '/-/' + encodeURIComponent(label) +
      '?alt=json-in-script&orderby=published&max-results=' + FEED_MAX_RESULTS;
  }

  /**
   * Text to read aloud: the rendered text of each top-level child, skipping
   * the accessibility bar itself and non-content tags, joined with '. '.
   * @param {ArrayLike<{tagName: string, innerText?: string, textContent?: string}>} children
   * @param {*} skipNode  the node to leave out (the bar)
   * @returns {string}
   */
  function readableText(children, skipNode) {
    var parts = [];
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c === skipNode || SKIP_TAGS[c.tagName]) continue;
      var t = c.innerText || c.textContent || '';
      if (t.trim()) parts.push(t.trim());
    }
    return parts.join('. ');
  }

  var pure = {
    speechLangFromCookie: speechLangFromCookie,
    stripSiteSuffix: stripSiteSuffix,
    breadcrumbList: breadcrumbList,
    alternateHref: alternateHref,
    visibleLabels: visibleLabels,
    labelFeedUrl: labelFeedUrl,
    readableText: readableText,
    INDEX_PATH: INDEX_PATH
  };
  if (typeof module === 'object' && module && module.exports) module.exports = pure;
  if (typeof document === 'undefined') return;

  /* ===================================================================== */
  /* DOM helpers                                                             */
  /* ===================================================================== */

  /** Report a swallowed failure without ever breaking the page. */
  function warn(where, err) {
    try {
      if (window.console && window.console.warn) window.console.warn('accordion.js: ' + where, err);
    } catch (e) { /* console unavailable: nothing more we can do */ }
  }

  function addStyle(doc, cssText, id) {
    var st = doc.createElement('style');
    if (id) st.id = id;
    st.textContent = cssText;
    doc.head.appendChild(st);
    return st;
  }

  function makeButton(text, title) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = text;
    if (title) b.title = title;
    return b;
  }

  /* ===================================================================== */
  /* 1. Accessibility bar: three-step text size + read-aloud, injected as     */
  /*    the first element inside .artx on every post. Runs before the        */
  /*    #gs-idx guard and has its own idempotency check, so it still works    */
  /*    on any post that hasn't been backfilled with the index-widget stub.   */
  /*    Font-size scales the document ROOT (every template sizes headings/    */
  /*    body text in rem, which cascades from :root) instead of touching      */
  /*    each of ~120 already-published pages' inline CSS. Read-aloud uses     */
  /*    the browser's own SpeechSynthesis -- no external service, nothing to  */
  /*    host -- and follows Google Translate's own language selector so a     */
  /*    translated page is read back in that language when a local voice     */
  /*    for it exists.                                                        */
  /* ===================================================================== */

  function savedFontStep() {
    try { return localStorage.getItem(FS_KEY) || FS_DEFAULT; } catch (e) { return FS_DEFAULT; }
  }

  function applyFontStep(step) {
    document.documentElement.style.fontSize = FS_STEPS[step] || FS_STEPS[FS_DEFAULT];
    try { localStorage.setItem(FS_KEY, step); } catch (e) { /* storage blocked (private mode): size still applies for this page */ }
  }

  function buildFontSizeControls(bar) {
    var current = savedFontStep();
    applyFontStep(current);

    var lbl = document.createElement('span');
    lbl.className = 'gs-a11y-lbl'; lbl.textContent = 'Text size';
    bar.appendChild(lbl);

    var buttons = {};
    FS_BUTTONS.forEach(function (row) {
      var step = row[0];
      var b = makeButton(row[1], row[3]);
      b.style.fontSize = row[2];
      b.setAttribute('aria-pressed', step === current ? 'true' : 'false');
      b.addEventListener('click', function () {
        applyFontStep(step);
        for (var k in buttons) buttons[k].setAttribute('aria-pressed', k === step ? 'true' : 'false');
      });
      buttons[step] = b;
      bar.appendChild(b);
    });
  }

  function currentSpeechLang() {
    try { return speechLangFromCookie(document.cookie); } catch (e) { return TTS_DEFAULT_LANG; }
  }

  function buildReadAloudControls(bar, artx) {
    var synth = window.speechSynthesis;
    var sep = document.createElement('span'); sep.className = 'gs-a11y-sep';
    bar.appendChild(sep);

    var readBtn = makeButton(LABEL_LISTEN);
    var nudgeTimer = null, speaking = false, paused = false;

    var stopSpeech = function () {
      try { synth.cancel(); } catch (e) { /* engine already gone (page unloading) */ }
      if (nudgeTimer) { clearInterval(nudgeTimer); nudgeTimer = null; }
      speaking = false; paused = false;
      readBtn.textContent = LABEL_LISTEN;
    };

    var startSpeech = function () {
      var text = readableText(artx.children, bar);
      if (!text) return;
      var utt = new SpeechSynthesisUtterance(text);
      utt.lang = currentSpeechLang();
      utt.rate = SPEECH_RATE;
      utt.onend = stopSpeech; utt.onerror = stopSpeech;
      synth.cancel();
      synth.speak(utt);
      speaking = true; paused = false;
      readBtn.textContent = LABEL_PAUSE;
      nudgeTimer = setInterval(function () {
        if (!synth.speaking) return;
        synth.pause();
        synth.resume();
      }, SPEECH_NUDGE_MS);
    };

    readBtn.addEventListener('click', function () {
      if (!speaking) {
        startSpeech();
      } else if (!paused) {
        synth.pause();
        paused = true; readBtn.textContent = LABEL_RESUME;
      } else {
        synth.resume();
        paused = false; readBtn.textContent = LABEL_PAUSE;
      }
    });
    bar.appendChild(readBtn);

    var stopBtn = makeButton(LABEL_STOP);
    stopBtn.addEventListener('click', stopSpeech);
    bar.appendChild(stopBtn);

    window.addEventListener('beforeunload', stopSpeech);
  }

  function installAccessibilityBar() {
    var artx = document.querySelector('.artx');
    if (!artx || artx.getAttribute('data-a11y-done')) return;
    artx.setAttribute('data-a11y-done', '1');
    addStyle(document, A11Y_CSS);

    var bar = document.createElement('div');
    bar.className = 'gs-a11y';
    buildFontSizeControls(bar);
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) buildReadAloudControls(bar, artx);
    artx.insertBefore(bar, artx.firstChild);
  }

  /* ===================================================================== */
  /* 2. Google Translate language-menu layout fix.                           */
  /*    Google's own widget renders its full language list as ONE table row   */
  /*    split into dozens of narrow columns, in a same-origin (blank-src,     */
  /*    directly-written) iframe -- wide enough to overflow any normal        */
  /*    column, and with click targets small enough that picking a specific  */
  /*    language (Tamil, reported) is unreliable. Since the iframe is         */
  /*    same-origin we can reach into it and inject our own CSS: force the    */
  /*    row to wrap as a narrow flex column instead of one wide row, so it    */
  /*    reads as a single scrollable vertical list. Re-applied via            */
  /*    MutationObserver since Google rebuilds this iframe's contents fresh   */
  /*    on every open.                                                        */
  /* ===================================================================== */

  /* Inserted as the tr's literal first child rather than "after the
     Select-Language entry": that entry isn't reliably present (absent once
     a translation is already active), so anchoring to it silently failed to
     promote anything to the front in that state. */
  function promotePriorityLanguages(doc, table) {
    var tr = table.querySelector('tr');
    var promo = doc.createElement('td');
    PRIORITY_LANGUAGES.forEach(function (name) {
      var lower = name.toLowerCase();
      var links = tr.querySelectorAll('td a');
      for (var li = 0; li < links.length; li++) {
        var span = links[li].querySelector('.text');
        var txt = ((span ? span.textContent : links[li].textContent) || '').trim();
        if (txt.toLowerCase().indexOf(lower) === 0) promo.appendChild(links[li]);
      }
    });
    if (promo.children.length) tr.insertBefore(promo, tr.firstChild);
  }

  function fixTranslateFrame(frame) {
    var doc = frame.contentDocument;
    if (!doc || !doc.documentElement || doc.documentElement.getAttribute('data-gs-te-fixed')) return;
    var table = doc.querySelector('table');
    if (!table) return;
    doc.documentElement.setAttribute('data-gs-te-fixed', '1');
    addStyle(doc, TE_MENU_CSS);
    try {
      promotePriorityLanguages(doc, table);
    } catch (e) { warn('translate menu: language reorder skipped', e); }
    var body = doc.querySelector('[id$=".menuBody"]');
    if (body) {
      body.style.width = TE_MENU_BODY_SIZE.width;
      body.style.height = TE_MENU_BODY_SIZE.height;
      body.style.overflowY = 'auto';
    }
    frame.style.width = TE_FRAME_SIZE.width;
    frame.style.height = TE_FRAME_SIZE.height;
  }

  function installTranslateMenuFix() {
    var observer = new MutationObserver(function () {
      var frames = document.querySelectorAll('iframe.skiptranslate');
      for (var fi = 0; fi < frames.length; fi++) {
        try {
          fixTranslateFrame(frames[fi]);
        } catch (e) { /* cross-origin frame or DOM-shape change: leave Google's own layout as-is (fires per mutation, so not logged) */ }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ===================================================================== */
  /* 3. Auto ads inside layout containers.                                   */
  /*    Auto ads sometimes drops its unit between the tiles of a .gb-stats    */
  /*    grid (or inside the .gs-head-order flex header), where it becomes     */
  /*    one narrow grid cell and splits the tiles. Layout only: the unit is   */
  /*    never hidden, moved in the DOM or resized by script -- it just spans  */
  /*    the full row and is ordered after the tiles (or after the             */
  /*    standfirst), so it sits between the stat block and the first          */
  /*    paragraph instead of inside either.                                   */
  /* ===================================================================== */

  function installAutoAdsLayoutFix() {
    if (document.getElementById(ADFIX_CSS_ID)) return;
    addStyle(document, ADFIX_CSS, ADFIX_CSS_ID);
  }

  /* ===================================================================== */
  /* 4. Topic index inside #gs-idx                                           */
  /* ===================================================================== */

  function insertAdUnit(host) {
    if (!AD_SLOT || !AD_HOST_RE.test(location.hostname)) return;
    try {
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.margin = '0 0 1rem';
      ins.setAttribute('data-ad-client', AD_CLIENT);
      ins.setAttribute('data-ad-slot', AD_SLOT);
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      host.appendChild(ins);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) { warn('ad unit skipped', e); }
  }

  /* BreadcrumbList JSON-LD, synchronous, no network round-trip. Blogger's
     own auto-schema covers BlogPosting/WebSite/Person but never
     BreadcrumbList. Runs once per page load, independent of the label-feed
     jsonp calls so it never waits on (or breaks from) a network hop. */
  function injectBreadcrumbs() {
    if (location.pathname === INDEX_PATH) return;
    var pageTitle = stripSiteSuffix(document.title) || document.title;
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify(breadcrumbList(pageTitle, location.href));
    document.head.appendChild(ld);
  }

  var jsonpCount = 0;
  /**
   * Load a Blogger `json-in-script` feed. `cb` receives the parsed feed, or
   * null if the script failed to load.
   */
  function jsonp(url, cb) {
    var name = 'c' + (jsonpCount++);
    window.gsIdxCb[name] = cb;
    var s = document.createElement('script');
    s.src = url + '&callback=gsIdxCb.' + name;
    s.onerror = function () { cb(null); };
    document.head.appendChild(s);
  }

  function renderTopicEntries(ul, entries) {
    ul.innerHTML = '';
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = alternateHref(e); a.textContent = e.title.$t; li.appendChild(a);
      var t = document.createElement('span'); t.className = 'gi-d';
      t.textContent = ' · ' + (e.published.$t || '').slice(0, 10);
      li.appendChild(t); ul.appendChild(li);
    }
    if (!entries.length) ul.innerHTML = '<li>No posts carry this label yet.</li>';
  }

  /* Fill one topic's <details> from the label feed, once, on first open. */
  function fillTopic(details, label) {
    var ul = details.querySelector('ul');
    if (ul.getAttribute('data-done')) return;
    ul.setAttribute('data-done', '1');
    jsonp(labelFeedUrl(label), function (res) {
      if (!res) { ul.innerHTML = '<li>Could not load.</li>'; return; }
      renderTopicEntries(ul, res.feed.entry || []);
    });
  }

  function buildTopicDetails(label) {
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = label;
    var ul = document.createElement('ul');
    var li = document.createElement('li'); li.textContent = 'Loading…';
    ul.appendChild(li); d.appendChild(s); d.appendChild(ul);
    d.addEventListener('toggle', function () { if (d.open) fillTopic(d, label); });
    return d;
  }

  function buildTopicIndex(host, feed) {
    var h = document.createElement('p'); h.className = 'gi-h';
    h.textContent = 'Browse all articles by topic'; host.appendChild(h);
    visibleLabels(feed.category).forEach(function (label) {
      host.appendChild(buildTopicDetails(label));
    });
    var m = document.createElement('p'); m.className = 'gi-more';
    m.innerHTML = '<a href="' + INDEX_URL + '">' +
      'Full index — by topic, geography, date and connection →</a>';
    host.appendChild(m);
  }

  function installTopicIndex(host) {
    insertAdUnit(host);
    try {
      injectBreadcrumbs();
    } catch (e) { warn('breadcrumb schema skipped', e); }
    window.gsIdxCb = window.gsIdxCb || {};
    addStyle(document, INDEX_CSS);
    jsonp(FEED_SUMMARY_URL + '?alt=json-in-script&max-results=0', function (res) {
      if (!res) return;
      buildTopicIndex(host, res.feed);
    });
  }

  /* ===================================================================== */
  /* Entry point. Each site-wide tweak is isolated: a failure in one must    */
  /* never break the page or the others.                                     */
  /* ===================================================================== */

  try { installAccessibilityBar(); } catch (e) { warn('accessibility bar skipped', e); }
  try { installTranslateMenuFix(); } catch (e) { warn('translate-menu fix skipped', e); }
  try { installAutoAdsLayoutFix(); } catch (e) { warn('auto-ads layout fix skipped', e); }

  var host = document.getElementById('gs-idx');
  if (!host || host.getAttribute('data-done')) return;
  host.setAttribute('data-done', '1');
  installTopicIndex(host);
})();
