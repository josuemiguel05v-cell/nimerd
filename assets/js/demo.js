// Diseño de demostración original. Estos personajes y series son ficticios.
const items = [
  ['eclipse','Eclipse Rising','Fantasía y destino se encuentran cuando una joven descubre el secreto de una luna partida.','Fantasy','Action',86],
  ['neon','Neon Samurai','En una ciudad iluminada por neones, un joven espadachín desafía el futuro que han escrito para él.','Action','Sci-Fi',90],
  ['sakura','Sakura Days','Una historia sobre amistad, cambios y nuevos comienzos en un pequeño pueblo lleno de flores.','Romance','Slice of Life',83],
  ['starlight','Starlight Academy','Una academia suspendida entre estrellas abre sus puertas a una generación extraordinaria.','Fantasy','Adventure',89],
  ['shadow','Shadow Legacy','Tras descubrir un legado olvidado, dos hermanos se adentran en tierras que el mundo dejó atrás.','Adventure','Mystery',87],
  ['astral','Astral Drift','Una tripulación cruza galaxias desconocidas en busca de su verdadero hogar.','Sci-Fi','Adventure',82],
  ['kitsune','Kitsune no Yume','Entre templos antiguos y sueños mágicos surge una promesa capaz de cambiar dos mundos.','Supernatural','Drama',85],
  ['reverie','Reverie Zero','Una señal desde otra dimensión pone a prueba la realidad y los recuerdos de una ciudad.','Sci-Fi','Mystery',88],
  ['celestial','Celestial Code','Una aprendiz intenta descifrar el lenguaje de las estrellas antes de que desaparezcan.','Fantasy','Action',81],
  ['midnight','Midnight Bloom','La amistad florece donde menos se espera, en una ciudad que nunca duerme.','Drama','Romance',84]
];
export const demoAnime = items.map(([slug,title,description,genre1,genre2,score],i)=>({
  id:900001+i,title:{english:title,romaji:title,native:title},coverImage:{extraLarge:`assets/art/${slug}.svg`,large:`assets/art/${slug}.svg`,color:'#9e62e7'},bannerImage:`assets/art/${slug}.svg`,description,genres:[genre1,genre2],averageScore:score,episodes:12,format:'TV',status:'NOT_YET_RELEASED',seasonYear:null,externalLinks:[],streamingEpisodes:[],trailer:null,siteUrl:null,_demo:true
}));
export const demoHome = {trending:demoAnime,airing:demoAnime.slice(2,9),season:demoAnime.slice(1),schedules:[]};
