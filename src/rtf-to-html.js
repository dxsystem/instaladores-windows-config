/**
 * Conversor de RTF a HTML
 * Versión: 1.5.0
 * 
 * Este archivo contiene funciones para convertir contenido RTF a HTML.
 * Incluye correcciones para manejar caracteres especiales y viñetas.
 * 
 * Correcciones:
 * - Eliminación de caracteres 'd' y 'b' no deseados al inicio del documento, antes de viñetas y después de listas
 * - Mejora en el manejo de viñetas y listas
 * - Soporte para caracteres acentuados
 * - Eliminación de símbolos extraños como "Trebuchet MS; ; ;"
 * - Corrección de palabras juntas sin espacio
 * - Eliminación de caracteres Â no deseados
 * - Mejora en el formato de viñetas para evitar espacios innecesarios
 */

/**
 * Convierte contenido RTF a formato HTML
 * @param {string} rtf - El contenido RTF a convertir
 * @return {string} - El contenido en formato HTML
 */
function rtfToHtml(rtf) {
    try {
        if (!rtf || typeof rtf !== 'string') {
            console.error('rtfToHtml: El contenido RTF es inválido');
            return '';
        }
        
        // Eliminar cualquier 'd' o 'b' al inicio del documento completo
        rtf = rtf.replace(/^d\s+/m, '');
        rtf = rtf.replace(/^b\s+/m, '');
        
        // Eliminar 'd' o 'b' que aparece antes de las viñetas
        rtf = rtf.replace(/[db]\\bullet/g, '\\bullet');
        rtf = rtf.replace(/[db]\\b7/g, '\\b7');
        rtf = rtf.replace(/[db]\s+•/g, '•');
        
        // Eliminar 'd' o 'b' que aparece después de las listas
        rtf = rtf.replace(/\\par\s+[db]\s+/g, '\\par ');
        
        // Eliminar "Segoe UI; ; ;" que puede aparecer en el texto
        rtf = rtf.replace(/Segoe UI;\s*;?\s*;?/g, '');
        rtf = rtf.replace(/Trebuchet MS;\s*;?\s*;?/g, '');
        rtf = rtf.replace(/Arial;\s*Arial;{2,3}/g, '');
        
        // Eliminar caracteres Â no deseados
        rtf = rtf.replace(/Â/g, ' ');
        
        // Asegurar espacios entre palabras
        rtf = rtf.replace(/([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ])([A-Z])/g, '$1 $2'); // Espacio entre palabra y mayúscula
        rtf = rtf.replace(/([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ])(\d)/g, '$1 $2'); // Espacio entre palabra y número
        rtf = rtf.replace(/(\d)([a-zA-Z])/g, '$1 $2'); // Espacio entre número y palabra
        
        let html = '';
        let isInList = false;
        
        // Dividir el RTF en párrafos
        const paragraphs = rtf.split('\\par');
        
        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            
            // Saltar párrafos vacíos
            if (!paragraph.trim()) {
                continue;
            }
            
            // Detectar encabezados
            if (paragraph.includes('\\f1\\fs') || paragraph.includes('\\b\\fs')) {
                let text = extractCleanText(paragraph);
                
                // Eliminar la 'd' o 'b' que aparece al inicio de los encabezados
                text = text.replace(/^[db]\s+/, '');
                text = text.replace(/^[db]/, '');
                
                if (text.trim()) {
                    if (paragraph.includes('\\fs40')) {
                        html += `<h1>${text}</h1>\n`;
                    } else if (paragraph.includes('\\fs36')) {
                        html += `<h2>${text}</h2>\n`;
                    } else if (paragraph.includes('\\fs28')) {
                        html += `<h3>${text}</h3>\n`;
                    } else {
                        html += `<h4>${text}</h4>\n`;
                    }
                }
                continue;
            }
            
            // Detectar viñetas
            if (paragraph.includes('\\bullet') || paragraph.includes('\\b7') || paragraph.includes('\\pntext') || paragraph.includes('•') || paragraph.includes('\\fi-360')) {
                let text = extractCleanText(paragraph);
                
                // Eliminar caracteres de viñeta y 'd' o 'b' no deseados
                text = text.replace(/^[db]\s*/, '');
                text = text.replace(/^•\s*/, '');
                text = text.replace(/\\bullet\s*/, '');
                text = text.replace(/\\b7\s*/, '');
                text = text.replace(/\\u183\?/, '');
                text = text.replace(/\\u00B7\?/, '');
                text = text.replace(/^-360\s*/, ''); // Eliminar "-360" que aparece al inicio de las viñetas
                
                // Eliminar caracteres Â no deseados
                text = text.replace(/Â/g, ' ');
                
                if (text.trim()) {
                    if (!isInList) {
                        html += '<ul>\n';
                        isInList = true;
                    }
                    html += `<li>${text}</li>\n`;
                }
                continue;
            }
            
            // Si estamos en una lista y el párrafo actual no es una viñeta, cerrar la lista
            if (isInList && !paragraph.includes('\\bullet') && !paragraph.includes('\\b7') && !paragraph.includes('\\pntext') && !paragraph.includes('•') && !paragraph.includes('\\fi-360')) {
                html += '</ul>\n';
                isInList = false;
            }
            
            // Párrafos normales
            let text = extractCleanText(paragraph);
            
            // Eliminar la 'd' o 'b' que aparece al inicio de los párrafos
            text = text.replace(/^[db]\s+/, '');
            text = text.replace(/^[db]/, '');
            // Eliminar '\b' que aparece al inicio de los párrafos en negrita
            text = text.replace(/^\\b\s+/, '');
            
            // Eliminar "Segoe UI; ; ;" que puede aparecer en el texto
            text = text.replace(/Segoe UI;\s*;?\s*;?/g, '');
            text = text.replace(/Trebuchet MS;\s*;?\s*;?/g, '');
            text = text.replace(/Arial;\s*Arial;{2,3}/g, '');
            
            // Eliminar caracteres Â no deseados
            text = text.replace(/Â/g, ' ');
            
            if (text.trim()) {
                // Detectar si está en negrita
                if (paragraph.includes('\\b')) {
                    html += `<p><strong>${text}</strong></p>\n`;
                } else {
                    html += `<p>${text}</p>\n`;
                }
            }
        }
        
        // Cerrar cualquier lista abierta
        if (isInList) {
            html += '</ul>\n';
        }
        
        return html;
    } catch (error) {
        console.error('rtfToHtml: Error al convertir RTF a HTML:', error);
        
        // Método de respaldo en caso de error
        try {
            console.log('rtfToHtml: Intentando método de respaldo simple');
            
            // Extraer texto plano eliminando códigos RTF
            let plainText = rtf
                .replace(/{\\rtf1.*?}/gs, '')
                .replace(/\\[a-z0-9]+/g, ' ')
                .replace(/\{|\}/g, '')
                .replace(/\s+/g, ' ')
                .replace(/^\s*[db]\s+/, '') // Eliminar 'd' o 'b' al inicio
                .replace(/[db]\s+•/g, '•') // Eliminar 'd' o 'b' antes de viñetas
                .replace(/[db]\s+(\d+)\./g, '$1.') // Eliminar 'd' o 'b' antes de números
                .replace(/Segoe UI;\s*;?\s*;?/g, '') // Eliminar "Segoe UI; ; ;"
                .replace(/Trebuchet MS;\s*;?\s*;?/g, '') // Eliminar "Trebuchet MS; ; ;"
                .replace(/Arial;\s*Arial;{2,3}/g, '') // Eliminar "Arial; Arial;;;"
                .replace(/Â/g, ' ') // Eliminar caracteres Â no deseados
                .replace(/-360\s*/g, '') // Eliminar "-360" que aparece en las viñetas
                .trim();
            
            return `<p>${plainText}</p>`;
        } catch (e) {
            console.error('rtfToHtml: Error en método de respaldo:', e);
            return `<p>Error al convertir el contenido RTF: ${e.message}</p>`;
        }
    }
}

