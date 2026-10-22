(function () {
  'use strict';
  var cache = new Map();
  // Reuse the browser HTTP image cache; never retain decoded Image/Canvas objects here.
  window.SafafiArtwork = function (url, width) {
    if (typeof url !== 'string') return url;
    var size = width <= 185 ? 'w185' : width <= 500 ? 'w500' : 'w1280', key = size + ':' + url;
    if (cache.has(key)) return cache.get(key);
    var result = url.replace(/^(https:\/\/image\.tmdb\.org\/t\/p\/)(?:original|w\d+)\//, '$1' + size + '/');
    cache.set(key, result);
    if (cache.size > 256) cache.delete(cache.keys().next().value);
    return result;
  };
  window.SafafiArtwork.stats = function () { return { entries: cache.size, limit: 256 }; };
  window.addEventListener('pagehide', function () { cache.clear(); }, { once: true });
}());
