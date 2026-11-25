import {local,localBrowse} from './local-catalog.js?v=18';
import {getHome,browse,getDetail,getScheduleDay,getRecentAired,getEpisodes} from './api.js?v=18';
import {initAccount,signIn,signUp,signOut,isSignedIn,isConfigured,accountEmail,saveEntry,loadCloudEntries} from './account.js';
import {fetchSeriesPage,fetchEpisodePage,fetchEpisodePlayback,makeEntry} from './directory.js';

const $=id=>document.getElementById(id);
const state={ytSeriesPlayer:null,activeSeries:null,directoryToken:0,directoryCount:0,directoryStatus:"Consultando catálogo ampliado...",home:null,isDemo:false,items:new Map(),favorites:loadFavorites(),heroIndex:0,heroTimer:null,route:'inicio',browsePage:0,browseHasMore:false,browseToken:0,browseItems:[],scheduleIndex:0,scheduleToken:0,streams:{},officials:[],progress:loadProgress(),recent:null,recentAt:0,modalId:null,videoHls:null,videoEl:null};
let toastTimer,searchTimer;
const fmtTime=new Intl.DateTimeFormat('es-DO',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'America/Santo_Domingo'});
const dayNames=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
const weekdayFull=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const wordsByGenre={Action:'Acción',Adventure:'Aventura',Comedy:'Comedia',Drama:'Drama',Fantasy:'Fantasía',Romance:'Romance','Sci-Fi':'Ciencia ficción','Slice of Life':'Vida cotidiana',Sports:'Deportes',Mystery:'Misterio',Supernatural:'Sobrenatural',Psychological:'Psicológico',Music:'Música',Horror:'Terror',Thriller:'Suspenso'};
const genreCategories=[
 ['Action','Acción','⚔'],['Adventure','Aventura','🧭'],['Comedy','Comedia','✦'],['Drama','Drama','❖'],
 ['Fantasy','Fantasía','✧'],['Romance','Romance','♡'],['Sci-Fi','Ciencia ficción','☄'],['Slice of Life','Vida cotidiana','☕'],
 ['Sports','Deportes','◈'],['Mystery','Misterio','⌕'],['Supernatural','Sobrenatural','☾'],['Horror','Terror','♜'],
 ['Psychological','Psicológico','◉'],['Thriller','Suspenso','⚡'],['Music','Música','♫'],['Mecha','Mecha','✺'],['Mahou Shoujo','Chicas mágicas','✿']
];
const statuses={RELEASING:'En emisión',FINISHED:'Finalizado',NOT_YET_RELEASED:'Próximamente',CANCELLED:'Cancelado',HIATUS:'En pausa'};
const playerSites=['crunchyroll','netflix','hidive','hulu','disney','prime video','amazon','bilibili','tubi','retrocrush','youtube','muse asia','ani-one','pluto','funimation','anime onegai','adult swim','baha','iqiyi'];

