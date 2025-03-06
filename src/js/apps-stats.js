/**
 * apps-stats.js
 * Script para gestionar las estadísticas de aplicaciones en la interfaz
 */

// Función para actualizar los contadores de aplicaciones
async function updateAppStatistics() {
    try {
        // Verificar que spGraph esté inicializado
        if (!spGraph) {
            console.warn('El cliente de SharePoint Graph no está inicializado');
            showToast('Error: Cliente de SharePoint no inicializado', 'error');
            return;
        }

        // Mostrar estado de carga
        showLoading('Cargando estadísticas de aplicaciones...');
        
        // Obtener todas las aplicaciones disponibles
        const allApps = await getAllApplications();
        
        // Obtener configuraciones de suscripciones en paralelo
        const [eliteConfig, proConfig, freeConfig, requiredCount] = await Promise.all([
            getSubscriptionConfig('ELITE'),
            getSubscriptionConfig('PRO'),
            getSubscriptionConfig('Gratuita'),
            getRequiredAppsCount()
        ]);
        
        // Calcular aplicaciones sin sincronizar (total - elite)
        const unsyncedCount = Math.max(0, allApps.length - (eliteConfig.Applications ? eliteConfig.Applications.length : 0));
        
        // Actualizar contadores en la interfaz
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('totalAppsCount', allApps.length);
        updateElement('requiredAppsCount', requiredCount);
        updateElement('unsyncedAppsCount', unsyncedCount);
        updateElement('eliteAppsTotal', eliteConfig.Applications ? eliteConfig.Applications.length : 0);
        updateElement('proAppsTotal', proConfig.Applications ? proConfig.Applications.length : 0);
        updateElement('freeAppsTotal', freeConfig.Applications ? freeConfig.Applications.length : 0);
        
        hideLoading();
    } catch (error) {
        console.error('Error al actualizar estadísticas de aplicaciones:', error);
        showToast('Error al cargar estadísticas de aplicaciones', 'error');
        hideLoading();
    }
}

// Obtener todas las aplicaciones disponibles
async function getAllApplications() {
    try {
        if (!spGraph) {
            console.warn('El cliente de SharePoint Graph no está inicializado');
            return [];
        }
        const allApps = await spGraph.getAllApps();
        return allApps || [];
    } catch (error) {
        console.error('Error al obtener aplicaciones:', error);
        return [];
    }
}

// Obtener configuración de suscripción
async function getSubscriptionConfig(type) {
    try {
        if (!spGraph) {
            console.warn('El cliente de SharePoint Graph no está inicializado');
            return { Applications: [] };
        }
        const configFileName = `${type.toLowerCase()}_apps_config.json`;
        const configContent = await spGraph.getFileContent(configFileName);
        return JSON.parse(configContent || '{"Applications":[]}');
    } catch (error) {
        console.error(`Error al obtener configuración ${type}:`, error);
        return { Applications: [] };
    }
}

// Obtener conteo de aplicaciones obligatorias
async function getRequiredAppsCount() {
    try {
        if (!spGraph) {
            console.warn('El cliente de SharePoint Graph no está inicializado');
            return 0;
        }
        const requiredConfig = await spGraph.getFileContent('required_apps_config.json');
        const config = JSON.parse(requiredConfig || '{"Applications":[]}');
        return config.Applications ? config.Applications.length : 0;
    } catch (error) {
        console.error('Error al obtener aplicaciones obligatorias:', error);
        return 0;
    }
}

// Inicializar estadísticas cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    updateAppStatistics();
    
    // Actualizar estadísticas cuando se hace clic en el botón de actualizar
    document.getElementById('refreshButton').addEventListener('click', updateAppStatistics);
});