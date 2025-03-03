/**
 * icon-service.js
 * Servicio para gestionar los iconos de las aplicaciones
 * Basado en la implementación de IconService.cs
 */

class IconService {
    /**
     * Constructor del servicio de iconos
     * @param {Object} spGraph - Instancia de SharePointGraph para comunicación con SharePoint
     */
    constructor(spGraph) {
        this.spGraph = spGraph;
        this.iconMappings = {}; // Inicializar como objeto vacío
        this.iconsLoaded = false;
        this.iconCache = new Map(); // Cache para evitar cargar el mismo icono múltiples veces
        
        // URL base para los iconos en GitHub
        this.GITHUB_ICONS_URL = 'https://dxsystem.github.io/instaladores-windows-config/src/img/';
        
        // Definir URLs de iconos predeterminados usando GitHub
        this.DEFAULT_ICON_URL = `${this.GITHUB_ICONS_URL}default_app.png`;
        this.EXE_ICON_URL = `${this.GITHUB_ICONS_URL}exe_icon.png`;
        this.BAT_ICON_URL = `${this.GITHUB_ICONS_URL}bat_icon.png`;
        
        this.availableIcons = []; // Lista de iconos disponibles
        
        console.log('IconService inicializado con GitHub como fuente de iconos');
        
        // Iniciar la carga de iconos de forma asíncrona
        this.initializeAsync();
    }
    
    /**
     * Inicializa el servicio de iconos de forma asíncrona
     * @returns {Promise<void>} - Promesa que se resuelve cuando se ha inicializado el servicio
     */
    async initializeAsync() {
        try {
            // Precarga de iconos comunes
            await this.preloadCommonIcons();
            
            // Cargar lista de iconos disponibles
            await this.loadAvailableIcons();
            
            console.log('IconService inicializado completamente');
        } catch (error) {
            console.error('Error al inicializar IconService:', error);
        }
    }

    /**
     * Inicializa los mapeos de iconos
     * @returns {Object} - Mapeo de nombres de aplicaciones a iconos
     */
    initializeIconMappings() {
        // Este método está desactivado y devuelve un objeto vacío
        console.log('Método initializeIconMappings desactivado');
        return {};
    }

    /**
     * Busca un icono que coincida con el nombre de la aplicación
     * @param {string} appName - Nombre de la aplicación
     * @returns {string|null} - Nombre del icono o null si no se encuentra
     */
    findMatchingIcon(appName) {
        // Este método está desactivado y devuelve null
        console.log('Método findMatchingIcon desactivado');
        return null;
    }

    /**
     * Busca un icono que coincida con el patrón especificado
     * @param {string} baseAppName - Nombre base de la aplicación
     * @returns {string|null} - Nombre del icono o null si no se encuentra
     */
    findIconByPattern(baseAppName) {
        if (!baseAppName || !this.availableIcons || this.availableIcons.length === 0) {
            return null;
        }

        // Convertir a minúsculas para comparación insensible a mayúsculas/minúsculas
        const lowerBaseName = baseAppName.toLowerCase();
        
        // Buscar un icono que coincida exactamente con el nombre base
        const exactMatch = this.availableIcons.find(icon => {
            const iconName = icon.toLowerCase().replace(/\.png$/, '');
            return iconName === lowerBaseName;
        });
        
        if (exactMatch) {
            console.log(`Coincidencia exacta encontrada: ${exactMatch}`);
            return exactMatch;
        }
        
        // Si no hay coincidencia exacta, buscar una coincidencia parcial
        const partialMatch = this.availableIcons.find(icon => {
            const iconName = icon.toLowerCase().replace(/\.png$/, '');
            return lowerBaseName.includes(iconName) || iconName.includes(lowerBaseName);
        });
        
        if (partialMatch) {
            console.log(`Coincidencia parcial encontrada: ${partialMatch}`);
            return partialMatch;
        }
        
        return null;
    }

    /**
     * Carga un icono y lo almacena en caché
     * @param {string} iconUrl - URL del icono a cargar
     * @returns {Promise<HTMLImageElement>} - Promesa que se resuelve con el elemento de imagen
     */
    loadIcon(iconUrl) {
        // Verificar si el icono ya está en caché
        if (this.iconCache.has(iconUrl)) {
            return Promise.resolve(this.iconCache.get(iconUrl));
        }
        
        // Cargar el icono
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.iconCache.set(iconUrl, img);
                resolve(img);
            };
            
