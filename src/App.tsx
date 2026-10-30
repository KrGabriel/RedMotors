import {useEffect,useMemo,useState} from 'react';
import {Link,Route,Routes,useLocation,useNavigationType,useParams,useSearchParams} from 'react-router-dom';
import {configured,loadAll,money,photos,thumbs,title,waLink,waSell,Settings,Vehicle} from './lib';
import {Icon} from './icons';

function Card({v,s}:{v:Vehicle;s:Settings|null}){const img=thumbs(v)[0];const wa=waLink(s,v);
 return <article className="card"><Link to={`/vehiculos/${v.slug}`}>{img?<img src={img} alt={title(v)} loading="lazy" decoding="async"/>:<div className="noimg">Sin foto</div>}</Link>
 <div className="cb"><span className={`tag ${v.sale_status}`}>{v.sale_status}</span><h3>{title(v)}</h3><p className="price">{money(v)}</p>
 <p className="meta">{[v.year,v.mileage!=null&&`${v.mileage.toLocaleString('es-AR')} km`,v.fuel,v.transmission].filter(Boolean).join(' · ')}</p>
 <div className="row"><Link className="btn" to={`/vehiculos/${v.slug}`}>Ver detalles</Link>{wa&&<a className="btn wa" href={wa} target="_blank" rel="noreferrer"><Icon n="chat" size={16}/>WhatsApp</a>}</div></div></article>;}

function Empty({s}:{s:Settings|null}){const wa=waLink(s);return <div className="empty"><h3>Aún no hay vehículos publicados</h3><p>Consultanos y te contamos qué hay disponible.</p>{wa&&<a className="btn wa" href={wa}>Consultar por WhatsApp</a>}</div>;}

export function Home({vs,s}:{vs:Vehicle[];s:Settings|null}){const f=vs.filter(v=>v.featured).slice(0,6);const sell=waSell(s);const live=[...vs.filter(v=>v.sale_status!=='vendido'),...vs.filter(v=>v.sale_status==='vendido')];
 return <><section className="hero"><div className="wrap hero-in"><div className="hero-tx"><p className="eyebrow">Compra / venta{s?.location?` · ${s.location}`:''}</p>
 <h1>Tu próximo vehículo <em>empieza acá</em></h1><p className="lead">Vehículos de toda la provincia. Y si querés vender el tuyo, te ayudamos.</p>
 <div className="row"><Link className="btn pri" to="/catalogo">Ver inventario</Link>{sell&&<a className="btn" href={sell} target="_blank" rel="noreferrer">Quiero vender mi vehículo</a>}</div></div>
 <img className="hero-logo" src="/logo.png" alt={s?.business_name||'RedMotors'} width="222" height="222"/></div></section>
 <div className="wrap">{f.length>0&&<><div className="sec"><h2>Destacados</h2></div><div className="grid">{f.map(v=><Card key={v.id} v={v} s={s}/>)}</div></>}
 <div className="sec"><h2>Últimas incorporaciones</h2>{vs.length>6&&<Link className="more" to="/catalogo">Ver todo el inventario →</Link>}</div>
 {vs.length?<div className="grid">{live.slice(0,6).map(v=><Card key={v.id} v={v} s={s}/>)}</div>:<Empty s={s}/>}</div></>;}