/**
 * Limpia y mejora el HTML generado
 * @param {string} html - El HTML a limpiar
 * @return {string} - El HTML limpio
 */
function cleanHtml(html) {
    try {
        // Eliminar cualquier texto de fuente residual
        html = html.replace(/Segoe UI;\s*;?\s*;?/g, '');
        html = html.replace(/Trebuchet MS;\s*;?\s*;?/g, '');
        html = html.replace(/Arial;\s*Arial;{2,3}/g, '');
        
        // Eliminar caracteres Â no deseados
        html = html.replace(/Â+\s*/g, '');
        html = html.replace(/\s+Â+/g, ' ');
        
        // Corregir espacios entre palabras que tienen una letra minúscula seguida de mayúscula
        html = html.replace(/([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2');
        
        // Asegurar que haya un espacio después de cada punto (excepto en números decimales)
        html = html.replace(/\.([A-Za-zÁÉÍÓÚáéíóúÑñÜü])/g, '. $1');
        
        // Asegurar que haya un espacio después de los dos puntos
        html = html.replace(/:([^\s])/g, ': $1');
        
        // Corregir espacios dobles
        html = html.replace(/\s{2,}/g, ' ');
        
        // Eliminar texto duplicado en párrafos (especialmente en secciones numeradas)
        const paragraphs = html.split('\n');
        const uniqueParagraphs = [];
        const seen = new Set();
        
        for (const paragraph of paragraphs) {
            const trimmed = paragraph.trim();
            if (!seen.has(trimmed) || trimmed.match(/^<(h[1-6]|p|ul|ol|li)>/)) {
                uniqueParagraphs.push(paragraph);
                seen.add(trimmed);
            }
        }
        
        return uniqueParagraphs.join('\n');
    } catch (error) {
        console.error('cleanHtml: Error al limpiar HTML:', error);
        return html;
    }
}

/**
 * Extrae y limpia el texto de un documento RTF
 * @param {string} rtfText - El texto RTF a procesar
 * @return {string} - El HTML resultante
 */
function extractCleanText(rtfText) {
    // Eliminar códigos RTF comunes
    let text = rtfText
        .replace(/\{\\rtf1.*?}/gs, '')
        .replace(/\\[a-z]+\d*/g, ' ')
        .replace(/\{|\}/g, '')
        .replace(/\\'([0-9a-f]{2})/g, function(match, hex) {
            // Convertir códigos hexadecimales a caracteres
            return String.fromCharCode(parseInt(hex, 16));
        });
    
    // Eliminar 'd' o 'b' al inicio
    text = text.replace(/^[db]\s+/, '');
    text = text.replace(/^[db]/, '');
    
    // Eliminar caracteres de viñeta
    text = text.replace(/•\s*/, '');
    text = text.replace(/\\bullet\s*/, '');
    text = text.replace(/\\b7\s*/, '');
    text = text.replace(/\\u183\?/, '');
    text = text.replace(/\\u00B7\?/, '');
    
    // Eliminar "Segoe UI; ; ;" que puede aparecer en el texto
    text = text.replace(/Segoe UI;\s*;?\s*;?/g, '');
    text = text.replace(/Trebuchet MS;\s*;?\s*;?/g, '');
    text = text.replace(/Arial;\s*Arial;{2,3}/g, '');
    
    // Eliminar caracteres Â no deseados
    text = text.replace(/Â/g, ' ');
    
    // Eliminar "-360" que aparece en las viñetas
    text = text.replace(/-360\s*/g, '');
    
    // Limpiar espacios múltiples
    text = text.replace(/\s+/g, ' ').trim();
    
    return decodeRtfCharacters(text);
}

/**
 * Decodifica caracteres especiales de RTF
 * @param {string} text - El texto a decodificar
 * @return {string} - El texto decodificado
 */
function decodeRtfCharacters(text) {
    try {
        // Reemplazar secuencias de escape RTF con sus caracteres correspondientes
        return text
            .replace(/\\'e1/g, 'á')
            .replace(/\\'e9/g, 'é')
            .replace(/\\'ed/g, 'í')
            .replace(/\\'f3/g, 'ó')
            .replace(/\\'fa/g, 'ú')
            .replace(/\\'c1/g, 'Á')
            .replace(/\\'c9/g, 'É')
            .replace(/\\'cd/g, 'Í')
            .replace(/\\'d3/g, 'Ó')
            .replace(/\\'da/g, 'Ú')
            .replace(/\\'f1/g, 'ñ')
            .replace(/\\'d1/g, 'Ñ')
            .replace(/\\'fc/g, 'ü')
            .replace(/\\'dc/g, 'Ü')
            .replace(/\\'a9/g, '©')
            .replace(/\\'ae/g, '®')
            .replace(/\\'99/g, '™')
            .replace(/\\'80/g, '€')
            .replace(/\\'a3/g, '£')
            .replace(/\\'b0/g, '°')
            .replace(/\\'ab/g, '«')
            .replace(/\\'bb/g, '»')
            .replace(/\\'[0-9a-fA-F]{2}/g, ''); // Eliminar otras secuencias de escape no reconocidas
    } catch (error) {
        console.error('decodeRtfCharacters: Error al decodificar caracteres:', error);
        return text;
    }
} 