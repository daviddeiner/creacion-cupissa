(()=>{'use strict';const $=id=>document.getElementById(id);const form=$('modal-product-form');const catalog=$('creation-catalog');const bf=$('creation-black-friday');let page=0,seq=0;const size=30;const busy=()=> $('product-step-save')?.disabled || pendingImageQueue.length>0 || $('bf-save').disabled;const arr=v=>Array.isArray(v)?v:[];const norm=v=>typeof v==='string'?{nombre:v,incremento:0}:v;const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;el.className=cls||'';return el;};const button=(label,fn)=>{const b=text('button',label,'creation-action');b.type='button';b.onclick=fn;return b;};
function reset(){window.openProductModal();$('product-step-save').textContent='Crear producto(s)';form.hidden=false;catalog.hidden=true;bf.hidden=true;}
window.creationNew=()=>{if(busy())return;if(!form.hidden&&!confirm('¿Descartar los cambios del formulario y empezar de nuevo?'))return;reset();};
window.creationShowCatalog=()=>{if(busy())return;if(!form.hidden&&$('prod-edit-id').value&&!confirm('¿Cancelar la edición sin guardar?'))return;form.hidden=true;catalog.hidden=false;bf.hidden=true;page=0;load();};
window.creationCancel=()=>{if(busy())return;if(!confirm('¿Descartar los cambios sin guardar?'))return;reset();form.hidden=true;catalog.hidden=false;bf.hidden=true;load();};
async function edit(id){try{await verifyAdmin();const {data:p,error}=await supabaseClient.from('productos').select('*').eq('id',id).single();if(error)throw error;reset();$('prod-edit-id').value=p.id;$('product-modal-title').textContent='Editar producto: '+p.nombre;for(const field of ['nombre','descripcion','precio_detal','precio_mayorista','cant_min_mayorista','porcentaje_anticipo','dias_preparacion','precio_alquiler','valor_deposito'])if(p[field]!=null)$('prod-'+field.replaceAll('_','-')).value=p[field];for(const field of ['mundo','categoria','subcategoria','temporada'])setProductMultiValues(field,productMultiValuesFromRow(p,field));for(const field of ['personalizable','al_por_mayor','venta','alquiler','credito','pago_contraentrega','produccion_express'])$('chk-'+field.replaceAll('_','-')).checked=!!p[field];cupissaSetBlackFriday(p.black_friday_pct);tempTallas=arr(p.tallas).map(norm);tempColores=arr(p.colores).map(norm);tempAccesorios=arr(p.accesorios).map(norm);tempBase64Photos=[...arr(p.fotos)];tempOriginalPhotos=tempBase64Photos.map((v,i)=>arr(p.fotos_originales)[i]||v);toggleAlquilerFields();renderTallasTags();renderColoresTags();renderAccesoriosTags();renderPreviewPhotos();$('product-step-save').textContent='Guardar cambios';window.showProductStep(1);}catch(e){alert(e.message);}}
async function mutate(p,remove){if(!confirm(remove?'¿Eliminar definitivamente este producto de Supabase?':'¿Cambiar la visibilidad de este producto?'))return;try{await verifyAdmin();const q=supabaseClient.from('productos');const {data,error}=await (remove?q.delete():q.update({oculto:!p.oculto})).eq('id',p.id).select('id').single();if(error||!data)throw error||Error('Cambio no confirmado');load();void loadClassificationOptions().catch(console.warn);}catch(e){alert(e.message);}}
async function load(){const token=++seq;const host=$('creation-results');host.textContent='Cargando productos…';try{let q=supabaseClient.from('productos').select('id,nombre,precio_detal,fotos,oculto,black_friday_pct',{count:'exact'}).order('created_at',{ascending:false}).order('id').range(page*size,page*size+size-1);const search=$('creation-search').value.trim();if(search)q=q.ilike('nombre','%'+search.replace(/[%_]/g,'')+'%');const {data,error,count}=await q;if(token!==seq)return;if(error)throw error;host.replaceChildren();for(const p of data||[]){const card=document.createElement('article');card.className='creation-product';const img=document.createElement('img');img.alt='';if(arr(p.fotos)[0])img.src=p.fotos[0];img.loading='lazy';card.append(img,text('strong',p.nombre||'Sin nombre'),text('span',formatCOP(p.precio_detal)+(p.oculto?' · Oculto':' · Publicado')));const actions=document.createElement('div');actions.className='creation-product-actions';actions.append(button(p.black_friday_pct?'B · '+p.black_friday_pct+'%':'B',async()=>{const value=cupissaAskBlackFriday(p.black_friday_pct);if(value===null)return;try{await verifyAdmin();const {error}=await supabaseClient.from('productos').update({black_friday_pct:value}).eq('id',p.id).select('id').single();if(error)throw error;load();}catch(e){alert(e.message);}}),button('Editar',()=>edit(p.id)),button(p.oculto?'Publicar':'Ocultar',()=>mutate(p,false)),button('Eliminar',()=>mutate(p,true)));card.append(actions);host.append(card);}if(!data?.length)host.textContent='No hay productos.';$('creation-page').textContent=`Página ${page+1} de ${Math.max(1,Math.ceil((count||0)/size))}`;$('creation-prev').disabled=page===0;$('creation-next').disabled=(page+1)*size>=(count||0);}catch(e){if(token===seq)host.textContent='No se pudo cargar: '+e.message;}}
$('creation-prev').onclick=()=>{if(page>0){page--;load();}};$('creation-next').onclick=()=>{page++;load();};let timer;$('creation-search').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{page=0;load();},300);};
// Independent promotion management; uses the existing Black Friday schema.
let bfProduct=null,bfPage=0,bfSequence=0,bfSearchSequence=0;
const bfFields='id,nombre,precio_detal,precio_alquiler,venta,alquiler,fotos,oculto,black_friday_pct';
const bfStatus=(message,error=false)=>{const el=$('bf-status');el.textContent=message;el.className=error?'text-red-700 font-bold':'text-green-700 font-bold';};
function bfPreview(){
 const price=Number($('bf-price').value),pct=Number($('bf-discount').value);
 const valid=$('bf-offer-form').checkValidity()&&price>0&&pct>=0&&pct<=99;
 const total=Math.round(price*(100-pct)/100);
 $('bf-final').textContent=valid?formatCOP(total):'—';
 $('bf-saving').textContent=valid?'Ahorro: '+formatCOP(price-total):'';
}
function bfSelect(p){
 bfProduct=p;$('bf-name').value=p.nombre||'';$('bf-selected').textContent=(p.nombre||'Sin nombre')+(p.oculto?' · Oculto (no visible en tienda)':'');
 $('bf-price').value=p.precio_detal??0;$('bf-discount').value=p.black_friday_pct||50;
 $('bf-offer-form').hidden=false;$('bf-matches').replaceChildren();bfStatus('');bfPreview();
}
function bfCard(p,active){
 const card=document.createElement('article');card.className='creation-product';
 const img=document.createElement('img');img.alt='';if(arr(p.fotos)[0])img.src=p.fotos[0];img.loading='lazy';
 const pct=Number(p.black_friday_pct)||0,price=Number(p.precio_detal)||0;
 card.append(img,text('strong',p.nombre||'Sin nombre'),text('span',formatCOP(price)+(p.oculto?' · Oculto':'')+(pct?' · '+pct+'% · '+formatCOP(Math.round(price*(100-pct)/100)):'')));
 const actions=document.createElement('div');actions.className='creation-product-actions';
 actions.append(button(active?'Editar oferta':'Seleccionar',()=>bfSelect(p)));
 card.append(actions);return card;
}
async function bfLoad(){
 const token=++bfSequence,host=$('bf-active');host.textContent='Cargando ofertas…';
 try{
 const {data,error,count}=await supabaseClient.from('productos').select(bfFields,{count:'exact'}).gt('black_friday_pct',0).order('nombre').order('id').range(bfPage*size,bfPage*size+size-1);
 if(token!==bfSequence)return;if(error)throw error;
 host.replaceChildren(...(data||[]).map(p=>bfCard(p,true)));
 if(!data?.length)host.textContent='No hay ofertas activas.';
 $('bf-page').textContent='Página '+(bfPage+1)+' de '+Math.max(1,Math.ceil((count||0)/size));
 $('bf-prev').disabled=bfPage===0;$('bf-next').disabled=(bfPage+1)*size>=(count||0);
 }catch(e){if(token===bfSequence)host.textContent='No se pudieron cargar las ofertas: '+e.message;}
}
window.creationShowBlackFriday=()=>{
 if(busy())return;if(!form.hidden&&!confirm('¿Salir del formulario sin guardar?'))return;
 form.hidden=true;catalog.hidden=true;bf.hidden=false;bfPage=0;bfLoad();
};
$('bf-prev').onclick=()=>{if(bfPage>0){bfPage--;bfLoad();}};
$('bf-next').onclick=()=>{bfPage++;bfLoad();};
$('bf-search-form').onsubmit=async e=>{
 e.preventDefault();if($('bf-save').disabled)return;
 const token=++bfSearchSequence,host=$('bf-matches'),name=$('bf-name').value.trim().replace(/[%_]/g,'');
 bfProduct=null;$('bf-offer-form').hidden=true;bfStatus('');
 if(!name){host.textContent='Escribe un nombre.';return;}
 host.textContent='Buscando…';
 try{await verifyAdmin();const {data,error}=await supabaseClient.from('productos').select(bfFields).ilike('nombre','%'+name+'%').order('nombre').limit(50);
 if(token!==bfSearchSequence)return;if(error)throw error;
 host.replaceChildren(...(data||[]).map(p=>bfCard(p,false)));if(!data?.length)host.textContent='No se encontraron productos. Créalos primero en Nuevo producto.';
 }catch(e){if(token===bfSearchSequence)host.textContent='Error: '+e.message;}
};
$('bf-name').oninput=()=>{bfSearchSequence++;bfProduct=null;$('bf-offer-form').hidden=true;$('bf-matches').replaceChildren();};
$('bf-price').oninput=bfPreview;$('bf-discount').oninput=bfPreview;
$('bf-offer-form').onsubmit=async e=>{
 e.preventDefault();if(!bfProduct||$('bf-save').disabled||!e.currentTarget.checkValidity())return;
 const price=Number($('bf-price').value),pct=Number($('bf-discount').value),p=bfProduct;
 if(!Number.isSafeInteger(price)||price<=0||!Number.isInteger(pct)||pct<0||pct>99)return;
 if(!confirm('¿Guardar '+pct+'% de descuento para '+p.nombre+' con precio original '+formatCOP(price)+'?'))return;
 const btn=$('bf-save');btn.disabled=true;btn.textContent='Guardando…';
 try{await verifyAdmin();const {data,error}=await supabaseClient.from('productos').update({precio_detal:price,black_friday_pct:pct}).eq('id',p.id).select(bfFields).single();
 if(error||!data)throw error||Error('Cambio no confirmado');
 bfProduct=data;bfStatus(pct?'Oferta guardada correctamente.':'Oferta retirada correctamente.');bfPage=0;await bfLoad();
 }catch(e){bfStatus('No se pudo guardar: '+e.message,true);}finally{btn.disabled=false;btn.textContent='Guardar oferta';}
};
function options(inputId, items, select){const input=$(inputId);if(!input)return;let panel=$('reuse-'+inputId);if(!panel){panel=document.createElement('details');panel.id='reuse-'+inputId;panel.className='creation-reuse';input.closest('div').after(panel);}panel.replaceChildren();panel.append(text('summary','Buscar opciones guardadas'));const search=document.createElement('input');search.type='search';search.placeholder='Buscar…';const list=document.createElement('div');list.className='creation-option-list';panel.append(search,list);const render=()=>{list.replaceChildren();const term=search.value.toLowerCase();for(const v of items.filter(v=>v.nombre.toLowerCase().includes(term)).slice(0,100))list.append(button(v.nombre+(v.incremento!=null?' · '+formatCOP(v.incremento):''),()=>{select(v);panel.open=false;}));};search.oninput=render;render();}
window.creationRefreshOptions=()=>{for(const field of ['mundo','categoria','subcategoria','temporada']){const vals=[...new Set(allProducts.flatMap(p=>productMultiValuesFromRow(p,field)))];options('prod-'+field+'-input',vals.map(nombre=>({nombre})),v=>{$('prod-'+field+'-input').value=v.nombre;addProductMultiValue(field);});}for(const [field,id] of [['tallas','talla'],['colores','color'],['accesorios','accesorio']]){const map=new Map();for(const p of allProducts)for(const raw of arr(p[field])){const v=norm(raw);if(v?.nombre&&!map.has(v.nombre.toLowerCase()))map.set(v.nombre.toLowerCase(),v);}options('inp-'+id+'-nombre',[...map.values()],v=>{const target=field==='tallas'?tempTallas:field==='colores'?tempColores:tempAccesorios;if(!target.some(x=>String(x.nombre||x).toLowerCase()===v.nombre.toLowerCase()))target.push({...v,__cupissaProductOnly:true});if(field==='tallas')renderTallasTags();else if(field==='colores')renderColoresTags();else renderAccesoriosTags();});}};
})();
