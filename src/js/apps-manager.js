/**
 * apps-manager.js
 * Script para gestionar aplicaciones, descripciones y aplicaciones obligatorias
 */

// Variables globales
let allApps = [];
let allDescriptions = [];
let availableApps = [];
let requiredApps = [];
let categories = new Set();
let requiredAppsLoaded = false;
let descriptionsLoaded = false;
let appModal = null;
let descriptionModal = null;
let currentEditingApp = null;
let currentEditingDescription = null;
let iconService = null;
let availableProApps = [];
let proApps = [];
let proAppsLoaded = false;
let availableFreeApps = [];
let freeApps = [];
let freeAppsLoaded = false;
let availableEliteApps = [];
let eliteApps = [];
let eliteAppsLoaded = false;

// Constantes
const DEFAULT_ICON_URL = 'img/default_app.png';

/**
 * Inicializa el gestor de aplicaciones
 */
async function initializeAppsManager() {
    try {
        showLoading('Inicializando gestor de aplicaciones...');
        
        // Inicializar modales
        appModal = new bootstrap.Modal(document.getElementById('appModal'));
        descriptionModal = new bootstrap.Modal(document.getElementById('descriptionModal'));
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            console.error('El cliente de SharePoint Graph no está inicializado');
            hideLoading();
            showError('Error: El cliente de SharePoint Graph no está inicializado');
            return;
        }
        
        // Inicializar servicio de iconos
        iconService = new IconService(spGraph);
        console.log('Servicio de iconos inicializado');
        
        // Cargar datos iniciales
        await loadApps();
        
        // Actualizar contadores
        updateCounters();
        
        // Configurar eventos de interacción
        setupEventListeners();
        
        hideLoading();
        console.log('Gestor de aplicaciones inicializado correctamente');
    } catch (error) {
        console.error('Error al inicializar el gestor de aplicaciones:', error);
        hideLoading();
        showError('Error al inicializar el gestor de aplicaciones: ' + error.message);
    }
}

/**
 * Configura los eventos de interacción
 */
function setupEventListeners() {
    // Eventos para la lista de aplicaciones disponibles
    const availableAppsList = document.getElementById('availableAppsList');
    if (availableAppsList) {
        availableAppsList.addEventListener('click', function(event) {
            const appItem = event.target.closest('.app-list-item');
            if (appItem) {
                const appId = appItem.dataset.id;
                moveToRequiredApps(appId);
            }
        });
    }
    
    // Eventos para la lista de aplicaciones obligatorias
    const requiredAppsList = document.getElementById('requiredAppsList');
    if (requiredAppsList) {
        requiredAppsList.addEventListener('click', function(event) {
            // Verificar si se hizo clic en el botón o en el ícono dentro del botón
            const removeBtn = event.target.closest('.remove-app-btn');
            if (removeBtn) {
                const appItem = event.target.closest('.app-list-item');
                if (appItem) {
                    const appId = appItem.dataset.id;
                    moveToAvailableApps(appId);
                }
            }
        });
    }
    
    // Eventos para la lista de aplicaciones disponibles para PRO
    const availableProAppsList = document.getElementById('availableProAppsList');
    if (availableProAppsList) {
        availableProAppsList.addEventListener('click', function(event) {
            const appItem = event.target.closest('.app-list-item');
            if (appItem) {
                const appId = appItem.dataset.id;
                moveToProApps(appId);
            }
        });
    }
    
    // Eventos para la lista de aplicaciones PRO
    const proAppsList = document.getElementById('proAppsList');
    if (proAppsList) {
        proAppsList.addEventListener('click', function(event) {
            // Verificar si se hizo clic en el botón o en el ícono dentro del botón
            const removeBtn = event.target.closest('.remove-pro-app-btn');
            if (removeBtn) {
                const appItem = event.target.closest('.app-list-item');
                if (appItem) {
                    const appId = appItem.dataset.id;
                    moveToAvailableProApps(appId);
                }
            }
        });
    }
    
    // Eventos para la lista de aplicaciones disponibles para Gratuita
    const availableFreeAppsList = document.getElementById('availableFreeAppsList');
    if (availableFreeAppsList) {
        availableFreeAppsList.addEventListener('click', function(event) {
            const appItem = event.target.closest('.app-list-item');
            if (appItem) {
                const appId = appItem.dataset.id;
                moveToFreeApps(appId);
            }
        });
    }
    
    // Eventos para la lista de aplicaciones Gratuitas
    const freeAppsList = document.getElementById('freeAppsList');
    if (freeAppsList) {
        freeAppsList.addEventListener('click', function(event) {
            // Verificar si se hizo clic en el botón o en el ícono dentro del botón
            const removeBtn = event.target.closest('.remove-free-app-btn');
            if (removeBtn) {
                const appItem = event.target.closest('.app-list-item');
                if (appItem) {
                    const appId = appItem.dataset.id;
                    moveToAvailableFreeApps(appId);
                }
            }
        });
    }
}

/**
 * Carga las aplicaciones desde SharePoint
 */
async function loadApps() {
    try {
        showLoading('Cargando aplicaciones...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Obtener archivos de la carpeta exe
        const executableFiles = await spGraph.getExeFiles();
        console.log(`Se encontraron ${executableFiles.length} archivos en la carpeta exe`);
        
        // Verificación adicional para asegurar que solo se procesen archivos .exe y .bat
        const validExecutableFiles = executableFiles.filter(file => {
            const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
            return extension === 'exe' || extension === 'bat';
        });
        
        console.log(`Total de archivos ejecutables válidos: ${validExecutableFiles.length}`);
        
        // Mapear los archivos a aplicaciones
        allApps = validExecutableFiles.map(file => ({
            id: file.id,
            name: file.name.substring(0, file.name.lastIndexOf('.')),
            fileName: file.name,
            category: 'General',
            version: file.lastModified ? new Date(file.lastModified).toISOString().split('T')[0].replace(/-/g, '.') : '1.0.0',
            size: file.size || 0,
            lastModified: file.lastModified || new Date().toISOString(),
            description: '',
            downloadUrl: file.downloadUrl,
            webUrl: file.webUrl,
            installationOrder: 0,
            icon: DEFAULT_ICON_URL,
            iconUrl: DEFAULT_ICON_URL
        }));
        
        // Extraer categorías únicas
        categories = new Set();
        categories.add('General');
        
        // Asignar iconos a las aplicaciones
        if (iconService) {
            console.log('Asignando iconos a las aplicaciones...');
            iconService.assignIconsToApps(allApps);
        } else {
            console.warn('Servicio de iconos no inicializado');
        }
        
        // Actualizar la tabla y el filtro de categorías
        updateAppsTable();
        updateCategoryFilter();
        updateCounters();
        
        // Cargar datos de cada suscripción
        await loadDescriptions();
        await loadEliteApps();
        await loadProApps();
        await loadFreeApps();
        await loadRequiredApps();
        
        updateLoadingProgress(100);
        hideLoading();
        
        return allApps;
    } catch (error) {
        console.error('Error al cargar aplicaciones:', error);
        showError(`Error al cargar aplicaciones: ${error.message}`);
        hideLoading();
        return [];
    }
}

/**
 * Actualiza la tabla de aplicaciones
 */
function updateAppsTable() {
    const tableBody = document.getElementById('appsTableBody');
    if (!tableBody) return;
    
    // Limpiar tabla
    tableBody.innerHTML = '';
    
    // Agregar filas
    allApps.forEach((app, index) => {
        const row = document.createElement('tr');
        
        // Formatear tamaño
        const formattedSize = formatFileSize(app.size);
        
        // Formatear fecha
        let formattedDate = '';
        if (app.lastModified) {
            // Convertir a objeto Date si es una cadena
            const lastModifiedDate = typeof app.lastModified === 'string' 
                ? new Date(app.lastModified) 
                : app.lastModified;
            
            // Verificar si es una fecha válida
            if (!isNaN(lastModifiedDate.getTime())) {
                formattedDate = lastModifiedDate.toLocaleDateString();
            } else {
                formattedDate = 'Fecha desconocida';
            }
        } else {
            formattedDate = 'Fecha desconocida';
        }
        
        // Asegurarse de que el icono esté definido
        const iconUrl = app.icon || DEFAULT_ICON_URL;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><img src="${iconUrl}" alt="${app.name}" class="app-icon" data-app-id="${app.id}" onerror="this.src='${DEFAULT_ICON_URL}'"></td>
            <td>${app.name}</td>
            <td><span class="badge bg-secondary">${app.category}</span></td>
            <td>${app.version || ''}</td>
            <td>${formattedSize}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="btn btn-sm btn-primary btn-action edit-app-btn" data-id="${app.id}" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-action delete-app-btn" data-id="${app.id}" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        // Agregar eventos
        const editBtn = row.querySelector('.edit-app-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => editApp(app.id));
        }
        
        const deleteBtn = row.querySelector('.delete-app-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteApp(app.id));
        }
        
        tableBody.appendChild(row);
    });
}

/**
 * Actualiza el selector de categorías
 */
function updateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    // Guardar selección actual
    const currentSelection = categoryFilter.value;
    
    // Limpiar opciones
    categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
    
    // Agregar categorías
    Array.from(categories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    
    // Restaurar selección
    if (currentSelection) {
        categoryFilter.value = currentSelection;
    }
}

/**
 * Actualiza los contadores de estadísticas
 */
function updateCounters() {
    // Total de aplicaciones
    const totalAppsCount = document.getElementById('totalAppsCount');
    if (totalAppsCount) {
        totalAppsCount.textContent = allApps.length;
    }
    
    // Total de aplicaciones obligatorias
    const requiredAppsCount = document.getElementById('requiredAppsCount');
    if (requiredAppsCount) {
        requiredAppsCount.textContent = requiredApps.length;
    }
    
    // Total de categorías
    const categoriesCount = document.getElementById('categoriesCount');
    if (categoriesCount) {
        categoriesCount.textContent = categories.size;
    }
    
    // Contadores de listas
    updateListCounters();
}

/**
 * Actualiza los contadores de las listas de aplicaciones
 */
function updateListCounters() {
    const availableAppsCounter = document.getElementById('availableAppsCounter');
    if (availableAppsCounter) {
        availableAppsCounter.textContent = `${availableApps.length} aplicaciones disponibles`;
    }
    
    const requiredAppsCounter = document.getElementById('requiredAppsCounter');
    if (requiredAppsCounter) {
        requiredAppsCounter.textContent = `${requiredApps.length} aplicaciones obligatorias`;
    }
}

/**
 * Formatea el tamaño de archivo en una unidad legible
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Muestra el estado de carga con un mensaje personalizado
 */
function showLoading(message = 'Cargando...') {
    const loadingState = document.getElementById('loadingState');
    const loadingMessage = document.getElementById('loadingMessage');
    const loadingProgress = document.getElementById('loadingProgress');
    
    if (loadingState && loadingMessage) {
        // Eliminar la clase hidden si existe
        loadingState.classList.remove('hidden');
        // Restablecer estilos para asegurar visibilidad
        loadingState.style.display = 'flex';
        loadingState.style.opacity = '1';
        loadingState.style.backdropFilter = 'blur(5px)';
        loadingState.style.zIndex = '9999';
        
        loadingMessage.textContent = message;
        
        if (loadingProgress) {
            loadingProgress.style.width = '0%';
        }
    } else {
        console.warn('Elementos de carga no encontrados en el DOM:', 
            !loadingState ? 'loadingState' : '', 
            !loadingMessage ? 'loadingMessage' : '');
    }
}

/**
 * Oculta el estado de carga
 */
function hideLoading() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.add('hidden');
    }
}