const KEYS=['q','brand','model','fuel','transmission','body','status','ymin','ymax','pmin','pmax','kmax'];
const cmpN=(x:number|null,y:number|null,dir:number)=>x==null&&y==null?0:x==null?1:y==null?-1:(x-y)*dir; // sin dato siempre al final
export function Catalog({vs,s}:{vs:Vehicle[];s:Settings|null}){
 const [sp,setSp]=useSearchParams();const g=(k:string)=>sp.get(k)||'';const sort=g('sort')||'recent';const n=Math.max(12,Number(g('n'))||12);
 const upd=(k:string,val:string,keepN=false)=>{const p=new URLSearchParams(sp);if(val&&!(k==='sort'&&val==='recent'))p.set(k,val);else p.delete(k);if(!keepN)p.delete('n');setSp(p,{replace:true});};
 const opts=(k:keyof Vehicle)=>[...new Set(vs.map(v=>v[k]).filter(Boolean) as string[])].sort();
 const active=KEYS.some(k=>g(k))||sort!=='recent';
 const list=useMemo(()=>{const num=(x:string)=>x===''?null:Number(x);
  const toks=g('q').toLowerCase().split(/\s+/).filter(Boolean),ymin=num(g('ymin')),ymax=num(g('ymax')),pmin=num(g('pmin')),pmax=num(g('pmax')),kmax=num(g('kmax')),model=g('model').toLowerCase();
  const r=vs.filter(v=>{const hay=`${title(v)} ${v.year} ${v.fuel||''} ${v.transmission||''} ${v.color||''} ${v.body_type||''}`.toLowerCase();
   if(!toks.every(t=>hay.includes(t)))return false;
   if(g('brand')&&v.brand!==g('brand'))return false;if(model&&!v.model.toLowerCase().includes(model))return false;
   if(g('fuel')&&v.fuel!==g('fuel'))return false;if(g('transmission')&&v.transmission!==g('transmission'))return false;
   if(g('body')&&v.body_type!==g('body'))return false;if(g('status')&&v.sale_status!==g('status'))return false;
   if(ymin!=null&&v.year<ymin)return false;if(ymax!=null&&v.year>ymax)return false;
   if((pmin!=null||pmax!=null)&&v.price==null)return false;if(pmin!=null&&v.price!<pmin)return false;if(pmax!=null&&v.price!>pmax)return false;
   if(kmax!=null&&(v.mileage==null||v.mileage>kmax))return false;return true;});
  const by:Record<string,(a:Vehicle,b:Vehicle)=>number>={price_asc:(a,b)=>cmpN(a.price,b.price,1),price_desc:(a,b)=>cmpN(a.price,b.price,-1),year:(a,b)=>b.year-a.year,km:(a,b)=>cmpN(a.mileage,b.mileage,1)};
  const o=by[sort]?[...r].sort(by[sort]):r;
  return g('status')?o:[...o.filter(v=>v.sale_status!=='vendido'),...o.filter(v=>v.sale_status==='vendido')]; // los vendidos van al final
 },[vs,sp.toString()]); // eslint-disable-line
 const sel=(k:string,l:string,o:string[])=><select aria-label={l} value={g(k)} onChange={e=>upd(k,e.target.value)}><option value="">{l}</option>{o.map(x=><option key={x}>{x}</option>)}</select>;
 const inp=(k:string,p:string)=><input type="number" aria-label={p} placeholder={p} value={g(k)} onChange={e=>upd(k,e.target.value)}/>;
 return <><h2>Catálogo</h2><div className="filters"><input aria-label="Buscar por marca, modelo, versión o año" placeholder="Buscar marca, modelo, versión o año" value={g('q')} onChange={e=>upd('q',e.target.value)}/>
  {sel('brand','Marca',opts('brand'))}<input aria-label="Modelo" placeholder="Modelo" value={g('model')} onChange={e=>upd('model',e.target.value)}/>{inp('ymin','Año desde')}{inp('ymax','Año hasta')}{inp('pmin','Precio mín.')}{inp('pmax','Precio máx.')}{inp('kmax','Km máx.')}
  {sel('fuel','Combustible',opts('fuel'))}{sel('transmission','Transmisión',opts('transmission'))}{sel('body','Carrocería',opts('body_type'))}{sel('status','Estado',['disponible','reservado','vendido'])}
  <select aria-label="Ordenar por" value={sort} onChange={e=>upd('sort',e.target.value)}><option value="recent">Más recientes</option><option value="price_asc">Precio ↑</option><option value="price_desc">Precio ↓</option><option value="year">Año</option><option value="km">Kilometraje</option></select></div>
  {vs.length>0&&<div className="resultbar"><p className="meta" aria-live="polite">{list.length} de {vs.length} vehículos</p>{active&&<button className="btn" onClick={()=>setSp(new URLSearchParams(),{replace:true})}>Limpiar filtros</button>}</div>}
  {!vs.length?<Empty s={s}/>:!list.length?<p className="meta">Ningún vehículo coincide con los filtros.</p>:<div className="grid">{list.slice(0,n).map(v=><Card key={v.id} v={v} s={s}/>)}</div>}
  {n<list.length&&<div className="row"><button className="btn" onClick={()=>upd('n',String(n+12),true)}>Cargar más</button></div>}</>;}