function loadProgress(){try{const data=JSON.parse(localStorage.getItem('nimerd_progress_v2')||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?Object.fromEntries(Object.entries(data).filter(([k,v])=>!removedDemo(k.split(':').pop())&&!removedDemo(v?.anime?.id))):{};}catch{return{};}}
function removedDemo(id){return [900000001,900000002].includes(Number(id));}
function loadFavorites(){try{const p=JSON.parse(localStorage.getItem('nimerd_favs_v1')||'[]');return Array.isArray(p)?p.filter(e=>e&&Number.isInteger(e.id)&&!removedDemo(e.id)).slice(0,300):[];}catch{return[]}}
function saveFavorites(){if(isSignedIn())return;try{localStorage.setItem('nimerd_favs_v1',JSON.stringify(state.favorites))}catch{notify('No se pudo guardar en este navegador.')}}
function escapeHTML(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function plainText(s=''){return String(s||'').replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|quot|amp|lt|gt|#39);/g,' ').replace(/\s+/g,' ').trim()}
function safeUrl(str){try{const u=new URL(str,document.baseURI);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function imageUrl(str){if(!str)return 'assets/art/eclipse.svg';if(String(str).startsWith('assets/'))return str;return safeUrl(str)||'assets/art/eclipse.svg';}
function displayTitle(anime){return anime.title?.english||anime.title?.romaji||anime.title?.native||'Anime sin título'}
function cover(anime){return imageUrl(anime.coverImage?.extraLarge||anime.coverImage?.large)}
function fallbackCover(anime){return imageUrl(anime.coverImage?.fallback||'assets/art/eclipse.svg')}
function remember(items){for(const m of items||[]){if(!m?.id||removedDemo(m.id))continue;const previous=state.items.get(m.id);if(!previous){state.items.set(m.id,m);continue}const merged={...previous,...m};for(const field of ['externalLinks','streamingEpisodes','trailer','siteUrl','description','duration'])if(m[field]===undefined&&previous[field]!==undefined)merged[field]=previous[field];state.items.set(m.id,merged)}}
function notify(message){const n=$('toast');n.textContent=message;n.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('show'),3400)}
function isFavorite(id){return state.favorites.some(f=>f.id===id)}
function toggleFavorite(id){const anime=state.items.get(id)||state.favorites.find(f=>f.id===id);if(!anime)return;const found=isFavorite(id);state.favorites=found?state.favorites.filter(f=>f.id!==id):[anime,...state.favorites];saveFavorites();syncLibraryEntry('anime:'+id).catch(e=>notify('Error de sincronización: '+e.message));refreshFavoriteUI();renderAccount();notify(found?'Se quitó de tu lista.':'¡Guardado en tu lista!');if(state.route==='favoritos')renderFavorites();}
function refreshFavoriteUI(){$('favorites-count').textContent=state.favorites.length;document.querySelectorAll('[data-fav-id]').forEach(btn=>{const yes=isFavorite(Number(btn.dataset.favId));btn.classList.toggle('active',yes);btn.textContent=yes?'♥':'♡';btn.setAttribute('aria-label',yes?'Quitar de favoritos':'Añadir a favoritos')});const modalFav=$('detail-fav');if(modalFav)modalFav.textContent=isFavorite(Number(modalFav.dataset.favId))?'♥ En mi lista':'♡ Guardar en mi lista';}
function badgeFor(anime){if(anime._demo)return 'DEMO';if(anime.status==='RELEASING')return 'EN EMISIÓN';if(anime.status==='NOT_YET_RELEASED')return 'PRÓXIMO';return anime.format||'ANIME'}
function cardHTML(anime){const title=displayTitle(anime),id=anime.id,score=Number(anime.averageScore),scoreText=Number.isFinite(score)&&score>0?`<span class="anime-score">★ ${(score/10).toFixed(1)}</span>`:'';return `<article class="anime-card" tabindex="0" role="button" aria-label="Ver detalles de ${escapeHTML(title)}" data-anime-id="${id}"><div class="anime-poster"><img src="${escapeHTML(cover(anime))}" alt="Póster de ${escapeHTML(title)}" loading="lazy" data-fallback="${escapeHTML(fallbackCover(anime))}" onerror="this.onerror=null;this.src=this.dataset.fallback" />${scoreText}<button class="card-fav ${isFavorite(id)?'active':''}" data-fav-id="${id}" aria-label="${isFavorite(id)?'Quitar de favoritos':'Añadir a favoritos'}">${isFavorite(id)?'♥':'♡'}</button><span class="card-badge"><span class="dot"></span> ${escapeHTML(badgeFor(anime))}</span></div><h3 class="anime-title" title="${escapeHTML(title)}">${escapeHTML(title)}</h3><div class="anime-sub">${escapeHTML((anime.genres||[]).slice(0,2).map(g=>wordsByGenre[g]||g).join(' · ')||'Anime')}</div></article>`}
function cardsTo(elementId,items){const el=$(elementId);remember(items);el.innerHTML=items.length?items.map(cardHTML).join(''):`<div class="empty-state" style="width:100%"><span class="empty-icon">✧</span><strong>No hay resultados aquí todavía</strong><p>Prueba otra sección o vuelve a consultar más tarde.</p></div>`}
function setHero(index){const list=state.home?.trending||[];if(!list.length)return;state.heroIndex=(index+Math.min(5,list.length))%Math.min(5,list.length);const item=list[state.heroIndex];remember([item]);const title=displayTitle(item);const words=title.split(/\s+/);const pivot=Math.max(1,Math.ceil(words.length/2));const first=words.slice(0,pivot).join(' ');const second=words.slice(pivot).join(' ');$('hero-title').innerHTML=escapeHTML(first)+(second?`<br><em>${escapeHTML(second)}</em>`:'');$('hero-description').textContent=plainText(item.description).slice(0,270)||'Una nueva historia te espera. Descubre todos los detalles de esta serie.';$('hero-category').textContent=item._demo?'VISTA DE DEMOSTRACIÓN':(item.status==='RELEASING'?'EN EMISIÓN':'EN TENDENCIA');$('hero-tags').innerHTML=[item.seasonYear||null,...(item.genres||[]).slice(0,3).map(g=>wordsByGenre[g]||g),item.averageScore?`★ ${(item.averageScore/10).toFixed(1)}`:null].filter(Boolean).map(g=>`<span>${escapeHTML(g)}</span>`).join('');$('hero-art-image').onerror=function(){this.onerror=null;this.src=fallbackCover(item)};$('hero-art-image').src=cover(item);$('hero-spot').style.backgroundImage=`url("${cover(item).replace(/["\\]/g,'')}")`;$('hero-primary').querySelector('span').textContent='Ver detalles';$('hero-secondary').querySelector('span').textContent='Más información';$('hero-pagination').innerHTML=list.slice(0,5).map((_,i)=>`<button data-hero-index="${i}" aria-label="Destacado ${i+1}" class="${i===state.heroIndex?'active':''}"></button>`).join('');}
function renderHome(){if(!state.home)return;cardsTo('trending-track',state.home.trending.slice(0,26));cardsTo('season-track',state.home.season.slice(0,26));const future=state.home.schedules.filter(e=>e.airingAt>Math.floor(Date.now()/1000)).slice(0,6);$('home-schedule').innerHTML=future.length?future.map(e=>scheduleRow(e)).join(''):`<div class="empty-state"><span class="empty-icon">◷</span><strong>${state.isDemo?'Calendario no disponible en modo demostración':'No hay próximas emisiones registradas'}</strong><p>Al conectarse al catálogo en línea, los horarios disponibles aparecerán aquí automáticamente.</p><button class="button button-outline" data-goto="calendario">Abrir calendario</button></div>`;setHero(0);clearInterval(state.heroTimer);if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)state.heroTimer=setInterval(()=>{if(state.route==='inicio'&&!document.hidden&&!state.modalId)setHero(state.heroIndex+1)},7500);}
function scheduleRow(e){const a=e.media||{},time=fmtTime.format(new Date(e.airingAt*1000));return `<div class="schedule-row" role="button" tabindex="0" data-anime-id="${a.id}"><time class="schedule-time" datetime="${new Date(e.airingAt*1000).toISOString()}">${escapeHTML(time)}</time><img loading="lazy" src="${escapeHTML(cover(a))}" alt="" /><div class="schedule-info"><strong>${escapeHTML(displayTitle(a))}</strong><span>${escapeHTML((a.genres||[]).slice(0,2).map(g=>wordsByGenre[g]||g).join(' · '))}</span></div><span class="episode-pill">EP ${e.episode}</span><span class="schedule-chevron">›</span></div>`;}
function renderCategories(){
 const selected=$('genre-select')?.value||'';
 $('genre-chips').innerHTML=`<button type="button" class="genre-chip ${!selected?'selected':''}" data-category-genre="" aria-pressed="${!selected}">✦ Todos</button>`+genreCategories.map(([value,label,symbol])=>`<button type="button" class="genre-chip ${selected===value?'selected':''}" data-category-genre="${escapeHTML(value)}" aria-pressed="${selected===value}"><span aria-hidden="true">${symbol}</span> ${escapeHTML(label)}</button>`).join('');
 $('home-genre-grid').innerHTML=genreCategories.slice(0,8).map(([value,label,symbol],index)=>`<button type="button" class="home-genre-card genre-color-${index+1}" data-category-genre="${escapeHTML(value)}"><span class="home-genre-symbol" aria-hidden="true">${symbol}</span><strong>${escapeHTML(label)}</strong><small>Descubrir anime ↗</small></button>`).join('');
}
function resetBrowseFilters(){
 for(const id of ['browse-search','genre-select','tag-select','format-select','year-select','status-select'])$(id).value='';
 $('sort-select').value='POPULARITY_DESC';renderCategories();
}
function selectCategory(genre){
 if(!genreCategories.some(([key])=>key===genre)&&genre!=='')return;
 if(!['explorar','categorias','emision'].includes(state.route)){state.pendingGenre=genre;setRoute('categorias');return;}
 $('genre-select').value=genre;
 renderCategories();loadBrowse(true);
}
function routeFromHash(){const r=location.hash.replace(/^#/,'').split('/')[0].toLowerCase();return ['inicio','explorar','categorias','emision','calendario','favoritos','nuevos','cuenta'].includes(r)?r:'inicio';}
function setRoute(route){if(location.hash!==`#${route}`)location.hash=route;else routeChanged()}
function routeChanged(){const route=routeFromHash();state.route=route;document.querySelectorAll('main>.view').forEach(x=>x.classList.add('hidden'));const id={inicio:'home-view',explorar:'browse-view',categorias:'browse-view',emision:'browse-view',calendario:'schedule-view',favoritos:'favorites-view',nuevos:'updates-view',cuenta:'account-view'}[route];$(id).classList.remove('hidden');document.querySelectorAll('.nav-link').forEach(el=>el.classList.toggle('active',el.dataset.route===route));$('mobile-nav').classList.remove('open');$('mobile-menu-trigger').setAttribute('aria-expanded','false');if(['explorar','categorias','emision'].includes(route)){const airing=route==='emision',categories=route==='categorias';$('browse-kicker').textContent=airing?'ESTRENO TRAS ESTRENO':categories?'ENCUENTRA TU ESTILO':'CADA HISTORIA CUENTA';$('browse-heading').innerHTML=airing?'Anime <em>en emisión</em>':categories?'Explora por <em>categorías</em>':'Explora el <em>universo anime</em>';$('browse-subheading').textContent=airing?'Descubre qué series están transmitiendo episodios actualmente.':categories?'Busca por géneros y temáticas: romance, isekai, acción, fantasía, terror y más.':'Combina tu búsqueda por nombre con género, temática, formato, año y estado.';resetBrowseFilters();if(categories&&state.pendingGenre!==undefined){$('genre-select').value=state.pendingGenre;state.pendingGenre=undefined;renderCategories()}$('status-select').disabled=airing;$('status-select').title=airing?'Esta sección muestra exclusivamente animes en emisión.':'';state.browsePage=0;state.browseItems=[];loadBrowse(true)}else if(route==='calendario'){buildCalendarTabs();renderCalendarDay()}else if(route==='favoritos')renderFavorites();else if(route==='nuevos')loadRecent();else if(route==='cuenta')renderAccount();window.scrollTo({top:0,behavior:'instant'});}
async function loadBrowse(reset=false){const token=++state.browseToken;$('load-more').disabled=true;if(reset){state.browsePage=0;state.browseItems=[];const provisional=localBrowse({search:$('browse-search').value,genre:$('genre-select').value,tag:$('tag-select').value,format:$('format-select').value,year:$('year-select').value,status:state.route==='emision'?'RELEASING':$('status-select').value}).items;remember(provisional);$('browse-grid').innerHTML=provisional.map(cardHTML).join('')||'<div class="loading-cards" style="grid-column:1/-1"></div>';$('load-more').classList.add('hidden')}$('results-label').textContent='Buscando historias...';try{let items,hasNext;{const result=await browse({page:state.browsePage+1,search:$('browse-search').value,genre:$('genre-select').value,tag:$('tag-select').value,format:$('format-select').value,year:$('year-select').value,sort:$('sort-select').value,status:state.route==='emision'?'RELEASING':($('status-select').value||null)});items=result.items;hasNext=result.hasNext;state.browseOffline=!!result.offline;}if(token!==state.browseToken)return;state.browsePage++;state.browseItems=reset?items:[...new Map([...state.browseItems,...items].map(a=>[a.id,a])).values()];state.browseHasMore=hasNext;remember(items);$('browse-grid').innerHTML=state.browseItems.length?state.browseItems.map(cardHTML).join(''):`<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">⌕</span><strong>No encontramos ese anime</strong><p>Intenta escribir otro título o cambiar los filtros.</p></div>`;$('load-more').classList.toggle('hidden',!hasNext);$('load-more').disabled=false;$('results-label').textContent=`${state.browseItems.length} ${state.browseItems.length===1?'resultado mostrado':'resultados mostrados'}${state.browseHasMore?' · Hay más páginas':''}${$('genre-select').value?' · '+(wordsByGenre[$('genre-select').value]||$('genre-select').value):''}${$('tag-select').value?' · '+$('tag-select').selectedOptions[0].textContent:''}${state.browseOffline?' · Índice local limitado':''}`;}catch(err){if(token!==state.browseToken)return;$('load-more').disabled=false;$('browse-grid').innerHTML=`<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">◌</span><strong>La búsqueda no pudo completarse</strong><p>${escapeHTML(err.message)}</p><button class="button button-outline" id="retry-browse">Reintentar</button></div>`;$('results-label').textContent='Sin conexión con el catálogo';}}
function renderFavorites(){remember(state.favorites);const term=($('library-search')?.value||'').trim().toLocaleLowerCase();const shown=state.favorites.filter(a=>displayTitle(a).toLocaleLowerCase().includes(term));$('favorites-grid').innerHTML=shown.length?shown.map(cardHTML).join(''):`<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">♡</span><strong>${state.favorites.length?'No hay coincidencias':'Tu lista empieza aquí'}</strong><p>${state.favorites.length?'Prueba con otra búsqueda.':'Explora el catálogo y toca el corazón de cualquier anime para guardarlo en este dispositivo.'}</p><button class="button button-primary" data-goto="explorar">Descubrir anime ↗</button></div>`;}

function progressFor(key){return Math.max(0,Number(state.progress[key]?.count)||0);}
function snapshotLocalProgress(){try{localStorage.setItem('nimerd_progress_v2',JSON.stringify(state.progress));}catch{notify('No se pudo guardar el progreso.');}}
function entryInfo(key){
 if(key.startsWith('anime:')){const id=Number(key.split(':')[1]);const anime=state.items.get(id)||state.favorites.find(a=>a.id===id)||state.progress[key]?.anime;return{title:anime?displayTitle(anime):(state.progress[key]?.title||`Anime ${id}`),anime_data:anime&&anime.title?anime:null};}
 if(key.startsWith('official:')){const o=state.officials.find(o=>o.key===key.slice(9));return{title:o?.title||state.progress[key]?.title||key,anime_data:null};}
 return {title:key,anime_data:null};
}
async function syncLibraryEntry(key){if(!isSignedIn())return;const info=entryInfo(key);const id=key.startsWith('anime:')?Number(key.slice(6)):null;await saveEntry({entry_key:key,title:info.title,anime_data:info.anime_data,favorite:id?isFavorite(id):false,watched_episode:progressFor(key)});}
function updateProgress(key,delta){
 if(!/^(anime:[1-9]\d*|official:[a-z0-9-]{1,70})$/.test(key))return;
 const value=Math.max(0,Math.min(99999,progressFor(key)+delta));const info=entryInfo(key);
 state.progress[key]={count:value,title:info.title,anime:info.anime_data||undefined,updatedAt:new Date().toISOString()};
 if(!isSignedIn())snapshotLocalProgress();else syncLibraryEntry(key).catch(e=>notify('No se pudo sincronizar: '+e.message));
 document.querySelectorAll('[data-progress-count-for]').forEach(el=>{if(el.dataset.progressCountFor===key)el.textContent=String(value)});document.querySelectorAll('[data-progress-input]').forEach(el=>{if(el.dataset.progressInput===key)el.value=String(value)});
 renderAccount();
 notify(value?`Episodio ${value} registrado en tu progreso.`:'Progreso reiniciado.');
}
function progressActions(key){const count=progressFor(key);return `<div class="progress-panel"><div><span class="section-kicker">TU PROGRESO</span><strong>Último capítulo marcado como visto: <span data-progress-count-for="${escapeHTML(key)}">${count}</span></strong><small>El progreso se actualiza al terminar un video o al marcar un capítulo como visto.</small></div><div class="account-actions"><button class="button button-outline" data-progress-key="${escapeHTML(key)}" data-progress-step="-1" type="button" aria-label="Restar un episodio">−</button><button class="button button-primary" data-progress-key="${escapeHTML(key)}" data-progress-step="1" type="button">✓ Siguiente visto</button><label class="progress-jump">Ir al episodio <input type="number" min="0" max="99999" step="1" value="${count}" data-progress-input="${escapeHTML(key)}" aria-label="Número del último episodio visto"></label><button class="button button-outline" data-progress-set="${escapeHTML(key)}" type="button">Guardar</button></div></div>`;}
function renderAccount(){
 const entries=Object.entries(state.progress).filter(([key,v])=>v?.count>0&&/^(anime:|official:)/.test(key)).sort((a,b)=>String(b[1].updatedAt||'').localeCompare(String(a[1].updatedAt||''))).slice(0,150);
 $('account-counts').textContent=`${state.favorites.length} favoritos · ${entries.length} series con progreso`;
 const followed=new Set([...state.favorites.map(a=>a.id),...Object.keys(state.progress).filter(k=>k.startsWith('anime:')).map(k=>Number(k.slice(6)))]);const newForMe=(state.recent||[]).filter(e=>followed.has(e.media?.id)).slice(0,5);$('account-new-episodes').innerHTML=newForMe.length?`<div class="account-new-box"><strong>✦ Nuevas emisiones de tus series</strong><p>${newForMe.map(e=>`${escapeHTML(displayTitle(e.media))} · episodio ${e.episode}`).join(' · ')}</p><small>La emisión no garantiza que se pueda ver el vídeo aquí.</small></div>`:'';
 $('account-progress-list').innerHTML=entries.length?entries.map(([key,v])=>{const title=entryInfo(key).title;const action=key.startsWith('anime:')?`data-anime-id="${Number(key.slice(6))}"`:`data-watch-key="${escapeHTML(key.slice(9))}"`;return `<button class="history-item" ${action} type="button"><span><strong>${escapeHTML(title)}</strong><small>Último episodio visto: ${Number(v.count)}</small></span><span>Continuar ↗</span></button>`;}).join(''):'<p class="stream-note">No has marcado capítulos todavía. Entra en una serie y pulsa «Marcar siguiente visto».</p>';
 $('account-trigger').textContent=isSignedIn()?'◉ Mi perfil':'◉ Mi cuenta';
 $('account-heading').textContent=isSignedIn()?'Mi perfil personal':'Cuenta personal';
 $('account-form').classList.toggle('hidden',isSignedIn()||!isConfigured());
 $('account-logout').classList.toggle('hidden',!isSignedIn());
 $('account-import-local').classList.toggle('hidden',!isSignedIn());
 $('account-status').textContent=isSignedIn()?`Sesión iniciada: ${accountEmail()}`:isConfigured()?'Puedes iniciar sesión o registrarte con tu correo. Si registras una cuenta, quizá tengas que confirmar tu email.':'Cuentas en la nube pendientes de activar por el administrador. El modo invitado funciona y guarda progreso en este navegador.';
 $('library-notice').textContent=isSignedIn()?'Los cambios de tus favoritos y progreso se guardan en tu cuenta configurada. Puedes exportar una copia de los favoritos.':'Tus favoritos y episodios vistos se guardan solo en este dispositivo. Exporta tu lista para conservar una copia.';
}
async function loginAction(create=false){const email=$('account-email').value.trim(),password=$('account-password').value;if(!email||password.length<6){notify('Escribe correo y contraseña de al menos 6 caracteres.');return;}try{const msg=create?await signUp(email,password):await signIn(email,password);if(msg)notify(msg);$('account-password').value='';}catch(e){notify('Error de cuenta: '+e.message);}}
function restoreCloudRows(user,rows){
 state.favorites=rows.filter(x=>x.favorite&&x.anime_data&&Number.isSafeInteger(x.anime_data.id)&&!removedDemo(x.anime_data.id)).map(x=>x.anime_data);
 state.progress={};for(const x of rows){if(removedDemo(x.anime_data?.id)||removedDemo(x.entry_key?.split(':').pop()))continue;if((x.watched_episode||0)>0){state.progress[x.entry_key]={count:x.watched_episode,title:x.title,anime:x.anime_data||undefined,updatedAt:x.updated_at};}if(x.anime_data)remember([x.anime_data]);}
 refreshFavoriteUI();renderAccount();if(state.route==='favoritos')renderFavorites();
 notify('Biblioteca personal sincronizada.');
}
function restoreGuest(){state.favorites=loadFavorites();state.progress=loadProgress();refreshFavoriteUI();renderAccount();if(state.route==='favoritos')renderFavorites();}
async function importGuestToAccount(){if(!isSignedIn())return;const localFavs=loadFavorites();const localProgress=loadProgress();let count=0;for(const a of localFavs){if(!state.favorites.some(e=>e.id===a.id))state.favorites.push(a);remember([a]);count++;}
 for(const [key,v] of Object.entries(localProgress)){if(!state.progress[key]||state.progress[key].count<(v.count||0)){state.progress[key]=v;count++;}}
 const keys=new Set([...state.favorites.map(a=>'anime:'+a.id),...Object.keys(state.progress)]);
 for(const key of keys)await syncLibraryEntry(key);
 refreshFavoriteUI();renderAccount();if(state.route==='favoritos')renderFavorites();notify(`Datos locales importados y sincronizados (${count} cambios).`);
}
function recentCard(e){const a=e.media;return `<button type="button" class="recent-card" data-anime-id="${a.id}"><img src="${escapeHTML(cover(a))}" loading="lazy" alt=""><span class="recent-card-copy"><strong>${escapeHTML(displayTitle(a))}</strong><small>Episodio ${e.episode} · ${escapeHTML(new Intl.DateTimeFormat('es-DO',{dateStyle:'short',timeStyle:'short',timeZone:'America/Santo_Domingo'}).format(new Date(e.airingAt*1000)))}</small><span class="recent-label">Emitido según AniList · No implica vídeo disponible</span></span></button>`;}
async function loadRecent(force=false){
 if(state.recent && !force && Date.now()-state.recentAt<30*60*1000){renderRecent();return;}
 $('updates-status').textContent='Consultando emisiones recientes…';
 try{const items=await getRecentAired();state.recent=items;state.recentAt=Date.now();remember(items.map(e=>e.media));renderRecent();}
 catch(e){$('updates-status').textContent='No se pudieron consultar nuevas emisiones: '+e.message;if(!state.recent){$('recent-home').textContent='Los últimos episodios se cargarán cuando AniList vuelva a responder.';$('updates-grid').textContent='No hay datos de emisiones recientes.';}}
}
function renderRecent(){const items=state.recent||[];$('updates-status').textContent=`${items.length} emisiones registradas en las últimas 72 horas · actualizado al abrir la sección`;$('updates-grid').innerHTML=items.length?items.map(recentCard).join(''):'<p>Sin emisiones recientes registradas en la consulta.</p>';$('recent-home').innerHTML=items.length?items.slice(0,4).map(recentCard).join(''):'<p>No hay emisiones recientes disponibles.</p>';renderAccount();}

function daysFromToday(){const now=new Date(Date.now()-4*3600*1000);const date=new Date(now.toISOString().slice(0,10)+'T12:00:00Z');return Array.from({length:7},(_,i)=>{const d=new Date(date.getTime()+i*86400000);return{ymd:d.toISOString().slice(0,10),day:d.getUTCDay(),date:d.getUTCDate()}})}
function buildCalendarTabs(){const days=daysFromToday();$('calendar-tabs').innerHTML=days.map((d,i)=>`<button class="day-tab ${state.scheduleIndex===i?'active':''}" role="tab" aria-selected="${state.scheduleIndex===i}" data-day-index="${i}">${i===0?'HOY':dayNames[d.day]}<span>${d.date} ${new Intl.DateTimeFormat('es-DO',{month:'short',timeZone:'UTC'}).format(new Date(d.ymd+'T12:00:00Z'))}</span></button>`).join('');}
async function renderCalendarDay(){const token=++state.scheduleToken,day=daysFromToday()[state.scheduleIndex];$('calendar-grid').innerHTML='<div class="loading-cards" style="grid-column:1/-1"></div>';try{let schedules=[];if(!state.isDemo)schedules=await getScheduleDay(day.ymd);if(token!==state.scheduleToken)return;remember(schedules.map(e=>e.media));$('calendar-grid').innerHTML=schedules.length?schedules.map(e=>`<div class="calendar-card" role="button" tabindex="0" data-anime-id="${e.media.id}"><img loading="lazy" src="${escapeHTML(cover(e.media))}" alt=""/><div class="calendar-card-copy"><time datetime="${new Date(e.airingAt*1000).toISOString()}">${escapeHTML(fmtTime.format(new Date(e.airingAt*1000)))}</time><h3>${escapeHTML(displayTitle(e.media))}</h3><span>Episodio ${e.episode} · ${escapeHTML(statuses[e.media.status]||'Anime')}</span></div><span class="schedule-chevron">›</span></div>`).join(''):`<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">◷</span><strong>No hay emisiones registradas para ${state.scheduleIndex===0?'hoy':weekdayFull[day.day]}</strong><p>${state.isDemo?'El calendario real se activa al recuperar la conexión con AniList.':'Selecciona otro día para explorar las próximas emisiones.'}</p></div>`;}catch(e){if(token!==state.scheduleToken)return;$('calendar-grid').innerHTML=`<div class="empty-state" style="grid-column:1/-1"><strong>No pudimos cargar este día</strong><p>${escapeHTML(e.message)}</p><button class="button button-outline" id="retry-day">Reintentar</button></div>`;}}
function officialMatches(anime){
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const titles=[anime?.title?.english,anime?.title?.romaji,anime?.title?.native].map(normalize).filter(Boolean);
 return state.officials.filter(o=>(o.aliases||[]).some(alias=>titles.includes(normalize(alias)))||(o.directorySlug&&titles.includes(normalize(o.title.split('|')[0].replace(/\s*\((?:sub|dub)\).*$/i,'').trim()))));
}
function officialUrl(o,playlistIndex=0){
 const playlist=o.playlists?.[playlistIndex];
 if(playlist)return `https://www.youtube.com/playlist?list=${encodeURIComponent(playlist.id)}`;
 const direct=o.directEpisodes?.[0];if(direct)return safeUrl(direct.source||o.source);
 const video=o.videos?.[0];if(video)return `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
 return safeUrl(o.source);
}
function officialCard(o){
 const initial=o.title.split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
 return `<article class="watch-card"><div class="watch-cover watch-cover-${escapeHTML(o.key)}" data-official-detail="${escapeHTML(o.key)}" role="button" tabindex="0" aria-label="Abrir ${escapeHTML(o.title)}"><div class="watch-cover-mark">${escapeHTML(initial)}</div><span class="watch-tag">${o.directEpisodes?.length?'▶ HTML5 · vídeo libre':o.externalOnly?'Solo enlace externo':o.directorySlug?'▶ Capítulos de canal oficial':'▶ Player YouTube'}</span></div><div class="watch-card-body"><span class="watch-channel">${escapeHTML(o.provider)}</span><h2 data-official-detail="${escapeHTML(o.key)}" role="button" tabindex="0">${escapeHTML(o.title)}</h2><p class="watch-meta">${escapeHTML(o.language)} · ${escapeHTML(o.tag||'Anime')}</p><p class="watch-count">${o.directEpisodes?.length?`${o.directEpisodes.length} vídeo(s) con licencia abierta · reproductor de Nime RD`:o.reported?`${Number(o.reported)} capítulos listados (reproducción por comprobar)`:'Playlist de episodios o películas oficiales'}</p><p class="watch-progress-label">✓ Último visto: <span data-progress-count-for="official:${escapeHTML(o.key)}">${progressFor('official:'+o.key)}</span></p><div class="watch-actions">${o.externalOnly?'':`<button class="button button-primary" data-official-detail="${escapeHTML(o.key)}">▶ Temporadas y capítulos</button>`}<a class="button button-outline" href="${escapeHTML(officialUrl(o))}" target="_blank" rel="noopener noreferrer">${o.directEpisodes?.length?'Licencia y archivo ↗':o.externalOnly?'Abrir fuente ↗':'En YouTube ↗'}</a></div></div></article>`;
}
function renderHomeOfficials(){const root=$('home-watch-grid');if(root)root.innerHTML=state.officials.filter(o=>!o.externalOnly&&(o.directEpisodes?.length||o.playlists?.length||o.videos?.length||o.directorySlug)).slice(0,72).map(officialCard).join('');}
function renderOfficialCatalog(){
 const query=($('watch-search')?.value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const language=$('watch-language')?.value||'todos';
 const type=$('watch-type')?.value||'todos';
 const category=$('watch-category')?.value||'todos';
 const matches=state.officials.filter(o=>{
  if(type==='directo'&&!o.directEpisodes?.length)return false;
  if(type==='youtube'&&(o.directEpisodes?.length||o.externalOnly))return false;
  const term=[o.title,o.provider,o.tag,...(o.aliases||[])].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const lang=o.language.toLowerCase();
  const marked=(o.tag||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const filterCategory=category.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(category!=='todos'&&!marked.includes(filterCategory))return false;
  return term.includes(query)&&(language==='todos'||(language==='es'&&lang.includes('español'))||(language==='en'&&lang.includes('inglés'))||(language==='multi'&&lang.includes('multi')));
 });
 const shown=matches.length?matches.map(officialCard).join(''):'<div class="empty-state"><strong>No hay coincidencias</strong><p>Prueba con otro título o idioma.</p></div>';
 $('watch-grid').innerHTML=shown;
 const direct=state.officials.filter(o=>o.directEpisodes?.length).length;
 const youtube=state.officials.filter(o=>!o.externalOnly&&!o.directEpisodes?.length).length;
 $('watch-stats').textContent=`${direct} vídeos libres · ${youtube} fuentes de canales oficiales · ${state.officials.length} entradas listadas. ${state.directoryStatus}`;
}
function playerFrame(url,label){
 const wrap=document.createElement('div');wrap.className='video-frame';const frame=document.createElement('iframe');frame.src=url;frame.title=label;frame.loading='eager';frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');frame.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');frame.allowFullscreen=true;wrap.append(frame);return wrap;
}
function watchDirectLicensed(o,selected=0){
 const episodes=o.directEpisodes||[];
 const ep=episodes[Math.max(0,Math.min(episodes.length-1,Number(selected)||0))];if(!ep||!safeUrl(ep.url))return;
 closeModal();closeVideo();
 $('video-heading-text').textContent=`${o.title} · Episodio ${ep.number}`;
 const mount=$('player-mount');mount.replaceChildren();
 const container=document.createElement('div');container.className='video-frame';
 const v=document.createElement('video');v.controls=true;v.playsInline=true;v.preload='metadata';v.src=ep.url;
 v.setAttribute('aria-label',`${o.title}, episodio ${ep.number}`);v.setAttribute('controlsList','nodownload');
 v.addEventListener('error',()=>notify('No se pudo recibir el vídeo desde Wikimedia Commons. Comprueba tu conexión o abre el archivo original.'));
 v.addEventListener('ended',()=>{const key='official:'+o.key; if(progressFor(key)<ep.number)updateProgress(key,ep.number-progressFor(key));});
 container.append(v);mount.append(container);state.videoEl=v;
 const controls=document.createElement('div');controls.className='watch-player-actions';
 episodes.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.className='button '+(i===Number(selected)?'button-primary':'button-outline');b.textContent=`Episodio ${item.number}`;b.addEventListener('click',()=>watchDirectLicensed(o,i));controls.append(b)});
 const credits=document.createElement('p');credits.className='stream-note';credits.textContent=`Créditos: ${ep.credits||o.provider} · Licencia ${ep.license||'libre'}. Archivo multimedia alojado por Wikimedia Commons.`;
 const source=document.createElement('a');source.href=safeUrl(ep.source||o.source);source.target='_blank';source.rel='noopener noreferrer';source.className='button button-outline';source.textContent='Ver archivo y atribución ↗';controls.append(source);
 const license=document.createElement('a');license.href=safeUrl(ep.licenseUrl);license.target='_blank';license.rel='noopener noreferrer';license.className='button button-outline';license.textContent='Condiciones de licencia ↗';controls.append(license);
 mount.append(controls,credits);
 const progress=document.createElement('div');progress.innerHTML=progressActions('official:'+o.key);mount.append(progress);
 $('player-caption').textContent=`▶ Vídeo libre en el reproductor HTML5 de Nime RD. El archivo se transmite desde Wikimedia Commons, sin abrir otra página. El contenido no está alojado en Netlify.`;
 $('video-overlay').classList.remove('hidden');document.body.classList.add('modal-open');$('video-close').focus();
}
function watchOfficial(key,playlistIndex=0,videoIndex=null,directIndex=0){
 const o=state.officials.find(item=>item.key===key);if(!o)return;
 if(o.directEpisodes?.length){watchDirectLicensed(o,directIndex);return;}
 if(o.externalOnly){notify('El canal bloquea la reproducción integrada. Abre la fuente oficial.');return}
 closeModal();closeVideo();
 $('video-heading-text').textContent=o.title;
 const mount=$('player-mount');mount.replaceChildren();
 const video=Number.isInteger(videoIndex)?o.videos?.[videoIndex]:o.videos?.[0];const playlist=Number.isInteger(videoIndex)?null:o.playlists?.[playlistIndex];
 const src=playlist?`https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlist.id)}`:video?`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?rel=0`:null;
 if(!src)return;
 const frameWrap=playerFrame(src,`Episodios oficiales de ${o.title} · ${o.provider}`);mount.append(frameWrap);
 const tools=document.createElement('div');tools.className='watch-player-actions';
 for(const [i,p] of (o.playlists||[]).entries()){
  const b=document.createElement('button');b.type='button';b.className='button '+(i===playlistIndex?'button-primary':'button-outline');b.textContent=p.label;b.addEventListener('click',()=>watchOfficial(key,i,null));tools.append(b)
 }
 for(const [i,v] of (o.videos||[]).entries()){
  const b=document.createElement('button');b.type='button';b.className='button '+(i===(videoIndex??0)?'button-primary':'button-outline');b.textContent=`Episodio ${v.number}`;b.addEventListener('click',()=>watchOfficial(key,0,i));tools.append(b)
 }
 const alternate=document.createElement('button');alternate.type='button';alternate.className='button button-outline';alternate.textContent='↻ Probar reproductor alternativo';alternate.addEventListener('click',()=>{const frame=frameWrap.querySelector('iframe');frame.src=frame.src.includes('youtube-nocookie.com')?frame.src.replace('youtube-nocookie.com','youtube.com'):frame.src.replace('www.youtube.com','www.youtube-nocookie.com');notify('Probando otro reproductor oficial de YouTube.');});tools.append(alternate);const a=document.createElement('a');a.className='button button-outline';a.textContent='↗ Abrir en YouTube';a.href=playlist?officialUrl(o,playlistIndex):`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;a.rel='noopener noreferrer';a.target='_blank';tools.append(a);mount.append(tools);const progress=document.createElement('div');progress.innerHTML=progressActions('official:'+o.key);mount.append(progress);
 $('player-caption').textContent=`Fuente: ${o.provider}. No alojamos el vídeo. Si aparece una restricción de país o inserción, ábrelo en YouTube. Idioma publicado: ${o.language}.`;
 $('video-overlay').classList.remove('hidden');document.body.classList.add('modal-open');$('video-close').focus();
}
function linksFor(anime){const candidates=(anime.externalLinks||[]).filter(link=>playerSites.some(name=>(link.site||'').toLowerCase().includes(name))&&safeUrl(link.url));const unique=new Map();for(const link of candidates)if(!unique.has(link.site))unique.set(link.site,link);return [...unique.values()].slice(0,12)}
function configuredEpisodes(id){
 const anime=state.items.get(id)||state.favorites.find(a=>a.id===id),keys=[String(id)];
 const mal=anime?.idMal||(id>=1000000000&&id<2000000000?id-1000000000:null),kitsu=anime?.kitsuId||(id>=2000000000?id-2000000000:null);
 if(mal)keys.push('mal:'+mal,String(1000000000+Number(mal)));
 if(kitsu)keys.push('kitsu:'+kitsu,String(2000000000+Number(kitsu)));
 if(id<900000000)keys.push('anilist:'+id);
 const episodes=new Map();for(const key of new Set(keys)){const values=state.streams[key];if(!Array.isArray(values))continue;for(const e of values){const n=Number(e?.number);if(Number.isSafeInteger(n)&&n>0&&typeof e.url==='string'&&e.url.trim()&&safeUrl(e.url)&&['mp4','webm','hls'].includes(e.type)&&!episodes.has(n))episodes.set(n,e);}}
 return [...episodes.values()].sort((a,b)=>Number(a.number)-Number(b.number));
}

/** Temporadas y capítulos: se muestran dentro de la ficha, no en un reproductor separado.
 * Una posición de playlist no se interpreta como capítulo confirmado. Las listas se actualizan
 * desde el canal original; el calendario se consulta a AniList.
 */

async function loadBigOfficialCatalog(){
 try{
  const first=await fetchSeriesPage(1);if(!Array.isArray(first.items)||!first.items.length)throw new Error('El directorio respondió vacío.');
  const add=(items)=>{let n=0;for(const x of items){if(!x?.slug||!x?.title)continue;const o=makeEntry(x);if(state.officials.some(a=>a.key===o.key))continue;state.officials.push(o);n++;}state.directoryCount+=n;state.directoryStatus=`Directorio ampliado: ${state.directoryCount} series consultadas (no todas permiten reproducción).`;renderOfficialCatalog();renderHomeOfficials();};
  add(first.items);const total=Math.min(20,Math.max(1,Number(first.totalPages)||1));
  // Paginación real del origen: evita crear registros inventados.
  for(let i=2;i<=total;i+=3){const pages=await Promise.allSettled(Array.from({length:Math.min(3,total-i+1)},(_,j)=>fetchSeriesPage(i+j)));for(const result of pages)if(result.status==='fulfilled')add(result.value.items||[]);}
  state.directoryStatus=`Catálogo ampliado consultado: ${state.directoryCount} series y episodios del origen. Solo los vídeos con inserción permitida podrán verse dentro de Nime RD.`;
 }catch(err){state.directoryStatus=`Catálogo ampliado no disponible: ${String(err.message||err).slice(0,120)}. Siguen visibles las listas integradas.`;}
 renderOfficialCatalog();renderHomeOfficials();
}
async function directorySeriesPlay(o,page=1){
 const slot=$('series-player-inline'),list=$('series-episode-list');if(!slot||!list)return;
 const token=++state.directoryToken;page=Math.max(1,Math.min(30,page||1));
 state.activeSeries={key:o.key,playlistIndex:0,position:0,page};
 document.querySelectorAll('[data-series-key]').forEach(b=>b.classList.toggle('active',b.dataset.seriesKey===o.key));
 slot.innerHTML='<div class="directory-message">Consultando los episodios del canal original…</div>';list.innerHTML='';
 try{const data=await fetchEpisodePage(o.directorySlug,page);if(token!==state.directoryToken||!$('series-player-inline'))return;
  const entries=(data.episodes||[]).filter(x=>/^[a-z0-9-]+$/i.test(x.slug));
  const count=Number(data.reportedCount)||o.reported||0;
  const max=Math.max(1,Math.min(30,Number(data.totalPages)||1));
  list.innerHTML=`<h4>${escapeHTML(o.title)} · ${count?count+' vídeos listados': 'episodios del canal'} · página ${page} de ${max}</h4><p class="series-note">Los episodios se consultan al abrir esta ficha; el listado se actualiza cuando el directorio incorpora publicaciones del canal. La disponibilidad real depende de YouTube y del país.</p><div class="directory-episode-list">${entries.map((e,i)=>`<button type="button" data-directory-key="${escapeHTML(o.key)}" data-directory-episode="${escapeHTML(e.slug)}" data-directory-number="${(page-1)*36+i+1}" class="directory-episode-btn"><span class="directory-play">▶</span><span>${escapeHTML(e.title)}</span></button>`).join('')}</div><div class="directory-pagination"><button class="button button-outline" ${page<=1?'disabled':''} data-directory-page="${page-1}" data-directory-key="${escapeHTML(o.key)}">← Anterior</button><span>Página ${page} / ${max}</span><button class="button button-outline" ${page>=max?'disabled':''} data-directory-page="${page+1}" data-directory-key="${escapeHTML(o.key)}">Siguiente →</button></div>`;
  if(entries.length)directorySelectEpisode(o.key,entries[0].slug,(page-1)*36+1);
  else slot.innerHTML='<div class="directory-message">Esta página no contiene episodios publicados en la fuente.</div>';
 }catch(err){if(token===state.directoryToken&&$('series-player-inline'))slot.innerHTML=`<div class="directory-message">No se pudo consultar la lista de capítulos. ${escapeHTML(err.message)}</div>`;}
}
async function directorySelectEpisode(key,slug,num){
 const o=state.officials.find(o=>o.key===key);if(!o||!o.directorySlug||!/^[a-z0-9-]+$/i.test(slug))return;
 const slot=$('series-player-inline');if(!slot)return;
 const token=++state.directoryToken;slot.innerHTML='<div class="directory-message">Comprobando si el canal permite la reproducción integrada…</div>';
 document.querySelectorAll('[data-directory-episode]').forEach(b=>b.classList.toggle('selected',b.dataset.directoryEpisode===slug));
 try{const data=await fetchEpisodePlayback(o.directorySlug,slug);if(token!==state.directoryToken||!$('series-player-inline'))return;
  const source=safeUrl(data.source)||safeUrl(o.source);const link=source?`<a href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer" class="button button-outline">Fuente del episodio ↗</a>`:'';
  const canEmbed=Boolean(data.youtubeId&&data.embeddingAllowed&&/^[a-zA-Z0-9_-]{11}$/.test(data.youtubeId));
  const msg=escapeHTML(data.notice||'No hay autorización de reproducción comprobable.');
  if(canEmbed){slot.innerHTML=`<div class="video-frame"><iframe loading="eager" title="${escapeHTML(o.title)} episodio" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.youtubeId)}?rel=0&playsinline=1" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div><div class="series-play-tools"><span>Canal original · vídeo oficial · episodio ${num}</span>${link}</div><p class="series-note">${msg} La inserción y la región no pudieron verificarse desde República Dominicana.</p><button type="button" class="button button-outline" data-directory-key="${escapeHTML(o.key)}" data-directory-mark="${num}">✓ Marcar episodio ${num} como visto</button>${progressActions('official:'+o.key)}`;}
  else slot.innerHTML=`<div class="directory-message"><strong>Este capítulo no se puede reproducir aquí.</strong><p>${msg}</p><p>No se eluden bloqueos de distribución ni restricciones del canal.</p>${link}</div>`;
 }catch(err){if(token===state.directoryToken&&$('series-player-inline'))slot.innerHTML=`<div class="directory-message">No se pudo comprobar el vídeo de este capítulo: ${escapeHTML(err.message)}</div>`;}
}

function seriesHubHTML(anime,official,episodes){
 const rel=(anime.relations?.edges||[]).filter(e=>e?.node?.type==='ANIME'&&['PREQUEL','SEQUEL'].includes(e.relationType)&&['TV','TV_SHORT','ONA'].includes(e.node.format)).slice(0,16);
 const playable=official.filter(o=>!o.externalOnly&&(o.directEpisodes?.length||o.playlists?.length||o.videos?.length||o.directorySlug));
 const note=playable.length?`<p class="series-note">${playable.length} fuente(s) relacionada(s). Los capítulos se reproducen aquí únicamente cuando el titular permite la inserción y están disponibles en tu país.</p>`:`<p class="series-note">No se han localizado capítulos gratuitos integrables para esta ficha. La serie sigue apareciendo en el catálogo para que puedas consultar sus temporadas y emisiones.</p>`;
 const sources=playable.flatMap(o=>(o.playlists?.length?o.playlists.map((p,i)=>`<button type="button" class="series-season-btn" data-series-key="${escapeHTML(o.key)}" data-series-playlist="${i}">${escapeHTML(p.label)} · ${escapeHTML(o.provider)}</button>`):[`<button type="button" class="series-season-btn" data-series-key="${escapeHTML(o.key)}" data-series-playlist="0">${escapeHTML(o.title)} · ${escapeHTML(o.provider)}</button>`])).join('');
 const seasonLinks=rel.length?`<div class="series-related"><h4>Otras temporadas de la historia</h4><p class="series-note">Precuelas y secuelas vinculadas en AniList. Cada temporada tiene su propia ficha y disponibilidad de vídeo.</p><div class="series-related-grid">${rel.map(e=>`<button type="button" class="series-related-item" data-anime-id="${e.node.id}"><img src="${escapeHTML(imageUrl(e.node.coverImage?.large))}" loading="lazy" alt=""><span><strong>${escapeHTML(e.node.title?.english||e.node.title?.romaji||'Temporada')}</strong><small>${e.relationType==='SEQUEL'?'Secuela':'Precuela'} · ${escapeHTML(String(e.node.seasonYear||''))} · ${e.node.episodes?e.node.episodes+' episodios':'episodios por confirmar'}</small></span></button>`).join('')}</div></div>`:'';
 const airing=anime.nextAiringEpisode?.airingAt?`<p class="series-airing">◷ Próximo capítulo ${Number(anime.nextAiringEpisode.episode)}: ${escapeHTML(new Intl.DateTimeFormat('es-DO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Santo_Domingo'}).format(new Date(anime.nextAiringEpisode.airingAt*1000)))} (hora RD). Esto indica emisión, no publicación del vídeo.</p>`:'';
 return `<section class="series-hub" id="series-hub"><div class="series-heading"><span class="section-kicker">VER Y CONTINUAR</span><h3>Temporadas y capítulos</h3><p>${anime.episodes?`${Number(anime.episodes)} capítulos registrados en AniList. `:''}${escapeHTML(statuses[anime.status]||'')}.</p></div>${airing}${note}<div class="series-season-tabs" id="series-season-tabs">${sources}</div><div class="series-main-player" id="series-player-inline"><div class="series-player-empty">${playable.length?'Selecciona una temporada para cargar el reproductor oficial.':'Sin vídeos autorizados integrables para esta serie.'}</div></div><div id="series-episode-list" class="series-episode-list"></div>${seasonLinks}</section>`;
}
function seriesPlay(key,playlistIndex=0,position=0,page=0){
 const o=state.officials.find(x=>x.key===key);const slot=$('series-player-inline'),list=$('series-episode-list');if(!slot||!list||!o||o.externalOnly)return;
 if(o.directorySlug){directorySeriesPlay(o,page);return;}
 const playlist=o.playlists?.[playlistIndex]||null;
 const direct=o.directEpisodes||[];const videos=o.videos||[];
 state.activeSeries={key,playlistIndex,position,page};
 document.querySelectorAll('[data-series-key]').forEach(b=>b.classList.toggle('active',b.dataset.seriesKey===key&&Number(b.dataset.seriesPlaylist)===playlistIndex));
 const episode=direct.length?direct[Math.min(position,direct.length-1)]:null;
 const video=videos.length?videos[Math.min(position,videos.length-1)]:null;
 let sourceUrl=playlist?`https://www.youtube.com/playlist?list=${encodeURIComponent(playlist.id)}`:video?`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`:(episode?episode.source||o.source:o.source);
 let player='';
 if(episode){
  const url=safeUrl(episode.url);if(!url)return;
  player=`<div class="video-frame"><video controls playsinline preload="metadata" src="${escapeHTML(url)}" aria-label="${escapeHTML(o.title)} episodio ${Number(episode.number)}"></video></div>`;
 } else if(playlist){
  player=`<div class="video-frame"><div class="series-yt-mount" id="series-yt-mount"><iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlist.id)}&index=${Math.max(0,position)}&rel=0" title="${escapeHTML(o.title)} · ${escapeHTML(playlist.label)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></div>`;
 } else if(video){
  player=`<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?rel=0" title="${escapeHTML(o.title)} episodio ${Number(video.number)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
 }
 if(state.ytSeriesPlayer){try{state.ytSeriesPlayer.destroy()}catch{}state.ytSeriesPlayer=null}
 slot.innerHTML=`${player}<div class="series-play-tools"><span>Fuente: <strong>${escapeHTML(o.provider)}</strong> · ${escapeHTML(o.language||'')}</span><a class="button button-outline" href="${escapeHTML(safeUrl(sourceUrl)||'https://www.youtube.com')}" target="_blank" rel="noopener noreferrer">Ver fuente oficial ↗</a></div><p class="series-note">${playlist?'Los números de abajo son posiciones dentro de la lista oficial, no episodios individualmente verificados. Los vídeos nuevos que publique el canal se incorporarán a su lista automáticamente.':episode?'Vídeo de licencia abierta; consulta la atribución en el enlace de origen.':'Vídeo publicado por el canal original.'} La reproducción puede estar bloqueada por país o por el distribuidor.</p>${progressActions('official:'+o.key)}`;
 const makeButton=(label,i)=>`<button type="button" class="series-episode-btn ${i===position?'selected':''}" data-series-position="${i}">${escapeHTML(label)}</button>`;
 let entries='';
 if(direct.length)entries=direct.map((e,i)=>makeButton('Capítulo '+e.number,i)).join('');
 else if(videos.length)entries=videos.map((e,i)=>makeButton('Capítulo '+e.number,i)).join('');
 else if(playlist){
  // Conteos comunicados por las fuentes, NO equivale a un inventario confirmado de la playlist.
  const count=o.playlists.length===1&&Number.isSafeInteger(o.reported)&&o.reported>0?Math.min(o.reported,500):0;
  if(count){const pageSize=36;const maxPage=Math.ceil(count/pageSize)-1;const activePage=Math.max(0,Math.min(maxPage,page));const start=activePage*pageSize;
   entries=`<div class="series-position-title">Explorar posiciones en la lista (${count} reportadas por la fuente)</div><div class="series-episode-grid">${Array.from({length:Math.min(pageSize,count-start)},(_,i)=>makeButton('Cap. '+(start+i+1),start+i)).join('')}</div><div class="series-pagination"><button type="button" class="button button-outline" data-series-page="${activePage-1}" ${activePage===0?'disabled':''}>← Anterior</button><span>${activePage+1} / ${maxPage+1}</span><button type="button" class="button button-outline" data-series-page="${activePage+1}" ${activePage===maxPage?'disabled':''}>Siguiente →</button></div>`;
  }else entries='<p class="series-note">Elige el episodio desde los controles de la lista oficial dentro del reproductor. No tenemos un inventario numerado verificado de esta temporada.</p>';
 }
 list.innerHTML=`<h4>${escapeHTML(playlist?.label||o.title)} · ${escapeHTML(o.provider)}</h4>${entries.startsWith('<div')||entries.startsWith('<p')?entries:`<div class="series-episode-grid">${entries}</div>`}`;
 // El iframe ya es funcional como lista; el botón numérico solicita una posición. API opcional para fijarla de forma robusta.
 if(playlist&&position>0)loadPlaylistPosition(playlist.id,position);
}
let ytApiPending=null;
function ensureYouTubeIframeAPI(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(ytApiPending)return ytApiPending;
 ytApiPending=new Promise((resolve,reject)=>{
  const old=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{try{old?.()}catch{}resolve(window.YT)};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
  script.onerror=()=>reject(new Error('No se pudo cargar la API de YouTube'));
  document.head.append(script);
  setTimeout(()=>{if(!window.YT?.Player)reject(new Error('No respondió YouTube'))},10000);
 });return ytApiPending;
}
async function loadPlaylistPosition(playlistId,index){
 // Fallback inmediato: conserva el reproductor nativo oficial sin pedir claves API.
 const mount=$('series-yt-mount');if(!mount)return;
 const iframe=mount.querySelector('iframe');if(iframe)iframe.src=`https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&index=${index}&rel=0`;
 try{
  await ensureYouTubeIframeAPI();
  const active=state.activeSeries;
  if(!active||!document.contains(mount)||active.position!==index)return;
  const holder=document.createElement('div');holder.style.width='100%';holder.style.height='100%';mount.replaceChildren(holder);
  state.ytSeriesPlayer=new window.YT.Player(holder,{width:'100%',height:'100%',host:'https://www.youtube-nocookie.com',playerVars:{playsinline:1,rel:0},events:{onReady:e=>{try{e.target.cuePlaylist({listType:'playlist',list:playlistId,index})}catch{}},onError:()=>notify('El canal bloqueó o retiró este vídeo. Puedes abrir la lista oficial.')}});
 }catch{/* La inserción HTML conserva el fallback, aunque algunos canales la bloquean. */}
}
function seriesEvents(e){
 const ep=e.target.closest('[data-directory-episode]');if(ep){directorySelectEpisode(ep.dataset.directoryKey,ep.dataset.directoryEpisode,Number(ep.dataset.directoryNumber));return true;}
 const dp=e.target.closest('[data-directory-page]');if(dp){const o=state.officials.find(o=>o.key===dp.dataset.directoryKey);if(o)directorySeriesPlay(o,Number(dp.dataset.directoryPage));return true;}
 const mark=e.target.closest('[data-directory-mark]');if(mark){const key='official:'+mark.dataset.directoryKey;const num=Number(mark.dataset.directoryMark);if(Number.isSafeInteger(num)&&num>=0)updateProgress(key,num-progressFor(key));return true;}
 const season=e.target.closest('[data-series-key]');if(season){seriesPlay(season.dataset.seriesKey,Number(season.dataset.seriesPlaylist||0));return true}
 const pos=e.target.closest('[data-series-position]');if(pos&&state.activeSeries){const a=state.activeSeries;seriesPlay(a.key,a.playlistIndex,Number(pos.dataset.seriesPosition),Math.floor(Number(pos.dataset.seriesPosition)/36));return true}
 const page=e.target.closest('[data-series-page]');if(page&&state.activeSeries){const a=state.activeSeries;seriesPlay(a.key,a.playlistIndex,a.position,Number(page.dataset.seriesPage));return true}
 return false;
}

function openOfficialDetail(o){
 state.modalId=-1;state.activeSeries=null;
 const mock={id:-1,title:{english:o.title,romaji:o.title},episodes:o.reported||null,status:null,genres:[],nextAiringEpisode:null,relations:{edges:[]}};
 $('modal-body').innerHTML=`<div class="modal-banner" style="background:linear-gradient(120deg,#30164c,#130924)"></div><div class="modal-main"><div class="modal-copy"><span class="section-kicker">CAPÍTULOS DE CANALES OFICIALES</span><h2 id="modal-title">${escapeHTML(o.title)}</h2><p class="series-note">${escapeHTML(o.language)} · ${escapeHTML(o.provider)}. ${o.reported?`${Number(o.reported)} entradas señaladas por la fuente; disponibilidad no verificada en República Dominicana.`:''}</p></div><div style="clear:both;width:100%">${seriesHubHTML(mock,[o],[])}<p class="series-note">Esta es una lista oficial existente. Nime RD no aloja copias de los episodios; su reproducción puede estar restringida por región o inserción.</p></div></div>`;
 $('modal-overlay').classList.remove('hidden');document.body.classList.add('modal-open');$('modal-close').focus();seriesAutoload([o]);
}

function seriesAutoload(official){
 const o=official.find(o=>!o.externalOnly&&(o.directEpisodes?.length||o.playlists?.length||o.videos?.length||o.directorySlug));
 if(o){seriesPlay(o.key,0,0,0);requestAnimationFrame(()=>{const pane=$('detail-modal'),hub=$('series-hub');if(pane&&hub){const offset=hub.getBoundingClientRect().top-pane.getBoundingClientRect().top+pane.scrollTop-15;pane.scrollTop=Math.max(0,offset)}});}
}

async function showDetails(id){if(removedDemo(id))return;let anime=state.items.get(id)||state.favorites.find(f=>f.id===id);if(!anime&&!state.isDemo){try{anime=await getDetail(id);remember([anime])}catch{notify('No se pudo abrir este anime.');return}}if(!anime)return;openModal(anime);if(!anime._demo){try{const full=await getDetail(id);remember([full]);if(state.modalId===id)openModal(full)}catch{}}}
function openModal(anime){state.activeSeries=null;state.modalId=anime.id;const title=displayTitle(anime),rel=anime.relations?.edges||[],configured=configuredEpisodes(anime.id);$('modal-body').innerHTML=`<div class="modal-banner" style="background-image:linear-gradient(0deg,#18112755,#32165666),url('${escapeHTML(cover(anime).replace(/'/g,''))}')"></div><div class="modal-main"><img class="modal-cover" src="${escapeHTML(cover(anime))}" onerror="this.onerror=null;this.src='assets/art/eclipse.svg'" alt="${escapeHTML(title)}"/><div class="modal-copy"><span class="section-kicker">${anime.offline?'ÍNDICE LOCAL · DATOS LIMITADOS':'NIME RD'}</span><h2 id="modal-title">${escapeHTML(title)}</h2><div class="modal-metas">${[anime.seasonYear,anime.format,statuses[anime.status],...anime.genres||[]].filter(Boolean).map(v=>`<span>${escapeHTML(v)}</span>`).join('')}</div><button class="button button-primary" id="detail-fav" data-fav-id="${anime.id}">${isFavorite(anime.id)?'♥ En mi lista':'♡ Guardar en mi lista'}</button></div><div class="cinema-library"><p class="modal-synopsis">${escapeHTML(plainText(anime.description)||'Sin sinopsis disponible.')}</p>${progressActions('anime:'+anime.id)}<div class="cinema-heading"><h3>Temporadas</h3><select id="cinema-season" aria-label="Temporadas"><option value="${anime.id}">${escapeHTML(title)}</option>${rel.filter(r=>['PREQUEL','SEQUEL'].includes(r.relationType)&&r.node?.type==='ANIME').map(r=>`<option value="${r.node.id}">${escapeHTML(r.node.title?.romaji||r.node.title?.english||'Temporada relacionada')}</option>`).join('')}</select></div><h3>Episodios</h3><div id="cinema-episodes">Consultando episodios…</div></div></div>`;$('cinema-season').onchange=e=>showDetails(Number(e.target.value));$('modal-overlay').classList.remove('hidden');document.body.classList.add('modal-open');$('modal-close').focus();renderCinemaEpisodes(anime,1);}
let cinemaToken=0;
async function renderCinemaEpisodes(anime,page){const token=++cinemaToken,slot=$('cinema-episodes');if(!slot)return;const configured=configuredEpisodes(anime.id);let data;try{data=await getEpisodes(anime.id,page)}catch{data={items:[],hasNext:false}}if(token!==cinemaToken||state.modalId!==anime.id)return;let items=data.items||[];if(page===1){const present=new Set(items.map(e=>Number(e.number)));items=[...items,...configured.filter(e=>!present.has(Number(e.number))&&(Number(e.number)<=20||!data.hasNext)).map(e=>({number:e.number,title:e.title}))].sort((a,b)=>Number(a.number)-Number(b.number));}const notice=configured.length?'':'<p class="stream-note">Selecciona un episodio para consultar su disponibilidad de video. No todos los títulos están disponibles en el proveedor.</p>';slot.innerHTML=notice+(items.length?items.map(e=>{const n=Number(e.number);if(!Number.isSafeInteger(n)||n<1)return '';const source=configured.find(c=>Number(c.number)===n),available=!!source;return `<div class="cinema-row"><span class="cinema-num">${n}</span><img src="${escapeHTML(imageUrl(e.thumbnail||cover(anime)))}" onerror="this.onerror=null;this.src='assets/art/eclipse.svg'" alt="" loading="lazy"/><div><strong>${escapeHTML(source?.title||e.title||'Episodio '+n)}</strong><small>${available?'Video vinculado':'Consultar disponibilidad'}</small></div><button type="button" class="button button-outline" data-episode-id="${anime.id}" data-episode-number="${n}">${available?'▶ Ver':'▶ Consultar video'}</button></div>`}).join(''):'<p class="stream-note">No se pudo obtener la lista de episodios. No hay videos vinculados a esta ficha.</p>')+(page>1||data.hasNext?`<div class="directory-pagination"><button id="cinema-prev" class="button button-outline" ${page<=1?'disabled':''}>Anterior</button><span>Página ${page}</span><button id="cinema-next" class="button button-outline" ${!data.hasNext?'disabled':''}>Siguiente</button></div>`:'');if($('cinema-prev'))$('cinema-prev').onclick=()=>renderCinemaEpisodes(anime,page-1);if($('cinema-next'))$('cinema-next').onclick=()=>renderCinemaEpisodes(anime,page+1);}
function closeModal(){if(state.ytSeriesPlayer){try{state.ytSeriesPlayer.destroy()}catch{}state.ytSeriesPlayer=null}const p=$('series-player-inline');if(p)p.replaceChildren();state.activeSeries=null;state.modalId=null;$('modal-overlay').classList.add('hidden');document.body.classList.remove('modal-open');}
let playbackToken=0,playbackAbort=null;
async function playEpisode(id,num){const anime=state.items.get(id)||state.favorites.find(a=>a.id===id);if(!anime||!Number.isSafeInteger(num)||num<1)return;
 closeVideo();const token=++playbackToken;const title=`${displayTitle(anime)} · Episodio ${num}`;$('video-heading-text').textContent=title;$('player-caption').textContent='Consultando disponibilidad del video…';const mount=$('player-mount');mount.textContent='Cargando…';$('video-overlay').classList.remove('hidden');document.body.classList.add('modal-open');$('video-close').focus();
 try{let episode=configuredEpisodes(id).find(e=>Number(e.number)===num);if(!episode){const ctrl=new AbortController();playbackAbort=ctrl;const timer=setTimeout(()=>ctrl.abort(),65000);try{const r=await fetch('/api/playback/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({titles:[anime.title?.english,anime.title?.romaji,anime.title?.native].filter(Boolean),year:anime.seasonYear,format:anime.format,count:anime.episodes,episode:num}),signal:ctrl.signal});const data=await r.json().catch(()=>null);if(!r.ok||!data?.url)throw Error(data?.error||'El servidor de reproducción no está configurado.');episode=data;}finally{clearTimeout(timer);}}
 if(token!==playbackToken)return;const url=safeUrl(episode.url);if(!url||!['mp4','webm','hls'].includes(episode.type))throw Error('El proveedor no devolvió un formato compatible.');mount.innerHTML='';const container=document.createElement('div');container.className='video-frame';const v=document.createElement('video');v.controls=true;v.playsInline=true;v.autoplay=false;v.preload='metadata';v.setAttribute('aria-label',title);container.appendChild(v);mount.appendChild(container);state.videoEl=v;$('player-caption').textContent=episode.credit||'Nime RD · Video integrado';v.addEventListener('ended',()=>{if(progressFor('anime:'+id)<num)updateProgress('anime:'+id,num-progressFor('anime:'+id));});v.addEventListener('error',()=>{if(token!==playbackToken)return;$('player-caption').textContent='El proveedor no pudo entregar el video. Reintenta o verifica el plan de reproducción.';});if(episode.poster&&safeUrl(episode.poster))v.poster=safeUrl(episode.poster);
 for(const track of Array.isArray(episode.subtitles)?episode.subtitles:[]){if(!safeUrl(track.url))continue;const t=document.createElement('track');t.kind='subtitles';t.src=track.url;t.srclang=track.lang||'es';t.label=track.label||'Subtítulos';v.appendChild(t)}
 if(episode.type==='hls'&&!v.canPlayType('application/vnd.apple.mpegurl')){await loadHls();if(token!==playbackToken)return;if(!window.Hls?.isSupported())throw Error('HLS no está disponible en este dispositivo.');state.videoHls=new window.Hls();state.videoHls.loadSource(url);state.videoHls.attachMedia(v);}else v.src=url;
 }catch(e){if(token!==playbackToken)return;mount.textContent='';const msg=document.createElement('p');msg.className='stream-note';msg.textContent=e.name==='AbortError'?'El proveedor tardó demasiado en responder.':e.message;mount.appendChild(msg);const retry=document.createElement('button');retry.type='button';retry.className='button button-outline';retry.textContent='Reintentar';retry.onclick=()=>playEpisode(id,num);mount.appendChild(retry);$('player-caption').textContent='Video no disponible en este momento.';}}
function loadHls(){if(window.Hls)return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar el soporte HLS.'));document.head.appendChild(s)})}
function playTrailer(ytId,title){closeModal();$('video-heading-text').textContent=`Tráiler · ${title}`;$('player-caption').textContent='Tráiler publicado en YouTube. La reproducción depende de las restricciones del autor.';const mount=$('player-mount');mount.innerHTML='';const wrap=document.createElement('div');wrap.className='video-frame';const frame=document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`;frame.title=`Tráiler de ${title}`;frame.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');frame.allowFullscreen=true;wrap.appendChild(frame);mount.appendChild(wrap);$('video-overlay').classList.remove('hidden');document.body.classList.add('modal-open');$('video-close').focus();}
function closeVideo(){playbackToken++;playbackAbort?.abort();playbackAbort=null;if(state.videoEl){state.videoEl.pause();state.videoEl.removeAttribute('src');state.videoEl.load();state.videoEl=null}if(state.videoHls){state.videoHls.destroy();state.videoHls=null}$('player-mount').innerHTML='';$('video-overlay').classList.add('hidden');if($('modal-overlay').classList.contains('hidden'))document.body.classList.remove('modal-open');}
function wire(){window.addEventListener('hashchange',routeChanged);document.addEventListener('click',e=>{
 
 
 const fav=e.target.closest('[data-fav-id]');if(fav){e.stopPropagation();toggleFavorite(Number(fav.dataset.favId));return}
 const genre=e.target.closest('[data-category-genre]');if(genre){selectCategory(genre.dataset.categoryGenre);return}
 const goto=e.target.closest('[data-goto]');if(goto){setRoute(goto.dataset.goto);return}
 const hero=e.target.closest('[data-hero-index]');if(hero){setHero(Number(hero.dataset.heroIndex));return}
 const day=e.target.closest('[data-day-index]');if(day){state.scheduleIndex=Number(day.dataset.dayIndex);buildCalendarTabs();renderCalendarDay();return}
 const scroll=e.target.closest('[data-scroll]');if(scroll){$(scroll.dataset.scroll).scrollBy({left:Math.max(180,$(scroll.dataset.scroll).clientWidth*.75)*Number(scroll.dataset.direction),behavior:'smooth'});return}
 const progressSet=e.target.closest('[data-progress-set]');if(progressSet){const key=progressSet.dataset.progressSet;const input=[...document.querySelectorAll('[data-progress-input]')].find(el=>el.dataset.progressInput===key && el.closest('.progress-panel')===progressSet.closest('.progress-panel'));const n=Number(input?.value);if(!Number.isSafeInteger(n)||n<0||n>99999){notify('Escribe un número válido de episodio (0 a 99999).');return;}updateProgress(key,n-progressFor(key));return}
 const progress=e.target.closest('[data-progress-key]');if(progress){updateProgress(progress.dataset.progressKey,Number(progress.dataset.progressStep)||0);return}
 
 
 const ep=e.target.closest('[data-episode-id]');if(ep){playEpisode(Number(ep.dataset.episodeId),Number(ep.dataset.episodeNumber));return}
 const share=e.target.closest('[data-share-id]');if(share){shareAnime(Number(share.dataset.shareId));return}
 const anime=e.target.closest('[data-anime-id]');if(anime){showDetails(Number(anime.dataset.animeId));return}
 if(e.target.id==='retry-browse')loadBrowse(true);if(e.target.id==='retry-day')renderCalendarDay();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('video-overlay').classList.contains('hidden'))closeVideo();else if(!$('modal-overlay').classList.contains('hidden'))closeModal();else{$('mobile-nav').classList.remove('open');}}if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-anime-id]')){e.preventDefault();showDetails(Number(e.target.dataset.animeId))}if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-official-detail]')){e.preventDefault();const o=state.officials.find(x=>x.key===e.target.dataset.officialDetail);if(o)openOfficialDetail(o)}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();focusBrowse()}else if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!e.ctrlKey&&!e.metaKey){e.preventDefault();focusBrowse()}});
 $('header-search').addEventListener('click',focusBrowse);$('mobile-menu-trigger').addEventListener('click',()=>{const menu=$('mobile-nav');const open=menu.classList.toggle('open');$('mobile-menu-trigger').setAttribute('aria-expanded',String(open))});
 $('hero-primary').addEventListener('click',()=>{const a=state.home?.trending[state.heroIndex];if(a)showDetails(a.id);else setRoute('explorar')});
 $('hero-secondary').addEventListener('click',()=>{const a=state.home?.trending[state.heroIndex];if(a)showDetails(a.id);else setRoute('explorar')});
 $('modal-close').addEventListener('click',closeModal);$('video-close').addEventListener('click',closeVideo);$('modal-overlay').addEventListener('click',e=>{if(e.target===$('modal-overlay'))closeModal()});$('video-overlay').addEventListener('click',e=>{if(e.target===$('video-overlay'))closeVideo()});
 $('account-form').addEventListener('submit',e=>{e.preventDefault();loginAction(false)});$('account-register').addEventListener('click',()=>loginAction(true));$('account-logout').addEventListener('click',()=>signOut().catch(e=>notify(e.message)));$('account-import-local').addEventListener('click',()=>importGuestToAccount().catch(e=>notify('No se pudo importar: '+e.message)));$('refresh-updates').addEventListener('click',()=>loadRecent(true));
 $('library-search').addEventListener('input',renderFavorites);$('export-favorites').addEventListener('click',exportFavorites);$('import-favorites').addEventListener('click',()=>$('import-favorites-file').click());$('import-favorites-file').addEventListener('change',importFavorites);
 $('browse-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadBrowse(true),440)});$('genre-select').addEventListener('change',()=>{renderCategories();loadBrowse(true)});for(const id of ['tag-select','format-select','year-select','status-select','sort-select'])$(id).addEventListener('change',()=>loadBrowse(true));$('clear-filters').addEventListener('click',()=>{resetBrowseFilters();loadBrowse(true)});$('load-more').addEventListener('click',()=>loadBrowse());$('current-year').textContent=new Date().getFullYear();
}
function focusBrowse(){if(!['explorar','categorias','emision'].includes(state.route))setRoute('explorar');requestAnimationFrame(()=>$('browse-search').focus())}
function exportFavorites(){
 const payload={format:'nime-rd-favorites',version:1,exportedAt:new Date().toISOString(),items:state.favorites};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='NimeRD-MiLista.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);notify('Copia de tu lista descargada.');
}
async function importFavorites(e){
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(file.size>2_000_000){notify('Archivo demasiado grande (máximo 2 MB).');return;}
 try{
  const data=JSON.parse(await file.text());
  if(data?.format!=='nime-rd-favorites'||data?.version!==1||!Array.isArray(data.items))throw new Error('Formato de copia no reconocido.');
  const items=data.items.filter(a=>Number.isSafeInteger(a?.id)&&a.id>0&&a.title&&typeof a.title==='object').slice(0,300);
  if(!items.length)throw new Error('La copia no contiene favoritos válidos.');
  const merged=new Map([...state.favorites,...items].map(a=>[a.id,a]));
  state.favorites=[...merged.values()].slice(0,300);saveFavorites();if(isSignedIn())for(const a of state.favorites)await syncLibraryEntry('anime:'+a.id);refreshFavoriteUI();renderFavorites();notify(`Lista importada: ${items.length} elementos leídos.`);
 }catch(err){notify(`No se pudo importar: ${err.message}`);}
}
async function shareAnime(id){
 const url=new URL(window.location.href);url.searchParams.set('anime',String(id));url.hash='inicio';
 try{if(navigator.share){await navigator.share({title:'Nime RD',url:url.href});return;}await navigator.clipboard.writeText(url.href);notify('Enlace del anime copiado.');}
 catch{try{const temp=document.createElement('input');temp.value=url.href;document.body.append(temp);temp.select();document.execCommand('copy');temp.remove();notify('Enlace copiado.')}catch{notify('No se pudo copiar el enlace.')}}
}

