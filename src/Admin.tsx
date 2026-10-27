import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {configured,sb} from './lib';

type P={id:string;url:string;position:number};
type V={id:string;slug:string;brand:string;model:string;version:string|null;year:number;price:number|null;currency:string;mileage:number|null;fuel:string|null;transmission:string|null;color:string|null;body_type:string|null;description:string|null;features:string[];sale_status:string;is_published:boolean;featured:boolean;instagram_url:string|null;updated_at:string;vehicle_photos:P[]};
const BUCKET='vehicle-photos',MAX=5*1024*1024,TYPES=['image/jpeg','image/png','image/webp'];
const slugify=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const sorted=(v:V)=>[...v.vehicle_photos].sort((a,b)=>a.position-b.position);
const pathOf=(url:string)=>url.split(`/${BUCKET}/`)[1];
const empty={brand:'',model:'',version:'',year:'',price:'',currency:'ARS',mileage:'',fuel:'',transmission:'',color:'',body_type:'',description:'',features:'',instagram_url:'',sale_status:'disponible',is_published:false,featured:false};

function Login({onDone}:{onDone:()=>void}){const [e,setE]=useState('');const [p,setP]=useState('');const [err,setErr]=useState('');
 const go=async()=>{setErr('');const {error}=await sb.auth.signInWithPassword({email:e,password:p});if(error)setErr('Email o contraseña incorrectos.');else onDone();};
 return <main className="login"><h2>Panel de administración</h2><input placeholder="Email" type="email" value={e} onChange={x=>setE(x.target.value)}/><input placeholder="Contraseña" type="password" value={p} onChange={x=>setP(x.target.value)} onKeyDown={x=>x.key==='Enter'&&go()}/>{err&&<p className="err">{err}</p>}<button className="btn" onClick={go}>Ingresar</button></main>;}

