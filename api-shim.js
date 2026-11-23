/* GitHub Pages 镜像：把 /api 与 /games 转发到 game.foracy.site */
(function () {
  var ORIGIN = 'https://game.foracy.site';
  var prefixes = ['/api/', '/games/'];

  function mapUrl(u) {
    try {
      var s = String(u);
      if (s.charAt(0) !== '/') return null;
      for (var i = 0; i < prefixes.length; i++) {
        if (s.indexOf(prefixes[i]) === 0) return ORIGIN + s;
      }
      return null;
    } catch (e) { return null; }
  }

  var SNAPSHOT_BASE = 'https://misakiforacy.github.io/myblog/data/';
  function snapshotFor(url) {
    if (!url) return null;
    if (url.indexOf(ORIGIN + '/api/games') === 0) return SNAPSHOT_BASE + 'games.json';
    return null;
  }

  var rawFetch = window.fetch;
  if (rawFetch) {
    window.fetch = function (input, init) {
      var original = typeof input === 'string' ? input : (input && input.url);
      var mapped = mapUrl(original);
      if (!mapped) return rawFetch.call(window, input, init);
      return rawFetch.call(window, mapped, init).then(function (res) {
        if (res && res.ok) return res;
        var snap = snapshotFor(mapped);
        if (!snap) return res;
        return rawFetch.call(window, snap, { cache: 'no-store' });
      }).catch(function () {
        var snap = snapshotFor(mapped);
        if (!snap) throw new Error('network');
        return rawFetch.call(window, snap, { cache: 'no-store' });
      });
    };
  }

  var rawOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var m = mapUrl(url); if (m) arguments[1] = m;
    return rawOpen.apply(this, arguments);
  };

  // 游戏是 iframe 加载的，src 赋值也要重写
  var desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  if (desc && desc.set) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
      configurable: true,
      get: desc.get,
      set: function (v) {
        var m = mapUrl(v);
        desc.set.call(this, m || v);
      }
    });
  }
  var rawSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (name === 'src' && this instanceof HTMLIFrameElement) {
      var m = mapUrl(value); if (m) value = m;
    }
    return rawSetAttr.call(this, name, value);
  };

  // <img src="/api/icon/..."> 这类直接写 src 的也要改写
  var imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (imgDesc && imgDesc.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      get: imgDesc.get,
      set: function (v) {
        var m = mapUrl(v);
        imgDesc.set.call(this, m || v);
      }
    });
  }
  var rawSetAttr2 = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (name === 'src' && (this instanceof HTMLImageElement || this instanceof HTMLIFrameElement)) {
      var m = mapUrl(value); if (m) value = m;
    }
    return rawSetAttr2.call(this, name, value);
  };

  // innerHTML 解析出来的 img/frame 不经过 setter，用 MutationObserver 补一刀
  function fixNode(root) {
    if (!root || root.nodeType !== 1) return;
    var nodes = [];
    if (root.matches && root.matches('img,iframe')) nodes.push(root);
    if (root.querySelectorAll) nodes = nodes.concat([].slice.call(root.querySelectorAll('img,iframe')));
    nodes.forEach(function (el) {
      var v = el.getAttribute('src');
      var m = v ? mapUrl(v) : null;
      if (m) el.setAttribute('src', m);
    });
  }
  new MutationObserver(function (muts) {
    muts.forEach(function (mu) {
      [].slice.call(mu.addedNodes).forEach(fixNode);
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', function () { fixNode(document.body); });
})();
