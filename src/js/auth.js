/**
 * Archivo de compatibilidad para redirigir a sharepoint-auth.js
 * Este archivo existe para mantener la compatibilidad con las páginas que importan auth.js
 */

// Importar SharePointAuth desde el archivo correcto
import SharePointAuth from './sharepoint-auth.js';

// Exportar la clase para que esté disponible
export default SharePointAuth;

// También hacer disponible globalmente si se carga como script
if (typeof window !== 'undefined') {
    window.SharePointAuth = SharePointAuth;
}
