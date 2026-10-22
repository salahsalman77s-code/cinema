(function(){
  'use strict';
  var active=null,scroll=null,ancestors=[],observer=null,remoteActive=false,nativeWasActive=false;
  function notify(){
    window.dispatchEvent(new Event('safafi:stage'));
    if(active){try{active.frame.contentWindow.dispatchEvent(new Event('safafi:stage'));}catch(_){}active.frame.contentWindow.postMessage({safafiStage:'state',active:true},'*');}
  }
  function enter(frame){
    if(!frame||!frame.isConnected||!frame.matches('[data-testid="player-iframe"]'))return false;
    if(active&&active.frame===frame)return true;
    if(active)exit();
    var host=frame.parentElement;if(!host)return false;
    scroll={x:window.scrollX,y:window.scrollY};active={frame:frame,host:host};nativeWasActive=false;
    host.setAttribute('data-safafi-stage','');
    var parent=host.parentElement;
    while(parent&&parent!==document.documentElement){parent.setAttribute('data-safafi-stage-ancestor','');ancestors.push(parent);parent=parent.parentElement;}
    document.documentElement.classList.add('safafi-stage-open');
    observer=new MutationObserver(function(){if(active&&!active.frame.isConnected)exit(false);});
    observer.observe(document.body,{childList:true,subtree:true});
    try{frame.focus({preventScroll:true});}catch(_){frame.focus();}
    notify();return true;
  }
  function exit(restore){
    if(!active)return false;
    var old=active;old.host.removeAttribute('data-safafi-stage');active=null;
    nativeWasActive=false;
    if(document.fullscreenElement===old.host&&typeof document.exitFullscreen==='function')try{var result=document.exitFullscreen();if(result&&result.catch)result.catch(function(){});}catch(_){}
    ancestors.forEach(function(el){el.removeAttribute('data-safafi-stage-ancestor');});ancestors=[];
    document.documentElement.classList.remove('safafi-stage-open');
    if(observer){observer.disconnect();observer=null;}
    if(restore!==false&&scroll){window.scrollTo(scroll.x,scroll.y);if(old.frame.isConnected)try{old.frame.focus({preventScroll:true});}catch(_){old.frame.focus();}}
    window.dispatchEvent(new Event('safafi:stage'));try{old.frame.contentWindow.dispatchEvent(new Event('safafi:stage'));}catch(_){}
    try{old.frame.contentWindow.postMessage({safafiStage:'state',active:false},'*');}catch(_){}
    scroll=null;return true;
  }
  function leavePlayer(){exit(false);if(window.SafafiRemote)SafafiRemote.leavePlayer();}
  function post(action,restore){window.parent.postMessage({safafiStage:action,restore:restore},'*');return true;}
  var proxy={enter:function(){return post('enter');},exit:function(restore){return post('exit',restore);},toggle:function(){return post('toggle');},leavePlayer:function(){return post('leave');},isActive:function(){return remoteActive;}};
  function target(){if(window===window.top)return null;try{if(window.frameElement&&window.frameElement.matches('[data-testid="player-iframe"]')&&window.parent.SafafiStage)return {api:window.parent.SafafiStage,frame:window.frameElement};}catch(_){}return {api:proxy,frame:null};}
  function receive(e){
    var d=e.data;if(!d||!d.safafiStage)return;
    if(window!==window.top){if(e.source===window.parent&&e.origin===location.origin&&d.safafiStage==='state'){remoteActive=!!d.active;window.dispatchEvent(new Event('safafi:stage'));}return;}
    var frame=window.SafafiFrameInput&&SafafiFrameInput.trusted(e);if(!frame)return;
    if(d.safafiStage==='enter')enter(frame);else if(d.safafiStage==='toggle')window.SafafiStage.toggle(frame);else if(d.safafiStage==='exit')exit(d.restore);else if(d.safafiStage==='leave')leavePlayer();
  }
  window.SafafiStage={enter:enter,exit:exit,leavePlayer:leavePlayer,isActive:function(frame){return !!active&&(!frame||frame===active.frame);},toggle:function(frame){return active&&active.frame===frame?exit():enter(frame);},forPlayer:target};
  function nativeChange(){if(!active)return;if(document.fullscreenElement===active.host)nativeWasActive=true;else if(nativeWasActive)exit();}
  document.addEventListener('fullscreenchange',nativeChange);
  window.addEventListener('message',receive);
  window.addEventListener('pagehide',function(){exit(false);window.removeEventListener('message',receive);document.removeEventListener('fullscreenchange',nativeChange);});
}());
