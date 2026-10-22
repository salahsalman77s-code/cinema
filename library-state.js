(function () {
  'use strict';
  // One storage subscription per document, regardless of the number of mounted cards.
  var read = null, snapshot = null, subscribers = new Set(), listening = false;
  var events = ['framextv:watchlist_updated', 'storage', 'focus'];
  function refresh() {
    if (!read) return;
    snapshot = read();
    subscribers.forEach(function (notify) { notify(); });
  }
  function subscribe(notify) {
    if (!listening) { events.forEach(function (name) { window.addEventListener(name, refresh); }); listening = true; refresh(); }
    subscribers.add(notify);
    return function () {
      subscribers.delete(notify);
      if (!subscribers.size && listening) { events.forEach(function (name) { window.removeEventListener(name, refresh); }); listening = false; }
    };
  }
  window.SafafiLibraryStore = {
    connect: function (reader) { if (!read) { read = reader; refresh(); } return this; },
    getSnapshot: function () { if (!snapshot && read) snapshot = read(); return snapshot; },
    subscribe: subscribe,
    stats: function () { return { subscribers: subscribers.size, listening: listening }; }
  };
}());
