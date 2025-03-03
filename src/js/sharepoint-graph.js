/**
 * Clase para interactuar con Microsoft Graph API y SharePoint
 */
class SharePointGraph {
    /**
     * Constructor de la clase
     * @param {SharePointAuth} auth - Instancia de SharePointAuth para obtener tokens
     */
    constructor(auth) {
        this.auth = auth;
        this.graphEndpoint = 'https://graph.microsoft.com/v1.0';
        this.siteId = null;
        this.listId = null; // Lo obtendremos dinámicamente
    }

    /**
     * Obtiene un token de acceso para Microsoft Graph
     * @param {boolean} writeAccess - Si se requiere acceso de escritura
     * @returns {Promise<string>} Token de acceso
     */
    async getAccessToken(writeAccess = false) {
        const scopes = writeAccess ? this.auth.graphScopes.write : this.auth.graphScopes.read;
        console.log('SharePointGraph: solicitando token con scopes:', scopes);
        return await this.auth.getAccessToken(scopes);
    }

    /**
     * Obtiene el ID del sitio de SharePoint
     * @returns {Promise<string>} ID del sitio
     */
    async getSiteId() {
        if (this.siteId) {
            return this.siteId;
        }

        try {
            const token = await this.getAccessToken();
            
            // Intentar diferentes formatos de URL para encontrar el sitio
            // Usando la URL correcta proporcionada por el usuario
            const possibleUrls = [
                `${this.graphEndpoint}/sites/ldcigroup.sharepoint.com:/sites/InstaladoresWindowsC/InstaladoresWindowsCOnline:`,
                `${this.graphEndpoint}/sites/ldcigroup.sharepoint.com:/sites/InstaladoresWindowsC:`,
                `${this.graphEndpoint}/sites/ldcigroup.sharepoint.com,2,d68e63f9-ab95-4b9a-9e60-a9e2e8c0a995:/sites/InstaladoresWindowsC/InstaladoresWindowsCOnline:`,
                `${this.graphEndpoint}/sites/ldcigroup.sharepoint.com/sites/InstaladoresWindowsC/InstaladoresWindowsCOnline`,
                `${this.graphEndpoint}/sites/ldcigroup.sharepoint.com/sites/InstaladoresWindowsC`,
                `${this.graphEndpoint}/sites?search=InstaladoresWindowsC`,
                `${this.graphEndpoint}/sites/root`
            ];
            
            console.log('Intentando encontrar el sitio...');
            
            // Probar cada URL hasta encontrar una que funcione
            for (const url of possibleUrls) {
                try {
                    console.log('Intentando obtener sitio con URL:', url);
                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        // Para búsquedas que devuelven múltiples sitios
                        if (data.value && Array.isArray(data.value) && data.value.length > 0) {
                            // Buscar el sitio que contenga 'InstaladoresWindowsC' en su nombre o URL
                            const targetSite = data.value.find(site => 
                                (site.name && site.name.toLowerCase().includes('instaladoreswindowsc')) ||
                                (site.webUrl && site.webUrl.toLowerCase().includes('instaladoreswindowsc'))
                            ) || data.value[0]; // Si no encuentra, usar el primero
                            
                            this.siteId = targetSite.id;
                            console.log('ID del sitio encontrado:', this.siteId);
                            return this.siteId;
                        } else if (data.id) {
                            this.siteId = data.id;
                            console.log('ID del sitio encontrado:', this.siteId);
                            return this.siteId;
                        }
                    }
                } catch (urlError) {
                    console.log(`Error al probar URL ${url}:`, urlError.message);
                }
            }
            
            // Si llegamos aquí, ninguna URL funcionó
            throw new Error('No se pudo encontrar el sitio de SharePoint con ninguna de las URLs probadas');
        } catch (error) {
            console.error('Error al obtener el ID del sitio:', error);
            throw new Error(`Error al obtener el ID del sitio: ${error.message}`);
        }
    }

    /**
     * Obtiene el ID de la lista de usuarios
     * @returns {Promise<string>} ID de la lista
     */
    async getListId() {
        // Usar directamente el ID de lista proporcionado
        this.listId = "3d452065-b0e1-4f9b-932b-36212fac8632";
        console.log('Usando ID de lista de usuarios específico:', this.listId);
        return this.listId;
    }

    /**
     * Obtiene todos los usuarios de SharePoint con paginación
     * @param {Function} progressCallback - Función de callback para reportar progreso (opcional)
     * @returns {Promise<Array>} Lista de usuarios
     */
    async getUsers(progressCallback) {
        try {
            // Inicializar variables
            let page = 1;
            let users = [];
            let totalItems = 0;
            
            // Función para reportar progreso
            const reportProgress = (loaded, total, message) => {
                if (typeof progressCallback === 'function') {
                    progressCallback({
                        loaded,
                        total: total || loaded,
                        page,
                        message
                    });
                }
            };
            
            reportProgress(0, 100, 'Obteniendo token de acceso...');
            const token = await this.getAccessToken();
            
            reportProgress(10, 100, 'Obteniendo ID del sitio...');
            const siteId = await this.getSiteId();
            
            reportProgress(20, 100, 'Obteniendo ID de la lista...');
            const listId = await this.getListId();
            
            let nextLink = `${this.graphEndpoint}/sites/${siteId}/lists/${listId}/items?expand=fields&top=100`;
            
            reportProgress(30, 100, 'Iniciando carga de usuarios...');
            
            // Obtener primera página para determinar el total aproximado
            const initialResponse = await fetch(nextLink, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!initialResponse.ok) {
                throw new Error(`Error al obtener usuarios: ${initialResponse.status} ${initialResponse.statusText}`);
            }
            
            const initialData = await initialResponse.json();
            
            // Estimar el total basado en la primera página
            const itemsPerPage = initialData.value.length;
            if (initialData['@odata.count']) {
                totalItems = initialData['@odata.count'];
            } else {
                // Si no hay count, estimamos basado en si hay nextLink
                totalItems = initialData['@odata.nextLink'] ? itemsPerPage * 10 : itemsPerPage;
            }
            
            // Procesar primera página
            reportProgress(40, 100, `Procesando página 1 de usuarios...`);
            const firstPageUsers = this._processUserItems(initialData.value);
            users = users.concat(firstPageUsers);
            
            reportProgress(50, 100, `Cargados ${users.length} de aproximadamente ${totalItems} usuarios...`);
            
            // Obtener páginas adicionales si existen
            nextLink = initialData['@odata.nextLink'];
            
            let progressIncrement = 40; // Del 50% al 90% para la carga de páginas adicionales
            let pagesEstimate = nextLink ? Math.ceil(totalItems / itemsPerPage) : 1;
            let progressPerPage = pagesEstimate > 1 ? progressIncrement / (pagesEstimate - 1) : 0;
            
            while (nextLink) {
                page++;
                
                let currentProgress = 50 + ((page - 1) * progressPerPage);
                reportProgress(Math.min(90, Math.round(currentProgress)), 100, `Cargando página ${page} de ${pagesEstimate}...`);
                
                const response = await fetch(nextLink, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Error al obtener usuarios (página ${page}): ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                const pageUsers = this._processUserItems(data.value);
                users = users.concat(pageUsers);
                
                // Actualizar total si es necesario
                if (data['@odata.count'] && data['@odata.count'] > totalItems) {
                    totalItems = data['@odata.count'];
                    pagesEstimate = Math.ceil(totalItems / itemsPerPage);
                    progressPerPage = pagesEstimate > 1 ? progressIncrement / (pagesEstimate - 1) : 0;
                }
                
                currentProgress = 50 + (page * progressPerPage);
                reportProgress(Math.min(90, Math.round(currentProgress)), 100, `Cargados ${users.length} de aproximadamente ${totalItems} usuarios...`);
                
                // Actualizar nextLink para la siguiente iteración
                nextLink = data['@odata.nextLink'];
            }
            
            reportProgress(95, 100, `Finalizando procesamiento de ${users.length} usuarios...`);
            
            // Ordenar usuarios por email
            users.sort((a, b) => {
                if (a.email && b.email) {
                    return a.email.localeCompare(b.email);
                }
                return 0;
            });
            
            reportProgress(100, 100, `Carga completada: ${users.length} usuarios`);
            
            return users;
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            throw new Error(`Error al obtener usuarios: ${error.message}`);
        }
    }
    
    /**
     * Procesa los elementos de usuario devueltos por SharePoint
     * @param {Array} items - Elementos a procesar
     * @returns {Array} Usuarios procesados
     * @private
     */
    _processUserItems(items) {
        console.log('Procesando items de usuarios desde SharePoint:', items);
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            console.log('No hay items para procesar');
            return [];
        }
        
        // Mostrar estructura del primer item para depuración
        if (items.length > 0) {
            console.log('Estructura del primer item:', JSON.stringify(items[0], null, 2));
        }
        
        const processedUsers = items.map(item => {
            const fields = item.fields || {};
            
            // Verificar si el campo Email existe y tiene valor
            if (!fields.Email) {
                console.warn('Item sin email:', item);
            } else {
                console.log(`Procesando usuario con email: ${fields.Email}`);
            }
            
            // Convertir fechas si existen
            let startDate = fields.StartDate;
            let endDate = fields.EndDate;
            
            if (startDate) {
                startDate = new Date(startDate).toISOString();
            }
            
            if (endDate) {
                endDate = new Date(endDate).toISOString();
            }
            
            const user = {
                id: item.id,
                email: fields.Email || '',
                subscriptionType: fields.SubscriptionType || 'Gratuita',
                startDate: startDate,
                endDate: endDate,
                isActive: fields.IsActive === true || fields.IsActive === 'true',
                failedLoginAttempts: fields.FailedLoginAttempts || 0
            };
            
            console.log(`Usuario procesado: ${user.email}, ID: ${user.id}`);
            return user;
        });
        
        console.log(`Total de usuarios procesados: ${processedUsers.length}`);
        return processedUsers;
    }

    /**
     * Busca usuarios según criterios de búsqueda y filtros
     * @param {string} searchTerm - Término de búsqueda
     * @param {Array} users - Lista de usuarios donde buscar
     * @param {Object} filters - Filtros adicionales
     * @returns {Array} Lista de usuarios filtrados
     */
    searchUsers(searchTerm, users, filters = {}) {
        if (!users || !Array.isArray(users)) {
            return [];
        }
        
        let filteredUsers = [...users];
        
        // Aplicar búsqueda por texto
        if (searchTerm && searchTerm.trim() !== '') {
            const term = searchTerm.trim().toLowerCase();
            filteredUsers = filteredUsers.filter(user => {
                return user.email.toLowerCase().includes(term);
            });
        }
        
        // Aplicar filtro por tipo de suscripción
        if (filters.subscriptionType && filters.subscriptionType !== 'Todos') {
            filteredUsers = filteredUsers.filter(user => {
                return user.subscriptionType === filters.subscriptionType;
            });
        }
        
        // Aplicar filtro por estado
        if (filters.status && filters.status !== 'Todos') {
            const isActive = filters.status === 'Activo';
            filteredUsers = filteredUsers.filter(user => {
                return user.isActive === isActive;
            });
        }
        
        // Aplicar filtro por fecha de inicio
        if (filters.startDateFrom) {
            const startDate = new Date(filters.startDateFrom);
            filteredUsers = filteredUsers.filter(user => {
                if (!user.startDate) return false;
                return new Date(user.startDate) >= startDate;
            });
        }
        
        // Aplicar filtro por fecha de fin
        if (filters.endDateTo) {
            const endDate = new Date(filters.endDateTo);
            filteredUsers = filteredUsers.filter(user => {
                if (!user.endDate) return false;
                return new Date(user.endDate) <= endDate;
            });
        }
        
        return filteredUsers;
    }

    /**
     * Obtiene usuarios de SharePoint según un filtro OData
     * @param {string} filter - Filtro OData para la consulta
     * @returns {Promise<Array<Object>>} Lista de usuarios que coinciden con el filtro
     */
    async getUsersByFilter(filter) {
        try {
            console.log('=== INICIO getUsersByFilter ===');
            console.log('Filtro original:', filter);
            
            // Construir URL base
            let url = `${this.graphEndpoint}/sites/${this.siteId}/lists/${this.listId}/items?expand=fields`;
            
            // Añadir filtro si existe
            if (filter) {
                // Asegurarse de que el filtro esté correctamente codificado
                const encodedFilter = encodeURIComponent(filter);
                url += `&$filter=${encodedFilter}`;
                console.log('Filtro codificado:', encodedFilter);
            }
            
            console.log('URL completa de la consulta:', url);
            
            // Realizar la petición a SharePoint
            console.log('Realizando petición a SharePoint...');
            const response = await this._fetchWithAuth(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error en la respuesta de SharePoint:', response.status, errorText);
                throw new Error(`Error al obtener usuarios: ${response.status} - ${errorText}`);
            }
            
            // Procesar la respuesta
            const data = await response.json();
            console.log('Respuesta completa de SharePoint:', JSON.stringify(data, null, 2));
            
            if (!data || !data.value) {
                console.warn('Respuesta de SharePoint sin datos o formato incorrecto');
                return [];
            }
            
            console.log(`Encontrados ${data.value.length} items en la respuesta`);
            
            // Procesar los items de usuario
            const users = this._processUserItems(data.value);
            console.log(`Procesados ${users.length} usuarios`);
            
            // Mostrar detalles de los usuarios encontrados
            if (users.length > 0) {
                console.log('Detalles de los usuarios encontrados:');
                users.forEach(user => {
                    console.log(`- Email: ${user.email}, ID: ${user.id}`);
                });
            } else {
                console.log('No se encontraron usuarios para el filtro proporcionado');
            }
            
            console.log('=== FIN getUsersByFilter ===');
            return users;
        } catch (error) {
            console.error('Error en getUsersByFilter:', error);
            throw error;
        }
    }

    /**
     * Realiza una petición autenticada a la API de SharePoint
     * @param {string} url - URL a la que realizar la petición
     * @param {Object} options - Opciones adicionales para fetch
     * @returns {Promise<Response>} Respuesta de la petición
     * @private
     */
    async _fetchWithAuth(url, options = {}) {
        try {
            console.log('Iniciando petición autenticada a:', url);
            
            // Asegurarse de que tenemos los IDs necesarios
            if (!this.siteId) {
                console.log('Obteniendo siteId...');
                await this.getSiteId();
            }
            
            if (!this.listId && url.includes('/lists/')) {
                console.log('Obteniendo listId...');
                await this.getListId();
            }
            
            // Obtener token de acceso
            const accessToken = await this.getAccessToken();
            console.log('Token obtenido correctamente');
            
            // Configurar opciones por defecto
            const fetchOptions = {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                ...options
            };
            
            // Realizar la petición
            console.log('Enviando petición con opciones:', JSON.stringify(fetchOptions, (key, value) => 
                key === 'Authorization' ? 'Bearer [TOKEN]' : value
            ));
            
            const response = await fetch(url, fetchOptions);
            console.log('Respuesta recibida:', response.status, response.statusText);
            
            return response;
        } catch (error) {
            console.error('Error en petición autenticada:', error);
            throw error;
        }
    }

    /**
     * Crea un nuevo usuario en SharePoint
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario creado
     */
    async createUser(userData) {
        try {
            const token = await this.getAccessToken(true);
            const siteId = await this.getSiteId();
            
            // Validar datos obligatorios
            if (!userData.Email) {
                throw new Error('El email es obligatorio');
            }
            
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${this.listId}/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        Email: userData.Email,
                        Password: userData.Password || '',
                        SubscriptionType: userData.SubscriptionType || 'Gratuita',
                        StartDate: userData.StartDate || new Date().toISOString(),
                        EndDate: userData.EndDate || new Date().toISOString(),
                        IsActive: userData.IsActive === undefined ? true : userData.IsActive,
                        FailedLoginAttempts: userData.FailedLoginAttempts || 0
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error al crear usuario: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Convertir a formato de usuario
            return {
                id: data.id,
                email: data.fields.Email,
                subscriptionType: data.fields.SubscriptionType,
                startDate: data.fields.StartDate,
                endDate: data.fields.EndDate,
                isActive: data.fields.IsActive === true || data.fields.IsActive === 'true',
                failedLoginAttempts: data.fields.FailedLoginAttempts
            };
        } catch (error) {
            console.error('Error al crear usuario:', error);
            throw new Error(`Error al crear usuario: ${error.message}`);
        }
    }

    /**
     * Actualiza un usuario existente en SharePoint
     * @param {string} id - ID del usuario
     * @param {Object} userData - Datos actualizados del usuario
     * @returns {Promise<Object>} Usuario actualizado
     */
    async updateUser(id, userData) {
        try {
            const token = await this.getAccessToken(true);
            const siteId = await this.getSiteId();
            
            // Validar ID
            if (!id) {
                throw new Error('El ID del usuario es obligatorio');
            }
            
            // Preparar datos para actualizar
            const fields = {};
            
            if (userData.Email !== undefined) fields.Email = userData.Email;
            if (userData.Password !== undefined) fields.Password = userData.Password;
            if (userData.SubscriptionType !== undefined) fields.SubscriptionType = userData.SubscriptionType;
            if (userData.StartDate !== undefined) fields.StartDate = userData.StartDate;
            if (userData.EndDate !== undefined) fields.EndDate = userData.EndDate;
            if (userData.IsActive !== undefined) fields.IsActive = userData.IsActive;
            if (userData.FailedLoginAttempts !== undefined) fields.FailedLoginAttempts = userData.FailedLoginAttempts;
            
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${this.listId}/items/${id}/fields`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fields)
            });
            
            if (!response.ok) {
                throw new Error(`Error al actualizar usuario: ${response.status} ${response.statusText}`);
            }
            
            // Obtener usuario actualizado
            const getUserResponse = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${this.listId}/items/${id}?expand=fields`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!getUserResponse.ok) {
                throw new Error(`Error al obtener usuario actualizado: ${getUserResponse.status} ${getUserResponse.statusText}`);
            }
            
            const data = await getUserResponse.json();
            
            // Convertir a formato de usuario
            return {
                id: data.id,
                email: data.fields.Email,
                subscriptionType: data.fields.SubscriptionType,
                startDate: data.fields.StartDate,
                endDate: data.fields.EndDate,
                isActive: data.fields.IsActive === true || data.fields.IsActive === 'true',
                failedLoginAttempts: data.fields.FailedLoginAttempts
            };
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            throw new Error(`Error al actualizar usuario: ${error.message}`);
        }
    }

    /**
     * Elimina un usuario de SharePoint
     * @param {string} id - ID del usuario
     * @returns {Promise<void>}
     */
    async deleteUser(id) {
        try {
            const token = await this.getAccessToken(true);
            const siteId = await this.getSiteId();
            
            // Validar ID
            if (!id) {
                throw new Error('El ID del usuario es obligatorio');
            }
            
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${this.listId}/items/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error al eliminar usuario: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            throw new Error(`Error al eliminar usuario: ${error.message}`);
        }
    }

    /**
     * Obtiene el contenido de un archivo desde SharePoint
     * @param {string} fileName - Nombre del archivo a obtener
     * @returns {Promise<string>} Contenido del archivo
     */
    async getFileContent(fileName) {
        try {
            console.log(`Obteniendo contenido del archivo: ${fileName}`);
            
            // Asegurarse de que tenemos el siteId
            if (!this.siteId) {
                await this.getSiteId();
            }
            
            // Obtener token de acceso
            const token = await this.getAccessToken();
            
            // Usar el driveId conocido
            const driveId = "b!Y4G7xKhAwE63GzVWFoZqEoZ6a3u1ygZDon3BUkpZKN5vf5RQYNfFQZUvvITooz_l";
            
            // Intentar obtener el archivo directamente desde la raíz de la biblioteca
            try {
                const rootUrl = `${this.graphEndpoint}/drives/${driveId}/root:/${fileName}:/content`;
                console.log(`Intentando obtener archivo desde la raíz: ${rootUrl}`);
                
                const rootResponse = await fetch(rootUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'text/plain'
                    }
                });
                
                if (rootResponse.ok) {
                    const content = await rootResponse.text();
                    console.log(`Contenido obtenido correctamente desde la raíz (${content.length} bytes)`);
                    return content;
                } else {
                    console.log(`Acceso desde la raíz no funcionó: ${rootResponse.status} ${rootResponse.statusText}`);
                }
            } catch (rootError) {
                console.log('Error al acceder desde la raíz:', rootError.message);
            }
            
            // Probar diferentes rutas para encontrar el archivo
            const possiblePaths = [`/root:/${fileName}:/content`, `/items/root:/${fileName}:/content`,
                `/root:/InstaladoresWindowsCOnline/${fileName}:/content`
            ];
            
            let content = null;
            
            // Intentar cada ruta hasta encontrar una que funcione
            for (const path of possiblePaths) {
                const url = `${this.graphEndpoint}/drives/${driveId}${path}`;
                console.log(`Intentando obtener archivo con URL: ${url}`);
                
                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'text/plain'
                        }
                    });
                    
                    if (response.ok) {
                        content = await response.text();
                        console.log(`Contenido obtenido correctamente de ${url} (${content.length} bytes)`);
                        break;
                    } else {
                        console.log(`Ruta ${url} no funcionó: ${response.status} ${response.statusText}`);
                    }
                } catch (pathError) {
                    console.log(`Error al intentar ruta ${url}:`, pathError.message);
                }
            }
            
            // Si no se encontró el archivo, intentar buscarlo
            if (!content) {
                try {
                    const searchUrl = `${this.graphEndpoint}/drives/${driveId}/root/search(q='${fileName}')`;
                    console.log(`Buscando archivo por nombre: ${searchUrl}`);
                    
                    const searchResponse = await fetch(searchUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        console.log(`Resultados de búsqueda: ${searchData.value?.length || 0} archivos`);
                        
                        if (searchData.value && searchData.value.length > 0) {
                            // Buscar el archivo exacto
                            const exactFile = searchData.value.find(file => file.name === fileName);
                            
                            if (exactFile) {
                                console.log(`Archivo encontrado mediante búsqueda: ${exactFile.name} (ID: ${exactFile.id})`);
                                
                                // Obtener el contenido usando el ID del archivo
                                const fileUrl = `${this.graphEndpoint}/drives/${driveId}/items/${exactFile.id}/content`;
                                console.log(`Obteniendo contenido con ID: ${fileUrl}`);
                                
                                const fileResponse = await fetch(fileUrl, {
                                    method: 'GET',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Accept': 'text/plain'
                                    }
                                });
                                
                                if (fileResponse.ok) {
                                    content = await fileResponse.text();
                                    console.log(`Contenido obtenido correctamente usando ID (${content.length} bytes)`);
                                }
                            }
                        }
                    }
                } catch (searchError) {
                    console.log('Error al buscar archivo:', searchError.message);
                }
            }
            
            // Si no se encontró el archivo, intentar crearlo con un contenido inicial
            if (!content) {
                console.error(`No se pudo encontrar el archivo ${fileName} en ninguna ruta`);
                
                // Verificar si debemos crear el archivo
                const shouldCreate = confirm(`El archivo ${fileName} no existe. ¿Desea crear una estructura inicial?`);
                
                if (shouldCreate) {
                    console.log(`Intentando crear una estructura inicial para ${fileName}...`);
                    
                    // Crear estructura inicial según el tipo de archivo
                    let initialContent = "{}";
                    
                    if (fileName === 'elite_apps_config.json') {
                        initialContent = JSON.stringify({
                            lastUpdate: new Date().toISOString(),
                            applications: []
                        }, null, 2);
                    } else if (fileName === 'app_descriptions.json') {
                        initialContent = JSON.stringify({
                            lastUpdate: new Date().toISOString(),
                            descriptions: {}
                        }, null, 2);
                    } else if (fileName === 'required_apps_config.json') {
                        initialContent = JSON.stringify({
                            lastUpdate: new Date().toISOString(),
                            requiredApps: []
                        }, null, 2);
                    }
                    
                    // Intentar crear el archivo
                    const created = await this.saveFileContent(fileName, initialContent);
                    if (created) {
                        console.log(`Archivo ${fileName} creado con estructura inicial`);
                        return initialContent;
                    }
                }
                
                return null;
            }
            
            return content;
        } catch (error) {
            console.error(`Error al obtener contenido del archivo ${fileName}:`, error);
            return null;
        }
    }
    
    /**
     * Guarda el contenido de un archivo en SharePoint
     * @param {string} fileName - Nombre del archivo a guardar
     * @param {string} content - Contenido del archivo
     * @returns {Promise<boolean>} True si se guardó correctamente
     */
    async saveFileContent(fileName, content) {
        try {
            console.log(`Guardando contenido en el archivo: ${fileName}`);
            
            // Log detallado del contenido a guardar
            if (fileName.includes('_apps_config.json')) {
                try {
                    const contentObj = JSON.parse(content);
                    console.log(`Contenido a guardar en ${fileName}:`, {
                        lastUpdate: contentObj.lastUpdate,
                        totalApps: contentObj.applications.length,
                        primeros5Archivos: contentObj.applications.slice(0, 5).map(app => app.fileName),
                        tamaño: content.length
                    });
                } catch (parseError) {
                    console.error(`Error al analizar el contenido de ${fileName}:`, parseError);
                }
            }
            
            // Asegurarse de que tenemos el siteId
            if (!this.siteId) {
                await this.getSiteId();
            }
            
            // Obtener token de acceso con permisos de escritura
            const token = await this.getAccessToken(true);
            
            // Usar el driveId conocido
            const driveId = "b!Y4G7xKhAwE63GzVWFoZqEoZ6a3u1ygZDon3BUkpZKN5vf5RQYNfFQZUvvITooz_l";
            
            // Probar diferentes rutas para guardar el archivo
            const possiblePaths = [`/root:/${fileName}:/content`, `/items/root:/${fileName}:/content`,
                `/root:/InstaladoresWindowsCOnline/${fileName}:/content`
            ];
            
            let success = false;
            
            // Intentar cada ruta hasta encontrar una que funcione
            for (const path of possiblePaths) {
                const url = `${this.graphEndpoint}/drives/${driveId}${path}`;
                console.log(`Intentando guardar archivo con URL: ${url}`);
                
                try {
                    const response = await fetch(url, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: content
                    });
                    
                    if (response.ok) {
                        console.log(`Archivo guardado correctamente en ${url}`);
                        success = true;
                        break;
                    } else {
                        console.log(`Ruta ${url} no funcionó: ${response.status} ${response.statusText}`);
                    }
                } catch (pathError) {
                    console.log(`Error al intentar ruta ${url}:`, pathError.message);
                }
            }
            
            // Si no funcionó ninguna ruta, intentar crear el archivo en la raíz
            if (!success) {
                try {
                    // Intentar crear el archivo en la raíz del drive
                    const rootUrl = `${this.graphEndpoint}/drives/${driveId}/root:/content`;
                    console.log(`Intentando crear archivo en la raíz: ${rootUrl}`);
                    
                    const rootResponse = await fetch(rootUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: content
                    });
                    
                    if (rootResponse.ok) {
                        console.log(`Archivo creado correctamente en la raíz`);
                        success = true;
                    } else {
                        console.log(`Creación en raíz no funcionó: ${rootResponse.status} ${rootResponse.statusText}`);
                    }
                } catch (rootError) {
                    console.log('Error al crear en raíz:', rootError.message);
                }
            }
            
            if (!success) {
                console.error(`No se pudo guardar el archivo ${fileName} en ninguna ruta`);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error(`Error al guardar contenido en el archivo ${fileName}:`, error);
            return false;
        }
    }

    /**
     * Obtiene la lista de archivos en la carpeta exe de SharePoint
     * @returns {Promise<Array>} Lista de archivos
     */
    async getExeFiles() {
        try {
            console.log('Obteniendo lista de archivos de la carpeta exe...');
            
            // Asegurarse de que tenemos el siteId
            if (!this.siteId) {
                await this.getSiteId();
            }
            
            // Obtener token de acceso
            const token = await this.getAccessToken();
            
            // Usar directamente los IDs proporcionados
            const driveId = "b!Y4G7xKhAwE63GzVWFoZqEoZ6a3u1ygZDon3BUkpZKN5vf5RQYNfFQZUvvITooz_l";
            const folderId = "017AGUZRPVVT45OTNMY5A33CRJXZ6QNDTY";
            
            let allFiles = [];
            
            // Función para procesar los archivos
            const processFiles = (items) => {
                // Filtrar solo archivos .exe y .bat que no estén en subcarpetas
                const filteredFiles = items
                    .filter(file => {
                        // Verificar si es un archivo (no una carpeta)
                        const isFile = file.file !== undefined;
                        
                        // Verificar si es un archivo .exe o .bat
                        const isExecutable = isFile && 
                            (file.name.toLowerCase().endsWith('.exe') || 
                             file.name.toLowerCase().endsWith('.bat'));
                        
                        // Verificar que no esté en una subcarpeta (los elementos directos no tienen '/' en el nombre)
                        const isNotInSubfolder = !file.name.includes('/');
                        
                        // Log para depuración
                        if (isExecutable) {
                            console.log(`Procesando archivo: ${file.name}, isFile: ${isFile}, isNotInSubfolder: ${isNotInSubfolder}`);
                        }
                        
                        return isExecutable && isNotInSubfolder;
                    })
                    .map(file => ({
                        id: file.id,
                        name: file.name,
                        size: file.size,
                        lastModified: file.lastModifiedDateTime,
                        downloadUrl: file['@microsoft.graph.downloadUrl'],
                        webUrl: file.webUrl,
                        file: file.file // Añadir la propiedad file para verificaciones posteriores
                    }));
                
                console.log(`Procesados ${filteredFiles.length} archivos .exe y .bat`);
                return filteredFiles;
            };
            
            // Función para obtener todos los archivos con paginación
            const getAllFilesWithPagination = async (initialUrl) => {
                let files = [];
                let nextLink = initialUrl;
                
                while (nextLink) {
                    console.log(`Obteniendo página de archivos: ${nextLink}`);
                    
                    const response = await fetch(nextLink, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        console.log(`Error al obtener página: ${response.status} ${response.statusText}`);
                        break;
                    }
                    
                    const data = await response.json();
                    
                    if (data.value && data.value.length > 0) {
                        const pageFiles = processFiles(data.value);
                        files = files.concat(pageFiles);
                        console.log(`Obtenidos ${pageFiles.length} archivos en esta página, total acumulado: ${files.length}`);
                    }
                    
                    // Actualizar nextLink para la siguiente iteración
                    nextLink = data['@odata.nextLink'] || null;
                }
                
                return files;
            };
            
            // 1. Intentar primero con el ID de carpeta directo
            try {
                const folderUrl = `${this.graphEndpoint}/drives/${driveId}/items/${folderId}/children?$top=1000`;
                console.log(`Intentando obtener archivos con ID de carpeta directo: ${folderUrl}`);
                
                const folderFiles = await getAllFilesWithPagination(folderUrl);
                
                if (folderFiles.length > 0) {
                    console.log(`Se encontraron ${folderFiles.length} archivos totales en la carpeta exe usando ID directo`);
                    
                    // Filtrar solo archivos .exe y .bat que estén en la carpeta principal
                    const executableFiles = folderFiles.filter(file => {
                        // Verificar que sea un archivo (no una carpeta)
                        const isFile = file.name && file.file !== undefined;
                        
                        // Verificar que sea .exe o .bat
                        const isExecutable = file.name.toLowerCase().endsWith('.exe') || 
                                            file.name.toLowerCase().endsWith('.bat');
                        
                        // Verificar que no esté en una subcarpeta
                        const isInMainFolder = !file.name.includes('/');
                        
                        // Log para depuración
                        if (isExecutable) {
                            console.log(`Archivo ejecutable encontrado: ${file.name}, isFile: ${isFile}, isInMainFolder: ${isInMainFolder}`);
                        }
                        
                        return isFile && isExecutable && isInMainFolder;
                    });
                    
                    console.log(`Se filtraron ${executableFiles.length} archivos .exe y .bat de la carpeta principal`);
                    allFiles = executableFiles;
                    return allFiles;
                }
            } catch (directError) {
                console.log('Error al acceder directamente por ID:', directError.message);
            }
            
            // 2. Si el acceso directo falló, intentar con la ruta completa usando el driveId
            try {
                const driveUrl = `${this.graphEndpoint}/drives/${driveId}/root:/InstaladoresWindowsCOnline/exe:/children?$top=1000`;
                console.log(`Intentando obtener archivos con driveId y ruta: ${driveUrl}`);
                
                const driveFiles = await getAllFilesWithPagination(driveUrl);
                
                if (driveFiles.length > 0) {
                    console.log(`Se encontraron ${driveFiles.length} archivos totales en la carpeta exe usando driveId y ruta`);
                    
                    // Filtrar solo archivos .exe y .bat que estén en la carpeta principal
                    const executableFiles = driveFiles.filter(file => {
                        // Verificar que sea un archivo (no una carpeta)
                        const isFile = file.name && file.file !== undefined;
                        
                        // Verificar que sea .exe o .bat
                        const isExecutable = file.name.toLowerCase().endsWith('.exe') || 
                                            file.name.toLowerCase().endsWith('.bat');
                        
                        // Verificar que no esté en una subcarpeta
                        const isInMainFolder = !file.name.includes('/');
                        
                        // Log para depuración
                        if (isExecutable) {
                            console.log(`Archivo ejecutable encontrado: ${file.name}, isFile: ${isFile}, isInMainFolder: ${isInMainFolder}`);
                        }
                        
                        return isFile && isExecutable && isInMainFolder;
                    });
                    
                    console.log(`Se filtraron ${executableFiles.length} archivos .exe y .bat de la carpeta principal`);
                    allFiles = executableFiles;
                    return allFiles;
                }
            } catch (driveError) {
                console.log('Error al acceder por driveId y ruta:', driveError.message);
            }
            
            // 3. Intentar con la ruta exe
            try {
                const formsUrl = `${this.graphEndpoint}/drives/${driveId}/root:/exe:/children?$top=1000`;
                console.log(`Intentando obtener archivos con ruta exe: ${formsUrl}`);
                
                const formsFiles = await getAllFilesWithPagination(formsUrl);
                
                if (formsFiles.length > 0) {
                    console.log(`Se encontraron ${formsFiles.length} archivos totales en la carpeta exe`);
                    
                    // Filtrar solo archivos .exe y .bat que estén en la carpeta principal
                    const executableFiles = formsFiles.filter(file => {
                        // Verificar que sea un archivo (no una carpeta)
                        const isFile = file.name && file.file !== undefined;
                        
                        // Verificar que sea .exe o .bat
                        const isExecutable = file.name.toLowerCase().endsWith('.exe') || 
                                            file.name.toLowerCase().endsWith('.bat');
                        
                        // Verificar que no esté en una subcarpeta
                        const isInMainFolder = !file.name.includes('/');
                        
                        // Log para depuración
                        if (isExecutable) {
                            console.log(`Archivo ejecutable encontrado: ${file.name}, isFile: ${isFile}, isInMainFolder: ${isInMainFolder}`);
                        }
                        
                        return isFile && isExecutable && isInMainFolder;
                    });
                    
                    console.log(`Se filtraron ${executableFiles.length} archivos .exe y .bat de la carpeta principal`);
                    allFiles = executableFiles;
                    return allFiles;
                }
            } catch (formsError) {
                console.log('Error al acceder por ruta exe:', formsError.message);
            }
            
            // 4. Intentar con búsqueda de archivos ejecutables
            try {
                // Buscar archivos ejecutables en todo el drive
                const searchUrl = `${this.graphEndpoint}/drives/${driveId}/root/search(q='.exe OR .bat')?$top=1000`;
                console.log(`Intentando buscar archivos ejecutables: ${searchUrl}`);
                
                const searchFiles = await getAllFilesWithPagination(searchUrl);
                
                if (searchFiles.length > 0) {
                    console.log(`Se encontraron ${searchFiles.length} archivos totales mediante búsqueda`);
                    
                    // Filtrar solo archivos .exe y .bat que estén en la carpeta principal exe
                    const executableFiles = searchFiles.filter(file => {
                        // Verificar que sea un archivo (no una carpeta)
                        const isFile = file.name && file.file !== undefined;
                        
                        // Verificar que sea .exe o .bat
                        const isExecutable = file.name.toLowerCase().endsWith('.exe') || 
                                            file.name.toLowerCase().endsWith('.bat');
                        
                        // Verificar que esté en la carpeta exe principal
                        const isInExeFolder = file.webUrl.includes('/exe/') && 
                                             !file.name.includes('/');
                        
                        // Log para depuración
                        if (isExecutable) {
                            console.log(`Archivo ejecutable encontrado por búsqueda: ${file.name}, isFile: ${isFile}, isInExeFolder: ${isInExeFolder}`);
                        }
                        
                        return isFile && isExecutable && isInExeFolder;
                    });
                    
                    console.log(`Se filtraron ${executableFiles.length} archivos .exe y .bat de la carpeta principal exe mediante búsqueda`);
                    allFiles = executableFiles;
                    
                    if (allFiles.length > 0) {
                        return allFiles;
                    }
                }
            } catch (searchError) {
                console.log('Error al buscar archivos ejecutables:', searchError.message);
            }
            
            // 5. Intentar listar todos los archivos del drive y filtrar manualmente
            try {
                const rootUrl = `${this.graphEndpoint}/drives/${driveId}/root/children?$top=1000`;
                console.log(`Intentando listar todos los archivos del drive: ${rootUrl}`);
                
                const rootFiles = await getAllFilesWithPagination(rootUrl);
                
                // Buscar carpeta exe entre los resultados
                const exeFolder = rootFiles.find(item => 
                    item.name.toLowerCase() === 'exe' && 
                    !item.file // Es una carpeta, no un archivo
                );
                
                if (exeFolder) {
                    console.log(`Carpeta exe encontrada con ID: ${exeFolder.id}`);
                    
                    // Obtener archivos de la carpeta exe
                    const exeFolderUrl = `${this.graphEndpoint}/drives/${driveId}/items/${exeFolder.id}/children?$top=1000`;
                    const exeFolderFiles = await getAllFilesWithPagination(exeFolderUrl);
                    
                    console.log(`Se encontraron ${exeFolderFiles.length} archivos en la carpeta exe`);
                    allFiles = exeFolderFiles;
                    return allFiles;
                } else {
                    // Filtrar archivos ejecutables de todos los archivos encontrados
                    const executableFiles = rootFiles.filter(file => 
                        file.name && (
                            file.name.toLowerCase().endsWith('.exe') || 
                            file.name.toLowerCase().endsWith('.msi') || 
                            file.name.toLowerCase().endsWith('.bat') || 
                            file.name.toLowerCase().endsWith('.cmd') ||
                            file.name.toLowerCase().endsWith('.zip') ||
                            file.name.toLowerCase().endsWith('.rar')
                        )
                    );
                    
                    console.log(`Se encontraron ${executableFiles.length} archivos ejecutables en la raíz`);
                    allFiles = executableFiles;
                    
                    if (allFiles.length > 0) {
                        return allFiles;
                    }
                }
            } catch (rootError) {
                console.log('Error al listar archivos de la raíz:', rootError.message);
            }
            
            // Si llegamos aquí, no se encontraron archivos con ningún método
            console.log('No se pudieron encontrar archivos en la carpeta exe con ningún método');
            return [];
        } catch (error) {
            console.error('Error al obtener archivos de la carpeta exe:', error);
            return [];
        }
    }

    /**
     * Obtiene la lista de archivos en una carpeta específica
     * @param {string} folderPath - Ruta de la carpeta (ej: 'img')
     * @returns {Promise<Array>} Lista de archivos
     */
    async getFilesInFolder(folderPath) {
        try {
            console.log(`Obteniendo lista de archivos de la carpeta ${folderPath}...`);
            
            // Asegurarse de que tenemos el siteId
            if (!this.siteId) {
                await this.getSiteId();
            }
            
            // Obtener token de acceso
            const token = await this.getAccessToken();
            
            // Usar directamente los IDs proporcionados
            const driveId = "b!Y4G7xKhAwE63GzVWFoZqEoZ6a3u1ygZDon3BUkpZKN5vf5RQYNfFQZUvvITooz_l";
            
            // Construir la URL para obtener los archivos de la carpeta
            let url = `${this.graphEndpoint}/drives/${driveId}/root:/${folderPath}:/children?$top=1000`;
            
            let allFiles = [];
            
            // Función para procesar los archivos
            const processFiles = (items) => {
                // Filtrar solo archivos (no carpetas)
                const filteredFiles = items
                    .filter(file => {
                        // Verificar si es un archivo (no una carpeta)
                        const isFile = file.file !== undefined;
                        
                        // Verificar que no esté en una subcarpeta (los elementos directos no tienen '/' en el nombre)
                        const isNotInSubfolder = !file.name.includes('/');
                        
                        // Log para depuración
                        console.log(`Procesando archivo en ${folderPath}: ${file.name}, isFile: ${isFile}, isNotInSubfolder: ${isNotInSubfolder}`);
                        
                        return isFile && isNotInSubfolder;
                    })
                    .map(file => ({
                        id: file.id,
                        name: file.name,
                        size: file.size,
                        lastModified: file.lastModifiedDateTime,
                        downloadUrl: file['@microsoft.graph.downloadUrl'],
                        webUrl: file.webUrl,
                        file: file.file // Añadir la propiedad file para verificaciones posteriores
                    }));
                
                console.log(`Procesados ${filteredFiles.length} archivos en la carpeta ${folderPath}`);
                return filteredFiles;
            };
            
            // Función para obtener todos los archivos con paginación
            const getAllFilesWithPagination = async (initialUrl) => {
                let files = [];
                let nextLink = initialUrl;
                
                while (nextLink) {
                    console.log(`Obteniendo página de archivos: ${nextLink}`);
                    
                    const response = await fetch(nextLink, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        console.log(`Error al obtener página: ${response.status} ${response.statusText}`);
                        break;
                    }
                    
                    const data = await response.json();
                    
                    if (data.value && data.value.length > 0) {
                        const pageFiles = processFiles(data.value);
                        files = files.concat(pageFiles);
                        console.log(`Obtenidos ${pageFiles.length} archivos en esta página, total acumulado: ${files.length}`);
                    }
                    
                    // Actualizar nextLink para la siguiente iteración
                    nextLink = data['@odata.nextLink'] || null;
                }
                
                return files;
            };
            
            // Obtener todos los archivos con paginación
            allFiles = await getAllFilesWithPagination(url);
            
            console.log(`Se encontraron ${allFiles.length} archivos totales en la carpeta ${folderPath}`);
            return allFiles;
            
        } catch (error) {
            console.error(`Error al obtener archivos de la carpeta ${folderPath}:`, error);
            return [];
        }
    }

    /**
     * Obtiene la configuración de la aplicación desde SharePoint
     * @returns {Promise<Object>} Objeto con la configuración de la aplicación
     */
    async getAppSettings() {
        try {
            // Verificar autenticación
            await this.ensureAuthenticated();
            
            console.log("Obteniendo configuración desde SharePoint...");
            
            // Obtener el sitio
            const siteQuery = `${this.siteUrl}:/sites/InstaladoresWindowsC`;
            console.log(`Consultando sitio: ${siteQuery}`);
            const site = await this.graphClient.api(`/sites/${siteQuery}`).get();
            if (!site) {
                console.error("No se pudo encontrar el sitio");
                throw new Error("No se pudo encontrar el sitio");
            }
            
            console.log(`Sitio encontrado con ID: ${site.id}`);
            
            // Obtener la biblioteca de documentos
            console.log("Obteniendo listas del sitio...");
            const lists = await this.graphClient.api(`/sites/${site.id}/lists`).get();
            const documentLibrary = lists.value.find(l => l.name === this.libraryName);
            if (!documentLibrary) {
                console.error(`No se pudo encontrar la biblioteca de documentos: ${this.libraryName}`);
                throw new Error("No se pudo encontrar la biblioteca de documentos");
            }
            
            console.log(`Biblioteca encontrada: ${documentLibrary.name} con ID: ${documentLibrary.id}`);
            
            // Obtener el drive
            console.log("Obteniendo drive de la biblioteca...");
            const drive = await this.graphClient.api(`/sites/${site.id}/lists/${documentLibrary.id}/drive`).get();
            if (!drive) {
                console.error("No se pudo obtener el drive");
                throw new Error("No se pudo obtener el drive");
            }
            
            console.log(`Drive encontrado con ID: ${drive.id}`);
            
            // Buscar el archivo de configuración
            console.log("Buscando archivo app_settings.json...");
            const items = await this.graphClient.api(`/drives/${drive.id}/root/children`).get();
            const configFile = items.value.find(i => i.name === "app_settings.json");
            
            if (!configFile) {
                console.warn("No se encontró el archivo app_settings.json, se usarán valores predeterminados");
                return this.getDefaultAppSettings();
            }
            
            console.log(`Archivo de configuración encontrado con ID: ${configFile.id}`);
            
            // Obtener el contenido del archivo
            console.log("Descargando contenido del archivo...");
            try {
                const response = await this.graphClient.api(`/drives/${drive.id}/items/${configFile.id}/content`).get();
                const jsonContent = await response.text();
                
                console.log("Contenido del archivo obtenido, parseando JSON...");
                try {
                    const appSettings = JSON.parse(jsonContent);
                    console.log("Configuración cargada correctamente:", appSettings);
                    
                    // Verificar que la estructura sea válida
                    if (!appSettings.Course || !appSettings.Videos || !appSettings.TermsAndConditions) {
                        console.warn("La estructura de la configuración no es completa, completando con valores predeterminados");
                        const defaultSettings = this.getDefaultAppSettings();
                        
                        // Completar secciones faltantes
                        if (!appSettings.Course) appSettings.Course = defaultSettings.Course;
                        if (!appSettings.Videos) appSettings.Videos = defaultSettings.Videos;
                        if (!appSettings.TermsAndConditions) appSettings.TermsAndConditions = defaultSettings.TermsAndConditions;
                    }
                    
                    return appSettings;
                } catch (ex) {
                    console.error("Error al deserializar el archivo de configuración:", ex);
                    console.error("Contenido del archivo:", jsonContent);
                    return this.getDefaultAppSettings();
                }
            } catch (downloadError) {
                console.error("Error al descargar el contenido del archivo:", downloadError);
                return this.getDefaultAppSettings();
            }
        } catch (error) {
            console.error("Error al cargar la configuración:", error);
            return this.getDefaultAppSettings();
        }
    }

    /**
     * Guarda la configuración de la aplicación en SharePoint
     * @param {Object} appSettings Objeto con la configuración a guardar
     * @returns {Promise<void>}
     */
    async saveAppSettings(appSettings) {
        try {
            // Verificar autenticación
            await this.ensureAuthenticated();
            
            console.log("Guardando configuración en SharePoint...");
            
            // Convertir las URLs de YouTube a formato de incrustación
            if (appSettings.Course) {
                console.log("Procesando URL del curso...");
                appSettings.Course.VideoUrl = this.convertToEmbedUrl(appSettings.Course.VideoUrl);
            }
            
            if (appSettings.Videos) {
                console.log("Procesando URLs de videos...");
                appSettings.Videos.DefenderVideoUrl = this.convertToEmbedUrl(appSettings.Videos.DefenderVideoUrl);
                appSettings.Videos.EsetVideoUrl = this.convertToEmbedUrl(appSettings.Videos.EsetVideoUrl);
            }
            
            // Obtener el sitio
            console.log("Obteniendo sitio...");
            const siteQuery = `${this.siteUrl}:/sites/InstaladoresWindowsC`;
            const site = await this.graphClient.api(`/sites/${siteQuery}`).get();
            if (!site) {
                console.error("No se pudo encontrar el sitio");
                throw new Error("No se pudo encontrar el sitio");
            }
            
            console.log(`Sitio encontrado con ID: ${site.id}`);
            
            // Obtener la biblioteca de documentos
            console.log("Obteniendo listas del sitio...");
            const lists = await this.graphClient.api(`/sites/${site.id}/lists`).get();
            const documentLibrary = lists.value.find(l => l.name === this.libraryName);
            if (!documentLibrary) {
                console.error(`No se pudo encontrar la biblioteca de documentos: ${this.libraryName}`);
                throw new Error("No se pudo encontrar la biblioteca de documentos");
            }
            
            console.log(`Biblioteca encontrada: ${documentLibrary.name} con ID: ${documentLibrary.id}`);
            
            // Obtener el drive
            console.log("Obteniendo drive de la biblioteca...");
            const drive = await this.graphClient.api(`/sites/${site.id}/lists/${documentLibrary.id}/drive`).get();
            if (!drive) {
                console.error("No se pudo obtener el drive");
                throw new Error("No se pudo obtener el drive");
            }
            
            console.log(`Drive encontrado con ID: ${drive.id}`);
            
            // Buscar el archivo de configuración
            console.log("Buscando archivo app_settings.json...");
            const items = await this.graphClient.api(`/drives/${drive.id}/root/children`).get();
            const configFile = items.value.find(i => i.name === "app_settings.json");
            
            // Convertir la configuración a JSON
            console.log("Serializando configuración a JSON...");
            const jsonContent = JSON.stringify(appSettings, null, 2);
            
            // Crear un Blob con el contenido
            console.log("Creando blob con el contenido...");
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const file = new File([blob], "app_settings.json", { type: 'application/json' });
            
            if (configFile) {
                // Actualizar el archivo existente
                console.log(`Actualizando archivo existente con ID: ${configFile.id}...`);
                try {
                    await this.graphClient.api(`/drives/${drive.id}/items/${configFile.id}/content`)
                        .put(file);
                    console.log("Archivo actualizado correctamente");
                } catch (updateError) {
                    console.error("Error al actualizar el archivo:", updateError);
                    throw updateError;
                }
            } else {
                // Crear un nuevo archivo
                console.log("Creando nuevo archivo app_settings.json...");
                try {
                    const result = await this.graphClient.api(`/drives/${drive.id}/root:/app_settings.json:/content`)
                        .put(file);
                    console.log("Archivo creado correctamente:", result);
                } catch (createError) {
                    console.error("Error al crear el archivo:", createError);
                    throw createError;
                }
            }
            
            console.log("Configuración guardada correctamente");
            return true;
        } catch (error) {
            console.error("Error al guardar la configuración:", error);
            throw error;
        }
    }

    /**
     * Convierte una URL de YouTube al formato de incrustación
     * @param {string} url URL de YouTube
     * @returns {string} URL en formato de incrustación
     */
    convertToEmbedUrl(url) {
        if (!url) return '';
        
        // Si ya es una URL de incrustación, devolverla tal cual
        if (url.includes('youtube.com/embed/')) {
            return url;
        }
        
        // Extraer el ID del video de diferentes formatos de URL de YouTube
        let videoId = '';
        
        try {
            // Formato: https://www.youtube.com/watch?v=VIDEO_ID
            if (url.includes('youtube.com/watch')) {
                const urlParams = new URLSearchParams(new URL(url).search);
                videoId = urlParams.get('v');
            } 
            // Formato: https://youtu.be/VIDEO_ID
            else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            }
            
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        } catch (e) {
            console.error("Error al convertir URL de YouTube:", e);
        }
        
        // Si no se pudo extraer el ID, devolver la URL original
        return url;
    }

    /**
     * Obtiene la configuración por defecto de la aplicación
     * @returns {Object} Configuración por defecto
     */
    getDefaultAppSettings() {
        return {
            Course: {
                VideoUrl: "https://www.youtube.com/embed/piP8XlGf3gc",
                Title: "¡Nuevo Curso Disponible!",
                Description: "Aprende a configurar y optimizar Windows como un profesional",
                Links: {
                    CardPayment: "https://link-to-payment.com",
                    WhatsApp: "https://wa.me/your_number"
                }
            },
            Videos: {
                DefenderVideoTitle: "Configurar Windows Defender",
                DefenderVideoUrl: "https://www.youtube.com/embed/piP8XlGf3gc",
                EsetVideoTitle: "Configurar Eset Security",
                EsetVideoUrl: "https://www.youtube.com/embed/OWpecpM3_mw",
                AntivirusWarning: "Recuerda desactivar tu antivirus antes de instalar aplicaciones"
            },
            TermsAndConditions: {
                Content: "Términos y Condiciones por defecto\n\n" +
                        "1. Uso del Software\n" +
                        "   - Este software es proporcionado 'tal cual', sin garantía de ningún tipo.\n" +
                        "   - El uso de este software implica la aceptación de estos términos.\n\n" +
                        "2. Responsabilidad\n" +
                        "   - El usuario es responsable del uso que haga del software.\n" +
                        "   - No nos hacemos responsables por daños causados por el mal uso del software.\n\n" +
                        "3. Propiedad Intelectual\n" +
                        "   - Todos los derechos están reservados.\n" +
                        "   - No se permite la redistribución sin autorización.",
                LastModified: new Date().toISOString()
            }
        };
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharePointGraph;
}





