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


  /* XHR 兜底：应用里有地方用 XMLHttpRequest（axios），
     这里对映射过的接口直接走 fetch 取快照，再模拟出 onload */
  var NativeXHR = window.XMLHttpRequest;
  var nativeOpen = NativeXHR.prototype.open;
  var nativeSend = NativeXHR.prototype.send;

  NativeXHR.prototype.open = function (method, url) {
    this.__mapped = mapUrl(url);
    return nativeOpen.apply(this, arguments);
  };

  NativeXHR.prototype.send = function (body) {
    var self = this;
    var mapped = this.__mapped;
    if (!mapped) return nativeSend.apply(this, arguments);

    var loadText = function (url) {
      return window.fetch(url, { cache: 'no-store' }).then(function (r) {
        return r.text().then(function (t) { return { status: r.status, text: t }; });
      });
    };
    var snapshot = snapshotFor(mapped);
    var primary = loadText(mapped).then(function (res) {
      if (res.status >= 200 && res.status < 300) return res;
      if (!snapshot) return res;
      return loadText(snapshot);
    }).catch(function () {
      if (!snapshot) throw new Error('network');
      return loadText(snapshot);
    });

    primary.then(function (res) {
      Object.defineProperty(self, 'readyState', { value: 4, configurable: true });
      Object.defineProperty(self, 'status', { value: res.status, configurable: true });
      Object.defineProperty(self, 'responseText', { value: res.text, configurable: true });
      Object.defineProperty(self, 'response', { value: res.text, configurable: true });
      self.getAllResponseHeaders = function () { return 'content-type: application/json\r\n'; };
      self.getResponseHeader = function (k) {
        return String(k).toLowerCase() === 'content-type' ? 'application/json' : null;
      };
      if (typeof self.onreadystatechange === 'function') self.onreadystatechange();
      if (typeof self.onload === 'function') self.onload();
      try { self.dispatchEvent(new Event('load')); } catch (e) {}
    }).catch(function (err) {
      if (typeof self.onerror === 'function') self.onerror(err);
      try { self.dispatchEvent(new Event('error')); } catch (e) {}
    });
  };

})();
