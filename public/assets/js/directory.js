/** Catálogo de episodios de canales oficiales consultado por una función de Netlify.
 * Nunca devuelve el archivo de vídeo; solo ID de YouTube, títulos y condiciones de inserción. */
const ROOT='/.netlify/functions/anime-catalog';
async function request(args){const params=new URLSearchParams(args);const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),14000);
 try{const res=await fetch(`${ROOT}?${params}`,{signal:ctrl.signal,cache:'no-store',headers:{Accept:'application/json'}});
 if(!res.ok)throw new Error(res.status===404?'No se publicaron las funciones de Netlify.':'El directorio está temporalmente inaccesible.');
 const data=await res.json();if(data.error)throw new Error(data.error);return data;
 }finally{clearTimeout(t)}
}
export const fetchSeriesPage=(page=1)=>request({mode:'series',page});
export const fetchEpisodePage=(slug,page=1)=>request({mode:'episodes',slug,page});
export const fetchEpisodePlayback=(slug,episode)=>request({mode:'play',slug,episode});
export const makeEntry=x=>({key:`dir-${x.slug.slice(0,62)}`,title:x.title,aliases:[x.title.replace(/\s*\|.*$/,'').replace(/\s*\((?:sub|dub)\).*$/i,'').trim()],provider:'Canales oficiales · anime.ad',language:'Idioma del canal',tag:'Lista de episodios',reported:x.episodesCount,reportedLabel:'Según directorio oficial, no necesariamente reproducibles en RD',source:x.source,sourceType:'youtube-directory',directorySlug:x.slug});
