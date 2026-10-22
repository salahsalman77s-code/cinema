(function(){
  'use strict';
  var entries=[],listeners=new Set(),raw=null;
  function key(item){return [item.mediaType,item.id,item.season||1,item.episode||1].join(':');}
  function refresh(){try{var next=localStorage.getItem('framextv_watch_progress_v1');if(next===raw)return;raw=next;var parsed=JSON.parse(next||'[]'),old=new Map(entries.map(function(item){return [key(item),item];}));entries=Array.isArray(parsed)?parsed.filter(function(item){return item&&item.id&&Number.isFinite(item.timestamp)&&Number.isFinite(item.duration);}).slice(0,30).map(function(item){var previous=old.get(key(item));return previous&&JSON.stringify(previous)===JSON.stringify(item)?previous:item;}):[];}catch(_){entries=[];}listeners.forEach(function(fn){fn();});}
  window.SafafiProgress={latest:function(type,id){return entries.find(function(item){return item.mediaType===type&&String(item.id)===String(id);})||null;},episode:function(type,id,season,episode){return entries.find(function(item){return item.mediaType===type&&String(item.id)===String(id)&&(item.season||1)===(season||1)&&(item.episode||1)===(episode||1);})||null;},subscribe:function(fn){listeners.add(fn);return function(){listeners.delete(fn);};}};
  window.addEventListener('framextv:progress_updated',refresh);window.addEventListener('storage',refresh);refresh();
}());
