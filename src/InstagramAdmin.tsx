import {useCallback,useEffect,useState} from 'react';
import {sb,slugify} from './lib';
type Media={id:string;media_type:string;media_url?:string;thumbnail_url?:string};
type Post={id:string;ig_media_id:string;caption:string|null;media_type:string;permalink:string;posted_at:string;thumbnail_url:string|null;media:Media[];status:string;vehicle_id:string|null;unavailable:boolean;caption_changed:boolean;last_error:string|null};
type Conn={connected:boolean;username?:string;expires_at?:string;last_sync_at?:string;last_error?:string;logs:{started_at:string;trigger:string;ok:boolean|null;fetched:number;new_posts:number;message:string|null}[]};
type VL={id:string;brand:string;model:string;year:number;version:string|null};
async function call(body:Record<string,unknown>){const {data,error}=await sb.functions.invoke('instagram',{body});
 if(error){let m=error.message;try{m=(await (error as any).context.json()).error||m;}catch{/* sin detalle */}throw new Error(m);}return data;}
const imgOf=(m:Media)=>m.media_url||m.thumbnail_url;
const isImg=(m:Media)=>m.media_type!=='VIDEO'&&!!m.media_url;
const fdate=(s?:string|null)=>s?new Date(s).toLocaleString('es-AR'):'—';

function Review({p,vehicles,onDone}:{p:Post;vehicles:VL[];onDone:()=>void}){
 const [f,setF]=useState<Record<string,string>>({brand:'',model:'',version:'',year:'',price:'',mileage:'',description:p.caption||'',vehicle_id:p.vehicle_id||''});
 const [sel,setSel]=useState<Set<string>>(new Set(p.media.filter(isImg).map(m=>m.id)));
 const [err,setErr]=useState<string[]>([]);const [busy,setBusy]=useState('');const [ok,setOk]=useState('');
 const set=(k:string)=>(e:any)=>setF({...f,[k]:e.target.value});
 const tog=(id:string)=>{const s=new Set(sel);s.has(id)?s.delete(id):s.add(id);setSel(s);};
 const go=async()=>{setErr([]);setOk('');let vid=f.vehicle_id;
  if(!vid){const er:string[]=[];const y=Number(f.year);
   if(!f.brand.trim())er.push('Falta la marca.');if(!f.model.trim())er.push('Falta el modelo.');
   if(!(y>=1950&&y<=new Date().getFullYear()+1))er.push('Completá un año válido: Instagram no lo informa y no lo inventamos.');
   if(er.length)return setErr(er);}
  setBusy('Procesando…');
  if(!vid){const n=(x:string)=>x===''?null:Number(x);const base=slugify(`${f.brand} ${f.model} ${f.year}`);
   const row:any={brand:f.brand.trim(),model:f.model.trim(),version:f.version.trim()||null,year:Number(f.year),price:n(f.price),mileage:n(f.mileage),description:f.description.trim()||null,is_published:false,sale_status:'disponible',source:'instagram',sync_status:'importado',instagram_url:p.permalink,instagram_media_id:p.ig_media_id};
   let r=await sb.from('vehicles').insert({...row,slug:base}).select('id').single();
   if(r.error?.code==='23505'&&r.error.message.includes('slug'))r=await sb.from('vehicles').insert({...row,slug:`${base}-${Math.random().toString(36).slice(2,6)}`}).select('id').single();
   if(r.error){setBusy('');return setErr([r.error.code==='23505'?'Esta publicación ya está asociada a otro vehículo. Elegilo en la lista "Asociar a un vehículo existente".':`No se pudo crear el borrador: ${r.error.message}`]);}
   vid=r.data.id;}
  try{const res=await call({action:'import',post_id:p.id,media_ids:[...sel],vehicle_id:vid});
   if(res.errors?.length)setErr(['Algunas fotos no se pudieron importar (el borrador quedó creado, podés reintentar):',...res.errors]);
   else{setOk(`Listo: ${res.imported} foto(s) importadas. El vehículo quedó como borrador sin publicar; revisalo en Inventario.`);onDone();}
  }catch(e){setErr([`No se pudieron importar las fotos: ${(e as Error).message}`]);}
  setBusy('');};
 const ignore=async()=>{if(!confirm('¿Ignorar esta publicación? Podés recuperarla desde el filtro "Ignoradas".'))return;
  const {error}=await sb.from('instagram_posts').update({status:'ignorada'}).eq('id',p.id);if(error)setErr([error.message]);else onDone();};
 const inp=(k:string,l:string,t='text')=><label>{l}<input type={t} value={f[k]} onChange={set(k)} disabled={!!f.vehicle_id}/></label>;
 return <div className="editor"><h3>Revisar publicación</h3><p className="meta">{fdate(p.posted_at)} · <a href={p.permalink} target="_blank" rel="noreferrer">Ver en Instagram</a></p>
  <pre className="cap">{p.caption||'(sin texto)'}</pre>
  <p className="meta">Fotos disponibles (marcá las del vehículo). Los videos no se importan.</p>
  <div className="pgrid">{p.media.map(m=><label key={m.id} className="pitem">{imgOf(m)?<img src={imgOf(m)} alt="" referrerPolicy="no-referrer"/>:<div className="noimg">Sin vista previa</div>}
   {isImg(m)?<span className="chk"><input type="checkbox" checked={sel.has(m.id)} onChange={()=>tog(m.id)}/>Usar</span>:<span className="meta">{m.media_type==='VIDEO'?'Video':'No disponible'}</span>}</label>)}</div>
  <label>Asociar a un vehículo existente (evita duplicados)<select value={f.vehicle_id} onChange={set('vehicle_id')}><option value="">— Crear un vehículo nuevo (borrador) —</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.brand} {v.model} {v.version||''} {v.year}</option>)}</select></label>
  {!f.vehicle_id&&<div className="form">{inp('brand','Marca *')}{inp('model','Modelo *')}{inp('version','Versión')}{inp('year','Año *','number')}{inp('price','Precio (ARS)','number')}{inp('mileage','Kilometraje','number')}</div>}
  {!f.vehicle_id&&<label>Descripción (texto original de Instagram, editable)<textarea rows={5} value={f.description} onChange={set('description')}/></label>}
  {err.map(x=><p className="err" key={x}>{x}</p>)}{ok&&<p className="ok">{ok}</p>}{busy&&<p className="meta">{busy}</p>}
  <div className="row"><button className="btn" disabled={!!busy||!sel.size} onClick={go}>{f.vehicle_id?'Agregar fotos al vehículo':'Crear borrador e importar fotos'}</button><button className="btn" disabled={!!busy} onClick={ignore}>Ignorar publicación</button></div></div>;}

