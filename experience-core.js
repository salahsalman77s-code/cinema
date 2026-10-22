(function(root){
  'use strict';
  var fallback=['58, 32, 55','24, 37, 58'];
  function palette(pixels){
    var buckets=Object.create(null),rank=[];
    for(var i=0;i<pixels.length;i+=4){var r=pixels[i],g=pixels[i+1],b=pixels[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
      if(pixels[i+3]<180||hi<28||lo>230)continue;
      var key=(r>>5)+','+(g>>5)+','+(b>>5),v=buckets[key]||(buckets[key]={n:0,r:0,g:0,b:0,weight:0});v.n++;v.r+=r;v.g+=g;v.b+=b;v.weight+=1+(hi-lo)/255;
    }
    Object.keys(buckets).forEach(function(key){rank.push(buckets[key]);});rank.sort(function(a,b){return b.weight-a.weight;});
    if(!rank.length)return fallback.slice();
    function rgb(v){return [Math.round(v.r/v.n),Math.round(v.g/v.n),Math.round(v.b/v.n)];}
    var first=rgb(rank[0]),second=null;
    for(var j=1;j<rank.length;j++){var candidate=rgb(rank[j]);if(candidate.reduce(function(sum,c,k){return sum+Math.abs(c-first[k]);},0)>85){second=candidate;break;}}
    return [first.join(', '),(second||first.map(function(v){return Math.round(v*.55);})).join(', ')];
  }
  function trailer(detail){
    var entries=detail&&(Array.isArray(detail.videos)?detail.videos:Array.isArray(detail.trailers)?detail.trailers:[]);
    if(!entries)return null;
    entries=entries.slice().sort(function(a,b){return Number(b&&b.official===true)-Number(a&&a.official===true);});
    for(var i=0;i<entries.length;i++){var v=entries[i];if(!v||!['trailer','teaser'].includes(String(v.type).toLowerCase()))continue;
      // The app's normalized detail feed may omit `official`; reuse its trailer
      // identifiers, prefer explicitly official entries, reject explicitly false.
      if(v.official!==false&&String(v.site).toLowerCase()==='youtube'&&/^[A-Za-z0-9_-]{11}$/.test(v.key||''))return {kind:'youtube',key:v.key};
      // Direct media must be explicitly marked as authorized in existing metadata.
      if(v.authorized===true&&v.official===true&&/^https:\/\//i.test(v.url||'')&&['video/mp4','video/webm'].includes(v.mimeType))return {kind:'video',url:v.url,mimeType:v.mimeType};
    }
    return null;
  }
  function preferences(storage){var value={cinematic:true,smartPreview:false};try{var raw=JSON.parse(storage.getItem('safafi.experience.v1'));if(raw&&typeof raw.cinematic==='boolean')value.cinematic=raw.cinematic;if(raw&&typeof raw.smartPreview==='boolean')value.smartPreview=raw.smartPreview;}catch(_){}return value;}
  root.SafafiExperienceCore={fallback:fallback,palette:palette,trailer:trailer,preferences:preferences};
}(window));
