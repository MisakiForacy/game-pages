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

  var rawFetch = window.fetch;
  if (rawFetch) {
    window.fetch = function (input, init) {
      if (typeof input === 'string') { var m = mapUrl(input); if (m) input = m; }
      else if (input && input.url) { var n = mapUrl(input.url); if (n) input = new Request(n, input); }
      return rawFetch.call(window, input, init);
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
})();
