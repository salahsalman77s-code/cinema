(function(){
  'use strict';
  var current=null,listeners=[];
  window.SafafiPlayerSource={
    get:function(){return current;},
    attach:function(state){current=state;listeners.slice().forEach(function(fn){fn(state);});},
    detach:function(){current=null;listeners.slice().forEach(function(fn){fn(null);});},
    subscribe:function(fn){listeners.push(fn);if(current)fn(current);return function(){listeners=listeners.filter(function(item){return item!==fn;});};}
  };
}());