export function Detail({vs,s}:{vs:Vehicle[];s:Settings|null}){const {slug}=useParams();const v=vs.find(x=>x.slug===slug);const [i,setI]=useState(0);const [big,setBig]=useState(false);const [copied,setCopied]=useState(false);
 useEffect(()=>{if(v)document.title=`${title(v)} ${v.year} | ${s?.business_name||''}`;},[v,s]);
 if(!v) return <p>Vehículo no encontrado. <Link to="/catalogo">Volver al catálogo</Link></p>;
 const ph=photos(v),tp=thumbs(v);const wa=waLink(s,v);const rel=vs.filter(x=>x.id!==v.id&&x.brand===v.brand&&x.sale_status!=='vendido').slice(0,3);
 const rows:[string,unknown][]=[['Año',v.year],['Kilometraje',v.mileage!=null?`${v.mileage.toLocaleString('es-AR')} km`:null],['Combustible',v.fuel],['Transmisión',v.transmission],['Color',v.color],['Carrocería',v.body_type],['Publicado',new Date(v.published_at).toLocaleDateString('es-AR')]];
 const share=async()=>{try{if(navigator.share)await navigator.share({title:title(v),url:location.href});else{await navigator.clipboard.writeText(location.href);setCopied(true);setTimeout(()=>setCopied(false),2000);}}catch{/* cancelado por el usuario */}};
 return <><Link to="/catalogo">← Catálogo</Link><div className="detail"><div>
  {ph.length?<img className="big" src={ph[i]} alt={title(v)} decoding="async" {...({fetchpriority:'high'} as object)} onClick={()=>setBig(true)}/>:<div className="noimg big">Sin fotos</div>}
  <div className="thumbs">{tp.map((u,k)=><img key={ph[k]} src={u} alt="" width="84" height="62" loading="lazy" decoding="async" className={k===i?'on':''} onClick={()=>setI(k)}/>)}</div></div>
  <div><span className={`tag ${v.sale_status}`}>{v.sale_status}</span><h1>{title(v)}</h1><p className="price">{money(v)}</p>
  <dl>{rows.filter(r=>r[1]!=null&&r[1]!=='').map(([k,x])=><div key={k}><dt>{k}</dt><dd>{String(x)}</dd></div>)}</dl>
  {v.description&&<p>{v.description}</p>}{v.features?.length>0&&<ul>{v.features.map(f=><li key={f}>{f}</li>)}</ul>}
  <div className="row">{wa&&<a className="btn wa" href={wa} target="_blank" rel="noreferrer"><Icon n="chat" size={16}/>Consultar por WhatsApp</a>}<button className="btn" onClick={share} aria-live="polite">{copied?'Enlace copiado':'Compartir'}</button>{v.instagram_url&&<a className="btn" href={v.instagram_url} target="_blank" rel="noreferrer"><Icon n="ig" size={16}/>Ver en Instagram</a>}</div></div></div>
  {big&&<div className="lb" role="dialog" aria-label="Galería" onClick={()=>setBig(false)}><button aria-label="Foto anterior" onClick={e=>{e.stopPropagation();setI((i+ph.length-1)%ph.length);}}>‹</button><img src={ph[i]} alt=""/><button aria-label="Foto siguiente" onClick={e=>{e.stopPropagation();setI((i+1)%ph.length);}}>›</button></div>}
  {rel.length>0&&<><h2>Vehículos relacionados</h2><div className="grid">{rel.map(r=><Card key={r.id} v={r} s={s}/>)}</div></>}</>;}

