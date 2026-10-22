// Safafi Cinema — subtitle languages: reliable language detection, readable names and default choice.
// Shared by the subtitle panel and the player's automatic subtitle selection.
(function(){
  'use strict';
  // code: [Arabic name, English name, aliases (ISO 639-2, English/native names)]
  var L={ar:['العربية','Arabic','ara arabic عربي العربية'],en:['الإنجليزية','English','eng english'],fr:['الفرنسية','French','fre fra french français francais'],es:['الإسبانية','Spanish','spa spanish español espanol castilian latino'],de:['الألمانية','German','ger deu german deutsch'],tr:['التركية','Turkish','tur turkish türkçe turkce'],it:['الإيطالية','Italian','ita italian italiano'],pt:['البرتغالية','Portuguese','por portuguese português portugues brazilian'],ru:['الروسية','Russian','rus russian русский'],fa:['الفارسية','Persian','per fas persian farsi فارسی'],ur:['الأردية','Urdu','urd urdu'],hi:['الهندية','Hindi','hin hindi'],id:['الإندونيسية','Indonesian','ind indonesian bahasa'],ms:['الملايوية','Malay','may msa malay melayu'],nl:['الهولندية','Dutch','dut nld dutch nederlands'],pl:['البولندية','Polish','pol polish polski'],sv:['السويدية','Swedish','swe swedish svenska'],da:['الدنماركية','Danish','dan danish dansk'],no:['النرويجية','Norwegian','nor nob nno norwegian norsk'],fi:['الفنلندية','Finnish','fin finnish suomi'],el:['اليونانية','Greek','gre ell greek'],he:['العبرية','Hebrew','heb hebrew iw'],ja:['اليابانية','Japanese','jpn japanese'],ko:['الكورية','Korean','kor korean'],zh:['الصينية','Chinese','chi zho chinese mandarin cantonese'],ro:['الرومانية','Romanian','rum ron romanian'],hu:['المجرية','Hungarian','hun hungarian magyar'],cs:['التشيكية','Czech','cze ces czech'],bg:['البلغارية','Bulgarian','bul bulgarian'],uk:['الأوكرانية','Ukrainian','ukr ukrainian'],vi:['الفيتنامية','Vietnamese','vie vietnamese'],th:['التايلاندية','Thai','tha thai'],ku:['الكردية','Kurdish','kur kurdish'],hr:['الكرواتية','Croatian','hrv croatian'],sr:['الصربية','Serbian','srp serbian'],sk:['السلوفاكية','Slovak','slo slk slovak'],sl:['السلوفينية','Slovenian','slv slovenian'],bn:['البنغالية','Bengali','ben bengali bangla'],ta:['التاميلية','Tamil','tam tamil'],tl:['الفلبينية','Filipino','fil tgl filipino tagalog']};
  var alias={};Object.keys(L).forEach(function(code){alias[code]=code;L[code][2].split(' ').forEach(function(a){alias[a]=code;});alias[L[code][1].toLowerCase()]=code;});
  function words(s){return String(s||'').toLowerCase().replace(/[_()\[\],.\-–|/]+/g,' ').split(/\s+/).filter(Boolean);}
  // Language code of a track: the language field first (e.g. "ar", "ara", "ar-SA", "Arabic"), then whole words of the label.
  function code(sub){
    if(!sub)return '';var raw=String(sub.language||sub.lang||sub.srclang||'').toLowerCase().trim();
    if(raw){var base=raw.split(/[-_]/)[0];if(alias[base])return alias[base];if(alias[raw])return alias[raw];}
    var w=words(sub.label||sub.name||'');for(var i=0;i<w.length;i++){if(w[i].length>2&&alias[w[i]])return alias[w[i]];}
    for(i=0;i<w.length;i++){if(w[i].length===2&&alias[w[i]])return alias[w[i]];}
    return raw&&alias[raw.split(/[-_]/)[0]]||'';
  }
  function uiArabic(){try{return !window.SafafiPreferences||SafafiPreferences.getSnapshot().language!=='en';}catch(_){return true;}}
  function name(c){var e=L[c];if(e)return uiArabic()?e[0]:e[1];try{return new Intl.DisplayNames([uiArabic()?'ar':'en'],{type:'language'}).of(c)||c;}catch(_){return c;}}
  function tags(sub){var s=String((sub&&(sub.label||sub.name))||'').toLowerCase(),out=[];if(/\b(sdh|cc|hi|hearing)\b/.test(s))out.push(uiArabic()?'للصم وضعاف السمع':'SDH');if(/\bforced\b/.test(s))out.push(uiArabic()?'الحوار الأجنبي فقط':'Forced');return out;}
  function preferred(pref){if(pref==='off')return 'off';if(pref){var c=code({language:pref})||code({label:pref});if(c)return c;}return uiArabic()?'ar':'';}
  // Index to select automatically, or -1. Forced/SDH tracks are only chosen when nothing plainer exists.
  function pick(list,pref){var want=preferred(pref);if(!want||want==='off'||!list||!list.length)return -1;var best=-1,score=9;
    for(var i=0;i<list.length;i++){if(code(list[i])!==want)continue;var s=tags(list[i]).length;if(s<score){score=s;best=i;}}return best;}
  // Panel order: preferred language, then Arabic/English, then the rest by name; numbered when a language repeats.
  function order(list,pref){var want=preferred(pref),rank=function(c){return c===want?0:c==='ar'?1:c==='en'?2:c?3:4;},seen={};
    var items=(list||[]).map(function(sub,index){var c=code(sub);return {sub:sub,index:index,code:c,rank:rank(c),name:c?name(c):String(sub.label||sub.name||sub.language||'').trim()};});
    items.forEach(function(it){it.tags=tags(it.sub);});
    items.sort(function(a,b){return a.rank-b.rank||a.name.localeCompare(b.name)||a.tags.length-b.tags.length||a.index-b.index;});
    var totals={};items.forEach(function(it){if(!it.tags.length)totals[it.name]=(totals[it.name]||0)+1;});
    items.forEach(function(it){if(it.tags.length){it.label=it.name+' · '+it.tags.join('، ');return;}seen[it.name]=(seen[it.name]||0)+1;it.label=it.name+(totals[it.name]>1?' '+seen[it.name]:'');});
    return items;}
  window.SafafiSubs={code:code,name:name,pick:pick,order:order,preferred:preferred};
}());