/**
 * Muestra un mensaje informativo en el loader
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en milisegundos (por defecto 2000ms)
 */
function showInfoMessage(message, duration = 2000) {
    showLoading(message);
    // Añadir clase de estilo para mensaje informativo
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.add('info-message');
    }
    
    setTimeout(() => {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.classList.remove('info-message');
        }
        hideLoading();
    }, duration);
}

/**
 * Actualiza el progreso de carga
 */
function updateLoadingProgress(percentage) {
    const loadingProgress = document.getElementById('loadingProgress');
    if (loadingProgress) {
        loadingProgress.style.width = `${percentage}%`;
    } else {
        console.warn('Elemento loadingProgress no encontrado en el DOM');
    }
}

/**
 * Muestra un mensaje de error
 */
function showError(message) {
    showInfoMessage('❌ ' + message);
}

/**
 * Carga las descripciones de aplicaciones desde SharePoint
 */
async function loadDescriptions() {
    try {
        showLoading('Cargando descripciones de aplicaciones...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            console.warn('El cliente de SharePoint Graph no está inicializado');
            hideLoading();
            return false;
        }
        
        // Obtener el contenido del archivo de descripciones
        let descriptionsContent;
        try {
            descriptionsContent = await spGraph.getFileContent('app_descriptions.json');
            console.log('Archivo de descripciones cargado correctamente');
        } catch (error) {
            console.warn('No se pudo cargar el archivo de descripciones:', error);
            // Si no existe, crear un objeto vacío
            allDescriptions = [];
            updateDescriptionsTable();
            descriptionsLoaded = true;
            updateLoadingProgress(100);
            hideLoading();
            return true;
        }
        
        if (!descriptionsContent) {
            console.warn('El archivo de descripciones está vacío');
            // Si no hay contenido, crear un objeto vacío
            allDescriptions = [];
            updateDescriptionsTable();
            descriptionsLoaded = true;
            updateLoadingProgress(100);
            hideLoading();
            return true;
        }
        
        // Parsear el contenido JSON
        let descriptionsConfig;
        try {
            descriptionsConfig = JSON.parse(descriptionsContent);
            console.log('Configuración de descripciones parseada correctamente');
            console.log(`Total de descripciones en el archivo: ${Object.keys(descriptionsConfig.descriptions || {}).length}`);
        } catch (parseError) {
            console.error('Error al parsear el archivo de descripciones:', parseError);
            allDescriptions = [];
            updateDescriptionsTable();
            descriptionsLoaded = true;
            updateLoadingProgress(100);
            hideLoading();
            return false;
        }
        
        // Procesar las descripciones
        allDescriptions = [];
        if (descriptionsConfig && descriptionsConfig.descriptions) {
            for (const [name, description] of Object.entries(descriptionsConfig.descriptions || {})) {
                if (name && description) {
                    allDescriptions.push({
                        id: `desc-${allDescriptions.length}`,
                        name: name,
                        category: description.category || 'General',
                        description: description.description || ''
                    });
                }
            }
        }
        
        console.log(`Se procesaron ${allDescriptions.length} descripciones válidas`);
        
        // Ordenar por nombre
        allDescriptions.sort((a, b) => a.name.localeCompare(b.name));
        
        // Actualizar la tabla de descripciones
        updateDescriptionsTable();
        
        // Marcar como cargado
        descriptionsLoaded = true;
        
        updateLoadingProgress(100);
        hideLoading();
        return true;
    } catch (error) {
        console.error('Error al cargar descripciones:', error);
        // No mostrar error al usuario para no interrumpir la carga
        console.warn('Continuando sin cargar descripciones');
        descriptionsLoaded = false;
        hideLoading();
        return false;
    }
}

/**
 * Actualiza la tabla de descripciones
 */
function updateDescriptionsTable() {
    const tableBody = document.getElementById('descriptionsTableBody');
    if (!tableBody) return;
    
    // Limpiar tabla
    tableBody.innerHTML = '';
    
    console.log(`Actualizando tabla con ${allDescriptions.length} descripciones...`);
    
    // Agregar filas
    allDescriptions.forEach((desc, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${desc.name}</td>
            <td><span class="badge bg-secondary">${desc.category}</span></td>
            <td>${desc.description}</td>
            <td>
                <button class="btn btn-sm btn-primary btn-action edit-desc-btn" data-id="${desc.id}" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-action delete-desc-btn" data-id="${desc.id}" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        // Agregar eventos
        const editBtn = row.querySelector('.edit-desc-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => editDescription(desc.id));
        }
        
        const deleteBtn = row.querySelector('.delete-desc-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteDescription(desc.id));
        }
        
        tableBody.appendChild(row);
    });
    
    console.log(`Tabla actualizada con ${tableBody.children.length} filas`);
}

/**
 * Filtra las descripciones según el texto de búsqueda
 */
