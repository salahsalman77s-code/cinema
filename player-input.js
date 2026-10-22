(function(){
  'use strict';
  var topLevel=window===window.top,readyWindow=null,readyURL=null;
  var codes=[13,27,37,38,39,40,10009,415,19,10252,417,412];
  function trusted(e){
    var frame=document.querySelector('[data-testid="player-iframe"]');
    if(!frame||e.source!==frame.contentWindow||e.origin!==location.origin)return null;
    try{var url=new URL(frame.getAttribute('src'),location.href);if(url.origin!==location.origin||url.pathname!==location.pathname||!/^#\/embed\//.test(url.hash))return null;}catch(_){return null;}
    return frame;
  }
  function forward(e,isolatedOnly){
    var frame=document.querySelector('[data-testid="player-iframe"]');
    var code=e.keyCode||({Enter:13,Escape:27,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40}[e.key]);
    if(!frame){readyWindow=readyURL=null;return false;}
    if(readyWindow!==frame.contentWindow||readyURL!==frame.src||codes.indexOf(code)<0)return false;
    if(isolatedOnly)try{if(frame.contentWindow.SafafiRemote)return false;}catch(_){}
    frame.contentWindow.postMessage({safafiInput:'key',code:code,repeat:!!e.repeat},'*');return true;
  }
  window.SafafiFrameInput={forward:forward,trusted:trusted};
  function receive(e){
    var d=e.data;if(!d||!d.safafiInput)return;
    if(topLevel){if(d.safafiInput==='ready'){var frame=trusted(e);if(frame){readyWindow=frame.contentWindow;readyURL=frame.src;}}return;}
    if(e.source!==window.parent||e.origin!==location.origin||d.safafiInput!=='key'||codes.indexOf(d.code)<0||!window.SafafiRemote)return;
    SafafiRemote.handle({keyCode:d.code,repeat:!!d.repeat,preventDefault:function(){},stopImmediatePropagation:function(){}});
  }
  window.addEventListener('message',receive);
  // Drop the reference to a closed player window so its whole document can be freed.
  if(topLevel)window.addEventListener('safafi:navigate',function(){setTimeout(function(){if(!document.querySelector('[data-testid="player-iframe"]'))readyWindow=readyURL=null;},700);});
  function ready(){if(!topLevel)window.parent.postMessage({safafiInput:'ready'},'*');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  window.addEventListener('pagehide',function(){window.removeEventListener('message',receive);document.removeEventListener('DOMContentLoaded',ready);readyWindow=readyURL=null;});
}());
