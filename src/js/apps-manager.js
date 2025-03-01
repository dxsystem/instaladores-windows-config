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

// Constantes
const DEFAULT_ICON_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFEmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDIgNzkuMTYwOTI0LCAyMDE3LzA3LzEzLTAxOjA2OjM5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyMy0wMy0wMVQxMDowNDo0NyswMTowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjMtMDMtMDFUMTA6MDU6MjcrMDE6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjMtMDMtMDFUMTA6MDU6MjcrMDE6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6YjA4NjE1ZjUtY2Q0OS1mMjQx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';

/**
 * Inicializa el gestor de aplicaciones
 */
async function initializeAppsManager() {
    try {
        showLoading('Inicializando gestor de aplicaciones...');
        
        // Inicializar modales
        appModal = new bootstrap.Modal(document.getElementById('appModal'));
        descriptionModal = new bootstrap.Modal(document.getElementById('descriptionModal'));
        
        // Cargar datos iniciales
        await loadApps();
        
        // Actualizar contadores
        updateCounters();
        
        // Configurar eventos de interacción
        setupEventListeners();
        
        hideLoading();
    } catch (error) {
        console.error('Error al inicializar el gestor de aplicaciones:', error);
        showError('Error al inicializar el gestor de aplicaciones: ' + error.message);
        hideLoading();
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
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Obtener la configuración ELITE (todas las aplicaciones)
        const eliteConfig = await getEliteConfig();
        
        // Obtener la lista de archivos de la carpeta exe
        const exeFiles = await spGraph.getExeFiles();
        console.log('Archivos encontrados en la carpeta exe:', exeFiles);
        
        updateLoadingProgress(50);
        
        // Si no hay configuración o no hay aplicaciones, crear una configuración inicial
        if (!eliteConfig || !eliteConfig.applications || eliteConfig.applications.length === 0) {
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
            
            // Guardar la configuración inicial
            await syncApps();
        } else {
            // Usar la configuración existente y actualizar con información de los archivos
            console.log('Usando configuración existente y actualizando con información de archivos');
            
            // Procesar las aplicaciones
            allApps = eliteConfig.applications.map((app, index) => {
                // Buscar el archivo correspondiente
                const file = exeFiles.find(f => f.name === app.fileName);
                
                // Extraer categoría
                const category = app.category || 'General';
                categories.add(category);
                
                return {
                    id: app.sharePointId || file?.id || `app-${index}`,
                    name: app.name || '',
                    fileName: app.fileName || '',
                    category: category,
                    description: app.description || '',
                    version: app.version || '',
                    size: app.size || (file?.size || 0),
                    lastModified: app.lastModified ? new Date(app.lastModified) : (file?.lastModified ? new Date(file.lastModified) : new Date()),
                    installationOrder: app.installationOrder || (index + 1),
                    icon: DEFAULT_ICON_URL
                };
            });
            
            // Agregar archivos que no estén en la configuración
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
                
                // Guardar la configuración actualizada
                await syncApps();
            }
        }
        
        // Actualizar la tabla de aplicaciones
        updateAppsTable();
        
        // Actualizar el selector de categorías
        updateCategoryFilter();
        
        updateLoadingProgress(100);
        hideLoading();
        return true;
    } catch (error) {
        console.error('Error al cargar aplicaciones:', error);
        showError('Error al cargar aplicaciones: ' + error.message);
        hideLoading();
        return false;
    }
}

/**
 * Obtiene la configuración ELITE desde SharePoint
 */
async function getEliteConfig() {
    try {
        // Usar el cliente de Graph global
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Obtener el contenido del archivo de configuración ELITE
        const configContent = await spGraph.getFileContent('elite_apps_config.json');
        
        if (!configContent) {
            throw new Error('No se pudo obtener el contenido del archivo de configuración ELITE');
        }
        
        return JSON.parse(configContent);
    } catch (error) {
        console.error('Error al obtener la configuración ELITE:', error);
        throw error;
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
        const formattedDate = app.lastModified.toLocaleDateString();
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><img src="${app.icon}" alt="${app.name}" class="app-icon"></td>
            <td>${app.name}</td>
            <td><span class="badge bg-secondary">${app.category}</span></td>
            <td>${app.version}</td>
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
 * Muestra el estado de carga
 */
function showLoading(message = 'Cargando...') {
    const loadingState = document.getElementById('loadingState');
    const loadingMessage = document.getElementById('loadingMessage');
    const loadingProgress = document.getElementById('loadingProgress');
    
    if (loadingState && loadingMessage) {
        loadingMessage.textContent = message;
        loadingState.style.display = 'flex';
        
        if (loadingProgress) {
            loadingProgress.style.width = '0%';
        }
    }
}

/**
 * Oculta el estado de carga
 */
function hideLoading() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.style.display = 'none';
    }
}

/**
 * Actualiza el progreso de carga
 */
