import{n as e}from"./config-DuQEQKG4.js";var t=`https://graphql.anilist.co`;function n(){return e||(typeof window<`u`&&window.location?.origin&&window.location.origin!==`null`?window.location.origin:`http://localhost:5173`)}function r(e){return e?e.replace(/<[^>]*>/g,``).replace(/&quot;/g,`"`).trim():``}function i(e){let t=String(e.id),n=e.title?.english||e.title?.romaji||e.title?.native||`Unknown Anime`,i=e.title?.native||e.title?.romaji||void 0,a=e.coverImage?.extraLarge||e.coverImage?.large||e.coverImage?.medium||void 0,o=e.bannerImage||void 0,s=e.seasonYear?String(e.seasonYear):e.startDate?.year?String(e.startDate.year):void 0,c=e.averageScore?(e.averageScore/10).toFixed(1):void 0;return{id:t,type:`anime`,title:n,originalTitle:i,poster:a,backdrop:o,overview:r(e.description),year:s,rating:c,genres:e.genres||[],episodeCount:e.episodes||void 0,status:e.status||void 0,anilistId:t}}var a=`
  query ($search: String, $page: Int, $perPage: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(search: $search, type: ANIME, isAdult: false, sort: $sort) {
        id
        title {
          english
          romaji
          native
        }
        coverImage {
          extraLarge
          large
          medium
        }
        bannerImage
        description
        episodes
        format
        genres
        averageScore
        seasonYear
        status
        startDate {
          year
        }
      }
    }
  }
`;async function o(e,n){let r=new AbortController,i=setTimeout(()=>r.abort(),1e4);try{let a=await fetch(t,{method:`POST`,headers:{"Content-Type":`application/json`,Accept:`application/json`},body:JSON.stringify({query:e,variables:n}),signal:r.signal});if(clearTimeout(i),a.status===403||a.status===429||!a.ok)return console.warn(`[AniList] Upstream HTTP ${a.status} returned from ${t}`),null;let o=await a.json();return o.errors&&o.errors.length>0?(console.warn(`[AniList] GraphQL errors:`,o.errors[0]?.message),null):o.data}catch(e){return clearTimeout(i),console.warn(`[AniList] Request failed:`,e?.message||e),null}}async function s(e,t=1,r=24,s=[`SEARCH_MATCH`,`POPULARITY_DESC`]){let c=e.trim();if(!c)return{success:!0,page:1,totalPages:0,totalResults:0,results:[]};try{let e=n(),i=await fetch(`${e}/api/anime/search?q=${encodeURIComponent(c)}&page=${t}&per_page=${r}`);if(i.ok){let e=await i.json();if(e.success&&Array.isArray(e.results))return e}}catch{}let l=await o(a,{search:c,page:t,perPage:r,sort:s});if(l?.Page?.media){let e=l.Page.media.map(i);return{success:!0,page:l.Page.pageInfo.currentPage,totalPages:l.Page.pageInfo.lastPage||1,totalResults:l.Page.pageInfo.total||e.length,results:e}}return{success:!1,page:1,totalPages:0,totalResults:0,results:[],error:`AniList search is temporarily unavailable`}}var c=`
  query ($id: Int) {
    Media(id: $id, type: ANIME, isAdult: false) {
      id
      title {
        english
        romaji
        native
      }
      coverImage {
        extraLarge
        large
        medium
      }
      bannerImage
      description
      episodes
      nextAiringEpisode {
        episode
      }
      format
      genres
      averageScore
      season
      seasonYear
      status
      duration
      startDate {
        year
        month
        day
      }
      studios(isMain: true) {
        nodes {
          name
        }
      }
      trailer {
        id
        site
      }
      characters(sort: [ROLE, RELEVANCE], perPage: 12) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              medium
              large
            }
          }
        }
      }
      recommendations(perPage: 12) {
        nodes {
          mediaRecommendation {
            id
            title {
              english
              romaji
              native
            }
            coverImage {
              large
              medium
            }
            bannerImage
            format
            averageScore
            seasonYear
            genres
            episodes
          }
        }
      }
      relations {
        edges {
          relationType
          node {
            id
            title {
              english
              romaji
              native
            }
            coverImage {
              large
              medium
            }
            format
            status
            averageScore
            seasonYear
            season
            episodes
            startDate {
              year
              month
              day
            }
            relations {
              edges {
                relationType
                node {
                  id
                  title {
                    english
                    romaji
                    native
                  }
                  coverImage {
                    large
                    medium
                  }
                  format
                  status
                  averageScore
                  seasonYear
                  season
                  episodes
                  startDate {
                    year
                    month
                    day
                  }
                  relations {
                    edges {
                      relationType
                      node {
                        id
                        title {
                          english
                          romaji
                          native
                        }
                        coverImage {
                          large
                          medium
                        }
                        format
                        status
                        averageScore
                        seasonYear
                        season
                        episodes
                        startDate {
                          year
                          month
                          day
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`,l=new Set(`the.a.an.and.or.of.in.on.at.to.for.with.by.season.part.arc.act.chapter.special.tv.ova.ona.movie.hen.shou.no.wa.ga.wo.ni.de.2nd.3rd.4th.5th.final`.split(`.`));function u(e){let t=new Set;if(!e)return t;let n=e=>{if(!e)return;let n=e.toLowerCase().replace(/[^a-z0-9\s]/g,` `);for(let e of n.split(/\s+/))e.length>=2&&!l.has(e)&&t.add(e)};return n(e.english),n(e.romaji),t}function d(e,t){if(!e||!t)return!1;if(e.id===t.id)return!0;let n=u(e.title),r=u(t.title);for(let e of r)if(n.has(e))return!0;return!1}function f(e){if(!e)return[];let t=new Set([`TV`,`TV_SHORT`,`ONA`]),n=new Map;n.set(e.id,e);for(let r of e.relations?.edges||[]){let i=r?.relationType,a=r?.node;if((i===`PREQUEL`||i===`SEQUEL`)&&a?.id&&t.has(a.format)&&d(e,a)){n.set(a.id,a);for(let r of a.relations?.edges||[]){let i=r?.relationType,a=r?.node;if((i===`PREQUEL`||i===`SEQUEL`)&&a?.id&&t.has(a.format)&&d(e,a)){n.set(a.id,a);for(let r of a.relations?.edges||[]){let i=r?.relationType,a=r?.node;(i===`PREQUEL`||i===`SEQUEL`)&&a?.id&&t.has(a.format)&&d(e,a)&&n.set(a.id,a)}}}}}let i=Array.from(n.values());return i.length<=1?[{id:String(e.id),number:1,name:`Season 1`,overview:r(e.description),poster:e.coverImage?.large||e.coverImage?.medium||void 0,episodeCount:e.episodes||0,airDate:e.startDate?.year?String(e.startDate.year):e.seasonYear?String(e.seasonYear):void 0}]:(i.sort((e,t)=>{let n=e.startDate?.year||e.seasonYear||9999,r=t.startDate?.year||t.seasonYear||9999;if(n!==r)return n-r;let i=e.startDate?.month||1,a=t.startDate?.month||1;return i===a?(e.startDate?.day||1)-(t.startDate?.day||1):i-a}),i.map((e,t)=>{let n=t+1;return{id:String(e.id),number:n,name:`Season ${n}`,overview:e.description?r(e.description):void 0,poster:e.coverImage?.large||e.coverImage?.medium||void 0,episodeCount:e.episodes||0,airDate:e.startDate?.year?String(e.startDate.year):e.seasonYear?String(e.seasonYear):void 0}}))}function p(e,t){if(!e)return[];let n=new Set([`MOVIE`,`SPECIAL`,`OVA`,`ONA`,`TV_SHORT`,`TV`]),r=new Set([`SIDE_STORY`,`SPIN_OFF`,`ALTERNATIVE`,`PARENT`,`SUMMARY`,`PREQUEL`,`SEQUEL`,`OTHER`]),i=new Map;for(let a of e.relations?.edges||[]){let o=a?.relationType,s=a?.node;if(!s||!s.id)continue;let c=String(s.id);if(!(o===`CHARACTER`||!r.has(o))&&!(c===String(e.id)||t.has(c))&&n.has(s.format)&&(d(e,s)||o===`SIDE_STORY`||o===`SPIN_OFF`||o===`SUMMARY`)){let e=s.title?.english,t=s.title?.romaji,n=s.title?.native,r=e||t||n||`Unknown`,a=s.startDate?.year?String(s.startDate.year):s.seasonYear?String(s.seasonYear):void 0,o=s.averageScore?(s.averageScore/10).toFixed(1):void 0;i.set(c,{id:c,anilistId:c,type:`anime`,title:r,originalTitle:n||t||void 0,poster:s.coverImage?.large||s.coverImage?.medium||void 0,year:a,rating:o,episodeCount:s.episodes||void 0,status:s.status||void 0})}}return Array.from(i.values())}async function m(e){let t=typeof e==`number`?e:parseInt(e,10);if(isNaN(t)||t<=0)throw Error(`Valid AniList numeric ID is required`);try{let e=n(),r=await fetch(`${e}/api/anime/details?id=${t}`);if(r.ok){let e=await r.json();if(e.success&&e.id&&e.seasons&&e.seasons.length>0)return e}}catch{}let i=await o(c,{id:t});if(!i?.Media)throw Error(`Anime title with AniList ID ${t} was not found or could not be loaded from AniList.`);let a=i.Media,s=a.title?.english,l=a.title?.romaji,u=a.title?.native,d=s||l||u||`Unknown Anime`,m=u||l||void 0,h=a.coverImage?.extraLarge||a.coverImage?.large||a.coverImage?.medium||void 0,g=a.bannerImage||void 0,_=a.seasonYear?String(a.seasonYear):a.startDate?.year?String(a.startDate.year):void 0,v=a.averageScore?(a.averageScore/10).toFixed(1):void 0,y=[];if(Array.isArray(a.characters?.edges))for(let e of a.characters.edges)e?.node&&y.push({id:String(e.node.id),name:e.node.name?.full||`Unknown`,character:e.role||`Character`,profile:e.node.image?.large||e.node.image?.medium||void 0});let b=[];a.trailer?.id&&(a.trailer.site||``).toLowerCase()===`youtube`&&b.push({id:String(a.trailer.id),key:String(a.trailer.id),name:`Official Trailer`,site:`YouTube`,type:`Trailer`,official:!0});let x=[];if(Array.isArray(a.recommendations?.nodes))for(let e of a.recommendations.nodes){let t=e?.mediaRecommendation;if(t&&t.id){let e=t.title?.english||t.title?.romaji||t.title?.native||`Unknown Anime`,n=t.coverImage?.large||t.coverImage?.medium||void 0,r=t.bannerImage||void 0,i=t.seasonYear?String(t.seasonYear):void 0,a=t.averageScore?(t.averageScore/10).toFixed(1):void 0;x.push({id:String(t.id),anilistId:String(t.id),type:`anime`,title:e,poster:n,backdrop:r,year:i,rating:a,genres:t.genres||[],episodeCount:t.episodes||void 0})}}let S=[];if(Array.isArray(a.studios?.nodes))for(let e of a.studios.nodes)e?.name&&S.push(e.name);let C;if(a.startDate?.year){let e=String(a.startDate.year),t=a.startDate.month?String(a.startDate.month).padStart(2,`0`):null,n=a.startDate.day?String(a.startDate.day).padStart(2,`0`):null;e&&t&&n?C=`${e}-${t}-${n}`:e&&t?C=`${e}-${t}`:e&&(C=e)}let w=f(a),T=p(a,new Set(w.map(e=>String(e.id))));return{id:String(a.id),anilistId:String(a.id),type:`anime`,title:d,originalTitle:m,overview:r(a.description),poster:h,backdrop:g,releaseDate:C,year:_,rating:v,genres:a.genres||[],runtime:a.duration||void 0,status:a.status||void 0,format:a.format||void 0,season:a.season||void 0,seasonYear:a.seasonYear||void 0,studios:S,episodes:a.episodes||(a.nextAiringEpisode?.episode?a.nextAiringEpisode.episode-1:void 0),seasons:w,numberOfSeasons:w.length,relatedAnime:T,cast:y,videos:b,recommendations:x}}export{s as n,m as t};