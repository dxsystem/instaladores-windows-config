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
            
            // Obtener la lista de usuarios
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/Usuarios/items?expand=fields`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    // La lista no existe, vamos a crearla
                    await this.createUsersList(siteId);
                    return []; // Devolver lista vacía por ahora
                }
                throw new Error(`Error al obtener usuarios: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Transformar los datos a un formato más amigable
            const users = data.value.map(item => {
                return {
                    id: item.id,
                    username: item.fields.Title || item.fields.Username || '',
                    email: item.fields.Email || '',
                    role: item.fields.Role || 'User',
                    status: item.fields.Status || 'Active',
                    lastLogin: item.fields.LastLogin || null
                };
            });
            
            console.log(`Se obtuvieron ${users.length} usuarios de SharePoint`);
            return users;
        } catch (error) {
            console.error('Error al obtener usuarios de SharePoint:', error);
            // En caso de error, devolver un array vacío para evitar errores en cascada
            return [];
        }
    }

    /**
     * Crea la lista de usuarios en SharePoint si no existe
     * @param {string} siteId - ID del sitio
     * @returns {Promise<string>} ID de la lista creada
     */
    async createUsersList(siteId) {
        try {
            const token = await this.auth.getAccessToken(true);
            
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    displayName: 'Usuarios',
                    list: {
                        template: 'genericList'
                    },
                    columns: [
                        {
                            name: 'Username',
                            text: {}
                        },
                        {
                            name: 'Email',
                            text: {}
                        },
                        {
                            name: 'Role',
                            text: {}
                        },
                        {
                            name: 'Status',
                            text: {}
                        },
                        {
                            name: 'LastLogin',
                            dateTime: {}
                        }
                    ]
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al crear la lista de usuarios: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Lista de usuarios creada correctamente:', data);
            return data.id;
        } catch (error) {
            console.error('Error al crear la lista de usuarios:', error);
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
            
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/Usuarios/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        Title: user.username, // Title es un campo obligatorio
                        Username: user.username,
                        Email: user.email,
                        Role: user.role || 'User',
                        Status: user.status || 'Active',
                        LastLogin: user.lastLogin || new Date().toISOString()
                    }
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al crear usuario: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Usuario creado correctamente:', data);
            
            return {
                id: data.id,
                username: data.fields.Username || data.fields.Title,
                email: data.fields.Email,
                role: data.fields.Role,
                status: data.fields.Status,
                lastLogin: data.fields.LastLogin
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
            
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/Usuarios/items/${id}/fields`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Title: userData.username, // Title es un campo obligatorio
                    Username: userData.username,
                    Email: userData.email,
                    Role: userData.role,
                    Status: userData.status,
                    LastLogin: userData.lastLogin || new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error al actualizar usuario: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Usuario actualizado correctamente:', data);
            
            return {
                id: id,
                username: data.Username || data.Title,
                email: data.Email,
                role: data.Role,
                status: data.Status,
                lastLogin: data.LastLogin
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
            
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/Usuarios/items/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error al eliminar usuario: ${response.status} ${response.statusText}`);
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
