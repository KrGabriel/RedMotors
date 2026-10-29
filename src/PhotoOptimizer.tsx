import {useCallback,useEffect,useRef,useState} from 'react';
import {sb} from './lib';
import {BUCKET,pathOf,plan,putBlob,thumbPath} from './photoTools';
type Row={id:string;vehicle_id:string;url:string;thumb_url:string|null;source_media_id:string|null};
const mb=(n:number)=>`${(n/1048576).toFixed(2)} MB`;
export default function PhotoOptimizer({onClose}:{onClose:()=>void}){
 const [rows,setRows]=useState<Row[]|null>(null);const [err,setErr]=useState('');const [replace,setReplace]=useState(true);const [run,setRun]=useState(false);
 const [prog,setProg]=useState({done:0,total:0});const [log,setLog]=useState<string[]>([]);const [retired,setRetired]=useState<{path:string;size:number}[]>([]);const [sum,setSum]=useState('');const stop=useRef(false);
 const load=useCallback(async()=>{const all:Row[]=[];
  for(let from=0;;from+=1000){const {data,error}=await sb.from('vehicle_photos').select('id,vehicle_id,url,thumb_url,source_media_id').range(from,from+999);
   if(error){setErr(error.message.includes('thumb_url')?'Falta ejecutar supabase/images_migration.sql en el SQL Editor de Supabase.':error.message);return;}
   all.push(...(data as Row[]));if(data.length<1000)break;}
  setErr('');setRows(all);},[]);
 useEffect(()=>{load();},[load]);
 const pending=(rows||[]).filter(r=>!r.thumb_url),manual=pending.filter(r=>!r.source_media_id).length;
 const start=async()=>{
  if(!confirm(`Se van a procesar ${pending.length} fotos. Se crea una miniatura de cada una.${replace?' En las fotos subidas a mano que sean pesadas, la web pasa a usar una versión optimizada; las originales se conservan hasta que vos las borres al terminar.':''} Las fotos importadas de Instagram no se modifican. ¿Continuar?`))return;
  stop.current=false;setRun(true);setLog([]);setRetired([]);setSum('');let before=0,after=0,n=0;const ret:{path:string;size:number}[]=[];
  for(let i=0;i<pending.length&&!stop.current;i++){const p=pending[i];setProg({done:i,total:pending.length});const created:string[]=[];
   try{const path=pathOf(p.url),d=await sb.storage.from(BUCKET).download(path);if(d.error)throw new Error(d.error.message);
    const pl=await plan(d.data,replace&&!p.source_media_id);const patch:{url?:string;thumb_url?:string}={};
    const tp=thumbPath(path,pl.thumb.ext);patch.thumb_url=await putBlob(tp,pl.thumb.blob);created.push(tp);
    if(pl.full){const np=path.replace(/([^/]+)\.[A-Za-z0-9]+$/,`o-$1.${pl.full.ext}`);patch.url=await putBlob(np,pl.full.blob);created.push(np);}
    const u=await sb.from('vehicle_photos').update(patch).eq('id',p.id);if(u.error)throw new Error(u.error.message);
    n++;before+=d.data.size;after+=pl.full?pl.full.blob.size:d.data.size;
    if(pl.full){ret.push({path,size:d.data.size});setLog(l=>[...l,`Optimizada: ${mb(d.data.size)} → ${mb(pl.full!.blob.size)}`]);}
   }catch(e){if(created.length)await sb.storage.from(BUCKET).remove(created);setLog(l=>[...l,`Error en la foto ${p.id.slice(0,8)}: ${(e as Error).message}`]);}}
  setRetired(ret);setRun(false);setProg({done:0,total:0});setSum(`Procesadas ${n}. Peso de las fotos principales: ${mb(before)} → ${mb(after)}.`);await load();};
 const wipe=async()=>{if(!confirm(`Se borran ${retired.length} fotos originales reemplazadas (${mb(retired.reduce((a,r)=>a+r.size,0))}). No se puede deshacer. ¿Ya revisaste cómo se ven en la web?`))return;
  const r=await sb.storage.from(BUCKET).remove(retired.map(x=>x.path));if(r.error)setLog(l=>[...l,`No se pudieron borrar: ${r.error!.message}`]);else{setLog(l=>[...l,'Originales borrados.']);setRetired([]);}};
 return <div><div className="row" style={{justifyContent:'space-between'}}><h2>Optimizar fotos</h2><button className="btn" disabled={run} onClick={onClose}>← Inventario</button></div>
  {err&&<p className="err">{err}</p>}{!rows&&!err&&<p className="meta">Cargando…</p>}
  {rows&&<><p>Fotos: <b>{rows.length}</b> · con miniatura: <b>{rows.length-pending.length}</b> · pendientes: <b>{pending.length}</b> ({manual} subidas a mano, {pending.length-manual} de Instagram)</p>
  {pending.length===0&&!run&&<p className="ok">Todas las fotos tienen miniatura.</p>}
  {pending.length>0&&<><label className="chk"><input type="checkbox" checked={replace} disabled={run} onChange={e=>setReplace(e.target.checked)}/>Reemplazar fotos subidas a mano que sean pesadas por una versión optimizada (hasta 1600 px)</label>
   <div className="row"><button className="btn pri" disabled={run} onClick={start}>Procesar {pending.length} fotos</button>{run&&<button className="btn" onClick={()=>{stop.current=true;}}>Detener</button>}</div></>}
  {run&&<p className="meta">Procesando {prog.done+1} de {prog.total}… no cierres esta pantalla.</p>}
  {sum&&<p className="ok">{sum}</p>}
  {retired.length>0&&<div className="empty" style={{textAlign:'left'}}><p>Quedan <b>{retired.length}</b> fotos originales reemplazadas ({mb(retired.reduce((a,r)=>a+r.size,0))}) ocupando espacio. Revisá cómo se ven los autos en la web y después borralas. Si salís de esta pantalla sin borrarlas, quedan en el almacenamiento sin usarse.</p><button className="btn" onClick={wipe}>Borrar originales reemplazados</button></div>}
  {log.map((l,i)=><p key={i} className={l.startsWith('Error')||l.startsWith('No se')?'err':'meta'}>{l}</p>)}</>}</div>;}
