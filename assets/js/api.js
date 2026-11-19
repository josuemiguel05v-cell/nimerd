/** Catálogo vivo de AniList. API pública, sin claves ni servidor. */
const API_URL='https://graphql.anilist.co';
const CACHE_MS=15*60*1000;
const FIELDS=`id idMal title { romaji english native } coverImage { extraLarge large color } bannerImage description(asHtml:false) episodes status seasonYear format genres averageScore duration nextAiringEpisode { airingAt episode } trailer { id site thumbnail } externalLinks { site url type } streamingEpisodes { title thumbnail url site } siteUrl`;
const SLIM_FIELDS=`id isAdult title { romaji english native } coverImage { extraLarge large color } bannerImage description(asHtml:false) episodes status seasonYear format genres averageScore nextAiringEpisode { airingAt episode }`;
const HOME_QUERY=`query Home($season:MediaSeason!,$year:Int!,$from:Int!,$to:Int!){
 trending:Page(page:1,perPage:14){media(type:ANIME,sort:TRENDING_DESC,isAdult:false){${SLIM_FIELDS}}}
 airing:Page(page:1,perPage:14){media(type:ANIME,status:RELEASING,sort:POPULARITY_DESC,isAdult:false){${SLIM_FIELDS}}}
 season:Page(page:1,perPage:14){media(type:ANIME,season:$season,seasonYear:$year,sort:POPULARITY_DESC,isAdult:false){${SLIM_FIELDS}}}
 schedules:Page(page:1,perPage:50){airingSchedules(airingAt_greater:$from,airingAt_lesser:$to,sort:TIME){id episode airingAt media{${SLIM_FIELDS}}}}
}`;
const SEARCH_QUERY=`query Browse($page:Int!,$search:String,$genre:String,$status:MediaStatus,$sort:[MediaSort]){
 Page(page:$page,perPage:24){pageInfo{currentPage hasNextPage} media(type:ANIME,isAdult:false,search:$search,genre:$genre,status:$status,sort:$sort){${SLIM_FIELDS}}}
}`;
const DAY_QUERY=`query DaySchedule($from:Int!,$to:Int!){Page(page:1,perPage:50){airingSchedules(airingAt_greater:$from,airingAt_lesser:$to,sort:TIME){id episode airingAt media{${SLIM_FIELDS}}}}}`;
const DETAIL_QUERY=`query AnimeDetail($id:Int!){Media(id:$id,type:ANIME){${FIELDS}}}`;

async function graphql(query,variables,cacheKey){
  const key=`nimerd_api_v2_${cacheKey}`;
  const legacyKey=`nimerd_api_v1_${cacheKey}`;
  let cached=null;
  for(const storeName of ['sessionStorage','localStorage']){
    try{const store=window[storeName];const value=JSON.parse(store.getItem(key)||store.getItem(legacyKey)||'null');if(value?.data&&(!cached||value.when>cached.when))cached=value;}catch{}
  }
  if(cached && Date.now()-cached.when<CACHE_MS)return cached.data;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables}),signal:controller.signal});
    if(response.status===429)throw new Error('AniList alcanzó su límite de solicitudes.');
    if(!response.ok)throw new Error(`AniList no respondió (HTTP ${response.status}).`);
    const payload=await response.json();if(payload.errors?.length)throw new Error(payload.errors[0].message||'Consulta rechazada por AniList.');
    if(!payload.data)throw new Error('Respuesta incompleta de AniList.');
    const record=JSON.stringify({when:Date.now(),data:payload.data});
    try{window.sessionStorage.setItem(key,record)}catch{}
    // Solo copias de contenido consultado recientemente: útil si hay fallos temporales de red.
    if(cacheKey.startsWith('home_')||cacheKey.startsWith('anime_')){try{window.localStorage.setItem(key,record)}catch{}}
    return payload.data;
  }catch(err){if(cached?.data){return cached.data;}throw err;}
  finally{clearTimeout(timer);}
}
function seasonNow(){const d=new Date();const month=d.getUTCMonth()+1;return{season:month<=3?'WINTER':month<=6?'SPRING':month<=9?'SUMMER':'FALL',year:d.getUTCFullYear()};}
export async function getHome(){const season=seasonNow();const from=Math.floor(Date.now()/1000)-60;const to=from+7*86400;const data=await graphql(HOME_QUERY,{...season,from,to},'home_'+season.season+season.year+Math.floor(from/3600/4));return{trending:data.trending.media||[],airing:data.airing.media||[],season:data.season.media||[],schedules:(data.schedules.airingSchedules||[]).filter(e=>e.media&&!e.media.isAdult)};}
export async function browse({page=1,search='',genre='',sort='POPULARITY_DESC',status=null}={}){const vars={page,search:search.trim()||null,genre:genre||null,sort:[sort],status};const data=await graphql(SEARCH_QUERY,vars,`browse_${JSON.stringify(vars)}`);return{items:data.Page.media||[],hasNext:data.Page.pageInfo.hasNextPage};}
export async function getDetail(id){const data=await graphql(DETAIL_QUERY,{id},'anime_'+id);return data.Media;}
export async function getScheduleDay(dateStr){const start=Math.floor(new Date(`${dateStr}T00:00:00-04:00`).getTime()/1000);const end=start+86400-1;const data=await graphql(DAY_QUERY,{from:start-1,to:end+1},'day_'+dateStr);return(data.Page.airingSchedules||[]).filter(e=>e.media&&!e.media.isAdult&&e.airingAt>=start&&e.airingAt<=end);}
