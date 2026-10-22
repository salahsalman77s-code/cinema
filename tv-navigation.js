(function(){
  'use strict';
  var tv=!!window.tizen||/SmartTV|Tizen/i.test(navigator.userAgent);
  window.SafafiPlatform={tv:tv};
  if(tv)document.documentElement.classList.add('safafi-tv-profile');
  window.SafafiTVImage=function(url){return tv&&typeof url==='string'?url.replace(/(https:\/\/image\.tmdb\.org\/t\/p\/)(?:original|w\d+)\//,'$1w500/'):url;};
  function start(){
    if(window.SafafiRemote)return;
    var native='iframe[data-testid="player-iframe"],button,a[href],input,select,textarea,[role="button"],[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"],[role="option"],[role="switch"],[role="checkbox"],[role="radio"],[contenteditable="true"],[tabindex]',selector=native+',.cursor-pointer';
    var dirty=true,nodes=[],groups=new Map(),memory=new Map(),routeMemory=new Map(),pending=null,restoreScheduled=false,opener=null,popupWasOpen=false,lastRoute=routeKey(),lastMove=-Infinity,lastAction=-Infinity,hideTimer=null,observer=null,restoreFrame=null,disposed=false,lastFocused=null,repairFocus=false,returnFocus=null;
    var stats={rebuilds:0,rectReads:0},press=null,autoFocusEl=null,keysMode=false;
    function routeKey(){return location.hash.slice(1)||'/';}
    function path(){return window.SafafiLocation?SafafiLocation.pathname:(location.hash.slice(1).split('?')[0]||'/');}
    function rect(el){stats.rectReads++;return el.getBoundingClientRect();}
    // Overflow styles of ancestors are stable; cache them instead of resolving styles up the tree on every focus.
    var overflowCache=new WeakMap();
    function overflowOf(el){var v=overflowCache.get(el);if(!v){var cs=getComputedStyle(el);v=[/(auto|scroll)/.test(cs.overflowY),/(auto|scroll)/.test(cs.overflowX)];overflowCache.set(el,v);}return v;}
    function visible(el){
      if(!el||!el.isConnected||el.disabled||el.getAttribute('aria-disabled')==='true'||el.getAttribute('tabindex')==='-1'||el.closest('[hidden],[aria-hidden="true"],[inert]'))return false;
      if(el.closest('.opacity-0')&&!el.closest('[role="toolbar"]'))return false;
      var toolbar=el.closest('[role="toolbar"]');if(toolbar&&document.documentElement.classList.contains('safafi-controls-hidden'))return false;
      var r=rect(el);return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';
    }
    function group(el){return el.closest('[role="dialog"],[role="menu"],[role="listbox"]')||el.closest('header,.safafi-hero,[role="toolbar"],form,[class*="overflow-x-auto"],.grid,.safafi-rail')||el.closest('main')||document.body;}
    function refresh(){
      if(!dirty)return;dirty=false;stats.rebuilds++;groups.clear();
      nodes=Array.from(document.querySelectorAll(selector)).filter(function(el){
        if(el.matches('input[type="hidden"],input[type="file"]')||el.closest('[data-safafi-preview],.safafi-smart-stage'))return false;
        if(!el.matches(native)&&(el.closest(native)||el.querySelector(native)))return false;
        if(el.hasAttribute('tabindex')&&el.getAttribute('tabindex')==='-1')return false;
        return true;
      });
      nodes.forEach(function(el){var bucket=group(el);if(!groups.has(bucket))groups.set(bucket,[]);groups.get(bucket).push(el);});
      memory.forEach(function(el,bucket){if(!bucket.isConnected||!el.isConnected)memory.delete(bucket);});
    }
    function popup(){return Array.from(document.querySelectorAll('[role="dialog"],[role="menu"],[role="listbox"]')).reverse().find(function(el){if(el.parentElement&&el.parentElement.closest('[role="dialog"],[role="menu"]'))return false;var r=rect(el);return !el.closest('[hidden],[aria-hidden="true"]')&&r.width>0&&r.height>0;})||null;}
    function key(el){if(!el)return null;if(el.dataset&&el.dataset.mediaId){var row=el.closest('.sf-rail'),head=row&&row.querySelector('.sf-rail-head h2');return 'card:'+el.dataset.mediaType+':'+el.dataset.mediaId+(head?'@'+head.textContent:'');}if(el.id)return 'id:'+el.id;if(el.matches&&el.matches('[role="menuitemradio"],[role="menuitemcheckbox"],[role="option"],[role="menuitem"]')&&!el.getAttribute('aria-label'))return 'opt:'+el.textContent.trim().slice(0,60);if(el.getAttribute('href'))return 'href:'+el.getAttribute('href');if(el.getAttribute('aria-label'))return 'label:'+el.getAttribute('aria-label');return null;}
    function remember(){var active=document.activeElement;if(active&&active!==document.body&&active.tagName!=='IFRAME'){var id=key(active);if(id)routeMemory.set(lastRoute,id);}if(routeMemory.size>40)routeMemory.delete(routeMemory.keys().next().value);}
    function findKey(id){refresh();return nodes.find(function(el){return key(el)===id&&visible(el);});}
    // Motion engine: scroll offsets are eased on the compositor-friendly scroll path and retargeted on
    // held keys, so geometry never jumps under the focus ring and repeated presses glide continuously.
    var tweens=new Map(),tweenFrame=0;
    function reduced(){return document.documentElement.dataset.motion==='reduced'||!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);}
    function scroller(){return document.scrollingElement||document.documentElement;}
    function bounds(el,axis){if(axis==='y'){var max=el.scrollHeight-el.clientHeight;return [0,Math.max(0,max)];}var range=Math.max(0,el.scrollWidth-el.clientWidth);return getComputedStyle(el).direction==='rtl'?[-range,0]:[0,range];}
    function step(now){tweenFrame=0;tweens.forEach(function(entry,el){['x','y'].forEach(function(axis){var t=entry[axis];if(!t||t.native)return;var p=Math.min(1,(now-t.start)/t.duration),e=1-Math.pow(1-p,3),value=t.from+(t.to-t.from)*e;if(axis==='x')el.scrollLeft=value;else el.scrollTop=value;if(p>=1)delete entry[axis];});if(!entry.x&&!entry.y)tweens.delete(el);});if(tweens.size)tweenFrame=requestAnimationFrame(step);}
    // Native smooth scrolling runs on the compositor thread, so the glide stays fluid while the main thread
    // renders or decodes artwork. Targets are tracked so held keys keep extending the same glide.
    var nativeSmooth='scrollBehavior' in document.documentElement.style;
    var nativeTargets=new WeakMap();
    function glide(el,axis,delta,fast){
      if(!el||Math.abs(delta)<1)return;var store=nativeSmooth?nativeTargets:tweens,entry=store.get(el),running=entry&&entry[axis],current=axis==='x'?el.scrollLeft:el.scrollTop,now=performance.now();
      if(running&&running.native&&(now>running.until||Math.abs(running.to-current)<1))running=null;
      var base=running?running.to:current,range=bounds(el,axis),to=Math.max(range[0],Math.min(range[1],base+delta));
      if(Math.abs(to-current)<1){if(running){delete entry[axis];if(running.native){var stop={behavior:'smooth'};stop[axis==='x'?'left':'top']=to;try{el.scrollTo(stop);}catch(_){}}}return;}
      if(reduced()){if(axis==='x')el.scrollLeft=to;else el.scrollTop=to;if(running)delete entry[axis];return;}
      if(!entry){entry={};store.set(el,entry);}
      if(nativeSmooth){entry[axis]={native:true,to:to,until:now+700};var opts={behavior:'smooth'};opts[axis==='x'?'left':'top']=to;try{el.scrollTo(opts);return;}catch(_){}}
      if(store!==tweens){entry=tweens.get(el)||{};tweens.set(el,entry);}
      entry[axis]={from:current,to:to,start:now,duration:fast?170:Math.min(420,260+Math.abs(to-current)/12)};
      if(!tweenFrame)tweenFrame=requestAnimationFrame(step);
    }
    function inflight(el,axis){var entry=nativeTargets.get(el),t=entry&&entry[axis];if(!t){entry=tweens.get(el);t=entry&&entry[axis];}if(!t)return 0;var current=axis==='x'?el.scrollLeft:el.scrollTop;if(t.native&&(performance.now()>t.until||Math.abs(t.to-current)<1)){delete entry[axis];return 0;}return t.to-current;}
    // Rows keep the focused title on their leading edge; screens keep the focused row on a fixed anchor line.
    function scroll(el,fast){
      var rtl=document.documentElement.dir==='rtl',track=el.closest('.sf-rail-track'),r=rect(el);
      if(track&&track.scrollWidth>track.clientWidth+1){
        var b=rect(track),style=getComputedStyle(track),pad=parseFloat(rtl?style.paddingRight:style.paddingLeft)||0,offset=inflight(track,'x');
        var delta=rtl?(r.right-offset)-(b.right-pad):(r.left-offset)-(b.left+pad);glide(track,'x',delta,fast);
      }else{
        var parent=el.parentElement;
        while(parent&&parent!==document.body&&parent!==document.documentElement){
          var ov=overflowOf(parent),vertical=ov[0],horizontal=ov[1];
          if((vertical&&parent.scrollHeight>parent.clientHeight)||(horizontal&&parent.scrollWidth>parent.clientWidth)){
            var pb=rect(parent),margin=24,dx=0,dy=0;
            if(vertical&&parent.scrollHeight>parent.clientHeight)dy=r.top<pb.top+margin?r.top-pb.top-margin:r.bottom>pb.bottom-margin?r.bottom-pb.bottom+margin:0;
            if(horizontal&&parent.scrollWidth>parent.clientWidth)dx=r.left<pb.left+margin?r.left-pb.left-margin:r.right>pb.right-margin?r.right-pb.right+margin:0;
            if(dy)glide(parent,'y',dy,fast);if(dx)glide(parent,'x',dx,fast);
            if(parent.matches('[role="dialog"],[role="menu"],[role="listbox"],.sc-player-extras'))return;
          }
          parent=parent.parentElement;
        }
      }
      if(el.closest('[role="dialog"],[role="menu"],[role="listbox"],[role="toolbar"],.sf-navigation'))return;
      var page=scroller(),y=inflight(page,'y'),top=r.top-y,rail=el.closest('.sf-rail'),anchor=el.closest('[data-sf-anchor]'),target=null;
      if(el.closest('.safafi-hero'))target=-page.scrollTop-y;
      else if(anchor&&rail&&!rail.classList.contains('sf-rail-grid')){var line=parseFloat(getComputedStyle(anchor).getPropertyValue('--sf-anchor'))||innerHeight*0.5;target=rect(rail).top-y-line;}
      else{var absolute=top+page.scrollTop;if(absolute<innerHeight*0.55)target=-page.scrollTop-y;else{var row=rail&&!rail.classList.contains('sf-rail-grid')?rect(rail):r,rowTop=row.top-y,rowBottom=row.bottom-y,upper=innerHeight*0.22,lower=innerHeight-96;
        target=rowTop<upper?rowTop-upper:rowBottom>lower?Math.min(rowBottom-lower,rowTop-upper):0;}}
      if(target)glide(page,'y',target,fast);
    }
    function focus(el,fast){if(!el||el.disabled||el.getAttribute('aria-disabled')==='true')return false;if(el.tabIndex<0)el.tabIndex=0;try{el.focus({preventScroll:true});}catch(_){el.focus();}memory.set(group(el),el);lastFocused=el;scroll(el,fast);window.dispatchEvent(new CustomEvent('safafi:remote-focus'));return true;}
    function toolbar(){return document.querySelector('[data-safafi-player-toolbar]')||document.querySelector('[role="toolbar"]:not([data-safafi-legacy-toolbar])');}
    function media(){return window.SafafiTV?SafafiTV.video():document.querySelector('video:not([data-safafi-preview])');}
    function wake(){if(!tv&&!document.querySelector('[data-safafi-player-toolbar]'))return;document.documentElement.classList.add('safafi-controls-active');document.documentElement.classList.remove('safafi-controls-hidden');clearTimeout(hideTimer);
      if(document.querySelector('video:not([data-safafi-preview])'))hideTimer=setTimeout(function(){var v=media();if(v&&!v.paused&&!popup()){document.documentElement.classList.remove('safafi-controls-active');document.documentElement.classList.add('safafi-controls-hidden');if(document.activeElement&&document.activeElement.closest('[role="toolbar"]')){v.tabIndex=-1;v.focus({preventScroll:true});}}},5000);
    }
    function playbackFocus(){var bar=toolbar();if(!bar)return false;wake();var play=bar.querySelector('button[data-player-action="play"]')||bar.querySelector('button[aria-label="Play"],button[aria-label="Pause"]')||bar.querySelector('button');return focus(play,true);}
    function closePopup(){var panel=popup();if(!panel)return false;
      var close=Array.from(panel.querySelectorAll('button')).find(function(b){return /^(Close|Dismiss|إغلاق|رجوع)/i.test(b.getAttribute('aria-label')||'')||/^(✕|×|Cancel|إلغاء|تم|رجوع)$/.test(b.textContent.trim());});
      var subpage=panel.querySelector('button[aria-label="Back to main settings"]');if(subpage){subpage.click();dirty=true;schedule();return true;}
      if(!close)return false;var restore=opener&&opener.isConnected?opener:null;returnFocus=restore;close.click();dirty=true;if(restore&&visible(restore)){focus(restore,true);returnFocus=null;}popupWasOpen=false;schedule();return true;
    }
    function back(){
      var active=document.activeElement;if(active&&active.matches('input:not([type="range"]),textarea,select,[contenteditable="true"]')&&!(tv&&active.tagName==='SELECT'&&window.SafafiScreenControls)){active.blur();return;}
      if(closePopup())return;var browse=document.querySelector('[data-sf-anchor][data-browse]');if(browse&&!document.querySelector('[data-testid="player-iframe"]')){var home=browse.querySelector('[data-sf-autofocus]');if(home&&visible(home)){focus(home,false);return;}}var frame=document.querySelector('[data-testid="player-iframe"]');if(frame&&document.activeElement===frame&&window.SafafiFrameInput&&SafafiFrameInput.forward({keyCode:10009},true))return;remember();if(window.SafafiTV){SafafiTV.back();return;}if(path()!=='/')history.back();
    }
    function consume(e){e.preventDefault();e.stopImmediatePropagation();}
    function playCommand(code){if(window.SafafiPlayerControls&&SafafiPlayerControls.handleMedia(code))return true;var v=media();if(!v)return false;
      try{if(code===415||(code===10252&&v.paused)){var result=v.play();if(result&&result.catch)result.catch(function(){});}else if(code===19||code===10252)v.pause();else if(Number.isFinite(v.duration))v.currentTime=Math.max(0,Math.min(v.duration-.1,v.currentTime+(code===417?10:-10)));}catch(_){}wake();return true;
    }
    function range(input,code){var horizontal=code===37||code===39;if(!horizontal)return false;
      var direction=code===39?1:-1,old=Number(input.value),step=Number(input.step)||1,min=Number(input.min)||0,max=Number(input.max)||100;
      if(/timeline/i.test(input.getAttribute('aria-label')||'')){if(window.SafafiPlayerControls&&SafafiPlayerControls.owns(input)){SafafiPlayerControls.seek(direction*10);return true;}var v=media();if(v&&Number.isFinite(v.duration)){v.currentTime=Math.max(0,Math.min(v.duration-.1,v.currentTime+direction*10));wake();return true;}step=10;}
      var value=Math.max(min,Math.min(max,old+direction*step));Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));wake();return true;
    }
    function move(code,repeat){
      if(!popup()&&window.SafafiPlayerControls&&SafafiPlayerControls.navigate(document.activeElement,code,repeat))return true;
      var logicalScope=popup();if(window.SafafiFocusGraph&&SafafiFocusGraph.move(document.activeElement,code,focus,logicalScope))return true;
      refresh();var active=document.activeElement,scope=popup(),bucket=scope||group(active||document.body),r=active&&active!==document.body?rect(active):null;
      if(!r||!r.width||active===document.body||active.tagName==='IFRAME'){
        var initial=(scope?nodes.filter(function(el){return scope.contains(el);}):nodes).find(visible);if(initial)return focus(initial,repeat);return false;
      }
      var horizontal=code===37||code===39,choices=scope?nodes.filter(function(el){return scope.contains(el);}):(groups.get(bucket)||[]),best=null,score=Infinity,x=r.left+r.width/2,y=r.top+r.height/2;
      // Ordered option lists need only inspect their neighbor, even when hundreds of tracks exist.
      if(scope&&!horizontal&&active.matches('[role="menuitemradio"],[role="option"]')){
        var options=choices.filter(function(el){return el.matches('[role="menuitemradio"],[role="option"]')&&!el.disabled&&!el.closest('[hidden],[aria-hidden="true"]');}),position=options.indexOf(active),next=options[position+(code===40?1:-1)];
        if(next&&visible(next)){var nr=rect(next),forward=code===40?nr.top+nr.height/2-y:y-nr.top-nr.height/2;if(forward>2&&Math.min(r.right,nr.right)>Math.max(r.left,nr.left))return focus(next,repeat);}
      }
      function choose(list,crossLimit){list.forEach(function(el){if(el===active||el.contains(active)&&(!el.matches(".safafi-card")||horizontal)||active.contains(el)&&(!active.matches(".safafi-card")||horizontal))return;var nested=el.closest(".safafi-card");if(nested&&nested!==el&&nested!==active.closest(".safafi-card"))return;if(!visible(el))return;var b=rect(el),dx=b.left+b.width/2-x,dy=b.top+b.height/2-y,forward=code===37?-dx:code===39?dx:code===38?-dy:dy,cross=horizontal?Math.abs(dy):Math.abs(dx);
        if(horizontal&&crossLimit&&Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top)<=0)return;
        var value=forward+cross*(horizontal?3:1.5);if(forward>2&&value<score){score=value;best=el;}});}
      choose(choices,true);
      if(!best&&!horizontal&&!scope){
        var nearest=null,distance=Infinity;groups.forEach(function(list,row){if(row===bucket||row===document.body||row.contains(active)||row.closest('[role="dialog"],[role="menu"],[role="listbox"]'))return;var b=rect(row);if(!b.width||!b.height)return;var forward=code===40?b.top-r.bottom:r.top-b.bottom;if(forward>=-12&&forward<distance){distance=forward;nearest=row;}});
        if(nearest){var saved=memory.get(nearest);if(saved&&saved.isConnected&&visible(saved)){var sr=rect(saved);if(sr.left>=0&&sr.right<=innerWidth)best=saved;}
          if(!best){score=Infinity;(groups.get(nearest)||[]).forEach(function(el){if(!visible(el))return;var b=rect(el);if(b.right<0||b.left>innerWidth)return;var value=Math.abs(b.left+b.width/2-x);if(value<score){score=value;best=el;}});}}
      }
      if(best)return focus(best,repeat);return false;
    }
    function leavePlayer(){
      refresh();var frame=document.querySelector('[data-testid="player-iframe"]');if(!frame)return false;
      var options=nodes.filter(function(el){return el!==frame&&!el.closest('header')&&visible(el);});
      var target=options.find(function(el){return /episode|season|حلقة|حلقات|موسم/i.test((el.getAttribute('data-testid')||'')+' '+(el.getAttribute('aria-label')||'')+' '+el.textContent);})||options[0]||nodes.find(function(el){return el.closest('header')&&visible(el);});
      return target?focus(target,true):false;
    }
    function forwardToFrame(e){var frame=document.querySelector('[data-testid="player-iframe"]');if(!frame)return false;try{var remote=frame.contentWindow.SafafiRemote;if(remote){remote.handle(e);return true;}}catch(_){}return !!(window.SafafiFrameInput&&SafafiFrameInput.forward(e));}
    function handle(e){
      var code=e.keyCode||({ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Enter:13,Escape:27}[e.key]),active=document.activeElement;
      if(e.key==='Tab'||code===9){var scope=popup();if(scope){consume(e);refresh();var list=nodes.filter(function(el){return scope.contains(el)&&visible(el);}),at=list.indexOf(active);if(list.length)focus(list[(at+(e.shiftKey?-1:1)+list.length)%list.length],true);}return;}
      if(![13,27,37,38,39,40,10009,415,19,10252,417,412].includes(code))return;
      document.documentElement.classList.add('safafi-remote');if(!keysMode){keysMode=true;document.documentElement.classList.add('sf-keys');}autoFocusEl=null;
      if((code===10009||code===27)){consume(e);if(!e.repeat)back();return;}
      if([415,19,10252,417,412].includes(code)){consume(e);if(e.repeat&&![417,412].includes(code))return;if(e.repeat&&Date.now()-lastMove<90)return;lastMove=Date.now();if(!document.querySelector('video:not([data-safafi-preview])')&&forwardToFrame(e))return;if(playCommand(code))return;forwardToFrame(e);return;}
      var modal=popup();if(modal&&!modal.contains(active)){
        consume(e);refresh();var candidates=nodes.filter(function(el){return modal.contains(el)&&visible(el);});
        var selected=candidates.find(function(el){return el.getAttribute('aria-checked')==='true'||el.getAttribute('aria-selected')==='true';})||candidates[0];
        if(selected)focus(selected,true);return;
      }
      if((active===document.body||active&&active.matches('iframe[data-testid="player-iframe"]'))&&document.querySelector('[data-testid="player-iframe"]')&&forwardToFrame(e)){consume(e);return;}
      if(tv&&active&&active.matches('select')&&window.SafafiScreenControls){consume(e);if(code===13){if(!e.repeat)SafafiScreenControls.openSelect(active);}else{if(e.repeat&&Date.now()-lastMove<90)return;lastMove=Date.now();move(code,e.repeat);}return;}
      var editing=active&&active.matches('input:not([type="range"]),textarea,select,[contenteditable="true"]');if(editing){if((code===38||code===40)&&active.matches('input:not([type="range"]):not([type="file"])')){consume(e);move(code,e.repeat);}return;}
      if(code===13&&active&&active.matches('.safafi-card')&&!document.querySelector('video:not([data-safafi-preview])')){consume(e);if(!press){var held={el:active,fired:false};held.timer=setTimeout(function(){if(press!==held||held.fired||document.activeElement!==held.el)return;held.fired=true;var owner=held.el.closest('.sf-card'),secondary=owner&&owner.querySelector('[data-card-action]');if(secondary)secondary.click();},550);press=held;}return;}
      if(code===13){consume(e);if(e.repeat||Date.now()-lastAction<120)return;lastAction=Date.now();
        if((tv||window.SafafiPlayerControls)&&document.querySelector('video:not([data-safafi-preview])')&&(document.documentElement.classList.contains('safafi-controls-hidden')||active===document.body||active.tagName==='VIDEO')){playbackFocus();return;}
        wake();if(active&&active!==document.body&&active.tagName!=='VIDEO'&&visible(active)){if(!active.closest('[role="dialog"],[role="menu"],[role="listbox"]'))opener=active;remember();active.click();}return;
      }
      consume(e);if(e.repeat&&Date.now()-lastMove<90)return;lastMove=Date.now();
      if((tv||window.SafafiPlayerControls)&&document.querySelector('video:not([data-safafi-preview])')&&(document.documentElement.classList.contains('safafi-controls-hidden')||active===document.body||active.tagName==='VIDEO')){playbackFocus();return;}
      if(active&&active.matches('input[type="range"]')&&range(active,code))return;
      wake();move(code,e.repeat);
    }
    function schedule(){if(disposed||restoreScheduled)return;restoreScheduled=true;restoreFrame=requestAnimationFrame(restore);}
    function restore(){restoreScheduled=false;var scope=popup();
      if(autoFocusEl&&!scope){var current=document.activeElement,inNav=!!(current&&current.closest&&current.closest('.sf-navigation')),loose=inNav||current===document.body||!current,preferred=document.querySelector('.sf-content [data-sf-autofocus]');
        var settled=current&&current.matches&&(current.matches('.safafi-card')||!!current.closest('[data-safafi-detail-id],[data-safafi-screen="settings"]'));if(!preferred&&!settled){refresh();var content=nodes.filter(function(el){return el.closest('.sf-content')&&!el.closest('.safafi-developer-panel')&&visible(el);});preferred=content.find(function(el){return el.matches('.safafi-card');})||(loose?content[0]:null);if(preferred&&preferred.matches('.safafi-card'))loose=true;}
        if(preferred&&preferred!==current&&!preferred.disabled&&(loose||preferred.matches('[data-sf-autofocus]'))){autoFocusEl=null;focus(preferred,true);return;}}
      if(!scope&&!popupWasOpen&&!pending&&document.activeElement!==document.body&&visible(document.activeElement)&&!repairFocus&&!returnFocus)return;refresh();
      if(scope&&(!popupWasOpen||!scope.contains(document.activeElement))){var expanded=nodes.find(function(el){return el.getAttribute('aria-expanded')==='true'&&!scope.contains(el)&&visible(el);});opener=expanded||opener||document.activeElement;popupWasOpen=true;var scoped=nodes.filter(function(el){return scope.contains(el)&&visible(el);}),first=scoped.find(function(el){return el.getAttribute('aria-checked')==='true'||el.getAttribute('aria-selected')==='true';})||scoped.find(function(el){return !/^(Close|Dismiss|إغلاق)/i.test(el.getAttribute('aria-label')||'');})||scoped[0];if(first)focus(first,true);return;}
      if(!scope&&popupWasOpen){popupWasOpen=false;if(opener&&opener.isConnected)focus(opener,true);}
      if(returnFocus&&!scope){if(!returnFocus.isConnected)returnFocus=null;else if(visible(returnFocus)){var restored=returnFocus;returnFocus=null;focus(restored,true);return;}}
      if(repairFocus&&pending)repairFocus=false;
      if(repairFocus&&!scope){repairFocus=false;var replacement=lastFocused&&findKey(key(lastFocused));if(replacement){focus(replacement,true);return;}if(document.querySelector('video:not([data-safafi-preview])')&&playbackFocus())return;}
      if(!pending){if(tv&&!document.querySelector('video:not([data-safafi-preview]),[data-testid="player-iframe"]')&&(document.activeElement===document.body||!visible(document.activeElement))){var initial=nodes.find(function(el){return el.matches('[data-sf-autofocus]')&&visible(el);})||nodes.find(function(el){return el.matches('input[type="search"]')&&visible(el);})||nodes.find(function(el){return el.closest('.safafi-hero')&&visible(el);})||nodes.find(function(el){return !el.closest('.sf-navigation')&&visible(el);});if(initial){focus(initial,true);autoFocusEl=initial.matches('[data-sf-autofocus]')?null:true;}}return;}
      var main=document.querySelector('#safafi-content'),shown=main&&main.firstElementChild;if(Date.now()-pending.at<5000&&(!shown||shown===pending.screen||shown.matches('.sf-route-loading')||!shown.querySelector('a[href],button,input,select,[tabindex="0"]')))return;
      var target=pending.key&&findKey(pending.key);
      if(!target&&/^\/(movie|tv)\/[^/]+$/.test(path())){var detail=document.querySelector('[data-safafi-detail-id="'+path().split('/')[2]+'"]');if(detail)target=Array.from(detail.querySelectorAll('a[href],button')).find(function(el){return /\/watch\//.test(el.getAttribute('href')||'')&&visible(el);})||Array.from(detail.querySelectorAll('button,a')).find(visible);}
      if(!target&&pending.header&&pending.header.isConnected)target=pending.header;
      if(!target&&!/^\/(movie|tv)\/[^/]+$/.test(path()))target=nodes.find(function(el){return el.matches('[data-sf-autofocus]')&&visible(el);})||nodes.find(function(el){return el.matches('input[type="search"],input[placeholder]')&&visible(el);})||nodes.find(function(el){return el.closest('.safafi-hero')&&visible(el);})||nodes.find(function(el){return el.matches('.safafi-card')&&el.closest('main')&&visible(el);})||nodes.find(function(el){return el.closest('main')&&visible(el);})||nodes.find(visible);
      if((!target||target.closest('.sf-navigation'))&&!(pending.header&&target===pending.header)&&Date.now()-pending.at<4000&&!document.querySelector('.sf-content [data-safafi-screen] a[href],.sf-content [data-safafi-screen] button,.sf-content .safafi-hero a[href]'))return;
      if(target){focus(target,true);if(!pending.key&&!target.matches('[data-sf-autofocus]'))autoFocusEl=true;pending=null;}
    }
    var listeners=[];function listen(target,type,fn,options){target.addEventListener(type,fn,options);listeners.push([target,type,fn,options]);}
    listen(document,'keydown',handle,true);
    listen(document,'mousemove',function(){if(keysMode){keysMode=false;document.documentElement.classList.remove('sf-keys');}},{passive:true,capture:true});
    // Touch and mouse clicks also leave remote mode on phones and computers (focus styles then follow the pointer).
    if(!tv)listen(document,'pointerdown',function(){if(keysMode){keysMode=false;document.documentElement.classList.remove('sf-keys');}document.documentElement.classList.remove('safafi-remote');},{passive:true,capture:true});
    listen(document,'keyup',function(e){var code=e.keyCode||(e.key==='Enter'?13:0);if(code!==13||!press)return;var p=press;press=null;clearTimeout(p.timer);e.preventDefault();e.stopImmediatePropagation();if(p.fired||document.activeElement!==p.el||Date.now()-lastAction<120)return;lastAction=Date.now();wake();opener=p.el;remember();p.el.click();},true);
    listen(document,'focusin',function(e){if(press&&e.target!==press.el){clearTimeout(press.timer);press=null;}},true);
    listen(document,'click',function(e){var active=e.target.closest&&e.target.closest(selector);if(active&&!active.closest('[role="dialog"],[role="menu"],[role="listbox"]')){opener=active;remember();}},true);
    listen(document,'focusin',function(e){if(e.target.matches(selector)){lastFocused=e.target;memory.set(group(e.target),e.target);if(e.target.closest('[role="toolbar"]'))wake();}},true);
    listen(window,'safafi:navigate',function(e){dirty=true;overflowCache=new WeakMap();nodes=[];groups.clear();lastRoute=routeKey();var screenNow=document.querySelector('#safafi-content');pending={screen:screenNow&&screenNow.firstElementChild,at:Date.now(),key:e.detail&&e.detail.action==='POP'?routeMemory.get(lastRoute):null,header:document.activeElement&&document.activeElement.closest('header')?document.activeElement:null};schedule();});
    listen(window,'resize',function(){dirty=true;overflowCache=new WeakMap();if(window.SafafiFocusGraph)SafafiFocusGraph.invalidate();});
    listen(document,'playing',function(e){if(e.target.tagName==='VIDEO'&&!e.target.hasAttribute('data-safafi-preview'))wake();},true);
    function boot(){if(disposed||observer)return;observer=new MutationObserver(function(changes){if(disposed||!window.document||!document.body)return;changes=changes.filter(function(c){var t=c.target.nodeType===1?c.target:c.target.parentElement;return !(t&&t.closest&&t.closest('.sf-spotlight,.sf-stage,.sf-toast,.sf-card-art,.sc-player-time,.sc-player-remaining,.sc-player-title'));});if(!changes.length)return;dirty=true;if(nodes.length&&!nodes[0].isConnected){nodes=[];groups.clear();}if(window.SafafiFocusGraph&&changes.some(function(change){return change.type==='attributes'||Array.from(change.addedNodes||[]).concat(Array.from(change.removedNodes||[])).some(function(node){return node.nodeType===1;});}))SafafiFocusGraph.invalidate();if(lastFocused&&!lastFocused.isConnected&&document.activeElement===document.body)repairFocus=true;var panelSelector='[role="dialog"],[role="menu"],[role="listbox"]';if(returnFocus||repairFocus||pending||autoFocusEl||tv&&document.activeElement===document.body&&!document.querySelector('video,[data-testid="player-iframe"]')||changes.some(function(change){return change.type==='attributes'&&change.attributeName==='aria-expanded'||Array.from(change.addedNodes||[]).some(function(node){return node.nodeType===1&&(node.matches(panelSelector)||node.querySelector(panelSelector));})||popupWasOpen&&Array.from(change.removedNodes||[]).some(function(node){return node.nodeType===1;});}))schedule();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-hidden','aria-expanded','disabled','open']});schedule();}
    if(document.readyState==='loading')listen(document,'DOMContentLoaded',boot,{once:true});else boot();
    if(window.tizen&&tizen.tvinputdevice)['MediaPlay','MediaPause','MediaPlayPause','MediaFastForward','MediaRewind'].forEach(function(name){try{tizen.tvinputdevice.registerKey(name);}catch(_){}});
    window.SafafiRemote={handle:handle,closePopup:closePopup,leavePlayer:leavePlayer,wake:wake,refresh:function(){dirty=true;refresh();},focus:focus,ensureVisible:scroll,stats:stats,destroy:function(){disposed=true;clearTimeout(hideTimer);if(restoreFrame!==null)cancelAnimationFrame(restoreFrame);if(observer)observer.disconnect();listeners.forEach(function(l){l[0].removeEventListener(l[1],l[2],l[3]);});memory.clear();routeMemory.clear();nodes=[];groups.clear();delete window.SafafiRemote;}};
  }
  window.startSafafiRemote=start;
}());
