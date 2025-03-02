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

// Constantes
const DEFAULT_ICON_URL = 'img/default_app.png';

/**
 * Inicializa el gestor de aplicaciones
 */
async function initializeAppsManager() {
    try {
        console.log('Inicializando gestor de aplicaciones...');
        
        // Inicializar modales
        appModal = new bootstrap.Modal(document.getElementById('appModal'));
        descriptionModal = new bootstrap.Modal(document.getElementById('descriptionModal'));
        
        // Inicializar servicio de iconos
        iconService = new IconService(spGraph);
        console.log('Servicio de iconos inicializado');
        
        // Configurar eventos
        setupEventListeners();
        
        // Cargar aplicaciones
        await loadApps();
        
        // Ocultar estado de carga
        hideLoading();
        
        console.log('Gestor de aplicaciones inicializado correctamente');
    } catch (error) {
        console.error('Error al inicializar el gestor de aplicaciones:', error);
        showError(`Error al inicializar: ${error.message}`);
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
            if (event.target.classList.contains('remove-app-btn')) {
                const appItem = event.target.closest('.app-list-item');
                if (appItem) {
                    const appId = appItem.dataset.id;
                    moveToAvailableApps(appId);
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
        
        // Obtener aplicaciones desde SharePoint
        const appsData = await spGraph.getApps();
        console.log('Aplicaciones obtenidas:', appsData);
        
        // Procesar aplicaciones
        allApps = appsData.map(app => ({
            id: app.id,
            name: app.name,
            fileName: app.fileName,
            filePath: app.filePath,
            category: app.category || 'General',
            version: app.version || '',
            description: app.description || '',
            size: app.size || 0,
            lastModified: app.lastModified ? new Date(app.lastModified) : new Date(),
            installationOrder: app.installationOrder || 0,
            icon: DEFAULT_ICON_URL // Icono por defecto
        }));
        
        // Extraer categorías
        categories = new Set(allApps.map(app => app.category).filter(Boolean));
        
        // Actualizar filtro de categorías
        updateCategoryFilter();
        
        // Actualizar tabla de aplicaciones
        updateAppsTable();
        
        // Actualizar contadores
        updateCounters();
        
        // Asignar iconos a las aplicaciones
        if (iconService) {
            console.log('Asignando iconos a las aplicaciones...');
            iconService.assignIconsToApps(allApps);
        } else {
            console.warn('Servicio de iconos no inicializado');
        }
        
        console.log('Aplicaciones cargadas correctamente');
    } catch (error) {
        console.error('Error al cargar aplicaciones:', error);
        showError(`Error al cargar aplicaciones: ${error.message}`);
    } finally {
        hideLoading();
    }
}

/**
 * Actualiza la tabla de aplicaciones
 */
function updateAppsTable() {
    console.log('Actualizando tabla de aplicaciones...');
    
    const tableBody = document.getElementById('appsTableBody');
    const searchInput = document.getElementById('appSearchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    if (!tableBody) {
        console.error('No se encontró el elemento appsTableBody');
        return;
    }
    
    // Limpiar tabla
    tableBody.innerHTML = '';
    
    // Filtrar aplicaciones
    const filteredApps = allApps.filter(app => {
        const matchesSearch = app.name.toLowerCase().includes(searchInput) || 
                             app.fileName.toLowerCase().includes(searchInput) ||
                             (app.description && app.description.toLowerCase().includes(searchInput));
        
        const matchesCategory = !categoryFilter || app.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    console.log(`Mostrando ${filteredApps.length} aplicaciones de ${allApps.length} totales`);
    
    // Generar filas
    filteredApps.forEach((app, index) => {
        const row = document.createElement('tr');
        
        // Formatear fecha
        const formattedDate = app.lastModified.toLocaleDateString() + ' ' + 
                             app.lastModified.toLocaleTimeString();
        
        // Formatear tamaño
        const formattedSize = formatFileSize(app.size);
        
        // Asegurarse de que el icono esté definido
        const iconUrl = app.icon || DEFAULT_ICON_URL;
        console.log(`Icono para ${app.name}: ${iconUrl}`);
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><img src="${iconUrl}" alt="${app.name}" class="app-icon" data-app-id="${app.id}"></td>
            <td>${app.name}</td>
            <td><span class="badge bg-secondary">${app.category}</span></td>
            <td>${app.version}</td>
            <td>${formattedSize}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary btn-action" onclick="editApp(${app.id})" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteApp(${app.id})" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Actualizar contador
    document.getElementById('totalAppsCount').textContent = allApps.length;
    
    console.log('Tabla de aplicaciones actualizada');
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
        // Añadir la clase hidden que contiene los estilos para ocultar completamente
        loadingState.classList.add('hidden');
        // Mantener los estilos inline para compatibilidad
        loadingState.style.display = "none"; 
        loadingState.style.backdropFilter = "none";
        loadingState.style.opacity = "0";
        loadingState.style.zIndex = "-1";
        console.log("Loader ocultado correctamente");
    } else {
        console.warn('Elemento loadingState no encontrado en el DOM');
    }
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
    alert(message);
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
        
        console.log(`Se cargaron ${allDescriptions.length} descripciones`);
        
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
        
        alert('Descripciones guardadas correctamente');
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
        updateCounters();
        
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
            <div class="d-flex align-items-center">
                <img src="${app.icon || DEFAULT_ICON_URL}" alt="${app.name}" class="app-icon me-3">
                <div>
                    <h6 class="mb-0">${app.name}</h6>
                    <small class="text-muted">${app.category || 'General'}</small>
                </div>
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
    
    const searchText = searchInput.value.toLowerCase();
    const availableAppsList = document.getElementById('availableAppsList');
    if (!availableAppsList) return;
    
    const appItems = availableAppsList.querySelectorAll('.app-list-item');
    
    appItems.forEach(item => {
        const appName = item.querySelector('h6').textContent.toLowerCase();
        const appCategory = item.querySelector('small').textContent.toLowerCase();
        
        if (appName.includes(searchText) || appCategory.includes(searchText)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
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
        
        alert('Aplicaciones obligatorias guardadas correctamente');
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
}

/**
 * Sincroniza todas las configuraciones con SharePoint
 * Replica la lógica de SyncButton_Click en la aplicación de escritorio
 */
async function syncAllConfigurations() {
    try {
        showLoading('Iniciando sincronización completa...');
        updateLoadingProgress(0);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Paso 1: Obtener archivos de la carpeta exe
        showLoading('Obteniendo archivos de SharePoint...');
        updateLoadingProgress(20);
        const exeFiles = await spGraph.getExeFiles();
        console.log('Archivos encontrados en la carpeta exe:', exeFiles);
        await new Promise(resolve => setTimeout(resolve, 300)); // Simular delay
        
        // Paso 2: Cargar y actualizar aplicaciones
        showLoading('Procesando aplicaciones...');
        updateLoadingProgress(40);
        
        // Si no hay configuración o no hay aplicaciones, crear una configuración inicial
        if (allApps.length === 0) {
            console.log('No hay configuración de aplicaciones, creando una inicial basada en los archivos encontrados');
            
            // Crear aplicaciones a partir de los archivos encontrados
            allApps = exeFiles.map((file, index) => {
                // Extraer extensión y nombre base
                const fileName = file.name;
                const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
                const baseName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
                
                // Determinar categoría basada en la extensión
                let category = 'General';
                if (extension === 'exe') category = 'Aplicación';
                else if (extension === 'msi') category = 'Instalador';
                else if (extension === 'zip' || extension === 'rar') category = 'Comprimido';
                else if (extension === 'bat' || extension === 'cmd') category = 'Script';
                
                // Agregar categoría al conjunto
                categories.add(category);
                
                return {
                    id: file.id,
                    name: baseName,
                    fileName: fileName,
                    category: category,
                    description: `Software profesional ${baseName}`,
                    version: '',
                    size: file.size || 0,
                    lastModified: file.lastModified ? new Date(file.lastModified) : new Date(),
                    installationOrder: index + 1,
                    icon: DEFAULT_ICON_URL
                };
            });
            
            // Ordenar por nombre
            allApps.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            // Actualizar información de archivos existentes
            allApps.forEach(app => {
                const file = exeFiles.find(f => f.name === app.fileName);
                if (file) {
                    app.size = file.size || app.size;
                    app.lastModified = file.lastModified ? new Date(file.lastModified) : app.lastModified;
                }
            });
            
            // Agregar archivos nuevos
            const configuredFileNames = allApps.map(app => app.fileName);
            const newFiles = exeFiles.filter(file => !configuredFileNames.includes(file.name));
            
            if (newFiles.length > 0) {
                console.log(`Se encontraron ${newFiles.length} archivos nuevos que no están en la configuración`);
                
                // Agregar los nuevos archivos a la lista de aplicaciones
                const newApps = newFiles.map((file, index) => {
                    // Extraer extensión y nombre base
                    const fileName = file.name;
                    const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
                    const baseName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
                    
                    // Determinar categoría basada en la extensión
                    let category = 'General';
                    if (extension === 'exe') category = 'Aplicación';
                    else if (extension === 'msi') category = 'Instalador';
                    else if (extension === 'zip' || extension === 'rar') category = 'Comprimido';
                    else if (extension === 'bat' || extension === 'cmd') category = 'Script';
                    
                    // Agregar categoría al conjunto
                    categories.add(category);
                    
                    return {
                        id: file.id,
                        name: baseName,
                        fileName: fileName,
                        category: category,
                        description: `Software profesional ${baseName}`,
                        version: '',
                        size: file.size || 0,
                        lastModified: file.lastModified ? new Date(file.lastModified) : new Date(),
                        installationOrder: allApps.length + index + 1,
                        icon: DEFAULT_ICON_URL
                    };
                });
                
                // Agregar las nuevas aplicaciones a la lista
                allApps = [...allApps, ...newApps];
                
                // Ordenar por nombre
                allApps.sort((a, b) => a.name.localeCompare(b.name));
            }
        }
        
        // Actualizar la tabla de aplicaciones
        updateAppsTable();
        
        // Actualizar el selector de categorías
        updateCategoryFilter();
        
        await new Promise(resolve => setTimeout(resolve, 300)); // Simular delay
        
        // Paso 3: Cargar y actualizar descripciones
        showLoading('Cargando descripciones de aplicaciones...');
        updateLoadingProgress(60);
        await loadDescriptions();
        await new Promise(resolve => setTimeout(resolve, 300)); // Simular delay
        
        // Paso 4: Sincronizar configuración ELITE
        showLoading('Sincronizando configuración ELITE...');
        updateLoadingProgress(70);
        
        // Crear configuración ELITE
        const eliteConfig = {
            lastUpdate: new Date().toISOString(),
            applications: allApps.map(app => ({
                sharePointId: app.id,
                name: app.name,
                fileName: app.fileName,
                category: app.category,
                description: app.description,
                version: app.version,
                size: app.size,
                lastModified: app.lastModified.toISOString(),
                installationOrder: app.installationOrder
            }))
        };
        
        // Guardar configuración ELITE
        await spGraph.saveFileContent('elite_apps_config.json', JSON.stringify(eliteConfig, null, 2));
        await new Promise(resolve => setTimeout(resolve, 300)); // Simular delay
        
        // Paso 5: Crear configuración PRO (60% de las apps)
        showLoading('Generando configuración PRO...');
        updateLoadingProgress(80);
        const proAppsCount = Math.floor(allApps.length * 0.6);
        // Ordenar aleatoriamente y tomar el 60%
        const proApps = [...allApps]
            .sort(() => 0.5 - Math.random())
            .slice(0, proAppsCount);
        
        // Crear configuración PRO
        const proConfig = {
            lastUpdate: new Date().toISOString(),
            applications: proApps.map(app => ({
                sharePointId: app.id,
                name: app.name,
                fileName: app.fileName,
                category: app.category,
                description: app.description,
                version: app.version,
                size: app.size,
                lastModified: app.lastModified.toISOString(),
                installationOrder: app.installationOrder
            }))
        };
        
        // Guardar configuración PRO
        await spGraph.saveFileContent('pro_apps_config.json', JSON.stringify(proConfig, null, 2));
        await new Promise(resolve => setTimeout(resolve, 300)); // Simular delay
        
        // Paso 6: Crear configuración Gratuita (30 apps aleatorias o menos)
        showLoading('Generando configuración Gratuita...');
        updateLoadingProgress(90);
        const freeAppsCount = Math.min(30, allApps.length);
        // Ordenar aleatoriamente y tomar hasta 30 apps
        const freeApps = [...allApps]
            .sort(() => 0.5 - Math.random())
            .slice(0, freeAppsCount);
        
        // Crear configuración Gratuita
        const freeConfig = {
            lastUpdate: new Date().toISOString(),
            applications: freeApps.map(app => ({
                sharePointId: app.id,
                name: app.name,
                fileName: app.fileName,
                category: app.category,
                description: app.description,
                version: app.version,
                size: app.size,
                lastModified: app.lastModified.toISOString(),
                installationOrder: app.installationOrder
            }))
        };
        
        // Guardar configuración Gratuita
        await spGraph.saveFileContent('free_apps_config.json', JSON.stringify(freeConfig, null, 2));
        
        // Paso 7: Guardar descripciones
        showLoading('Guardando descripciones de aplicaciones...');
        updateLoadingProgress(95);
        await saveAllDescriptions();
        
        // Paso 8: Guardar aplicaciones obligatorias
        if (requiredAppsLoaded) {
            await saveRequiredApps();
        }
        
        updateLoadingProgress(100);
        hideLoading();
        
        alert('Sincronización completa realizada correctamente');
        return true;
    } catch (error) {
        console.error('Error durante la sincronización completa:', error);
        showError('Error durante la sincronización completa: ' + error.message);
        hideLoading();
        return false;
    }
} 
