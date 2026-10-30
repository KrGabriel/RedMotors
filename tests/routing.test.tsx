// Verifica la estructura real de rutas de la web (rutas anidadas bajo "*", useParams, useSearchParams).
import assert from 'node:assert/strict';
import {renderToString} from 'react-dom/server';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {Catalog,Detail,Home} from '../src/App';
const V=(o:any)=>({id:o.slug,version:null,price:20000000,currency:'ARS',mileage:30000,fuel:'Nafta',transmission:'Manual',color:null,body_type:null,description:null,features:[],sale_status:'disponible',featured:false,instagram_url:null,published_at:'2026-01-01',vehicle_photos:[],...o});
const vs=[V({slug:'a',brand:'Toyota',model:'Corolla',year:2022}),V({slug:'b',brand:'Ford',model:'Focus',year:2019})] as any[];
const Inner=()=><Routes><Route path="/" element={<Home vs={vs} s={null}/>}/><Route path="/catalogo" element={<Catalog vs={vs} s={null}/>}/><Route path="/vehiculos/:slug" element={<Detail vs={vs} s={null}/>}/></Routes>;
const Outer=()=><Routes><Route path="/admin" element={<p>PANEL-ADMIN</p>}/><Route path="*" element={<Inner/>}/></Routes>;
const at=(p:string)=>renderToString(<MemoryRouter initialEntries={[p]}><Outer/></MemoryRouter>).replace(/<!-- -->/g,'');
let h=at('/');assert.match(h,/empieza acá/);assert.doesNotMatch(h,/PANEL-ADMIN/);console.log('ok ruta / (inicio)');
h=at('/catalogo?brand=Toyota');assert.match(h,/Corolla/);assert.doesNotMatch(h,/Focus/);console.log('ok ruta /catalogo con filtros en la URL');
h=at('/vehiculos/b');assert.match(h,/<h1>Ford Focus<\/h1>/);console.log('ok ruta /vehiculos/:slug (useParams)');
assert.match(at('/vehiculos/zzz'),/Vehículo no encontrado/);console.log('ok ficha inexistente');
h=at('/admin');assert.match(h,/PANEL-ADMIN/);assert.doesNotMatch(h,/Catálogo/);console.log('ok /admin no cae en la web publica');
