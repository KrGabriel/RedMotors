// Edge Function de Netlify: agrega SEO y vista previa (Open Graph) a las páginas, y sirve robots.txt y sitemap.xml.
// Lee solo datos públicos de Supabase con la clave anon (las mismas reglas RLS que el navegador).
const env=(k:string):string=>(globalThis as any).Deno?.env.get(k)||'';
const SB=()=>(env('SUPABASE_URL')||env('VITE_SUPABASE_URL')).replace(/\/$/,'');
const KEY=()=>env('SUPABASE_ANON_KEY')||env('VITE_SUPABASE_ANON_KEY');
async function rest(path:string):Promise<any[]|null>{const u=SB(),k=KEY();if(!u||!k)return null;
 try{const r=await fetch(`${u}/rest/v1/${path}`,{headers:{apikey:k,Authorization:`Bearer ${k}`}});return r.ok?await r.json():null;}catch{return null;}}
const esc=(s:unknown)=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const money=(p:number,c:string)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:c||'ARS',maximumFractionDigits:0}).format(p);
const inject=(html:string,title:string,head:string)=>html.replace(/<title>.*?<\/title>/s,`<title>${esc(title)}</title>`).replace(/<meta name="description"[^>]*>/g,'').replace('</head>',`${head}</head>`);
const meta=(o:{desc:string;url:string;title:string;site:string;image:string})=>
 `<meta name="description" content="${esc(o.desc)}"><link rel="canonical" href="${esc(o.url)}"><meta property="og:type" content="website"><meta property="og:locale" content="es_AR"><meta property="og:site_name" content="${esc(o.site)}"><meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.desc)}"><meta property="og:url" content="${esc(o.url)}"><meta property="og:image" content="${esc(o.image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(o.image)}">`;
const AVAIL:Record<string,string>={disponible:'https://schema.org/InStock',reservado:'https://schema.org/LimitedAvailability',vendido:'https://schema.org/SoldOut'};

export default async (req:Request,ctx:{next:()=>Promise<Response>})=>{
 const url=new URL(req.url),origin=url.origin,p=url.pathname;
 if(p==='/robots.txt')return new Response(`User-agent: *\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`,{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=3600'}});
 if(p==='/sitemap.xml'){
  const rows=(await rest('vehicles?is_published=eq.true&select=slug,updated_at&order=published_at.desc&limit=1000'))||[];
  const u=(loc:string,last?:string)=>`<url><loc>${esc(origin+loc)}</loc>${last?`<lastmod>${esc(last.slice(0,10))}</lastmod>`:''}</url>`;
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${u('/')}${u('/catalogo')}${rows.map(r=>u(`/vehiculos/${r.slug}`,r.updated_at)).join('')}</urlset>`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});}
 const res=await ctx.next();
 if(!(res.headers.get('content-type')||'').includes('text/html'))return res;
 const html=await res.text();const site=(await rest('settings?id=eq.1&select=business_name'))?.[0]?.business_name||'RedMotors';
 const logo=`${origin}/logo.png`;let out=html;
 if(p==='/'){const title=`${site} | Compra y venta de vehículos`,desc='Compra y venta de vehículos. Tu próximo vehículo empieza acá. Vehículos de toda la provincia.';
  out=inject(html,title,meta({title,desc,url:`${origin}/`,site,image:logo}));}
 else{const m=p.match(/^\/vehiculos\/([a-z0-9-]+)\/?$/);
  if(m){const v=(await rest(`vehicles?slug=eq.${m[1]}&is_published=eq.true&select=brand,model,version,year,price,currency,mileage,fuel,transmission,color,body_type,description,sale_status,vehicle_photos(url,thumb_url,position)&limit=1`))?.[0];
   if(!v)out=html.replace('</head>','<meta name="robots" content="noindex"></head>');
   else{const name=`${v.brand} ${v.model}${v.version?' '+v.version:''}`,canon=`${origin}/vehiculos/${m[1]}`;
    const sp=[...(v.vehicle_photos||[])].sort((a:any,b:any)=>a.position-b.position),photos=sp.map((x:any)=>x.url),og=sp[0]?.thumb_url||photos[0];
    const facts=[v.mileage!=null&&`${v.mileage.toLocaleString('es-AR')} km`,v.fuel,v.transmission,v.price!=null&&money(v.price,v.currency)].filter(Boolean).join(' · ');
    let desc=`${name} ${v.year}.${facts?' '+facts+'.':''}${v.description?' '+String(v.description).replace(/\s+/g,' '):''}`;if(desc.length>157)desc=desc.slice(0,156).trimEnd()+'…';
    const title=`${name} ${v.year} | ${site}`;
    const ld={'@context':'https://schema.org','@type':'Car',name:`${name} ${v.year}`,brand:{'@type':'Brand',name:v.brand},model:v.model,vehicleModelDate:String(v.year),url:canon,image:photos.length?photos:undefined,
     color:v.color||undefined,bodyType:v.body_type||undefined,fuelType:v.fuel||undefined,vehicleTransmission:v.transmission||undefined,description:v.description||undefined,
     mileageFromOdometer:v.mileage!=null?{'@type':'QuantitativeValue',value:v.mileage,unitCode:'KMT'}:undefined,
     offers:v.price!=null?{'@type':'Offer',price:v.price,priceCurrency:v.currency||'ARS',availability:AVAIL[v.sale_status],url:canon}:undefined};
    out=inject(html,title,meta({title,desc,url:canon,site,image:og||logo})+`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g,'\\u003c')}</script>`);}}}
 const h=new Headers(res.headers);h.delete('content-length');
 return new Response(out,{status:res.status,headers:h});};
export const config={path:['/','/vehiculos/*','/robots.txt','/sitemap.xml']};
