import {sb} from './lib';
export const BUCKET='vehicle-photos';
export const pathOf=(url:string)=>url.split(`/${BUCKET}/`)[1]||'';
export const HEAVY=400*1024,FULL_EDGE=1600,THUMB_EDGE=720;
export type Out={blob:Blob;ext:string;w:number;h:number;w0:number;h0:number};
export async function resize(b:Blob,maxEdge:number,q:number):Promise<Out>{
 const u=URL.createObjectURL(b);
 try{const img=new Image();img.src=u;await img.decode(); // <img> aplica la orientación EXIF de las fotos de celular
  const w0=img.naturalWidth,h0=img.naturalHeight,s=Math.min(1,maxEdge/Math.max(w0,h0)),w=Math.round(w0*s),h=Math.round(h0*s);
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d')!;
  x.fillStyle='#fff';x.fillRect(0,0,w,h);x.imageSmoothingQuality='high';x.drawImage(img,0,0,w,h);
  const to=(t:string)=>new Promise<Blob|null>(r=>c.toBlob(r,t,q));
  let o=await to('image/webp'),ext='webp';if(!o||o.type!=='image/webp'){o=await to('image/jpeg');ext='jpg';}
  if(!o)throw new Error('El navegador no pudo generar la imagen.');
  return {blob:o,ext,w,h,w0,h0};}
 finally{URL.revokeObjectURL(u);}}
/** Decide qué guardar: miniatura siempre; versión optimizada solo si se permite, la foto es pesada/grande y el ahorro es real (>10%). */
export async function plan(file:Blob,allowReplace:boolean){
 const r=allowReplace?await resize(file,FULL_EDGE,.85):null;
 const useOpt=!!r&&(file.size>HEAVY||Math.max(r.w0,r.h0)>FULL_EDGE)&&r.blob.size<file.size*.9;
 const thumb=await resize(useOpt?r!.blob:file,THUMB_EDGE,.8);
 return {full:useOpt?r!:null,thumb};}
export async function putBlob(path:string,b:Blob,type?:string){
 const {error}=await sb.storage.from(BUCKET).upload(path,b,{contentType:type||b.type,cacheControl:'31536000',upsert:true});
 if(error)throw new Error(error.message);return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;}
export const thumbPath=(path:string,ext:string)=>path.replace(/([^/]+)\.[A-Za-z0-9]+$/,`t-$1.${ext}`);
/** Crea miniaturas para las fotos de un vehículo que no la tengan. No modifica los originales. */
export async function ensureThumbs(vehicleId:string){
 const {data,error}=await sb.from('vehicle_photos').select('id,url').eq('vehicle_id',vehicleId).is('thumb_url',null);
 const errs:string[]=error?[error.message]:[];let ok=0;
 for(const p of data||[]){
  try{const path=pathOf(p.url),d=await sb.storage.from(BUCKET).download(path);if(d.error)throw new Error(d.error.message);
   const th=await resize(d.data,THUMB_EDGE,.8),turl=await putBlob(thumbPath(path,th.ext),th.blob);
   const u=await sb.from('vehicle_photos').update({thumb_url:turl}).eq('id',p.id);if(u.error)throw new Error(u.error.message);ok++;}
  catch(e){errs.push(`${p.id.slice(0,8)}: ${(e as Error).message}`);}}
 return {ok,errs};}
