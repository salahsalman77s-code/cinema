// Safafi Cinema 3.0 — authored TV interface. React, Router Link and the existing data layer are injected once.
// Every component keeps the props contract of 2.1 so the routed pages, stores and player are untouched.
export function createApplication(React,Link,runtime){
  const h=React.createElement,store=window.SafafiPreferences;
  const usePreferences=()=>React.useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
  const text=(ar,en)=>store.getSnapshot().language==='en'?en:ar;
  const T=value=>window.SafafiText?window.SafafiText(value):value;
  const group=(id,layout='row',extra)=>Object.assign({'data-focus-group':id,'data-focus-layout':layout},extra||{});
  const cx=(...names)=>names.filter(Boolean).join(' ');

  /* ---------- Icons: one stroke family, 24 grid ---------- */
  const paths={
    home:'M3.5 10.5 12 3.8l8.5 6.7M6 9v11h4.5v-6h3v6H18V9',
    search:'M20.5 20.5l-4.6-4.6M17.5 10.5a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    movie:'M4 4h16v16H4zM4 9h16M4 15h16M9 4v5M15 4v5M9 15v5M15 15v5',
    series:'M3 7h18v12H3zM8 3l4 4 4-4',
    anime:'M12 3l2.6 5.8 6.4.7-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2L3 9.5l6.4-.7z',
    list:'M6 3.5h12v17l-6-4.2-6 4.2z',
    history:'M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4.5H8M12 7.5V12l3 2',
    settings:'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2.2 1.3l-.3 2H10.4l-.3-2a7.6 7.6 0 0 1-2.2-1.3l-1.9.7-2-3.4 1.6-1.2a7.4 7.4 0 0 1 0-3L4 9.3l2-3.4 1.9.7a7.6 7.6 0 0 1 2.2-1.3l.3-2h3.2l.3 2a7.6 7.6 0 0 1 2.2 1.3l1.9-.7 2 3.4-1.6 1.2a7.4 7.4 0 0 1 0 3',
    play:'M7 4.5v15l12.5-7.5z',
    info:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 11v5.5M12 7.6v.1',
    plus:'M12 5v14M5 12h14',
    check:'M5 12.5l4.5 4.5L19 7.5',
    heart:'M12 20s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 12 7.4 4.4 4.4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10',
    close:'M6 6l12 12M18 6 6 18',
    prev:'M15 5l-7 7 7 7',next:'M9 5l7 7-7 7',
    trailer:'M3 6h13v12H3zM16 10l5-3v10l-5-3',
    star:'M12 3.5l2.5 5.4 5.9.6-4.4 4 1.2 5.8L12 16.4l-5.2 2.9 1.2-5.8-4.4-4 5.9-.6z',
    back:'M20 12H5M11 5l-7 7 7 7',
    erase:'M8.5 5H20v14H8.5L3 12zM11.5 9.5l5 5M16.5 9.5l-5 5',
    globe:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3c2.7 2.6 2.7 15.4 0 18M12 3c-2.7 2.6-2.7 15.4 0 18',
    space:'M4 10v4h16v-4',grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'
  };
  function Icon({name,size=28,filled=false}){
    return h('svg',{viewBox:'0 0 24 24',width:size,height:size,fill:filled?'currentColor':'none',stroke:'currentColor',strokeWidth:filled?0:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,focusable:'false',className:'sf-icon'},h('path',{d:paths[name]||paths.movie}));
  }
  const kindLabel=type=>text(type==='tv'?'مسلسل':type==='anime'?'أنمي':'فيلم',type==='tv'?'Series':type==='anime'?'Anime':'Film');
  const pathFor=item=>{const type=item.anilistId||item.type==='anime'?'anime':item.type==='tv'?'tv':'movie',id=String(item.anilistId||runtime.normalizeId(item.id));return {type,id,detail:`/${type}/${id}`};};
  const minutes=value=>{const n=Number(value);if(!n)return null;const hrs=Math.floor(n/60),m=n%60;return store.getSnapshot().language==='en'?(hrs?`${hrs}h ${m?m+'m':''}`.trim():`${m}m`):(hrs?`${hrs} س ${m?m+' د':''}`.trim():`${m} د`);};
  const genreName=g=>typeof g==='object'&&g?g.name||g.label:g;

  /* ---------- Small shared stores ---------- */
  // Spotlight: the title currently described by the browse header (focused card).
  // Remote activity pulse: preview work (header text, backdrop decode) waits until the remote is quiet
  // so focus movement never competes with it for the main thread.
  let lastKey=0;document.addEventListener('keydown',()=>{lastKey=performance.now();},true);
  const quiet=(ms,fn)=>{let timer=0;const check=()=>{const wait=ms-(performance.now()-lastKey);if(wait>8){timer=setTimeout(check,wait);return;}fn();};timer=setTimeout(check,ms);return()=>clearTimeout(timer);};
  window.SafafiQuiet=quiet;window.SafafiInputAge=()=>performance.now()-lastKey;
  const spotlight=(()=>{let current=null,cancel=null;const listeners=new Set(),emit=()=>listeners.forEach(fn=>fn());
    return {get:()=>current,set(value,delay=240){cancel&&cancel();cancel=quiet(delay,()=>{if(current&&value&&current.key===value.key)return;current=value;emit();});},clear(){cancel&&cancel();if(current){current=null;emit();}},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};})();
  window.SafafiSpotlight=spotlight;
  const useSpotlight=()=>React.useSyncExternalStore(spotlight.subscribe,spotlight.get,spotlight.get);
  // Transient confirmation for actions that have no visible owner (long-press, removals).
  let toastNode=null,toastTimer=0;
  function toast(message){
    if(!toastNode){toastNode=document.createElement('div');toastNode.className='sf-toast';toastNode.setAttribute('role','status');toastNode.setAttribute('aria-live','polite');document.body.appendChild(toastNode);}
    toastNode.textContent=message;toastNode.dir='auto';toastNode.classList.remove('is-visible');void toastNode.offsetWidth;toastNode.classList.add('is-visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastNode&&toastNode.classList.remove('is-visible'),2400);
  }
  window.SafafiToast=toast;

  /* ---------- Artwork ---------- */
  function Artwork({src,alt='',className='',priority=false,width=500}){
    const [failed,setFailed]=React.useState(false);React.useEffect(()=>setFailed(false),[src]);
    const url=src&&window.SafafiArtwork?window.SafafiArtwork(src,width):src;
    return url&&!failed?h('img',{src:url,alt,className:cx('sf-img',className),loading:priority?'eager':'lazy',decoding:'async',fetchpriority:priority?'high':'auto',draggable:false,onLoad:e=>e.currentTarget.classList.add('is-loaded'),onError:()=>setFailed(true)})
      :h('div',{className:cx('sf-artwork-fallback',className),role:alt?'img':undefined,'aria-label':alt||undefined},h('span',null,(alt||'S').trim().slice(0,1)));
  }

  /* ---------- Shell & navigation rail ---------- */
  function Shell({path,navigate,children,utilities}){
    const prefs=usePreferences(),[expanded,setExpanded]=React.useState(false);
    const items=[['home','الرئيسية','Home','/'],['search','بحث','Search','/search'],['movie','أفلام','Movies','/movies'],['series','مسلسلات','Series','/tv'],['anime','أنمي','Anime','/anime'],['list','قائمتي','My List','/my-list'],['history','أكمل المشاهدة','Continue Watching','/history'],['settings','الإعدادات','Settings','/settings']];
    const current=to=>to==='/'?path==='/':path.startsWith(to)||(to==='/movies'&&path.startsWith('/movie/'))||(to==='/tv'&&path.startsWith('/tv/'));
    React.useEffect(()=>{document.documentElement.classList.toggle('sf-nav-open',expanded);},[expanded]);
    React.useEffect(()=>{spotlight.clear();},[path]);
    // Warm the artwork of the next rows before the anchor scroll reveals them (lazy images otherwise
    // fetch and decode mid-animation). Runs once per row change, touches at most ~16 images.
    React.useEffect(()=>{let last=null,pending=null;const lastRail=()=>last&&(last.deref?last.deref():last),keep=rail=>window.WeakRef?new WeakRef(rail):rail;const warm=e=>{const rail=e.target&&e.target.closest&&e.target.closest('.sf-rail');if(!rail||rail===lastRail())return;last=keep(rail);pending&&pending();pending=quiet(120,()=>{pending=null;warmRail(rail);});};const warmRail=rail=>{const all=Array.from(document.querySelectorAll('.sf-rail')),i=all.indexOf(rail);
      [all[i+1],all[i+2],all[i-1]].forEach(next=>{if(!next)return;Array.from(next.querySelectorAll('img[loading="lazy"]')).slice(0,7).forEach(img=>{img.loading='eager';});});
      Array.from(rail.querySelectorAll('img[loading="lazy"]')).slice(0,10).forEach(img=>{img.loading='eager';});};
      document.addEventListener('focusin',warm,true);return()=>{pending&&pending();document.removeEventListener('focusin',warm,true);};},[]);
    // Stream prefetch: when focus rests on a Play link, resolve its stream in the background so playback
    // starts with sources already in hand (the player takes the result instead of asking again).
    React.useEffect(()=>{let cancel=null;const onFocus=e=>{cancel&&cancel();cancel=null;const a=e.target&&e.target.closest&&e.target.closest('a[href*="/watch/"]');if(!a||!window.SafafiStreamPrefetch)return;
      const m=/#\/watch\/(?!anime\/)([^/?#]+)(?:\/(\d+)\/(\d+))?/.exec(a.getAttribute('href')||'');if(!m)return;
      cancel=quiet(600,()=>{cancel=null;try{SafafiStreamPrefetch.start(m[2]?'tv':'movie',decodeURIComponent(m[1]),m[2],m[3]);}catch(_){}});};
      document.addEventListener('focusin',onFocus,true);return()=>{cancel&&cancel();document.removeEventListener('focusin',onFocus,true);};},[]);
    return h('div',{className:'safafi-shell sf-app','data-ui-version':'3.3.0',dir:prefs.language==='ar'?'rtl':'ltr'},
      h('aside',{className:'sf-navigation','data-expanded':expanded,onFocus:()=>setExpanded(true),onBlur:e=>{if(!e.currentTarget.contains(e.relatedTarget))setExpanded(false);}},
        h('div',{className:'sf-nav-scrim','aria-hidden':true}),
        h('div',{className:'sf-brand'},h('img',{src:'./branding/safafi-mark.png',alt:'',width:56,height:56,decoding:'async'}),h('span',{className:'sf-brand-word'},'SAFAFI',h('small',null,'CINEMA'))),
        h('nav',{...group('navigation','column'),'aria-label':text('القائمة الرئيسية','Main navigation')},items.map(([icon,ar,en,to])=>h('button',{type:'button',key:to,'data-nav-path':to,'aria-label':text(ar,en),'aria-current':current(to)?'page':undefined,onClick:()=>navigate(to)},h('span',{'aria-hidden':true,className:'sf-nav-icon'},h(Icon,{name:icon,size:30})),h('span',{className:'sf-nav-label'},text(ar,en))))),
        h('div',{className:'sf-nav-caption'},'Safafi Cinema 3.2')),
      // Web: a back button on inner screens (installed phone apps have no browser bar to go back with).
      !(window.SafafiPlatform&&SafafiPlatform.tv)&&!['/','/search','/movies','/tv','/anime','/my-list','/history','/settings'].includes(path)&&!path.startsWith('/watch')&&!path.startsWith('/embed')&&
        h('button',{type:'button',className:'sf-web-back','aria-label':text('رجوع','Back'),onClick:()=>{if(history.length>1)history.back();else navigate('/');}},h(Icon,{name:prefs.language==='ar'?'next':'prev',size:24})),
      h('main',{id:'safafi-content',className:'sf-content',key:prefs.language},children),
      h('div',{className:'sf-utilities'},utilities));
  }

  /* ---------- Stage: full-bleed backdrop that follows the spotlight ---------- */
  function Stage({image:base,follow=false,className=''}){
    const refs=[React.useRef(null),React.useRef(null)],front=React.useRef(0),shown=React.useRef(''),[image,setImage]=React.useState(base);
    React.useEffect(()=>{setImage(base);},[base]);
    React.useEffect(()=>{if(!follow)return;let timer=null;const update=()=>{timer&&timer();const spot=spotlight.get();timer=quiet(spot?650:0,()=>setImage((spot&&spot.backdrop)||base));};const off=spotlight.subscribe(update);return()=>{timer&&timer();off();};},[follow,base]);
    React.useEffect(()=>{
      if(!image||image===shown.current)return;const back=refs[1-front.current].current,face=refs[front.current].current;if(!back)return;
      let cancelled=false;const url=window.SafafiArtwork?window.SafafiArtwork(image,1280):image;
      const reveal=()=>{if(cancelled)return;if(performance.now()-lastKey<300){quiet(300,reveal);return;}shown.current=image;back.classList.add('is-front');face&&face.classList.remove('is-front');front.current=1-front.current;};
      back.onerror=()=>{};back.src=url;if(back.decode)back.decode().then(reveal,()=>{back.onload=reveal;});else{back.onload=reveal;if(back.complete&&back.naturalWidth)reveal();}
      return()=>{cancelled=true;back.onload=null;};
    },[image]);
    return h('div',{className:cx('sf-stage',className),'aria-hidden':true},
      h('img',{ref:refs[0],className:'sf-stage-image',alt:'',decoding:'async'}),h('img',{ref:refs[1],className:'sf-stage-image',alt:'',decoding:'async'}),
      h('div',{className:'sf-stage-scrim'}));
  }
  function Meta({items}){const list=items.filter(v=>v!==null&&v!==undefined&&v!=='');return list.length?h('div',{className:'sf-metadata'},list.map((v,i)=>typeof v==='object'&&v&&v.$$typeof?h(React.Fragment,{key:i},v):h('span',{key:i},String(v)))):null;}
  const ratingBadge=rating=>rating&&Number(rating)>0?h('b',{className:'sf-rating-badge'},h(Icon,{name:'star',size:18,filled:true}),Number(rating).toFixed(1)):null;

  // Browse mode: once focus enters a row, the page keeps the focused row on a fixed anchor line,
  // fades rows above it, and the spotlight header describes the focused title.
  function useBrowse(rootRef){
    React.useEffect(()=>{
      const section=rootRef.current,screen=section&&section.closest('[data-safafi-screen]');if(!screen)return;
      screen.setAttribute('data-sf-anchor','browse');let lastRail=null;
      const rails=()=>Array.from(screen.querySelectorAll('.sf-rail'));
      const onFocus=e=>{
        const rail=e.target.closest&&e.target.closest('.sf-rail');
        if(!rail||!screen.contains(rail)){if(screen.contains(e.target)||!e.target.closest('.sf-navigation')){screen.removeAttribute('data-browse');lastRail=null;rails().forEach(r=>r.removeAttribute('data-pos'));if(section.contains(e.target))spotlight.clear();}return;}
        screen.setAttribute('data-browse','');if(rail===lastRail)return;lastRail=rail;
        const all=rails(),index=all.indexOf(rail);all.forEach((r,i)=>{const pos=i<index?'above':i===index?'current':'below';if(r.getAttribute('data-pos')!==pos)r.setAttribute('data-pos',pos);});
      };
      document.addEventListener('focusin',onFocus,true);
      return()=>{document.removeEventListener('focusin',onFocus,true);screen.removeAttribute('data-browse');screen.removeAttribute('data-sf-anchor');spotlight.clear();};
    },[]);
  }
  function Spotlight(){
    usePreferences();const item=useSpotlight();
    if(!item)return h('div',{className:'sf-spotlight','aria-hidden':true});
    return h('div',{className:'sf-spotlight','aria-hidden':true},
      h('span',{className:'sf-eyebrow'},item.eyebrow||kindLabel(item.type)),
      h('h2',{dir:'auto'},item.title),
      h(Meta,{items:[ratingBadge(item.rating),item.year,minutes(item.runtime),...(item.genres||[]).slice(0,3).map(genreName),item.extra]}),
      item.overview?h('p',{className:'sf-synopsis',dir:'auto'},item.overview):null,
      item.progress>0?h('div',{className:'sf-spot-progress'},h('i',{style:{width:item.progress+'%'}})):null,
      h('p',{className:'sf-hint'},text('اضغط مطوّلًا على OK لإضافة العنوان إلى قائمتي','Hold OK to add this title to My List')));
  }

  /* ---------- Hero billboard ---------- */
  function Hero({item,items=[],isLoading=false}){
    usePreferences();const ref=React.useRef(null),[index,setIndex]=React.useState(0);
    const featured=React.useMemo(()=>{const seen=new Set();return [item,...items].filter(Boolean).filter(x=>{const key=x.type+':'+x.id;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,6);},[item,items]);
    React.useEffect(()=>setIndex(0),[item&&item.id]);useBrowse(ref);
    const movie=featured[index]||featured[0],cinematic=window.SafafiExperienceCore?window.SafafiExperienceCore.preferences(localStorage).cinematic:true;
    if(!movie)return h('section',{ref,className:'sf-hero sf-hero-empty safafi-hero','aria-busy':isLoading},h(Stage,{image:null}),h('div',{className:'sf-hero-copy'},isLoading?h('div',{className:'sf-hero-skeleton',role:'status','aria-label':text('جارٍ تجهيز العناوين…','Loading titles…')},h('i'),h('i'),h('i'),h('i')):h('p',{className:'sf-empty-line'},text('لا تتوفر عناوين حاليًا.','No titles available right now.'))));
    const {type,id,detail}=pathFor(movie),progress=window.SafafiProgress&&window.SafafiProgress.latest(type,id),resume=progress&&!progress.completed&&progress.timestamp>15;
    const watch=type==='tv'?`/watch/${id}/${resume?progress.season||1:movie.season||1}/${resume?progress.episode||1:movie.episode||1}`:type==='anime'?`/watch/anime/${id}${resume?'/'+(progress.episode||1):''}`:`/watch/${id}`;
    const percent=resume&&progress.duration>0?Math.min(100,100*progress.timestamp/progress.duration):0;
    return h('section',{ref,className:'sf-hero safafi-hero'},
      h(Stage,{image:movie.backdrop||movie.poster,follow:cinematic}),
      // Phones show the portrait poster as a card (hidden on TV/desktop, where lazy loading skips it).
      movie.poster&&h('div',{className:'sf-hero-poster','aria-hidden':true,key:'poster'+movie.type+movie.id},h(Artwork,{src:movie.poster,width:500})),
      h('div',{className:'sf-hero-copy',key:movie.type+movie.id},
        h('span',{className:'sf-eyebrow'},h('i',{className:'sf-eyebrow-mark','aria-hidden':true}),text('مختارات صفافي','Safafi Selects')+' · '+kindLabel(type)),
        h('h1',{dir:'auto'},movie.title||movie.name),
        h(Meta,{items:[ratingBadge(movie.rating),movie.year,minutes(movie.runtime),...(movie.genres||[]).slice(0,3).map(genreName)]}),
        h('p',{className:'sf-synopsis',dir:'auto'},movie.overview||movie.synopsis||''),
        percent>0&&h('div',{className:'sf-hero-progress'},h('div',null,h('i',{style:{width:percent+'%'}})),h('span',null,text('تابع من حيث توقفت','Pick up where you left off'))),
        h('div',{...group('hero-actions'),className:'sf-actions'},
          h(Link,{to:watch,className:'sf-button sf-primary','data-sf-autofocus':''},h(Icon,{name:'play',filled:true}),text(resume?'أكمل المشاهدة':'شاهد الآن',resume?'Resume':'Play')),
          h(Link,{to:detail,className:'sf-button'},h(Icon,{name:'info'}),text('التفاصيل','More info')),
          featured.length>1&&h('button',{type:'button',className:'sf-icon-button',onClick:()=>setIndex((index+1)%featured.length),'aria-label':text('العنوان التالي','Next featured title')},h(Icon,{name:store.getSnapshot().language==='ar'?'prev':'next'})))),
      featured.length>1&&h('div',{className:'sf-pager','aria-hidden':true},featured.map((_,i)=>h('i',{key:i,className:i===index?'is-active':undefined}))),
      h(Spotlight));
  }

  /* ---------- Rails ---------- */
  // Windowed rails: only the first cards (one screen plus a margin) mount at boot. The rest mount when
  // focus is in or next to the rail, during a quiet moment, so startup builds far less DOM and focus
  // movement never waits for it. Expanded rails are remembered per screen for focus restoration on Back.
  const RAIL_INITIAL=8,railMemory=new Set();
  function Rail({title,subtitle,count,kind='titles',focusId,trackRef,moreTo,moreLabel,children,className='',testId}){
    usePreferences();
    const list=React.Children.toArray(children),windowed=kind==='titles'&&list.length>RAIL_INITIAL+2;
    const memKey=(location.hash||'#/').split('?')[0]+'|'+(typeof title==='string'?title:testId||focusId||'');
    const own=React.useRef(null),[full,setFull]=React.useState(()=>!windowed||railMemory.has(memKey));
    React.useEffect(()=>{
      if(full||!windowed)return;const node=own.current;if(!node)return;let cancel=null,lastRail=null;
      const expand=()=>{railMemory.add(memKey);setFull(true);};
      const onFocus=e=>{const t=e.target,rail=t&&t.closest&&t.closest('.sf-rail');if(!rail)return;
        if(rail===node){const card=t.closest('.safafi-card'),cards=node.getElementsByClassName('safafi-card');
          if(card&&Array.prototype.indexOf.call(cards,card)>=RAIL_INITIAL-3){cancel&&cancel();expand();return;}
          if(rail!==lastRail){lastRail=rail;cancel&&cancel();cancel=quiet(160,expand);}return;}
        if(rail===lastRail)return;lastRail=rail;const all=Array.from(document.getElementsByClassName('sf-rail')),gap=Math.abs(all.indexOf(rail)-all.indexOf(node));
        if(gap===1){cancel&&cancel();cancel=quiet(400,expand);}};
      document.addEventListener('focusin',onFocus,true);
      return()=>{cancel&&cancel();document.removeEventListener('focusin',onFocus,true);};
    },[full,windowed]);
    const shown=full?list:list.slice(0,RAIL_INITIAL);
    return h('section',{ref:own,className:cx('sf-rail safafi-rail',className),'data-kind':kind,'data-testid':testId},
      title&&h('header',{className:'sf-rail-head'},h('h2',{dir:'auto'},title),typeof count==='number'&&count>0?h('span',{className:'sf-rail-count'},count):null,subtitle&&h('p',{dir:'auto'},subtitle)),
      h('div',{ref:trackRef,...group(focusId||'rail','row'),className:'sf-rail-track'},shown,
        moreTo&&full&&h(Link,{to:moreTo,className:'sf-more-tile','aria-label':moreLabel||T('عرض الكل')},h('span',null,h(Icon,{name:'grid',size:34}),moreLabel||T('عرض الكل')))));
  }
  function RailSkeleton({title,count=6}){return h('section',{className:'sf-rail sf-rail-skeleton','aria-busy':true,role:'status','aria-label':title||text('جارٍ التحميل','Loading')},h('header',{className:'sf-rail-head'},title?h('h2',null,title):h('i',{className:'sf-skel-line'})),h('div',{className:'sf-rail-track'},Array.from({length:count},(_,i)=>h('div',{key:i,className:'sf-card sf-card-skeleton'},h('div',{className:'sf-card-art'})))));}
  function GridSkeleton({count=12}){return h('div',{className:'sf-grid','aria-busy':true,role:'status','aria-label':text('جارٍ التحميل','Loading')},Array.from({length:count},(_,i)=>h('div',{key:i,className:'sf-card sf-card-skeleton'},h('div',{className:'sf-card-art'}))));}

  /* ---------- Cards ---------- */
  function Card({to,id,type,title,year,rating,image,saved,onFavorite,overview,genres}){
    usePreferences();
    const progress=React.useSyncExternalStore(window.SafafiProgress.subscribe,()=>window.SafafiProgress.latest(type,id),()=>null),percent=progress&&progress.duration>0?Math.min(100,100*progress.timestamp/progress.duration):0;
    const favorite=e=>{onFavorite&&onFavorite(e);toast(saved?text('أُزيل من قائمتي: ','Removed from My List: ')+title:text('أُضيف إلى قائمتي: ','Added to My List: ')+title);};
    const focus=()=>spotlight.set({key:type+':'+id,title,year,rating,type,overview,genres,backdrop:image,progress:percent});
    return h('article',{className:'sf-card','data-saved':saved?'':undefined},
      h(Link,{to,className:'safafi-card','data-testid':'media-card','data-media-id':id,'data-media-type':type,'aria-label':[title,year,kindLabel(type)].filter(Boolean).join('، '),onFocus:focus},
        h('div',{className:'sf-card-art'},h(Artwork,{src:image,alt:'',width:500}),h('div',{className:'sf-card-scrim'}),
          h('div',{className:'sf-card-body'},h('h3',{dir:'auto'},title),h('div',{className:'sf-card-meta'},[year,kindLabel(type),rating&&Number(rating)>0?'★ '+Number(rating).toFixed(1):null].filter(Boolean).join(' · '))),
          saved&&h('span',{className:'sf-card-saved','aria-hidden':true},h(Icon,{name:'check',size:18})),
          percent>0&&h('div',{className:'sf-card-progress',role:'progressbar','aria-label':text('تقدّم المشاهدة','Watch progress'),'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.round(percent)},h('i',{style:{width:percent+'%'}})))),
      h('button',{type:'button',tabIndex:-1,'data-card-action':true,'data-testid':'card-watchlist-btn','aria-pressed':saved,'aria-label':text(saved?'إزالة من قائمتي':'أضف إلى قائمتي',saved?'Remove from My List':'Add to My List'),onClick:favorite},h(Icon,{name:saved?'check':'plus',size:22})));
  }
  // Continue-watching card shared by the home row and the history screen.
  function ContinueCard({item,to,onRemove}){
    usePreferences();const percent=item.duration>0?Math.min(100,100*item.timestamp/item.duration):0;
    const left=item.duration>item.timestamp?Math.ceil((item.duration-item.timestamp)/60):0;
    const label=item.mediaType==='tv'?`S${item.season||1} · E${item.episode||1}`:item.mediaType==='anime'?text('الحلقة ','Episode ')+(item.episode||1):kindLabel('movie');
    const remaining=item.completed?text('شاهد مجددًا','Watch again'):left?text(`متبقٍ ${left} د`,`${left} min left`):'';
    const remove=e=>{e.preventDefault();e.stopPropagation();onRemove&&onRemove(item);toast(text('أُزيل من المتابعة: ','Removed: ')+(item.title||''));};
    const focus=()=>spotlight.set({key:'cw:'+item.mediaType+':'+item.id,title:item.title,type:item.mediaType,backdrop:item.poster,eyebrow:text('أكمل المشاهدة','Continue watching')+' · '+label,extra:remaining,progress:percent});
    return h('article',{className:'sf-card sf-continue-card'},
      h(Link,{to,className:'safafi-card','data-media-id':item.id,'data-media-type':item.mediaType,'data-testid':'continue-watching-card','aria-label':[item.title,label,remaining].filter(Boolean).join('، '),onFocus:focus},
        h('div',{className:'sf-card-art'},h(Artwork,{src:item.poster,alt:'',width:500}),h('div',{className:'sf-card-scrim'}),
          h('span',{className:'sf-card-play','aria-hidden':true},h(Icon,{name:'play',size:30,filled:true})),
          h('div',{className:'sf-card-body'},h('h3',{dir:'auto'},item.title||text('بدون عنوان','Untitled')),h('div',{className:'sf-card-meta'},[label,remaining].filter(Boolean).join(' · '))),
          h('div',{className:'sf-card-progress',role:'progressbar','aria-label':text('تقدّم المشاهدة','Watch progress'),'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.round(percent),'data-testid':'continue-watching-progress-bar'},h('i',{style:{width:percent+'%'}})))),
      onRemove&&h('button',{type:'button',tabIndex:-1,'data-card-action':true,'aria-label':text('إزالة من المتابعة','Remove from Continue Watching'),onClick:remove},h(Icon,{name:'close',size:22})));
  }
  const watchURL=item=>item.mediaType==='anime'?`/watch/anime/${item.id}/${item.episode||1}`:item.mediaType==='tv'?`/watch/${item.id}/${item.season||1}/${item.episode||1}`:`/watch/${runtime.normalizeId(item.id)}`;

  const clock=sec=>{sec=Math.max(0,Math.floor(sec||0));const hh=Math.floor(sec/3600),mm=Math.floor(sec%3600/60),ss=sec%60;return (hh?hh+':'+String(mm).padStart(2,'0'):mm)+':'+String(ss).padStart(2,'0');};
  const resumeLabel=(p,fallback)=>{if(!p||!(p.timestamp>0))return fallback;const left=p.duration>p.timestamp?Math.ceil((p.duration-p.timestamp)/60):0,ep=p.mediaType==='tv'?`S${p.season||1}:E${p.episode||1} · `:p.mediaType==='anime'?text('الحلقة ','Episode ')+(p.episode||1)+' · ':'';return ep+text('تابع من ','Resume from ')+clock(p.timestamp)+(left?text(` · متبقٍ ${left} د`,` · ${left} min left`):'');};
  /* ---------- Details ---------- */
  function Details(props){
    usePreferences();const {detail,playUrl,resumeSubtitle,isSaved,onToggleWatchlist,trailerComponent:Trailer}=props,[trailerOpen,setTrailerOpen]=React.useState(false);
    const video=(detail.videos||[]).find(v=>v.site==='YouTube'&&v.official!==false&&/^[\w-]{11}$/.test(v.key)&&['Trailer','Teaser'].includes(v.type));
    const type=detail.type,progress=window.SafafiProgress&&window.SafafiProgress.latest(type==='anime'?'anime':type,String(detail.id)),percent=resumeSubtitle&&progress&&progress.duration>0?Math.min(100,100*progress.timestamp/progress.duration):0;
    const cast=(detail.cast||[]).slice(0,4).map(c=>c.name).filter(Boolean);
    const seasons=detail.numberOfSeasons?text(`${detail.numberOfSeasons} مواسم`,`${detail.numberOfSeasons} seasons`):null;
    return h('section',{'data-safafi-detail-id':detail.id,'data-safafi-detail-type':detail.type,className:'sf-details'},
      h('div',{className:'sf-detail-stage','aria-hidden':true},h(Artwork,{src:detail.backdrop||detail.poster,priority:true,width:1280}),h('div',{className:'sf-stage-scrim'})),
      h('div',{className:'sf-detail-copy'},
        h('span',{className:'sf-eyebrow'},h('i',{className:'sf-eyebrow-mark','aria-hidden':true}),kindLabel(type),detail.status?' · '+detail.status:''),
        h('h1',{dir:'auto'},detail.title),
        detail.tagline&&h('p',{className:'sf-tagline',dir:'auto'},detail.tagline),
        h(Meta,{items:[ratingBadge(detail.rating),detail.year,minutes(detail.runtime),seasons,...(detail.genres||[]).slice(0,4).map(genreName)]}),
        h('p',{className:'sf-synopsis',dir:'auto'},detail.overview||''),
        cast.length>0&&h('p',{className:'sf-credits',dir:'auto'},h('span',null,text('بطولة: ','Starring: ')),cast.join(text('، ',', '))),
        h('div',{...group('detail-actions'),className:'sf-actions'},
          props.released!==false?h(Link,{to:playUrl,className:'sf-button sf-primary','data-testid':'detail-play-btn'},h(Icon,{name:'play',filled:true}),text(resumeSubtitle?'أكمل المشاهدة':'شاهد الآن',resumeSubtitle?'Resume':'Play')):h('span',{className:'sf-unavailable'},text('لم يُعرض بعد','Not released yet')),
          onToggleWatchlist&&h('button',{type:'button',className:'sf-button','data-testid':'detail-watchlist-btn','aria-pressed':isSaved,onClick:()=>{onToggleWatchlist();toast(isSaved?text('أُزيل من قائمتي','Removed from My List'):text('أُضيف إلى قائمتي','Added to My List'));}},h(Icon,{name:isSaved?'check':'plus'}),text(isSaved?'في قائمتي':'قائمتي',isSaved?'In My List':'My List')),
          video&&h('button',{type:'button',className:'sf-button',onClick:()=>setTrailerOpen(true)},h(Icon,{name:'trailer'}),text('الإعلان','Trailer'))),
        resumeSubtitle&&h('div',{className:'sf-resume'},percent>0&&h('div',{className:'sf-resume-bar'},h('i',{style:{width:percent+'%'}})),h('span',{dir:'auto'},resumeLabel(progress,resumeSubtitle)))),
      video&&Trailer&&h(Trailer,{video,isOpen:trailerOpen,onClose:()=>setTrailerOpen(false),title:detail.title}));
  }
  function DetailSkeleton(){return h('div',{'data-safafi-state':'loading',role:'status','aria-label':text('جارٍ تحميل التفاصيل','Loading details'),className:'sf-details sf-details-skeleton'},h('div',{className:'sf-detail-copy'},h('i',{className:'sf-skel-line w20'}),h('i',{className:'sf-skel-line w60 tall'}),h('i',{className:'sf-skel-line w40'}),h('i',{className:'sf-skel-line w80'}),h('i',{className:'sf-skel-line w70'}),h('div',{className:'sf-actions'},h('i',{className:'sf-skel-pill'}),h('i',{className:'sf-skel-pill'}))));}
  function DetailError({title,message,onRetry}){
    usePreferences();
    return h('div',{'data-safafi-state':'error',role:'status',className:'sf-message'},h('div',null,h('span',{className:'sf-message-icon','aria-hidden':true},'!'),h('h2',null,text('تعذّر عرض هذا العنوان','This title is unavailable')),h('p',{dir:'auto'},message||title),
      h('div',{...group('error-actions'),className:'sf-actions'},onRetry&&h('button',{type:'button',className:'sf-button sf-primary',onClick:onRetry},text('حاول مجددًا','Try again')),h(Link,{to:'/search',className:'sf-button'},h(Icon,{name:'search'}),text('البحث','Search')),h(Link,{to:'/',className:'sf-button'},h(Icon,{name:'home'}),text('الرئيسية','Home')))));
  }
  function Cast({cast,title}){
    usePreferences();if(!cast||!cast.length)return null;
    return h(Rail,{title:title||text('طاقم العمل','Cast'),kind:'cast',focusId:'cast'},cast.slice(0,14).map((m,i)=>h('div',{key:(m.id||m.name)+':'+i,className:'sf-person','data-safafi-cast':true,tabIndex:0,'aria-label':m.name+(m.character?' — '+m.character:'')},h('div',{className:'sf-person-photo'},h(Artwork,{src:m.profile,alt:'',width:185})),h('strong',{dir:'auto'},m.name),m.character&&h('span',{dir:'auto'},m.character))));
  }

  /* ---------- Settings ---------- */
  function SettingsSection({id,title,children}){return h('section',{...group(id,'column'),className:'sf-settings-section'},h('header',null,h('h2',null,title)),h('div',{className:'sf-settings-fields'},children));}
  function Settings(){
    const prefs=usePreferences(),[revision,setRevision]=React.useState(0),[diagnostics,setDiagnostics]=React.useState(null);
    React.useEffect(()=>{const fn=()=>setRevision(v=>v+1);window.addEventListener('safafi:preferences',fn);if(window.SafafiPendingSettingFocus){const el=document.getElementById(window.SafafiPendingSettingFocus);delete window.SafafiPendingSettingFocus;if(el)window.SafafiRemote&&window.SafafiRemote.focus(el,true);}return()=>window.removeEventListener('safafi:preferences',fn);},[]);
    const read=(key,fallback)=>store.read(key,fallback),write=(key,value)=>store.write(key,value),sub=(()=>{try{return JSON.parse(read('framextv_subtitle_preferences','{}'));}catch(_){return {};}})(),experience=window.SafafiExperienceCore.preferences(localStorage);
    const subtitle=(name,value)=>write('framextv_subtitle_preferences',JSON.stringify({...sub,[name]:value}));
    const field=(id,label,value,options,onChange)=>h('label',{className:'sf-setting',key:id},h('span',null,label),h('select',{id,value,'aria-label':label,onChange:e=>onChange(e.target.value)},options.map(([v,label])=>h('option',{key:v,value:v},label))));
    const toggle=(id,ar,en,enabled,onClick,hintAr,hintEn)=>h('button',{type:'button',key:id,id,role:'switch','aria-checked':enabled,className:'sf-setting sf-toggle',onClick},h('span',null,text(ar,en),hintAr&&h('small',null,text(hintAr,hintEn))),h('b',{'aria-hidden':true},h('i')));
    return h('section',{'data-safafi-screen':'settings',className:'sf-page sf-settings','data-revision':revision},
      h('div',{className:'sf-page-heading'},h('span',{className:'sf-eyebrow'},h('i',{className:'sf-eyebrow-mark','aria-hidden':true}),'SAFAFI CINEMA'),h('h1',null,text('الإعدادات','Settings')),h('p',null,text('اجعل السينما على ذوقك. تُحفظ التفضيلات على هذا التلفاز.','Make cinema yours. Preferences are saved on this TV.'))),
      h(SettingsSection,{id:'settings-interface',title:text('الواجهة','Interface')},
        field('sf-language',text('لغة الواجهة','Interface language'),prefs.language,[['ar','العربية'],['en','English']],value=>{window.SafafiPendingSettingFocus='sf-language';store.set({language:value});}),
        field('sf-motion',text('الحركة','Motion'),prefs.motion,[['standard',text('انتقالات سينمائية','Cinematic transitions')],['reduced',text('تقليل الحركة','Reduced motion')]],value=>store.set({motion:value})),
        toggle('sf-cinematic','الخلفية السينمائية','Cinematic backdrop',experience.cinematic,()=>write('safafi.experience.v1',JSON.stringify({...experience,cinematic:!experience.cinematic})),'تتبدّل خلفية الصفحة مع العنوان المحدد','The backdrop follows the focused title'),
        toggle('sf-preview','المعاينات الصامتة','Silent previews',experience.smartPreview,()=>write('safafi.experience.v1',JSON.stringify({...experience,smartPreview:!experience.smartPreview})),'تشغيل الإعلان بعد ثوانٍ من التوقف على عنوان','Play the trailer after resting on a title'),
        (window.SafafiPlatform&&SafafiPlatform.tv)&&toggle('sf-native','مشغّل التلفاز الأصلي','Native TV player',read('safafi.nativePlayer','on')!=='off',()=>{const on=read('safafi.nativePlayer','on')==='off';write('safafi.nativePlayer',on?'on':'off');try{sessionStorage.removeItem('sf.native.off');}catch(_){}},'تشغيل الفيديو بعتاد التلفاز: بداية أسرع وتقديم أنعم، مع رجوع تلقائي لمشغّل الويب عند الحاجة','Hardware video decoding: faster start and smoother seeking, with automatic web fallback'),
        toggle('sf-sounds','أصوات التنقّل','Navigation sounds',read('safafi.uiSounds',window.SafafiPlatform&&SafafiPlatform.tv?'on':'off')!=='off',()=>write('safafi.uiSounds',read('safafi.uiSounds',window.SafafiPlatform&&SafafiPlatform.tv?'on':'off')==='off'?'on':'off'))),
      h(SettingsSection,{id:'settings-playback',title:text('الترجمة والتشغيل','Subtitles and playback')},
        field('sf-sub-language',text('لغة الترجمة المفضلة','Preferred subtitle language'),sub.preferredLanguage||'auto',[['auto',text('تلقائي','Auto')],['off',text('بدون ترجمة','Subtitles off')],['ar','العربية'],['en','English']],value=>subtitle('preferredLanguage',value==='auto'?null:value)),
        field('sf-sub-size',text('حجم الترجمة','Subtitle size'),sub.fontSize||'md',[['sm',text('صغير','Small')],['md',text('متوسط','Medium')],['lg',text('كبير','Large')],['xl',text('كبير جدًا','Extra large')],['3xl',text('الأكبر','Largest')]],value=>subtitle('fontSize',value)),
        field('sf-sub-position',text('موضع الترجمة','Subtitle position'),sub.position||'bottom',[['bottom',text('أسفل','Bottom')],['mid',text('وسط','Middle')],['top',text('أعلى','Top')]],value=>subtitle('position',value)),
        field('sf-sub-background',text('خلفية الترجمة','Subtitle background'),sub.bgOpacity||'dark',[['dark',text('داكنة','Dark')],['semi',text('شفافة جزئيًا','Translucent')],['none',text('دون خلفية','None')],['solid',text('ثابتة','Solid')]],value=>subtitle('bgOpacity',value)),
        field('sf-sub-color',text('لون الترجمة','Subtitle color'),sub.textColor||'white',[['white',text('أبيض','White')],['yellow',text('أصفر','Yellow')],['cyan',text('سماوي','Cyan')]],value=>subtitle('textColor',value)),
        field('sf-aspect',text('نسبة عرض الفيديو','Video aspect ratio'),read('framextv_aspect_ratio','auto'),[['auto',text('تلقائي','Auto')],['16:9','16:9'],['4:3','4:3'],['21:9','21:9'],['1:1','1:1']],value=>write('framextv_aspect_ratio',value)),
        field('sf-audio',text('تعزيز الصوت','Audio enhancement'),read('framextv_audio_boost','off'),[['off',text('متوقف','Off')],['150','150%'],['200','200%'],['300','300%'],['dialogue',text('الحوار','Dialogue')]],value=>{write('framextv_audio_boost',value);window.dispatchEvent(new CustomEvent('framextv:audio_boost_preference',{detail:{boost:value}}));}),
        toggle('sf-autonext','تشغيل الحلقة التالية تلقائيًا','Autoplay next episode',read('framextv_autoplay_next','true')!=='false',()=>{const enabled=read('framextv_autoplay_next','true')==='false';write('framextv_autoplay_next',String(enabled));window.dispatchEvent(new CustomEvent('framextv:autoplay_preference',{detail:{enabled}}));})),
      h(SettingsSection,{id:'settings-about',title:text('عن التطبيق','About')},h('p',{className:'sf-about'},'Safafi Cinema 3.3 · '+(window.SafafiPlatform&&SafafiPlatform.tv?'Samsung Tizen':text('نسخة الويب','Web'))),h('p',{className:'sf-about'},text('الجودات والصوت والترجمة تعتمد على المصدر المتاح.','Quality, audio and subtitles depend on the available source.')),
        (window.SafafiPlatform&&SafafiPlatform.tv)&&h('button',{type:'button',className:'sf-button',onClick:()=>setDiagnostics({platform:window.SafafiPlatform.tv?'Samsung TV':'Desktop',viewport:`${innerWidth} × ${innerHeight}`,online:navigator.onLine,focus:window.SafafiFocusGraph.stats,artwork:window.SafafiArtwork.stats(),heap:performance.memory?performance.memory.usedJSHeapSize:null})},text('فحص الجهاز','Show diagnostics')),diagnostics&&h('pre',{className:'sf-diagnostics',dir:'ltr'},JSON.stringify(diagnostics,null,2)),(window.SafafiPlatform&&SafafiPlatform.tv)&&h(Link,{to:'/configurator',className:'sf-button'},text('أدوات الإعداد المتقدمة','Advanced configuration'))));
  }

  /* ---------- Episodes ---------- */
  function EpisodeProgress({type='tv',id,season=1,episode=1}){
    const value=React.useSyncExternalStore(window.SafafiProgress.subscribe,()=>window.SafafiProgress.episode(type,id,season,episode),()=>null);
    if(!value)return null;const percent=value.duration>0?Math.min(100,100*value.timestamp/value.duration):0;
    return h('div',{className:'sf-episode-progress',role:'progressbar','aria-label':text(value.completed?'تمت المشاهدة':'تقدّم الحلقة',value.completed?'Watched':'Episode progress'),'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.round(percent)},h('i',{style:{width:(value.completed?100:percent)+'%'}}));
  }
  function EpisodeCard({episode,available,to,tvId,season,unavailable}){
    usePreferences();
    const art=h('div',{className:'sf-episode-art',key:'art'},h(Artwork,{src:episode.still,alt:'',width:500}),h('span',{className:'sf-episode-number'},episode.number),available&&h('span',{className:'sf-card-play','aria-hidden':true},h(Icon,{name:'play',size:30,filled:true})),available?h(EpisodeProgress,{id:tvId,season,episode:episode.number}):h('span',{className:'sf-episode-flag'},text(unavailable?'غير متاح':'قريبًا',unavailable?'Unavailable':'Coming soon')));
    const copy=h('div',{className:'sf-episode-copy',key:'copy'},h('h3',{dir:'auto'},episode.name||text('الحلقة '+episode.number,'Episode '+episode.number)),h('div',{className:'sf-episode-meta'},[minutes(episode.runtime),episode.airDate].filter(Boolean).join(' · ')),episode.overview&&h('p',{dir:'auto'},episode.overview));
    return available?h(Link,{to,className:'sf-episode-card','data-safafi-episode':episode.number,'aria-label':`${text('الحلقة','Episode')} ${episode.number}: ${episode.name||''}`},art,copy):h('article',{className:'sf-episode-card','aria-disabled':true,'data-safafi-episode':episode.number},art,copy);
  }

  /* ---------- Library, history, confirmation ---------- */
  function Confirmation({title,open,onCancel,onConfirm}){
    if(!open)return null;return h('section',{className:'sf-confirmation',role:'dialog','data-focus-layout':'row','aria-modal':true,'aria-labelledby':'sf-confirm-title'},h('div',null,h('h2',{id:'sf-confirm-title'},title),h('p',null,text('سيتم حذف العناصر المحفوظة من هذا التلفاز. لا يمكن التراجع عن هذا الإجراء.','Saved entries will be removed from this TV. This cannot be undone.')),h('div',{...group('confirm-actions'),className:'sf-actions'},h('button',{type:'button',className:'sf-button','data-sf-cancel':'',onClick:onCancel},text('إلغاء','Cancel')),h('button',{type:'button',className:'sf-button sf-danger',onClick:onConfirm},text('مسح الكل','Clear all')))));
  }
  function PageHeading({title,subtitle,eyebrow,count}){return h('div',{className:'sf-page-heading'},eyebrow&&h('span',{className:'sf-eyebrow'},h('i',{className:'sf-eyebrow-mark','aria-hidden':true}),eyebrow),h('h1',null,title,typeof count==='number'&&count>0?h('span',{className:'sf-heading-count'},count):null),subtitle&&h('p',null,subtitle));}
  function Empty({title,body,action}){return h('div',{className:'sf-empty'},h('span',{className:'sf-empty-mark','aria-hidden':true}),h('h2',null,title),body&&h('p',null,body),action&&h('div',{...group('empty-actions'),className:'sf-actions'},action));}
  const cta=(label,to,icon)=>h(Link,{to,className:'sf-button sf-primary'},icon&&h(Icon,{name:icon}),label);
  function Library({items,filter,onFilter,onAskClear,confirmOpen,onCancel,onConfirm,CardComponent}){
    usePreferences();const visible=items.filter(item=>filter==='all'||item.mediaType===filter),tabs=[['all','الكل','All'],['movie','أفلام','Movies'],['tv','مسلسلات','Series'],['anime','أنمي','Anime']];
    return h('section',{'data-safafi-screen':'favorites',className:'sf-page sf-library'},h(PageHeading,{title:text('قائمتي','My List'),subtitle:text('كل ما حفظته لمشاهدة لاحقة.','Everything you saved for later.'),count:items.length}),
      h('div',{...group('library-tools'),className:'sf-chips'},...tabs.map(([id,ar,en])=>h('button',{type:'button',key:id,'aria-pressed':filter===id,onClick:()=>onFilter(id),className:'sf-chip'},text(ar,en))),items.length>0&&h('button',{type:'button',className:'sf-chip sf-chip-quiet',onClick:onAskClear},text('مسح القائمة','Clear list'))),
      visible.length?h('div',{...group('library-grid','grid'),className:'sf-grid grid'},visible.map(item=>h(CardComponent,{key:item.mediaType+':'+item.id,id:item.id,type:item.mediaType,title:item.title,poster:item.poster,backdrop:item.backdrop,year:item.year,anilistId:item.mediaType==='anime'?item.id:undefined,className:'w-full'})))
        :h(Empty,{title:text(items.length?'لا توجد عناوين في هذا التصنيف':'قائمتك فارغة',items.length?'No titles in this category':'Your list is empty'),body:text('اضغط مطوّلًا على OK فوق أي عنوان، أو استخدم زر «قائمتي» في صفحة التفاصيل.','Hold OK on any title, or use My List on its details page.'),action:cta(text('اكتشف العناوين','Discover titles'),'/movies','movie')}),
      h(Confirmation,{title:text('مسح قائمتي؟','Clear My List?'),open:confirmOpen,onCancel,onConfirm}));
  }
  function History({items,onRemove,onAskClear,confirmOpen,onCancel,onConfirm,watchURL:url}){
    usePreferences();const visible=items.filter(item=>item.completed||item.timestamp>=15);
    return h('section',{'data-safafi-screen':'history',className:'sf-page sf-history'},h(PageHeading,{title:text('أكمل المشاهدة','Continue Watching'),subtitle:text('قصتك مستمرة من حيث توقفت. اضغط مطوّلًا على OK لإزالة عنوان.','Pick up where you left off. Hold OK to remove a title.'),count:visible.length}),
      items.length>0&&h('div',{...group('history-tools'),className:'sf-chips'},h('button',{type:'button',className:'sf-chip sf-chip-quiet',onClick:onAskClear},text('مسح السجل','Clear history'))),
      visible.length?h('div',{...group('history-grid','grid'),className:'sf-grid grid'},visible.map(item=>h(ContinueCard,{key:[item.mediaType,item.id,item.season,item.episode].join(':'),item,to:(url||watchURL)(item),onRemove}))):h(Empty,{title:text('لا يوجد سجل مشاهدة بعد','No watch history yet'),body:text('ابدأ أي عنوان وسيظهر هنا لتكمله لاحقًا.','Start any title and it will wait for you here.'),action:cta(text('اكتشف العناوين','Discover titles'),'/','home')}),
      h(Confirmation,{title:text('مسح سجل المشاهدة؟','Clear watch history?'),open:confirmOpen,onCancel,onConfirm}));
  }

  /* ---------- Search with TV keyboard ---------- */
  const layouts={
    ar:'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ة ى ء أ إ ئ ؤ'.split(' '),
    en:'a b c d e f g h i j k l m n o p q r s t u v w x y z \' -'.split(' '),
    num:'1 2 3 4 5 6 7 8 9 0 : & . !'.split(' ')
  };
  function Keyboard({value,onChange,mode,setMode}){
    usePreferences();const put=ch=>onChange(value+ch);
    const keys=layouts[mode].map((ch,i)=>h('button',{type:'button',key:mode+ch,className:'sf-key',onClick:()=>put(ch),'aria-label':ch,'data-sf-autofocus':i===0?'':undefined},ch));
    const control=(id,label,icon,onClick,wide)=>h('button',{type:'button',key:id,className:cx('sf-key sf-key-control',wide&&'is-wide'),onClick,'aria-label':label},icon?h(Icon,{name:icon,size:26}):label);
    keys.push(control('space',text('مسافة','Space'),'space',()=>put(' ')),control('del',text('حذف حرف','Delete'),'erase',()=>onChange(value.slice(0,-1))),control('clear',text('مسح','Clear'),null,()=>onChange('')),
      control('ar',mode==='ar'?'EN':'ع',null,()=>setMode(mode==='ar'?'en':'ar')),control('num',mode==='num'?(store.getSnapshot().language==='en'?'ABC':'أبج'):'123',null,()=>setMode(mode==='num'?(store.getSnapshot().language==='en'?'en':'ar'):'num')),
      control('dash','؟',null,()=>put('؟')),control('comma','،',null,()=>put('،')));
    return h('div',{...group('keyboard','grid',{'data-focus-columns':7,'data-focus-exit-end':'search-results'}),className:'sf-keyboard grid','data-mode':mode},keys);
  }
  function Search(props){
    const prefs=usePreferences(),[input,setInput]=React.useState(props.query),[mode,setMode]=React.useState(prefs.language==='en'?'en':'ar'),ref=React.useRef(null),timer=React.useRef(0);
    React.useEffect(()=>{setInput(current=>current.trim()===props.query?current:props.query);},[props.query]);
    React.useEffect(()=>()=>clearTimeout(timer.current),[]);
    const results=props.data&&props.data.results||[],pages=props.data&&props.data.totalPages||1;
    const change=value=>{setInput(value);clearTimeout(timer.current);const q=value.trim();timer.current=setTimeout(()=>{if(q!==props.query&&(q.length>=2||q===''))q?props.onSearch(q,true):props.onClear();},q.length>=2?450:600);};
    const submit=e=>{e.preventDefault();clearTimeout(timer.current);props.onSearch(input.trim());};
    const filters=[['all','الكل','All'],['movie','أفلام','Movies'],['tv','مسلسلات','Series'],['anime','أنمي','Anime']];
    let body;
    if(props.loading&&!results.length)body=h(GridSkeleton,{count:8});
    else if(props.error)body=h(Empty,{title:text('تعذّر إكمال البحث','Unable to complete search'),action:h('button',{type:'button',className:'sf-button sf-primary',onClick:()=>props.retry()},text('إعادة المحاولة','Retry'))});
    else if(results.length)body=h(React.Fragment,null,h('h2',{className:'sf-results-title',dir:'auto'},text('نتائج «','Results for “')+props.query+text('»','”'),h('span',null,props.data.totalResults||results.length)),
      h('div',{...group('search-results','grid',{'data-focus-exit-start':'keyboard'}),className:'sf-grid sf-grid-4 grid'},results.map(item=>h(props.Card,{...item,key:item.type+':'+item.id,className:'w-full'}))),
      pages>1&&h('div',{...group('search-pagination'),className:'sf-pagination'},h(props.Pagination,{currentPage:props.page,totalPages:pages,onPageChange:props.onPage})));
    else body=h(Empty,{title:text(props.query?'لم نعثر على نتائج':'ابحث عن قصتك التالية',props.query?'No results found':'Find your next story'),body:text(props.query?'جرّب اسمًا آخر أو غيّر التصنيف.':window.SafafiPlatform&&SafafiPlatform.tv?'اكتب بلوحة المفاتيح على الشاشة؛ تظهر النتائج أثناء الكتابة.':'اكتب اسم الفيلم أو المسلسل؛ تظهر النتائج أثناء الكتابة.',props.query?'Try another title or category.':window.SafafiPlatform&&SafafiPlatform.tv?'Type with the on-screen keyboard; results appear as you type.':'Type a title; results appear as you type.')});
    return h('section',{'data-safafi-screen':'search',className:'sf-page sf-search'},
      h('div',{className:'sf-search-panel'},
        h('form',{...group('search-input'),role:'search',className:'sf-search-form',onSubmit:submit},h('span',{className:'sf-search-glyph','aria-hidden':true},h(Icon,{name:'search'})),
          h('input',{ref,type:'search',value:input,enterKeyHint:'search',dir:'auto','aria-label':text('البحث في المكتبة','Search the library'),placeholder:text('فيلم، مسلسل أو أنمي…','Movie, series or anime…'),onChange:e=>change(e.target.value)}),
          input&&h('button',{type:'button',className:'sf-icon-button',onClick:()=>{clearTimeout(timer.current);setInput('');props.onClear();},'aria-label':text('مسح','Clear')},h(Icon,{name:'close',size:24}))),
        h(Keyboard,{value:input,onChange:change,mode,setMode}),
        h('div',{...group('search-filters'),className:'sf-chips'},filters.map(([id,ar,en])=>h('button',{key:id,type:'button',className:'sf-chip','aria-pressed':props.type===id,onClick:()=>props.onType(id)},text(ar,en))),
          props.query&&h('label',{className:'sf-sort'},h('span',null,text('الترتيب','Sort')),h('select',{value:props.sort,'aria-label':text('ترتيب النتائج','Sort results'),onChange:e=>props.onSort(e.target.value)},[['relevance','الأكثر صلة','Relevance'],['popularity','الشعبية','Popularity'],['rating','التقييم','Rating'],['newest','الأحدث','Newest']].map(([id,ar,en])=>h('option',{key:id,value:id,disabled:id==='popularity'&&props.type!=='anime'&&!results.some(item=>Number.isFinite(item.popularity))},text(ar,en))))))),
      h('div',{className:'sf-search-results'},props.data&&props.data.warning&&h('p',{role:'status',className:'sf-search-warning'},props.data.warning),body));
  }


  /* ---------- Up Next: card over the fullscreen player near the end of an episode ---------- */
  // Rendered straight into <body> so it sits above the staged player. It takes focus when it appears
  // (OK plays the next episode, Back keeps watching); autoplay counts down only after the episode ends.
  const svgIcon=(name,filled)=>`<svg viewBox="0 0 24 24" width="30" height="30" fill="${filled?'currentColor':'none'}" stroke="currentColor" stroke-width="${filled?0:1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name]||''}"/></svg>`;
  function UpNext({next,title,countdown,counting,onPlayNow,onCancel,thumbnail,autoplay}){
    const node=React.useRef(null),actions=React.useRef({});actions.current={onPlayNow,onCancel};
    const anime=/\/watch\/anime\/[^/]+\/(\d+)/.exec(next||''),tv=!anime&&/\/watch\/[^/]+\/(\d+)\/(\d+)/.exec(next||'');
    const label=tv?text(`الموسم ${tv[1]} · الحلقة ${tv[2]}`,`Season ${tv[1]} · Episode ${tv[2]}`):anime?text(`الحلقة ${anime[1]}`,`Episode ${anime[1]}`):text('الحلقة التالية','Next episode');
    const frameFocus=()=>setTimeout(()=>{const frame=document.querySelector('[data-testid="player-iframe"]');if(frame&&!document.querySelector('.sf-upnext'))frame.focus();},0);
    React.useEffect(()=>{
      const card=document.createElement('section');card.className='sf-upnext';card.setAttribute('role','dialog');card.setAttribute('aria-label',text('الحلقة التالية','Up next'));card.dir=store.getSnapshot().language==='ar'?'rtl':'ltr';
      card.innerHTML=`<div class="sf-upnext-art"><img alt="" decoding="async"></div><div class="sf-upnext-body"><span class="sf-eyebrow"><i class="sf-eyebrow-mark" aria-hidden="true"></i>${text('الحلقة التالية','Up next')}</span><h3 dir="auto"></h3><p class="sf-upnext-title" dir="auto"></p><p class="sf-upnext-status"></p><div class="sf-upnext-bar" aria-hidden="true"><i></i></div>
        <div class="sf-upnext-actions" data-focus-group="upnext" data-focus-layout="row"><button type="button" class="sf-button sf-primary" data-act="play">${svgIcon('play',true)}<span>${text('شغّل الآن','Play now')}</span></button><button type="button" class="sf-button" data-act="close" aria-label="${text('إغلاق: متابعة المشاهدة','Close: keep watching')}">${text('متابعة المشاهدة','Keep watching')}</button></div></div>`;
      card.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.act==='play')actions.current.onPlayNow&&actions.current.onPlayNow();else{actions.current.onCancel&&actions.current.onCancel();frameFocus();}});
      document.body.appendChild(card);node.current=card;
      try{const doc=document.querySelector('[data-testid="player-iframe"]').contentDocument.documentElement;doc.classList.remove('safafi-controls-active');doc.classList.add('safafi-controls-hidden');}catch(_){}
      requestAnimationFrame(()=>{card.classList.add('is-in');const play=card.querySelector('[data-act="play"]');if(window.SafafiRemote)SafafiRemote.focus(play,true);else play.focus();});
      return()=>{const had=card.contains(document.activeElement);card.remove();node.current=null;if(had)frameFocus();};
    },[]);
    React.useEffect(()=>{const card=node.current;if(!card)return;
      card.querySelector('h3').textContent=label;const t=card.querySelector('.sf-upnext-title');t.textContent=title||'';t.hidden=!title;
      const img=card.querySelector('img'),url=thumbnail&&window.SafafiArtwork?window.SafafiArtwork(thumbnail,500):thumbnail;if(url&&img.getAttribute('src')!==url)img.src=url;card.querySelector('.sf-upnext-art').hidden=!url;
      card.querySelector('.sf-upnext-status').textContent=counting?text(`تبدأ خلال ${countdown} ث`,`Starting in ${countdown}s`):autoplay?text('تبدأ تلقائيًا عند انتهاء الحلقة','Starts automatically when this episode ends'):text('التشغيل التلقائي متوقف','Autoplay is off');
      card.classList.toggle('is-counting',!!counting);card.querySelector('.sf-upnext-bar i').style.width=counting?Math.min(100,(5-countdown+1)/5*100)+'%':'0%';
    });
    return null;
  }
  return {UpNext,Shell,Hero,Card,ContinueCard,Details,DetailSkeleton,DetailError,Cast,Settings,Artwork,EpisodeProgress,EpisodeCard,Library,History,Search,Confirmation,Rail,RailSkeleton,GridSkeleton,PageHeading,Empty,Icon,Stage,watchURL,toast};
}