function updateLoadingProgress(percentage) {
    const loadingProgress = document.getElementById('loadingProgress');
    if (loadingProgress) {
        loadingProgress.style.width = `${percentage}%`;
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
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Obtener el contenido del archivo de descripciones
        let descriptionsContent;
        try {
            descriptionsContent = await spGraph.getFileContent('app_descriptions.json');
        } catch (error) {
            // Si no existe, crear un objeto vacío
            allDescriptions = [];
            updateDescriptionsTable();
            updateLoadingProgress(100);
            hideLoading();
            return true;
        }
        
        if (!descriptionsContent) {
            // Si no hay contenido, crear un objeto vacío
            allDescriptions = [];
            updateDescriptionsTable();
            updateLoadingProgress(100);
            hideLoading();
            return true;
        }
        
        const descriptionsConfig = JSON.parse(descriptionsContent);
        
        // Procesar las descripciones
        allDescriptions = [];
        for (const [name, description] of Object.entries(descriptionsConfig.descriptions || {})) {
            allDescriptions.push({
                id: `desc-${allDescriptions.length}`,
                name: name,
                category: description.category || 'General',
                description: description.description || ''
            });
        }
        
        // Ordenar por nombre
        allDescriptions.sort((a, b) => a.name.localeCompare(b.name));
        
        // Actualizar la tabla de descripciones
        updateDescriptionsTable();
        
        updateLoadingProgress(100);
        hideLoading();
        return true;
    } catch (error) {
        console.error('Error al cargar descripciones:', error);
        showError('Error al cargar descripciones: ' + error.message);
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
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Inicializar listas
        availableApps = [...allApps];
        requiredApps = [];
        
        // Obtener el contenido del archivo de configuración de aplicaciones obligatorias
        let requiredAppsContent;
        try {
            requiredAppsContent = await spGraph.getFileContent('required_apps_config.json');
            
            if (requiredAppsContent) {
                const requiredAppsConfig = JSON.parse(requiredAppsContent);
                
                // Procesar las aplicaciones obligatorias
                if (requiredAppsConfig.requiredApps && requiredAppsConfig.requiredApps.length > 0) {
                    // Obtener IDs de aplicaciones obligatorias
                    const requiredAppIds = requiredAppsConfig.requiredApps.map(app => app.id);
                    
                    // Filtrar aplicaciones obligatorias
                    requiredApps = allApps.filter(app => requiredAppIds.includes(app.id));
                    
                    // Filtrar aplicaciones disponibles
                    availableApps = allApps.filter(app => !requiredAppIds.includes(app.id));
                }
            }
        } catch (error) {
            console.warn('No se encontró el archivo de configuración de aplicaciones obligatorias:', error);
            // Continuar con listas vacías
        }
        
        // Actualizar listas
        updateAvailableAppsList();
        updateRequiredAppsList();
        
        // Actualizar contadores
        updateCounters();
        
        updateLoadingProgress(100);
        hideLoading();
        return true;
    } catch (error) {
        console.error('Error al cargar aplicaciones obligatorias:', error);
        showError('Error al cargar aplicaciones obligatorias: ' + error.message);
        hideLoading();
        return false;
    }
}

/**
 * Actualiza la lista de aplicaciones disponibles
 */
function updateAvailableAppsList() {
    const availableAppsList = document.getElementById('availableAppsList');
    if (!availableAppsList) return;
    
    // Limpiar lista
    availableAppsList.innerHTML = '';
    
    // Agregar aplicaciones
    availableApps.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'app-list-item';
        appItem.dataset.id = app.id;
        
        appItem.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${app.icon}" alt="${app.name}" class="app-icon me-3">
                <div>
                    <h6 class="mb-0">${app.name}</h6>
                    <small class="text-muted">${app.category}</small>
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
    if (!requiredAppsList) return;
    
    // Limpiar lista
    requiredAppsList.innerHTML = '';
    
    // Agregar aplicaciones
    requiredApps.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'app-list-item';
        appItem.dataset.id = app.id;
        
        appItem.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <img src="${app.icon}" alt="${app.name}" class="app-icon me-3">
                    <div>
                        <h6 class="mb-0">${app.name}</h6>
                        <small class="text-muted">${app.category}</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-danger remove-app-btn">
                    <i class="bi bi-x-lg"></i>
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
        
        // Crear objeto de configuración
        const requiredAppsConfig = {
            lastUpdate: new Date().toISOString(),
            requiredApps: requiredApps.map(app => ({
                id: app.id,
                name: app.name,
                fileName: app.fileName,
                installationOrder: app.installationOrder
            }))
        };
        
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
 * Sincroniza las aplicaciones con SharePoint
 */
async function syncApps() {
    try {
        showLoading('Sincronizando aplicaciones...');
        updateLoadingProgress(20);
        
        // Verificar que spGraph esté disponible
        if (!spGraph) {
            throw new Error('El cliente de SharePoint Graph no está inicializado');
        }
        
        // Obtener la configuración ELITE
        const eliteConfig = await getEliteConfig();
        if (!eliteConfig) {
            throw new Error('No se pudo obtener la configuración ELITE');
        }
        
        // Actualizar aplicaciones
        eliteConfig.applications = allApps.map(app => ({
            sharePointId: app.id,
            name: app.name,
            fileName: app.fileName,
            category: app.category,
            description: app.description,
            version: app.version,
            size: app.size,
            lastModified: app.lastModified.toISOString(),
            installationOrder: app.installationOrder
        }));
        
        // Actualizar fecha de última actualización
        eliteConfig.lastUpdate = new Date().toISOString();
        
        // Convertir a JSON
        const eliteConfigJson = JSON.stringify(eliteConfig, null, 2);
        
        // Subir archivo
        await spGraph.saveFileContent('elite_apps_config.json', eliteConfigJson);
        
        updateLoadingProgress(100);
        hideLoading();
        
        alert('Aplicaciones sincronizadas correctamente');
        return true;
    } catch (error) {
        console.error('Error al sincronizar aplicaciones:', error);
        showError('Error al sincronizar aplicaciones: ' + error.message);
        hideLoading();
        return false;
    }
} 