(function () {
  'use strict';
  function route() { return new URL((location.hash.slice(1) || '/'), 'https://safafi.local'); }
  window.SafafiEmbedURL = function (url) {
    if (!/^\/embed(?:\/|\?)/.test(url)) return url;
    return new URL('index.html', document.baseURI).href.split('#')[0] + '#' + url;
  };
  window.SafafiLocation = {get pathname(){return route().pathname;},get search(){var q=route().search;return q+(q?'&':'?')+'backend=prod';}};
  window.SafafiHistory = function () {
    var listener=null,action='POP';
    function loc(){var u=route(),s=history.state||{};return {pathname:u.pathname,search:u.search,hash:u.hash,state:s.usr||null,key:s.key||'default'};}
    function target(to){return typeof to==='string'?to:(to.pathname||loc().pathname)+(to.search||'')+(to.hash||'');}
    function notify(delta){if(listener)listener({action:action,location:loc(),delta:delta});window.dispatchEvent(new CustomEvent("safafi:navigate",{detail:{action:action,location:loc(),delta:delta}}));}
    window.addEventListener('popstate',function(){action='POP';notify(null);});
    return {get action(){return action;},get location(){return loc();},createHref:function(to){return '#'+target(to);},createURL:function(to){return new URL(target(to),'https://safafi.local');},encodeLocation:function(to){var u=new URL(target(to),'https://safafi.local');return {pathname:u.pathname,search:u.search,hash:u.hash};},push:function(to,state){action='PUSH';history.pushState({usr:state,key:Math.random().toString(36).slice(2)},'','#'+target(to));notify(1);},replace:function(to,state){action='REPLACE';history.replaceState({usr:state,key:Math.random().toString(36).slice(2)},'','#'+target(to));notify(0);},go:function(n){history.go(n);},listen:function(fn){listener=fn;return function(){listener=null;};}};
  };
  if(window.startSafafiRemote)window.startSafafiRemote();
}());
