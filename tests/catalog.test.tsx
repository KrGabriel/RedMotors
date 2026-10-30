import assert from 'node:assert/strict';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {Catalog} from '../src/App';
const V=(o:any)=>({id:o.slug,version:null,price:20000000,currency:'ARS',mileage:30000,fuel:'Nafta',transmission:'Manual',color:null,body_type:null,description:null,features:[],sale_status:'disponible',featured:false,instagram_url:null,published_at:'2026-01-01',vehicle_photos:[],...o});
const A=V({slug:'a',brand:'Toyota',model:'Corolla',year:2022}),B=V({slug:'b',brand:'Ford',model:'Focus',year:2019,price:12000000,sale_status:'vendido'}),
 C=V({slug:'c',brand:'Fiat',model:'Cronos',year:2021,price:null,mileage:null}),D=V({slug:'d',brand:'Toyota',model:'Hilux',year:2023,price:45000000,mileage:5000,sale_status:'reservado'});
const vs=[A,B,C,D] as any[];
const run=(qs:string,list=vs)=>renderToString(<MemoryRouter initialEntries={['/catalogo'+qs]}><Catalog vs={list} s={null}/></MemoryRouter>).replace(/<!-- -->/g,''); // el render de servidor separa los textos con marcas
const names=(h:string)=>[...h.matchAll(/<h3>([^<]*)<\/h3>/g)].map(m=>m[1].split(' ')[1]);
assert.deepEqual(names(run('')),['Corolla','Cronos','Hilux','Focus']);console.log('ok vendidos al final por defecto');
assert.deepEqual(names(run('?brand=Toyota')),['Corolla','Hilux']);console.log('ok filtro por marca (desde la URL)');
assert.deepEqual(names(run('?pmin=15000000')),['Corolla','Hilux']);console.log('ok precio minimo excluye "sin precio" y baratos');
assert.deepEqual(names(run('?q=corolla%202022')),['Corolla']);assert.deepEqual(names(run('?q=2021%20fiat')),['Cronos']);console.log('ok busqueda por varias palabras (modelo + año)');
assert.deepEqual(names(run('?kmax=40000')),['Corolla','Hilux','Focus']);console.log('ok km maximo excluye sin dato');
assert.deepEqual(names(run('?sort=price_asc')),['Corolla','Hilux','Cronos','Focus']);console.log('ok orden por precio: sin precio al final, vendidos al final');
assert.deepEqual(names(run('?status=vendido')),['Focus']);console.log('ok filtro por estado');
let h=run('?q=zzz');assert.match(h,/Ningún vehículo coincide/);assert.match(h,/Limpiar filtros/);assert.match(h,/0 de 4 vehículos/);console.log('ok sin resultados: mensaje, contador y boton limpiar');
assert.match(run(''),/aria-label="Marca"/);assert.doesNotMatch(run(''),/Limpiar filtros/);console.log('ok etiquetas accesibles; sin boton limpiar si no hay filtros');
assert.match(run('',[]),/Aún no hay vehículos publicados/);console.log('ok catalogo vacio');
const many=Array.from({length:30},(_,i)=>V({slug:'m'+i,brand:'Toyota',model:'M'+i,year:2020}));
assert.equal(names(run('',many as any)).length,12);assert.equal(names(run('?n=24',many as any)).length,24);assert.match(run('',many as any),/Cargar más/);console.log('ok paginacion guardada en la URL');
