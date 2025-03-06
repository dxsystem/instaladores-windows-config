/**
 * apps-stats.js
 * Script para gestionar las estadísticas de aplicaciones en la interfaz
 */

// Función para actualizar los contadores de aplicaciones
async function updateAppStatistics() {
    try {
        // Obtener todas las aplicaciones disponibles
        const allApps = await getAllApplications();
        
        // Obtener configuraciones de suscripciones
        const eliteConfig = await getSubscriptionConfig('ELITE');
        const proConfig = await getSubscriptionConfig('PRO');
        const freeConfig = await getSubscriptionConfig('Gratuita');
        
        // Calcular aplicaciones sin sincronizar (total - elite)
        const unsyncedCount = allApps.length - eliteConfig.applications.length;
        
        // Actualizar contadores en la interfaz
        document.getElementById('totalAppsCount').textContent = allApps.length;
        document.getElementById('requiredAppsCount').textContent = await getRequiredAppsCount();
        document.getElementById('unsyncedAppsCount').textContent = unsyncedCount > 0 ? unsyncedCount : 0;
        document.getElementById('eliteAppsTotal').textContent = eliteConfig.applications.length;
        document.getElementById('proAppsTotal').textContent = proConfig.applications.length;
        document.getElementById('freeAppsTotal').textContent = freeConfig.applications.length;
        
    } catch (error) {
        console.error('Error al actualizar estadísticas de aplicaciones:', error);
        showToast('Error al cargar estadísticas de aplicaciones', 'error');
    }
}

// Obtener todas las aplicaciones disponibles
async function getAllApplications() {
    try {
        const response = await fetch('/api/apps/list');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al obtener aplicaciones:', error);
        return [];
    }
}

// Obtener configuración de suscripción
async function getSubscriptionConfig(type) {
    try {
        const response = await fetch(`/api/subscription/${type}`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error al obtener configuración ${type}:`, error);
        return { applications: [] };
    }
}

// Obtener conteo de aplicaciones obligatorias
async function getRequiredAppsCount() {
    try {
        const response = await fetch('/api/apps/required');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const requiredApps = await response.json();
        return requiredApps.length;
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