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
            const token = await this.getAccessToken();
            const siteId = await this.getSiteId();
            const listId = await this.getListId();
            
            let users = [];
            let nextLink = `${this.graphEndpoint}/sites/${siteId}/lists/${listId}/items?expand=fields&top=100`;
            let page = 1;
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
            
            reportProgress(0, 0, 'Iniciando carga de usuarios...');
            
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
            const firstPageUsers = this._processUserItems(initialData.value);
            users = users.concat(firstPageUsers);
            
            reportProgress(users.length, totalItems, `Cargados ${users.length} de aproximadamente ${totalItems} usuarios...`);
            
            // Obtener páginas adicionales si existen
            nextLink = initialData['@odata.nextLink'];
            
            while (nextLink) {
                page++;
                
                reportProgress(users.length, totalItems, `Cargando página ${page}...`);
                
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
                }
                
                reportProgress(users.length, totalItems, `Cargados ${users.length} de aproximadamente ${totalItems} usuarios...`);
                
                // Actualizar nextLink para la siguiente iteración
                nextLink = data['@odata.nextLink'];
            }
            
            reportProgress(users.length, users.length, `Carga completada: ${users.length} usuarios`);
            
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
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharePointGraph;
}
