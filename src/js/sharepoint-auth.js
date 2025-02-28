/**
 * Clase para manejar la autenticación con Microsoft Graph para SharePoint
 */
class SharePointAuth {
    constructor() {
        // Configuración de MSAL
        this.msalConfig = {
            auth: {
                clientId: '20e03e25-902a-407a-af26-bdd674e9fe86',
                authority: 'https://login.microsoftonline.com/95283754-2014-4a1e-9c3a-2ca96bb219f0',
                redirectUri: 'https://dxsystem.github.io/instaladores-windows-config/src/users.html',
                navigateToLoginRequestUrl: true
            },
            cache: {
                cacheLocation: 'localStorage',
                storeAuthStateInCookie: false // Cambiar a false para SPA
            },
            system: {
                allowRedirectInIframe: true,
                windowHashTimeout: 60000,
                iframeHashTimeout: 6000,
                loadFrameTimeout: 0,
                asyncPopups: false
            }
        };

        // Inicializar MSAL
        this.msalInstance = new msal.PublicClientApplication(this.msalConfig);
        
        // Scopes para Microsoft Graph
        this.graphScopes = {
            read: ['Sites.Read.All', 'User.Read', 'Files.Read.All'],
            write: ['Sites.ReadWrite.All', 'User.ReadWrite.All', 'Files.ReadWrite.All']
        };

        // Inicializar estado
        this._isAuthenticated = false;
        this.user = null;
        this._loginInProgress = false; // Flag para controlar si hay un login en progreso

        // Verificar si hay una sesión existente
        this.checkExistingSession();
    }

