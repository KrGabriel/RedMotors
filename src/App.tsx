import {useEffect,useMemo,useState} from 'react';
import {Link,Route,Routes,useParams} from 'react-router-dom';
import {configured,loadAll,money,photos,title,waLink,Settings,Vehicle} from './lib';

function Card({v,s}:{v:Vehicle;s:Settings|null}){const img=photos(v)[0];const wa=waLink(s,v);
 return <article className="card"><Link to={`/vehiculos/${v.slug}`}>{img?<img src={img} alt={title(v)} loading="lazy"/>:<div className="noimg">Sin foto</div>}</Link>
 <div className="cb"><span className={`tag ${v.sale_status}`}>{v.sale_status}</span><h3>{title(v)}</h3><p className="price">{money(v)}</p>
 <p className="meta">{[v.year,v.mileage!=null&&`${v.mileage.toLocaleString('es-AR')} km`,v.fuel,v.transmission].filter(Boolean).join(' · ')}</p>
 <div className="row"><Link className="btn" to={`/vehiculos/${v.slug}`}>Ver detalles</Link>{wa&&<a className="btn wa" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}</div></div></article>;}

function Empty({s}:{s:Settings|null}){const wa=waLink(s);return <div className="empty"><h3>Aún no hay vehículos publicados</h3><p>Consultanos y te contamos qué hay disponible.</p>{wa&&<a className="btn wa" href={wa}>Consultar por WhatsApp</a>}</div>;}

function Home({vs,s}:{vs:Vehicle[];s:Settings|null}){const f=vs.filter(v=>v.featured).slice(0,6);
 return <><section className="hero"><h1>{s?.business_name}</h1><p>Compra y venta de automóviles{s?.location?` en ${s.location}`:''}.</p><Link className="btn" to="/catalogo">Ver catálogo</Link></section>
 <h2>Destacados</h2>{f.length?<div className="grid">{f.map(v=><Card key={v.id} v={v} s={s}/>)}</div>:<p className="meta">Sin destacados por ahora.</p>}
 <h2>Últimas incorporaciones</h2>{vs.length?<div className="grid">{vs.slice(0,6).map(v=><Card key={v.id} v={v} s={s}/>)}</div>:<Empty s={s}/>}</>;}

function Catalog({vs,s}:{vs:Vehicle[];s:Settings|null}){
 const [f,setF]=useState<Record<string,string>>({sort:'recent'});const [n,setN]=useState(12);
 const set=(k:string)=>(e:{target:{value:string}})=>{setF({...f,[k]:e.target.value});setN(12);};
 const opts=(k:keyof Vehicle)=>[...new Set(vs.map(v=>v[k]).filter(Boolean) as string[])].sort();
 const list=useMemo(()=>{const num=(x:string)=>x?Number(x):null;
  const r=vs.filter(v=>{const q=(f.q||'').toLowerCase();
   return (!q||title(v).toLowerCase().includes(q))&&(!f.brand||v.brand===f.brand)&&(!f.model||v.model.toLowerCase().includes(f.model.toLowerCase()))
   &&(!f.fuel||v.fuel===f.fuel)&&(!f.transmission||v.transmission===f.transmission)&&(!f.body||v.body_type===f.body)&&(!f.status||v.sale_status===f.status)
   &&(num(f.ymin)==null||v.year>=num(f.ymin)!)&&(num(f.ymax)==null||v.year<=num(f.ymax)!)
   &&(num(f.pmin)==null||(v.price??0)>=num(f.pmin)!)&&(num(f.pmax)==null||(v.price??0)<=num(f.pmax)!)
   &&(num(f.kmax)==null||(v.mileage??0)<=num(f.kmax)!);});
  const by:Record<string,(a:Vehicle,b:Vehicle)=>number>={price_asc:(a,b)=>(a.price??0)-(b.price??0),price_desc:(a,b)=>(b.price??0)-(a.price??0),year:(a,b)=>b.year-a.year,km:(a,b)=>(a.mileage??0)-(b.mileage??0)};
  return by[f.sort]?[...r].sort(by[f.sort]):r;},[vs,f]);
 const sel=(k:string,l:string,o:string[])=><select value={f[k]||''} onChange={set(k)}><option value="">{l}</option>{o.map(x=><option key={x}>{x}</option>)}</select>;
 const inp=(k:string,p:string)=><input type="number" placeholder={p} value={f[k]||''} onChange={set(k)}/>;
 return <><h2>Catálogo</h2><div className="filters"><input placeholder="Buscar marca, modelo o versión" value={f.q||''} onChange={set('q')}/>
  {sel('brand','Marca',opts('brand'))}<input placeholder="Modelo" value={f.model||''} onChange={set('model')}/>{inp('ymin','Año desde')}{inp('ymax','Año hasta')}{inp('pmin','Precio mín.')}{inp('pmax','Precio máx.')}{inp('kmax','Km máx.')}
  {sel('fuel','Combustible',opts('fuel'))}{sel('transmission','Transmisión',opts('transmission'))}{sel('body','Carrocería',opts('body_type'))}{sel('status','Estado',['disponible','reservado','vendido'])}
  <select value={f.sort} onChange={set('sort')}><option value="recent">Más recientes</option><option value="price_asc">Precio ↑</option><option value="price_desc">Precio ↓</option><option value="year">Año</option><option value="km">Kilometraje</option></select></div>
  {!vs.length?<Empty s={s}/>:!list.length?<p className="meta">Ningún vehículo coincide con los filtros.</p>:<div className="grid">{list.slice(0,n).map(v=><Card key={v.id} v={v} s={s}/>)}</div>}
  {n<list.length&&<button className="btn" onClick={()=>setN(n+12)}>Cargar más</button>}</>;}

