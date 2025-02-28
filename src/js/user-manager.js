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
        this.filteredUsers = [];
        this.isLoading = false;
        this.error = null;
        this.searchTerm = '';
        this.filters = {
            subscriptionType: 'Todos',
            status: 'Todos',
            startDateFrom: null,
            endDateTo: null
        };
        this.loadingProgress = {
            loaded: 0,
            total: 0,
            page: 0,
            message: ''
        };
    }

    /**
     * Inicializa el gestor de usuarios
     * @param {Function} progressCallback - Función de callback para reportar progreso (opcional)
     * @returns {Promise<void>}
     */
    async initialize(progressCallback) {
        try {
            this.isLoading = true;
            this.error = null;
            
            // Cargar usuarios directamente desde SharePoint
            await this.loadUsersFromSharePoint(progressCallback);
            
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
     * @param {Function} progressCallback - Función de callback para reportar progreso (opcional)
     * @returns {Promise<Array>} Lista de usuarios
     */
    async loadUsers(progressCallback) {
        return this.loadUsersFromSharePoint(progressCallback);
    }

    /**
     * Carga los usuarios desde SharePoint
     * @param {Function} progressCallback - Función de callback para reportar progreso (opcional)
     * @returns {Promise<Array>} Lista de usuarios
     */
    async loadUsersFromSharePoint(progressCallback) {
        try {
            console.log('Cargando usuarios desde SharePoint...');
            
            // Función para manejar el progreso
            const handleProgress = (progress) => {
                this.loadingProgress = progress;
                if (typeof progressCallback === 'function') {
                    progressCallback(progress);
                }
            };
            
            // Obtener usuarios con paginación
            this.users = await this.spGraph.getUsers(handleProgress);
            this.applyFiltersAndSearch(); // Aplicar filtros y búsqueda actuales
            
            console.log(`Se cargaron ${this.users.length} usuarios desde SharePoint`);
            return this.users;
        } catch (error) {
            console.error('Error al cargar usuarios desde SharePoint:', error);
            this.error = `Error al cargar usuarios: ${error.message}`;
            return [];
        }
    }

    /**
     * Busca usuarios por término de búsqueda
     * @param {string} searchTerm - Término de búsqueda
     * @returns {Array} Lista de usuarios filtrados
     */
    searchUsers(searchTerm) {
        this.searchTerm = searchTerm;
        return this.applyFiltersAndSearch();
    }

    /**
     * Aplica filtros a los usuarios
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Lista de usuarios filtrados
     */
    applyFilters(filters) {
        // Actualizar filtros
        if (filters) {
            this.filters = { ...this.filters, ...filters };
        }
        
        return this.applyFiltersAndSearch();
    }

    /**
     * Aplica los filtros y búsqueda actuales
     * @returns {Array} Lista de usuarios filtrados
     */
    applyFiltersAndSearch() {
        this.filteredUsers = this.spGraph.searchUsers(this.searchTerm, this.users, this.filters);
        return this.filteredUsers;
    }

    /**
     * Obtiene todos los usuarios (filtrados si hay búsqueda o filtros activos)
     * @returns {Array} Lista de usuarios
     */
    getAllUsers() {
        return this.filteredUsers.length > 0 ? [...this.filteredUsers] : [...this.users];
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
            
            // Actualizar lista filtrada
            this.applyFiltersAndSearch();
            
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
            
            // Actualizar lista filtrada
            this.applyFiltersAndSearch();
            
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
            
            // Actualizar lista filtrada
            this.applyFiltersAndSearch();
            
            console.log(`Usuario con ID ${id} eliminado correctamente`);
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            throw new Error(`Error al eliminar usuario: ${error.message}`);
        }
    }
    
    /**
     * Obtiene el progreso de carga actual
     * @returns {Object} Objeto con información de progreso
     */
    getLoadingProgress() {
        return { ...this.loadingProgress };
    }
    
    /**
     * Obtiene los tipos de suscripción únicos de los usuarios
     * @returns {Array} Lista de tipos de suscripción
     */
    getSubscriptionTypes() {
        const types = new Set();
        this.users.forEach(user => {
            if (user.subscriptionType) {
                types.add(user.subscriptionType);
            }
        });
        return Array.from(types);
    }
    
    /**
     * Resetea todos los filtros y búsqueda
     * @returns {Array} Lista completa de usuarios
     */
    resetFilters() {
        this.searchTerm = '';
        this.filters = {
            subscriptionType: 'Todos',
            status: 'Todos',
            startDateFrom: null,
            endDateTo: null
        };
        this.filteredUsers = [...this.users];
        return this.filteredUsers;
    }

    /**
     * Renderiza la tabla de usuarios
     */
    renderUsers() {
        const userTableBody = document.getElementById('userTableBody');
        if (!userTableBody) return;
        
        userTableBody.innerHTML = '';
        
        const usersToRender = this.filteredUsers.length > 0 ? this.filteredUsers : this.users;
        
        if (usersToRender.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="7" class="text-center">No hay usuarios para mostrar</td>
            `;
            userTableBody.appendChild(tr);
            return;
        }
        
        usersToRender.forEach(user => {
            const tr = document.createElement('tr');
            
            // Determinar si el usuario está activo
            const isActive = user.isActive;
            const statusBadge = isActive 
                ? '<span class="badge bg-success">Activo</span>' 
                : '<span class="badge bg-danger">Inactivo</span>';
            
            // Formatear fechas
            const startDate = new Date(user.startDate).toLocaleDateString();
            const endDate = new Date(user.endDate).toLocaleDateString();
            
            tr.innerHTML = `
                <td>${user.email}</td>
                <td>${user.subscriptionType}</td>
                <td>${startDate}</td>
                <td>${endDate}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            userTableBody.appendChild(tr);
        });
        
        // Configurar eventos para los botones de editar y eliminar
        this.setupUserTableEvents();
    }
    
    /**
     * Configura los eventos de la tabla de usuarios
     */
    setupUserTableEvents() {
        const editButtons = document.querySelectorAll('.edit-user');
        const deleteButtons = document.querySelectorAll('.delete-user');
        
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = e.currentTarget.getAttribute('data-id');
                this.editUser(userId);
            });
        });
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = e.currentTarget.getAttribute('data-id');
                this.deleteUser(userId);
            });
        });
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}
