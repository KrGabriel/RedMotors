import assert from 'node:assert/strict';
const {plan,thumbPath}=await import(process.argv[2]);
const mk=(size,w,h)=>{const b=new Blob([new Uint8Array(size)]);b.dims={w,h};return b;};
URL.createObjectURL=b=>'fake:'+JSON.stringify(b.dims);URL.revokeObjectURL=()=>{};
globalThis.Image=class{set src(v){this._s=v;}async decode(){const d=JSON.parse(this._s.slice(5));this.naturalWidth=d.w;this.naturalHeight=d.h;}};
let k=1,webp=true,canvases=0;
globalThis.document={createElement:()=>{canvases++;return {getContext:()=>({fillRect(){},drawImage(){}}),toBlob(cb,t,q){const type=t==='image/webp'&&!webp?'image/png':t;const b=new Blob([new Uint8Array(Math.round(this.width*this.height*.15*q*k))],{type});b.dims={w:this.width,h:this.height};cb(b);}};}};
// foto pesada de celular: se reemplaza por 1600 px
let r=await plan(mk(3e6,4000,3000),true);assert.ok(r.full);assert.equal(r.full.w,1600);assert.equal(r.full.h,1200);assert.ok(r.full.blob.size<3e6*.2);assert.equal(r.thumb.w,720);assert.equal(r.full.ext,'webp');console.log('ok foto pesada -> 1600px + miniatura 720px');
// foto liviana y chica: se conserva el original
r=await plan(mk(3e5,1200,900),true);assert.equal(r.full,null);assert.equal(r.thumb.w,720);console.log('ok foto liviana: original intacto, solo miniatura');
// ahorro menor al 10%: no se reemplaza
k=3;r=await plan(mk(41e4,1600,1200),true);assert.equal(r.full,null);k=1;console.log('ok sin ahorro real: no se reemplaza');
// Instagram / sin reemplazo: no toca el original y solo hace 1 canvas
canvases=0;r=await plan(mk(3e6,4000,3000),false);assert.equal(r.full,null);assert.equal(canvases,1);console.log('ok importadas: nunca se reemplazan');
// navegador sin WebP: cae a JPEG
webp=false;r=await plan(mk(3e6,4000,3000),true);assert.equal(r.full.ext,'jpg');assert.equal(r.thumb.ext,'jpg');webp=true;console.log('ok sin WebP -> JPEG');
// foto vertical
r=await plan(mk(2e6,3000,4000),true);assert.equal(r.full.h,1600);assert.equal(r.full.w,1200);console.log('ok vertical');
assert.equal(thumbPath('veh/uuid.jpeg','webp'),'veh/t-uuid.webp');assert.equal(thumbPath('veh/ig-123.jpg','webp'),'veh/t-ig-123.webp');console.log('ok rutas de miniatura');