export default function App(){const [d,setD]=useState<{vehicles:Vehicle[];settings:Settings|null;error?:string}|null>(null);const [menu,setMenu]=useState(false);const loc=useLocation();const nav=useNavigationType();
 useEffect(()=>{if(nav!=='POP')window.scrollTo(0,0);},[loc.pathname]); // al abrir una página nueva vuelve arriba; con Atrás se respeta la posición
 useEffect(()=>{const n=d?.settings?.business_name||'RedMotors';if(loc.pathname==='/')document.title=`${n} | Compra y venta de vehículos`;else if(loc.pathname==='/catalogo')document.title=`Catálogo de vehículos | ${n}`;},[loc.pathname,d]);
 useEffect(()=>{if(configured)loadAll().then(setD);},[]);
 if(!configured) return <main><div className="empty"><h3>Falta configurar Supabase</h3><p>Copiá .env.example a .env y completá las dos variables.</p></div></main>;
 if(!d) return <main className="pub"><div className="wrap" style={{paddingTop:40}} aria-busy="true"><div className="grid">{[0,1,2,3,4,5].map(i=><div key={i} className="card sk"/>)}</div></div></main>;
 const s=d.settings;const wa=waLink(s);const close=()=>setMenu(false);
 return <><a className="skip" href="#contenido">Saltar al contenido</a>
 <header><div className="wrap hbar"><Link to="/" className="brand" onClick={close}><img src="/logo.png" alt="" width="44" height="44"/><span>{s?.business_name}</span></Link>
 <button className="menubtn" aria-label="Menú" aria-expanded={menu} onClick={()=>setMenu(!menu)}><Icon n={menu?'x':'menu'} size={22}/></button>
 <nav className={menu?'open':''}><Link to="/" onClick={close}>Inicio</Link><Link to="/catalogo" onClick={close}>Catálogo</Link>
 {s?.instagram_url&&<a href={s.instagram_url} target="_blank" rel="noreferrer"><Icon n="ig" size={16}/>Instagram</a>}{wa&&<a className="navwa" href={wa} target="_blank" rel="noreferrer"><Icon n="chat" size={16}/>WhatsApp</a>}</nav></div></header>
 <main id="contenido" className="pub">{d.error&&<div className="wrap"><p className="err">No se pudo cargar el inventario: {d.error}</p></div>}
 <Routes><Route path="/" element={<Home vs={d.vehicles} s={s}/>}/><Route path="/catalogo" element={<div className="wrap"><Catalog vs={d.vehicles} s={s}/></div>}/><Route path="/vehiculos/:slug" element={<div className="wrap"><Detail vs={d.vehicles} s={s}/></div>}/></Routes></main>
 <footer><div className="wrap fgrid"><div><img src="/logo.png" alt="" width="64" height="64"/><p className="meta">Tu próximo vehículo empieza acá.</p></div>
 <div><h4>Navegación</h4><Link to="/">Inicio</Link><Link to="/catalogo">Catálogo</Link></div>
 <div><h4>Contacto</h4>{wa&&<a href={wa} target="_blank" rel="noreferrer"><Icon n="chat" size={16}/>WhatsApp</a>}{s?.instagram_url&&<a href={s.instagram_url} target="_blank" rel="noreferrer"><Icon n="ig" size={16}/>Instagram</a>}{s?.location&&<p><Icon n="pin" size={16}/>{s.location}</p>}</div></div>
 <div className="wrap copy">© {new Date().getFullYear()} {s?.business_name}</div></footer></>;}