            img.onerror = () => {
                console.warn(`Error al cargar el icono: ${iconUrl}`);
                reject(new Error(`No se pudo cargar el icono: ${iconUrl}`));
            };
            
            img.src = iconUrl;
        });
    }

    /**
     * Carga la lista de iconos disponibles desde GitHub
     * @returns {Promise<void>} - Promesa que se resuelve cuando se han cargado los iconos
     */
    async loadAvailableIcons() {
        console.log('Cargando iconos disponibles desde GitHub...');
        
        try {
            // Obtener la lista de iconos disponibles directamente desde GitHub
            const iconsList = await this.getIconsFromGitHub();
            
            if (iconsList && iconsList.length > 0) {
                this.availableIcons = iconsList;
                console.log(`${this.availableIcons.length} iconos cargados desde GitHub`);
            } else {
                console.warn('No se pudieron cargar iconos desde GitHub');
                this.availableIcons = [];
            }
        } catch (error) {
            console.error('Error al cargar iconos desde GitHub:', error);
            this.availableIcons = [];
        }
        
        this.iconsLoaded = true;
    }
    
    /**
     * Obtiene la lista de iconos disponibles directamente desde GitHub
     * @returns {Promise<string[]>} - Promesa que se resuelve con la lista de nombres de archivos de iconos
     */
    async getIconsFromGitHub() {
        try {
            // URL correcta del repositorio
            const repoUrl = 'https://api.github.com/repos/dxsystem/instaladores-windows-config/contents/img';
            
            // Realizar la solicitud a la API de GitHub sin autenticación
            const response = await fetch(repoUrl);
            
            if (!response.ok) {
                console.error(`Error al acceder a la API de GitHub: ${response.status} ${response.statusText}`);
                
                // Intentar con una URL alternativa
                console.log('Intentando acceder con URL alternativa...');
                const alternativeUrl = 'https://api.github.com/repos/dxsystem/instaladores-windows-config/contents/src/img';
                const alternativeResponse = await fetch(alternativeUrl);
                
                if (!alternativeResponse.ok) {
                    console.error(`Error al acceder con URL alternativa: ${alternativeResponse.status} ${alternativeResponse.statusText}`);
                    return [];
                }
                
                const alternativeData = await alternativeResponse.json();
                
                // Filtrar solo los archivos PNG
                const alternativeIcons = alternativeData
                    .filter(item => item.type === 'file' && item.name.toLowerCase().endsWith('.png'))
                    .map(item => item.name);
                    
                console.log(`Se encontraron ${alternativeIcons.length} iconos en el repositorio de GitHub (URL alternativa)`);
                return alternativeIcons;
            }
            
            const data = await response.json();
            
            // Filtrar solo los archivos PNG
            const icons = data
                .filter(item => item.type === 'file' && item.name.toLowerCase().endsWith('.png'))
                .map(item => item.name);
                
            console.log(`Se encontraron ${icons.length} iconos en el repositorio de GitHub`);
            return icons;
        } catch (error) {
            console.error('Error al obtener iconos desde GitHub:', error);
            return [];
        }
    }

    /**
     * Precarga iconos comunes para mejorar el rendimiento
     * @returns {Promise<void>} - Promesa que se resuelve cuando se han precargado los iconos
     */
    async preloadCommonIcons() {
        const commonIcons = [
            'default_app.png',
            'exe_icon.png',
            'bat_icon.png',

        ];
        
        const preloadPromises = commonIcons.map(iconName => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.iconCache.set(iconName, img);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`No se pudo precargar el icono: ${iconName}`);
                    resolve(); // Resolvemos la promesa incluso si hay error para no bloquear
                };
                img.src = `${this.GITHUB_ICONS_URL}${iconName}`;
            });
        });
        
        try {
            await Promise.all(preloadPromises);
            console.log('Iconos comunes precargados correctamente');
        } catch (error) {
            console.error('Error al precargar iconos comunes:', error);
        }
    }

    /**
     * Asigna iconos a las aplicaciones basándose en sus nombres
     * @param {Array} apps - Lista de aplicaciones a las que asignar iconos
     * @returns {Promise<Array>} - Promesa que se resuelve con la lista de aplicaciones con iconos asignados
     */
    async assignIconsToApps(apps) {
        console.log('Asignando iconos a aplicaciones usando GitHub...');
        let errorCount = 0;

        if (!apps || !Array.isArray(apps)) {
            console.error('La lista de aplicaciones no es válida');
            return [];
        }

        // Asegurarse de que los iconos estén cargados
        if (!this.iconsLoaded) {
            await this.loadAvailableIcons();
        }

        // Verificar que tenemos al menos los iconos por defecto
        if (this.availableIcons.length === 0) {
            console.warn('No hay iconos disponibles, cargando iconos de respaldo');
            this.loadFallbackIcons();
        }

        apps.forEach(app => {
            try {
                if (!app || !app.fileName) {
                    console.warn('Aplicación sin nombre de archivo, omitiendo');
                    return;
                }

                const fileName = app.fileName;
                const fileExt = this.getFileExtension(fileName);
                let iconUrl = '';

                // Extraer el nombre base de la aplicación (sin versión)
                const baseAppName = this.extractBaseName(fileName);
                
                if (baseAppName) {
                    console.log(`Nombre base extraído: ${baseAppName} para ${fileName}`);
                    
                    // Buscar un icono que coincida con el nombre base
                    let matchingIcon = this.findBestMatchingIcon(baseAppName);
                    
                    if (matchingIcon) {
                        iconUrl = `${this.GITHUB_ICONS_URL}${matchingIcon}`;
                        console.log(`Icono encontrado: ${iconUrl} para ${app.fileName}`);
                    } else {
                        // Si no se encuentra un icono específico, usar uno basado en la extensión
                        iconUrl = this.getDefaultIconByExtension(fileExt);
                        console.log(`No se encontró icono para ${baseAppName}, usando icono por defecto: ${iconUrl}`);
                    }
                } else {
                    // Si no se pudo extraer un nombre base, usar un icono basado en la extensión
                    iconUrl = this.getDefaultIconByExtension(fileExt);
                    console.log(`Sin nombre base, asignando icono por defecto: ${iconUrl} para ${app.fileName}`);
                }

                // Verificar que la URL del icono es válida
                if (!iconUrl) {
                    iconUrl = this.DEFAULT_ICON_URL;
                    console.warn(`URL de icono no válida para ${app.fileName}, usando icono por defecto`);
                }

                app.iconUrl = iconUrl;
            } catch (error) {
                console.error(`Error al asignar icono para ${app?.fileName || 'aplicación desconocida'}:`, error);
                app.iconUrl = this.DEFAULT_ICON_URL;
                errorCount++;
            }
        });

        if (errorCount > 0) {
            console.warn(`Se produjeron ${errorCount} errores al asignar iconos`);
        }

        return apps;
    }
    
    /**
     * Encuentra el mejor icono que coincida con el nombre base
     * @param {string} baseAppName - Nombre base de la aplicación
     * @returns {string|null} - Nombre del icono o null si no se encuentra
     */
    findBestMatchingIcon(baseAppName) {
        if (!baseAppName || !this.availableIcons || this.availableIcons.length === 0) {
            return null;
        }
        
        const lowerBaseName = baseAppName.toLowerCase();
        
        // 1. Buscar coincidencia exacta
        const exactMatch = this.availableIcons.find(icon => 
            icon.toLowerCase() === `${lowerBaseName}.png`
        );
        
        if (exactMatch) {
            console.log(`Coincidencia exacta encontrada: ${exactMatch}`);
            return exactMatch;
        }
        
        // 2. Buscar si el nombre base está contenido en algún icono
        const partialMatch = this.availableIcons.find(icon => {
            const iconName = icon.toLowerCase().replace(/\.png$/, '');
            return iconName.includes(lowerBaseName) || lowerBaseName.includes(iconName);
        });
        
        if (partialMatch) {
            console.log(`Coincidencia parcial encontrada: ${partialMatch}`);
            return partialMatch;
        }
        
        // 3. Casos especiales para aplicaciones conocidas
        if (lowerBaseName.includes('chrome')) return 'chrome.png';
        if (lowerBaseName.includes('edge')) return 'edge.png';
        if (lowerBaseName.includes('firefox')) return 'firefox.png';
        if (lowerBaseName.includes('office')) return 'office.png';
        if (lowerBaseName.includes('word')) return 'word.png';
        if (lowerBaseName.includes('excel')) return 'excel.png';
        if (lowerBaseName.includes('powerpoint')) return 'powerpoint.png';
        if (lowerBaseName.includes('outlook')) return 'outlook.png';
        if (lowerBaseName.includes('wondershare') && lowerBaseName.includes('filmora')) return 'wondersharefilmora.png';
        if (lowerBaseName.includes('wondershare') && lowerBaseName.includes('uniconverter')) return 'wondershareuniconverter.png';
        if (lowerBaseName.includes('wondershare') && lowerBaseName.includes('recoverit')) return 'wondersharerecoverit.png';
        if (lowerBaseName.includes('wondershare') && lowerBaseName.includes('pdfelement')) return 'wondersharepdfelement.png';
        if (lowerBaseName.includes('xmind')) return 'xmind.png';
        if (lowerBaseName.includes('vlc')) return 'vlc.png';
        if (lowerBaseName.includes('winrar')) return 'winrar.png';
        if (lowerBaseName.includes('7zip') || lowerBaseName.includes('7-zip')) return '7zip.png';
        
        return null;
    }
    
    /**
     * Obtiene el icono por defecto basado en la extensión del archivo
     * @param {string} fileExt - Extensión del archivo
     * @returns {string} - URL del icono por defecto
     */
    getDefaultIconByExtension(fileExt) {
        if (!fileExt) return this.DEFAULT_ICON_URL;
        
        switch (fileExt.toLowerCase()) {
            case 'exe':
                return this.EXE_ICON_URL;
            case 'bat':
            case 'cmd':
                return this.BAT_ICON_URL;
            default:
                return this.DEFAULT_ICON_URL;
        }
    }

    /**
     * Extrae el nombre base de una aplicación eliminando la extensión y números de versión
     * @param {string} fileName - Nombre del archivo
     * @returns {string} - Nombre base de la aplicación
     */
    extractBaseName(fileName) {
        if (!fileName) return '';
        
        try {
            // Eliminar la extensión
            let baseName = fileName.replace(/\.[^.]+$/, '');
            
            // Normalizar el nombre (minúsculas, sin espacios)
            baseName = baseName.toLowerCase();
            
            // Patrones comunes para nombres de aplicaciones Wondershare
            if (baseName.includes('wondershare')) {
                // Extraer el nombre del producto Wondershare
                if (baseName.includes('filmora')) return 'wondersharefilmora';
                if (baseName.includes('uniconverter')) return 'wondershareuniconverter';
                if (baseName.includes('recoverit')) return 'wondersharerecoverit';
                if (baseName.includes('pdfelement')) return 'wondersharepdfelement';
                
                // Si es otro producto Wondershare, intentar extraer el nombre
                const match = baseName.match(/wondershare[_\s]?([a-z0-9]+)/i);
                if (match && match[1]) {
                    return `wondershare${match[1].toLowerCase()}`;
                }
            }
            
            // Patrones para XMind
            if (baseName.includes('xmind')) {
                return 'xmind';
            }
            
            // Patrones para navegadores comunes
            if (baseName.includes('chrome')) return 'chrome';
            if (baseName.includes('firefox')) return 'firefox';
            if (baseName.includes('edge')) return 'edge';
            
            // Patrones para Office
            if (baseName.includes('word')) return 'word';
            if (baseName.includes('excel')) return 'excel';
            if (baseName.includes('powerpoint')) return 'powerpoint';
            if (baseName.includes('outlook')) return 'outlook';
            if (baseName.includes('office')) return 'office';
            
            // Eliminar números de versión y caracteres especiales
            baseName = baseName
                .replace(/[\s_-]+/g, '') // Eliminar espacios, guiones y guiones bajos
                .replace(/v?\d+(\.\d+)*(-\w+)?$/i, '') // Eliminar versiones como v1.2.3 o 2020
                .replace(/\d{4}/, '') // Eliminar años
                .replace(/\([^)]*\)/g, '') // Eliminar contenido entre paréntesis
                .replace(/setup|installer|portable|full|free/gi, ''); // Eliminar palabras comunes en instaladores
            
            return baseName || '';
        } catch (error) {
            console.error('Error al extraer nombre base:', error);
            return '';
        }
    }

    /**
     * Obtiene la extensión de un archivo
     * @param {string} fileName - Nombre del archivo
     * @returns {string} - Extensión del archivo
     */
    getFileExtension(fileName) {
        if (!fileName) return '';
        const parts = fileName.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }
}

// Exportar la clase para su uso en otros archivos
window.IconService = IconService;