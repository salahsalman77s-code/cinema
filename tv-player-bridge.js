(function(){
  'use strict';
  if(!window.SafafiPlatform||!SafafiPlatform.tv||window===window.top)return;
  var button=null,observer;
  function mount(){
    if(button&&button.isConnected)return;
    var toolbar=document.querySelector('[role="toolbar"][aria-label="Playback controls"]');
    if(!toolbar)return;
    button=document.createElement('button');button.type='button';button.className='sc-button sc-player-return';
    button.setAttribute('aria-label','الحلقات والتفاصيل');button.textContent='الحلقات والتفاصيل ↑';
    button.addEventListener('click',leave);toolbar.appendChild(button);
  }
  function leave(){try{var remote=window.parent.SafafiRemote;if(remote)remote.leavePlayer();}catch(_){}}
  function dispose(){observer.disconnect();if(button)button.removeEventListener('click',leave);window.removeEventListener('pagehide',dispose);}
  observer=new MutationObserver(mount);observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('pagehide',dispose);mount();
}());
