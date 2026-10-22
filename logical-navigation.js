(function () {
  'use strict';
  var selector='[data-focus-group],.sc-rail-deferred,.sc-rail-load-action,[class*="overflow-x-auto"],.grid,form,.safafi-hero,[data-safafi-detail-id]',
      actionable='button,a[href],input:not([type="hidden"]),select,textarea,[role="option"],[role="menuitemradio"],[role="menuitem"],[role="switch"],[tabindex="0"]',
      saved=new WeakMap(),cache=new WeakMap(),groupCache=null,lastContent=null,stats={moves:0,logical:0,fallbacks:0,groupBuilds:0};
  function enabled(el){return el&&el.isConnected&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&el.tabIndex!==-1&&!el.closest('[hidden],[aria-hidden="true"],[inert]')&&visibleStyle(el);}
  function visibleStyle(el){var cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden';}
  function container(el,scope){return scope||el&&el.closest(selector);}
  function targets(group){if(cache.has(group))return cache.get(group);stats.groupBuilds++;var list=Array.from(group.querySelectorAll(actionable)).filter(function(el){return enabled(el)&&!el.hasAttribute('data-card-action')&&!el.closest('[data-safafi-preview]')&&(!el.closest('.safafi-card')||el.matches('.safafi-card'))&&(group.matches('[role="dialog"],[role="menu"],[role="listbox"]')||el.closest(selector)===group);});cache.set(group,list);return list;}
  function layout(group){return group.dataset.focusLayout||(group.matches('form,.safafi-hero,[data-safafi-seasons]>div:last-child,[data-safafi-detail-id]')?'row':group.classList.contains('grid')?'grid':group.matches('[class*="overflow-x-auto"]')?'row':'column');}
  function columns(group){var explicit=Number(group.dataset.focusColumns);if(explicit)return explicit;var tracks=getComputedStyle(group).gridTemplateColumns,repeat=tracks&&tracks.match(/^repeat\(\s*(\d+)\s*,/);return repeat?Number(repeat[1]):tracks&&tracks!=='none'?tracks.split(/\s+/).filter(Boolean).length:1;}
  function enter(group,index,focus){var nodes=targets(group),previous=saved.get(group),target=previous&&nodes.includes(previous)?previous:nodes[Math.min(index,nodes.length-1)];if(!target)return false;saved.set(group,target);return !!focus(target,true);}
  function move(active,code,focus,scope){
    stats.moves++;
    // Option rows inside a menu (e.g. subtitle appearance): left/right within the row, up/down between rows,
    // landing on the row's current choice.
    var optionRow=scope&&active.closest&&active.closest('[data-focus-row]');
    if(optionRow&&scope.contains(optionRow)){
      var rowButtons=function(r){return Array.from(r.querySelectorAll('button')).filter(function(b){return !b.disabled;});},inRow=rowButtons(optionRow),at=inRow.indexOf(active);
      if(code===37||code===39){var rtlRow=getComputedStyle(optionRow).direction==='rtl',dir=(code===39?1:-1)*(rtlRow?-1:1),to=inRow[at+dir];if(to)focus(to,true);return true;}
      var rows=Array.from(scope.querySelectorAll('[data-focus-row]')).filter(function(r){return rowButtons(r).length;}),ri=rows.indexOf(optionRow),nextRow=rows[ri+(code===40?1:-1)];
      if(nextRow){var cand=rowButtons(nextRow),pickBtn=cand.find(function(b){return b.getAttribute('aria-checked')==='true';})||cand[Math.min(Math.max(at,0),cand.length-1)];if(pickBtn)focus(pickBtn,true);}
      return true;
    }
    var group=container(active,scope);if(!group){stats.fallbacks++;return false;}
    var mode=layout(group),nodes=targets(group),card=active.closest('.safafi-card')||(active.closest('.sf-card')&&active.closest('.sf-card').querySelector('.safafi-card')),index=nodes.indexOf(active),rtl=getComputedStyle(group).direction==='rtl'||document.documentElement.dir==='rtl';
    
    if(card&&active!==card){if(code===38){focus(card,true);return true;}index=nodes.indexOf(card);}
    if(index<0){stats.fallbacks++;return false;}
    stats.logical++;saved.set(group,active);
    var rail=document.querySelector('[data-focus-group="navigation"]'),inRail=group===rail,towardRail=rtl?39:37,awayFromRail=rtl?37:39;
    if(!scope&&rail&&inRail&&(code===awayFromRail)){if(lastContent&&lastContent.isConnected)focus(lastContent,true);else{var first=document.querySelector('main '+actionable.split(',').join(',main '));if(first)focus(first,true);}return true;}
    if(!inRail)lastContent=card||active;
    var horizontal=code===37||code===39,step=horizontal?(code===39?1:-1)*(rtl?-1:1):(code===40?1:-1),count=mode==='grid'?columns(group):1,next=index+step*(mode==='grid'&&!horizontal?count:1);
    if(mode==='grid'&&horizontal&&Math.floor(next/count)!==Math.floor(index/count))next=-1;
    if((mode==='row'&&horizontal||mode==='column'&&!horizontal||mode==='grid')&&next>=0&&next<nodes.length){saved.set(group,nodes[next]);focus(nodes[next],true);return true;}
    if(scope)return true;
    if(horizontal){var exit=group.getAttribute(code===towardRail?'data-focus-exit-start':'data-focus-exit-end'),peer=exit&&document.querySelector('[data-focus-group="'+exit+'"]');
      if(peer&&peer!==group&&targets(peer).length){var row=mode==='grid'?Math.floor(index/count):0,peerCount=layout(peer)==='grid'?columns(peer):1,peerNodes=targets(peer),remembered=saved.get(peer),landing=remembered&&peerNodes.includes(remembered)?remembered:peerNodes[Math.min(peerNodes.length-1,row*peerCount+(code===towardRail?peerCount-1:0))];if(landing){saved.set(peer,landing);focus(landing,true);return true;}}
      if(rail&&code===towardRail&&!inRail)enter(rail,0,focus);return true;}
    if(inRail)return true;
    var groups=groupCache||(groupCache=Array.from(document.querySelectorAll(selector)).filter(function(item){return item!==rail&&!item.closest('[role="dialog"],[role="menu"],[data-safafi-preview]');})),position=groups.indexOf(group),direction=code===40?1:-1;
    for(var i=position+direction;i>=0&&i<groups.length;i+=direction){var neighbor=groups[i];if(neighbor.contains(active)||group.contains(neighbor)||!targets(neighbor).length)continue;var entry=mode==='column'?(direction>0?0:Infinity):Math.max(0,mode==='grid'?index%count:index);if(enter(neighbor,entry,focus))break;}
    return true;
  }
  window.SafafiFocusGraph={move:move,stats:stats,invalidate:function(){cache=new WeakMap();groupCache=null;},reset:function(){saved=new WeakMap();cache=new WeakMap();groupCache=null;lastContent=null;}};
}());
