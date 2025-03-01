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
            
            // Construir la URL para obtener el archivo
            // Probar diferentes rutas para encontrar el archivo
            const possiblePaths = [
                `/drive/root:/InstaladoresWindowsCOnline/${fileName}:/content`,
                `/drive/root:/${fileName}:/content`,
                `/drives/b!Y4G7xKhA7ESxGzVWFoZqEoZ6a3vFasYGon0cFSRZKN7Nh-Zt_Ej8QZGfLnQFnGFl/root:/${fileName}:/content`,
                `/drives/b!Y4G7xKhA7ESxGzVWFoZqEoZ6a3vFasYGon0cFSRZKN7Nh-Zt_Ej8QZGfLnQFnGFl/items/root:/${fileName}:/content`
            ];
            
            let content = null;
            let response = null;
            
            // Intentar cada ruta hasta encontrar una que funcione
            for (const path of possiblePaths) {
                const url = `${this.graphEndpoint}/sites/${this.siteId}${path}`;
                console.log(`Intentando obtener archivo con URL: ${url}`);
                
                try {
                    response = await fetch(url, {
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
            
            // Asegurarse de que tenemos el siteId
            if (!this.siteId) {
                await this.getSiteId();
            }
            
            // Obtener token de acceso con permisos de escritura
            const token = await this.getAccessToken(true);
            
            // Construir la URL para guardar el archivo
            // Probar diferentes rutas para guardar el archivo
            const possiblePaths = [
                `/drive/root:/InstaladoresWindowsCOnline/${fileName}:/content`,
                `/drive/root:/${fileName}:/content`,
                `/drives/b!Y4G7xKhA7ESxGzVWFoZqEoZ6a3vFasYGon0cFSRZKN7Nh-Zt_Ej8QZGfLnQFnGFl/root:/${fileName}:/content`,
                `/drives/b!Y4G7xKhA7ESxGzVWFoZqEoZ6a3vFasYGon0cFSRZKN7Nh-Zt_Ej8QZGfLnQFnGFl/items/root:/${fileName}:/content`
            ];
            
            let success = false;
            
            // Intentar cada ruta hasta encontrar una que funcione
            for (const path of possiblePaths) {
                const url = `${this.graphEndpoint}/sites/${this.siteId}${path}`;
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
            
            // Intentar primero con el ID de carpeta directo
            try {
                const folderUrl = `${this.graphEndpoint}/drives/${driveId}/items/${folderId}/children`;
                console.log(`Intentando obtener archivos con ID de carpeta directo: ${folderUrl}`);
                
                const folderResponse = await fetch(folderUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (folderResponse.ok) {
                    const folderData = await folderResponse.json();
                    console.log(`Se encontraron ${folderData.value?.length || 0} archivos en la carpeta exe usando ID directo`);
                    
                    // Procesar los archivos
                    const files = folderData.value?.map(file => ({
                        id: file.id,
                        name: file.name,
                        size: file.size,
                        lastModified: file.lastModifiedDateTime,
                        downloadUrl: file['@microsoft.graph.downloadUrl'],
                        webUrl: file.webUrl
                    })) || [];
                    
                    return files;
                } else {
                    console.log(`Acceso directo por ID no funcionó: ${folderResponse.status} ${folderResponse.statusText}`);
                }
            } catch (directError) {
                console.log('Error al acceder directamente por ID:', directError.message);
            }
            
            // Si el acceso directo falló, intentar con la ruta completa usando el driveId
            try {
                const driveUrl = `${this.graphEndpoint}/drives/${driveId}/root:/InstaladoresWindowsCOnline/exe:/children`;
                console.log(`Intentando obtener archivos con driveId y ruta: ${driveUrl}`);
                
                const driveResponse = await fetch(driveUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (driveResponse.ok) {
                    const driveData = await driveResponse.json();
                    console.log(`Se encontraron ${driveData.value?.length || 0} archivos en la carpeta exe usando driveId y ruta`);
                    
                    // Procesar los archivos
                    const files = driveData.value?.map(file => ({
                        id: file.id,
                        name: file.name,
                        size: file.size,
                        lastModified: file.lastModifiedDateTime,
                        downloadUrl: file['@microsoft.graph.downloadUrl'],
                        webUrl: file.webUrl
                    })) || [];
                    
                    return files;
                } else {
                    console.log(`Acceso por driveId y ruta no funcionó: ${driveResponse.status} ${driveResponse.statusText}`);
                }
            } catch (driveError) {
                console.log('Error al acceder por driveId y ruta:', driveError.message);
            }
            
            // Si todo lo anterior falló, intentar con búsqueda
            try {
                const searchUrl = `${this.graphEndpoint}/drives/${driveId}/root/search(q='.exe')`;
                console.log(`Intentando buscar archivos .exe con URL: ${searchUrl}`);
                
                const searchResponse = await fetch(searchUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    console.log(`Se encontraron ${searchData.value?.length || 0} archivos .exe mediante búsqueda`);
                    
                    if (searchData.value && searchData.value.length > 0) {
                        // Filtrar solo archivos .exe, .msi, .bat, etc.
                        const executableFiles = searchData.value.filter(file => 
                            file.name.endsWith('.exe') || 
                            file.name.endsWith('.msi') || 
                            file.name.endsWith('.bat') || 
                            file.name.endsWith('.cmd') ||
                            file.name.endsWith('.zip') ||
                            file.name.endsWith('.rar')
                        );
                        
                        const files = executableFiles.map(file => ({
                            id: file.id,
                            name: file.name,
                            size: file.size,
                            lastModified: file.lastModifiedDateTime,
                            downloadUrl: file['@microsoft.graph.downloadUrl'],
                            webUrl: file.webUrl
                        }));
                        
                        return files;
                    }
                } else {
                    console.log(`Búsqueda no funcionó: ${searchResponse.status} ${searchResponse.statusText}`);
                }
            } catch (searchError) {
                console.log('Error al buscar archivos:', searchError.message);
            }
            
            // Si llegamos aquí, no se encontraron archivos con ningún método
            console.log('No se pudieron encontrar archivos en la carpeta exe con ningún método');
            return [];
        } catch (error) {
            console.error('Error al obtener archivos de la carpeta exe:', error);
            return [];
        }
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharePointGraph;
}