function Editor({v,onClose}:{v:V|null;onClose:()=>void}){
 const [cur,setCur]=useState<V|null>(v);
 const [f,setF]=useState<Record<string,any>>(v?{...empty,...Object.fromEntries(Object.entries(v).map(([k,x])=>[k,x??''])),features:(v.features||[]).join('\n')}:empty);
 const [errs,setErrs]=useState<string[]>([]);const [msg,setMsg]=useState('');const [busy,setBusy]=useState('');
 const set=(k:string)=>(e:any)=>setF({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value});
 const reload=async(id:string)=>{const {data}=await sb.from('vehicles').select('*,vehicle_photos(id,url,position)').eq('id',id).single();if(data)setCur(data as V);};
 const save=async()=>{
  const er:string[]=[];const y=Number(f.year);
  if(!f.brand.trim())er.push('Falta la marca.');if(!f.model.trim())er.push('Falta el modelo.');
  if(!(y>=1950&&y<=new Date().getFullYear()+1))er.push('El año debe estar entre 1950 y el año próximo.');
  if(f.price!==''&&Number(f.price)<0)er.push('El precio no puede ser negativo.');
  if(f.mileage!==''&&Number(f.mileage)<0)er.push('El kilometraje no puede ser negativo.');
  setErrs(er);if(er.length)return;setBusy('Guardando…');
  const n=(x:any)=>x===''?null:Number(x),t=(x:any)=>String(x).trim()||null;
  const row:any={brand:f.brand.trim(),model:f.model.trim(),version:t(f.version),year:y,price:n(f.price),currency:f.currency||'ARS',mileage:n(f.mileage),fuel:t(f.fuel),transmission:t(f.transmission),color:t(f.color),body_type:t(f.body_type),description:t(f.description),features:String(f.features).split('\n').map(s=>s.trim()).filter(Boolean),instagram_url:t(f.instagram_url),sale_status:f.sale_status,is_published:f.is_published,featured:f.featured};
  let res;
  if(cur)res=await sb.from('vehicles').update(row).eq('id',cur.id).select('id').single();
  else{const base=slugify(`${row.brand} ${row.model} ${y}`);res=await sb.from('vehicles').insert({...row,slug:base}).select('id').single();
   if(res.error?.code==='23505')res=await sb.from('vehicles').insert({...row,slug:`${base}-${Math.random().toString(36).slice(2,6)}`}).select('id').single();}
  setBusy('');
  if(res.error)return setErrs([`No se pudo guardar: ${res.error.message}. Si dice "row-level security", tu usuario no está en admin_users.`]);
  setMsg(cur?'Cambios guardados.':'Vehículo creado. Ahora podés subir fotos.');await reload(res.data.id);};
 const upload=async(files:FileList|null)=>{if(!cur||!files)return;const er:string[]=[];let pos=cur.vehicle_photos.length;const list=Array.from(files);
  for(let i=0;i<list.length;i++){const file=list[i];
   if(!TYPES.includes(file.type)){er.push(`${file.name}: solo se permiten JPG, PNG o WebP.`);continue;}
   if(file.size>MAX){er.push(`${file.name}: supera los 5 MB.`);continue;}
   setBusy(`Subiendo foto ${i+1} de ${list.length}…`);
   const ext=file.type.split('/')[1],path=`${cur.id}/${crypto.randomUUID()}.${ext}`;
   const up=await sb.storage.from(BUCKET).upload(path,file,{contentType:file.type});
   if(up.error){er.push(`${file.name}: ${up.error.message}`);continue;}
   const url=sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
   const ins=await sb.from('vehicle_photos').insert({vehicle_id:cur.id,url,position:pos,is_main:pos===0});
   if(ins.error){await sb.storage.from(BUCKET).remove([path]);er.push(`${file.name}: ${ins.error.message}`);continue;}pos++;}
  setBusy('');setErrs(er);setMsg(er.length?'':'Fotos subidas.');await reload(cur.id);};
 const order=async(list:P[])=>{if(!cur)return;setBusy('Guardando orden…');
  const rs=await Promise.all(list.map((p,i)=>sb.from('vehicle_photos').update({position:i,is_main:i===0}).eq('id',p.id)));
  setBusy('');const bad=rs.find(r=>r.error);if(bad)setErrs([`No se pudo reordenar: ${bad.error!.message}`]);await reload(cur.id);};
 const move=(i:number,d:number)=>{const l=sorted(cur!);const j=i+d;if(j<0||j>=l.length)return;[l[i],l[j]]=[l[j],l[i]];order(l);};
 const main=(i:number)=>{const l=sorted(cur!);const [p]=l.splice(i,1);order([p,...l]);};
 const del=async(i:number)=>{if(!confirm('¿Eliminar esta foto?'))return;const l=sorted(cur!);const p=l[i];
  const r=await sb.storage.from(BUCKET).remove([pathOf(p.url)]);if(r.error)return setErrs([`No se pudo borrar el archivo: ${r.error.message}`]);
  const d=await sb.from('vehicle_photos').delete().eq('id',p.id);if(d.error)return setErrs([d.error.message]);
  l.splice(i,1);await order(l);};
 const inp=(k:string,l:string,type='text')=><label>{l}<input type={type} value={f[k]} onChange={set(k)}/></label>;
 return <div className="editor"><button className="btn" onClick={onClose}>← Volver al listado</button><h2>{cur?'Editar vehículo':'Nuevo vehículo'}</h2>
  {errs.map(x=><p className="err" key={x}>{x}</p>)}{msg&&<p className="ok">{msg}</p>}{busy&&<p className="meta">{busy}</p>}
  <div className="form">{inp('brand','Marca *')}{inp('model','Modelo *')}{inp('version','Versión')}{inp('year','Año *','number')}{inp('price','Precio','number')}
  <label>Moneda<select value={f.currency} onChange={set('currency')}><option>ARS</option><option>USD</option></select></label>{inp('mileage','Kilometraje','number')}{inp('fuel','Combustible')}{inp('transmission','Transmisión')}{inp('color','Color')}{inp('body_type','Carrocería')}{inp('instagram_url','URL de Instagram')}
  <label>Estado comercial<select value={f.sale_status} onChange={set('sale_status')}><option value="disponible">Disponible</option><option value="reservado">Reservado</option><option value="vendido">Vendido</option></select></label>
  <label className="chk"><input type="checkbox" checked={f.is_published} onChange={set('is_published')}/> Publicado en la web</label><label className="chk"><input type="checkbox" checked={f.featured} onChange={set('featured')}/> Destacado</label></div>
  <label>Descripción<textarea rows={4} value={f.description} onChange={set('description')}/></label>
  <label>Equipamiento (uno por línea)<textarea rows={4} value={f.features} onChange={set('features')}/></label>
  <button className="btn" disabled={!!busy} onClick={save}>{cur?'Guardar cambios':'Crear vehículo'}</button>
  {cur&&<><h3>Fotografías</h3><p className="meta">La primera es la principal. JPG, PNG o WebP, hasta 5 MB.</p><input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={!!busy} onChange={e=>{upload(e.target.files);e.target.value='';}}/>
  <div className="pgrid">{sorted(cur).map((p,i)=><div key={p.id} className="pitem"><img src={p.url} alt=""/>{i===0&&<b className="tag">Principal</b>}<div className="row"><button onClick={()=>move(i,-1)}>←</button><button onClick={()=>move(i,1)}>→</button>{i>0&&<button onClick={()=>main(i)}>★</button>}<button onClick={()=>del(i)}>🗑</button></div></div>)}</div></>}</div>;}

