// Edge Function de Supabase (Deno). Desplegar con: supabase functions deploy instagram --no-verify-jwt
// La verificación se hace aquí: JWT de administrador, o cabecera x-cron-secret solo para "sync".
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.45.0';
const env=(k:string)=>Deno.env.get(k)||'';
const db=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'));
const REDIRECT=`${env('SUPABASE_URL')}/functions/v1/instagram`;
const cors={'Access-Control-Allow-Origin':env('SITE_URL')||'*','Access-Control-Allow-Headers':'authorization,content-type,apikey,x-client-info','Access-Control-Allow-Methods':'POST,GET,OPTIONS'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'content-type':'application/json'}});
const FIELDS=encodeURIComponent('id,caption,media_type,media_product_type,permalink,timestamp,thumbnail_url,media_url,children{id,media_type,media_url,thumbnail_url}');
const enc=new TextEncoder();
async function hmac(s:string){const k=await crypto.subtle.importKey('raw',enc.encode(env('STATE_SECRET')),{name:'HMAC',hash:'SHA-256'},false,['sign']);return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(s))))).replace(/[+/=]/g,'');}
async function makeState(uid:string){const p=`${uid}.${Date.now()+600000}`;return `${p}.${await hmac(p)}`;}
async function checkState(s:string){const [uid,exp,sig]=s.split('.');return env('STATE_SECRET')&&sig&&Date.now()<Number(exp)&&sig===await hmac(`${uid}.${exp}`)?uid:null;}
class IgError extends Error{code:number;constructor(code:number,m:string){super(m);this.code=code;}}
async function graph(url:string){const r=await fetch(url);const j=await r.json().catch(()=>({}));if(!r.ok||j.error){const e=j.error||{};throw new IgError(e.code??r.status,e.message||`HTTP ${r.status}`);}return j;}
const human=(e:any)=>e instanceof IgError?(e.code===190?'El acceso a Instagram venció o fue revocado. Volvé a conectar la cuenta.':[4,17,32,613].includes(e.code)?'Meta limitó temporalmente las solicitudes. Reintentá en unos minutos.':`Instagram respondió con un error: ${e.message}`):(e?.message||String(e));

async function adminUser(req:Request){const jwt=(req.headers.get('authorization')||'').replace(/^Bearer /,'');if(!jwt)return null;
 const {data}=await db.auth.getUser(jwt);const id=data.user?.id;if(!id)return null;
 const {data:a}=await db.from('admin_users').select('user_id').eq('user_id',id).maybeSingle();return a?id:null;}

