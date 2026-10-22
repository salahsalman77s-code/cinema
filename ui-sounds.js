(function(){
  'use strict';
  // Locally synthesized cues. No audio downloads or dependency on a media server.
  var enabled=true,lastResume=0,context=null,unlocked=false,lastCue=0,lastCard=null,observer=null,listeners=[];
  function listen(target,type,fn,capture){target.addEventListener(type,fn,capture);listeners.push(function(){target.removeEventListener(type,fn,capture);});}
  try{enabled=(window.tizen||/SmartTV|Tizen/i.test(navigator.userAgent)?localStorage.getItem('safafi.uiSounds')!=='off':localStorage.getItem('safafi.uiSounds')==='on');}catch(_){}
  function unlock(event){
    if(!event.isTrusted)return;
    unlocked=true;if(!enabled||context&&context.state==='running')return;
    var now=Date.now();if(now-lastResume<1500)return;lastResume=now;
    try{var Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!context)context=new Audio();if(context.state==='suspended')context.resume().catch(function(){});}catch(_){}
  }
  function watching(){var v=window.SafafiTV?window.SafafiTV.video():document.querySelector('video');return v&&!v.paused&&!v.ended;}
  function cue(open){
    if(!enabled||!unlocked||!context||context.state!=='running'||watching())return;
    var now=Date.now();if(now-lastCue<85)return;lastCue=now;
    try{var menu=open==='menu',oscillator=context.createOscillator(),gain=context.createGain(),t=context.currentTime,duration=menu?.14:open?.16:.055;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(menu?880:open?470:640,t);oscillator.frequency.exponentialRampToValueAtTime(menu?1175:open?780:530,t+duration);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(menu?.035:open?.055:.025,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(t);oscillator.stop(t+duration+.01);oscillator.onended=function(){oscillator.disconnect();gain.disconnect();};
    }catch(_){}
  }
  function update(button){button.textContent=enabled?'♪':'♪ ×';button.title=enabled?'كتم أصوات الواجهة':'تشغيل أصوات الواجهة';button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(enabled));}
  function mount(){var header=document.querySelector('.safafi-shell > header > div');if(!header||document.getElementById('safafi-sound-toggle'))return;var button=document.createElement('button');button.id='safafi-sound-toggle';button.type='button';button.className='safafi-sound-toggle';update(button);button.addEventListener('click',function(){enabled=!enabled;try{localStorage.setItem('safafi.uiSounds',enabled?'on':'off');}catch(_){}update(button);if(enabled){if(!context){try{var Audio=window.AudioContext||window.webkitAudioContext;if(Audio)context=new Audio();}catch(_){}}cue(true);}});header.appendChild(button);}
  listen(window,'pointerdown',unlock,true);listen(window,'keydown',unlock,true);
  listen(document,'focusin',function(e){if(e.target.id==='safafi-sound-toggle')return;if(e.target.closest('.sf-navigation nav button,.safafi-shell > header nav button')){cue('menu');return;}if(e.target.matches('button,a[href],.safafi-card,[role="button"]'))cue(false);},true);
  listen(document,'pointerover',function(e){var menu=e.target.closest&&e.target.closest('.sf-navigation nav button,.safafi-shell > header nav button'),card=menu||(e.target.closest&&e.target.closest('.safafi-card'));if(!card||card===lastCard)return;lastCard=card;cue(menu?'menu':false);},true);
  listen(document,'click',function(e){if(e.target.closest&&e.target.closest('.sf-navigation nav button,.safafi-shell > header nav button')){lastCue=0;cue('menu');return;}var card=e.target.closest&&e.target.closest('.safafi-card');if(!card||e.target.closest('button,input,select')&&e.target.closest('button,input,select')!==card)return;lastCue=0;cue(true);},true);
  listen(document,'visibilitychange',function(){if(document.hidden&&context&&context.state==='running')context.suspend().catch(function(){});});
  listen(window,'safafi:preferences',function(){enabled=(window.tizen||/SmartTV|Tizen/i.test(navigator.userAgent)?localStorage.getItem('safafi.uiSounds')!=='off':localStorage.getItem('safafi.uiSounds')==='on');if(!enabled&&context&&context.state==='running')context.suspend().catch(function(){});},true);
  function start(){mount();var root=document.getElementById('root');if(root){observer=new MutationObserver(function(changes){if(changes.some(function(c){return Array.from(c.addedNodes).some(function(n){return n.nodeType===1&&(n.matches("header")||n.querySelector("header"));});}))mount();});observer.observe(root,{childList:true,subtree:true});}}
  window.addEventListener('pagehide',function(){if(observer)observer.disconnect();listeners.forEach(function(off){off();});lastCard=null;if(context&&context.close)context.close().catch(function(){});context=null;},{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}());
