(function(){
  'use strict';
  var state=null,panel=null,host=null,signature='',unsubscribe=null;
  function t(ar,en){return window.SafafiPreferences?.getSnapshot().language==='en'?en:ar;}
  function call(name){if(state&&typeof state[name]==='function')return state[name].apply(null,Array.prototype.slice.call(arguments,1));}
  function kind(s){return s.showSubtitlesMenu?'subtitles':s.showServerMenu?'server':s.showSettings&&s.settingsTab==='subtitle_style'?'style':s.showSettings&&['quality','audio'].includes(s.settingsTab)?s.settingsTab:s.showSettings&&s.settingsTab==='main'?'main':s.showSettings&&/^sf_(speed|aspect|boost)$/.test(s.settingsTab||'')?s.settingsTab.slice(3):null;}
  function remove(){if(panel)panel.remove();if(host){host.classList.remove('sf-panel-owned');host.removeAttribute('data-sf-panel-owned');}panel=host=null;signature='';}
  function close(){call('setShowSubtitlesMenu',false);call('setShowServerMenu',false);call('setShowSettings',false);remove();}
  function button(label,fn,selected,disabled){var el=document.createElement('button');el.type='button';el.textContent=label;el.setAttribute('role','menuitemradio');el.setAttribute('aria-checked',String(!!selected));el.disabled=!!disabled;el.addEventListener('click',fn);return el;}
  function receive(next){
    state=next;var type=next&&kind(next),container=next?.containerRef?.current;
    if(!type||!container||!container.isConnected){remove();return;}
    var key=JSON.stringify([t('ar','en'),type,next.settingsTab,next.subtitles,next.hlsSubtitles,next.uploadedSubs,next.activeSubtitleIdx,next.activeHlsSubIdx,next.activeUploadedIdx,next.hlsLevels,next.selectedLevelIdx,next.formattedSources,next.selectedQuality,next.currentSourceIndex,next.currentSource?.server,next.audioTrackOptions,next.activeAudioTrack,next.effectiveProviders,next.activeProvider,next.pendingProvider,next.providerStatus,next.subFontSize,next.subPosition,next.subBgOpacity,next.subTextColor,next.subSyncOffset,next.playbackRate,next.audioBoost,next.aspectRatio]);
    if(panel&&host===container&&signature===key)return;
    var oldActive=panel&&panel.contains(document.activeElement)?document.activeElement.dataset.selectionId:null,oldScroll=panel?.querySelector('.sf-media-options')?.scrollTop||0;
    remove();host=container;signature=key;panel=document.createElement('section');panel.className='sf-media-panel';panel.setAttribute('role','menu');panel.setAttribute('aria-label',t({subtitles:'الترجمة',quality:'الجودة',audio:'مسار الصوت',server:'السيرفرات',style:'مظهر الترجمة',main:'إعدادات التشغيل',speed:'سرعة التشغيل',aspect:'نسبة العرض',boost:'تعزيز الصوت'}[type],{subtitles:'Subtitles',quality:'Quality',audio:'Audio tracks',server:'Servers',style:'Subtitle appearance',main:'Playback settings',speed:'Playback speed',aspect:'Aspect ratio',boost:'Audio boost'}[type]));panel.dir=document.documentElement.dir||'rtl';
    var heading=document.createElement('h2');heading.textContent=panel.getAttribute('aria-label');panel.appendChild(heading);
    var back=document.createElement('button');back.type='button';back.textContent=t('رجوع','Back');back.setAttribute('aria-label','Close media selection');
    back.dataset.selectionId='back';back.addEventListener('click',function(){if(/^(speed|aspect|boost)$/.test(type))call('setSettingsTab','main');else close();});panel.appendChild(back);
    var list=document.createElement('div');list.className='sf-media-options';list.dataset.focusGroup='media-options';list.dataset.focusLayout='column';panel.appendChild(list);
    var occurrences=Object.create(null);
    function choose(label,fn,selected,disabled,id){var el=button(label,fn,selected,disabled),key=id||String(label);occurrences[key]=(occurrences[key]||0)+1;el.dataset.selectionId=type+':'+key+':'+occurrences[key];list.appendChild(el);return el;}
    function note(label){var el=document.createElement('p');el.className='sf-media-note';el.textContent=label;list.appendChild(el);}
    if(type==='style'){
      // Subtitle appearance: one row per setting (left/right to choose), with a live preview.
      panel.classList.add('sf-style-panel');var backRow=document.createElement('div');backRow.className='sf-style-back';backRow.setAttribute('data-focus-row','');panel.insertBefore(backRow,back);backRow.appendChild(back);
      var sizes={sm:32,md:42,lg:50,xl:58,'3xl':68},colors={white:'#fff',yellow:'#facc15',cyan:'#22d3ee'},bgs={dark:'rgba(0,0,0,.85)',semi:'rgba(0,0,0,.45)',none:'transparent',solid:'#000'};
      var preview=document.createElement('div');preview.className='sf-style-preview';preview.setAttribute('aria-hidden','true');var sample=document.createElement('span');sample.textContent=t('هكذا ستظهر الترجمة','This is how subtitles look');
      sample.style.fontSize=Math.round((sizes[next.subFontSize]||42)*.72)+'px';sample.style.color=colors[next.subTextColor]||'#fff';sample.style.background=bgs[next.subBgOpacity]||bgs.dark;if(next.subBgOpacity==='none')sample.style.textShadow='0 0 6px #000,0 2px 3px #000';
      preview.dataset.pos=next.subPosition||'bottom';preview.appendChild(sample);panel.insertBefore(preview,list);
      function row(title,setter,current,options,sub){var r=document.createElement('div');r.className='sf-style-row';r.setAttribute('data-focus-row','');var h=document.createElement('h3');h.textContent=title;r.appendChild(h);if(sub){var n=document.createElement('span');n.className='sf-style-value';n.textContent=sub;h.appendChild(n);}
        var c=document.createElement('div');c.className='sf-style-choices';r.appendChild(c);
        options.forEach(function(o){var el=button(o[1],function(){call(setter,o[0]);},o[2]!==undefined?o[2]:current===o[0]);el.dataset.selectionId='style:'+setter+':'+o[0];c.appendChild(el);});list.appendChild(r);}
      row(t('الحجم','Size'),'updateSubFontSize',next.subFontSize||'md',[['sm',t('صغير','Small')],['md',t('متوسط','Medium')],['lg',t('كبير','Large')],['xl',t('أكبر','Larger')],['3xl',t('ضخم','Huge')]]);
      row(t('الموضع','Position'),'updateSubPosition',next.subPosition||'bottom',[['bottom',t('أسفل','Bottom')],['mid',t('أعلى قليلًا','Raised')],['top',t('أعلى الشاشة','Top')]]);
      row(t('الخلفية','Background'),'updateSubBgOpacity',next.subBgOpacity||'dark',[['dark',t('داكنة','Dark')],['semi',t('شفافة','Translucent')],['none',t('بدون','None')],['solid',t('سوداء','Solid')]]);
      row(t('اللون','Colour'),'updateSubTextColor',next.subTextColor||'white',[['white',t('أبيض','White')],['yellow',t('أصفر','Yellow')],['cyan',t('سماوي','Cyan')]]);
      var off=Math.round((Number(next.subSyncOffset)||0)*10)/10,fmt=function(v){return (v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(1)+t(' ث','s');},clamp=function(v){return Math.max(-30,Math.min(30,Math.round(v*10)/10));};
      row(t('التزامن','Timing'),'setSubSyncOffset',null,[[clamp(off-.5),'−0.5',false],[clamp(off-.1),'−0.1',false],[0,t('بدون تعديل','Reset'),off===0],[clamp(off+.1),'+0.1',false],[clamp(off+.5),'+0.5',false]],t('الحالي: ','Current: ')+fmt(off));
      Array.from(list.querySelectorAll('.sf-style-row:last-child button')).forEach(function(b,i){b.dataset.selectionId='style:sync:'+i;});
    }else if(type==='main'){
      panel.classList.add('sf-main-panel');
      function item(label,value,fn,id){var el=choose(label,fn,false,false,id);el.setAttribute('role','menuitem');el.removeAttribute('aria-checked');el.textContent='';var a=document.createElement('span'),b=document.createElement('small');a.textContent=label;b.textContent=value||'';el.append(a,b);return el;}
      var lv=next.hlsLevels?.length?(next.selectedLevelIdx===-1?t('تلقائي','Auto'):((next.hlsLevels.find(function(l){return l.id===next.selectedLevelIdx;})||{}).height||'')+'p'):(next.selectedQuality==='Auto'?t('تلقائي','Auto'):next.selectedQuality||'');
      item(t('الجودة','Quality'),lv,function(){call('setSettingsTab','quality');},'quality');
      var subName=(function(){var s=next.activeHlsSubIdx!=null?next.hlsSubtitles?.[next.activeHlsSubIdx]:next.activeUploadedIdx!=null?next.uploadedSubs?.[next.activeUploadedIdx]:next.activeSubtitleIdx!=null?next.subtitles?.[next.activeSubtitleIdx]:null;if(!s)return t('متوقفة','Off');var c=window.SafafiSubs?SafafiSubs.code(s):'';return c?SafafiSubs.name(c):(s.label||s.name||s.language||'');})();
      item(t('الترجمة','Subtitles'),subName,function(){call('setShowSettings',false);call('setShowSubtitlesMenu',true);},'subs');
      item(t('مظهر الترجمة وتزامنها','Subtitle appearance'),'',function(){call('setSettingsTab','subtitle_style');},'style');
      if(next.audioTrackOptions?.length>1||(window.SafafiNativePlayback&&SafafiNativePlayback.active()&&SafafiNativePlayback.audioTracks().length>1))item(t('مسار الصوت','Audio track'),'',function(){call('setSettingsTab','audio');},'audio');
      var rate=Number(next.playbackRate)||1;item(t('سرعة التشغيل','Playback speed'),rate===1?t('عادية','Normal'):rate+'×',function(){call('setSettingsTab','sf_speed');},'speed');
      item(t('نسبة العرض','Aspect ratio'),next.aspectRatio&&next.aspectRatio!=='auto'?next.aspectRatio:t('الأصلية','Original'),function(){call('setSettingsTab','sf_aspect');},'aspect');
      var boostNames={off:t('عادي','Normal'),dialogue:t('وضوح الحوار','Dialogue')};item(t('تعزيز الصوت','Audio boost'),boostNames[next.audioBoost||'off']||next.audioBoost+'%',function(){call('setSettingsTab','sf_boost');},'boost');
      var on=(function(){try{return localStorage.getItem('framextv_autoplay_next')!=='false';}catch(_){return true;}})(),ap=item(t('تشغيل الحلقة التالية تلقائيًا','Autoplay next episode'),on?t('مفعّل','On'):t('متوقف','Off'),function(){var legacy=container.querySelector('[data-testid="player-autoplay-toggle"]');if(legacy)legacy.click();else{try{localStorage.setItem('framextv_autoplay_next',String(!on));}catch(_){}}on=!on;ap.querySelector('small').textContent=on?t('مفعّل','On'):t('متوقف','Off');ap.setAttribute('aria-checked',String(on));},'autoplay');ap.setAttribute('role','menuitemcheckbox');ap.setAttribute('aria-checked',String(on));
    }else if(type==='speed'){
      [.5,.75,1,1.25,1.5,2].forEach(function(r){choose(r===1?t('عادية','Normal'):r+'×',function(){call('handlePlaybackRate',r);close();},(Number(next.playbackRate)||1)===r,false,'r'+r);});
    }else if(type==='aspect'){
      [['auto',t('الأصلية','Original')],['16:9','16:9'],['4:3','4:3'],['21:9','21:9'],['1:1','1:1']].forEach(function(o){choose(o[1],function(){call('handleSelectAspectRatio',o[0]);close();},(next.aspectRatio||'auto')===o[0],false,o[0]);});
    }else if(type==='boost'){
      [['off',t('عادي (100%)','Normal (100%)')],['150','150%'],['200','200%'],['300','300%'],['dialogue',t('وضوح الحوار','Dialogue clarity')]].forEach(function(o){choose(o[1],function(){call('handleSelectAudioBoost',o[0]);close();},(next.audioBoost||'off')===o[0],false,o[0]);});
    }else if(type==='subtitles'){
      choose(t('بدون ترجمة','Subtitles off'),function(){call('selectSubtitle',null);call('setShowSubtitlesMenu',false);},next.activeSubtitleIdx===null&&next.activeHlsSubIdx===null&&next.activeUploadedIdx===null);
      [[next.subtitles,false,false,'external'],[next.hlsSubtitles,true,false,'stream'],[next.uploadedSubs,false,true,'uploaded']].forEach(function(set){var named=set[2]||!window.SafafiSubs?(set[0]||[]).map(function(sub,index){return {sub:sub,index:index,label:sub.label||sub.name||sub.language||sub.lang||t('ترجمة ','Subtitle ')+(index+1)};}):SafafiSubs.order(set[0],(function(){try{return JSON.parse(localStorage.getItem('framextv_subtitle_preferences')||'{}').preferredLanguage;}catch(_){return null;}})());named.forEach(function(item){var sub=item.sub,index=item.index;choose(item.label,function(){call('selectSubtitle',index,set[1],set[2]);call('setShowSubtitlesMenu',false);},set[2]?next.activeUploadedIdx===index:set[1]?next.activeHlsSubIdx===index:next.activeSubtitleIdx===index);});});
      choose(t('مظهر الترجمة وتزامنها','Subtitle appearance and timing'),function(){call('setShowSubtitlesMenu',false);call('setSettingsTab','subtitle_style');call('setShowSettings',true);},false);
      if(next.subFileRef?.current)choose(t('تحميل ملف ترجمة من الجهاز','Upload a subtitle file'),function(){next.subFileRef.current.click();},false);
      if(!(next.subtitles?.length||next.hlsSubtitles?.length||next.uploadedSubs?.length))note(t('المصدر لم يوفّر ترجمات.','This source has not provided subtitle tracks.'));
    }else if(type==='quality'){
      choose(t('تلقائي','Auto'),function(){call('handleSelectQuality','Auto',state.currentSourceIndex,-1);close();},next.hlsLevels?.length?next.selectedLevelIdx===-1:next.selectedQuality==='Auto');
      if(next.hlsLevels?.length)next.hlsLevels.forEach(function(level){choose(level.name||(level.height?level.height+'p':t('المستوى ','Level ')+level.id),function(){call('handleSelectQuality',level.name||level.height+'p',state.currentSourceIndex,level.id);close();},next.selectedLevelIdx===level.id);});
      else (next.formattedSources||[]).forEach(function(source){choose(source.label,function(){call('handleSelectQuality',source.label,source.index);close();},next.currentSourceIndex===source.index&&next.selectedQuality!=='Auto');});
      if((next.hlsLevels?.length||next.formattedSources?.length||0)<=1)note(t('لا توجد مستويات جودة متعددة معلنة لهذا المصدر.','This source does not advertise multiple quality levels.'));
    }else if(type==='audio'){
      var nativeTracks=window.SafafiNativePlayback&&SafafiNativePlayback.active()?SafafiNativePlayback.audioTracks():[];
      nativeTracks.forEach(function(track,n){var info={};try{info=JSON.parse(track.extra_info||'{}');}catch(_){}var lang=info.language||info.lang||'',code=window.SafafiSubs?SafafiSubs.code({language:lang}):'',ch=Number(info.channels)||0,name=code?SafafiSubs.name(code):lang?lang.toUpperCase():t('مسار ','Track ')+(n+1),layout=ch>=6?(ch===8?' · 7.1':' · 5.1'):ch===2?t(' · ستيريو',' · Stereo'):ch===1?t(' · أحادي',' · Mono'):'';choose(name+layout,function(){window.__sfNativeAudio=track.index;SafafiNativePlayback.selectAudio(track.index);try{if(code)localStorage.setItem('safafi.audioLang',code);}catch(_){}close();},window.__sfNativeAudio===track.index);});
      if(!nativeTracks.length)(next.audioTrackOptions||[]).forEach(function(track){choose(track.label||track.language||String(track.index),function(){call('handleSelectAudioTrack',track.index);close();},next.activeAudioTrack===track.index);});
      if(!nativeTracks.length&&!next.audioTrackOptions?.length)note(t('المصدر لا يوفّر مسارات صوت قابلة للتبديل.','This source does not expose switchable audio tracks.'));
    }else{
      (next.effectiveProviders||[]).forEach(function(provider){var selected=next.activeProvider===provider.id||next.currentSource?.server===provider.id,status=next.providerStatus?.[provider.id],quality=selected&&next.currentSource?.server===provider.id&&!next.pendingProvider&&next.hlsLevels?.length?Array.from(new Set(next.hlsLevels.map(function(level){return level.height?level.height+'p':level.name;}).filter(Boolean))).join(' / '):provider.quality?t('سقف معلن: ','Declared limit: ')+provider.quality:t('الجودات تُحدد بعد التشغيل','Quality is determined after playback'),el=choose((provider.name||provider.id)+' · '+quality,function(){call('setShowServerMenu',false);call('switchProvider',provider.id);},selected,status==='unavailable',provider.id);el.textContent='';var name=document.createElement('span'),meta=document.createElement('small');name.textContent=provider.name||provider.id;meta.textContent=' · '+quality;el.append(name,meta);});
    }
    host.appendChild(panel);host.classList.add('sf-panel-owned');host.setAttribute('data-sf-panel-owned','');
    var buttons=Array.from(panel.querySelectorAll('button')),selected=list.querySelector('[aria-checked="true"]:not(:disabled)')||list.querySelector('button:not(:disabled)')||back,target=buttons.find(function(el){return el.dataset.selectionId===oldActive&&!el.disabled;})||selected;
    if(oldActive)list.scrollTop=oldScroll;
    if(window.SafafiRemote&&target)SafafiRemote.focus(target,true);
  }
  function safeReceive(value){try{receive(value);}catch(error){remove();console.error('Safafi selection panel fallback:',error);}}
  function destroy(){if(unsubscribe)unsubscribe();remove();window.removeEventListener('pagehide',destroy);}
  window.SafafiPlayerPanels={close:close,destroy:destroy};
  unsubscribe=window.SafafiPlayerSource.subscribe(safeReceive);window.addEventListener('pagehide',destroy);
}());
