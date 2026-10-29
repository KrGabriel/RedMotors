import {useEffect,useState} from 'react';
import {sb} from './lib';
import {validateSettings} from './adminTools';
const empty={business_name:'',whatsapp:'',instagram_url:'',location:''};
export default function SettingsAdmin({onClose}:{onClose:()=>void}){
 const [f,setF]=useState(empty);const [errs,setErrs]=useState<string[]>([]);const [hints,setHints]=useState<string[]>([]);const [msg,setMsg]=useState('');const [busy,setBusy]=useState(true);
 useEffect(()=>{sb.from('settings').select('business_name,whatsapp,instagram_url,location').eq('id',1).maybeSingle().then(({data,error})=>{
  if(error)setErrs([error.message]);else if(data)setF({business_name:data.business_name||'',whatsapp:data.whatsapp||'',instagram_url:data.instagram_url||'',location:data.location||''});setBusy(false);});},[]);
 const set=(k:keyof typeof empty)=>(e:{target:{value:string}})=>{setF({...f,[k]:e.target.value});setMsg('');};
 const save=async()=>{const v=validateSettings(f);setErrs(v.errors);setHints(v.hints);if(v.errors.length)return;setBusy(true);
  const {error}=await sb.from('settings').upsert({id:1,...v.clean});setBusy(false);
  if(error)return setErrs([`No se pudo guardar: ${error.message}. Si dice "row-level security", tu usuario no está en admin_users.`]);
  setF({business_name:v.clean.business_name,whatsapp:v.clean.whatsapp||'',instagram_url:v.clean.instagram_url||'',location:v.clean.location||''});setMsg('Guardado. Los cambios se ven en la web al recargarla.');};
 const wa=f.whatsapp.replace(/\D/g,'');
 return <div className="editor"><div className="row" style={{justifyContent:'space-between'}}><h2>Configuración del negocio</h2><button className="btn" onClick={onClose}>← Inventario</button></div>
  {errs.map(x=><p className="err" key={x}>{x}</p>)}{hints.map(x=><p className="meta" key={x}>{x}</p>)}{msg&&<p className="ok">{msg}</p>}
  <div className="form"><label>Nombre del negocio *<input value={f.business_name} onChange={set('business_name')}/></label>
   <label>WhatsApp (con código de país, sin + ni espacios)<input inputMode="numeric" placeholder="5493764123456" value={f.whatsapp} onChange={set('whatsapp')}/></label>
   <label>Instagram (enlace o @usuario)<input placeholder="https://www.instagram.com/tuusuario/" value={f.instagram_url} onChange={set('instagram_url')}/></label>
   <label>Ubicación<input placeholder="Ciudad, Provincia" value={f.location} onChange={set('location')}/></label></div>
  <div className="row"><button className="btn pri" disabled={busy} onClick={save}>Guardar</button>{wa.length>=8&&<a className="btn" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Probar enlace de WhatsApp</a>}</div></div>;}
