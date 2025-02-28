/**
 * Clase para manejar las operaciones con Microsoft Graph API
 */
class SharePointGraph {
    /**
     * Constructor de la clase
     * @param {SharePointAuth} auth - Instancia de SharePointAuth para la autenticación
     */
    constructor(auth) {
        this.auth = auth;
        this.graphEndpoint = 'https://graph.microsoft.com/v1.0';
        this.siteUrl = 'ldcigroup.sharepoint.com:/sites/InstaladoresWindowsC:';
        this.folderPath = 'InstaladoresWindowsCOnline';
        this.listName = 'Users'; // Nombre de la lista en SharePoint (debe coincidir con el nombre en SharePointListService.cs)
    }

    /**
     * Obtiene el ID del sitio de SharePoint
     * @returns {Promise<string>} ID del sitio
     */
    async getSiteId() {
        try {
            const token = await this.auth.getAccessToken();
            
            // Obtener el sitio por URL
            const response = await fetch(`${this.graphEndpoint}/sites/${this.siteUrl}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error al obtener el sitio: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Sitio obtenido:', data);
            return data.id;
        } catch (error) {
            console.error('Error al obtener el ID del sitio:', error);
            throw error;
        }
    }

    /**
     * Obtiene la lista de usuarios desde SharePoint
     * @returns {Promise<Array>} Lista de usuarios
     */
    async getUsers() {
        try {
            const token = await this.auth.getAccessToken();
            const siteId = await this.getSiteId();
            
            // Intentar obtener la lista de usuarios
            try {
                // Primero verificar si la lista existe
                const listsResponse = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!listsResponse.ok) {
                    console.error(`Error al obtener listas: ${listsResponse.status} ${listsResponse.statusText}`);
                    throw new Error(`Error al obtener listas: ${listsResponse.status}`);
                }
                
                const listsData = await listsResponse.json();
                console.log('Listas disponibles:', listsData.value.map(list => list.displayName));
                
                const usersList = listsData.value.find(list => list.name === this.listName || list.displayName === this.listName);
                
                if (!usersList) {
                    console.error(`La lista ${this.listName} no existe.`);
                    throw new Error(`La lista ${this.listName} no existe.`);
                }
                
                console.log(`Lista de usuarios encontrada: ${usersList.displayName} (ID: ${usersList.id})`);
                
                // Obtener los items de la lista con expand=fields para obtener todos los campos
                const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${usersList.id}/items?expand=fields`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'HonorNonIndexedQueriesWarningMayFailRandomly' // Necesario para consultas no indexadas
                    }
                });
                