function filterDescriptions() {
    const searchInput = document.getElementById('descriptionSearchInput');
    if (!searchInput) return;
    
    const searchText = searchInput.value.toLowerCase();
    const tableBody = document.getElementById('descriptionsTableBody');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        const category = row.cells[2].textContent.toLowerCase();
        const description = row.cells[3].textContent.toLowerCase();
        
        if (name.includes(searchText) || category.includes(searchText) || description.includes(searchText)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Muestra el modal para agregar una nueva descripción
 */
function showAddDescriptionModal() {
    // Limpiar formulario
    document.getElementById('descriptionId').value = '';
    document.getElementById('descriptionName').value = '';
    document.getElementById('descriptionCategory').value = 'General';
    document.getElementById('descriptionText').value = '';
    
    // Cambiar título
    document.getElementById('descriptionModalTitle').textContent = 'Agregar Descripción';
    
    // Mostrar modal
    currentEditingDescription = null;
    descriptionModal.show();
}

/**
 * Edita una descripción existente
 */
function editDescription(descId) {
    // Buscar descripción
    const description = allDescriptions.find(d => d.id === descId);
    if (!description) {
        showError('No se encontró la descripción');
        return;
    }
    
    // Llenar formulario
    document.getElementById('descriptionId').value = description.id;
    document.getElementById('descriptionName').value = description.name;
    document.getElementById('descriptionCategory').value = description.category;
    document.getElementById('descriptionText').value = description.description;
    
    // Cambiar título
    document.getElementById('descriptionModalTitle').textContent = 'Editar Descripción';
    
    // Mostrar modal
    currentEditingDescription = description;
    descriptionModal.show();
}

/**
 * Elimina una descripción
 */
function deleteDescription(descId) {
    // Confirmar eliminación
    if (!confirm('¿Estás seguro de que deseas eliminar esta descripción?')) {
        return;
    }
    
    // Buscar índice
    const index = allDescriptions.findIndex(d => d.id === descId);
    if (index === -1) {
        showError('No se encontró la descripción');
        return;
    }
    
    // Eliminar descripción
    allDescriptions.splice(index, 1);
    
    // Actualizar tabla
    updateDescriptionsTable();
}

/**
 * Guarda una descripción (nueva o editada)
 */
function saveDescription() {
    // Obtener datos del formulario
    const descId = document.getElementById('descriptionId').value;
    const name = document.getElementById('descriptionName').value.trim();
    const category = document.getElementById('descriptionCategory').value;
    const description = document.getElementById('descriptionText').value.trim();
    
    // Validar datos
    if (!name) {
        showError('El nombre es obligatorio');
        return;
    }
    
    if (!description) {
        showError('La descripción es obligatoria');
        return;
    }
    
    // Verificar si es una edición o una nueva descripción
    if (currentEditingDescription) {
        // Actualizar descripción existente
        currentEditingDescription.name = name;
        currentEditingDescription.category = category;
        currentEditingDescription.description = description;
    } else {
        // Agregar nueva descripción
        allDescriptions.push({
            id: `desc-${Date.now()}`,
            name: name,
            category: category,
            description: description
        });
    }
    
    // Ordenar por nombre
    allDescriptions.sort((a, b) => a.name.localeCompare(b.name));
    
    // Actualizar tabla
    updateDescriptionsTable();
    
    // Cerrar modal
    descriptionModal.hide();
}

/**
 * Guarda todas las descripciones en SharePoint
 */
async function saveAllDescriptions() {
    try {
        showLoading('Guardando descripciones...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Crear objeto de configuración
        const descriptionsConfig = {
            lastUpdate: new Date().toISOString(),
            descriptions: {}
        };
        
        // Agregar descripciones
        allDescriptions.forEach(desc => {
            descriptionsConfig.descriptions[desc.name] = {
                category: desc.category,
                description: desc.description
            };
        });
        
        // Convertir a JSON
        const descriptionsJson = JSON.stringify(descriptionsConfig, null, 2);
        
        // Subir archivo
        await spGraph.saveFileContent('app_descriptions.json', descriptionsJson);
        
        updateLoadingProgress(100);
        hideLoading();
        
        showInfoMessage('✅ Descripciones guardadas correctamente');
        return true;
    } catch (error) {
        console.error('Error al guardar descripciones:', error);
        showError('Error al guardar descripciones: ' + error.message);
        hideLoading();
        return false;
    }
}

/**
 * Carga las aplicaciones obligatorias desde SharePoint
 */
async function loadRequiredApps() {
    try {
        showLoading('Cargando aplicaciones obligatorias...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            console.warn('El cliente de SharePoint Graph no está inicializado');
            hideLoading();
            return false;
        }
        
        // Obtener el contenido del archivo de configuración de aplicaciones obligatorias
        let requiredAppsContent;
        try {
            requiredAppsContent = await spGraph.getFileContent('required_apps_config.json');
            console.log('Configuración de aplicaciones obligatorias cargada correctamente');
        } catch (error) {
            console.warn('No se encontró el archivo de configuración de aplicaciones obligatorias:', error);
            // Continuar con listas vacías
            requiredAppsContent = JSON.stringify({ requiredApps: [] });
        }
        
        // Parsear la configuración
        let requiredAppsConfig;
        try {
            requiredAppsConfig = JSON.parse(requiredAppsContent || '{"requiredApps":[]}');
        } catch (parseError) {
            console.error('Error al parsear la configuración de aplicaciones obligatorias:', parseError);
            requiredAppsConfig = { requiredApps: [] };
        }
        
        // Limpiar las colecciones
        availableApps = [];
        requiredApps = [];
        
        // Obtener IDs de aplicaciones obligatorias
        const requiredAppIds = Array.isArray(requiredAppsConfig.requiredApps) 
            ? requiredAppsConfig.requiredApps.map(app => typeof app === 'string' ? app : (app.id || app.sharePointId || ''))
            : [];
        
        console.log(`Se encontraron ${requiredAppIds.length} aplicaciones obligatorias en la configuración`);
        
        // Verificar que apps esté definido
        if (!allApps || !Array.isArray(allApps)) {
            console.warn('La lista de aplicaciones no está disponible');
            hideLoading();
            return false;
        }
        
        // Distribuir las aplicaciones entre las dos listas
        allApps.forEach(app => {
            if (!app || !app.id) {
                console.warn('Aplicación sin ID encontrada:', app);
                return;
            }
            
            // Verificar si la aplicación está en la lista de obligatorias
            if (requiredAppIds.includes(app.id)) {
                // Marcar como seleccionada y agregar a obligatorias
                app.isSelected = true;
                requiredApps.push(app);
            } else {
                // Marcar como no seleccionada y agregar a disponibles
                app.isSelected = false;
                availableApps.push(app);
            }
        });
        
        console.log(`Distribuidas ${requiredApps.length} aplicaciones obligatorias y ${availableApps.length} disponibles`);
        
        // Ordenar las listas por nombre
        availableApps.sort((a, b) => a.name.localeCompare(b.name));
        requiredApps.sort((a, b) => a.name.localeCompare(b.name));
        
        // Actualizar listas en la interfaz
        updateAvailableAppsList();
        updateRequiredAppsList();
        
        // Actualizar contadores
        updateListCounters();
        
        // Marcar como cargado
        requiredAppsLoaded = true;
        
        updateLoadingProgress(100);
        hideLoading();
        return true;
    } catch (error) {
        console.error('Error al cargar aplicaciones obligatorias:', error);
        // No mostrar error al usuario para no interrumpir la carga
        console.warn('Continuando sin cargar aplicaciones obligatorias');
        requiredAppsLoaded = false;
        hideLoading();
        return false;
    }
}

/**
 * Actualiza la lista de aplicaciones disponibles
 */
function updateAvailableAppsList() {
    const availableAppsList = document.getElementById('availableAppsList');
    if (!availableAppsList) {
        console.warn('Elemento availableAppsList no encontrado en el DOM');
        return;
    }
    
    // Limpiar lista
    availableAppsList.innerHTML = '';
    
    // Verificar si hay aplicaciones disponibles
    if (!availableApps || !Array.isArray(availableApps) || availableApps.length === 0) {
        console.log('No hay aplicaciones disponibles para mostrar');
        availableAppsList.innerHTML = '<div class="text-center text-muted p-3">No hay aplicaciones disponibles</div>';
        return;
    }
    
    // Agregar aplicaciones
    availableApps.forEach(app => {
        if (!app || !app.id) {
            console.warn('Aplicación inválida encontrada en availableApps:', app);
            return;
        }
        
        const appItem = document.createElement('div');
        appItem.className = 'app-list-item';
        appItem.dataset.id = app.id;
        
        appItem.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${app.icon || DEFAULT_ICON_URL}" alt="${app.name}" class="app-icon me-3">
                <div>
                    <h6 class="mb-0">${app.name}</h6>
                    <small class="text-muted">${app.category || 'General'}</small>
                </div>
            </div>
        `;
        
        availableAppsList.appendChild(appItem);
    });
}

/**
 * Actualiza la lista de aplicaciones obligatorias
 */
function updateRequiredAppsList() {
    const requiredAppsList = document.getElementById('requiredAppsList');
    if (!requiredAppsList) {
        console.warn('Elemento requiredAppsList no encontrado en el DOM');
        return;
    }
    
    // Limpiar lista
    requiredAppsList.innerHTML = '';
    
    // Verificar si hay aplicaciones requeridas
    if (!requiredApps || !Array.isArray(requiredApps) || requiredApps.length === 0) {
        console.log('No hay aplicaciones requeridas para mostrar');
        requiredAppsList.innerHTML = '<div class="text-center text-muted p-3">No hay aplicaciones requeridas</div>';
        return;
    }
    
    // Agregar aplicaciones
    requiredApps.forEach(app => {
        if (!app || !app.id) {
            console.warn('Aplicación inválida encontrada en requiredApps:', app);
            return;
        }
        
        const appItem = document.createElement('div');
        appItem.className = 'app-list-item';
        appItem.dataset.id = app.id;
        
        appItem.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <img src="${app.icon || DEFAULT_ICON_URL}" alt="${app.name}" class="app-icon me-3">
                    <div>
                        <h6 class="mb-0">${app.name}</h6>
                        <small class="text-muted">${app.category || 'General'}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-danger remove-app-btn" title="Quitar de obligatorias">
                    <i class="bi bi-x-circle"></i>
                </button>
            </div>
        `;
        
        requiredAppsList.appendChild(appItem);
    });
}

/**
 * Mueve una aplicación de disponibles a obligatorias
 */
function moveToRequiredApps(appId) {
    // Buscar aplicación
    const appIndex = availableApps.findIndex(app => app.id === appId);
    if (appIndex === -1) return;
    
    // Mover aplicación
    const app = availableApps.splice(appIndex, 1)[0];
    requiredApps.push(app);
    
    // Ordenar por nombre
    requiredApps.sort((a, b) => a.name.localeCompare(b.name));
    
    // Actualizar listas
    updateAvailableAppsList();
    updateRequiredAppsList();
    
    // Actualizar contadores
    updateCounters();
}

/**
 * Mueve una aplicación de obligatorias a disponibles
 */
function moveToAvailableApps(appId) {
    // Buscar aplicación
    const appIndex = requiredApps.findIndex(app => app.id === appId);
    if (appIndex === -1) return;
    
    // Mover aplicación
    const app = requiredApps.splice(appIndex, 1)[0];
    availableApps.push(app);
    
    // Ordenar por nombre
    availableApps.sort((a, b) => a.name.localeCompare(b.name));
    
    // Actualizar listas
    updateAvailableAppsList();
    updateRequiredAppsList();
    
    // Actualizar contadores
    updateCounters();
}

/**
 * Filtra las aplicaciones disponibles según el texto de búsqueda
 */
function filterAvailableApps() {
    const searchInput = document.getElementById('availableAppsSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const availableAppsList = document.getElementById('availableAppsList');
    if (!availableAppsList) return;
    
    const appItems = availableAppsList.querySelectorAll('.app-list-item');
    
    let visibleCount = 0;
    
    appItems.forEach(item => {
        const appName = item.querySelector('h6').textContent.toLowerCase();
        const appCategory = item.querySelector('small').textContent.toLowerCase();
        
        if (appName.includes(searchTerm) || appCategory.includes(searchTerm)) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Actualizar contador
    const availableAppsCounter = document.getElementById('availableAppsCounter');
    if (availableAppsCounter) {
        if (searchTerm) {
            availableAppsCounter.textContent = `${visibleCount} de ${availableApps.length} aplicaciones disponibles`;
        } else {
            availableAppsCounter.textContent = `${availableApps.length} aplicaciones disponibles`;
        }
    }
}

/**
 * Guarda la configuración de aplicaciones obligatorias en SharePoint
 */
async function saveRequiredApps() {
    try {
        showLoading('Guardando aplicaciones obligatorias...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Obtener los IDs de las aplicaciones obligatorias
        const requiredAppIds = requiredApps.map(app => app.id);
        
        // Crear objeto de configuración
        const requiredAppsConfig = {
            lastUpdate: new Date().toISOString(),
            requiredApps: requiredAppIds
        };
        
        updateLoadingProgress(50);
        
        // Convertir a JSON
        const requiredAppsJson = JSON.stringify(requiredAppsConfig, null, 2);
        
        // Subir archivo
        await spGraph.saveFileContent('required_apps_config.json', requiredAppsJson);
        
        updateLoadingProgress(100);
        hideLoading();
        
        showInfoMessage('✅ Aplicaciones obligatorias guardadas correctamente');
        return true;
    } catch (error) {
        console.error('Error al guardar aplicaciones obligatorias:', error);
        showError('Error al guardar aplicaciones obligatorias: ' + error.message);
        hideLoading();
        return false;
    }
}

/**
 * Filtra las aplicaciones según el texto de búsqueda y la categoría
 */
function filterApps() {
    const searchInput = document.getElementById('appSearchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    if (!searchInput || !categoryFilter) return;
    
    const searchText = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    
    const tableBody = document.getElementById('appsTableBody');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const appName = row.cells[2].textContent.toLowerCase();
        const appCategory = row.cells[3].textContent.toLowerCase();
        
        const matchesSearch = appName.includes(searchText);
        const matchesCategory = !category || appCategory.includes(category.toLowerCase());
        
        if (matchesSearch && matchesCategory) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Muestra el modal para agregar una nueva aplicación
 */
function showAddAppModal() {
    // Limpiar formulario
    document.getElementById('appId').value = '';
    document.getElementById('appName').value = '';
    document.getElementById('appFileName').value = '';
    document.getElementById('appCategory').value = 'General';
    document.getElementById('appVersion').value = '';
    document.getElementById('appDescription').value = '';
    document.getElementById('appSize').value = '0';
    document.getElementById('appInstallationOrder').value = '1';
    
    // Cambiar título
    document.getElementById('appModalTitle').textContent = 'Agregar Aplicación';
    
    // Mostrar modal
    currentEditingApp = null;
    appModal.show();
}

/**
 * Edita una aplicación existente
 */
function editApp(appId) {
    // Buscar aplicación
    const app = allApps.find(a => a.id === appId);
    if (!app) {
        showError('No se encontró la aplicación');
        return;
    }
    
    // Llenar formulario
    document.getElementById('appId').value = app.id;
    document.getElementById('appName').value = app.name;
    document.getElementById('appFileName').value = app.fileName;
    document.getElementById('appCategory').value = app.category;
    document.getElementById('appVersion').value = app.version;
    document.getElementById('appDescription').value = app.description;
    document.getElementById('appSize').value = app.size;
    document.getElementById('appInstallationOrder').value = app.installationOrder;
    
    // Cambiar título
    document.getElementById('appModalTitle').textContent = 'Editar Aplicación';
    
    // Mostrar modal
    currentEditingApp = app;
    appModal.show();
}

/**
 * Elimina una aplicación
 */
function deleteApp(appId) {
    // Confirmar eliminación
    if (!confirm('¿Estás seguro de que deseas eliminar esta aplicación?')) {
        return;
    }
    
    // Buscar índice
    const index = allApps.findIndex(a => a.id === appId);
    if (index === -1) {
        showError('No se encontró la aplicación');
        return;
    }
    
    // Eliminar aplicación
    allApps.splice(index, 1);
    
    // Actualizar tabla
    updateAppsTable();
    
    // Actualizar contadores
    updateCounters();
}

/**
 * Guarda una aplicación (nueva o editada)
 */
function saveApp() {
    // Obtener datos del formulario
    const appId = document.getElementById('appId').value;
    const name = document.getElementById('appName').value.trim();
    const fileName = document.getElementById('appFileName').value.trim();
    const category = document.getElementById('appCategory').value;
    const version = document.getElementById('appVersion').value.trim();
    const description = document.getElementById('appDescription').value.trim();
    const size = parseInt(document.getElementById('appSize').value) || 0;
    const installationOrder = parseInt(document.getElementById('appInstallationOrder').value) || 1;
    
    // Validar datos
    if (!name) {
        showError('El nombre es obligatorio');
        return;
    }
    
    if (!fileName) {
        showError('El nombre de archivo es obligatorio');
        return;
    }
    
    // Verificar si es una edición o una nueva aplicación
    if (currentEditingApp) {
        // Actualizar aplicación existente
        currentEditingApp.name = name;
        currentEditingApp.fileName = fileName;
        currentEditingApp.category = category;
        currentEditingApp.version = version;
        currentEditingApp.description = description;
        currentEditingApp.size = size;
        currentEditingApp.installationOrder = installationOrder;
    } else {
        // Agregar nueva aplicación
        allApps.push({
            id: `app-${Date.now()}`,
            name: name,
            fileName: fileName,
            category: category,
            version: version,
            description: description,
            size: size,
            lastModified: new Date(),
            installationOrder: installationOrder,
            icon: DEFAULT_ICON_URL
        });
    }
    
    // Ordenar por nombre
    allApps.sort((a, b) => a.name.localeCompare(b.name));
    
    // Actualizar tabla
    updateAppsTable();
    
    // Actualizar contadores
    updateCounters();
    
    // Cerrar modal
    appModal.hide();
}

/**
 * Actualiza los datos de las aplicaciones
 */
async function refreshData() {
    await loadApps();
    
    if (requiredAppsLoaded) {
        await loadRequiredApps();
    }
    
    if (descriptionsLoaded) {
        await loadDescriptions();
    }
    
    if (eliteAppsLoaded) {
        await loadEliteApps();
    }
    
    if (proAppsLoaded) {
        await loadProApps();
    }
    
    if (freeAppsLoaded) {
        await loadFreeApps();
    }
}

/**
 * Sincroniza todas las configuraciones con SharePoint
 * Replica la lógica de SyncButton_Click en la aplicación de escritorio
 */
async function syncAllConfigurations() {
    try {
        showLoading('Iniciando sincronización completa...');
        updateLoadingProgress(10);

        // Verificar que spGraph esté disponible
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }

        // Paso 1: Cargar descripciones primero
        showLoading('Cargando diccionario de descripciones...');
        updateLoadingProgress(20);
        await loadDescriptions();
        
        if (!allDescriptions || allDescriptions.length === 0) {
            throw new Error('No se pudo cargar el diccionario de descripciones');
        }

        // Paso 2: Cargar todas las aplicaciones
        showLoading('Cargando aplicaciones...');
        updateLoadingProgress(40);

        // Crear mapa de descripciones para búsqueda eficiente
        const descriptionsMap = {};
        allDescriptions.forEach(desc => {
            descriptionsMap[desc.name.toLowerCase()] = {
                description: desc.description,
                category: desc.category
            };
        });

        console.log(`Diccionario de descripciones cargado: ${Object.keys(descriptionsMap).length} entradas`);

        // Paso 3: Asignar descripciones a las aplicaciones ELITE
        showLoading('Asignando descripciones a ELITE...');
        updateLoadingProgress(60);

        // Asignar orden de instalación incremental
        allApps.sort((a, b) => a.name.localeCompare(b.name));
        allApps.forEach((app, index) => {
            app.installationOrder = index + 1;
        });

        const eliteConfig = {
            lastUpdate: new Date().toISOString(),
            applications: allApps.map(app => {
                // Normalizar el nombre de la aplicación
                let baseName = app.name
                    .replace(/\([^)]*\)/g, '') // Remover contenido entre paréntesis
                    .replace(/\d+(\.\d+)*/, '') // Remover números de versión
                    .replace(/\s+/g, ' ') // Normalizar espacios
                    .trim();

                // Buscar coincidencia exacta
                let description = descriptionsMap[baseName.toLowerCase()];
                
                if (!description) {
                    // Buscar coincidencia parcial
                    const partialMatch = Object.entries(descriptionsMap).find(([key, value]) => 
                        key.includes(baseName.toLowerCase()) ||
                        baseName.toLowerCase().includes(key)
                    );
                    
                    if (partialMatch) {
                        description = partialMatch[1];
                    }
                }

                // Formatear la descripción para la aplicación de escritorio
                const formattedDescription = `${app.name}\n${description?.description || `Software ${app.name}`}\n\nVersión: ${app.version || 'N/A'}\nTamaño: ${formatFileSize(app.size)}\nÚltima actualización: ${new Date(app.lastModified).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}`;

                return {
                    sharePointId: app.id,
                    name: app.name,
                    fileName: app.fileName,
                    category: description?.category || 'General',
                    description: formattedDescription,
                    version: app.version || 'N/A',
                    size: app.size,
                    lastModified: app.lastModified,
                    installationOrder: app.installationOrder
                };
            })
        };

        // Guardar configuración ELITE
        await spGraph.saveFileContent('elite_apps_config.json', JSON.stringify(eliteConfig, null, 2));
        console.log('Configuración ELITE guardada con éxito');

        // Paso 4: Replicar a PRO (67% de las aplicaciones)
        showLoading('Replicando configuración a PRO...');
        updateLoadingProgress(80);

        const totalApps = eliteConfig.applications.length;
        const proAppsCount = Math.ceil(totalApps * 0.67);

        const proConfig = {
            lastUpdate: new Date().toISOString(),
            applications: eliteConfig.applications.slice(0, proAppsCount)
        };

        await spGraph.saveFileContent('pro_apps_config.json', JSON.stringify(proConfig, null, 2));
        console.log('Configuración PRO guardada con éxito');

        // Paso 5: Replicar a FREE (máximo 30 aplicaciones)
        showLoading('Replicando configuración a FREE...');
        updateLoadingProgress(90);

        const freeAppsCount = Math.min(30, totalApps);

        const freeConfig = {
            lastUpdate: new Date().toISOString(),
            applications: eliteConfig.applications.slice(0, freeAppsCount)
        };

        await spGraph.saveFileContent('free_apps_config.json', JSON.stringify(freeConfig, null, 2));
        console.log('Configuración FREE guardada con éxito');

        // Paso 6: Recargar datos
        showLoading('Actualizando interfaz...');
        updateLoadingProgress(95);
        
        // Recargar las aplicaciones de cada suscripción
        if (eliteAppsLoaded) await loadEliteApps();
        if (proAppsLoaded) await loadProApps();
        if (freeAppsLoaded) await loadFreeApps();

        updateLoadingProgress(100);
        hideLoading();
        
        showInfoMessage('✅ Sincronización completa realizada correctamente');
        return true;
    } catch (error) {
        console.error('Error durante la sincronización completa:', error);
        showError('Error durante la sincronización completa: ' + error.message);
        hideLoading();
        return false;
    }
}

/**
 * Verifica el contenido de los archivos de configuración guardados
 */
async function verifyConfigFiles() {
    try {
        console.log('Verificando archivos de configuración guardados...');
        
        // Verificar elite_apps_config.json
        const eliteConfigContent = await spGraph.getFileContent('elite_apps_config.json');
        if (eliteConfigContent) {
            const eliteConfig = JSON.parse(eliteConfigContent);
            console.log('Contenido LEÍDO de elite_apps_config.json:', {
                lastUpdate: eliteConfig.lastUpdate,
                totalApps: eliteConfig.applications.length,
                primeros5Archivos: eliteConfig.applications.slice(0, 5).map(app => app.fileName),
                extensiones: [...new Set(eliteConfig.applications.map(app => 
                    app.fileName.includes('.') ? app.fileName.split('.').pop().toLowerCase() : ''))]
            });
        } else {
            console.error('No se pudo leer elite_apps_config.json');
        }
        
        // Verificar pro_apps_config.json
        const proConfigContent = await spGraph.getFileContent('pro_apps_config.json');
        if (proConfigContent) {
            const proConfig = JSON.parse(proConfigContent);
            console.log('Contenido LEÍDO de pro_apps_config.json:', {
                lastUpdate: proConfig.lastUpdate,
                totalApps: proConfig.applications.length,
                primeros5Archivos: proConfig.applications.slice(0, 5).map(app => app.fileName),
                extensiones: [...new Set(proConfig.applications.map(app => 
                    app.fileName.includes('.') ? app.fileName.split('.').pop().toLowerCase() : ''))]
            });
        } else {
            console.error('No se pudo leer pro_apps_config.json');
        }
        
        // Verificar free_apps_config.json
        const freeConfigContent = await spGraph.getFileContent('free_apps_config.json');
        if (freeConfigContent) {
            const freeConfig = JSON.parse(freeConfigContent);
            console.log('Contenido LEÍDO de free_apps_config.json:', {
                lastUpdate: freeConfig.lastUpdate,
                totalApps: freeConfig.applications.length,
                primeros5Archivos: freeConfig.applications.slice(0, 5).map(app => app.fileName),
                extensiones: [...new Set(freeConfig.applications.map(app => 
                    app.fileName.includes('.') ? app.fileName.split('.').pop().toLowerCase() : ''))]
            });
        } else {
            console.error('No se pudo leer free_apps_config.json');
        }
        
        return true;
    } catch (error) {
        console.error('Error al verificar archivos de configuración:', error);
        return false;
    }
}

/**
 * Carga las aplicaciones para la suscripción Gratuita desde SharePoint
 */
async function loadFreeApps() {
    try {
        showLoading('Cargando aplicaciones para suscripción Gratuita...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            console.warn('El cliente de SharePoint Graph no está inicializado');
            hideLoading();
            return false;
        }
        
        // Verificar que ELITE esté cargado
        if (!eliteAppsLoaded) {
            console.warn('Las aplicaciones ELITE no están cargadas. Cargando ELITE primero...');
            await loadEliteApps();
        }
        
        console.log('Estado de las aplicaciones ELITE:', {
            totalEliteApps: eliteApps.length,
            primeraApp: eliteApps[0],
            ultimaApp: eliteApps[eliteApps.length - 1]
        });
        
        // Obtener el contenido del archivo de configuración de aplicaciones Gratuitas
        let freeAppsContent;
        try {
            freeAppsContent = await spGraph.getFileContent('free_apps_config.json');
            console.log('Configuración de aplicaciones Gratuitas cargada correctamente');
        } catch (error) {
            console.warn('No se encontró el archivo de configuración de aplicaciones Gratuitas:', error);
            freeAppsContent = JSON.stringify({ applications: [] });
        }
        
        // Parsear la configuración
        let freeAppsConfig;
        try {
            freeAppsConfig = JSON.parse(freeAppsContent || '{"applications":[]}');
            console.log('Configuración FREE parseada:', {
                totalApps: freeAppsConfig.applications?.length || 0
            });
        } catch (parseError) {
            console.error('Error al parsear la configuración de aplicaciones Gratuitas:', parseError);
            freeAppsConfig = { applications: [] };
        }
        
        // Limpiar las colecciones
        availableFreeApps = [];
        freeApps = [];
        
        // Obtener IDs de aplicaciones Gratuitas
        let freeAppIds = [];
        if (freeAppsConfig && freeAppsConfig.applications) {
            if (Array.isArray(freeAppsConfig.applications)) {
                freeAppIds = freeAppsConfig.applications.map(app => app.sharePointId);
            }
        }
        
        console.log(`IDs de aplicaciones gratuitas encontrados: ${freeAppIds.length}`);
        
        // Distribuir las aplicaciones entre las dos listas
        allApps.forEach(app => {
            if (!app || !app.id) {
                console.warn('Aplicación sin ID encontrada:', app);
                return;
            }
            
            // Crear una copia de la aplicación
            const appCopy = { ...app };
            
            // Buscar la aplicación en ELITE para heredar su descripción
            const eliteApp = eliteApps.find(e => e.id === app.id);
            if (eliteApp) {
                console.log(`Heredando descripción de ELITE para ${app.name}:`, {
                    description: eliteApp.description,
                    category: eliteApp.category
                });
                appCopy.description = eliteApp.description;
                appCopy.category = eliteApp.category;
            } else {
                console.warn(`No se encontró aplicación ELITE para ${app.name}`);
            }
            
            // Verificar si la aplicación está en la lista de Gratuitas
            if (freeAppIds.includes(app.id)) {
                appCopy.isSelected = true;
                freeApps.push(appCopy);
            } else {
                appCopy.isSelected = false;
                availableFreeApps.push(appCopy);
            }
        });
        
        console.log('Resumen de aplicaciones gratuitas:', {
            totalFreeApps: freeApps.length,
            totalAvailableFreeApps: availableFreeApps.length,
            primeraFreeApp: freeApps[0],
            ultimaFreeApp: freeApps[freeApps.length - 1]
        });
        
        // Ordenar las listas por nombre
        availableFreeApps.sort((a, b) => a.name.localeCompare(b.name));
        freeApps.sort((a, b) => a.name.localeCompare(b.name));
        
        // Actualizar listas en la interfaz
        updateAvailableFreeAppsList();
        updateFreeAppsList();
        
        // Actualizar contadores
        updateFreeListCounters();
        
        // Marcar como cargado
        freeAppsLoaded = true;
        
        hideLoading();
        return true;
    } catch (error) {
        console.error('Error al cargar aplicaciones Gratuitas:', error);
        hideLoading();
        return false;
    }
}

/**
 * Actualiza la lista de aplicaciones disponibles para Gratuita
 */
function updateAvailableFreeAppsList() {
    const availableFreeAppsList = document.getElementById('availableFreeAppsList');
    if (!availableFreeAppsList) return;
    
    // Limpiar lista
    availableFreeAppsList.innerHTML = '';
    
    // Filtrar aplicaciones según el texto de búsqueda
    const searchInput = document.getElementById('availableFreeAppsSearchInput');
    const searchText = searchInput ? searchInput.value.toLowerCase() : '';
    
    const filteredApps = availableFreeApps.filter(app => 
        app.name.toLowerCase().includes(searchText) ||
        (app.category && app.category.toLowerCase().includes(searchText)) ||
        (app.description && app.description.toLowerCase().includes(searchText))
    );
    
    // Agregar aplicaciones
    filteredApps.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'app-list-item d-flex align-items-center justify-content-between';
        appItem.dataset.id = app.id;
        
        // Asignar icono desde iconService si está disponible
        let iconUrl = app.icon || DEFAULT_ICON_URL;
        if (iconService) {
            const appIcon = iconService.getIconForApp(app);
            if (appIcon) {
                iconUrl = appIcon;
            }
        }
        
        appItem.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${iconUrl}" alt="${app.name}" class="me-2" style="width: 24px; height: 24px; object-fit: contain;">
                <div class="app-name">${app.name}</div>
            </div>
            <button class="btn btn-sm btn-outline-primary add-free-app-btn" title="Agregar a Gratuita">
                <i class="bi bi-plus-circle"></i>
            </button>
        `;
        
        availableFreeAppsList.appendChild(appItem);
        
        // Agregar evento al botón de agregar
        const addButton = appItem.querySelector('.add-free-app-btn');
        if (addButton) {
            addButton.addEventListener('click', () => moveToFreeApps(app.id));
        }
    });
    
    // Actualizar contador
    const availableFreeAppsCounter = document.getElementById('availableFreeAppsCounter');
    if (availableFreeAppsCounter) {
        availableFreeAppsCounter.textContent = `${filteredApps.length} aplicaciones disponibles`;
    }
}

/**
 * Mueve una aplicación de disponibles a Gratuitas
 */
function moveToFreeApps(appId) {
    // Buscar aplicación
    const appIndex = availableApps.findIndex(app => app.id === appId);
    if (appIndex === -1) return;
    
    // Mover aplicación
    const app = availableApps.splice(appIndex, 1)[0];
    freeApps.push(app);
    
    // Ordenar por nombre
    freeApps.sort((a, b) => a.name.localeCompare(b.name));
    
    // Actualizar listas
    updateAvailableFreeAppsList();
    updateFreeAppsList();
    
    // Actualizar contadores
    updateCounters();
}

/**
 * Actualiza la lista de aplicaciones Gratuitas
 */
function updateFreeAppsList() {
    const freeAppsList = document.getElementById('freeAppsList');
    if (!freeAppsList) return;
    
    // Limpiar lista
    freeAppsList.innerHTML = '';
    
    // Agregar aplicaciones
    freeApps.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'app-list-item d-flex align-items-center justify-content-between';
        appItem.dataset.id = app.id;
        
        // Asignar icono desde iconService si está disponible
        let iconUrl = app.icon || DEFAULT_ICON_URL;
        if (iconService) {
            const appIcon = iconService.getIconForApp(app);
            if (appIcon) {
                iconUrl = appIcon;
            }
        }
        
        appItem.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${iconUrl}" alt="${app.name}" class="me-2" style="width: 24px; height: 24px; object-fit: contain;">
                <div class="app-name">${app.name}</div>
            </div>
            <button class="btn btn-sm btn-outline-danger remove-free-app-btn" title="Quitar de Gratuita">
                <i class="bi bi-x-circle"></i>
            </button>
        `;
        
        freeAppsList.appendChild(appItem);
        
        // Agregar evento al botón de quitar
        const removeButton = appItem.querySelector('.remove-free-app-btn');
        if (removeButton) {
            removeButton.addEventListener('click', () => moveToAvailableFreeApps(app.id));
        }
    });
    
    // Actualizar contador
    const freeAppsCounter = document.getElementById('freeAppsCounter');
    if (freeAppsCounter) {
        freeAppsCounter.textContent = `${freeApps.length} aplicaciones Gratuitas`;
    }
}

/**
 * Mueve una aplicación de Gratuitas a disponibles
 */
function moveToAvailableFreeApps(appId) {
    // Buscar aplicación
    const appIndex = freeApps.findIndex(app => app.id === appId);
    if (appIndex === -1) return;
    
    // Mover aplicación
    const app = freeApps.splice(appIndex, 1)[0];
    availableFreeApps.push(app);
    
    // Ordenar por nombre
    availableFreeApps.sort((a, b) => a.name.localeCompare(b.name));
    
    // Actualizar listas
    updateAvailableFreeAppsList();
    updateFreeAppsList();
    
    // Actualizar contadores
    updateCounters();
}

/**
 * Filtra las aplicaciones disponibles para Gratuita
 */
function filterAvailableFreeApps() {
    const searchInput = document.getElementById('availableFreeAppsSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const availableFreeAppsList = document.getElementById('availableFreeAppsList');
    if (!availableFreeAppsList) return;
    
    const appItems = availableFreeAppsList.querySelectorAll('.app-list-item');
    
    let visibleCount = 0;
    
    appItems.forEach(item => {
        const appName = item.querySelector('h6').textContent.toLowerCase();
        const appCategory = item.querySelector('small').textContent.toLowerCase();
        
        if (appName.includes(searchTerm) || appCategory.includes(searchTerm)) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Actualizar contador
    const availableFreeAppsCounter = document.getElementById('availableFreeAppsCounter');
    if (availableFreeAppsCounter) {
        if (searchTerm) {
            availableFreeAppsCounter.textContent = `${visibleCount} de ${availableFreeApps.length} aplicaciones disponibles`;
        } else {
            availableFreeAppsCounter.textContent = `${availableFreeApps.length} aplicaciones disponibles`;
        }
    }
}

/**
 * Guarda la configuración de aplicaciones Gratuitas en SharePoint
 */
async function saveFreeApps() {
    try {
        showLoading('Guardando aplicaciones Gratuitas...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Obtener las aplicaciones Gratuitas completas
        const freeAppsConfig = {
            lastUpdate: new Date().toISOString(),
            applications: freeApps.map(app => ({
                sharePointId: app.id,
                name: app.name,
                fileName: app.fileName,
                category: app.category,
                description: app.description,
                version: app.version,
                size: app.size,
                lastModified: app.lastModified,
                installationOrder: app.installationOrder
            }))
        };
        
        updateLoadingProgress(50);
        
        // Convertir a JSON
        const freeAppsJson = JSON.stringify(freeAppsConfig, null, 2);
        
        // Subir archivo
        await spGraph.saveFileContent('free_apps_config.json', freeAppsJson);
        
        updateLoadingProgress(100);
        hideLoading();
        
        showInfoMessage('✅ Aplicaciones Gratuitas guardadas correctamente');
        return true;
    } catch (error) {
        console.error('Error al guardar aplicaciones Gratuitas:', error);
        showError('Error al guardar aplicaciones Gratuitas: ' + error.message);
        hideLoading();
        return false;
    }
}

/**
 * Carga las aplicaciones para la suscripción PRO desde SharePoint
 */
async function loadProApps() {
    try {
        showLoading('Cargando aplicaciones para suscripción PRO...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            console.warn('El cliente de SharePoint Graph no está inicializado');
            hideLoading();
            return false;
        }
        
        // Verificar que ELITE esté cargado
        if (!eliteAppsLoaded) {
            console.warn('Las aplicaciones ELITE no están cargadas. Cargando ELITE primero...');
            await loadEliteApps();
        }
        
        // Obtener el contenido del archivo de configuración de aplicaciones PRO
        let proAppsContent;
        try {
            proAppsContent = await spGraph.getFileContent('pro_apps_config.json');
            console.log('Configuración de aplicaciones PRO cargada correctamente');
        } catch (error) {
            console.warn('No se encontró el archivo de configuración de aplicaciones PRO:', error);
            proAppsContent = JSON.stringify({ applications: [] });
        }
        
        // Parsear la configuración
        let proAppsConfig;
        try {
            proAppsConfig = JSON.parse(proAppsContent || '{"applications":[]}');
        } catch (parseError) {
            console.error('Error al parsear la configuración de aplicaciones PRO:', parseError);
            proAppsConfig = { applications: [] };
        }
        
        // Limpiar las colecciones
        availableProApps = [];
        proApps = [];
        
        // Obtener IDs de aplicaciones PRO
        let proAppIds = [];
        if (proAppsConfig && proAppsConfig.applications) {
            if (Array.isArray(proAppsConfig.applications)) {
                proAppIds = proAppsConfig.applications.map(app => app.sharePointId);
            }
        }
        
        // Distribuir las aplicaciones entre las dos listas
        allApps.forEach(app => {
            if (!app || !app.id) {
                console.warn('Aplicación sin ID encontrada:', app);
                return;
            }
            
            // Buscar la aplicación en ELITE para heredar su descripción
            const eliteApp = eliteApps.find(e => e.id === app.id);
            if (eliteApp) {
                app.description = eliteApp.description;
                app.category = eliteApp.category;
            }
            
            // Verificar si la aplicación está en la lista de PRO
            if (proAppIds.includes(app.id)) {
                app.isSelected = true;
                proApps.push(app);
            } else {
                app.isSelected = false;
                availableProApps.push(app);
            }
        });
        
        // Ordenar las listas por nombre
        availableProApps.sort((a, b) => a.name.localeCompare(b.name));
        proApps.sort((a, b) => a.name.localeCompare(b.name));
        
        // Actualizar listas en la interfaz
        updateAvailableProAppsList();
        updateProAppsList();
        
        // Actualizar contadores
        updateProListCounters();
        
        // Marcar como cargado
        proAppsLoaded = true;
        
        hideLoading();
        return true;
    } catch (error) {
        console.error('Error al cargar aplicaciones PRO:', error);
        hideLoading();
        return false;
    }
}

/**
 * Actualiza la lista de aplicaciones disponibles para PRO
 */
function updateAvailableProAppsList() {
    const availableProAppsList = document.getElementById('availableProAppsList');
    if (!availableProAppsList) return;
    
    // Limpiar lista
    availableProAppsList.innerHTML = '';
    
    // Filtrar aplicaciones según el texto de búsqueda
    const searchInput = document.getElementById('availableProAppsSearchInput');
    const searchText = searchInput ? searchInput.value.toLowerCase() : '';
    
    const filteredApps = availableProApps.filter(app => 
        app.name.toLowerCase().includes(searchText) ||
        (app.category && app.category.toLowerCase().includes(searchText)) ||
        (app.description && app.description.toLowerCase().includes(searchText))
    );
    
    // Agregar aplicaciones
    filteredApps.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'app-list-item d-flex align-items-center justify-content-between';
        appItem.dataset.id = app.id;
        
        // Asignar icono desde iconService si está disponible
        let iconUrl = app.icon || DEFAULT_ICON_URL;
        if (iconService) {
            const appIcon = iconService.getIconForApp(app);
            if (appIcon) {
                iconUrl = appIcon;
            }
        }
        
        appItem.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${iconUrl}" alt="${app.name}" class="me-2" style="width: 24px; height: 24px; object-fit: contain;">
                <div class="app-name">${app.name}</div>
            </div>
            <button class="btn btn-sm btn-outline-primary add-pro-app-btn" title="Agregar a PRO">
                <i class="bi bi-plus-circle"></i>
            </button>
        `;
        
        availableProAppsList.appendChild(appItem);
        
        // Agregar evento al botón de agregar
        const addButton = appItem.querySelector('.add-pro-app-btn');
        if (addButton) {
            addButton.addEventListener('click', () => moveToProApps(app.id));
        }
    });
    
    // Actualizar contador
    const availableProAppsCounter = document.getElementById('availableProAppsCounter');
    if (availableProAppsCounter) {
        availableProAppsCounter.textContent = `${filteredApps.length} aplicaciones disponibles`;
    }
}

/**
 * Actualiza la lista de aplicaciones PRO
 */
function updateProAppsList() {
    const proAppsList = document.getElementById('proAppsList');
    if (!proAppsList) return;
    
    // Limpiar lista
    proAppsList.innerHTML = '';
    
    // Agregar aplicaciones
    proApps.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'app-list-item d-flex align-items-center justify-content-between';
        appItem.dataset.id = app.id;
        
        // Asignar icono desde iconService si está disponible
        let iconUrl = app.icon || DEFAULT_ICON_URL;
        if (iconService) {
            const appIcon = iconService.getIconForApp(app);
            if (appIcon) {
                iconUrl = appIcon;
            }
        }
        
        appItem.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${iconUrl}" alt="${app.name}" class="me-2" style="width: 24px; height: 24px; object-fit: contain;">
                <div class="app-name">${app.name}</div>
            </div>
            <button class="btn btn-sm btn-outline-danger remove-pro-app-btn" title="Quitar de PRO">
                <i class="bi bi-x-circle"></i>
            </button>
        `;
        
        proAppsList.appendChild(appItem);
        
        // Agregar evento al botón de quitar
        const removeButton = appItem.querySelector('.remove-pro-app-btn');
        if (removeButton) {
            removeButton.addEventListener('click', () => moveToAvailableProApps(app.id));
        }
    });
    
    // Actualizar contador
    updateProListCounters();
}

/**
 * Actualiza los contadores de la lista PRO
 */
function updateProListCounters() {
    const availableProAppsCounter = document.getElementById('availableProAppsCounter');
    if (availableProAppsCounter) {
        availableProAppsCounter.textContent = `${availableProApps.length} aplicaciones disponibles`;
    }
    
    const proAppsCounter = document.getElementById('proAppsCounter');
    if (proAppsCounter) {
        proAppsCounter.textContent = `${proApps.length} aplicaciones para PRO`;
    }
}

/**
 * Mueve una aplicación de disponibles a PRO
 */
function moveToProApps(appId) {
    // Buscar aplicación
    const appIndex = availableProApps.findIndex(app => app.id === appId);
    if (appIndex === -1) return;
    
    // Mover aplicación
    const app = availableProApps.splice(appIndex, 1)[0];
    proApps.push(app);
    
    // Ordenar por nombre
    proApps.sort((a, b) => a.name.localeCompare(b.name));
    
    // Actualizar listas
    updateAvailableProAppsList();
    updateProAppsList();
    
    // Actualizar contadores
    updateProListCounters();
}

/**
 * Mueve una aplicación de PRO a disponibles
 */
function moveToAvailableProApps(appId) {
    // Buscar aplicación
    const appIndex = proApps.findIndex(app => app.id === appId);
    if (appIndex === -1) return;
    
    // Mover aplicación
    const app = proApps.splice(appIndex, 1)[0];
    availableProApps.push(app);
    
    // Ordenar por nombre
    availableProApps.sort((a, b) => a.name.localeCompare(b.name));
    
    // Actualizar listas
    updateAvailableProAppsList();
    updateProAppsList();
    
    // Actualizar contadores
    updateProListCounters();
}

/**
 * Filtra las aplicaciones disponibles para PRO
 */
function filterAvailableProApps() {
    const searchInput = document.getElementById('availableProAppsSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const availableProAppsList = document.getElementById('availableProAppsList');
    if (!availableProAppsList) return;
    
    const appItems = availableProAppsList.querySelectorAll('.app-list-item');
    
    let visibleCount = 0;
    
    appItems.forEach(item => {
        const appName = item.querySelector('h6').textContent.toLowerCase();
        const appCategory = item.querySelector('small').textContent.toLowerCase();
        
        if (appName.includes(searchTerm) || appCategory.includes(searchTerm)) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Actualizar contador
    const availableProAppsCounter = document.getElementById('availableProAppsCounter');
    if (availableProAppsCounter) {
        if (searchTerm) {
            availableProAppsCounter.textContent = `${visibleCount} de ${availableProApps.length} aplicaciones disponibles`;
        } else {
            availableProAppsCounter.textContent = `${availableProApps.length} aplicaciones disponibles`;
        }
    }
}

/**
 * Guarda la configuración de aplicaciones PRO en SharePoint
 */
async function saveProApps() {
    try {
        showLoading('Guardando aplicaciones PRO...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Obtener las aplicaciones PRO completas
        const proAppsConfig = {
            lastUpdate: new Date().toISOString(),
            applications: proApps.map(app => ({
                sharePointId: app.id,
                name: app.name,
                fileName: app.fileName,
                category: app.category,
                description: app.description,
                version: app.version,
                size: app.size,
                lastModified: app.lastModified,
                installationOrder: app.installationOrder
            }))
        };
        
        updateLoadingProgress(50);
        
        // Convertir a JSON
        const proAppsJson = JSON.stringify(proAppsConfig, null, 2);
        
        // Subir archivo
        await spGraph.saveFileContent('pro_apps_config.json', proAppsJson);
        
        updateLoadingProgress(100);
        hideLoading();
        
        showInfoMessage('✅ Aplicaciones PRO guardadas correctamente');
        return true;
    } catch (error) {
        console.error('Error al guardar aplicaciones PRO:', error);
        showError('Error al guardar aplicaciones PRO: ' + error.message);
        hideLoading();
        return false;
    }
}

/**
 * Carga las aplicaciones para la suscripción ELITE desde SharePoint
 */
async function loadEliteApps() {
    try {
        showLoading('Cargando aplicaciones para suscripción ELITE...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            console.warn('El cliente de SharePoint Graph no está inicializado');
            hideLoading();
            return false;
        }
        
        // Obtener el contenido del archivo de configuración de aplicaciones ELITE
        let eliteAppsContent;
        try {
            eliteAppsContent = await spGraph.getFileContent('elite_apps_config.json');
            console.log('Configuración de aplicaciones ELITE cargada correctamente');
        } catch (error) {
            console.warn('No se encontró el archivo de configuración de aplicaciones ELITE:', error);
            eliteAppsContent = JSON.stringify({ applications: [] });
        }
        
        // Parsear la configuración
        let eliteAppsConfig;
        try {
            eliteAppsConfig = JSON.parse(eliteAppsContent || '{"applications":[]}');
        } catch (parseError) {
            console.error('Error al parsear la configuración de aplicaciones ELITE:', parseError);
            eliteAppsConfig = { applications: [] };
        }
        
        // Mapear las aplicaciones ELITE
        eliteApps = eliteAppsConfig.applications.map(app => ({
            id: app.sharePointId,
            name: app.name,
            fileName: app.fileName,
            category: app.category,
            description: app.description,
            version: app.version,
            size: app.size,
            lastModified: app.lastModified,
            installationOrder: app.installationOrder,
            icon: DEFAULT_ICON_URL,
            iconUrl: DEFAULT_ICON_URL
        }));
        
        // Ordenar las listas por nombre
        eliteApps.sort((a, b) => a.name.localeCompare(b.name));
        
        // Actualizar listas en la interfaz
        updateEliteAppsList();
        
        // Actualizar contadores
        updateEliteListCounters();
        
        // Marcar como cargado
        eliteAppsLoaded = true;
        
        hideLoading();
        return true;
    } catch (error) {
        console.error('Error al cargar aplicaciones ELITE:', error);
        hideLoading();
        return false;
    }
}

/**
 * Actualiza la lista de aplicaciones ELITE
 */
function updateEliteAppsList() {
    const eliteAppsList = document.getElementById('eliteAppsList');
    if (!eliteAppsList) return;
    
    // Limpiar lista
    eliteAppsList.innerHTML = '';
    
    // Agregar aplicaciones
    eliteApps.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'app-list-item d-flex align-items-center justify-content-between';
        appItem.dataset.id = app.id;
        
        // Asignar icono desde iconService si está disponible
        let iconUrl = app.icon || DEFAULT_ICON_URL;
        if (iconService) {
            const appIcon = iconService.getIconForApp(app);
            if (appIcon) {
                iconUrl = appIcon;
            }
        }
        
        appItem.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${iconUrl}" alt="${app.name}" class="me-2" style="width: 24px; height: 24px; object-fit: contain;">
                <div class="app-name">${app.name}</div>
            </div>
        `;
        
        eliteAppsList.appendChild(appItem);
    });
    
    // Actualizar contador
    updateEliteListCounters();
}

/**
 * Actualiza los contadores de la lista ELITE
 */
function updateEliteListCounters() {
    const eliteAppsCounter = document.getElementById('eliteAppsCounter');
    if (eliteAppsCounter) {
        eliteAppsCounter.textContent = `${eliteApps.length} aplicaciones para ELITE`;
    }
}

/**
 * Filtra las aplicaciones disponibles para ELITE
 */
function filterAvailableEliteApps() {
    const searchInput = document.getElementById('availableEliteAppsSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const eliteAppsList = document.getElementById('eliteAppsList');
    if (!eliteAppsList) return;
    
    const appItems = eliteAppsList.querySelectorAll('.app-list-item');
    
    let visibleCount = 0;
    
    appItems.forEach(item => {
        const appName = item.querySelector('h6').textContent.toLowerCase();
        const appCategory = item.querySelector('small').textContent.toLowerCase();
        
        if (appName.includes(searchTerm) || appCategory.includes(searchTerm)) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Actualizar contador
    const eliteAppsCounter = document.getElementById('eliteAppsCounter');
    if (eliteAppsCounter) {
        if (searchTerm) {
            eliteAppsCounter.textContent = `${visibleCount} de ${eliteApps.length} aplicaciones para ELITE`;
        } else {
            eliteAppsCounter.textContent = `${eliteApps.length} aplicaciones para ELITE`;
        }
    }
}

/**
 * Guarda la configuración de aplicaciones ELITE en SharePoint
 */
async function saveEliteApps() {
    try {
        showLoading('Guardando aplicaciones ELITE...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }

        // Cargar descripciones si no están cargadas
        if (!descriptionsLoaded) {
            await loadDescriptions();
        }

        // Para ELITE, todas las aplicaciones están disponibles automáticamente
        const appsToSave = allApps.map(app => {
            const appCopy = { ...app };
            
            // Buscar descripción en el diccionario
            if (allDescriptions && allDescriptions.length > 0) {
                // Normalizar el nombre de la aplicación
                let baseName = app.name
                    .replace(/\([^)]*\)/g, '') // Remover contenido entre paréntesis
                    .replace(/\d+(\.\d+)*/, '') // Remover números de versión
                    .replace(/\s+/g, ' ') // Normalizar espacios
                    .trim();

                // Buscar coincidencia exacta
                const exactMatch = allDescriptions.find(d => 
                    d.name.toLowerCase() === baseName.toLowerCase()
                );
                
                if (exactMatch) {
                    appCopy.description = exactMatch.description;
                    appCopy.category = exactMatch.category;
                    console.log(`[ELITE Save] Coincidencia exacta encontrada para ${app.name}`);
                } else {
                    // Buscar coincidencia parcial
                    const partialMatch = allDescriptions.find(d => 
                        d.name.toLowerCase().includes(baseName.toLowerCase()) ||
                        baseName.toLowerCase().includes(d.name.toLowerCase())
                    );
                    
                    if (partialMatch) {
                        appCopy.description = partialMatch.description;
                        appCopy.category = partialMatch.category;
                        console.log(`[ELITE Save] Coincidencia parcial encontrada para ${app.name}`);
                    } else {
                        // Si no hay coincidencia, mantener descripción actual o usar genérica
                        if (!appCopy.description) {
                            appCopy.description = `Software ${app.name}`;
                            appCopy.category = 'General';
                            console.log(`[ELITE Save] No se encontró descripción para ${app.name}, usando genérica`);
                        }
                    }
                }
            }
            
            return {
                sharePointId: appCopy.id,
                name: appCopy.name,
                fileName: appCopy.fileName,
                category: appCopy.category,
                description: appCopy.description,
                version: appCopy.version,
                size: appCopy.size,
                lastModified: appCopy.lastModified ? new Date(appCopy.lastModified).toISOString() : new Date().toISOString(),
                installationOrder: appCopy.installationOrder || 0
            };
        });

        updateLoadingProgress(50);
        
        // Crear objeto de configuración
        const eliteAppsConfig = {
            lastUpdate: new Date().toISOString(),
            applications: appsToSave
        };

        // Log detallado de la configuración
        console.log('Configuración ELITE a guardar:', {
            totalApps: eliteAppsConfig.applications.length,
            firstApp: eliteAppsConfig.applications[0],
            lastApp: eliteAppsConfig.applications[eliteAppsConfig.applications.length - 1],
            appFileNames: eliteAppsConfig.applications.map(app => app.fileName).slice(0, 5)
        });
        
        // Convertir a JSON y guardar
        const eliteAppsJson = JSON.stringify(eliteAppsConfig, null, 2);
        await spGraph.saveFileContent('elite_apps_config.json', eliteAppsJson);
        
        updateLoadingProgress(100);
        hideLoading();
        
        showInfoMessage('✅ Aplicaciones ELITE guardadas correctamente');
        return true;
    } catch (error) {
        console.error('Error al guardar aplicaciones ELITE:', error);
        showError('Error al guardar aplicaciones ELITE: ' + error.message);
        hideLoading();
        return false;
    }
}

// Hacer disponible globalmente la función de inicialización
window.initializeAppsManager = initializeAppsManager;