export default function Admin(){
 const [st,setSt]=useState<'load'|'login'|'denied'|'ok'>('load');const [list,setList]=useState<V[]>([]);const [ed,setEd]=useState<V|null|undefined>(undefined);const [q,setQ]=useState('');const [err,setErr]=useState('');
 const check=useCallback(async()=>{const {data:{session}}=await sb.auth.getSession();if(!session)return setSt('login');
  const {data}=await sb.from('admin_users').select('user_id').eq('user_id',session.user.id).maybeSingle();setSt(data?'ok':'denied');},[]);
 const load=useCallback(async()=>{const {data,error}=await sb.from('vehicles').select('*,vehicle_photos(id,url,position)').order('updated_at',{ascending:false});if(error)setErr(error.message);else setList(data as V[]);},[]);
 useEffect(()=>{if(configured)check();},[check]);useEffect(()=>{if(st==='ok'&&ed===undefined)load();},[st,ed,load]);
 if(!configured)return <main><p>Falta configurar Supabase (.env).</p></main>;
 if(st==='load')return <main><p>Cargando…</p></main>;
 if(st==='login')return <Login onDone={check}/>;
 if(st==='denied')return <main><p className="err">Tu usuario no tiene permisos de administrador. Agregalo a la tabla admin_users.</p><button className="btn" onClick={async()=>{await sb.auth.signOut();setSt('login');}}>Salir</button></main>;
 if(ed!==undefined)return <main><Editor v={ed} onClose={()=>setEd(undefined)}/></main>;
 const patch=async(v:V,c:Partial<V>)=>{const {error}=await sb.from('vehicles').update(c).eq('id',v.id);if(error)setErr(error.message);load();};
 const remove=async(v:V)=>{if(!confirm(`¿Eliminar ${v.brand} ${v.model} ${v.year}? Se borran también sus fotos.`))return;
  const paths=v.vehicle_photos.map(p=>pathOf(p.url)).filter(Boolean);if(paths.length){const r=await sb.storage.from(BUCKET).remove(paths);if(r.error)return setErr(`No se pudieron borrar las fotos: ${r.error.message}`);}
  const {error}=await sb.from('vehicles').delete().eq('id',v.id);if(error)setErr(error.message);load();};
 const shown=list.filter(v=>`${v.brand} ${v.model} ${v.version||''}`.toLowerCase().includes(q.toLowerCase()));
 return <main><div className="row" style={{justifyContent:'space-between'}}><h2>Inventario</h2><div className="row"><Link className="btn" to="/">Ver web</Link><button className="btn" onClick={()=>setEd(null)}>+ Nuevo vehículo</button><button className="btn" onClick={async()=>{await sb.auth.signOut();setSt('login');}}>Salir</button></div></div>
  {err&&<p className="err">{err}</p>}<input placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)}/>
  {!shown.length&&<div className="empty"><p>No hay vehículos cargados.</p></div>}
  <div className="tbl">{shown.map(v=><div className="trow" key={v.id}><img src={sorted(v)[0]?.url} alt=""/><div className="grow"><b>{v.brand} {v.model} {v.version||''} · {v.year}</b><div className="meta">{v.price!=null?`${v.currency} ${v.price.toLocaleString('es-AR')}`:'Sin precio'} · {new Date(v.updated_at).toLocaleString('es-AR')}</div></div>
   <select value={v.sale_status} onChange={e=>patch(v,{sale_status:e.target.value})}><option value="disponible">Disponible</option><option value="reservado">Reservado</option><option value="vendido">Vendido</option></select>
   <label className="chk"><input type="checkbox" checked={v.is_published} onChange={e=>patch(v,{is_published:e.target.checked})}/>Publicado</label><label className="chk"><input type="checkbox" checked={v.featured} onChange={e=>patch(v,{featured:e.target.checked})}/>Destacado</label>
   <button className="btn" onClick={()=>setEd(v)}>Editar</button><button className="btn" onClick={()=>remove(v)}>Eliminar</button></div>)}</div></main>;}