async function connect(code:string){
 const r=await fetch('https://api.instagram.com/oauth/access_token',{method:'POST',body:new URLSearchParams({client_id:env('IG_APP_ID'),client_secret:env('IG_APP_SECRET'),grant_type:'authorization_code',redirect_uri:REDIRECT,code})});
 const j=await r.json();const t=j.data?.[0]??j;if(!t.access_token)throw new Error(j.error_message||'Meta no entregó el token.');
 const ll=await graph(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${env('IG_APP_SECRET')}&access_token=${t.access_token}`);
 const me=await graph(`https://graph.instagram.com/me?fields=user_id,username&access_token=${ll.access_token}`);
 await db.from('instagram_connection').upsert({id:1,ig_user_id:String(me.user_id??me.id??t.user_id),username:me.username,access_token:ll.access_token,expires_at:new Date(Date.now()+ll.expires_in*1000).toISOString(),connected_at:new Date().toISOString(),last_error:null});}

async function sync(trigger:string){
 const {data:log}=await db.from('instagram_sync_log').insert({trigger}).select('id').single();
 let fetched=0,created=0,message='Sincronización completa.',ok=false;
 try{
  const {data:c}=await db.from('instagram_connection').select('*').eq('id',1).maybeSingle();
  if(!c?.access_token)throw new Error('No hay una cuenta de Instagram conectada.');
  if(c.expires_at&&new Date(c.expires_at).getTime()-Date.now()<15*864e5){
   try{const r=await graph(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${c.access_token}`);
    c.access_token=r.access_token;await db.from('instagram_connection').update({access_token:r.access_token,expires_at:new Date(Date.now()+r.expires_in*1000).toISOString()}).eq('id',1);}catch(_e){/* se reintenta en la próxima sincronización */}}
  const {data:all}=await db.from('instagram_posts').select('id,ig_media_id,caption,status');
  const known=new Map((all||[]).map((p:any)=>[p.ig_media_id,p]));
  const started=new Date().toISOString();let url:string|null=`https://graph.instagram.com/me/media?fields=${FIELDS}&limit=50&access_token=${c.access_token}`;let pages=0;
  while(url&&pages<40){const r=await graph(url);pages++;
   for(const m of r.data||[]){fetched++;
    const media=m.children?.data?.length?m.children.data:[{id:m.id,media_type:m.media_type,media_url:m.media_url,thumbnail_url:m.thumbnail_url}];
    const row:any={ig_media_id:m.id,caption:m.caption??null,media_type:m.media_type,product_type:m.media_product_type??null,permalink:m.permalink,posted_at:m.timestamp,thumbnail_url:m.thumbnail_url??m.media_url??null,media,unavailable:false,last_seen_at:new Date().toISOString()};
    const ex:any=known.get(m.id);
    if(ex){if((ex.caption??null)!==row.caption&&ex.status==='importada')row.caption_changed=true;await db.from('instagram_posts').update(row).eq('id',ex.id);}
    else{await db.from('instagram_posts').insert(row);created++;}}
   url=r.paging?.next||null;}
  if(!url)await db.from('instagram_posts').update({unavailable:true}).lt('last_seen_at',started); // solo marca; nunca toca vehículos
  else message='Se alcanzó el máximo de páginas por corrida (2000 publicaciones); volvé a sincronizar para continuar.';
  await db.from('instagram_connection').update({last_sync_at:new Date().toISOString(),last_error:null}).eq('id',1);ok=true;
 }catch(e){message=human(e);await db.from('instagram_connection').update({last_error:message}).eq('id',1);}
 await db.from('instagram_sync_log').update({finished_at:new Date().toISOString(),ok,fetched,new_posts:created,message}).eq('id',log?.id);
 return {ok,fetched,new_posts:created,message};}

async function importPhotos(postId:string,mediaIds:string[],vehicleId:string){
 const {data:post}=await db.from('instagram_posts').select('*').eq('id',postId).maybeSingle();
 const {data:v}=await db.from('vehicles').select('id').eq('id',vehicleId).maybeSingle();
 if(!post||!v)throw new Error('No se encontró la publicación o el vehículo.');
 const {data:ph}=await db.from('vehicle_photos').select('position,source_media_id').eq('vehicle_id',vehicleId);
 const have=new Set((ph||[]).map((p:any)=>p.source_media_id));let pos=Math.max(-1,...(ph||[]).map((p:any)=>p.position))+1;
 const errors:string[]=[];let imported=0;
 for(const id of mediaIds){const m=(post.media as any[]).find(x=>x.id===id);
  if(!m||m.media_type==='VIDEO'){errors.push(`${id}: no es una imagen disponible.`);continue;}
  if(have.has(id))continue;
  if(!m.media_url){errors.push(`${id}: Instagram no entregó la URL de la imagen.`);continue;}
  try{const r=await fetch(m.media_url);const ct=(r.headers.get('content-type')||'').split(';')[0];
   if(!r.ok||!/^image\/(jpeg|png|webp)$/.test(ct))throw new Error(`respuesta inesperada (${r.status} ${ct})`);
   const buf=new Uint8Array(await r.arrayBuffer());if(buf.length>5*1024*1024)throw new Error('supera los 5 MB');
   const path=`${vehicleId}/ig-${id}.${ct.split('/')[1]}`;
   const up=await db.storage.from('vehicle-photos').upload(path,buf,{contentType:ct,upsert:true});if(up.error)throw up.error;
   const url=db.storage.from('vehicle-photos').getPublicUrl(path).data.publicUrl;
   const ins=await db.from('vehicle_photos').insert({vehicle_id:vehicleId,url,position:pos,is_main:pos===0,source_media_id:id});if(ins.error)throw ins.error;
   pos++;imported++;}catch(e){errors.push(`${id}: ${(e as Error).message}`);}}
 await db.from('instagram_posts').update(errors.length?{vehicle_id:vehicleId,last_error:errors.join(' | ')}:{status:'importada',vehicle_id:vehicleId,last_error:null}).eq('id',postId);
 return {imported,errors};}

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 const u=new URL(req.url);
 try{
  if(req.method==='GET'&&u.searchParams.has('state')){ // retorno de Meta tras autorizar
   const back=(q:string)=>Response.redirect(`${env('SITE_URL')}/admin?instagram=${q}`,302);
   if(u.searchParams.get('error'))return back('cancelado');
   if(!await checkState(u.searchParams.get('state')||''))return back('estado_invalido');
   try{await connect((u.searchParams.get('code')||'').replace(/#_$/,''));}catch(e){console.error('connect',human(e));return back('error');}
   return back('ok');}
  const body=await req.json().catch(()=>({}));
  const cron=req.headers.get('x-cron-secret');
  if(cron&&cron===env('CRON_SECRET')&&body.action==='sync')return json(await sync('programada'));
  const uid=await adminUser(req);if(!uid)return json({error:'No autorizado.'},401);
  switch(body.action){
   case 'status':{const {data:c}=await db.from('instagram_connection').select('username,expires_at,last_sync_at,last_error,access_token').eq('id',1).maybeSingle();
    const {data:logs}=await db.from('instagram_sync_log').select('started_at,trigger,ok,fetched,new_posts,message').order('started_at',{ascending:false}).limit(5);
    return json({connected:!!c?.access_token,username:c?.username,expires_at:c?.expires_at,last_sync_at:c?.last_sync_at,last_error:c?.last_error,logs:logs||[]});}
   case 'auth-url':{if(!env('IG_APP_ID')||!env('STATE_SECRET'))return json({error:'Faltan los secretos IG_APP_ID o STATE_SECRET en la función.'},500);
    const q=new URLSearchParams({client_id:env('IG_APP_ID'),redirect_uri:REDIRECT,response_type:'code',scope:'instagram_business_basic',state:await makeState(uid)});
    return json({url:`https://www.instagram.com/oauth/authorize?${q}`});}
   case 'sync':return json(await sync('manual'));
   case 'import':return json(await importPhotos(String(body.post_id),(body.media_ids||[]).map(String),String(body.vehicle_id)));
   case 'disconnect':await db.from('instagram_connection').update({access_token:null,username:null,ig_user_id:null,expires_at:null}).eq('id',1);return json({ok:true});
   default:return json({error:'Acción desconocida.'},400);}
 }catch(e){console.error(e);return json({error:human(e)},500);}
});