                if (!response.ok) {
                    console.error(`Error al obtener items de la lista: ${response.status} ${response.statusText}`);
                    throw new Error(`Error al obtener items de la lista: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Datos de la lista:', data);
                
                // Transformar los datos a un formato más amigable según los campos en SharePointListService.cs
                const users = data.value.map(item => {
                    const fields = item.fields;
                    return {
                        id: item.id,
                        username: fields.Title || fields.Email || '',
                        email: fields.Email || '',
                        password: fields.Password || '',
                        subscriptionType: fields.SubscriptionType || 'Gratuita',
                        startDate: fields.StartDate || new Date().toISOString(),
                        endDate: fields.EndDate || new Date().toISOString(),
                        isActive: fields.IsActive === true || fields.IsActive === 'true',
                        failedLoginAttempts: fields.FailedLoginAttempts || 0,
                        status: fields.IsActive === true || fields.IsActive === 'true' ? 'Active' : 'Inactive'
                    };
                });
                
                console.log(`Se obtuvieron ${users.length} usuarios de SharePoint`);
                return users;
            } catch (error) {
                console.error('Error al obtener usuarios de la lista:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error al obtener usuarios de SharePoint:', error);
            throw error;
        }
    }

    /**
     * Crea un nuevo usuario en SharePoint
     * @param {Object} user - Datos del usuario
     * @returns {Promise<Object>} Usuario creado
     */
    async createUser(user) {
        try {
            const token = await this.auth.getAccessToken(true);
            const siteId = await this.getSiteId();
            
            // Obtener la lista de usuarios
            const listsResponse = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!listsResponse.ok) {
                throw new Error(`Error al obtener listas: ${listsResponse.status}`);
            }
            
            const listsData = await listsResponse.json();
            const usersList = listsData.value.find(list => list.name === this.listName || list.displayName === this.listName);
            
            if (!usersList) {
                throw new Error(`La lista ${this.listName} no existe.`);
            }
            
            // Crear el usuario en la lista
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${usersList.id}/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        Title: user.email, // Campo requerido por SharePoint
                        Email: user.email,
                        Password: user.password || '',
                        SubscriptionType: user.subscriptionType || 'Gratuita',
                        StartDate: user.startDate || new Date().toISOString(),
                        EndDate: user.endDate || new Date().toISOString(),
                        IsActive: user.isActive || true,
                        FailedLoginAttempts: user.failedLoginAttempts || 0
                    }
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al crear usuario: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Usuario creado correctamente:', data);
            
            return {
                id: data.id,
                username: user.email,
                email: user.email,
                password: user.password,
                subscriptionType: user.subscriptionType,
                startDate: user.startDate,
                endDate: user.endDate,
                isActive: user.isActive,
                failedLoginAttempts: user.failedLoginAttempts,
                status: user.isActive ? 'Active' : 'Inactive'
            };
        } catch (error) {
            console.error('Error al crear usuario:', error);
            throw error;
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
            const token = await this.auth.getAccessToken(true);
            const siteId = await this.getSiteId();
            
            // Obtener la lista de usuarios
            const listsResponse = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!listsResponse.ok) {
                throw new Error(`Error al obtener listas: ${listsResponse.status}`);
            }
            
            const listsData = await listsResponse.json();
            const usersList = listsData.value.find(list => list.name === this.listName || list.displayName === this.listName);
            
            if (!usersList) {
                throw new Error(`La lista ${this.listName} no existe.`);
            }
            
            // Actualizar el usuario en la lista
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${usersList.id}/items/${id}/fields`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Title: userData.email, // Campo requerido por SharePoint
                    Email: userData.email,
                    Password: userData.password || '',
                    SubscriptionType: userData.subscriptionType || 'Gratuita',
                    StartDate: userData.startDate || new Date().toISOString(),
                    EndDate: userData.endDate || new Date().toISOString(),
                    IsActive: userData.isActive || true,
                    FailedLoginAttempts: userData.failedLoginAttempts || 0
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al actualizar usuario: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Usuario actualizado correctamente:', data);
            
            return {
                id: id,
                username: userData.email,
                email: userData.email,
                password: userData.password,
                subscriptionType: userData.subscriptionType,
                startDate: userData.startDate,
                endDate: userData.endDate,
                isActive: userData.isActive,
                failedLoginAttempts: userData.failedLoginAttempts,
                status: userData.isActive ? 'Active' : 'Inactive'
            };
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            throw error;
        }
    }

    /**
     * Elimina un usuario de SharePoint
     * @param {string} id - ID del usuario
     * @returns {Promise<boolean>} true si se eliminó correctamente
     */
    async deleteUser(id) {
        try {
            const token = await this.auth.getAccessToken(true);
            const siteId = await this.getSiteId();
            
            // Obtener la lista de usuarios
            const listsResponse = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!listsResponse.ok) {
                throw new Error(`Error al obtener listas: ${listsResponse.status}`);
            }
            
            const listsData = await listsResponse.json();
            const usersList = listsData.value.find(list => list.name === this.listName || list.displayName === this.listName);
            
            if (!usersList) {
                throw new Error(`La lista ${this.listName} no existe.`);
            }
            
            // Eliminar el usuario de la lista
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${usersList.id}/items/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error al eliminar usuario: ${response.status}`);
            }
            
            console.log('Usuario eliminado correctamente:', id);
            return true;
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            throw error;
        }
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharePointGraph;
}
