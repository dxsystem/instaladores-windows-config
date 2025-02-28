/**
 * Clase para gestionar los usuarios de la aplicación
 */
class UserManager {
    /**
     * Constructor de la clase
     * @param {SharePointGraph} spGraph - Instancia de SharePointGraph para interactuar con SharePoint
     */
    constructor(spGraph) {
        this.spGraph = spGraph;
        this.users = [];
        this.isLoading = false;
        this.error = null;
    }

    /**
     * Inicializa el gestor de usuarios
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            this.isLoading = true;
            this.error = null;
            
            // Cargar usuarios directamente desde SharePoint
            await this.loadUsersFromSharePoint();
            
            this.isLoading = false;
            console.log('UserManager inicializado correctamente');
        } catch (error) {
            this.isLoading = false;
            this.error = error.message;
            console.error('Error al inicializar UserManager:', error);
        }
    }

    /**
     * Carga los usuarios desde SharePoint
     * @returns {Promise<Array>} Lista de usuarios
     */
    async loadUsersFromSharePoint() {
        try {
            console.log('Cargando usuarios desde SharePoint...');
            this.users = await this.spGraph.getUsers();
            console.log(`Se cargaron ${this.users.length} usuarios desde SharePoint`);
            return this.users;
        } catch (error) {
            console.error('Error al cargar usuarios desde SharePoint:', error);
            this.error = `Error al cargar usuarios: ${error.message}`;
            return [];
        }
    }

    /**
     * Obtiene todos los usuarios
     * @returns {Array} Lista de usuarios
     */
    getAllUsers() {
        return [...this.users];
    }

    /**
     * Obtiene un usuario por su ID
     * @param {string} id - ID del usuario
     * @returns {Object|null} Usuario encontrado o null si no existe
     */
    getUserById(id) {
        return this.users.find(user => user.id === id) || null;
    }

    /**
     * Obtiene un usuario por su nombre de usuario
     * @param {string} username - Nombre de usuario
     * @returns {Object|null} Usuario encontrado o null si no existe
     */
    getUserByUsername(username) {
        return this.users.find(user => user.username === username) || null;
    }

    /**
     * Crea un nuevo usuario
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario creado
     */
    async createUser(userData) {
        try {
            // Validar datos del usuario
            if (!userData.username || !userData.email) {
                throw new Error('El nombre de usuario y el email son obligatorios');
            }
            
            // Verificar si ya existe un usuario con el mismo nombre
            if (this.getUserByUsername(userData.username)) {
                throw new Error(`Ya existe un usuario con el nombre ${userData.username}`);
            }
            
            // Crear usuario en SharePoint
            const newUser = await this.spGraph.createUser(userData);
            
            // Añadir a la lista local
            this.users.push(newUser);
            
            console.log('Usuario creado:', newUser);
            return newUser;
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
            // Verificar si el usuario existe
            const existingUser = this.getUserById(id);
            if (!existingUser) {
                throw new Error(`No se encontró un usuario con el ID ${id}`);
            }
            
            // Actualizar usuario en SharePoint
            const updatedUser = await this.spGraph.updateUser(id, userData);
            
            // Actualizar en la lista local
            const index = this.users.findIndex(user => user.id === id);
            if (index !== -1) {
                this.users[index] = updatedUser;
            }
            
            console.log('Usuario actualizado:', updatedUser);
            return updatedUser;
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
            // Verificar si el usuario existe
            const existingUser = this.getUserById(id);
            if (!existingUser) {
                throw new Error(`No se encontró un usuario con el ID ${id}`);
            }
            
            // Eliminar usuario en SharePoint
            await this.spGraph.deleteUser(id);
            
            // Eliminar de la lista local
            this.users = this.users.filter(user => user.id !== id);
            
            console.log('Usuario eliminado:', id);
            return true;
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            throw error;
        }
    }

    /**
     * Refresca la lista de usuarios desde SharePoint
     * @returns {Promise<Array>} Lista actualizada de usuarios
     */
    async refreshUsers() {
        try {
            this.isLoading = true;
            this.error = null;
            
            await this.loadUsersFromSharePoint();
            
            this.isLoading = false;
            return this.users;
        } catch (error) {
            this.isLoading = false;
            this.error = error.message;
            console.error('Error al refrescar usuarios:', error);
            throw error;
        }
    }

    /**
     * Obtiene el estado actual del gestor de usuarios
     * @returns {Object} Estado actual
     */
    getStatus() {
        return {
            isLoading: this.isLoading,
            error: this.error,
            userCount: this.users.length
        };
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}
