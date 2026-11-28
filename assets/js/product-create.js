let allProducts=[];let tempTallas=[],tempColores=[],tempAccesorios=[],tempAccesorioFoto='',tempBase64Photos=[],tempOriginalPhotos=[],pendingImageQueue=[],currentCropper=null;
        var productMultiSelections = {
            mundo: [],
            categoria: [],
            subcategoria: [],
            temporada: []
        };

        function normalizeProductMultiValues(value, legacyValue = '') {
            let values = [];
            if (Array.isArray(value)) {
                values = value;
            } else if (typeof value === 'string' && value.trim()) {
                try {
                    const parsed = JSON.parse(value);
                    values = Array.isArray(parsed) ? parsed : [value];
                } catch (_) {
                    values = [value];
                }
            }
            if (!values.length && legacyValue != null && String(legacyValue).trim()) values = [legacyValue];
            const unique = [];
            values.forEach(item => {
                const clean = String(item ?? '').trim();
                if (clean && !unique.some(existing => existing.toLocaleLowerCase('es-CO') === clean.toLocaleLowerCase('es-CO'))) unique.push(clean);
            });
            return unique;
        }

        function productMultiValuesFromRow(product, field) {
            return normalizeProductMultiValues(product?.[`${field}s`], product?.[field]);
        }

        function setProductMultiValues(field, values) {
            productMultiSelections[field] = normalizeProductMultiValues(values);
            const legacyInput = document.getElementById(`prod-${field}`);
            if (legacyInput) legacyInput.value = productMultiSelections[field][0] || '';
            const input = document.getElementById(`prod-${field}-input`);
            if (input) input.value = '';
            renderProductMultiField(field);
        }

        function renderProductMultiField(field) {
            const container = document.getElementById(`prod-${field}-tags`);
            const values = productMultiSelections[field] || [];
            const legacyInput = document.getElementById(`prod-${field}`);
            if (legacyInput) legacyInput.value = values[0] || '';
            if (!container) return;
            container.replaceChildren();
            values.forEach((value, index) => {
                const tag = document.createElement('span');
                tag.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-800 text-[11px] font-bold';
                const label = document.createElement('span');
                label.textContent = value;
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'w-4 h-4 rounded-full bg-white text-pink-700 hover:bg-pink-100 font-black leading-none';
                remove.textContent = '×';
                remove.setAttribute('aria-label', `Quitar ${value}`);
                remove.addEventListener('click', () => {
                    productMultiSelections[field].splice(index, 1);
                    renderProductMultiField(field);
                });
                tag.append(label, remove);
                container.appendChild(tag);
            });
        }

        function addProductMultiValue(field) {
            if (!Object.prototype.hasOwnProperty.call(productMultiSelections, field)) return;
            const input = document.getElementById(`prod-${field}-input`);
            if (!input) return;
            const raw = input.value.trim();
            if (!raw) return;
            raw.split(/[;\n]+/).map(value => value.trim()).filter(Boolean).forEach(candidate => {
                const value = (field === 'mundo' || field === 'temporada') ? candidate.toLocaleUpperCase('es-CO') : candidate;
                if (!productMultiSelections[field].some(existing => existing.toLocaleLowerCase('es-CO') === value.toLocaleLowerCase('es-CO'))) {
                    productMultiSelections[field].push(value);
                }
            });
            input.value = '';
            renderProductMultiField(field);
        }

        function handleProductMultiInputKey(event, field) {
            if (event.key === 'Enter' || event.key === ';') {
                event.preventDefault();
                addProductMultiValue(field);
            }
        }

        function commitProductMultiInputs() {
            ['mundo', 'categoria', 'subcategoria', 'temporada'].forEach(field => {
                const input = document.getElementById(`prod-${field}-input`);
                if (input && input.value.trim()) addProductMultiValue(field);
            });
        }
        window.commitProductMultiInputs = commitProductMultiInputs;

        function resetProductMultiSelections() {
            ['mundo', 'categoria', 'subcategoria', 'temporada'].forEach(field => setProductMultiValues(field, []));
        }

        function renderSugerenciasCampos() {
            const fields = ['mundo', 'categoria', 'subcategoria', 'temporada'];
            fields.forEach(field => {
                const values = new Map();
                allProducts.forEach(product => productMultiValuesFromRow(product, field).forEach(value => {
                    const key = value.toLocaleLowerCase('es-CO');
                    if (!values.has(key)) values.set(key, value);
                }));
                const datalist = document.getElementById(`prod-${field}-options`);
                if (datalist) {
                    datalist.replaceChildren();
                    [...values.values()].sort((a, b) => a.localeCompare(b, 'es-CO')).forEach(value => {
                        const option = document.createElement('option');
                        option.value = value;
                        datalist.appendChild(option);
                    });
                }
                if (field === 'temporada') {
                    const seasonCount = document.getElementById('temporada-count-label');
                    if (seasonCount) seasonCount.textContent = `${values.size} temporada(s) disponibles. Puedes asignar varias.`;
                }
            });
            fields.forEach(renderProductMultiField);
        }

        // ==================== GESTIÓN INTELIGENTE DE PLANTILLAS DE TALLAS ====================
        function checkTallasTemplateUI() {
            const savedTemplates = JSON.parse(localStorage.getItem('cupissa_saved_tallas_templates') || '[]');
            const section = document.getElementById('saved-tallas-templates-section');
            const container = document.getElementById('saved-tallas-templates-container');
            container.innerHTML = '';

            if (savedTemplates && savedTemplates.length > 0) {
                section.classList.remove('hidden');
                savedTemplates.forEach((template, index) => {
                    if (!template || template.length === 0) return;
                    const primeraTalla = template[0].nombre || '';
                    const count = template.length;
                    
                    const btnWrapper = document.createElement('div');
                    btnWrapper.className = "flex items-center bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-sm hover:border-indigo-400 transition-all";
                    
                    const loadBtn = document.createElement('button');
                    loadBtn.type = 'button';
                    loadBtn.className = "px-3 py-1.5 text-xs font-bold text-indigo-900 flex items-center space-x-1.5 hover:bg-indigo-50";
                    loadBtn.innerHTML = `<i class="fa-solid fa-clone text-[10px] text-indigo-600"></i><span>${primeraTalla}... (${count} tallas)</span>`;
                    loadBtn.onclick = () => loadSpecificTallasTemplate(index);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.type = 'button';
                    deleteBtn.className = "px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-colors border-l border-indigo-100";
                    deleteBtn.title = "Eliminar esta plantilla de tallas";
                    deleteBtn.innerHTML = "×";
                    deleteBtn.onclick = () => deleteSpecificTallasTemplate(index);

                    btnWrapper.appendChild(loadBtn);
                    btnWrapper.appendChild(deleteBtn);
                    container.appendChild(btnWrapper);
                });
            } else {
                section.classList.add('hidden');
            }
        }

        function saveCurrentTallasTemplate() {
            if (!tempTallas || tempTallas.length === 0) return;
            let savedTemplates = JSON.parse(localStorage.getItem('cupissa_saved_tallas_templates') || '[]');
            
            const currentStr = JSON.stringify(tempTallas);
            const exists = savedTemplates.some(t => JSON.stringify(t) === currentStr);
            
            if (!exists) {
                savedTemplates.push([...tempTallas]);
                localStorage.setItem('cupissa_saved_tallas_templates', JSON.stringify(savedTemplates));
            }
        }

        function loadSpecificTallasTemplate(index) {
            const savedTemplates = JSON.parse(localStorage.getItem('cupissa_saved_tallas_templates') || '[]');
            const template = savedTemplates[index];
            if (!template) return;

            template.forEach(item => {
                if (!tempTallas.some(t => t.nombre.toUpperCase() === item.nombre.toUpperCase())) {
                    tempTallas.push({ nombre: item.nombre, incremento: item.incremento || 0 });
                }
            });
            renderTallasTags();
        }

        function deleteSpecificTallasTemplate(index) {
            let savedTemplates = JSON.parse(localStorage.getItem('cupissa_saved_tallas_templates') || '[]');
            savedTemplates.splice(index, 1);
            localStorage.setItem('cupissa_saved_tallas_templates', JSON.stringify(savedTemplates));
            checkTallasTemplateUI();
        }

        function openProductModal() {
            document.querySelector('#modal-product-form form').reset();
            document.getElementById('prod-edit-id').value = '';
            document.getElementById('product-modal-title').innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i><span>Configuración Inteligente de Producto Web</span>`;
            tempTallas = [];
            tempColores = [];
            tempAccesorios = [];
            tempAccesorioFoto = '';
            tempBase64Photos = [];
            tempOriginalPhotos = [];
            pendingImageQueue = [];
            document.getElementById('prod-nombre').value = '';
            document.getElementById('prod-descripcion').value = '';
            document.getElementById('prod-mundo').value = '';
            document.getElementById('prod-categoria').value = '';
            document.getElementById('prod-subcategoria').value = '';
            document.getElementById('prod-temporada').value = '';
            resetProductMultiSelections();
            document.getElementById('prod-precio-detal').value = '0';
            document.getElementById('prod-precio-mayorista').value = '0';
            document.getElementById('prod-cant-min-mayorista').value = '6';
            document.getElementById('prod-porcentaje-anticipo').value = '20';
            document.getElementById('prod-dias-preparacion').value = '3';
            
            document.getElementById('chk-personalizable').checked = false;
            document.getElementById('chk-al-por-mayor').checked = false;
            document.getElementById('chk-venta').checked = true;
            document.getElementById('chk-alquiler').checked = false;
            document.getElementById('chk-credito').checked = false;
            document.getElementById('chk-pago-contraentrega').checked = false;
            document.getElementById('chk-produccion-express').checked = false;
            cupissaSetBlackFriday(0);

            document.getElementById('prod-precio-alquiler').value = '0';
            document.getElementById('prod-valor-deposito').value = '0';
            toggleAlquilerFields();
            checkTallasTemplateUI();
            renderTallasTags();
            renderColoresTags();
            renderAccesoriosTags();
            window.cupissaRememberProductOptionPhotos?.();
            renderAccesorioFotoPreview();
            renderPreviewPhotos();
            renderSugerenciasCampos();
            document.getElementById('inp-accesorio-foto').value = '';
            document.getElementById('prod-files-input').value = '';
            document.getElementById('modal-product-form').classList.remove('hidden');
        }

        function closeProductModal() {
            document.getElementById('modal-product-form').classList.add('hidden');
        }

        function toggleAlquilerFields() {
            const chk = document.getElementById('chk-alquiler').checked;
            const wrap = document.getElementById('wrapper-alquiler-extra');
            if (chk) wrap.classList.remove('hidden');
            else wrap.classList.add('hidden');
        }

        function addTallaToList() {
            const name = document.getElementById('inp-talla-nombre').value.trim();
            const inc = parseFloat(document.getElementById('inp-talla-incremento').value) || 0;
            if (!name) return;
            tempTallas.push({ nombre: name, incremento: inc });
            document.getElementById('inp-talla-nombre').value = '';
            document.getElementById('inp-talla-incremento').value = '';
            renderTallasTags();
        }

        function renderTallasTags() {
            const container = document.getElementById('list-tallas-tags');
            container.innerHTML = '';
            tempTallas.forEach((t, i) => {
                const tag = document.createElement('span');
                tag.className = "bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-xl text-[11px] flex items-center space-x-1.5 shadow-sm";
                tag.innerHTML = `<span>${t.nombre} (+${formatCOP(t.incremento)})</span><button type="button" onclick="tempTallas.splice(${i},1);renderTallasTags()" class="ml-1 text-red-500 hover:text-red-700 font-bold text-sm">×</button>`;
                container.appendChild(tag);
            });
        }

        function addColorToList() {
            const name = document.getElementById('inp-color-nombre').value.trim();
            const inc = parseFloat(document.getElementById('inp-color-incremento').value) || 0;
            if (!name) return;
            tempColores.push({ nombre: name, incremento: inc });
            document.getElementById('inp-color-nombre').value = '';
            document.getElementById('inp-color-incremento').value = '';
            renderColoresTags();
        }

        function renderColoresTags() {
            const container = document.getElementById('list-colores-tags');
            container.innerHTML = '';
            tempColores.forEach((c, i) => {
                const tag = document.createElement('span');
                tag.className = "bg-pink-100 fuchsia-text font-bold px-2 py-1 rounded-xl text-[11px] flex items-center space-x-1";
                tag.innerHTML = `<span>${c.nombre} (+${formatCOP(c.incremento)})</span><button type="button" onclick="tempColores.splice(${i},1);renderColoresTags()" class="ml-1 text-red-500 hover:text-red-700 font-bold">×</button>`;
                container.appendChild(tag);
            });
        }

        function handleAccesorioFotoSelected(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            if (!file.type || !file.type.startsWith('image/')) {
                alert('Selecciona una imagen válida para el accesorio.');
                event.target.value = '';
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('La foto del accesorio no puede superar 10 MB.');
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(loadEvent) {
                const image = new Image();
                image.onload = function() {
                    const maxSide = 1000;
                    const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(image.width * ratio));
                    canvas.height = Math.max(1, Math.round(image.height * ratio));
                    const context = canvas.getContext('2d');
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                    tempAccesorioFoto = canvas.toDataURL('image/jpeg', 0.84);
                    renderAccesorioFotoPreview();
                };
                image.onerror = function() {
                    alert('No fue posible leer la foto seleccionada.');
                    tempAccesorioFoto = '';
                    renderAccesorioFotoPreview();
                };
                image.src = String(loadEvent.target.result || '');
            };
            reader.onerror = function() {
                alert('No fue posible cargar la foto del accesorio.');
            };
            reader.readAsDataURL(file);
        }

        function renderAccesorioFotoPreview() {
            const preview = document.getElementById('accesorio-foto-preview');
            if (!preview) return;
            preview.innerHTML = '';
            if (!tempAccesorioFoto) {
                preview.classList.add('hidden');
                return;
            }
            const image = document.createElement('img');
            image.src = tempAccesorioFoto;
            image.alt = 'Vista previa del accesorio';
            image.className = 'w-16 h-16 object-cover rounded-xl border border-emerald-200';
            preview.appendChild(image);
            preview.classList.remove('hidden');
        }

        function addAccesorioToList() {
            const nameInput = document.getElementById('inp-accesorio-nombre');
            const incrementInput = document.getElementById('inp-accesorio-incremento');
            const name = nameInput.value.trim();
            const incremento = Math.max(0, parseFloat(incrementInput.value) || 0);
            if (!name) {
                alert('Escribe el nombre del accesorio.');
                return;
            }
            if (!tempAccesorioFoto) {
                alert('Selecciona una foto para el accesorio.');
                return;
            }
            const exists = tempAccesorios.some(item => String(item.nombre).trim().toUpperCase() === name.toUpperCase());
            if (exists) {
                alert('Ese accesorio ya está agregado.');
                return;
            }
            tempAccesorios.push({ nombre: name, incremento, foto: tempAccesorioFoto });
            if (typeof window.cupissaSaveAccessoryTemplate === 'function') window.cupissaSaveAccessoryTemplate(tempAccesorios[tempAccesorios.length - 1]);
            nameInput.value = '';
            incrementInput.value = '';
            tempAccesorioFoto = '';
            const fileInput = document.getElementById('inp-accesorio-foto');
            if (fileInput) fileInput.value = '';
            renderAccesorioFotoPreview();
            renderAccesoriosTags();
        }

        function renderAccesoriosTags() {
            const container = document.getElementById('list-accesorios-tags');
            if (!container) return;
            container.innerHTML = '';
            tempAccesorios.forEach((item, index) => {
                const tag = document.createElement('div');
                tag.className = 'bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-2 flex items-center gap-2';

                if (item.foto || item.imagen) {
                    const image = document.createElement('img');
                    image.src = item.foto || item.imagen;
                    image.alt = `Foto de ${item.nombre || 'accesorio'}`;
                    image.className = 'w-12 h-12 object-cover rounded-lg border border-emerald-200 bg-white';
                    tag.appendChild(image);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-12 h-12 rounded-lg bg-white border border-dashed border-emerald-300 flex items-center justify-center text-emerald-500';
                    placeholder.innerHTML = '<i class="fa-solid fa-image"></i>';
                    tag.appendChild(placeholder);
                }

                const details = document.createElement('div');
                details.className = 'min-w-0';
                const title = document.createElement('div');
                title.className = 'font-black text-[11px]';
                title.textContent = String(item.nombre || 'Accesorio');
                const price = document.createElement('div');
                price.className = 'text-[10px] text-emerald-700 font-bold';
                price.textContent = `+${formatCOP(Number(item.incremento || 0))}`;
                details.append(title, price);
                tag.appendChild(details);

                const remove = document.createElement('button');
                remove.type = 'button';
                remove.setAttribute('aria-label', 'Quitar accesorio');
                remove.className = 'ml-1 text-red-500 hover:text-red-700 font-bold text-lg';
                remove.textContent = '×';
                remove.addEventListener('click', () => {
                    tempAccesorios.splice(index, 1);
                    renderAccesoriosTags();
                });
                tag.appendChild(remove);
                window.cupissaAddProductOnlyPriceEditor?.(tag, 'accesorios', index, item.incremento);
                window.cupissaAddReplaceOptionButton?.(tag, 'accesorios', index);
                container.appendChild(tag);
            });
        }

        function handleImageFilesSelected(e) {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            pendingImageQueue = [];
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const originalBase64 = evt.target.result;
                    pendingImageQueue.push({ original: originalBase64 });
                    if (pendingImageQueue.length === 1 && !currentCropper) {
                        startNextCrop();
                    }
                };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        }

        function startNextCrop() {
            if (pendingImageQueue.length === 0) return;
            const item = pendingImageQueue[0];
            
            document.getElementById('cropper-counter').innerText = `Recortando foto (Faltan ${pendingImageQueue.length})`;
            const imgElement = document.getElementById('image-to-crop');
            imgElement.src = item.original;

            document.getElementById('modal-cropper').classList.remove('hidden');

            if (currentCropper) {
                currentCropper.destroy();
            }

            currentCropper = new Cropper(imgElement, {
                aspectRatio: NaN, // Recorte libre: conserva la proporción que el usuario seleccione.
                viewMode: 2,
                autoCropArea: 0.9,
                responsive: true,
            });
        }

        function confirmCropPhoto() {
            if (!currentCropper) return;

            const canvas = currentCropper.getCroppedCanvas({ imageSmoothingQuality: 'high' });

            if (canvas) {
                const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
                tempBase64Photos.push(croppedBase64);
                tempOriginalPhotos.push(pendingImageQueue[0].original);
                renderPreviewPhotos();
            }

            pendingImageQueue.shift();
            closeCropperModal();

            if (pendingImageQueue.length > 0) {
                setTimeout(startNextCrop, 300);
            }
        }

        function skipCurrentPhotoCrop() {
            if (pendingImageQueue.length > 0) {
                tempBase64Photos.push(pendingImageQueue[0].original);
                tempOriginalPhotos.push(pendingImageQueue[0].original);
                renderPreviewPhotos();
                pendingImageQueue.shift();
            }
            closeCropperModal();

            if (pendingImageQueue.length > 0) {
                setTimeout(startNextCrop, 300);
            }
        }

        function closeCropperModal() {
            if (currentCropper) {
                currentCropper.destroy();
                currentCropper = null;
            }
            document.getElementById('modal-cropper').classList.add('hidden');
        }

        function renderPreviewPhotos() {
            const container = document.getElementById('files-preview-container');
            if (!container) return;
            container.innerHTML = '';
            tempBase64Photos.forEach((src, idx) => {
                const wrapper = document.createElement('div');
                wrapper.className = "relative group";
                wrapper.innerHTML = `
                    <img src="${src}" class="w-16 h-16 object-contain rounded-2xl border-2 fuchsia-border shadow-sm bg-slate-50">
                    <button type="button" onclick="removeTempPhoto(${idx})" class="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-red-700">×</button>
                `;
                container.appendChild(wrapper);
            });
            if (typeof window.setProductPublishPhotoCount === 'function') {
                window.setProductPublishPhotoCount(tempBase64Photos.length);
            }
        }

        function removeTempPhoto(index) {
            tempBase64Photos.splice(index, 1);
            tempOriginalPhotos.splice(index, 1);
            renderPreviewPhotos();
        }

        async function uploadBase64ToStorage(dataUrl) {
            if (!dataUrl || !dataUrl.startsWith('data:')) {
                return dataUrl;
            }
            try {
                const blob = dataURLtoBlob(dataUrl);
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
                const filePath = `products/${fileName}`;

                const { data, error } = await supabaseClient.storage
                    .from('productos-cupissa')
                    .upload(filePath, blob, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) throw error;

                const { data: publicData } = supabaseClient.storage
                    .from('productos-cupissa')
                    .getPublicUrl(filePath);

                return publicData.publicUrl;
            } catch (err) {
                console.error("Error al subir imagen a Supabase Storage:", err);
                return dataUrl;
            }
        }

        function dataURLtoBlob(dataurl) {
            let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while(n--){
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], {type:mime});
        }

        async function handleSaveProduct(e) {
            if(document.getElementById("product-step-save")?.disabled || pendingImageQueue.length) return;
            if(window.creationStep!==5)return;
            e.preventDefault();
            e.stopPropagation();
            const productForm = e.currentTarget || e.target || document.querySelector('#modal-product-form form');
            const editId = document.getElementById('prod-edit-id').value;
            try { await verifyAdmin(); } catch(error) { alert(error.message); return; }
            let savedProductCount = 0;
            commitProductMultiInputs();
            const requiredFields = [
                ['prod-nombre', 'Escribe el título del producto.', 2],
                ['prod-mundo', 'Selecciona o escribe el mundo.', 2],
                ['prod-categoria', 'Selecciona o escribe la categoría.', 2],
                ['prod-temporada', 'Selecciona o escribe la temporada.', 2],
                ['prod-precio-detal', 'Indica el precio al detal.', 3],
                ['prod-porcentaje-anticipo', 'Indica el porcentaje de anticipo.', 3]
            ];
            for (const [fieldId, message, step] of requiredFields) {
                const field = document.getElementById(fieldId);
                if (!field || String(field.value ?? '').trim() === '') {
                    window.showProductStep?.(step);
                    alert(message);
                    field?.focus();
                    return;
                }
            }
            const selectedPublishMode = window.CUPISSA_PRODUCT_PUBLISH_MODE;
            const colorPhotoSources = (Array.isArray(tempColores) ? tempColores : []).map(color =>
                typeof color === 'string' ? '' : String(color?.foto || color?.imagen || color?.imagen_url || '').trim()
            );
            const sourcePhotoCount = new Set([
                ...(Array.isArray(tempBase64Photos) ? tempBase64Photos : []),
                ...colorPhotoSources
            ].filter(Boolean)).size;

            if (sourcePhotoCount === 0) {
                window.showProductStep?.(1);
                alert('Agrega al menos una foto del producto o asigna una foto a uno de sus colores.');
                document.getElementById('product-publish-modes')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            // La modalidad es opcional: sin selección se guarda una única publicación con toda la galería.
            
            const submitBtn = productForm?.querySelector('button[type="submit"]');
            if (!submitBtn) {
                alert('No se encontró el botón de guardado del producto. Cierra y vuelve a abrir el formulario.');
                return;
            }
            const originalBtnHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Guardando...</span>`;

            // Deben vivir fuera del bloque try porque también se utilizan en catch.
            // Si Supabase rechaza el INSERT/UPDATE, el respaldo local necesita estos datos.
            let baseProductData = null;
            const defaultImage = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop';

            try {
                if (tempTallas.length > 0) {
                    saveCurrentTallasTemplate();
                }

                // Subidas concurrentes con límite: acelera varias fotografías sin saturar conexiones lentas.
                // Una misma imagen se sube una sola vez, incluso si se usa como portada y original.
                const uploadMemo = new Map();
                const uploadJobs = [];
                let uploadRunning = 0;
                function uploadPhotoFast(source) {
                    if (!source || !source.startsWith('data:')) return Promise.resolve(source);
                    if (uploadMemo.has(source)) return uploadMemo.get(source);
                    const job = new Promise(resolve => {
                        uploadJobs.push({source, resolve});
                        const pump = () => {
                            while (uploadRunning < 3 && uploadJobs.length) {
                                const current = uploadJobs.shift();
                                uploadRunning++;
                                Promise.resolve(uploadBase64ToStorage(current.source))
                                    .then(current.resolve)
                                    .catch(() => current.resolve(current.source))
                                    .finally(() => { uploadRunning--; pump(); });
                            }
                        };
                        pump();
                    });
                    uploadMemo.set(source, job);
                    return job;
                }
                const photosPromise = Promise.all(tempBase64Photos.map(uploadPhotoFast));
                const originalsPromise = Promise.all(tempOriginalPhotos.map(uploadPhotoFast));
                const accessoriesPromise = Promise.all(tempAccesorios.map(async accessory => ({
                    nombre: String(accessory.nombre || '').trim(),
                    incremento: Math.max(0, Number(accessory.incremento || accessory.adicional || 0)),
                    foto: await uploadPhotoFast(accessory.foto || accessory.imagen || '')
                })));
                const colorsPromise = Promise.all(tempColores.map(async color => {
                    const normalizedColor = typeof color === 'string' ? { nombre: color, incremento: 0 } : { ...color };
                    const rawPhoto = normalizedColor.foto || normalizedColor.imagen || normalizedColor.imagen_url || '';
                    const rawOriginal = normalizedColor.foto_original || normalizedColor.original || rawPhoto;
                    const [photo, original] = await Promise.all([uploadPhotoFast(rawPhoto), uploadPhotoFast(rawOriginal)]);
                    return {
                        nombre: String(normalizedColor.nombre || '').trim(),
                        incremento: Math.max(0, Number(normalizedColor.incremento || normalizedColor.adicional || 0)),
                        foto: photo,
                        foto_original: original || photo
                    };
                }));
                const [uploadedPhotos, uploadedOriginals, uploadedAccessories, uploadedColors] =
                    await Promise.all([photosPromise, originalsPromise, accessoriesPromise, colorsPromise]);

                // Las opciones cargadas pueden reutilizarse al crear otros productos.
                uploadedAccessories.forEach((item, index) => { if (!tempAccesorios[index]?.__cupissaProductOnly) window.cupissaSaveAccessoryTemplate?.(item); });
                uploadedColors.forEach((item, index) => { if (!tempColores[index]?.__cupissaProductOnly) window.cupissaSaveColorTemplate?.(item); });

                // La galería principal se compone de las fotos generales y de las fotos asignadas a colores.
                // Cada entrada mantiene su original para la vista ampliada del catálogo.
                const galleryPhotoEntries = [];
                const seenGalleryPhotos = new Set();
                const addGalleryPhoto = (photo, original = photo, selectionKey = photo) => {
                    const finalPhoto = String(photo || '').trim();
                    if (!finalPhoto || seenGalleryPhotos.has(finalPhoto)) return;
                    seenGalleryPhotos.add(finalPhoto);
                    galleryPhotoEntries.push({
                        photo: finalPhoto,
                        original: String(original || finalPhoto).trim() || finalPhoto,
                        selectionKey: String(selectionKey || photo).trim()
                    });
                };
                uploadedPhotos.forEach((photo, index) => {
                    addGalleryPhoto(photo, uploadedOriginals[index] || photo, tempBase64Photos[index] || photo);
                });
                uploadedColors.forEach((color, index) => {
                    if (color.foto) addGalleryPhoto(color.foto, color.foto_original || color.foto, tempColores[index]?.foto || tempColores[index]?.imagen || color.foto);
                });

                baseProductData = {
                    nombre: document.getElementById('prod-nombre').value.trim(),
                    descripcion: document.getElementById('prod-descripcion').value.trim(),
                    mundo: productMultiSelections.mundo[0] || '',
                    mundos: [...productMultiSelections.mundo],
                    categoria: productMultiSelections.categoria[0] || '',
                    categorias: [...productMultiSelections.categoria],
                    subcategoria: productMultiSelections.subcategoria[0] || null,
                    subcategorias: [...productMultiSelections.subcategoria],
                    temporada: productMultiSelections.temporada[0] || '',
                    temporadas: [...productMultiSelections.temporada],
                    precio_detal: parseFloat(document.getElementById('prod-precio-detal').value) || 0,
                    precio_mayorista: parseFloat(document.getElementById('prod-precio-mayorista').value) || 0,
                    cant_min_mayorista: parseInt(document.getElementById('prod-cant-min-mayorista').value) || 6,
                    porcentaje_anticipo: Number(document.getElementById('prod-porcentaje-anticipo').value),
                    dias_preparacion: parseInt(document.getElementById('prod-dias-preparacion').value) || 3,
                    oculto: editId ? undefined : false,
                    personalizable: document.getElementById('chk-personalizable').checked,
                    al_por_mayor: document.getElementById('chk-al-por-mayor').checked,
                    venta: document.getElementById('chk-alquiler').checked ? false : document.getElementById('chk-venta').checked,
                    alquiler: document.getElementById('chk-alquiler').checked,
                    credito: document.getElementById('chk-credito').checked,
                    pago_contraentrega: document.getElementById('chk-pago-contraentrega').checked,
                    produccion_express: document.getElementById('chk-produccion-express').checked,
                    black_friday_pct: Number(document.getElementById('prod-black-friday-pct').value)||0,
                    precio_alquiler: parseFloat(document.getElementById('prod-precio-alquiler').value) || 0,
                    valor_deposito: parseFloat(document.getElementById('prod-valor-deposito').value) || 0,
                    tallas: tempTallas,
                    colores: uploadedColors,
                    accesorios: uploadedAccessories
                };

                const allGalleryPhotos = galleryPhotoEntries.map(entry => entry.photo);
                const allGalleryOriginals = galleryPhotoEntries.map(entry => entry.original);

                {
                    const photosCount = galleryPhotoEntries.length;
                    if(editId){
                        delete baseProductData.oculto;
                        const {data,error}=await supabaseClient.from('productos').update({...baseProductData,fotos:allGalleryPhotos,fotos_originales:allGalleryOriginals}).eq('id',editId).select('id').single();if(error||!data)throw error||Error('Actualización no confirmada');
                    } else if (photosCount > 1 && selectedPublishMode === null) {
                        // Comportamiento predeterminado: una sola publicación con todas las fotos.
                        savedProductCount = 1;
                        const { error } = await supabaseClient.from('productos').insert([{
                            ...baseProductData,
                            fotos: allGalleryPhotos.length > 0 ? allGalleryPhotos : [defaultImage],
                            fotos_originales: allGalleryOriginals.length > 0 ? allGalleryOriginals : [defaultImage]
                        }]);
                        if (error) throw error;
                    } else if (photosCount > 1) {
                        const selectedCoverSources = new Set(Array.isArray(window.CUPISSA_PRODUCT_PUBLISH_COVERS) ? window.CUPISSA_PRODUCT_PUBLISH_COVERS : []);
                        // Lee la selección activa desde el estado de interfaz, que permanece sincronizado con las casillas.
                        const selectedCoverEntries = galleryPhotoEntries.filter(entry => selectedCoverSources.has(entry.selectionKey));
                        const coverEntries = selectedCoverEntries.length ? selectedCoverEntries : galleryPhotoEntries;
                        const productsToInsert = coverEntries.map(coverEntry => {
                            const orderedEntries = [coverEntry, ...galleryPhotoEntries.filter(entry => entry.photo !== coverEntry.photo)];
                            const selectedEntries = selectedPublishMode === 'single' ? [coverEntry] : orderedEntries;
                            return {
                                ...baseProductData,
                                fotos: selectedEntries.map(entry => entry.photo),
                                fotos_originales: selectedEntries.map(entry => entry.original)
                            };
                        });
                        savedProductCount = productsToInsert.length;
                        const { error } = await supabaseClient.from('productos').insert(productsToInsert);
                        if (error) throw error;
                    } else {
                        savedProductCount = 1;
                        const singleData = {
                            ...baseProductData,
                            fotos: allGalleryPhotos.length > 0 ? allGalleryPhotos : [defaultImage],
                            fotos_originales: allGalleryOriginals.length > 0 ? allGalleryOriginals : [defaultImage]
                        };
                        const { error } = await supabaseClient.from('productos').insert([singleData]);
                        if (error) throw error;
                    }
                }

                window.openProductModal();
                if(editId) {submitBtn.disabled=false; window.creationShowCatalog?.();}
                window.scrollTo({top:0,behavior:'smooth'});
                try { localStorage.removeItem('cupissa_pending_product_draft'); } catch (_) {}
                window.cupissaToast?.(editId ? 'Producto actualizado correctamente.' :
                    (savedProductCount > 1 ? `${savedProductCount} productos publicados correctamente.` : 'Producto publicado correctamente.'), 'success');
                void loadClassificationOptions().catch(console.warn);
            } catch (err) {
                console.error('Supabase no pudo guardar el producto:', err);
                // Se conserva una copia pendiente únicamente como respaldo; jamás se mezcla con el catálogo.
                if (baseProductData) {
                    const pendingDraft = {
                        ...baseProductData,
                        id: editId || null,
                        fotos: [...(Array.isArray(tempBase64Photos) ? tempBase64Photos : []), ...colorPhotoSources].filter(Boolean).length
                            ? [...new Set([...(Array.isArray(tempBase64Photos) ? tempBase64Photos : []), ...colorPhotoSources].filter(Boolean))]
                            : [defaultImage],
                        fotos_originales: [...new Set([...(Array.isArray(tempOriginalPhotos) ? tempOriginalPhotos : []), ...colorPhotoSources].filter(Boolean))].length
                            ? [...new Set([...(Array.isArray(tempOriginalPhotos) ? tempOriginalPhotos : []), ...colorPhotoSources].filter(Boolean))]
                            : [defaultImage],
                        pendiente_supabase: true,
                        guardado_local_en: new Date().toISOString()
                    };
                    try {
                        localStorage.setItem('cupissa_pending_product_draft', JSON.stringify(pendingDraft));
                    } catch (storageError) {
                        console.warn('El navegador no pudo conservar el borrador pendiente:', storageError);
                    }
                }
                // Mantener el formulario abierto permite corregir/reintentar sin crear un producto ficticio.
                alert(`Supabase no pudo guardar el producto: ${err?.message || 'Error desconocido'}. El formulario sigue abierto. El borrador local no aparecerá en el catálogo hasta guardarse correctamente en Supabase.`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = document.getElementById('prod-edit-id').value ? originalBtnHTML : 'Crear producto(s)';
            }
        }

        // Exposición explícita para el formulario modular reconstruido por admin-enhancements.js.
        // Evita depender de la resolución implícita de funciones globales desde atributos HTML.
        window.handleSaveProduct = handleSaveProduct;

        function formatCOP(val) {
            return '$ ' + new Intl.NumberFormat('es-CO').format(val || 0);
        }

async function loadClassificationOptions(){
 const rows=[];let offset=0;
 while(true){const {data,error}=await supabaseClient.from('productos').select('mundo,mundos,categoria,categorias,subcategoria,subcategorias,temporada,temporadas,tallas,colores,accesorios').order('id').range(offset,offset+999);if(error)throw error;rows.push(...(data||[]));if((data||[]).length<1000)break;offset+=1000;}
 allProducts=rows;renderSugerenciasCampos();window.creationRefreshOptions?.();
}
async function startModule(){window.openProductModal();void loadClassificationOptions().catch(e=>console.warn('No se pudieron cargar sugerencias:',e.message));}

function cupissaSetBlackFriday(value){
    const pct=Number(value)||0;
    document.getElementById('prod-black-friday-pct').value=String(pct);
    document.getElementById('black-friday-status').textContent=pct>0?'Descuento Black Friday: '+pct+'% · Sin mayorista':'Sin descuento';
    document.getElementById('btn-black-friday').setAttribute('aria-pressed',String(pct>0));
    for(const id of ['chk-al-por-mayor','prod-precio-mayorista','prod-cant-min-mayorista']){
        const field=document.getElementById(id);if(field)field.disabled=pct>0;
    }
}
function cupissaAskBlackFriday(current){
    const result=prompt('Porcentaje de descuento Black Friday (1–99). Escribe 0 para quitar la oferta.',String(current||0));
    if(result===null)return null;
    const value=Number(result.trim());
    if(!result.trim()||!Number.isInteger(value)||value<0||value>99){alert('Ingresa un porcentaje entero entre 0 y 99.');return null;}
    return value;
}
function cupissaChooseBlackFriday(){
    const value=cupissaAskBlackFriday(document.getElementById('prod-black-friday-pct').value);
    if(value!==null)cupissaSetBlackFriday(value);
}