function Detail({vs,s}:{vs:Vehicle[];s:Settings|null}){const {slug}=useParams();const v=vs.find(x=>x.slug===slug);const [i,setI]=useState(0);const [big,setBig]=useState(false);
 useEffect(()=>{if(v)document.title=`${title(v)} ${v.year} | ${s?.business_name||''}`;},[v,s]);
 if(!v) return <p>Vehículo no encontrado. <Link to="/catalogo">Volver al catálogo</Link></p>;
 const ph=photos(v);const wa=waLink(s,v);const rel=vs.filter(x=>x.id!==v.id&&x.brand===v.brand).slice(0,3);
 const rows:[string,unknown][]=[['Año',v.year],['Kilometraje',v.mileage!=null?`${v.mileage.toLocaleString('es-AR')} km`:null],['Combustible',v.fuel],['Transmisión',v.transmission],['Color',v.color],['Carrocería',v.body_type],['Publicado',new Date(v.published_at).toLocaleDateString('es-AR')]];
 const share=()=>navigator.share?navigator.share({title:title(v),url:location.href}):navigator.clipboard.writeText(location.href);
 return <><Link to="/catalogo">← Catálogo</Link><div className="detail"><div>
  {ph.length?<img className="big" src={ph[i]} alt={title(v)} onClick={()=>setBig(true)}/>:<div className="noimg big">Sin fotos</div>}
  <div className="thumbs">{ph.map((u,k)=><img key={u} src={u} alt="" className={k===i?'on':''} onClick={()=>setI(k)}/>)}</div></div>
  <div><span className={`tag ${v.sale_status}`}>{v.sale_status}</span><h1>{title(v)}</h1><p className="price">{money(v)}</p>
  <dl>{rows.filter(r=>r[1]!=null&&r[1]!=='').map(([k,x])=><div key={k}><dt>{k}</dt><dd>{String(x)}</dd></div>)}</dl>
  {v.description&&<p>{v.description}</p>}{v.features?.length>0&&<ul>{v.features.map(f=><li key={f}>{f}</li>)}</ul>}
  <div className="row">{wa&&<a className="btn wa" href={wa} target="_blank" rel="noreferrer">Consultar por WhatsApp</a>}<button className="btn" onClick={share}>Compartir</button>{v.instagram_url&&<a className="btn" href={v.instagram_url} target="_blank" rel="noreferrer">Ver en Instagram</a>}</div></div></div>
  {big&&<div className="lb" onClick={()=>setBig(false)}><button onClick={e=>{e.stopPropagation();setI((i+ph.length-1)%ph.length);}}>‹</button><img src={ph[i]} alt=""/><button onClick={e=>{e.stopPropagation();setI((i+1)%ph.length);}}>›</button></div>}
  {rel.length>0&&<><h2>Vehículos relacionados</h2><div className="grid">{rel.map(r=><Card key={r.id} v={r} s={s}/>)}</div></>}</>;}

export default function App(){const [d,setD]=useState<{vehicles:Vehicle[];settings:Settings|null;error?:string}|null>(null);
 useEffect(()=>{if(configured)loadAll().then(setD);},[]);
 useEffect(()=>{if(d?.settings?.accent)document.documentElement.style.setProperty('--accent',d.settings.accent);},[d]);
 if(!configured) return <main><div className="empty"><h3>Falta configurar Supabase</h3><p>Copiá .env.example a .env y completá las dos variables.</p></div></main>;
 if(!d) return <main><p>Cargando…</p></main>;
 const s=d.settings;const wa=waLink(s);
 return <><header><Link to="/" className="logo">{s?.business_name}</Link><nav><Link to="/">Inicio</Link><Link to="/catalogo">Catálogo</Link>{s?.instagram_url&&<a href={s.instagram_url}>Instagram</a>}{wa&&<a className="wa" href={wa}>WhatsApp</a>}</nav></header>
 <main>{d.error&&<p className="err">No se pudo cargar el inventario: {d.error}</p>}
 <Routes><Route path="/" element={<Home vs={d.vehicles} s={s}/>}/><Route path="/catalogo" element={<Catalog vs={d.vehicles} s={s}/>}/><Route path="/vehiculos/:slug" element={<Detail vs={d.vehicles} s={s}/>}/></Routes></main>
 <footer>{s?.business_name} · {s?.location}</footer></>;}
