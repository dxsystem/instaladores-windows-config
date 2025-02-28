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
        this.listId = 'e3e2e8f4-b89c-4798-a9b1-0c53c4011cb5'; // ID fijo de la lista de usuarios
    }

    /**
     * Obtiene un token de acceso para Microsoft Graph
     * @returns {Promise<string>} Token de acceso
     */
    async getAccessToken() {
        return await this.auth.getAccessToken();
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
            const response = await fetch(`${this.graphEndpoint}/sites/root`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error al obtener el sitio: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            this.siteId = data.id;
            return this.siteId;
        } catch (error) {
            console.error('Error al obtener el ID del sitio:', error);
            throw new Error(`Error al obtener el ID del sitio: ${error.message}`);
        }
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
            
            let users = [];
            let nextLink = `${this.graphEndpoint}/sites/${siteId}/lists/${this.listId}/items?expand=fields&top=100`;
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
     * Procesa los items de usuario devueltos por la API
     * @param {Array} items - Items de la lista
     * @returns {Array} Lista de usuarios procesados
     * @private
     */
    _processUserItems(items) {
        return items.map(item => {
            const fields = item.fields;
            
            // Convertir fechas si existen
            let startDate = fields.StartDate;
            let endDate = fields.EndDate;
            
            if (startDate) {
                startDate = new Date(startDate).toISOString();
            }
            
            if (endDate) {
                endDate = new Date(endDate).toISOString();
            }
            
            return {
                id: item.id,
                email: fields.Email || '',
                subscriptionType: fields.SubscriptionType || 'Gratuita',
                startDate: startDate,
                endDate: endDate,
                isActive: fields.IsActive === true || fields.IsActive === 'true',
                failedLoginAttempts: fields.FailedLoginAttempts || 0
            };
        });
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
     * Crea un nuevo usuario en SharePoint
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario creado
     */
    async createUser(userData) {
        try {
            const token = await this.getAccessToken();
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
            const token = await this.getAccessToken();
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
            const token = await this.getAccessToken();
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
