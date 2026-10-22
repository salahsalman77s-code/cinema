(function(){
  'use strict';
  var Core=window.SafafiExperienceCore,cache=new Map(),inflight=new Map(),youtubePromise=null;
  function colors(url){
    if(!url)return Promise.resolve(Core.fallback.slice());
    var hit=cache.get(url);if(hit&&Date.now()-hit.time<3600000){cache.delete(url);cache.set(url,hit);return Promise.resolve(hit.value);}
    if(inflight.has(url))return inflight.get(url);
    var task=new Promise(function(resolve){var image=new Image(),finished=false,timer;
      function done(value){if(finished)return;finished=true;clearTimeout(timer);image.onload=image.onerror=null;image.src='';cache.set(url,{time:Date.now(),value:value});while(cache.size>64)cache.delete(cache.keys().next().value);resolve(value);}
      image.crossOrigin='anonymous';image.decoding='async';
      image.onload=function(){try{var canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;var ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return done(Core.fallback.slice());ctx.drawImage(image,0,0,24,24);done(Core.palette(ctx.getImageData(0,0,24,24).data));}catch(_){done(Core.fallback.slice());}};
      image.onerror=function(){done(Core.fallback.slice());};timer=setTimeout(function(){done(Core.fallback.slice());},1800);image.src=url;
    });
    inflight.set(url,task);task.then(function(){inflight.delete(url);});return task;
  }
  function youtube(){
    if(window.YT&&typeof YT.Player==='function')return Promise.resolve(YT);
    if(youtubePromise)return youtubePromise;
    youtubePromise=new Promise(function(resolve,reject){var previous=window.onYouTubeIframeAPIReady,finished=false,script=document.createElement('script');
      function finish(error){if(finished)return;finished=true;clearTimeout(timer);if(error){script.remove();reject(error);}else resolve(window.YT);}
      var timer=setTimeout(function(){finish(Error('Trailer SDK unavailable'));},7000);
      window.onYouTubeIframeAPIReady=function(){if(typeof previous==='function')try{previous();}catch(_){}if(window.YT&&YT.Player)finish();else finish(Error('Trailer SDK unsupported'));};
      script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=function(){finish(Error('Trailer SDK failed'));};document.head.appendChild(script);
    });
    // Failed SDK loads stay failed this session, avoiding repeated network attempts.
    return youtubePromise;
  }
  function createPlayer(source,container,hooks){
    var disposed=false,player=null,video=null;
    function stop(){if(disposed)return;disposed=true;if(video){try{video.pause();video.removeAttribute('src');video.load();}catch(_){}video.remove();}if(player)try{player.destroy();}catch(_){}container.replaceChildren();}
    if(source.kind==='video'){
      video=document.createElement('video');video.dataset.safafiPreview='true';video.muted=true;video.defaultMuted=true;video.volume=0;video.setAttribute('muted','');video.setAttribute('playsinline','');video.playsInline=true;video.preload='none';video.tabIndex=-1;video.setAttribute('aria-hidden','true');
      video.addEventListener('error',hooks.failed);video.addEventListener('ended',hooks.failed);video.addEventListener('volumechange',function(){if(!video.muted){video.muted=true;video.volume=0;}});
      video.addEventListener('playing',function(){if(!disposed)hooks.playing();});
      if(!video.canPlayType(source.mimeType)){hooks.failed();return {destroy:stop};}
      container.appendChild(video);video.src=source.url;
      try{var result=video.play();if(result&&result.catch)result.catch(function(){if(!disposed)hooks.failed();});}catch(_){hooks.failed();}
    }else{
      var mount=document.createElement('div');container.appendChild(mount);
      youtube().then(function(api){if(disposed||!hooks.valid())return;var vars={autoplay:0,mute:1,controls:0,disablekb:1,playsinline:1,rel:0};if(/^https?:$/.test(location.protocol))vars.origin=location.origin;
        player=new api.Player(mount,{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',videoId:source.key,playerVars:vars,events:{
          onReady:function(e){if(disposed||!hooks.valid()){stop();return;}try{var frame=e.target.getIframe();frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.title='معاينة صامتة';e.target.mute();e.target.setVolume(0);e.target.playVideo();}catch(_){hooks.failed();}},
          onStateChange:function(e){if(disposed)return;if(!hooks.valid()){stop();return;}if(e.data===1){try{e.target.mute();if(e.target.isMuted())hooks.playing();else hooks.failed();}catch(_){hooks.failed();}}else if(e.data===0)hooks.failed();},
          onError:function(){if(!disposed)hooks.failed();},onAutoplayBlocked:function(){if(!disposed)hooks.failed();}
        }});
      }).catch(function(){if(!disposed)hooks.failed();});
    }
    return {destroy:stop};
  }
  window.SafafiExperienceMedia={colors:colors,createPlayer:createPlayer};
}());
