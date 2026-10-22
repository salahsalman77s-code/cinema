(function(){
  'use strict';
  var Core=window.SafafiExperienceCore,Media=window.SafafiExperienceMedia;
  function create(root,options){
    options=options||{};
    var storage=null;try{storage=window.localStorage;}catch(_){}
    var prefs=Core.preferences(storage),selected=null,mode=null,generation=0,previewTimer=null,deadline=null,limitTimer=null,colorTimer=null,metadataAbort=null,player=null,stage=null,dialog=null,returnFocus=null,disposed=false;
    var colorSerial=Promise.resolve(),colorGeneration=0,lastImage='',activeLayer=0,observer=null,scanPending=false;
    var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)'),isTV=options.isTV===undefined?!!window.tizen||/SmartTV|Tizen/i.test(navigator.userAgent):options.isTV;
    var loadMetadata=options.loadMetadata||function(type,id,request){if(typeof window.SafafiExperienceMetadata!=='function')return Promise.reject(Error('Metadata unavailable'));return window.SafafiExperienceMetadata(type,id,request);};
    var extract=options.colors||Media.colors,makePlayer=options.createPlayer||Media.createPlayer,listeners=[];
    var ambient=document.createElement('div');ambient.className='safafi-ambient';ambient.setAttribute('aria-hidden','true');
    var layers=[document.createElement('div'),document.createElement('div')];layers.forEach(function(layer){layer.className='safafi-ambient-layer';ambient.appendChild(layer);});document.body.appendChild(ambient);
    function on(target,type,fn,capture){target.addEventListener(type,fn,capture);listeners.push(function(){target.removeEventListener(type,fn,capture);});}
    function route(){return window.SafafiLocation?SafafiLocation.pathname:(location.hash.slice(1).split('?')[0]||'/');}
    function blocked(){return disposed||document.hidden||!!dialog||/^\/(watch|embed)(\/|$)/.test(route())||!!document.querySelector('[data-testid="player-iframe"],[role="dialog"],[aria-modal="true"]')||Array.from(root.querySelectorAll('video:not([data-safafi-preview])')).some(function(v){return !v.paused&&!v.ended;});}
    function save(){try{storage.setItem('safafi.experience.v1',JSON.stringify(prefs));}catch(_){}applyPreferences();}
    function applyPreferences(){document.documentElement.classList.toggle('safafi-cinematic',prefs.cinematic);ambient.hidden=!prefs.cinematic||blocked();document.documentElement.classList.toggle('safafi-tv-platform',isTV);if(!prefs.cinematic){clearTimeout(colorTimer);colorGeneration++;lastImage='';}else paint(selected);if(!prefs.smartPreview)stopPreview();}
    function paintPalette(values){var layer=layers[1-activeLayer];layer.style.background='radial-gradient(ellipse at 90% 22%,rgba('+values[0]+',.25),transparent 60%),radial-gradient(ellipse at 5% 70%,rgba('+values[1]+',.18),transparent 65%)';layer.style.opacity='1';layers[activeLayer].style.opacity='0';activeLayer=1-activeLayer;}
    paintPalette(Core.fallback);
    // Ambient colour sampling (canvas reads on every focus) is superseded by the cinematic stage backdrop.
    function paint(){}
    function stopPreview(){
      generation++;if(metadataAbort){metadataAbort.abort();metadataAbort=null;}clearTimeout(previewTimer);clearTimeout(deadline);clearTimeout(limitTimer);previewTimer=deadline=limitTimer=null;
      if(player){var old=player;player=null;try{old.destroy();}catch(_){}}
      if(stage){stage.remove();stage=null;}
      root.querySelectorAll('.safafi-preview-hero-active').forEach(function(el){el.classList.remove('safafi-preview-hero-active');});
    }
    function clearSelection(){stopPreview();if(selected)selected.classList.remove('safafi-selected');selected=null;mode=null;clearTimeout(colorTimer);colorGeneration++;lastImage='';ambient.hidden=!prefs.cinematic||blocked();}
    function valid(card,token){return token===generation&&selected===card&&card.isConnected&&prefs.smartPreview&&!blocked();}
    function beginPreview(card,token){
      if(!valid(card,token))return;
      var type=card.getAttribute('data-media-type'),id=card.getAttribute('data-media-id');
      if(!['movie','tv'].includes(type)||!id)return;
      var request=metadataAbort=new AbortController();deadline=setTimeout(function(){if(token===generation)stopPreview();},12000);
      Promise.resolve().then(function(){return loadMetadata(type,id,{signal:request.signal});}).then(function(detail){
        if(!valid(card,token))return;var source=Core.trailer(detail);if(!source){stopPreview();return;}
        stage=document.createElement('div');stage.className='safafi-smart-stage';stage.setAttribute('aria-hidden','true');stage.dataset.safafiPreview='true';
        var media=document.createElement('div');media.className='safafi-smart-media';stage.appendChild(media);
        var label=document.createElement('span');label.className='safafi-preview-label';label.textContent='معاينة صامتة · '+(detail.title||card.title||'');stage.appendChild(label);
        var hero=root.querySelector('.sf-stage')||root.querySelector('.safafi-hero');
        if(hero){stage.classList.add('safafi-smart-in-hero');hero.appendChild(stage);}else{stage.classList.add('safafi-smart-floating');document.body.appendChild(stage);}
        var currentStage=stage,failed=false;
        function fail(){failed=true;if(token===generation)stopPreview();}
        var candidate=makePlayer(source,media,{valid:function(){return valid(card,token);},failed:fail,playing:function(){
          if(!valid(card,token)){fail();return;}clearTimeout(deadline);currentStage.classList.add('is-playing');if(hero)hero.classList.add('safafi-preview-hero-active');
          clearTimeout(limitTimer);limitTimer=setTimeout(function(){if(token===generation)stopPreview();},30000);
        }});
        if(failed||!valid(card,token)){if(candidate)candidate.destroy();}else player=candidate;
      }).catch(function(){if(token===generation)stopPreview();});
    }
    function select(card,input){
      if(!prefs.smartPreview)return;
      if(!card||!root.contains(card)||blocked())return;
      ambient.hidden=!prefs.cinematic;
      if(selected===card&&mode===input)return;
      stopPreview();if(selected)selected.classList.remove('safafi-selected');selected=card;mode=input;card.classList.add('safafi-selected');paint(card);
      if(prefs.smartPreview){var token=generation;armPreview(card,token,input==='hover'?2000:3000);}
    }
    // Previews are the lowest priority work: wait until the remote has been idle and boot has settled.
    function armPreview(card,token,delay){previewTimer=setTimeout(function(){if(token!==generation)return;var idle=window.SafafiInputAge?SafafiInputAge():1e9,boot=8000-performance.now(),wait=Math.max(1500-idle,boot);if(wait>16){armPreview(card,token,wait);return;}beginPreview(card,token);},delay);}
    function cardOf(target){return target&&target.closest&&target.closest('.safafi-card[data-media-id]');}
    function closeSettings(){if(!dialog)return;var old=dialog;dialog=null;old.remove();document.body.classList.remove('safafi-experience-dialog-open');ambient.hidden=!prefs.cinematic||blocked();var target=returnFocus&&returnFocus.isConnected?returnFocus:root.querySelector('#safafi-experience-open');if(target)target.focus();}
    function openSettings(button){
      if(dialog)return;clearSelection();returnFocus=document.activeElement||button;dialog=document.createElement('section');dialog.className='safafi-experience-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','safafi-experience-title');
      dialog.innerHTML='<div class="safafi-experience-panel"><h2 id="safafi-experience-title">تجربة العرض</h2><p>خصّص الإضاءة والمعاينات دون تغيير أدوات المشاهدة.</p><button type="button" data-experience="cinematic"><span>Cinematic Mode</span><small>إضاءة محيطية من ألوان الفيلم</small><b></b></button><button type="button" data-experience="smartPreview"><span>Smart Preview</span><small>معاينات صامتة بعد ثانيتين بالماوس أو 3 ثوانٍ بالريموت</small><b></b></button><p class="safafi-experience-note">تتوفر المعاينات فقط عند وجود تريلر في بيانات العنوان وقابل للتشغيل. زر ♪ يتحكم بأصوات الواجهة.</p><button type="button" id="safafi-experience-close">تم</button></div>';
      function refresh(){dialog.querySelectorAll('[data-experience]').forEach(function(control){var enabled=prefs[control.dataset.experience];control.setAttribute('aria-pressed',String(enabled));control.querySelector('b').textContent=enabled?'مفعّل':'متوقف';});}
      dialog.addEventListener('click',function(e){var control=e.target.closest('[data-experience]');if(control){var key=control.dataset.experience;prefs[key]=!prefs[key];save();refresh();}else if(e.target===dialog||e.target.closest('#safafi-experience-close'))closeSettings();});
      document.body.appendChild(dialog);document.body.classList.add('safafi-experience-dialog-open');ambient.hidden=true;refresh();dialog.querySelector('button').focus();
    }
    function mountSettings(){var header=root.querySelector('.safafi-shell > header > div');if(!header||root.querySelector('#safafi-experience-open'))return;var button=document.createElement('button');button.id='safafi-experience-open';button.className='safafi-experience-open';button.type='button';button.textContent='✦';button.title='إعدادات تجربة العرض';button.setAttribute('aria-label',button.title);button.addEventListener('click',function(){openSettings(button);});header.appendChild(button);}
    function inspect(){scanPending=false;if(disposed)return;mountSettings();ambient.hidden=!prefs.cinematic||blocked();if(blocked()||(selected&&!selected.isConnected))clearSelection();if(!selected&&!blocked())paint(null);}
    on(root,'pointerover',function(e){if(isTV||e.pointerType==='touch')return;var card=cardOf(e.target);if(card&&(!e.relatedTarget||!card.contains(e.relatedTarget)))select(card,'hover');},true);
    on(root,'pointerout',function(e){if(mode!=='hover'||!selected)return;if(!e.relatedTarget||!selected.contains(e.relatedTarget))clearSelection();},true);
    on(root,'focusin',function(e){var card=cardOf(e.target);if(card&&e.target===card)select(card,'focus');else if(selected&&!selected.contains(e.target))clearSelection();},true);
    on(root,'focusout',function(e){if(mode==='focus'&&selected&&(!e.relatedTarget||!selected.contains(e.relatedTarget)))clearSelection();},true);
    // Stop before routing, favorite actions or the main player can start.
    on(root,'click',function(){clearSelection();},true);
    on(document,'play',function(e){if(e.target.tagName==='VIDEO'&&!e.target.hasAttribute('data-safafi-preview'))clearSelection();},true);
    on(document,'visibilitychange',function(){if(document.hidden)clearSelection();},true);
    on(window,'safafi:navigate',function(){clearSelection();if(dialog)closeSettings();},true);
    on(window,'hashchange',function(){clearSelection();},true);
    on(window,'popstate',function(){clearSelection();if(dialog)closeSettings();},true);
    on(window,'pagehide',destroy,true);
    on(window,'safafi:preferences',function(){prefs=Core.preferences(storage);clearSelection();applyPreferences();},true);
    on(window,'offline',function(){clearSelection();},true);
    on(window,'safafi:overlay',function(){clearSelection();},true);
    on(window,'resize',function(){stopPreview();},true);
    on(window,'scroll',function(e){if(stage&&stage.classList.contains('safafi-smart-floating'))stopPreview();},true);
    on(window,'keydown',function(e){if(!dialog)return;
      if(e.key==='Escape'||e.keyCode===10009){e.preventDefault();e.stopImmediatePropagation();closeSettings();return;}
      if(e.key==='Tab'){var buttons=Array.from(dialog.querySelectorAll('button')),index=buttons.indexOf(document.activeElement);if(e.shiftKey&&index<=0){e.preventDefault();buttons[buttons.length-1].focus();}else if(!e.shiftKey&&index===buttons.length-1){e.preventDefault();buttons[0].focus();}}
    },true);
    observer=new MutationObserver(function(changes){var detached=selected&&!selected.isConnected;if(detached)clearSelection();var relevant=detached||changes.some(function(change){return Array.from(change.addedNodes||[]).concat(Array.from(change.removedNodes||[])).some(function(node){return node.nodeType===1&&(node.matches('header,.safafi-hero,.sf-hero-art,.safafi-card,[role="dialog"],[aria-modal="true"],[data-testid="player-iframe"],video:not([data-safafi-preview])')||node.querySelector('header,.safafi-hero,.sf-hero-art,.safafi-card,[role="dialog"],[data-testid="player-iframe"]'));});});if(relevant&&!scanPending){scanPending=true;requestAnimationFrame(inspect);}});observer.observe(document.body,{childList:true,subtree:true});
    applyPreferences();inspect();
    function destroy(){if(disposed)return;clearSelection();closeSettings();disposed=true;observer.disconnect();listeners.forEach(function(off){off();});ambient.remove();var button=root.querySelector('#safafi-experience-open');if(button)button.remove();document.documentElement.classList.remove('safafi-cinematic','safafi-tv-platform');}
    return {destroy:destroy,settings:function(){return {cinematic:prefs.cinematic,smartPreview:prefs.smartPreview};}};
  }
  window.SafafiExperience={create:create};
  function start(){var root=document.getElementById('root');if(root&&window===window.top)window.SafafiExperienceController=create(root);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}());
