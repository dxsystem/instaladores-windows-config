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
        this.iconMappings = this.initializeIconMappings();
        this.iconsLoaded = false;
        this.iconCache = new Map(); // Cache para evitar cargar el mismo icono múltiples veces
        this.DEFAULT_ICON_URL = 'img/default_app.png';
        this.EXE_ICON_URL = 'img/exe_icon.png';
        this.BAT_ICON_URL = 'img/bat_icon.png';
        
        console.log('IconService inicializado');
        
        // Precarga de iconos comunes
        this.preloadCommonIcons();
    }

    /**
     * Inicializa el mapeo de nombres de aplicaciones a iconos
     * @returns {Object} Mapeo de nombres a iconos
     */
    initializeIconMappings() {
        return {
            // Patrones generales de nombres
            'office': 'Office',
            'microsoft': 'Office',
            '365': 'Office',
            '2021': 'Office',
            '2019': 'Office',
            '2016': 'Office',
            'visio': 'Visio2021',

            // Navegadores
            'google': 'chrome',
            'chrome': 'chrome',
            'firefox': 'MozillaFirefoxSilent',
            'mozilla': 'MozillaFirefoxSilent',
            'edge': 'edge',
            'browser': 'chrome',

            // Adobe y PDF
            'adobe': 'AdobePremierePro2023v23.6.0.65x64Repack',
            'pdf': 'WondersharePDFelementProfessional10.3.12.2738x64',
            'acrobat': 'WondersharePDFelementProfessional10.3.12.2738x64',
            'reader': 'WondersharePDFelementProfessional10.3.12.2738x64',
            'pdfelement': 'WondersharePDFelementProfessional10.3.12.2738x64',

            // Compresión
            'compress': 'winrar',
            'zip': 'PassperforZIP3.9.3.1',
            'winrar': 'winrar',
            '7z': '7zip',
            '7-zip': '7zip',
            '7zip': '7zip',
            'rar': 'PassperforRAR3.9.3.1',

            // Desarrollo y editores
            'visual': 'visualstudio',
            'vs_': 'visualstudio',
            'studio': 'visualstudio',
            'vscode': 'vscode',
            'code': 'vscode',
            'notepad': 'notepadplus',
            'editor': 'notepadplus',

            // Utilidades del sistema
            'clean': 'CCleaner6.15.10623x64',
            'ccleaner': 'CCleaner6.15.10623x64',
            'driver': 'DriverGeniusProImg',
            'drivers': 'Drivers',
            'update': 'update',
            'install': 'install',
            'uninstall': 'RevoUninstallerPro5.3',
            'revo': 'RevoUninstallerPro5.3',
            'partition': 'MiniToolPartitionWizardTechnician12.8x86',
            'recovery': 'MiniToolPowerDataRecoveryPersonalBusiness11.9',
            'recoverit': 'WondershareRecoveritUltimate11.0.0.13x64',
            'repair': 'WondershareRepairit5.5.9.9x64',
            'optimizer': 'WiseCare365v6.6.5.635',
            'wise': 'WiseCare365v6.6.5.635',
            'rufus': 'Rufus',
            'ventoy': 'Ventoy',

            // Multimedia y comunicación
            'player': 'AIMP5.11Build2435x64',
            'media': 'AIMP5.11Build2435x64',
            'vlc': 'vlc',
            'video': 'Movie',
            'audio': 'AIMP5.11Build2435x64',
            'teams': 'teams',
            'meet': 'teams',
            'chat': 'teams',
            'zoom': 'ZoomInstallerFull',
            'converter': 'WinXVideoProcConverter5.7.0',
            'filmora': 'WondershareFilmora13.3.12.7152x64',
            'camtasia': 'TechSmithCamtasia2021.0.19Build35860x64',
            'snagit': 'TechSmithSnagit2024.1.4Build2756x64',
            'screen': 'ApowersoftScreenCapturePro1.5.4.3',
            'recorder': 'AbelssoftRecordify2023v8.03',
            'capture': 'ApowersoftScreenCapturePro1.5.4.3',
            'webcam': 'IriunWebcam-2.8.4',
            'droidcam': 'DroidCamOBS',

            // Antivirus y seguridad
            'security': 'security',
            'antivirus': 'security',
            'protect': 'security',
            'eset': 'eset',
            'defender': 'defender',
            'password': 'Contraseñas',
            'crypto': 'AbelssoftFileCryptor2024v5.0.51104',

            // Herramientas de red
            'remote': 'Teamviewer12.0.75813',
            'desktop': 'Teamviewer12.0.75813',
            'teamviewer': 'Teamviewer12.0.75813',
            'anydesk': 'anydesk',
            'network': 'network',
            'wifi': 'network',
            
            // Gráficos y diseño
            'corel': 'CorelDRAWGraphicsSuite2022v24.0.0.301x64',
            'draw': 'CorelDRAWGraphicsSuite2022v24.0.0.301x64',
            'mind': 'WondershareEdrawMindPro10.7.2.204',
            'xmind': 'XMind2024v24.04.10301x64',
            
            // Virtualización
            'virtual': 'VirtualBox',
            'virtualbox': 'VirtualBox',
            
            // Herramientas de sistema
            'cpu': 'cpu-z',
            'disk': 'CrystalDiskInfo9_2_2',
            'system': 'Computer',
            'cmd': 'cmd-icon-17',
            'autohotkey': 'AutoHotKey',
            
            // Partición
            'partition': 'MiniToolPartitionWizardTechnician12.8x86',
            'disk': 'MiniToolPartitionWizardTechnician12.8x86',
            
            // 4DDiG
            '4ddig': 'exe_icon'
        };
    }
    
    /**
     * Precarga los iconos más comunes para mejorar el rendimiento
     */
    preloadCommonIcons() {
        const commonIcons = [
            this.DEFAULT_ICON_URL,
            this.EXE_ICON_URL,
            this.BAT_ICON_URL,
            'img/chrome.png',
            'img/Office.png',
            'img/winrar.png'
        ];
        
        commonIcons.forEach(iconUrl => {
            this.loadIcon(iconUrl).catch(err => {
                console.warn(`No se pudo precargar el icono ${iconUrl}:`, err);
            });
        });
    }

    /**
     * Asigna iconos a las aplicaciones
     * @param {Array} apps - Lista de aplicaciones
     */
    assignIconsToApps(apps) {
        if (!apps || !Array.isArray(apps) || apps.length === 0) {
            console.warn('No hay aplicaciones para asignar iconos');
            return;
        }
        
        console.log(`Asignando iconos a ${apps.length} aplicaciones...`);
        
        // Contador para seguimiento
        let assignedCount = 0;
        let errorCount = 0;
        
        // Procesar cada aplicación
        apps.forEach((app, index) => {
            if (!app || !app.fileName) {
                console.warn(`Aplicación ${index} no válida o sin nombre de archivo`);
                errorCount++;
                return;
            }
            
            try {
                // Obtener la extensión del archivo
                const fileExtension = this.getFileExtension(app.fileName);
                
                // Buscar un icono personalizado basado en el nombre de la aplicación
                const iconName = this.findMatchingIcon(app.name);
                
                if (iconName) {
                    // Si encontramos un icono personalizado, usarlo
                    const iconUrl = `img/${iconName}.png`;
                    app.icon = iconUrl;
                    console.log(`Icono personalizado asignado: ${iconUrl} para ${app.name}`);
                    assignedCount++;
                } else {
                    // Si no hay icono personalizado, usar el icono por defecto según la extensión
                    switch (fileExtension) {
                        case '.exe':
                            app.icon = this.EXE_ICON_URL;
                            break;
                        case '.bat':
                            app.icon = this.BAT_ICON_URL;
                            break;
                        default:
                            app.icon = this.DEFAULT_ICON_URL;
                            break;
                    }
                    console.log(`Icono por defecto asignado: ${app.icon} para ${app.name}`);
                    assignedCount++;
                }
            } catch (error) {
                console.error(`Error al asignar icono para ${app.name}:`, error);
                // Asignar icono por defecto en caso de error
                app.icon = this.DEFAULT_ICON_URL;
                errorCount++;
            }
        });
        
        // Mostrar resumen al finalizar
        console.log(`Resumen de asignación de iconos: ${assignedCount} asignados, ${errorCount} errores`);
    }

    /**
     * Carga un icono desde una URL
     * @param {string} url - URL del icono
     * @returns {Promise<string>} URL del icono cargado
     */
    async loadIcon(url) {
        return new Promise((resolve, reject) => {
            // Verificar si la URL es válida
            if (!url) {
                console.error('URL de icono no válida');
                reject(new Error('URL de icono no válida'));
                return;
            }
            
            // Verificar si el icono ya está en cache
            if (this.iconCache.has(url)) {
                console.log(`Icono encontrado en cache: ${url}`);
                resolve(this.iconCache.get(url));
                return;
            }
            
            console.log(`Intentando cargar icono desde: ${url}`);
            
            // Intentar cargar el icono
            const img = new Image();
            
            img.onload = () => {
                console.log(`Icono cargado correctamente: ${url}`);
                this.iconCache.set(url, url);
                resolve(url);
            };
            
            img.onerror = (error) => {
                console.error(`Error al cargar icono: ${url}`, error);
                reject(new Error(`Error al cargar icono: ${url}`));
            };
            
            // Agregar timestamp para evitar caché del navegador
            img.src = url + '?t=' + new Date().getTime();
        });
    }

    /**
     * Encuentra un icono que coincida con el nombre de la aplicación
     * @param {string} appName - Nombre de la aplicación
     * @returns {string|null} Nombre del icono o null si no se encuentra
     */
    findMatchingIcon(appName) {
        if (!appName) return null;

        // Normalizar el nombre de la aplicación
        appName = appName.toLowerCase().trim();
        const normalizedAppName = appName.replace(/[\s_-]/g, '');

        console.log(`Buscando icono para: ${appName} (normalizado: ${normalizedAppName})`);

        // Primero buscar coincidencia exacta en el mapeo
        for (const [key, value] of Object.entries(this.iconMappings)) {
            if (appName.includes(key.toLowerCase())) {
                console.log(`Coincidencia encontrada en mapeo para ${appName}: ${value}`);
                return value;
            }
        }

        // Extraer el nombre base del programa (eliminar números y caracteres especiales del final)
        const baseAppName = this.extractBaseName(normalizedAppName);
        console.log(`Nombre base extraído para ${appName}: ${baseAppName}`);
        
        // Buscar coincidencia por nombre base en el mapeo
        for (const [key, value] of Object.entries(this.iconMappings)) {
            const baseKey = this.extractBaseName(key.toLowerCase());
            
            if (baseAppName.startsWith(baseKey) || baseKey.startsWith(baseAppName)) {
                console.log(`Coincidencia por nombre base encontrada para ${appName}: ${value}`);
                return value;
            }
        }

        console.log(`No se encontró coincidencia para ${appName}, usando icono por defecto`);
        return null;
    }

    /**
     * Extrae el nombre base de una aplicación (sin versión)
     * @param {string} name - Nombre completo
     * @returns {string} Nombre base
     */
    extractBaseName(name) {
        if (!name) return name;

        // Convertir a minúsculas para el procesamiento
        name = name.toLowerCase();

        // Encontrar el primer número o carácter especial que indique el inicio de la versión
        let versionStart = -1;
        for (let i = 0; i < name.length; i++) {
            if (/[\d.v]/.test(name[i])) {
                // Verificar si es parte de un nombre (como "vector" o "office365")
                if (i > 0 && /[a-z]/.test(name[i - 1]) && 
                    i < name.length - 1 && /[a-z]/.test(name[i + 1])) {
                    continue;
                }
                versionStart = i;
                break;
            }
        }

        // Si encontramos un punto de inicio de versión, extraer el nombre base
        if (versionStart > 0) {
            return name.substring(0, versionStart);
        }

        return name;
    }

    /**
     * Obtiene la extensión de un archivo
     * @param {string} fileName - Nombre del archivo
     * @returns {string} Extensión del archivo
     */
    getFileExtension(fileName) {
        if (!fileName) return '';
        
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return '';
        
        return fileName.substring(lastDotIndex).toLowerCase();
    }
}

// Exportar la clase para su uso en otros archivos
window.IconService = IconService; 