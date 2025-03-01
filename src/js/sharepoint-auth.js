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
     * Verifica si existe una sesión previa o si hay una respuesta de redirección
     * @returns {Promise<Object|null>} Información de la respuesta de redirección o null
     */
    async checkExistingSession() {
        try {
            this._loginInProgress = true;
            console.log('Verificando sesión existente...');
            
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
            console.log('Cuentas encontradas en caché:', accounts.length, accounts);
            
            if (accounts.length > 0) {
                this._isAuthenticated = true;
                this.user = accounts[0];
                console.log('Sesión existente encontrada para:', this.user.username);
            } else {
                console.log('No se encontraron cuentas en caché');
                this._isAuthenticated = false;
                this.user = null;
            }
            
            return null;
        } catch (error) {
            console.error('Error al verificar sesión existente:', error);
            this._isAuthenticated = false;
            this.user = null;
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
            console.log('Iniciando proceso de login...');

            // Verificar si hay cuentas en caché para intentar login silencioso primero
            const accounts = this.msalInstance.getAllAccounts();
            console.log('Cuentas disponibles para login silencioso:', accounts.length);
            
            if (accounts.length > 0) {
                try {
                    console.log('Intentando login silencioso con cuenta:', accounts[0].username);
                    const silentRequest = {
                        scopes: this.graphScopes.read,
                        account: accounts[0],
                        forceRefresh: true
                    };
                    
                    const silentResult = await this.msalInstance.acquireTokenSilent(silentRequest);
                    if (silentResult) {
                        console.log('Login silencioso exitoso:', silentResult.account.username);
                        this._isAuthenticated = true;
                        this.user = silentResult.account;
                        this._loginInProgress = false;
                        return this.user;
                    }
                } catch (silentError) {
                    console.warn('Error en login silencioso, intentando login interactivo:', silentError);
                    // Continuar con login interactivo
                }
            }

            // Configurar la solicitud de login
            const currentUrl = window.location.href;
            const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
            const redirectUri = baseUrl + 'import-users.html'; // Redirigir a la misma página
            
            console.log('URL de redirección para login:', redirectUri);
            
            const request = {
                scopes: this.graphScopes.read,
                prompt: 'select_account',
                redirectUri: redirectUri
            };

            try {
                // Intentar login con redirección
                console.log('Iniciando proceso de login con redirección...');
                await this.msalInstance.loginRedirect(request);
                return null; // No se llegará a este punto debido a la redirección
            } catch (error) {
                console.error('Error durante el login con redirección:', error);
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
     * @returns {Promise<void>} Promesa que se resuelve cuando se completa el logout
     */
    async logout() {
        try {
            console.log('Iniciando proceso de logout...');
            
            // Verificar si hay un usuario autenticado
            if (!this._isAuthenticated || !this.user) {
                console.log('No hay usuario autenticado para cerrar sesión');
                return Promise.resolve();
            }
            
            // Limpiar el estado de autenticación
            this._isAuthenticated = false;
            
            // Obtener la cuenta para el logout
            let account = null;
            try {
                account = this.msalInstance.getAccountByUsername(this.user.username);
            } catch (error) {
                console.warn('Error al obtener la cuenta para logout:', error);
            }
            
            // Configurar la URL de redirección después del logout
            const currentUrl = window.location.href;
            const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
            const redirectUri = baseUrl + 'login.html';
            
            console.log('URL de redirección para logout:', redirectUri);
            
            const logoutRequest = {
                account: account,
                postLogoutRedirectUri: redirectUri,
            };
            
            // Limpiar el almacenamiento local antes del logout
            this.clearPendingInteractions();
            
            // Intentar logout con redirección
            console.log('Ejecutando logout con redirección...');
            
            // Devolver una promesa que se resolverá después de un tiempo
            // ya que logoutRedirect causará una redirección y no podemos esperar su finalización
            return new Promise((resolve) => {
                // Pequeño retraso antes de la redirección para permitir que la promesa se resuelva
                setTimeout(() => {
                    try {
                        this.msalInstance.logoutRedirect(logoutRequest);
                    } catch (error) {
                        console.error('Error durante el logout con redirección:', error);
                    }
                    resolve();
                }, 100);
            });
        } catch (error) {
            console.error('Error durante el logout:', error);
            return Promise.resolve(); // Resolver la promesa incluso en caso de error
        }
    }

    /**
     * Obtiene un token de acceso para Microsoft Graph
     * @param {Array<string>} scopes - Scopes requeridos para el token
     * @returns {Promise<string>} Token de acceso
     */
    async getAccessToken(scopes) {
        try {
            console.log('Solicitando token de acceso para scopes:', scopes);
            
            // Verificar si hay una sesión activa
            if (!this._isAuthenticated) {
                console.log('No hay sesión activa, verificando sesión existente...');
                await this.checkExistingSession();
                
                if (!this._isAuthenticated) {
                    console.log('No se encontró sesión existente, iniciando login...');
                    await this.login();
                    
                    // Si después del login seguimos sin autenticación, lanzar error
                    if (!this._isAuthenticated) {
                        throw new Error('No se pudo autenticar al usuario');
                    }
                }
            }
            
            // Obtener el token silenciosamente si es posible
            const accounts = this.msalInstance.getAllAccounts();
            console.log('Cuentas disponibles para obtener token:', accounts.length);
            
            if (accounts.length === 0) {
                throw new Error('No hay cuentas disponibles para obtener token');
            }
            
            // Usar la primera cuenta disponible
            const account = accounts[0];
            console.log('Usando cuenta para obtener token:', account.username);
            
            const silentRequest = {
                scopes: scopes,
                account: account,
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
                
                // Verificar si estamos en un contexto donde podemos mostrar UI
                if (this._isInIframe()) {
                    console.error('No se puede mostrar UI en un iframe');
                    throw new Error('No se puede adquirir token sin interacción en un iframe');
                }
                
                console.log('Intentando adquirir token con popup...');
                
                // Limpiar cualquier interacción pendiente antes de intentar el popup
                this.clearPendingInteractions();
                
                const interactiveRequest = {
                    scopes: scopes,
                    account: account,
                    prompt: 'select_account'
                };
                
                try {
                    const response = await this.msalInstance.acquireTokenPopup(interactiveRequest);
                    console.log('Token adquirido con popup');
                    return response.accessToken;
                } catch (popupError) {
                    console.error('Error al adquirir token con popup:', popupError);
                    
                    // Como último recurso, intentar con redirección
                    console.log('Intentando adquirir token con redirección...');
                    
                    // Configurar la URL de redirección
                    const currentUrl = window.location.href;
                    interactiveRequest.redirectUri = currentUrl;
                    
                    await this.msalInstance.acquireTokenRedirect(interactiveRequest);
                    // No se llegará a este punto debido a la redirección
                    return null;
                }
            }
        } catch (error) {
            console.error('Error al obtener token de acceso:', error);
            throw new Error('No se pudo obtener el token de acceso: ' + error.message);
        }
    }
    
    /**
     * Verifica si la aplicación se está ejecutando en un iframe
     * @returns {boolean} True si se está ejecutando en un iframe
     * @private
     */
    _isInIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    /**
     * Obtiene el usuario actual autenticado
     * @returns {Object|null} Información del usuario o null si no hay sesión
     */
    getCurrentUser() {
        if (!this._isAuthenticated || !this.user) {
            console.log('No hay usuario autenticado');
            return null;
        }
        
        // Asegurarnos de que tenemos la información básica del usuario
        const userInfo = {
            id: this.user.homeAccountId || this.user.localAccountId || '',
            username: this.user.username || '',
            name: this.user.name || '',
            email: this.user.username || '', // En MSAL, username suele ser el email
            displayName: this.user.name || this.user.username || 'Usuario'
        };
        
        console.log('Información de usuario actual:', userInfo);
        return userInfo;
    }

    /**
     * Inicializa la autenticación y verifica la sesión
     * @returns {Promise<boolean>} True si el usuario está autenticado
     */
    async initialize() {
        try {
            console.log('Inicializando SharePointAuth...');
            
            // Limpiar cualquier interacción pendiente que pueda bloquear la autenticación
            this.clearPendingInteractions();
            console.log('Interacciones pendientes limpiadas');
            
            // Verificar si hay una sesión existente o respuesta de redirección
            console.log('Verificando sesión existente...');
            const redirectResponse = await this.checkExistingSession();
            console.log('Resultado de verificación de sesión:', redirectResponse ? 'Redirección procesada' : 'No hay redirección');
            console.log('Estado de autenticación después de verificar sesión:', this._isAuthenticated);
            
            // Si hay una respuesta de redirección, ya estamos autenticados
            if (redirectResponse) {
                console.log('Usuario autenticado por redirección');
                return true;
            }
            
            // Verificar si ya estamos autenticados por sesión existente
            if (this._isAuthenticated) {
                console.log('Usuario ya autenticado por sesión existente');
                return true;
            }
            
            // Si no hay sesión y no estamos en la página de login, intentar login silencioso
            if (!this._isAuthenticated && !window.location.href.includes('login.html')) {
                console.log('No hay sesión activa, intentando login silencioso...');
                try {
                    // Intentar login silencioso primero
                    const accounts = this.msalInstance.getAllAccounts();
                    if (accounts.length > 0) {
                        console.log('Intentando login silencioso con cuenta:', accounts[0].username);
                        const silentRequest = {
                            scopes: this.graphScopes.read,
                            account: accounts[0],
                            forceRefresh: false
                        };
                        
                        const silentResult = await this.msalInstance.acquireTokenSilent(silentRequest)
                            .catch(error => {
                                console.warn('Error en login silencioso:', error);
                                return null;
                            });
                        
                        if (silentResult) {
                            console.log('Login silencioso exitoso');
                            this._isAuthenticated = true;
                            this.user = silentResult.account;
                            return true;
                        }
                    }
                    
                    // Si el login silencioso falla, intentar login interactivo
                    console.log('Login silencioso fallido, intentando login interactivo...');
                    await this.login();
                    return this._isAuthenticated;
                } catch (loginError) {
                    // Si hay un error de login, registrarlo pero continuar
                    console.warn('Error durante el login automático:', loginError);
                    // Asegurarse de que el flag de login en progreso se restablezca
                    this._loginInProgress = false;
                }
            }
            
            console.log('Estado final de autenticación:', this._isAuthenticated);
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
