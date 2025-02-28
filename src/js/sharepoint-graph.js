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
        this.listId = '3d452065-b0e1-4f9b-932b-36212fac8632'; // ID de la lista obtenido del log
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
            
            // Usar directamente el ID de la lista que conocemos
            try {
                console.log(`Usando ID de lista conocido: ${this.listId}`);
                
                // Obtener los items de la lista con expand=fields para obtener todos los campos
                const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${this.listId}/items?expand=fields`, {
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
                        email: fields.Email || '',
                        password: fields.Password || '',
                        subscriptionType: fields.SubscriptionType || 'Gratuita',
                        startDate: fields.StartDate || new Date().toISOString(),
                        endDate: fields.EndDate || new Date().toISOString(),
                        isActive: fields.IsActive === true || fields.IsActive === 'true',
                        failedLoginAttempts: fields.FailedLoginAttempts || 0
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
            
            // Usar directamente el ID de la lista que conocemos
            const listId = this.listId;
            
            // Crear el nuevo usuario
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${listId}/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        Title: user.Email, // Usar el email como título
                        Email: user.Email,
                        Password: user.Password,
                        SubscriptionType: user.SubscriptionType,
                        StartDate: user.StartDate,
                        EndDate: user.EndDate,
                        IsActive: user.IsActive,
                        FailedLoginAttempts: user.FailedLoginAttempts || 0
                    }
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error al crear usuario:', errorText);
                throw new Error(`Error al crear usuario: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Usuario creado:', data);
            
            // Devolver el usuario en el formato esperado
            return {
                id: data.id,
                email: data.fields.Email,
                password: data.fields.Password,
                subscriptionType: data.fields.SubscriptionType,
                startDate: data.fields.StartDate,
                endDate: data.fields.EndDate,
                isActive: data.fields.IsActive === true || data.fields.IsActive === 'true',
                failedLoginAttempts: data.fields.FailedLoginAttempts || 0
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
            
            // Usar directamente el ID de la lista que conocemos
            const listId = this.listId;
            
            // Preparar los campos a actualizar
            const fields = {
                Title: userData.Email, // Usar el email como título
                Email: userData.Email,
                SubscriptionType: userData.SubscriptionType,
                StartDate: userData.StartDate,
                EndDate: userData.EndDate,
                IsActive: userData.IsActive,
                FailedLoginAttempts: userData.FailedLoginAttempts || 0
            };
            
            // Añadir la contraseña solo si se proporciona
            if (userData.Password) {
                fields.Password = userData.Password;
            }
            
            // Actualizar el usuario
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${listId}/items/${id}/fields`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'If-Match': '*' // Ignorar conflictos de concurrencia
                },
                body: JSON.stringify(fields)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error al actualizar usuario:', errorText);
                throw new Error(`Error al actualizar usuario: ${response.status}`);
            }
            
            // Obtener el usuario actualizado
            const getUserResponse = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${listId}/items/${id}?expand=fields`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!getUserResponse.ok) {
                throw new Error(`Error al obtener usuario actualizado: ${getUserResponse.status}`);
            }
            
            const data = await getUserResponse.json();
            console.log('Usuario actualizado:', data);
            
            // Devolver el usuario en el formato esperado
            return {
                id: data.id,
                email: data.fields.Email,
                password: data.fields.Password || '',
                subscriptionType: data.fields.SubscriptionType,
                startDate: data.fields.StartDate,
                endDate: data.fields.EndDate,
                isActive: data.fields.IsActive === true || data.fields.IsActive === 'true',
                failedLoginAttempts: data.fields.FailedLoginAttempts || 0
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
            
            // Usar directamente el ID de la lista que conocemos
            const listId = this.listId;
            
            // Eliminar el usuario
            const response = await fetch(`${this.graphEndpoint}/sites/${siteId}/lists/${listId}/items/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'If-Match': '*' // Ignorar conflictos de concurrencia
                }
            });
            
            if (!response.ok && response.status !== 204) { // 204 No Content es éxito para DELETE
                const errorText = await response.text();
                console.error('Error al eliminar usuario:', errorText);
                throw new Error(`Error al eliminar usuario: ${response.status}`);
            }
            
            console.log(`Usuario con ID ${id} eliminado correctamente`);
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
