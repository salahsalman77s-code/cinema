(function(){
  'use strict';
  if(!window.SafafiPlayerSource)return;
  // Web (phones/computers): the 10-foot controls are scaled to the window, subtitles follow the video size.
  if(!(window.SafafiPlatform&&SafafiPlatform.tv)){
    var fitControls=function(){var w=innerWidth,h=innerHeight,base=Math.min(w/1920,h/1080),ui=Math.max(.5,Math.min(1,base*1.35)),sub=Math.max(.4,Math.min(1,base)),st=document.documentElement.style;st.setProperty('--sf-ui-zoom',ui.toFixed(3));st.setProperty('--sf-sub-scale',sub.toFixed(3));st.setProperty('--sf-panel-zoom',Math.max(.72,Math.min(1,base*1.9)).toFixed(3));};
    fitControls();window.addEventListener('resize',fitControls);
  }
  var state=null,remain=null,root=null,host=null,timeline=null,time=null,title=null,quality=null,fullscreen=null,play=null,extras=null,rows=[],memory=[0,0],listeners=[],lastPointer=-Infinity,unsubscribe;
  var ICONS={play:'<path class="sc-i-play" d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/><path class="sc-i-pause" d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z" fill="currentColor" stroke="none"/>',
    rewind:'<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/><text x="12" y="15.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="Arial,sans-serif">10</text>',
    forward:'<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/><text x="12" y="15.6" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none" font-family="Arial,sans-serif">10</text>',
    back:'<path d="M15 5l-7 7 7 7"/>',
    fullscreen:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    episodes:'<path d="M3 6h12M3 12h12M3 18h8M18 9l3 3-3 3"/>',
    subtitles:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 13h4M13 13h4M7 16h7"/>',
    audio:'<path d="M4 9.5v5h4l5 4v-13l-5 4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    quality:'<path d="M5 7h14M5 12h14M5 17h14"/><circle cx="9" cy="7" r="1.8" fill="currentColor"/><circle cx="15" cy="12" r="1.8" fill="currentColor"/><circle cx="8" cy="17" r="1.8" fill="currentColor"/>',
    server:'<rect x="4" y="4" width="16" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="16" height="6.5" rx="1.6"/><path d="M8 7.2h.01M8 16.7h.01"/>',
    more:'<circle cx="5.5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor"/>'};
  function svg(name){return '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(ICONS[name]||'')+'</svg>';}
  function listen(el,name,fn,options){el.addEventListener(name,fn,options);listeners.push([el,name,fn,options]);}
  function invoke(name,arg){if(state&&typeof state[name]==='function')return state[name](arg);}
  function setText(el,value){if(el&&el.textContent!==value)el.textContent=value;}
  function t(value){return window.SafafiText?window.SafafiText(value):value;}
  function stage(){var local=window.SafafiStage;return local&&local.forPlayer();}
  function isFullscreen(){var target=stage();return !!(target&&target.api&&target.api.isActive(target.frame)||state&&(state.isFullscreen||state.isPseudoFullscreen));}
  function wake(){if(window.SafafiRemote)SafafiRemote.wake();invoke('handleUserActivity');}
  function open(panel){
    if(!state)return;wake();
    invoke('setShowServerMenu',false);invoke('setShowSubtitlesMenu',false);invoke('setShowQualityMenu',false);invoke('setShowSettings',false);
    if(panel==='server')invoke('setShowServerMenu',true);
    else if(panel==='subtitles')invoke('setShowSubtitlesMenu',true);
    else{invoke('setSettingsTab',panel);invoke('setShowSettings',true);}
  }
  function closeExtras(restore){
    if(!extras)return;
    var old=extras;
    listeners=listeners.filter(function(l){if(old.contains(l[0])){l[0].removeEventListener(l[1],l[2],l[3]);return false;}return true;});
    old.remove();extras=null;if(state)render(state);wake();
    if(restore!==false&&root)focus(root.querySelector('[data-player-action="more"]'),true);
  }
  function openExtras(){
    if(!state||!host)return;closeExtras(false);wake();
    extras=document.createElement('section');extras.className='sc-player-extras';extras.setAttribute('role','dialog');extras.setAttribute('aria-label','أدوات المشاهدة');extras.setAttribute('aria-modal','true');extras.dir='rtl';
    var heading=document.createElement('h2');heading.textContent='أدوات المشاهدة';extras.appendChild(heading);
    var close=button('close-tools','إغلاق',function(){closeExtras();});close.setAttribute('aria-label','Close player tools');extras.appendChild(close);
    extras.appendChild(button('advanced','إعدادات التشغيل والترجمة',function(){closeExtras(false);open('main');}));
    if(state.activeError)extras.appendChild(button('retry','إعادة محاولة التشغيل',function(){invoke('triggerFailoverRecovery','user_retry');}));
    extras.appendChild(button('mute',state.isMuted?'إعادة الصوت':'كتم الصوت',function(){invoke('toggleMute');}));
    var label=document.createElement('label');label.className='sc-player-volume-label';label.textContent='مستوى الصوت';
    var volume=document.createElement('input');volume.type='range';volume.min='0';volume.max='1';volume.step='0.05';volume.value=String(state.volume||0);volume.setAttribute('aria-label','مستوى الصوت');label.appendChild(volume);extras.appendChild(label);listen(volume,'input',function(){invoke('handleVolumeChange',Number(volume.value));});
    var video=state.videoRef&&state.videoRef.current;
    if(video&&typeof video.requestPictureInPicture==='function')extras.appendChild(button('pip','صورة داخل صورة',function(){var result=invoke('togglePiP');if(result&&result.catch)result.catch(function(){notice('وضع صورة داخل صورة غير متاح حاليًا.');});}));
    if(state.isCastAvailable)extras.appendChild(button('cast',state.isCasting?'إيقاف البث':'البث إلى جهاز',function(){invoke('handleChromecastTrigger');}));
    if(state.isAirPlayAvailable)extras.appendChild(button('airplay','AirPlay',function(){invoke('triggerAirPlay');}));
    var status=document.createElement('p');status.className='sc-player-extra-status';status.setAttribute('role','status');extras.appendChild(status);
    host.appendChild(extras);render(state);focus(extras.querySelector('[data-player-action="advanced"]'),true);
  }
  function notice(text){if(extras)setText(extras.querySelector('[role="status"]'),text);}
  function toggleFullscreen(){
    var target=stage();
    if(!window.SafafiPlatform.tv){
      var d=window.top.document,el=d.documentElement;
      // iPhone: pages cannot go full screen, only the <video> itself (native iOS player, subtitles included).
      if(!(el.requestFullscreen||el.webkitRequestFullscreen)){var legacy=invoke('toggleFullscreen');if(legacy&&legacy.catch)legacy.catch(function(){});return;}
      try{if(d.fullscreenElement||d.webkitFullscreenElement){(d.exitFullscreen||d.webkitExitFullscreen).call(d);}
        else{var req=el.requestFullscreen||el.webkitRequestFullscreen,r=req&&req.call(el,{navigationUI:'hide'});var lock=function(){try{var o=window.top.screen.orientation;if(o&&o.lock&&matchMedia('(pointer:coarse)').matches)o.lock('landscape').catch(function(){});}catch(_){}};if(r&&r.then)r.then(lock).catch(function(){});else lock();}}catch(_){}
      render(state);return;
    }
    if(state&&(state.isFullscreen||state.isPseudoFullscreen)){
      var existing=invoke('toggleFullscreen');if(existing&&existing.catch)existing.catch(function(){});
      if(target&&target.api&&target.api.isActive(target.frame))target.api.exit();return;
    }
    if(target&&target.api){target.api.toggle(target.frame);render(state);return;}
    var result=invoke('toggleFullscreen');if(result&&result.catch)result.catch(function(){});
  }
  function leave(){
    var target=stage();if(!target||!target.api)return;
    if(typeof target.api.leavePlayer==='function'){target.api.leavePlayer();return;}
    target.api.exit(false);
    try{var remote=window.parent.SafafiRemote;if(remote)remote.leavePlayer();}catch(_){}
  }
  var lastTap=0,tapTimer=0;
  function seekFlash(dir){if(!host)return;var el=document.createElement('div');el.className='sc-seek-flash '+(dir<0?'is-back':'is-forward');el.setAttribute('aria-hidden','true');el.innerHTML='<span>'+(dir<0?'«':'»')+'</span><b>10</b>';host.appendChild(el);setTimeout(function(){el.remove();},650);}
  function button(id,label,action,icon){
    label=t(label);
    var el=document.createElement('button');el.type='button';el.className='sc-player-action';el.dataset.playerAction=id;el.setAttribute('aria-label',label);el.dir='auto';
    var glyph=document.createElement('span');glyph.className='sc-player-glyph';glyph.setAttribute('aria-hidden','true');glyph.innerHTML=svg(ICONS[icon]?icon:id);if(ICONS[icon]||ICONS[id])el.appendChild(glyph);if(icon)el.classList.add('sc-player-icon-only');
    var text=document.createElement('span');text.className='sc-player-label';text.textContent=label;el.appendChild(text);
    listen(el,'click',function(e){e.stopPropagation();wake();action();});return el;
  }
  function mount(s){
    host=s.containerRef&&s.containerRef.current;
    if(!host||!host.isConnected)return false;
    root=document.createElement('section');root.id='safafi-player-controls';root.dataset.safafiPlayerToolbar='';root.setAttribute('role','toolbar');root.setAttribute('aria-label','Playback controls');root.dir='ltr';
    var top=document.createElement('div');top.className='sc-player-top';if(!window.SafafiPlatform.tv){var backBtn=button('back','رجوع',function(){try{var d=window.top.document;if(d.fullscreenElement)d.exitFullscreen();}catch(_){}try{var w=window.top;if(w.history.length>1)w.history.back();else w.location.hash='#/';}catch(_){history.back();}},'back');backBtn.classList.add('sc-player-back');top.appendChild(backBtn);}var brand=document.createElement('span');brand.className='sc-player-brand';brand.setAttribute('aria-hidden','true');top.appendChild(brand);title=document.createElement('div');title.className='sc-player-title';title.dir='auto';top.appendChild(title);root.appendChild(top);var bottom=document.createElement('div');bottom.className='sc-player-bottom';
    var timelineRow=document.createElement('div');timelineRow.className='sc-player-timeline-row';
    timeline=document.createElement('input');timeline.type='range';timeline.className='sc-player-timeline';timeline.min='0';timeline.max='0';timeline.step='10';timeline.value='0';timeline.setAttribute('aria-label','Video timeline scrubber');
    listen(timeline,'input',function(){invoke('handleSeek',Number(timeline.value));wake();});timelineRow.appendChild(timeline);remain=document.createElement('span');remain.className='sc-player-remaining';remain.setAttribute('aria-hidden','true');timelineRow.appendChild(remain);bottom.appendChild(timelineRow);
    var playback=document.createElement('div');playback.className='sc-player-playback-row';
    play=button('play','تشغيل',function(){invoke('togglePlay');},'play');
    var rewind=button('rewind','رجوع 10 ثوانٍ',function(){invoke('seekBySeconds',-10);},'rewind');
    var forward=button('forward','تقديم 10 ثوانٍ',function(){invoke('seekBySeconds',10);},'forward');
    time=document.createElement('span');time.className='sc-player-time';time.setAttribute('aria-hidden','true');
    fullscreen=button('fullscreen','ملء الشاشة',toggleFullscreen);
    var episodes=button('episodes','الحلقات والتفاصيل',leave);episodes.hidden=!stage();
    [play,rewind,forward,time,fullscreen,episodes].forEach(function(el){playback.appendChild(el);});bottom.appendChild(playback);
    var tools=document.createElement('div');tools.className='sc-player-tools-row';
    var subtitles=button('subtitles','الترجمة',function(){open('subtitles');});
    var audio=button('audio','الصوت',function(){open('audio');});
    quality=button('quality','الجودة',function(){open('quality');});
    var server=button('server','السيرفرات',function(){open('server');});
    var more=button('more','أدوات المشاهدة',openExtras);
    [subtitles,audio,quality,server,more].forEach(function(el){el.setAttribute('aria-haspopup','dialog');tools.appendChild(el);});bottom.appendChild(tools);root.appendChild(bottom);
    rows=[[play,rewind,forward,fullscreen,episodes],[subtitles,audio,quality,server,more]];
    host.appendChild(root);host.classList.add('safafi-player-host');host.setAttribute('data-safafi-player-host','');
    listen(host,'pointermove',function(){if(Date.now()-lastPointer<250)return;lastPointer=Date.now();wake();});
    listen(root,'focusin',wake);
    // Touch screens: a tap on the picture shows or hides the controls instead of pausing.
    if(!window.SafafiPlatform.tv&&window.matchMedia&&matchMedia('(pointer:coarse)').matches)listen(host,'click',function(e){
      if(e.target.closest&&e.target.closest('#safafi-player-controls>*,.sf-media-panel,.sc-player-extras,[role="dialog"],[role="menu"]'))return;
      e.stopPropagation();e.preventDefault();var d=document.documentElement,now=Date.now(),x=e.clientX,w=innerWidth;
      // Double tap on the left/right side seeks 10 s (timeline is left-to-right in every language).
      if(now-lastTap<300){clearTimeout(tapTimer);lastTap=0;var dir=x<w*.42?-1:x>w*.58?1:0;if(dir){invoke('seekBySeconds',dir*10);return;}}
      lastTap=now;clearTimeout(tapTimer);
      tapTimer=setTimeout(function(){if(d.classList.contains('safafi-controls-active')&&!d.classList.contains('safafi-controls-hidden')){d.classList.remove('safafi-controls-active');d.classList.add('safafi-controls-hidden');}else wake();},260);
    },true);
    var target=stage();if(target&&target.api)target.api.enter(target.frame);
    wake();return true;
  }
  function render(s){
    state=s;if(!s||s.hideControls){unmount();return;}
    if(root&&(!root.isConnected||host!==s.containerRef.current))unmount();
    if(!root&&!mount(s))return;
    setText(title,s.mediaTitle||'Safafi Cinema');
    setText(play.querySelector('.sc-player-label'),t(s.isPlaying?'إيقاف مؤقت':'تشغيل'));if(play.dataset.playing!==String(!!s.isPlaying))play.dataset.playing=String(!!s.isPlaying);play.setAttribute('aria-label',t(s.isPlaying?'إيقاف مؤقت':'تشغيل'));
    var duration=Number.isFinite(s.duration)&&s.duration>0?s.duration:0,current=Number.isFinite(s.currentTime)?Math.max(0,s.currentTime):0;
    if(timeline.disabled!==!duration)timeline.disabled=!duration;
    if(timeline.max!==String(duration))timeline.max=String(duration);
    var nextTime=String(Math.min(current,duration));if(timeline.value!==nextTime)timeline.value=nextTime;
    var progress=duration?String(Math.round(1000*Math.min(current,duration)/duration)/10)+'%':'0%';if(timeline.style.getPropertyValue('--sc-progress')!==progress)timeline.style.setProperty('--sc-progress',progress);
    var format=typeof s.formatTime==='function'?s.formatTime:function(n){return Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');};
    var elapsed=format(current),total=duration?format(duration):'--:--';setText(time,elapsed+' / '+total);setText(remain,duration?'-'+format(Math.max(0,duration-current)):'');timeline.setAttribute('aria-valuetext',elapsed+' / '+total);
    var q=s.selectedQuality&&s.selectedQuality!=='Auto'?String(s.selectedQuality):t('تلقائي');
    setText(quality.querySelector('.sc-player-label'),t('الجودة')+' · '+q);
    quality.setAttribute('aria-label',t('الجودة')+'، '+q);
    setText(fullscreen.querySelector('.sc-player-label'),t(isFullscreen()?'تصغير الشاشة':'ملء الشاشة'));fullscreen.setAttribute('aria-label',t(isFullscreen()?'تصغير الشاشة':'ملء الشاشة'));
    var panelOpen=String(!!(extras||s.showSettings||s.showSubtitlesMenu||s.showServerMenu));if(root.dataset.panelOpen!==panelOpen)root.dataset.panelOpen=panelOpen;
    if(extras){var volume=extras.querySelector('input[type="range"]');volume.value=String(s.volume||0);setText(extras.querySelector('[data-player-action="mute"] .sc-player-label'),s.isMuted?'إعادة الصوت':'كتم الصوت');extras.querySelector('[data-player-action="mute"]').setAttribute('aria-label',s.isMuted?'إعادة الصوت':'كتم الصوت');}
    root.querySelectorAll('[aria-haspopup]').forEach(function(b){var key=b.dataset.playerAction;var expanded=key==='server'?s.showServerMenu:key==='subtitles'?s.showSubtitlesMenu:key==='audio'?s.showSettings&&s.settingsTab==='audio':key==='quality'?s.showSettings&&s.settingsTab==='quality':extras||s.showSettings&&s.settingsTab==='main';if(b.getAttribute('aria-expanded')!==String(!!expanded))b.setAttribute('aria-expanded',String(!!expanded));});
    if(!s.isPlaying&&document.documentElement.classList.contains('safafi-controls-hidden'))wake();
  }
  function focus(el,repeat){return window.SafafiRemote&&SafafiRemote.focus(el,repeat);}
  function navigate(active,code,repeat){
    if(!root||!root.contains(active))return false;
    var visibleRows=rows.map(function(row){return row.filter(function(el){return !el.hidden&&!el.disabled;});});
    if(active===timeline){if(code===40){focus(visibleRows[0][Math.min(memory[0],visibleRows[0].length-1)],repeat);return true;}return code===38;}
    var row=visibleRows.findIndex(function(list){return list.indexOf(active)>=0;});if(row<0)return false;
    var column=visibleRows[row].indexOf(active);memory[row]=column;
    if(code===37||code===39){var next=visibleRows[row][Math.max(0,Math.min(visibleRows[row].length-1,column+(code===39?1:-1)))];memory[row]=visibleRows[row].indexOf(next);focus(next,repeat);return true;}
    if(code===38){focus(row===0?timeline:visibleRows[0][Math.min(memory[0],visibleRows[0].length-1)],repeat);return true;}
    if(code===40){if(row===0)focus(visibleRows[1][Math.min(memory[1],visibleRows[1].length-1)],repeat);return true;}
    return false;
  }
  function handleMedia(code){
    if(!state||!root)return false;
    if(code===415){if(!state.isPlaying)invoke('togglePlay');}
    else if(code===19){if(state.isPlaying)invoke('togglePlay');}
    else if(code===10252)invoke('togglePlay');
    else if(code===417||code===412)invoke('seekBySeconds',code===417?10:-10);
    else return false;wake();return true;
  }
  function unmount(){
    listeners.forEach(function(l){l[0].removeEventListener(l[1],l[2],l[3]);});listeners=[];
    if(extras)extras.remove();extras=null;if(root)root.remove();if(host){host.classList.remove('safafi-player-host');host.removeAttribute('data-safafi-player-host');}root=host=timeline=null;rows=[];
  }
  function dispose(){unsubscribe();unmount();window.removeEventListener('safafi:stage',stageUpdate);window.removeEventListener('pagehide',dispose);}
  function stageUpdate(){if(state)render(state);}
  function receive(s){try{render(s);}catch(error){unmount();console.error('Safafi controls fallback:',error);}}
  window.SafafiPlayerControls={navigate:navigate,handleMedia:handleMedia,wake:wake,seek:function(delta){invoke('seekBySeconds',delta);wake();},owns:function(el){return !!root&&root.contains(el);},destroy:dispose};
  window.addEventListener('safafi:stage',stageUpdate);window.addEventListener('pagehide',dispose);
  unsubscribe=SafafiPlayerSource.subscribe(receive);
}());
