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
                redirectUri: window.location.origin + window.location.pathname,
            },
            cache: {
                cacheLocation: 'localStorage',
                storeAuthStateInCookie: true
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
        this.isAuthenticated = false;
        this.user = null;

        // Verificar si hay una sesión existente
        this.checkExistingSession();
    }

    /**
     * Verifica si hay una sesión existente y actualiza el estado
     */
    checkExistingSession() {
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            this.isAuthenticated = true;
            this.user = accounts[0];
            console.log('Sesión existente encontrada para:', this.user.username);
        }
    }

    /**
     * Inicia el proceso de login con Microsoft
     * @returns {Promise<Object>} Información del usuario autenticado
     */
    async login() {
        try {
            // Si ya hay una sesión, no es necesario hacer login de nuevo
            if (this.isAuthenticated) {
                console.log('Usuario ya autenticado:', this.user.username);
                return this.user;
            }

            // Intentar login con popup
            console.log('Iniciando proceso de login...');
            const loginResponse = await this.msalInstance.loginPopup({
                scopes: this.graphScopes.read,
                prompt: 'select_account'
            });

            if (loginResponse) {
                this.isAuthenticated = true;
                this.user = loginResponse.account;
                console.log('Login exitoso para:', this.user.username);
                return this.user;
            }
        } catch (error) {
            // Si hay un error de popup bloqueado, intentar con redirección
            if (error.name === 'PopupBlockedError') {
                console.warn('Popup bloqueado, intentando con redirección...');
                this.msalInstance.loginRedirect({
                    scopes: this.graphScopes.read,
                    prompt: 'select_account'
                });
                return null;
            }
            
            console.error('Error durante el login:', error);
            throw new Error('No se pudo iniciar sesión: ' + error.message);
        }
    }

    /**
     * Cierra la sesión del usuario actual
     */
    logout() {
        try {
            const logoutRequest = {
                account: this.msalInstance.getAccountByUsername(this.user.username),
                postLogoutRedirectUri: window.location.origin,
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
            if (!this.isAuthenticated) {
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
     * Verifica si el usuario está autenticado
     * @returns {boolean} true si está autenticado, false en caso contrario
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }
}

// Exportar la clase para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharePointAuth;
}
