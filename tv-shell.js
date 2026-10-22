(function(){
  'use strict';
  var splash=document.getElementById('safafi-startup'),root=document.getElementById('root');
  if(!splash||!root)return;
  var observer,timer,exitTimer,introTimer,offline=null,previous=null,finished=false,ready=false;
  // Cinematic intro (~2.2 s) plays while the app boots underneath; it never blocks input for long:
  // any remote key skips it, reduced motion and the embedded player document skip it entirely.
  var reduced=document.documentElement.dataset.motion==='reduced'||!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  var embedded=window!==window.top,introEnd=(reduced||embedded)?0:Date.now()+1500;
  if(introEnd)splash.classList.add('sf-intro-play');else splash.classList.add('sf-intro-static');
  function skip(e){if(finished||splash.getAttribute('role')==='dialog')return;if(e&&e.type==='keydown'){e.preventDefault();e.stopImmediatePropagation();}introEnd=0;if(ready)finish();}
  if(introEnd){window.addEventListener('keydown',skip,true);introTimer=setTimeout(function(){if(ready)finish();else splash.classList.add('sf-intro-waiting');},1500);}
  function finish(){
    if(finished)return;
    var wait=introEnd-Date.now();if(wait>0){clearTimeout(introTimer);introTimer=setTimeout(finish,wait);return;}
    finished=true;clearTimeout(timer);clearTimeout(introTimer);observer.disconnect();window.removeEventListener('keydown',skip,true);
    splash.classList.add('safafi-startup-done');
    exitTimer=setTimeout(function(){splash.remove();},embedded||reduced?120:420);
  }
  function check(){if(root.querySelector('header,video,iframe,main a[href],main button,[role="alert"]')){ready=true;finish();}}
  observer=new MutationObserver(check);observer.observe(root,{childList:true,subtree:true});
  timer=setTimeout(function(){
    splash.setAttribute('role','dialog');splash.setAttribute('aria-label','تعذر بدء التطبيق');
    splash.querySelector('p').textContent='استغرق التحميل وقتًا أطول. تحقق من اتصال الإنترنت.';
    splash.querySelector('.safafi-startup-progress').hidden=true;splash.classList.add('sf-intro-waiting');
    var retry=splash.querySelector('button');retry.hidden=false;retry.focus();
  },12000);
  splash.querySelector('button').onclick=function(){location.reload();};
  function connection(){
    if(navigator.onLine===false&&!offline){
      previous=document.activeElement;offline=document.createElement('section');offline.className='safafi-network-panel';
      offline.setAttribute('role','dialog');offline.setAttribute('aria-modal','true');offline.setAttribute('aria-label','الاتصال بالإنترنت');
      offline.innerHTML='<h2>انقطع الاتصال</h2><p>تحقق من الشبكة ثم أعد المحاولة. محفوظاتك وقائمتك تبقى محفوظة.</p><button type="button">إعادة المحاولة</button><button type="button" aria-label="Close network message">إغلاق</button>';
      offline.firstElementChild.nextElementSibling.nextElementSibling.onclick=function(){if(navigator.onLine)location.reload();else offline.querySelector('p').textContent='الاتصال غير متاح بعد. تحقق من إعدادات الشبكة في التلفزيون.';};
      offline.lastElementChild.onclick=closeOffline;document.body.appendChild(offline);
      if(window.SafafiRemote)SafafiRemote.focus(offline.querySelector('button'),true);
    }else if(navigator.onLine)closeOffline();
  }
  function closeOffline(){if(!offline)return;offline.remove();offline=null;if(previous&&previous.isConnected&&window.SafafiRemote)SafafiRemote.focus(previous,true);}
  function teardown(){observer.disconnect();clearTimeout(timer);clearTimeout(exitTimer);clearTimeout(introTimer);window.removeEventListener('keydown',skip,true);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);window.removeEventListener('pagehide',teardown);}
  window.addEventListener('online',connection);window.addEventListener('offline',connection);window.addEventListener('pagehide',teardown);check();
}());
