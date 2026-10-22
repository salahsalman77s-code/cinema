// Safafi Cinema — native playback (Samsung AVPlay) behind the existing player.
// Runs only inside the player iframe on a Samsung TV. The legacy React player keeps all of its logic
// (progress, subtitles, next episode, failover); its <video> element becomes a facade whose time, state
// and events come from AVPlay, which decodes on the TV's hardware video plane. Any AVPlay failure falls
// back to the web player automatically at the same position.
(function(){
  'use strict';
  var top=window.top;if(window===top)return;
  var api=null;try{api=top.webapis&&top.webapis.avplay;}catch(_){}
  var off=false;try{off=sessionStorage.getItem('sf.native.off')==='1'||localStorage.getItem('safafi.nativePlayer')==='off';}catch(_){}
  if(!api||off)return;
  window.SafafiNativeHLS=true;
  var M=HTMLMediaElement.prototype,orig={},props=['src','currentSrc','currentTime','duration','paused','ended','readyState','seeking','buffered','networkState','playbackRate','error'];
  props.forEach(function(p){orig[p]=Object.getOwnPropertyDescriptor(M,p);});
  var origPlay=M.play,origPause=M.pause,origLoad=M.load,origCanPlay=M.canPlayType,origRemoveAttr=Element.prototype.removeAttribute;
  var E={el:null,url:'',ready:false,paused:true,ended:false,seeking:false,time:0,duration:NaN,wantPlay:false,pendingSeek:null,lastTick:0,started:false,rate:1,watchdog:0,object:null};
  function log(){try{console.info.apply(console,['[Safafi native]'].concat([].slice.call(arguments)));}catch(_){}}
  function fire(){var el=E.el;if(!el)return;for(var i=0;i<arguments.length;i++){try{el.dispatchEvent(new Event(arguments[i]));}catch(_){}}}
  function state(){try{return api.getState();}catch(_){return 'NONE';}}
  function host(on){
    document.documentElement.classList.toggle('sf-native-playback',on);
    try{top.document.documentElement.classList.toggle('sf-native-host',on);}catch(_){}
  }
  function ensureObject(){
    var doc=top.document,obj=doc.getElementById('sf-avplayer');
    if(!obj){obj=doc.createElement('object');obj.id='sf-avplayer';obj.setAttribute('type','application/avplayer');obj.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;z-index:0;pointer-events:none';doc.body.appendChild(obj);}
    E.object=obj;return obj;
  }
  function teardown(){
    clearTimeout(E.watchdog);
    try{if(state()!=='NONE'&&state()!=='IDLE')api.stop();}catch(_){}
    try{api.close();}catch(_){}
    try{var obj=top.document.getElementById('sf-avplayer');if(obj)obj.remove();}catch(_){}
    host(false);E.ready=false;E.url='';E.started=false;
  }
  // Fall back to the web player at the current position, once per session.
  function fallback(reason){
    log('fallback:',reason);var at=Math.floor((E.time||0)/1000);teardown();
    try{sessionStorage.setItem('sf.native.off','1');}catch(_){}
    try{var h=location.hash,q=h.indexOf('?');var base=q<0?h:h.slice(0,q),params=new URLSearchParams(q<0?'':h.slice(q+1));if(at>5)params.set('t',String(at));params.set('autoplay','1');history.replaceState(history.state,'',base+'?'+params.toString());}catch(_){}
    location.reload();
  }
  function tick(ms){
    E.time=ms;var now=Date.now();
    if(!E.started){E.started=true;clearTimeout(E.watchdog);}
    if(now-E.lastTick>240){E.lastTick=now;fire('timeupdate');}
  }
  function open(el,url){
    if(E.url===url&&E.el===el)return;
    teardown();E.el=el;E.url=url;E.ready=false;E.paused=true;E.ended=false;E.time=0;E.duration=NaN;E.pendingSeek=null;E.started=false;
    var uri=url;if(/\.m3u8/i.test(url)&&!/\.m3u8($|\?|#)/i.test(url.split('?')[0])&&!/\.m3u8$/i.test(url))uri=url+(url.indexOf('?')<0?'?':'&')+'sfext=.m3u8';
    try{
      ensureObject();host(true);
      api.open(uri);
      try{api.setDisplayRect(0,0,1920,1080);api.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');}catch(_){}
      try{api.setStreamingProperty('USER_AGENT',navigator.userAgent);}catch(_){}
      api.setListener({
        onbufferingstart:function(){fire('waiting');},
        onbufferingprogress:function(){},
        onbufferingcomplete:function(){if(!E.paused)fire('playing');fire('canplay');},
        oncurrentplaytime:tick,
        onstreamcompleted:function(){if(isFinite(E.duration)&&E.duration>0)E.time=E.duration;E.ended=true;E.paused=true;try{api.stop();}catch(_){}fire('timeupdate','pause','ended');},
        onerror:function(type){if(!E.started)fallback('error '+type);else{fire('error');log('error during playback',type);}},
        onevent:function(type,data){log('event',type,data);},
        onsubtitlechange:function(){}
      });
      fire('loadstart');
      E.watchdog=setTimeout(function(){if(!E.started)fallback('no playback after 20s');},20000);
      api.prepareAsync(function(){
        E.ready=true;try{E.duration=api.getDuration();}catch(_){}
        applyAudioPreference();
        fire('durationchange','loadedmetadata','loadeddata','canplay','canplaythrough','progress');
        if(E.pendingSeek!==null){var to=E.pendingSeek;E.pendingSeek=null;seek(to);}
        if(E.wantPlay)play();
      },function(e){fallback('prepare '+(e&&e.name||e));});
    }catch(e){fallback('open '+(e&&e.message||e));}
  }
  // Remembered audio language (chosen in the audio menu) is applied as soon as the stream is prepared.
  function applyAudioPreference(){
    window.__sfNativeAudio=undefined;var want=null;try{want=localStorage.getItem('safafi.audioLang');}catch(_){}
    var tracks=[];try{tracks=Array.prototype.slice.call(api.getTotalTrackInfo()).filter(function(t){return t.type==='AUDIO';});}catch(_){return;}
    if(!tracks.length)return;window.__sfNativeAudio=tracks[0].index;if(!want||!window.SafafiSubs)return;
    var match=tracks.find(function(t){var info={};try{info=JSON.parse(t.extra_info||'{}');}catch(_){}return SafafiSubs.code({language:info.language||info.lang||''})===want;});
    if(match&&match.index!==tracks[0].index){try{api.setSelectTrack('AUDIO',match.index);window.__sfNativeAudio=match.index;log('audio preference',want);}catch(_){}}
  }
  function play(){
    if(!E.url)return;E.wantPlay=true;if(!E.ready)return;
    try{var s=state();if(s==='IDLE'){E.ready=false;api.prepareAsync(function(){E.ready=true;play();},function(e){fallback('re-prepare '+e);});return;}if(s!=='PLAYING')api.play();E.paused=false;E.ended=false;fire('play','playing');}catch(e){fallback('play '+(e&&e.message||e));}
  }
  function pause(){E.wantPlay=false;try{if(state()==='PLAYING')api.pause();}catch(_){}if(!E.paused){E.paused=true;fire('pause');}}
  function seek(ms){
    ms=Math.max(0,Math.floor(ms));if(isFinite(E.duration)&&E.duration>0)ms=Math.min(ms,E.duration-1000);
    if(!E.ready){E.pendingSeek=ms;return;}
    E.seeking=true;fire('seeking');var from=E.time;E.time=ms;
    try{api.seekTo(ms,function(){E.seeking=false;fire('seeked','timeupdate');},function(){E.seeking=false;E.time=from;fire('seeked','timeupdate');});}catch(_){E.seeking=false;E.time=from;}
  }
  function owns(el){return el&&E.el===el&&!!E.url;}
  function eligible(url){return typeof url==='string'&&/^https?:\/\//i.test(url);}
  function define(p,getter,setter){
    Object.defineProperty(M,p,{configurable:true,enumerable:true,
      get:function(){return owns(this)?getter.call(this):orig[p].get.call(this);},
      set:function(v){if(setter&&setter.call(this,v)!==false)return;if(orig[p].set)orig[p].set.call(this,v);}});
  }
  define('src',function(){return E.url;},function(v){if(eligible(v)){open(this,String(v));return;}if(owns(this))teardown();return false;});
  define('currentSrc',function(){return E.url;});
  define('currentTime',function(){return (E.time||0)/1000;},function(v){if(!owns(this))return false;seek(Number(v)*1000);});
  define('duration',function(){return isFinite(E.duration)&&E.duration>0?E.duration/1000:NaN;});
  define('paused',function(){return E.paused;});
  define('ended',function(){return E.ended;});
  define('readyState',function(){return E.ready?4:0;});
  define('seeking',function(){return E.seeking;});
  define('networkState',function(){return E.ready?1:2;});
  define('error',function(){return null;});
  define('buffered',function(){var d=isFinite(E.duration)?E.duration/1000:0,t=(E.time||0)/1000;return {length:E.ready?1:0,start:function(){return 0;},end:function(){return Math.min(d,t+30);}};});
  define('playbackRate',function(){return E.rate;},function(v){if(!owns(this))return false;var n=Math.round(Number(v));if(n>=1&&n<=8){try{api.setSpeed(n);E.rate=n;}catch(_){}}fire('ratechange');});
  M.play=function(){if(owns(this)){play();return Promise.resolve();}return origPlay.apply(this,arguments);};
  M.pause=function(){if(owns(this)){pause();return;}return origPause.apply(this,arguments);};
  M.load=function(){if(owns(this))return;return origLoad.apply(this,arguments);};
  M.canPlayType=function(t){if(/mpegurl|mp4/i.test(String(t)))return 'maybe';return origCanPlay.apply(this,arguments);};
  // <source> children would make the web engine fetch and fail on the stream (and trigger failover); park them.
  var origSetAttr=Element.prototype.setAttribute,srcDesc=Object.getOwnPropertyDescriptor(HTMLSourceElement.prototype,'src');
  Element.prototype.setAttribute=function(n,v){if(this.tagName==='SOURCE'&&String(n).toLowerCase()==='src'&&eligible(String(v)))return origSetAttr.call(this,'data-sf-src',v);return origSetAttr.apply(this,arguments);};
  Object.defineProperty(HTMLSourceElement.prototype,'src',{configurable:true,enumerable:true,get:function(){return this.getAttribute('data-sf-src')||srcDesc.get.call(this);},set:function(v){if(eligible(String(v))){origSetAttr.call(this,'data-sf-src',v);return;}srcDesc.set.call(this,v);}});
  window.addEventListener('error',function(e){var t=e.target;if(t&&(t.tagName==='SOURCE'&&t.hasAttribute('data-sf-src')||t.tagName==='VIDEO'&&owns(t))){e.stopImmediatePropagation();}},true);
  Element.prototype.removeAttribute=function(n){if(n==='src'&&owns(this))teardown();return origRemoveAttr.apply(this,arguments);};
  // Lifecycle: stop the hardware player when the video leaves the page, the iframe unloads or the app hides.
  new MutationObserver(function(){if(E.el&&!E.el.isConnected)teardown();}).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pagehide',teardown);window.addEventListener('beforeunload',teardown);
  document.addEventListener('visibilitychange',function(){if(!E.url)return;try{if(document.hidden)api.suspend();else api.restore();}catch(_){}});
  window.SafafiNativePlayback={active:function(){return !!E.url;},audioTracks:function(){try{return Array.prototype.slice.call(api.getTotalTrackInfo()).filter(function(t){return t.type==='AUDIO';});}catch(_){return [];}},selectAudio:function(i){try{api.setSelectTrack('AUDIO',i);return true;}catch(_){return false;}},disable:function(){fallback('user');}};
  log('AVPlay engine armed');
}());
