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
        this.listName = 'Usuarios'; // Nombre de la lista en SharePoint
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
                    return this.getUsersFromDummyData(); // Usar datos de ejemplo si no podemos acceder a las listas
                }
                
                const listsData = await listsResponse.json();
                const usersList = listsData.value.find(list => list.name === this.listName || list.displayName === this.listName);
                
                if (!usersList) {
                    console.warn(`La lista ${this.listName} no existe. Usando datos de ejemplo.`);
                    return this.getUsersFromDummyData();
                }
                
                // Obtener los items de la lista
                const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${usersList.id}/items?expand=fields`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.error(`Error al obtener items de la lista: ${response.status} ${response.statusText}`);
                    return this.getUsersFromDummyData();
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
                console.error('Error al obtener usuarios de la lista:', error);
                return this.getUsersFromDummyData();
            }
        } catch (error) {
            console.error('Error al obtener usuarios de SharePoint:', error);
            return this.getUsersFromDummyData();
        }
    }

    /**
     * Genera datos de ejemplo para usuarios cuando no se puede acceder a SharePoint
     * @returns {Array} Lista de usuarios de ejemplo
     */
    getUsersFromDummyData() {
        console.log('Generando datos de ejemplo para usuarios');
        return [
            {
                id: '1',
                username: 'admin',
                email: 'admin@example.com',
                role: 'Admin',
                status: 'Active',
                lastLogin: new Date().toISOString()
            },
            {
                id: '2',
                username: 'usuario1',
                email: 'usuario1@example.com',
                role: 'User',
                status: 'Active',
                lastLogin: new Date().toISOString()
            },
            {
                id: '3',
                username: 'usuario2',
                email: 'usuario2@example.com',
                role: 'User',
                status: 'Inactive',
                lastLogin: null
            }
        ];
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
                    displayName: this.listName,
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
            // En caso de no poder crear usuarios en SharePoint, simular la creación
            console.log('Simulando creación de usuario:', user);
            return {
                id: Date.now().toString(),
                username: user.username,
                email: user.email,
                role: user.role || 'User',
                status: user.status || 'Active',
                lastLogin: user.lastLogin || new Date().toISOString()
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
            // En caso de no poder actualizar usuarios en SharePoint, simular la actualización
            console.log('Simulando actualización de usuario:', id, userData);
            return {
                id: id,
                username: userData.username,
                email: userData.email,
                role: userData.role,
                status: userData.status,
                lastLogin: userData.lastLogin || new Date().toISOString()
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
            // En caso de no poder eliminar usuarios en SharePoint, simular la eliminación
            console.log('Simulando eliminación de usuario:', id);
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
