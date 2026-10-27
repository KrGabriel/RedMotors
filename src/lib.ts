import {createClient} from '@supabase/supabase-js';
export const configured=!!import.meta.env.VITE_SUPABASE_URL&&!!import.meta.env.VITE_SUPABASE_ANON_KEY;
export const sb=createClient(import.meta.env.VITE_SUPABASE_URL||'http://localhost',import.meta.env.VITE_SUPABASE_ANON_KEY||'x');
export type Photo={url:string;position:number};
export type Vehicle={id:string;slug:string;brand:string;model:string;version:string|null;year:number;price:number|null;currency:string;mileage:number|null;fuel:string|null;transmission:string|null;color:string|null;body_type:string|null;description:string|null;features:string[];sale_status:string;featured:boolean;instagram_url:string|null;published_at:string;vehicle_photos:Photo[]};
export type Settings={business_name:string;instagram_url:string|null;whatsapp:string|null;location:string|null;accent:string};
export const money=(v:Vehicle)=>v.price==null?'Consultar':new Intl.NumberFormat('es-AR',{style:'currency',currency:v.currency||'ARS',maximumFractionDigits:0}).format(v.price);
export const photos=(v:Vehicle)=>[...v.vehicle_photos].sort((a,b)=>a.position-b.position).map(p=>p.url);
export const title=(v:Vehicle)=>`${v.brand} ${v.model}${v.version?' '+v.version:''}`;
export function waLink(s:Settings|null,v?:Vehicle){
 const n=(s?.whatsapp||'').replace(/\D/g,''); if(!n) return '';
 const t=v?`Hola, estoy interesado en el ${v.brand} ${v.model}, año ${v.year}, publicado en su catálogo web. ¿Sigue disponible?`:'Hola, quisiera hacer una consulta.';
 return `https://wa.me/${n}?text=${encodeURIComponent(t)}`;}
export async function loadAll(){
 const [v,s]=await Promise.all([sb.from('vehicles').select('*,vehicle_photos(url,position)').eq('is_published',true).order('published_at',{ascending:false}),sb.from('settings').select('*').eq('id',1).maybeSingle()]);
 return {vehicles:(v.data||[]) as Vehicle[],settings:(s.data||null) as Settings|null,error:v.error?.message};}
