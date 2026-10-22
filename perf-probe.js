// Safafi Cinema — opt-in performance probe for measuring on the real TV (remote web inspector).
// Enable: localStorage.setItem('safafi.perf','1'); location.reload();  Read: SafafiPerf.report()
// Inactive (one storage read, no listeners) unless enabled.
(function(){
  'use strict';
  try{if(window!==window.top||localStorage.getItem('safafi.perf')!=='1')return;}catch(_){return;}
  var t0=performance.timing?performance.timing.navigationStart:0,marks={},keys=[],longTasks=[],frames=[],pendingKey=0;
  function now(){return Math.round(performance.now());}
  function mark(name){if(!marks[name])marks[name]=now();}
  document.addEventListener('DOMContentLoaded',function(){mark('domContentLoaded');});
  var shell=new MutationObserver(function(){if(document.querySelector('.sf-app'))mark('shellRendered');if(document.querySelector('.safafi-card img.is-loaded'))mark('firstCardArtwork');if(!document.getElementById('safafi-startup')){mark('introGone');shell.disconnect();}});
  document.addEventListener('DOMContentLoaded',function(){shell.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});});
  document.addEventListener('focusin',function(){mark('firstFocus');if(!pendingKey)return;var start=pendingKey;pendingKey=0;requestAnimationFrame(function(){requestAnimationFrame(function(){keys.push(Math.round(performance.now()-start));if(keys.length>400)keys.shift();});});},true);
  window.addEventListener('keydown',function(e){if(e.keyCode>=37&&e.keyCode<=40){pendingKey=performance.now();mark('firstKey');}},true);
  try{new PerformanceObserver(function(list){list.getEntries().forEach(function(e){longTasks.push([Math.round(e.startTime),Math.round(e.duration)]);if(longTasks.length>400)longTasks.shift();});}).observe({entryTypes:['longtask']});}catch(_){}
  var last=0;function frame(t){if(last){frames.push(t-last);if(frames.length>3000)frames.shift();}last=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);
  function pct(list,p){if(!list.length)return null;var s=list.slice().sort(function(a,b){return a-b;});return Math.round(s[Math.min(s.length-1,Math.floor(s.length*p))]);}
  // Play press -> first moving frame of the player (polls the same-origin player frame while waiting).
  var plays=[],playStart=0;
  window.addEventListener('keydown',function(e){if(e.keyCode!==13)return;var a=document.activeElement;if(!a||!a.closest||!a.closest('a[href*="/watch/"]'))return;playStart=performance.now();var tries=0;(function poll(){if(!playStart||++tries>300)return;try{var f=document.querySelector('[data-testid="player-iframe"]'),w=f&&f.contentWindow,v=w&&w.document.querySelector('video'),nat=w&&w.SafafiNativePlayback&&w.SafafiNativePlayback.active();if(v&&!v.paused&&v.currentTime>0){plays.push(Math.round(performance.now()-playStart)+(nat?' native':' web'));playStart=0;return;}}catch(_){}setTimeout(poll,100);})();},true);
  window.SafafiPerf={report:function(){var r={startupMs:marks,playStartMs:plays,keyToPaintedFocusMs:{samples:keys.length,median:pct(keys,.5),p95:pct(keys,.95),max:pct(keys,1)},longTasks:{count:longTasks.length,totalMs:longTasks.reduce(function(a,b){return a+b[1];},0),maxMs:longTasks.reduce(function(a,b){return Math.max(a,b[1]);},0)},frameMs:{median:pct(frames,.5),p95:pct(frames,.95),over50:frames.filter(function(f){return f>50;}).length},navigationStart:t0};try{console.table&&console.table(r.keyToPaintedFocusMs);}catch(_){}return r;},reset:function(){plays=[];keys=[];longTasks=[];frames=[];}};
}());