export default function InstagramAdmin({onClose}:{onClose:()=>void}){
 const [c,setC]=useState<Conn|null>(null);const [posts,setPosts]=useState<Post[]>([]);const [vs,setVs]=useState<VL[]>([]);const [filter,setFilter]=useState('detectada');
 const [rev,setRev]=useState<Post|null>(null);const [msg,setMsg]=useState('');const [err,setErr]=useState('');const [busy,setBusy]=useState('');const [n,setN]=useState(30);
 const load=useCallback(async()=>{
  try{setC(await call({action:'status'}));}catch(e){setErr(`No se pudo consultar la función de Instagram: ${(e as Error).message}. ¿Está desplegada? Ver INSTAGRAM.md.`);}
  const p=await sb.from('instagram_posts').select('*').order('posted_at',{ascending:false}).limit(1000);if(p.error)setErr(p.error.message);else setPosts(p.data as Post[]);
  const v=await sb.from('vehicles').select('id,brand,model,year,version').order('updated_at',{ascending:false});if(v.data)setVs(v.data as VL[]);},[]);
 useEffect(()=>{load();const q=new URLSearchParams(location.search).get('instagram');
  if(q){const t:Record<string,string>={ok:'Cuenta conectada correctamente.',cancelado:'Cancelaste la autorización en Instagram.',estado_invalido:'La solicitud de conexión venció. Intentá de nuevo.',error:'Meta rechazó la conexión. Revisá el ID/secreto de la app y la URI de redirección (ver INSTAGRAM.md).'};setMsg(t[q]||'');history.replaceState(null,'','/admin');}},[load]);
 const act=async(label:string,fn:()=>Promise<void>)=>{setErr('');setMsg('');setBusy(label);try{await fn();}catch(e){setErr((e as Error).message);}setBusy('');};
 const connect=()=>act('Redirigiendo a Instagram…',async()=>{const r=await call({action:'auth-url'});location.href=r.url;});
 const syncNow=()=>act('Sincronizando… puede tardar si hay muchas publicaciones.',async()=>{const r=await call({action:'sync'});r.ok?setMsg(`${r.message} Revisadas: ${r.fetched}. Nuevas: ${r.new_posts}.`):setErr(r.message);await load();});
 const disc=()=>{if(confirm('¿Desconectar la cuenta? Se borra el token guardado. Tus vehículos y publicaciones importadas no se tocan.'))act('Desconectando…',async()=>{await call({action:'disconnect'});await load();});};
 if(rev)return <div><button className="btn" onClick={()=>setRev(null)}>← Volver a publicaciones</button><Review key={rev.id} p={rev} vehicles={vs} onDone={()=>{load();}}/></div>;
 const shown=posts.filter(p=>filter==='todas'||p.status===filter);
 return <div><div className="row" style={{justifyContent:'space-between'}}><h2>Integración con Instagram</h2><button className="btn" onClick={onClose}>← Inventario</button></div>
  {err&&<p className="err">{err}</p>}{msg&&<p className="ok">{msg}</p>}{busy&&<p className="meta">{busy}</p>}
  <div className="empty" style={{textAlign:'left'}}>{c?.connected?<><p><span className="dot on"/>Conectada como <b>@{c.username}</b>. El acceso vence el {fdate(c.expires_at)} (se renueva solo al sincronizar).</p><p className="meta">Última sincronización: {fdate(c.last_sync_at)}</p>{c.last_error&&<p className="err">Último error: {c.last_error}</p>}
   <div className="row"><button className="btn" disabled={!!busy} onClick={syncNow}>Sincronizar ahora</button><button className="btn" disabled={!!busy} onClick={connect}>Reconectar</button><button className="btn" disabled={!!busy} onClick={disc}>Desconectar</button></div></>
   :<><p><span className="dot"/>No hay ninguna cuenta conectada. La carga manual de vehículos sigue funcionando igual.</p><button className="btn" disabled={!!busy} onClick={connect}>Conectar cuenta de Instagram</button></>}
   {c&&c.logs.length>0&&<details><summary>Últimas sincronizaciones</summary>{c.logs.map(l=><p className="meta" key={l.started_at}>{fdate(l.started_at)} · {l.trigger} · {l.ok===null?'en curso':l.ok?'OK':'ERROR'} · {l.fetched} revisadas, {l.new_posts} nuevas{l.message?` · ${l.message}`:''}</p>)}</details>}</div>
  <div className="row" style={{margin:'14px 0'}}>{['detectada','importada','ignorada','todas'].map(s=><button key={s} className="btn" style={filter===s?{borderColor:'var(--accent)'}:{}} onClick={()=>{setFilter(s);setN(30);}}>{s==='detectada'?'Por revisar':s==='importada'?'Importadas':s==='ignorada'?'Ignoradas':'Todas'} ({s==='todas'?posts.length:posts.filter(p=>p.status===s).length})</button>)}</div>
  {!shown.length&&<div className="empty"><p>No hay publicaciones en esta lista.</p></div>}
  <div className="grid">{shown.slice(0,n).map(p=><article className="card" key={p.id}>{p.thumbnail_url?<img src={p.thumbnail_url} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<div className="noimg">Sin imagen</div>}
   <div className="cb"><p className="meta">{fdate(p.posted_at)} · {p.media_type}{p.media.length>1?` · ${p.media.length} fotos`:''}</p><p>{(p.caption||'(sin texto)').slice(0,110)}</p>
   {p.unavailable&&<p className="err">Ya no aparece en Instagram (el vehículo no se modifica).</p>}{p.caption_changed&&<p className="err">El texto cambió en Instagram: revisalo.</p>}{p.last_error&&<p className="err">{p.last_error}</p>}
   <button className="btn" onClick={()=>setRev(p)}>{p.status==='detectada'?'Revisar e importar':'Ver / reintentar'}</button></div></article>)}</div>
  {n<shown.length&&<button className="btn" onClick={()=>setN(n+30)}>Ver más</button>}</div>;}
