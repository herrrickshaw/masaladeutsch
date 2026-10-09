/* Masala Deutsch — site index, injected at the foot of every post.
   Discovers the label list from the blog's own feed and fills each topic on
   first open, so it can never go stale and never needs a post edit to update.
   Served from GitHub Pages so changing this ONE file changes every page. */
(function () {
  /* ---- Accessibility bar: three-step text size + read-aloud, injected as
     the first element inside .artx on every post. Runs before the #gs-idx
     guard below and has its own idempotency check, so it still works on any
     post that hasn't been backfilled with the index-widget stub yet.
     Font-size scales the document ROOT (every template sizes headings/body
     text in rem, which cascades from :root) instead of touching each of
     ~120 already-published pages' inline CSS. Read-aloud uses the browser's
     own SpeechSynthesis -- no external service, nothing to host -- and
     follows Google Translate's own language selector so a translated page
     is read back in that language when a local voice for it exists. */
  try {
    var artx = document.querySelector('.artx');
    if (artx && !artx.getAttribute('data-a11y-done')) {
      artx.setAttribute('data-a11y-done', '1');
      var a11yCss = document.createElement('style');
      a11yCss.textContent =
        '.gs-a11y{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:0 0 1.2rem;' +
        'padding:.5rem .7rem;background:#F4F7FB;border:1px solid #dbe3ee;border-radius:4px;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}' +
        '.gs-a11y .gs-a11y-lbl{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#8a8a8a;margin-right:.1rem}' +
        '.gs-a11y button{font-family:inherit;font-weight:600;color:#0B1F2D;background:#fff;' +
        'border:1px solid #c6d0dd;border-radius:3px;padding:.28rem .6rem;cursor:pointer;line-height:1}' +
        '.gs-a11y button:hover{background:#eaf0fa}' +
        '.gs-a11y button[aria-pressed="true"]{background:#0B1F2D;color:#fff;border-color:#0B1F2D}' +
        '.gs-a11y .gs-a11y-sep{width:1px;align-self:stretch;background:#dbe3ee;margin:0 .2rem}';
      document.head.appendChild(a11yCss);

      var FS_KEY = 'gs-fontsize';
      var FS_STEPS = { sm: '87.5%', md: '100%', lg: '115%' };
      var fsSaved = 'md';
      try { fsSaved = localStorage.getItem(FS_KEY) || 'md'; } catch (e) {}
      var applyFs = function (sz) {
        document.documentElement.style.fontSize = FS_STEPS[sz] || FS_STEPS.md;
        try { localStorage.setItem(FS_KEY, sz); } catch (e) {}
      };
      applyFs(fsSaved);

      var bar = document.createElement('div');
      bar.className = 'gs-a11y';

      var fsLbl = document.createElement('span');
      fsLbl.className = 'gs-a11y-lbl'; fsLbl.textContent = 'Text size';
      bar.appendChild(fsLbl);

      var fsBtns = {};
      [['sm', 'A', '.8rem', 'Small text'], ['md', 'A', '.95rem', 'Medium text'],
       ['lg', 'A', '1.15rem', 'Large text']].forEach(function (row) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = row[1]; b.title = row[3];
        b.style.fontSize = row[2];
        b.setAttribute('aria-pressed', row[0] === fsSaved ? 'true' : 'false');
        b.addEventListener('click', function () {
          applyFs(row[0]);
          for (var k in fsBtns) fsBtns[k].setAttribute('aria-pressed', k === row[0] ? 'true' : 'false');
        });
        fsBtns[row[0]] = b;
        bar.appendChild(b);
      });

      if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        var sep = document.createElement('span'); sep.className = 'gs-a11y-sep';
        bar.appendChild(sep);

        var TTS_LANG = {
          en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN',
          kn: 'kn-IN', ml: 'ml-IN', gu: 'gu-IN', pa: 'pa-IN', bn: 'bn-IN',
          ur: 'ur-IN', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', ja: 'ja-JP',
          ko: 'ko-KR', ru: 'ru-RU', pt: 'pt-PT', it: 'it-IT', ar: 'ar-SA'
        };
        var currentLang = function () {
          /* The SIMPLE-layout gadget never renders a select#goog-te-combo --
             the active translation target lives only in the googtrans
             cookie, format "/en/<target>". */
          try {
            var m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^\/]*\/([a-zA-Z-]+)/);
            var code = m && m[1];
            if (code && TTS_LANG[code]) return TTS_LANG[code];
          } catch (e) {}
          return 'en-IN';
        };

        var readBtn = document.createElement('button');
        readBtn.type = 'button'; readBtn.textContent = '🔊 Listen';
        var pauseTimer = null, speaking = false, paused = false;
        var stopSpeech = function () {
          try { window.speechSynthesis.cancel(); } catch (e) {}
          if (pauseTimer) { clearInterval(pauseTimer); pauseTimer = null; }
          speaking = false; paused = false;
          readBtn.textContent = '🔊 Listen';
        };
        readBtn.addEventListener('click', function () {
          if (!speaking) {
            /* Skip non-content top-level children outright: for a <script>
               or <style> element, innerText is empty (nothing renders), so
               the innerText||textContent fallback below would otherwise
               read back its raw JS/JSON/CSS source instead of silently
               skipping it. Nested scripts inside a content block (e.g. a
               chart's config) are already excluded automatically, since
               innerText only reflects rendered text. */
            var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, IFRAME: 1, TEMPLATE: 1 };
            var parts = [];
            for (var i = 0; i < artx.children.length; i++) {
              var c = artx.children[i];
              if (c === bar || SKIP_TAGS[c.tagName]) continue;
              var t = c.innerText || c.textContent || '';
              if (t.trim()) parts.push(t.trim());
            }
            var text = parts.join('. ');
            if (!text) return;
            var utt = new SpeechSynthesisUtterance(text);
            utt.lang = currentLang();
            utt.rate = 0.98;
            utt.onend = stopSpeech; utt.onerror = stopSpeech;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utt);
            speaking = true; paused = false;
            readBtn.textContent = '⏸ Pause';
            /* Chrome silently stalls long utterances after ~15s of internal
               idle; a periodic pause/resume nudge works around the bug. */
            pauseTimer = setInterval(function () {
              if (!window.speechSynthesis.speaking) return;
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            }, 10000);
          } else if (!paused) {
            window.speechSynthesis.pause();
            paused = true; readBtn.textContent = '▶ Resume';
          } else {
            window.speechSynthesis.resume();
            paused = false; readBtn.textContent = '⏸ Pause';
          }
        });
        bar.appendChild(readBtn);

        var stopBtn = document.createElement('button');
        stopBtn.type = 'button'; stopBtn.textContent = '■ Stop';
        stopBtn.addEventListener('click', stopSpeech);
        bar.appendChild(stopBtn);

        window.addEventListener('beforeunload', stopSpeech);
      }

      artx.insertBefore(bar, artx.firstChild);
    }
  } catch (e) { /* accessibility bar failure must never break the page */ }

  /* ---- Google Translate language-menu layout fix ------------------------
     Google's own widget renders its full language list as ONE table row
     split into dozens of narrow columns, in a same-origin (blank-src,
     directly-written) iframe -- wide enough to overflow any normal column,
     and with click targets small enough that picking a specific language
     (Tamil, reported) is unreliable. Since the iframe is same-origin we can
     reach into it and inject our own CSS: force the row to wrap as a
     narrow flex column instead of one wide row, so it reads as a single
     scrollable vertical list. Re-applied via MutationObserver since Google
     rebuilds this iframe's contents fresh on every open. */
  try {
    var teObserver = new MutationObserver(function () {
      var frames = document.querySelectorAll('iframe.skiptranslate');
      for (var fi = 0; fi < frames.length; fi++) {
        (function (f) {
          try {
            var d = f.contentDocument;
            if (!d || !d.documentElement || d.documentElement.getAttribute('data-gs-te-fixed')) return;
            var table = d.querySelector('table');
            if (!table) return;
            d.documentElement.setAttribute('data-gs-te-fixed', '1');
            var st = d.createElement('style');
            st.textContent =
              'body{margin:0}' +
              'table{display:block !important}' +
              'tr{display:flex !important;flex-wrap:wrap !important;' +
              'align-content:flex-start !important;width:1px !important}' +
              'td{display:block !important;width:auto !important;' +
              'white-space:nowrap !important;padding:0 !important;flex:0 0 auto !important}' +
              'td a{display:block !important;padding:.15rem .4rem !important;font-size:13px !important;' +
              'white-space:nowrap !important}';
            d.head.appendChild(st);
            /* Promote major Indian languages to the very top of the
               (otherwise alphabetical) list. Matched by displayed-name
               prefix rather than exact string, so script-variant entries
               Google lists separately -- "Punjabi (Gurmukhi)" / "Punjabi
               (Shahmukhi)", "Odia (Oriya)" -- are all caught under their
               base name. Inserted as the tr's literal first child rather
               than "after the Select-Language entry": that entry isn't
               reliably present (absent once a translation is already
               active), so anchoring to it silently failed to promote
               anything to the front in that state. */
            try {
              var tr = table.querySelector('tr');
              var promo = d.createElement('td');
              var PRIORITY = ['Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
                'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Odia', 'Assamese'];
              PRIORITY.forEach(function (name) {
                var lower = name.toLowerCase();
                var links = tr.querySelectorAll('td a');
                for (var li = 0; li < links.length; li++) {
                  var span = links[li].querySelector('.text');
                  var txt = ((span ? span.textContent : links[li].textContent) || '').trim();
                  if (txt.toLowerCase().indexOf(lower) === 0) promo.appendChild(links[li]);
                }
              });
              if (promo.children.length) tr.insertBefore(promo, tr.firstChild);
            } catch (e) { /* reorder failure must never break the menu */ }
            var body = d.querySelector('[id$=".menuBody"]');
            if (body) { body.style.width = '230px'; body.style.height = '400px'; body.style.overflowY = 'auto'; }
            f.style.width = '250px';
            f.style.height = '420px';
          } catch (e) { /* cross-origin or DOM-shape change -- leave Google's own layout as-is */ }
        })(frames[fi]);
      }
    });
    teObserver.observe(document.body, { childList: true, subtree: true });
  } catch (e) { /* translate-menu fix failure must never break the page */ }

  /* ---- Auto ads inside layout containers. -------------------------------
     Auto ads sometimes drops its unit between the tiles of a .gb-stats grid
     (or inside the .gs-head-order flex header), where it becomes one narrow
     grid cell and splits the tiles. Layout only: the unit is never hidden,
     moved in the DOM or resized by script -- it just spans the full row and
     is ordered after the tiles (or after the standfirst), so it sits between
     the stat block and the first paragraph instead of inside either. */
  try {
    if (!document.getElementById('gs-adfix-css')) {
      var adCss = document.createElement('style');
      adCss.id = 'gs-adfix-css';
      adCss.textContent =
        '.gb-stats>.google-auto-placed,.gb-stats>ins.adsbygoogle{grid-column:1/-1;order:99;width:100%;margin:.4rem 0}' +
        '.gs-head-order>.google-auto-placed,.gs-head-order>ins.adsbygoogle{order:99}';
      document.head.appendChild(adCss);
    }
  } catch (e) { /* a layout tweak must never break the page */ }

  var host = document.getElementById('gs-idx');
  if (!host || host.getAttribute('data-done')) return;
  host.setAttribute('data-done', '1');

  /* ---- AdSense unit, dormant until AD_SLOT is filled in. ----------------
     Set AD_SLOT to the data-ad-slot id of a display unit created in the
     AdSense console, push this file, and the unit appears above the index
     on every post -- one edit, site-wide, and as easy to remove.
     Renders only on the blog itself: the theme already loads adsbygoogle.js
     there, and the github.io mirror is not an approved AdSense site. */
  var AD_SLOT = '';
  if (AD_SLOT && /\.blogspot\.com$/.test(location.hostname)) {
    try {
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.margin = '0 0 1rem';
      ins.setAttribute('data-ad-client', 'ca-pub-5664000309261019');
      ins.setAttribute('data-ad-slot', AD_SLOT);
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      host.appendChild(ins);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) { /* an ad failure must never break the index */ }
  }
  var BASE = 'https://masaladeutsch.blogspot.com', n = 0;

  /* ---- BreadcrumbList JSON-LD, synchronous, no network round-trip -------
     Blogger's own auto-schema covers BlogPosting/WebSite/Person but never
     BreadcrumbList. Runs once per page load, independent of the label-feed
     jsonp calls below so it never waits on (or breaks from) a network hop.
     Home -> All Articles index -> this post's own title. */
  try {
    if (location.pathname !== '/2026/08/article-index-start-here.html') {
      var pageTitle = (document.title || '').replace(/\s*[–—-]\s*Masala Deutsch\s*$/i, '').trim();
      var crumbs = {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Masala Deutsch', 'item': BASE + '/' },
          { '@type': 'ListItem', 'position': 2, 'name': 'All Articles (Index)',
            'item': BASE + '/2026/08/article-index-start-here.html' },
          { '@type': 'ListItem', 'position': 3, 'name': pageTitle || document.title, 'item': location.href }
        ]
      };
      var ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.text = JSON.stringify(crumbs);
      document.head.appendChild(ld);
    }
  } catch (e) { /* a schema failure must never break the index */ }
  window.gsIdxCb = window.gsIdxCb || {};
  function jsonp(url, cb) {
    var name = 'c' + (n++); window.gsIdxCb[name] = cb;
    var s = document.createElement('script');
    s.src = url + '&callback=gsIdxCb.' + name;
    s.onerror = function () { cb(null); };
    document.head.appendChild(s);
  }
  var css = document.createElement('style');
  css.textContent = '#gs-idx{margin:2.4rem 0 0;padding-top:1.2rem;border-top:2px solid #0B1F2D}' +
    '#gs-idx .gi-h{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;' +
    'font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#8a4b08;margin:0 0 .5rem}' +
    '#gs-idx details{border-top:1px solid #e2e2e2}' +
    '#gs-idx details:last-of-type{border-bottom:1px solid #e2e2e2}' +
    '#gs-idx summary{cursor:pointer;padding:.6rem .2rem;list-style:none;display:flex;align-items:baseline;gap:.5rem;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;font-weight:700;font-size:.9rem;color:#0B1F2D}' +
    '#gs-idx summary::-webkit-details-marker{display:none}' +
    '#gs-idx summary::after{content:"+";margin-left:auto;color:#2251FF}' +
    '#gs-idx details[open] summary::after{content:"\\2212"}' +
    '#gs-idx ul{margin:.1rem 0 .8rem;padding-left:1.2rem}' +
    '#gs-idx li{font-size:.88rem;line-height:1.5;margin-bottom:.25rem}' +
    '#gs-idx .gi-d{font-size:.7rem;color:#8a8a8a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}' +
    '#gs-idx .gi-more{font-size:.8rem;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;margin:.6rem 0 0}';
  document.head.appendChild(css);
  function fill(d, lbl) {
    var ul = d.querySelector('ul');
    if (ul.getAttribute('data-done')) return;
    ul.setAttribute('data-done', '1');
    jsonp(BASE + '/feeds/posts/summary/-/' + encodeURIComponent(lbl) +
      '?alt=json-in-script&orderby=published&max-results=150', function (res) {
        if (!res) { ul.innerHTML = '<li>Could not load.</li>'; return; }
        var es = res.feed.entry || []; ul.innerHTML = '';
        for (var i = 0; i < es.length; i++) {
          var e = es[i], href = '';
          for (var j = 0; j < (e.link || []).length; j++)
            if (e.link[j].rel === 'alternate') href = e.link[j].href;
          var li = document.createElement('li'), a = document.createElement('a');
          a.href = href; a.textContent = e.title.$t; li.appendChild(a);
          var t = document.createElement('span'); t.className = 'gi-d';
          t.textContent = ' · ' + (e.published.$t || '').slice(0, 10);
          li.appendChild(t); ul.appendChild(li);
        }
        if (!es.length) ul.innerHTML = '<li>No posts carry this label yet.</li>';
      });
  }

  /* Amazon affiliate reading lists and the author’s shelf were removed on 2026-10-09. */

  jsonp(BASE + '/feeds/posts/summary?alt=json-in-script&max-results=0', function (res) {
    if (!res) return;
    var cats = (res.feed.category || []).map(function (c) { return c.term; })
      .filter(function (c) { return c !== 'Shop'; })
      .sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
    var h = document.createElement('p'); h.className = 'gi-h';
    h.textContent = 'Browse all articles by topic'; host.appendChild(h);
    cats.forEach(function (lbl) {
      var d = document.createElement('details');
      var s = document.createElement('summary'); s.textContent = lbl;
      var ul = document.createElement('ul');
      var li = document.createElement('li'); li.textContent = 'Loading…';
      ul.appendChild(li); d.appendChild(s); d.appendChild(ul); host.appendChild(d);
      d.addEventListener('toggle', function () { if (d.open) fill(d, lbl); });
    });
    var m = document.createElement('p'); m.className = 'gi-more';
    m.innerHTML = '<a href="' + BASE + '/2026/08/article-index-start-here.html">' +
      'Full index — by topic, geography, date and connection →</a>';
    host.appendChild(m);
  });
})();
