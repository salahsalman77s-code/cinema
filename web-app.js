// Safafi Cinema — web version helpers (phones/computers only; inert on the TV and inside the player frame).
(function(){
  'use strict';
  if(window.tizen||/SmartTV|Tizen/i.test(navigator.userAgent)||window!==window.top)return;
  document.documentElement.classList.add('sf-web');
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))
    window.addEventListener('load',function(){navigator.serviceWorker.register('./sw.js').catch(function(){});});
  // Pressing any "watch" action enters fullscreen right away (needs the tap itself as the user gesture).
  // iPhone Safari has no page fullscreen; there the app is fullscreen when opened from the Home Screen.
  var root=document.documentElement,auto=false;
  function isWatch(){return /^#\/watch\//.test(location.hash);}
  function fsEl(){return document.fullscreenElement||document.webkitFullscreenElement;}
  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest&&e.target.closest('a[href*="/watch/"]');
    if(!a||fsEl())return;
    var req=root.requestFullscreen||root.webkitRequestFullscreen;if(!req)return;
    try{var r=req.call(root,{navigationUI:'hide'}),lock=function(){auto=true;try{if(screen.orientation&&screen.orientation.lock&&matchMedia('(pointer:coarse)').matches)screen.orientation.lock('landscape').catch(function(){});}catch(_){}};
      if(r&&r.then)r.then(lock).catch(function(){});else lock();}catch(_){}
  },true);
  window.addEventListener('hashchange',function(){
    if(isWatch()||!fsEl())return;
    try{if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock();}catch(_){}
    try{(document.exitFullscreen||document.webkitExitFullscreen).call(document);}catch(_){}
    auto=false;
  });
}());
