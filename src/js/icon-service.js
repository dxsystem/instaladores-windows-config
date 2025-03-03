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
        this.DEFAULT_ICON_URL = 'img/default_app.png';
        this.EXE_ICON_URL = 'img/exe_icon.png';
        this.BAT_ICON_URL = 'img/bat_icon.png';
        this.availableIcons = []; // Lista de iconos disponibles
        
        console.log('IconService inicializado');
        
        // Precarga de iconos comunes
        this.preloadCommonIcons();
        
        // Cargar lista de iconos disponibles
        this.loadAvailableIcons();
    }

    /**
     * Inicializa el mapeo de nombres de aplicaciones a iconos
     * @returns {Object} Mapeo de nombres a iconos
     */
    initializeIconMappings() {
        // Esta función ha sido desactivada
        return {};
    }
    
    /**
     * Precarga los iconos más comunes para mejorar el rendimiento
     */
    preloadCommonIcons() {
        const commonIcons = [
            this.DEFAULT_ICON_URL,
            this.EXE_ICON_URL,
            this.BAT_ICON_URL,

        ];
        
        commonIcons.forEach(iconUrl => {
            this.loadIcon(iconUrl).catch(error => {
                console.warn(`No se pudo precargar el icono: ${iconUrl}`, error);
            });
        });
    }

    /**
     * Carga la lista de iconos disponibles
     * Obtiene los iconos directamente desde la carpeta img del repositorio
     */
    async loadAvailableIcons() {
        try {
            // Intentar cargar los iconos desde la carpeta img usando SharePoint
            if (this.spGraph) {
                console.log('Intentando cargar iconos desde SharePoint...');
                try {
                    // Obtener la lista de archivos de la carpeta img
                    const imgFiles = await this.spGraph.getFilesInFolder('img');
                    if (imgFiles && Array.isArray(imgFiles) && imgFiles.length > 0) {
                        // Filtrar solo los archivos PNG
                        this.availableIcons = imgFiles
                            .filter(file => file.name.toLowerCase().endsWith('.png'))
                            .map(file => file.name);
                        
                        console.log(`Cargados ${this.availableIcons.length} iconos desde SharePoint`);
                        return;
                    }
                } catch (spError) {
                    console.warn('No se pudieron cargar los iconos desde SharePoint:', spError);
                }
            }
            
            // Si no se pueden cargar desde SharePoint, usar una lista predefinida mínima
            console.log('Usando lista predefinida de iconos básicos');
            this.availableIcons = [
                'default_app.png',
                'exe_icon.png',
                'bat_icon.png',

            ];
            
            console.log(`Cargados ${this.availableIcons.length} iconos predefinidos`);
        } catch (error) {
            console.error('Error al cargar iconos disponibles:', error);
            this.availableIcons = [];
        }
    }

    /**
     * Asigna iconos a las aplicaciones basándose en su nombre y extensión
     * @param {Array} apps - Lista de aplicaciones a las que asignar iconos
     */
    assignIconsToApps(apps) {
        if (!apps || !Array.isArray(apps) || apps.length === 0) {
            console.log('No hay aplicaciones para asignar iconos');
            return;
        }

        console.log(`Asignando iconos a ${apps.length} aplicaciones`);
        
        let assignedCount = 0;
        let errorCount = 0;

        apps.forEach(app => {
            try {
                if (!app || !app.fileName) {
                    console.warn('Aplicación sin nombre de archivo:', app);
                    errorCount++;
                    return;
                }

                // Obtener la extensión del archivo
                const fileExt = this.getFileExtension(app.fileName);
                
                // Obtener el nombre base de la aplicación
                const baseAppName = this.extractBaseName(app.fileName);
                console.log(`Nombre base para ${app.fileName}: ${baseAppName}`);
                
                // Asignar icono basado en el nombre base
                let iconUrl = this.DEFAULT_ICON_URL;
                
                if (baseAppName) {
                    // Buscar un icono que coincida con el patrón nombrebase*.png
                    const matchingIcon = this.findIconByPattern(baseAppName);
                    if (matchingIcon) {
                        iconUrl = `img/${matchingIcon}`;
                        console.log(`Icono encontrado con patrón: ${iconUrl} para ${app.fileName}`);
                    } else {
                        // Si no se encuentra un icono con el patrón, usar un icono basado en la extensión
                        switch (fileExt.toLowerCase()) {
                            case 'exe':
                                iconUrl = this.EXE_ICON_URL;
                                break;
                            case 'bat':
                            case 'cmd':
                                iconUrl = this.BAT_ICON_URL;
                                break;
                            default:
                                iconUrl = this.DEFAULT_ICON_URL;
                        }
                        console.log(`No se encontró icono para ${baseAppName}, usando icono por defecto: ${iconUrl}`);
                    }
                } else {
                    // Si no hay nombre base, usar un icono basado en la extensión
                    switch (fileExt.toLowerCase()) {
                        case 'exe':
                            iconUrl = this.EXE_ICON_URL;
                            break;
                        case 'bat':
                        case 'cmd':
                            iconUrl = this.BAT_ICON_URL;
                            break;
                        default:
                            iconUrl = this.DEFAULT_ICON_URL;
                    }
                    console.log(`Sin nombre base, asignando icono por defecto: ${iconUrl} para ${app.fileName}`);
                }

                // Asignar el icono a la aplicación - asegurarse de que se asigne a ambas propiedades
                app.iconUrl = iconUrl;
                app.icon = iconUrl; // Asignar también a la propiedad 'icon' que es la que se usa en la interfaz
                
                console.log(`Icono asignado a ${app.fileName}: ${iconUrl}`);
                assignedCount++;
            } catch (error) {
                console.error(`Error al asignar icono para ${app?.fileName || 'aplicación desconocida'}:`, error);
                app.iconUrl = this.DEFAULT_ICON_URL; // Asignar icono por defecto en caso de error
                app.icon = this.DEFAULT_ICON_URL; // Asignar también a la propiedad 'icon'
                errorCount++;
            }
        });

        console.log(`Asignación de iconos completada: ${assignedCount} asignados, ${errorCount} errores`);
    }
    
    /**
     * Busca un icono que coincida con el patrón nombrebase*.png
     * @param {string} baseName - Nombre base para buscar
     * @returns {string|null} - Nombre del icono encontrado o null si no se encuentra
     */
    findIconByPattern(baseName) {
        if (!baseName || !this.availableIcons || this.availableIcons.length === 0) {
            return null;
        }
        
        console.log(`Buscando iconos para el patrón: ${baseName}*`);
        
        // Convertir a minúsculas para comparación insensible a mayúsculas/minúsculas
        const baseNameLower = baseName.toLowerCase();
        
        // Buscar iconos que comiencen con el nombre base
        let matchingIcons = this.availableIcons.filter(icon => 
            icon.toLowerCase().startsWith(baseNameLower)
        );
        
        // Si no hay coincidencias exactas al inicio, buscar coincidencias parciales
        if (matchingIcons.length === 0) {
            // Buscar iconos que contengan el nombre base
            matchingIcons = this.availableIcons.filter(icon => 
                icon.toLowerCase().includes(baseNameLower)
            );
            
            // Si aún no hay coincidencias, intentar con partes del nombre base
            if (matchingIcons.length === 0 && baseNameLower.length > 4) {
                // Usar los primeros 4 caracteres como mínimo para evitar falsos positivos
                const shortBaseName = baseNameLower.substring(0, 4);
                matchingIcons = this.availableIcons.filter(icon => 
                    icon.toLowerCase().includes(shortBaseName)
                );
            }
        }
        
        if (matchingIcons.length > 0) {
            // Ordenar por relevancia:
            // 1. Los que comienzan exactamente con el nombre base tienen prioridad
            // 2. Luego por longitud (los más cortos primero, probablemente los más genéricos)
            matchingIcons.sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                
                // Si uno comienza con el nombre base y el otro no
                const aStartsWithBase = aLower.startsWith(baseNameLower);
                const bStartsWithBase = bLower.startsWith(baseNameLower);
                
                if (aStartsWithBase && !bStartsWithBase) return -1;
                if (!aStartsWithBase && bStartsWithBase) return 1;
                
                // Si ambos comienzan o ninguno comienza, ordenar por longitud
                return aLower.length - bLower.length;
            });
            
            console.log(`Iconos coincidentes para ${baseName}:`, matchingIcons);
            return matchingIcons[0];
        }
        
        console.log(`No se encontraron iconos para el patrón: ${baseName}*`);
        return null;
    }

    /**
     * Carga un icono y lo almacena en caché
     * @param {string} url - URL del icono a cargar
     * @returns {Promise<string>} - Promesa que resuelve a la URL del icono
     */
    async loadIcon(url) {
        if (this.iconCache.has(url)) {
            return this.iconCache.get(url);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.iconCache.set(url, url);
                resolve(url);
            };
            img.onerror = () => {
                console.warn(`No se pudo cargar el icono: ${url}`);
                reject(new Error(`No se pudo cargar el icono: ${url}`));
            };
            img.src = url;
        });
    }

    /**
     * Busca un icono que coincida con el nombre de la aplicación
     * @param {string} appName - Nombre de la aplicación
     * @returns {string|null} - Nombre del icono o null si no se encuentra
     */
    findMatchingIcon(appName) {
        // Esta función ha sido desactivada
        return null;
    }

    /**
     * Extrae el nombre base de una aplicación, eliminando números y caracteres especiales
     * que suelen indicar versiones
     * @param {string} name - Nombre completo de la aplicación
     * @returns {string} - Nombre base de la aplicación
     */
    extractBaseName(name) {
        if (!name) return '';

        console.log(`Extrayendo nombre base para: ${name}`);

        // Convertir a minúsculas para el procesamiento
        name = name.toLowerCase();
        
        // Eliminar la extensión si existe
        const lastDotIndex = name.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            name = name.substring(0, lastDotIndex);
            console.log(`Nombre sin extensión: ${name}`);
        }
        
        // Patrones comunes para identificar el inicio de una versión
        const versionPatterns = [
            /\d+\.\d+/, // Patrón de versión como 1.0, 2.3, etc.
            /v\d+/,     // Patrón de versión como v1, v2, etc.
            /\d{4}/,    // Año (como 2023, 2024)
            /x\d+/,     // Patrón como x64, x86
            /\s\d+/     // Espacio seguido de número
        ];
        
        // Buscar el primer patrón de versión en el nombre
        let versionIndex = name.length;
        
        for (const pattern of versionPatterns) {
            const match = name.match(pattern);
            if (match && match.index < versionIndex) {
                // Verificar que no sea parte de un nombre de producto
                // (por ejemplo, "office365" no debe separarse en "office" y "365")
                const prevChar = match.index > 0 ? name.charAt(match.index - 1) : '';
                const nextChar = match.index + match[0].length < name.length ? 
                                name.charAt(match.index + match[0].length) : '';
                
                // Si el patrón está rodeado por letras, probablemente es parte del nombre
                if (!/[a-z]/.test(prevChar) || !/[a-z]/.test(nextChar)) {
                    versionIndex = match.index;
                    console.log(`Patrón de versión encontrado: ${match[0]} en posición ${match.index}`);
                }
            }
        }
        
        // Extraer el nombre base hasta el índice de versión
        let baseName = name.substring(0, versionIndex).trim();
        
        // Eliminar caracteres especiales al final del nombre base
        baseName = baseName.replace(/[_\-\s]+$/, '');
        
        console.log(`Nombre base extraído: ${baseName}`);
        return baseName;
    }

    /**
     * Obtiene la extensión de un archivo
     * @param {string} fileName - Nombre del archivo
     * @returns {string} - Extensión del archivo
     */
    getFileExtension(fileName) {
        if (!fileName) return '';
        
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return '';
        
        return fileName.substring(lastDotIndex + 1);
    }
}

// Exportar la clase para su uso en otros archivos
window.IconService = IconService;