/* Masala Deutsch — site index, injected at the foot of every post.
   Discovers the label list from the blog's own feed and fills each topic on
   first open, so it can never go stale and never needs a post edit to update.
   Served from GitHub Pages so changing this ONE file changes every page. */
(function () {
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
                       ['The New Map: Energy, Climate, and the Clash of Nations', 'Daniel Yergin']],
    'Gas & LNG':      [['The New Map: Energy, Climate, and the Clash of Nations', 'Daniel Yergin']],
    'Trade & Tariffs':[['Has China Won? The Chinese Challenge to American Primacy', 'Kishore Mahbubani', '1541768140'],
                       ['India Transformed: 25 Years of Economic Reforms', 'Rakesh Mohan'],
                       ['Backstage: The Story Behind India’s High Growth Years', 'Montek Singh Ahluwalia']],
    'Import Substitution': [['India Transformed: 25 Years of Economic Reforms', 'Rakesh Mohan']],
    'Industrial Policy': [['Breaking the Mould: Reimagining India’s Economic Future', 'Raghuram Rajan Rohit Lamba', '0143472771']],
    'Markets & Finance': [['I Do What I Do', 'Raghuram Rajan', 'B0BXD7LG75'],
                          ['Overdraft: Saving the Indian Saver', 'Urjit Patel']],
    'Prices & Inflation': [['I Do What I Do', 'Raghuram Rajan', 'B0BXD7LG75']],
    'Agriculture & Fertilisers': [['Everybody Loves a Good Drought', 'P. Sainath', '0140259848']],
    'Climate & Carbon': [['How the World Really Works', 'Vaclav Smil', '0241989671']],
    'Mobility & EV':  [['Energy and Civilization: A History', 'Vaclav Smil', '0262536161']],
    'AI Tools':       [['Co-Intelligence: Living and Working with AI', 'Ethan Mollick', '0753560771']]
  };
  /* Off-topic personal picks, shown on every post under their own honest
     heading so they never masquerade as topic reading. */
  var SHELF = [
    ['Siddhartha', 'Hermann Hesse', '817234368X',
     'https://m.media-amazon.com/images/I/81YwVw+xyoL._SY522_.jpg'],
    ['Lifelong Stovetop Moka Pot / Espresso Maker', 'Lifelong', 'B0F74B2HRH',
     'https://m.media-amazon.com/images/I/61tDjFKl7xL._SX679_.jpg'],
    ['Saravana Degree Coffee Powder — Chikmagaluru filter coffee, 250 g', 'Saravana', 'B0F5XYKJNK',
     'https://m.media-amazon.com/images/I/61y8EIhYlAL._SX679_.jpg']
  ];
  window.gsIdxShelf = function (host) {
    if (!AFFILIATE_TAG || !SHELF.length) return;
    try {
      var box = document.createElement('div');
      box.style.cssText = 'margin:1.6rem 0 0;padding-top:1rem;border-top:1px solid #e2e2e2';
      var h = document.createElement('p');
      h.style.cssText = 'font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;font-weight:700;color:#8a4b08;margin:0 0 .6rem';
      h.textContent = 'From the author\u2019s shelf';
      box.appendChild(h);
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:1rem';
      for (var i = 0; i < SHELF.length; i++) {
        var it = SHELF[i];
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
      box.appendChild(row);
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
