/**
 * Clase para manejar las operaciones de usuarios con SharePoint
 */
class SharePointUserManager {
    /**
     * Constructor de la clase
     * @param {SharePointAuth} auth - Instancia de SharePointAuth para la autenticación
     */
    constructor(auth) {
        this.auth = auth;
        this.graphEndpoint = 'https://graph.microsoft.com/v1.0';
        this.config = null;
        this.siteId = null;
        this.listId = null;
    }

    /**
     * Inicializa el administrador de usuarios
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Cargar la configuración
            await this.loadConfig();
            
            // Obtener el ID del sitio
            await this.getSiteId();
            
            // Asegurar que existe la lista de usuarios
            await this.ensureUserList();
            
            console.log('SharePointUserManager inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar SharePointUserManager:', error);
            throw error;
        }
    }

    /**
     * Carga la configuración desde el archivo JSON
     * @returns {Promise<void>}
     */
    async loadConfig() {
        try {
            const response = await fetch('./api/sharepoint-config.json');
            if (!response.ok) {
                throw new Error(`Error al cargar la configuración: ${response.status} ${response.statusText}`);
            }
            
            this.config = await response.json();
            console.log('Configuración cargada:', this.config);
        } catch (error) {
            console.error('Error al cargar la configuración:', error);
            throw error;
        }
    }

    /**
     * Obtiene el ID del sitio de SharePoint
     * @returns {Promise<string>} ID del sitio
     */
    async getSiteId() {
        try {
            const token = await this.auth.getAccessToken();
            
            // Obtener el sitio raíz
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
            console.log('ID del sitio obtenido:', this.siteId);
            return this.siteId;
        } catch (error) {
            console.error('Error al obtener el ID del sitio:', error);
            throw error;
        }
    }

    /**
     * Asegura que existe la lista de usuarios en SharePoint
     * @returns {Promise<string>} ID de la lista
     */
    async ensureUserList() {
        try {
            const token = await this.auth.getAccessToken(true);
            
            // Verificar si la lista ya existe
            try {
                const checkResponse = await fetch(`${this.graphEndpoint}/sites/${this.siteId}/lists/${this.config.userListName}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (checkResponse.ok) {
                    const data = await checkResponse.json();
                    this.listId = data.id;
                    console.log('Lista de usuarios existente encontrada:', this.listId);
                    return this.listId;
                }
            } catch (error) {
                console.log('La lista de usuarios no existe, se creará una nueva');
            }
            
            // Crear la lista si no existe
            const createResponse = await fetch(`${this.graphEndpoint}/sites/${this.siteId}/lists`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    displayName: this.config.userListName,
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
            
            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Error al crear la lista de usuarios: ${createResponse.status} ${createResponse.statusText} - ${errorText}`);
            }
            
            const data = await createResponse.json();
            this.listId = data.id;
            console.log('Lista de usuarios creada correctamente:', this.listId);
            return this.listId;
        } catch (error) {
            console.error('Error al asegurar la lista de usuarios:', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los usuarios de la lista
     * @returns {Promise<Array>} Lista de usuarios
     */
    async getAllUsers() {
        try {
            const token = await this.auth.getAccessToken();
            
            const response = await fetch(`${this.graphEndpoint}/sites/${this.siteId}/lists/${this.listId}/items?expand=fields`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error al obtener usuarios: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const users = data.value.map(item => {
                return {
                    id: item.id,
                    username: item.fields.Username,
                    email: item.fields.Email,
                    role: item.fields.Role,
                    status: item.fields.Status,
                    lastLogin: item.fields.LastLogin
                };
            });
            
            console.log(`Se obtuvieron ${users.length} usuarios`);
            return users;
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            throw error;
        }
    }

    /**
     * Crea un nuevo usuario en la lista
     * @param {Object} user - Datos del usuario
     * @returns {Promise<Object>} Usuario creado
     */
    async createUser(user) {
        try {
            const token = await this.auth.getAccessToken(true);
            
            const response = await fetch(`${this.graphEndpoint}/sites/${this.siteId}/lists/${this.listId}/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
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
                username: data.fields.Username,
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
     * Actualiza un usuario existente
     * @param {string} id - ID del usuario
     * @param {Object} userData - Datos actualizados del usuario
     * @returns {Promise<Object>} Usuario actualizado
     */
    async updateUser(id, userData) {
        try {
            const token = await this.auth.getAccessToken(true);
            
            const response = await fetch(`${this.graphEndpoint}/sites/${this.siteId}/lists/${this.listId}/items/${id}/fields`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
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
                username: data.Username,
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
     * Elimina un usuario
     * @param {string} id - ID del usuario
     * @returns {Promise<boolean>} true si se eliminó correctamente
     */
    async deleteUser(id) {
        try {
            const token = await this.auth.getAccessToken(true);
            
            const response = await fetch(`${this.graphEndpoint}/sites/${this.siteId}/lists/${this.listId}/items/${id}`, {
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
    module.exports = SharePointUserManager;
}
