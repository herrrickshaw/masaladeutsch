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
  });
})();
