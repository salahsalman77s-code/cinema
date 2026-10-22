(function () {
  'use strict';
  var topLevel=window===window.top,lastScreenState=null;
  function confirmExit(){
    if(document.getElementById('safafi-exit-dialog'))return;
    var previous=document.activeElement,en=window.SafafiPreferences&&SafafiPreferences.getSnapshot().language==='en',dialog=document.createElement('section');dialog.id='safafi-exit-dialog';dialog.className='safafi-network-panel sf-exit-panel';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','safafi-exit-title');dialog.dataset.focusLayout='row';
    var title=document.createElement('h2');title.id='safafi-exit-title';title.textContent=en?'Exit Safafi Cinema?':'الخروج من صفافي سينما؟';dialog.appendChild(title);
    var cancel=document.createElement('button');cancel.type='button';cancel.textContent=en?'Keep watching':'البقاء في التطبيق';cancel.setAttribute('aria-label','Close exit confirmation');cancel.onclick=function(){dialog.remove();if(previous&&previous.isConnected)previous.focus();};dialog.appendChild(cancel);
    var exit=document.createElement('button');exit.type='button';exit.textContent=en?'Exit application':'الخروج';exit.onclick=function(){try{tizen.application.getCurrentApplication().exit();}catch(_){title.textContent=en?'Unable to close the application.':'تعذّر إغلاق التطبيق.';}};dialog.appendChild(exit);document.body.appendChild(dialog);window.dispatchEvent(new CustomEvent('safafi:overlay'));if(window.SafafiRemote)SafafiRemote.focus(cancel,true);else cancel.focus();
  }
  function video(){var v=document.querySelector('video:not([data-safafi-preview])');if(v)return v;var f=document.querySelector('[data-testid="player-iframe"]');try{return f&&f.contentDocument&&f.contentDocument.querySelector('video:not([data-safafi-preview])');}catch(_){return null;}}
  function screensaver(enabled){
    if(!topLevel){window.parent.postMessage({safafiTV:'screensaver',enabled:enabled},'*');return;}
    var api=window.webapis&&webapis.appcommon;if(!api||lastScreenState===enabled)return;
    try{api.setScreenSaver(enabled?api.AppCommonScreenSaverState.SCREEN_SAVER_ON:api.AppCommonScreenSaverState.SCREEN_SAVER_OFF,function(){lastScreenState=enabled;},function(){});}catch(_){}
  }
  window.SafafiTV={video:video,back:function(){
    if(!topLevel){window.parent.postMessage({safafiTV:'back'},'*');return;}
    var f=document.querySelector('[data-testid="player-iframe"]');try{if(f&&f.contentDocument){if(f.contentWindow.SafafiRemote&&f.contentWindow.SafafiRemote.closePopup())return;var close=f.contentDocument.querySelector('[aria-label="Close"],[aria-label="Close settings"]');if(close){close.click();return;}}}catch(_){}
    if(window.SafafiStage&&SafafiStage.exit())return;
    if(document.fullscreenElement&&document.exitFullscreen){document.exitFullscreen().catch(function(){});return;}
    if((location.hash||'#/')!=='#/'){history.back();return;}
    if(window.tizen)confirmExit();
  }};
  // Guard: never leave the hardware player running once the player screen is gone.
  function nativeGuard(){if(document.querySelector('[data-testid="player-iframe"]'))return;try{var av=window.webapis&&webapis.avplay;if(av&&av.getState()!=='NONE'){try{av.stop();}catch(_){}av.close();}}catch(_){}var obj=document.getElementById('sf-avplayer');if(obj)obj.remove();document.documentElement.classList.remove('sf-native-host');}
  if(topLevel){window.addEventListener('safafi:navigate',function(){setTimeout(nativeGuard,600);});window.addEventListener('pagehide',nativeGuard);}
  if(topLevel){
    window.addEventListener('message',function(e){var f=document.querySelector('[data-testid="player-iframe"]');if(!f||e.source!==f.contentWindow||e.origin!==location.origin)return;var d=e.data;if(!d)return;if(d.safafiTV==='screensaver'&&typeof d.enabled==='boolean')screensaver(d.enabled);else if(d.safafiTV==='back')window.SafafiTV.back();});
    if(window.tizen){var script=document.createElement('script');script.src='$WEBAPIS/webapis/webapis.js';script.onload=function(){var v=video();screensaver(!v||v.paused);};document.head.appendChild(script);}
  }
  document.addEventListener('playing',function(e){if(e.target.tagName==='VIDEO'&&!e.target.hasAttribute('data-safafi-preview'))screensaver(false);},true);
  ['pause','ended','emptied'].forEach(function(type){document.addEventListener(type,function(e){if(e.target.tagName==='VIDEO'&&!e.target.hasAttribute('data-safafi-preview'))screensaver(true);},true);});
  document.addEventListener('visibilitychange',function(){if(document.hidden){var v=video();if(v)v.pause();screensaver(true);}});
  window.addEventListener('pagehide',function(){var v=video();if(v)v.pause();screensaver(true);});
}());
