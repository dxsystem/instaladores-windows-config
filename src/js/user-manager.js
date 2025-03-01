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
            await this.loadUsers(progressCallback);
            
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
        try {
            // Limpiar errores previos
            this.error = null;
            
            // Mostrar mensaje de carga
            if (typeof updateLoadingProgress === 'function') {
                updateLoadingProgress({
                    loaded: 0,
                    total: 100,
                    message: 'Conectando con SharePoint...'
                });
            }
            
            // Obtener usuarios desde SharePoint
            const users = await this.spGraph.getUsers(progress => {
                if (typeof updateLoadingProgress === 'function') {
                    updateLoadingProgress(progress);
                }
            });
            
            // Actualizar lista de usuarios
            this.users = users.map(user => {
                return {
                    id: user.id,
                    email: user.email,
                    password: '',
                    subscriptionType: user.subscriptionType || 'Gratuita',
                    startDate: user.startDate,
                    endDate: user.endDate,
                    isActive: user.isActive === undefined ? true : user.isActive,
                    failedLoginAttempts: user.failedLoginAttempts || 0
                };
            });
            
            // Aplicar filtros
            this.applyFiltersAndSearch();
            
            console.log(`Se cargaron ${this.users.length} usuarios desde SharePoint`);
            return this.users;
        } catch (error) {
            console.error('Error al cargar usuarios desde SharePoint:', error);
            this.error = `Error al cargar usuarios: ${error.message}`;
            return [];
        }
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
        if (!id) {
            console.warn('getUserById: ID inválido', id);
            return null;
        }
        
        // Convertir a string para comparación segura
        const idStr = String(id);
        console.log(`Buscando usuario con ID: ${idStr}`);
        
        const user = this.users.find(user => {
            if (!user || !user.id) return false;
            return String(user.id) === idStr;
        });
        
        if (user) {
            console.log(`Usuario encontrado por ID ${idStr}: ${user.email}`);
        } else {
            console.log(`No se encontró usuario con ID ${idStr}`);
        }
        
        return user || null;
    }

    /**
     * Obtiene un usuario por su email
     * @param {string} email - Email del usuario
     * @returns {Object|null} Usuario encontrado o null
     */
    getUserByEmail(email) {
        if (!email || typeof email !== 'string') {
            return null;
        }
        
        const emailLower = email.toLowerCase().trim();
        
        // Buscar usuario en la lista local
        const user = this.users.find(user => {
            if (!user || !user.email || typeof user.email !== 'string') return false;
            return user.email.toLowerCase().trim() === emailLower;
        });
        
        return user || null;
    }

    /**
     * Busca un usuario por su email (consulta a SharePoint)
     * @param {string} email - Email del usuario
     * @returns {Promise<Object|null>} Usuario encontrado o null si no existe
     */
    async findUserByEmail(email) {
        try {
            if (!email) return null;
            
            // Primero buscar en la caché local
            const cachedUser = this.getUserByEmail(email);
            if (cachedUser) return cachedUser;
            
            // Si no está en caché, buscar en SharePoint
            const filter = `fields/Email eq '${email}'`;
            const users = await this.spGraph.getUsersByFilter(filter);
            
            return users && users.length > 0 ? users[0] : null;
        } catch (error) {
            console.error(`Error al buscar usuario por email ${email}:`, error);
            return null;
        }
    }
    
    /**
     * Busca múltiples usuarios por sus emails (usando la lista local)
     * @param {Array<string>} emails - Lista de emails de usuarios
     * @returns {Promise<Array<Object>>} Lista de usuarios encontrados
     */
    async findUsersByEmails(emails) {
        try {
            if (!emails || emails.length === 0) return [];
            
            console.log(`Buscando ${emails.length} usuarios por email en la lista local...`);
            console.log('Lista completa de emails a buscar:', emails);
            
            // Filtrar emails vacíos y duplicados
            const uniqueEmails = [...new Set(emails.filter(email => email))];
            console.log(`Emails únicos a buscar: ${uniqueEmails.length}`);
            
            // Asegurarse de que tenemos usuarios cargados
            if (this.users.length === 0) {
                console.log('No hay usuarios cargados en la lista local. Cargando usuarios...');
                await this.loadUsersFromSharePoint();
            }
            
            console.log(`Comparando con ${this.users.length} usuarios ya cargados`);
            
            // Buscar usuarios por email en la lista local
            const result = [];
            const notFoundEmails = [];
            
            uniqueEmails.forEach(email => {
                if (!email) return;
                
                const emailLower = email.toLowerCase().trim();
                
                // Buscar en la lista local de usuarios
                const foundUser = this.users.find(user => {
                    if (!user || !user.email) return false;
                    return user.email.toLowerCase().trim() === emailLower;
                });
                
                if (foundUser) {
                    console.log(`Usuario encontrado en la lista local: ${email} (ID: ${foundUser.id})`);
                    result.push(foundUser);
                } else {
                    console.log(`Usuario no encontrado en la lista local: ${email}`);
                    notFoundEmails.push(email);
                }
            });
            
            console.log(`Total de usuarios encontrados: ${result.length}`);
            console.log('Emails de usuarios encontrados:', result.map(u => u.email));
            
            if (notFoundEmails.length > 0) {
                console.log(`No se encontraron ${notFoundEmails.length} emails:`, notFoundEmails);
            }
            
            return result;
        } catch (error) {
            console.error(`Error al buscar usuarios por emails:`, error);
            return [];
        }
    }

    /**
     * Crea un nuevo usuario o actualiza uno existente si ya existe con el mismo email
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario creado o actualizado
     */
    async createUser(userData) {
        try {
            // Validar datos del usuario
            if (!userData.email) {
                throw new Error('El email es obligatorio');
            }
            
            console.log(`Intentando crear/actualizar usuario: ${userData.email}`);
            
            // Verificar si ya existe un usuario con el mismo email
            const existingUser = this.getUserByEmail(userData.email);
            
            if (existingUser) {
                console.log(`Ya existe un usuario con el email ${userData.email}, ID: ${existingUser.id}. Actualizando...`);
                
                // Actualizar el usuario existente
                return await this.updateUser({
                    ...userData,
                    id: existingUser.id
                });
            }
            
            console.log(`Creando nuevo usuario: ${userData.email}`);
            
            // Crear usuario en SharePoint
            const newUser = await this.spGraph.createUser({
                Email: userData.email,
                Password: userData.password || '',
                SubscriptionType: userData.subscriptionType || 'Gratuita',
                StartDate: userData.startDate || new Date().toISOString(),
                EndDate: userData.endDate || new Date().toISOString(),
                IsActive: userData.isActive === undefined ? true : userData.isActive
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
     * @param {Object} userData - Datos del usuario a actualizar
     * @returns {Promise<Object>} Usuario actualizado
     */
    async updateUser(userData) {
        try {
            if (!userData) {
                throw new Error('Datos de usuario no proporcionados');
            }
            
            // Asegurarse de que tenemos un ID válido
            const id = userData.id;
            if (!id) {
                throw new Error('ID de usuario no proporcionado');
            }
            
            console.log(`Actualizando usuario con ID: ${id}`);
            
            // Verificar si el usuario existe
            const existingUser = await this.getUserById(id);
            if (!existingUser) {
                throw new Error(`No se encontró el usuario con ID ${id}`);
            }
            
            console.log(`Usuario encontrado: ${existingUser.email} (ID: ${id})`);
            
            // Verificar si el email ya está en uso por otro usuario
            if (userData.email && userData.email !== existingUser.email) {
                const userWithSameEmail = this.getUserByEmail(userData.email);
                if (userWithSameEmail && userWithSameEmail.id !== id) {
                    throw new Error(`El email ${userData.email} ya está en uso por otro usuario`);
                }
            }
            
            // Preparar datos para actualizar
            const updateData = {
                Email: userData.email || existingUser.email,
                SubscriptionType: userData.subscriptionType || existingUser.subscriptionType || 'Gratuita',
                StartDate: userData.startDate || existingUser.startDate,
                EndDate: userData.endDate || existingUser.endDate,
                IsActive: userData.isActive === undefined ? existingUser.isActive : userData.isActive,
                FailedLoginAttempts: existingUser.failedLoginAttempts || 0
            };
            
            console.log('Datos para actualizar:', updateData);
            
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
    renderUserTable() {
        const userTableBody = document.getElementById('userTableBody');
        
        if (!userTableBody) {
            console.warn('No se encontró el elemento userTableBody');
            return;
        }
        
        // Limpiar tabla
        userTableBody.innerHTML = '';
        
        // Si no hay usuarios filtrados, mostrar mensaje
        if (this.filteredUsers.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" class="text-center">No se encontraron usuarios</td>`;
            userTableBody.appendChild(tr);
            return;
        }
        
        // Renderizar usuarios filtrados
        this.filteredUsers.forEach(user => {
            const tr = document.createElement('tr');
            
            // Formatear fechas
            let startDate = 'No definida';
            let endDate = 'No definida';
            
            if (user.startDate) {
                const date = new Date(user.startDate);
                startDate = date.toLocaleDateString();
            }
            
            if (user.endDate) {
                const date = new Date(user.endDate);
                endDate = date.toLocaleDateString();
            }
            
            // Determinar clase para el estado
            let statusClass = user.isActive ? 'text-success' : 'text-danger';
            let statusText = user.isActive ? 'Activo' : 'Inactivo';
            
            tr.innerHTML = `
                <td>${user.email}</td>
                <td>${user.subscriptionType || 'Gratuita'}</td>
                <td>${startDate}</td>
                <td>${endDate}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-user" data-id="${user.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            userTableBody.appendChild(tr);
        });
        
        // Ya no llamamos a setupUserTableEvents aquí
        // Los event listeners se configuran en users.html
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}