    /**
     * Verifica si hay una sesión existente y actualiza el estado
     * @returns {Promise<Object|null>} Información del usuario si se procesa una redirección
     */
    async checkExistingSession() {
        try {
            // Intentar manejar cualquier respuesta de redirección pendiente
            const response = await this.msalInstance.handleRedirectPromise()
                .catch(error => {
                    console.error('Error al manejar la redirección:', error);
                    return null;
                });

            if (response) {
                this._isAuthenticated = true;
                this.user = response.account;
                console.log('Login por redirección exitoso para:', this.user.username);
                return response;
            }
            
            // Verificar si hay cuentas en caché
            const accounts = this.msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                this._isAuthenticated = true;
                this.user = accounts[0];
                console.log('Sesión existente encontrada para:', this.user.username);
            }
            
            return null;
        } catch (error) {
            console.error('Error al verificar sesión existente:', error);
            return null;
        } finally {
            this._loginInProgress = false;
        }
    }

    /**
     * Inicia el proceso de login con Microsoft
     * @returns {Promise<Object>} Información del usuario autenticado
     */
    async login() {
        try {
            // Si ya hay una sesión, no es necesario hacer login de nuevo
            if (this._isAuthenticated) {
                console.log('Usuario ya autenticado:', this.user.username);
                return this.user;
            }
            
            // Evitar múltiples intentos de login simultáneos
            if (this._loginInProgress) {
                console.log('Ya hay un proceso de login en curso...');
                throw new Error('Ya hay un proceso de login en curso. Por favor, espere a que termine.');
            }
            
            // Limpiar cualquier interacción pendiente antes de intentar el login
            this.clearPendingInteractions();
            
            // Marcar que hay un login en progreso
            this._loginInProgress = true;

            // Configurar la solicitud de login
            const request = {
                scopes: this.graphScopes.read,
                prompt: 'select_account',
                redirectUri: 'https://dxsystem.github.io/instaladores-windows-config/src/users.html'
            };

            try {
                // Intentar login con redirección
                console.log('Iniciando proceso de login con redirección...');
                await this.msalInstance.loginRedirect(request);
                return null; // No se llegará a este punto debido a la redirección
            } catch (error) {
                console.error('Error durante el login:', error);
                this._loginInProgress = false;
                throw error;
            }
        } catch (error) {
            console.error('Error durante el login:', error);
            this._loginInProgress = false;
            throw error;
        }
    }

    /**
     * Cierra la sesión del usuario actual
     */
    logout() {
        try {
            const logoutRequest = {
                account: this.msalInstance.getAccountByUsername(this.user.username),
                postLogoutRedirectUri: window.location.href,
            };
            
            this.msalInstance.logoutRedirect(logoutRequest);
        } catch (error) {
            console.error('Error durante el logout:', error);
        }
    }

    /**
     * Obtiene un token de acceso para Microsoft Graph
     * @param {boolean} writeAccess - Si se requiere acceso de escritura
     * @returns {Promise<string>} Token de acceso
     */
    async getAccessToken(writeAccess = false) {
        try {
            // Seleccionar los scopes según el tipo de acceso requerido
            const scopes = writeAccess ? this.graphScopes.write : this.graphScopes.read;
            
            // Verificar si hay una sesión activa
            if (!this._isAuthenticated) {
                console.log('No hay sesión activa, iniciando login...');
                await this.login();
            }
            
            // Obtener el token silenciosamente si es posible
            const accounts = this.msalInstance.getAllAccounts();
            if (accounts.length === 0) {
                throw new Error('No hay cuentas disponibles');
            }
            
            const silentRequest = {
                scopes: scopes,
                account: accounts[0],
                forceRefresh: false
            };
            
            try {
                // Intentar adquirir token silenciosamente
                console.log('Intentando adquirir token silenciosamente...');
                const response = await this.msalInstance.acquireTokenSilent(silentRequest);
                console.log('Token adquirido silenciosamente');
                return response.accessToken;
            } catch (silentError) {
                // Si falla la adquisición silenciosa, intentar con interacción
                console.warn('No se pudo adquirir token silenciosamente:', silentError);
                console.log('Intentando adquirir token con interacción...');
                
                const interactiveRequest = {
                    scopes: scopes,
                    prompt: 'select_account'
                };
                
                const response = await this.msalInstance.acquireTokenPopup(interactiveRequest);
                console.log('Token adquirido con interacción');
                return response.accessToken;
            }
        } catch (error) {
            console.error('Error al obtener token de acceso:', error);
            throw new Error('No se pudo obtener el token de acceso: ' + error.message);
        }
    }

    /**
     * Obtiene el usuario actual autenticado
     * @returns {Object|null} Información del usuario o null si no hay sesión
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Inicializa la autenticación y verifica la sesión
     * @returns {Promise<boolean>} True si el usuario está autenticado
     */
    async initialize() {
        try {
            // Limpiar cualquier interacción pendiente
            this.clearPendingInteractions();
            
            // Verificar si hay una sesión existente o respuesta de redirección
            const redirectResponse = await this.checkExistingSession();
            
            // Si hay una respuesta de redirección, ya estamos autenticados
            if (redirectResponse) {
                return true;
            }
            
            // Si no hay sesión y no estamos en la página de login, intentar login
            if (!this._isAuthenticated && !window.location.href.includes('login.html')) {
                try {
                    await this.login();
                } catch (loginError) {
                    // Si hay un error de login, registrarlo pero continuar
                    console.warn('Error durante el login automático:', loginError);
                    // Asegurarse de que el flag de login en progreso se restablezca
                    this._loginInProgress = false;
                }
            }
            
            return this._isAuthenticated;
        } catch (error) {
            console.error('Error al inicializar la autenticación:', error);
            // Asegurarse de que el flag de login en progreso se restablezca
            this._loginInProgress = false;
            return false;
        }
    }

    /**
     * Verifica si el usuario está autenticado
     * @returns {boolean} True si el usuario está autenticado
     */
    isAuthenticated() {
        return this._isAuthenticated;
    }

    /**
     * Limpia cualquier interacción de autenticación pendiente
     * Esta función intenta resolver el error "interaction_in_progress"
     */
    clearPendingInteractions() {
        try {
            // Intentar acceder a la API interna de MSAL para limpiar interacciones pendientes
            if (this.msalInstance && this.msalInstance.browserStorage) {
                // Limpiar el estado de interacción en localStorage
                localStorage.removeItem('msal.interaction.status');
                
                // Intentar limpiar otras claves relacionadas con interacciones
                const keys = Object.keys(localStorage);
                for (const key of keys) {
                    if (key.startsWith('msal.interaction') || 
                        key.startsWith('msal.browser.interaction') ||
                        key.includes('interaction.status')) {
                        localStorage.removeItem(key);
                    }
                }
                
                console.log('Interacciones pendientes limpiadas');
            }
        } catch (error) {
            console.warn('Error al limpiar interacciones pendientes:', error);
        }
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharePointAuth;
}
