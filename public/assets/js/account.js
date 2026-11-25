/** Cuenta opcional de Nime RD. Sin configuración, el sitio funciona como invitado. */
let client=null, user=null, callbacks={};
let lastUserId=undefined;
const $=id=>document.getElementById(id);
export function isSignedIn(){return !!user;}
export function accountEmail(){return user?.email||'';}
export function isConfigured(){return !!client;}
export async function initAccount(handlers={}){
 callbacks=handlers;
 try{
  const response=await fetch('data/config.json',{cache:'no-store'});
  if(!response.ok)throw Error('Configuración no disponible');
  const cfg=await response.json();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl||'') || !/^[\w.\-]+$/.test(cfg.supabaseAnonKey||''))throw Error('Pendiente de configurar');
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
  const {data:{session},error}=await client.auth.getSession();if(error)throw error;
  await switchUser(session?.user||null);
  client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>switchUser(session?.user||null).catch(err=>callbacks.onNotice?.(err.message)),0)});
  callbacks.onConfigured?.(true);
 }catch(e){client=null;callbacks.onConfigured?.(false);}
}
async function switchUser(next){
 const nextId=next?.id||null;
 if(nextId===lastUserId)return;
 lastUserId=nextId;user=next;
 if(next){
  const {data,error}=await client.from('user_library').select('entry_key,anime_data,title,favorite,watched_episode,updated_at').limit(10000);
  if(error){callbacks.onNotice?.(`No se pudo cargar tu biblioteca: ${error.message}`);return;}
  callbacks.onSignedIn?.(next,Array.isArray(data)?data:[]);
 }else{callbacks.onSignedOut?.();}
}
export async function signIn(email,password){if(!client)throw Error('El administrador aún no ha configurado las cuentas.');const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;const {data:{user:next}}=await client.auth.getUser();await switchUser(next);}
export async function signUp(email,password){if(!client)throw Error('El administrador aún no ha configurado las cuentas.');const {data,error}=await client.auth.signUp({email,password});if(error)throw error;if(data.user&&!data.session) return 'Revisa tu correo electrónico para confirmar la cuenta.';await switchUser(data.user);return 'Cuenta creada.';}
export async function signOut(){if(!client)return;const {error}=await client.auth.signOut();if(error)throw error;await switchUser(null);}
export async function saveEntry(entry){
 if(!client||!user)return;
 const {error}=await client.from('user_library').upsert({user_id:user.id,entry_key:entry.entry_key,anime_data:entry.anime_data||null,title:String(entry.title||'').slice(0,240),favorite:!!entry.favorite,watched_episode:Math.max(0,Math.min(99999,Number(entry.watched_episode)||0)),updated_at:new Date().toISOString()},{onConflict:'user_id,entry_key'});
 if(error)throw error;
}
export async function loadCloudEntries(){if(!user||!client)throw Error('Inicia sesión primero.');const {data,error}=await client.from('user_library').select('entry_key,anime_data,title,favorite,watched_episode,updated_at').limit(10000);if(error)throw error;return data||[];}