async function init(){ $('genre-select').insertAdjacentHTML('beforeend',genreCategories.map(([value,label])=>`<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`).join(''));const thisYear=new Date().getFullYear()+1;for(let y=thisYear;y>=1970;y--){$('year-select').add(new Option(String(y),String(y)))}renderCategories();wire();state.home={trending:local,season:[],airing:[],schedules:[],offline:true};renderHome();$('status-banner').textContent='Cargando catálogo en línea… Mientras tanto puedes explorar el índice local.';$('status-banner').classList.remove('hidden');routeChanged();refreshFavoriteUI();renderAccount();initAccount({onConfigured:()=>renderAccount(),onSignedIn:restoreCloudRows,onSignedOut:restoreGuest,onNotice:notify});try{const r=await fetch('data/streams.json?v=18',{cache:'no-store'});if(r.ok){const data=await r.json();if(data&&typeof data==='object'&&!Array.isArray(data))state.streams=data}}catch{};if(state.modalId){const a=state.items.get(state.modalId);if(a)renderCinemaEpisodes(a,1)}try{state.home=await getHome();state.isDemo=false;if(state.home.offline){$('status-banner').textContent='Modo sin conexión: catálogo local limitado. Las portadas reales y los estrenos requieren conexión con una API.';$('status-banner').classList.remove('hidden')}else $('status-banner').classList.add('hidden')}catch(e){state.home={trending:local,airing:[],season:[],schedules:[],offline:true};state.isDemo=false;$('status-banner').innerHTML=`<strong>Catálogo temporalmente no disponible:</strong> no se pudo conectar con Kitsu (${escapeHTML(e.message)}). El índice local sigue disponible. <button id="retry-home">Reintentar conexión</button>`;$('status-banner').classList.remove('hidden');$('retry-home').addEventListener('click',()=>location.reload())}remember([...state.home.trending,...state.home.airing,...state.home.season,...state.home.schedules.map(e=>e.media)]);renderHome();loadRecent();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-state.recentAt>30*60*1000)loadRecent()});setInterval(()=>{if(!document.hidden)loadRecent()},30*60*1000);const sharedId=Number(new URLSearchParams(location.search).get('anime'));if(Number.isSafeInteger(sharedId)&&sharedId>0&&!state.isDemo)showDetails(sharedId);}
init().catch(e=>{console.error(e);const banner=$('status-banner');if(banner){banner.textContent='Error de inicio: '+e.message;banner.classList.remove('hidden')}});
