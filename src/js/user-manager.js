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
     * Obtiene un usuario por su email
     * @param {string} email - Email del usuario
     * @returns {Object|null} Usuario encontrado o null si no existe
     */
    getUserByEmail(email) {
        return this.users.find(user => user.email === email) || null;
    }

    /**
     * Crea un nuevo usuario
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario creado
     */
    async createUser(userData) {
        try {
            // Validar datos del usuario
            if (!userData.email) {
                throw new Error('El email es obligatorio');
            }
            
            // Verificar si ya existe un usuario con el mismo email
            if (this.getUserByEmail(userData.email)) {
                throw new Error(`Ya existe un usuario con el email ${userData.email}`);
            }
            
            // Crear usuario en SharePoint
            const newUser = await this.spGraph.createUser({
                Email: userData.email,
                Password: userData.password || '',
                SubscriptionType: userData.subscriptionType || 'Gratuita',
                StartDate: userData.startDate || new Date().toISOString(),
                EndDate: userData.endDate || new Date().toISOString(),
                IsActive: userData.isActive === undefined ? true : userData.isActive,
                FailedLoginAttempts: 0
            });
            
            // Añadir a la lista local
            this.users.push(newUser);
            
            return newUser;
        } catch (error) {
            console.error('Error al crear usuario:', error);
            throw new Error(`Error al crear usuario: ${error.message}`);
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
                throw new Error(`No se encontró el usuario con ID ${id}`);
            }
            
            // Verificar si el email ya está en uso por otro usuario
            if (userData.email !== existingUser.email) {
                const userWithSameEmail = this.getUserByEmail(userData.email);
                if (userWithSameEmail && userWithSameEmail.id !== id) {
                    throw new Error(`El email ${userData.email} ya está en uso por otro usuario`);
                }
            }
            
            // Preparar datos para actualizar
            const updateData = {
                Email: userData.email,
                SubscriptionType: userData.subscriptionType || existingUser.subscriptionType || 'Gratuita',
                StartDate: userData.startDate || existingUser.startDate,
                EndDate: userData.endDate || existingUser.endDate,
                IsActive: userData.isActive === undefined ? existingUser.isActive : userData.isActive,
                FailedLoginAttempts: existingUser.failedLoginAttempts || 0
            };
            
            // Solo actualizar la contraseña si se proporciona una nueva
            if (userData.password) {
                updateData.Password = userData.password;
            }
            
            // Actualizar usuario en SharePoint
            const updatedUser = await this.spGraph.updateUser(id, updateData);
            
            // Actualizar en la lista local
            const index = this.users.findIndex(user => user.id === id);
            if (index !== -1) {
                this.users[index] = updatedUser;
            }
            
            return updatedUser;
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            throw new Error(`Error al actualizar usuario: ${error.message}`);
        }
    }

    /**
     * Elimina un usuario
     * @param {string} id - ID del usuario
     * @returns {Promise<void>}
     */
    async deleteUser(id) {
        try {
            // Verificar si el usuario existe
            const existingUser = this.getUserById(id);
            if (!existingUser) {
                throw new Error(`No se encontró el usuario con ID ${id}`);
            }
            
            // Eliminar usuario en SharePoint
            await this.spGraph.deleteUser(id);
            
            // Eliminar de la lista local
            this.users = this.users.filter(user => user.id !== id);
            
            console.log(`Usuario con ID ${id} eliminado correctamente`);
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            throw new Error(`Error al eliminar usuario: ${error.message}`);
        }
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}
