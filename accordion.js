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

  /* ---- Amazon affiliate "Further reading", dormant until AFFILIATE_TAG is
     set to the Associates tracking id (e.g. "xxxx-21"). Books are matched to
     the post's own topic labels (read from the theme's .gs-topics links), and
     links are TAGGED SEARCH urls by exact title, never hardcoded ASINs -- a
     stale or mistyped ASIN would send readers to the wrong product under the
     site's name; a title search cannot. Renders only on the blog, always with
     the Associates disclosure line. Empty tag = nothing renders anywhere. */
  var AFFILIATE_TAG = 'herpetithabib-21';
  var BOOKS = {
    'Energy & Fuels': [['The Prize: The Epic Quest for Oil, Money and Power', 'Daniel Yergin', '1439110123'],
                       ['Oil: A Beginner\u2019s Guide', 'Vaclav Smil', '1786072866'],
                       ['The New Map: Energy, Climate, and the Clash of Nations', 'Daniel Yergin']],
    'Gas & LNG':      [['The New Map: Energy, Climate, and the Clash of Nations', 'Daniel Yergin']],
    'Trade & Tariffs':[['Has China Won? The Chinese Challenge to American Primacy', 'Kishore Mahbubani', '1541768140'],
                       ['India Transformed: 25 Years of Economic Reforms', 'Rakesh Mohan'],
                       ['Backstage: The Story Behind India’s High Growth Years', 'Montek Singh Ahluwalia']],
    'Import Substitution': [['Chip War: The Fight for the World\u2019s Most Critical Technology', 'Chris Miller', '1398504122'],
                            ['India Transformed: 25 Years of Economic Reforms', 'Rakesh Mohan']],
    'Industrial Policy': [['Accelerating India\u2019s Development: A State-Led Roadmap for Effective Governance', 'Karthik Muralidharan', '067009594X'],
                          ['Breaking the Mould: Reimagining India’s Economic Future', 'Raghuram Rajan Rohit Lamba', '0143472771']],
    'Markets & Finance': [['I Do What I Do', 'Raghuram Rajan', 'B0BXD7LG75'],
                          ['Overdraft: Saving the Indian Saver', 'Urjit Patel'],
                          ['All Your Worth: The Ultimate Lifetime Money Plan', 'Elizabeth Warren & Amelia Warren Tyagi', '074326987X'],
                          ['Your Money or Your Life', 'Vicki Robin & Joe Dominguez', '0143115766'],
                          ['The Two-Income Trap: Why Middle-Class Parents Are Still Going Broke', 'Elizabeth Warren & Amelia Warren Tyagi', 'B06XC819VR']],
    'Prices & Inflation': [['Whole Numbers and Half Truths: What Data Can and Cannot Tell Us About Modern India', 'Rukmini S', '9391234674'],
                           ['Factfulness: Ten Reasons We\u2019re Wrong About the World', 'Hans Rosling', '1473637465'],
                           ['100 Ways to See India', 'Surprises from the Data', '9369894470'],
                           ['I Do What I Do', 'Raghuram Rajan', 'B0BXD7LG75']],
    'Agriculture & Fertilisers': [['Everybody Loves a Good Drought', 'P. Sainath', '0140259848']],
    'Climate & Carbon': [['How the World Really Works', 'Vaclav Smil', '0241989671']],
    'Mobility & EV':  [['Energy and Civilization: A History', 'Vaclav Smil', '0262536161']],
    'AI Tools':       [['Co-Intelligence: Living and Working with AI', 'Ethan Mollick', '0753560771']]
  };
  /* Off-topic personal picks, shown on every post under their own honest
     heading so they never masquerade as topic reading. */
  var SHELF = [
    ['Kadavulai Thedatheergal (Tamil)', 'Thenkachi Ko. Swaminathan', 'B075WWJC74'],
    ['Jugaad Yatra: Exploring the Indian Art of Problem Solving', 'Dean Nelson', '9387561259',
     'https://m.media-amazon.com/images/P/9387561259.01._SY522_.jpg', 'book'],
    ['Siddhartha', 'Hermann Hesse', '817234368X',
     'https://m.media-amazon.com/images/I/81YwVw+xyoL._SY522_.jpg', 'book'],
    ['Lifelong Stovetop Moka Pot / Espresso Maker', 'Lifelong', 'B0F74B2HRH',
     'https://m.media-amazon.com/images/I/61tDjFKl7xL._SX679_.jpg', 'other'],
    ['Saravana Degree Coffee Powder — Chikmagaluru filter coffee, 250 g', 'Saravana', 'B0F5XYKJNK',
     'https://m.media-amazon.com/images/I/61y8EIhYlAL._SX679_.jpg', 'other'],
    ['Sweet Karam Coffee ABC Milk Mix — apple, beetroot & carrot, 500 g', 'Sweet Karam Coffee', 'B0FC5T4W8Q',
     'https://m.media-amazon.com/images/I/71eBPMQxu2L._SX679_PIbundle-2,TopRight,0,0_AA679SH20_.jpg', 'other'],
    ['Carbamide Forte Organic Spirulina Tablets, 2000 mg per serving', 'Carbamide Forte', 'B07WVBC8PH',
     'https://m.media-amazon.com/images/I/61YDYSP8hLL._SX679_.jpg', 'other'],
    ['Talking to Strangers', 'Malcolm Gladwell', '0141988495',
     'https://m.media-amazon.com/images/I/81Z4MTU7iKL._SY522_.jpg', 'book'],
    ['777 Nannari Sharbat, 700 ml pack of 2', '777', 'B0H4G7LF9P',
     'https://m.media-amazon.com/images/I/61aEmrLQlSL._SX679_PIbundle-2,TopRight,0,0_AA679SH20_.jpg', 'other'],
    ['The Dip & Mindset — two-book set (revised)', 'Seth Godin & Carol Dweck', 'B0BLVVJ18D',
     'https://m.media-amazon.com/images/I/71UYOzNtbTL._SX445_.jpg', 'book'],
    ['Haldiram\u2019s Nagpur Orange Burfee, 500 g', 'Haldiram\u2019s', 'B0BGPR43WQ',
     'https://m.media-amazon.com/images/I/71r0frXkPgL._SX679_.jpg', 'other'],
    ['The Argumentative Indian', 'Amartya Sen', '0141012110',
     'https://m.media-amazon.com/images/I/81jz1oGFymL._SY522_.jpg', 'book'],
    ['Middle Class to Money Class: Simple Secrets to Investing like a Pro', 'Sairam & Srividhya', '1946869066',
     'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1489158423i/34525905.jpg', 'book'],
    ['Wings of Fire: Agni Ki Udaan (Hindi edition)', 'A.P.J. Abdul Kalam & Arun Tiwari', '9351864499',
     'https://m.media-amazon.com/images/P/9351864499.01._SY522_.jpg', 'book'],
    ['The Working of the Indian Constitution', 'Arghya Sengupta & Chitrakshi Goyal (eds.)', '1032671599',
     'https://m.media-amazon.com/images/P/1032671599.01._SY522_.jpg', 'book'],
    ['The Two-Income Trap: Why Middle-Class Parents Are Still Going Broke', 'Elizabeth Warren & Amelia Warren Tyagi', 'B06XC819VR',
     'https://m.media-amazon.com/images/P/B06XC819VR.01._SY522_.jpg', 'book'],
    ['All Your Worth: The Ultimate Lifetime Money Plan', 'Elizabeth Warren & Amelia Warren Tyagi', '074326987X',
     'https://m.media-amazon.com/images/P/074326987X.01._SY522_.jpg', 'book'],
    ['Your Money or Your Life', 'Vicki Robin & Joe Dominguez', '0143115766',
     'https://m.media-amazon.com/images/P/0143115766.01._SY522_.jpg', 'book'],
    ['The Second Sex (Vintage Feminism Short Edition)', 'Simone de Beauvoir', '1784870382',
     'https://m.media-amazon.com/images/P/1784870382.01._SY522_.jpg', 'book'],
    ['The Blaft Anthology of Tamil Pulp Fiction', 'Blaft (ed.)', '8190605607',
     'https://m.media-amazon.com/images/P/8190605607.01._SY522_.jpg', 'book'],
    ['Brewtal Mix Masala Chai Bombs — crushed elaychi, cinnamon & spices, pack of 30 cups', 'Brewtal', 'B0H9GW813X',
     'https://m.media-amazon.com/images/I/61j0aL-Z9ZL._SX679_PIbundle-30,TopRight,0,0_AA679SH20_.jpg', 'other'],
    ['Everest Tea Masala, 50 g', 'Everest', 'B00O0X73GW',
     'https://m.media-amazon.com/images/P/B00O0X73GW.01._SX679_.jpg', 'other'],
    ['Chitale Bandhu Bakarwadi, 500 g tray', 'Chitale Bandhu', 'B0DD1LRWS6',
     'https://m.media-amazon.com/images/I/814sAdUKL3L._SX679_.jpg', 'other'],
    ['A Sixth of Humanity: Independent India’s Development Odyssey', 'Devesh Kapur & Arvind Subramanian', '9369891099',
     'https://m.media-amazon.com/images/P/9369891099.01._SX679_.jpg', 'book'],
    ['Everest Pav Bhaji Masala, 50 g', 'Everest', 'B0154VTRB2',
     'https://m.media-amazon.com/images/P/B0154VTRB2.01._SX679_.jpg', 'other'],
    ['All About Love: New Visions', 'bell hooks', '0063269341',
     'https://m.media-amazon.com/images/P/0063269341.01._SX679_.jpg', 'book'],
    ['ZanduKesariJivan Ayurvedic Immunity Booster & Revitalizer, 900 g', 'Zandu', 'B0GHSFRJLM',
     'https://m.media-amazon.com/images/I/61aqeKIZ+tL._SX679_.jpg', 'other'],
    ['India’s Quest for Energy Security', 'Vikram S. Mehta', 'B0DJ2T87N9',
     'https://m.media-amazon.com/images/P/B0DJ2T87N9.01._SX679_.jpg', 'book']
  ];
  window.gsIdxShelf = function (host) {
    if (!AFFILIATE_TAG || !SHELF.length) return;
    try {
      var box = document.createElement('div');
      box.style.cssText = 'margin:1.6rem 0 0;padding-top:1rem;border-top:1px solid #e2e2e2';
      var h = document.createElement('p');
      h.style.cssText = 'font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;font-weight:700;color:#8a4b08;margin:0 0 .6rem';
      h.textContent = 'From the author\u2019s shelf';
      var all = document.createElement('a');
      all.href = 'https://masaladeutsch.blogspot.com/2026/08/the-masala-deutsch-shop-books-things.html';
      all.textContent = ' browse the full shop \u2192';
      all.style.cssText = 'font-weight:600;text-transform:none;letter-spacing:0;color:#2251FF;text-decoration:none;margin-left:.4rem';
      h.appendChild(all);
      box.appendChild(h);
      function buildRow(items) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:1rem';
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var card = document.createElement('a');
          card.rel = 'nofollow sponsored noopener'; card.target = '_blank';
          card.href = 'https://www.amazon.in/dp/' + it[2] + '?tag=' + AFFILIATE_TAG;
          card.style.cssText = 'display:block;width:140px;text-decoration:none;color:#1a1a1a';
          if (it[3]) {
            var im = document.createElement('img');
            im.src = it[3]; im.loading = 'lazy'; im.alt = it[0];
            im.style.cssText = 'width:140px;height:140px;object-fit:contain;background:#fff;border:1px solid #ececec;border-radius:2px;display:block';
            card.appendChild(im);
          }
          var cap = document.createElement('span');
          cap.style.cssText = 'display:block;font-size:.78rem;line-height:1.35;margin-top:.35rem';
          cap.textContent = it[0];
          card.appendChild(cap);
          row.appendChild(card);
        }
        return row;
      }
      function subHeading(text) {
        var sh = document.createElement('p');
        sh.style.cssText = 'font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;font-weight:600;color:#8a8a8a;margin:1rem 0 .5rem';
        sh.textContent = text;
        return sh;
      }
      var books = [], others = [];
      for (var si = 0; si < SHELF.length; si++) (SHELF[si][4] === 'other' ? others : books).push(SHELF[si]);
      if (books.length) { box.appendChild(subHeading('Books')); box.appendChild(buildRow(books)); }
      if (others.length) { box.appendChild(subHeading('Other items')); box.appendChild(buildRow(others)); }
      var dis = document.createElement('p');
      dis.style.cssText = 'font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;font-size:.7rem;color:#8a8a8a;margin:.6rem 0 0';
      dis.textContent = 'As an Amazon Associate, this site earns from qualifying purchases made through these links.';
      box.appendChild(dis);
      host.appendChild(box);
    } catch (e) { /* never break the index */ }
  };
  if (AFFILIATE_TAG && /\.blogspot\.com$/.test(location.hostname)) {
    try {
      var labels = [], las = document.querySelectorAll('.gs-topics a[rel="tag"]');
      for (var li = 0; li < las.length; li++) labels.push(las[li].textContent.trim());
      var picks = [], seen = {};
      for (var bi = 0; bi < labels.length; bi++) {
        var bs = BOOKS[labels[bi]] || [];
        for (var bj = 0; bj < bs.length; bj++) {
          var kk = bs[bj][0];
          if (!seen[kk]) { seen[kk] = 1; picks.push(bs[bj]); }
        }
      }
      picks = picks.slice(0, 3);
      if (picks.length) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'margin:0 0 1.2rem;padding:.9rem 1rem;background:#F4F7FB;border-left:3px solid #8a4b08';
        var hh = document.createElement('p');
        hh.style.cssText = 'font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;font-weight:700;color:#8a4b08;margin:0 0 .4rem';
        function emitRow(item) {
          var pr = document.createElement('p'); pr.style.cssText = 'margin:.15rem 0;font-size:.9rem';
          var aa = document.createElement('a'); aa.rel = 'nofollow sponsored noopener'; aa.target = '_blank';
          aa.href = item[2]
            ? 'https://www.amazon.in/dp/' + item[2] + '?tag=' + AFFILIATE_TAG
            : 'https://www.amazon.in/s?k=' + encodeURIComponent(item[0] + ' ' + item[1]) + '&tag=' + AFFILIATE_TAG;
          aa.textContent = item[0];
          pr.appendChild(aa);
          var au = document.createElement('span'); au.style.cssText = 'color:#595959;font-size:.8rem';
          au.textContent = ' — ' + item[1].replace(' Rohit Lamba', ' & Rohit Lamba');
          pr.appendChild(au); wrap.appendChild(pr);
        }
        hh.textContent = 'Further reading on this topic';
        wrap.appendChild(hh);
        for (var pi = 0; pi < picks.length; pi++) emitRow(picks[pi]);
        host.appendChild(wrap);
      }
    } catch (e) { /* an affiliate failure must never break the index */ }
  }

  jsonp(BASE + '/feeds/posts/summary?alt=json-in-script&max-results=0', function (res) {
    if (!res) return;
    var cats = (res.feed.category || []).map(function (c) { return c.term; })
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
    /* Author's-shelf image cards, always the last element on the page. */
    if (window.gsIdxShelf) window.gsIdxShelf(host);
  });
})();
