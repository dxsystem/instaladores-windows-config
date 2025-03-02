/**
 * icon-service.js
 * Servicio para gestionar los iconos de las aplicaciones
 */

class IconService {
    /**
     * Constructor del servicio de iconos
     * @param {Object} spGraph - Instancia de SharePointGraph para comunicación con SharePoint
     */
    constructor(spGraph) {
        this.spGraph = spGraph;
        this.DEFAULT_ICON_URL = 'img/default_app.png';
        this.EXE_ICON_URL = 'img/exe_icon.png';
        this.BAT_ICON_URL = 'img/bat_icon.png';
        
        console.log('IconService inicializado');
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
        
        // Procesar cada aplicación
        apps.forEach(app => {
            if (!app || !app.fileName) {
                console.warn(`Aplicación sin nombre de archivo`);
                app.icon = this.DEFAULT_ICON_URL;
                return;
            }
            
            try {
                // Obtener la extensión del archivo
                const fileExtension = this.getFileExtension(app.fileName);
                
                // Asignar icono según la extensión
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
            } catch (error) {
                console.error(`Error al asignar icono para ${app.name}:`, error);
                app.icon = this.DEFAULT_ICON_URL;
            }
        });
        
        console.log('Iconos asignados correctamente');
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