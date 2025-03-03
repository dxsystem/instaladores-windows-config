/**
 * Clase para manejar la sincronización de usuarios con SharePoint
 */
class UserSynchronizer {
    /**
     * Constructor de la clase
     * @param {SharePointUserManager} userManager - Instancia de SharePointUserManager
     */
    constructor(userManager) {
        this.userManager = userManager;
        this.localUsers = [];
        this.remoteUsers = [];
        this.syncStatus = {
            lastSync: null,
            inProgress: false,
            error: null,
            stats: {
                added: 0,
                updated: 0,
                deleted: 0,
                unchanged: 0,
                failed: 0
            }
        };
    }

    /**
     * Carga los usuarios locales
     * @returns {Promise<Array>} Lista de usuarios locales
     */
    async loadLocalUsers() {
        try {
            // En una implementación real, esto cargaría los usuarios de una base de datos local
            // Para este ejemplo, usamos localStorage
            const storedUsers = localStorage.getItem('localUsers');
            this.localUsers = storedUsers ? JSON.parse(storedUsers) : [];
            console.log(`Cargados ${this.localUsers.length} usuarios locales`);
            return this.localUsers;
        } catch (error) {
            console.error('Error al cargar usuarios locales:', error);
            throw error;
        }
    }

    /**
     * Guarda los usuarios locales
     * @returns {Promise<void>}
     */
    async saveLocalUsers() {
        try {
            localStorage.setItem('localUsers', JSON.stringify(this.localUsers));
            console.log(`Guardados ${this.localUsers.length} usuarios locales`);
        } catch (error) {
            console.error('Error al guardar usuarios locales:', error);
            throw error;
        }
    }

    /**
     * Carga los usuarios remotos desde SharePoint
     * @returns {Promise<Array>} Lista de usuarios remotos
     */
    async loadRemoteUsers() {
        try {
            this.remoteUsers = await this.userManager.getAllUsers();
            console.log(`Cargados ${this.remoteUsers.length} usuarios remotos`);
            return this.remoteUsers;
        } catch (error) {
            console.error('Error al cargar usuarios remotos:', error);
            throw error;
        }
    }

    /**
     * Sincroniza los usuarios locales con los remotos
     * @param {string} direction - Dirección de la sincronización ('push', 'pull', 'both')
     * @returns {Promise<Object>} Estadísticas de sincronización
     */
    async synchronize(direction = 'both') {
        if (this.syncStatus.inProgress) {
            throw new Error('Ya hay una sincronización en progreso');
        }

        try {
            this.syncStatus.inProgress = true;
            this.syncStatus.error = null;
            this.resetStats();

            // Cargar usuarios
            await this.loadLocalUsers();
            await this.loadRemoteUsers();

            if (direction === 'push' || direction === 'both') {
                await this.pushChangesToRemote();
            }

            if (direction === 'pull' || direction === 'both') {
                await this.pullChangesFromRemote();
            }

            // Actualizar estado de sincronización
            this.syncStatus.lastSync = new Date();
            this.syncStatus.inProgress = false;

            console.log('Sincronización completada:', this.syncStatus.stats);
            return this.syncStatus.stats;
        } catch (error) {
            this.syncStatus.error = error.message;
            this.syncStatus.inProgress = false;
            console.error('Error durante la sincronización:', error);
            throw error;
        }
    }

    /**
     * Envía los cambios locales a SharePoint
     * @returns {Promise<void>}
     */
    async pushChangesToRemote() {
        console.log('Enviando cambios locales a SharePoint...');

        for (const localUser of this.localUsers) {
            try {
                // Buscar si el usuario existe en remoto
                const remoteUser = this.remoteUsers.find(u => u.username === localUser.username);

                if (remoteUser) {
                    // Actualizar usuario remoto si hay cambios
                    if (this.hasChanges(localUser, remoteUser)) {
                        await this.userManager.updateUser(remoteUser.id, localUser);
                        this.syncStatus.stats.updated++;
                    } else {
                        this.syncStatus.stats.unchanged++;
                    }
                } else {
                    // Crear nuevo usuario remoto
                    await this.userManager.createUser(localUser);
                    this.syncStatus.stats.added++;
                }
            } catch (error) {
                console.error(`Error al sincronizar usuario local ${localUser.username}:`, error);
                this.syncStatus.stats.failed++;
            }
        }
    }

    /**
     * Obtiene los cambios remotos desde SharePoint
     * @returns {Promise<void>}
     */
    async pullChangesFromRemote() {
        console.log('Obteniendo cambios remotos desde SharePoint...');

        // Crear un mapa de usuarios locales para búsqueda rápida
        const localUserMap = {};
        this.localUsers.forEach(user => {
            localUserMap[user.username] = user;
        });

        // Lista temporal para los usuarios actualizados
        const updatedLocalUsers = [];

        // Procesar usuarios remotos
        for (const remoteUser of this.remoteUsers) {
            try {
                const localUser = localUserMap[remoteUser.username];

                if (localUser) {
                    // Actualizar usuario local si hay cambios
                    if (this.hasChanges(remoteUser, localUser)) {
                        // Crear una copia actualizada del usuario local
                        const updatedUser = { ...localUser, ...remoteUser };
                        updatedLocalUsers.push(updatedUser);
                        this.syncStatus.stats.updated++;
                    } else {
                        updatedLocalUsers.push(localUser);
                        this.syncStatus.stats.unchanged++;
                    }
                    
                    // Marcar como procesado
                    delete localUserMap[remoteUser.username];
                } else {
                    // Añadir nuevo usuario local
                    updatedLocalUsers.push(remoteUser);
                    this.syncStatus.stats.added++;
                }
            } catch (error) {
                console.error(`Error al procesar usuario remoto ${remoteUser.username}:`, error);
                this.syncStatus.stats.failed++;
            }
        }

        // Actualizar la lista local
        this.localUsers = updatedLocalUsers;
        await this.saveLocalUsers();
    }

    /**
     * Comprueba si hay cambios entre dos usuarios
     * @param {Object} user1 - Primer usuario
     * @param {Object} user2 - Segundo usuario
     * @returns {boolean} true si hay cambios, false en caso contrario
     */
    hasChanges(user1, user2) {
        return user1.email !== user2.email ||
               user1.role !== user2.role ||
               user1.status !== user2.status;
    }

    /**
     * Reinicia las estadísticas de sincronización
     */
    resetStats() {
        this.syncStatus.stats = {
            added: 0,
            updated: 0,
            deleted: 0,
            unchanged: 0,
            failed: 0
        };
    }

    /**
     * Obtiene el estado actual de la sincronización
     * @returns {Object} Estado de sincronización
     */
    getSyncStatus() {
        return { ...this.syncStatus };
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserSynchronizer;
}
