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
        if (!rtf) {
            console.error('rtfToHtml: No se proporcionó contenido RTF');
            return '';
        }

        // Eliminar cualquier 'd' o 'b' al inicio del documento
        rtf = rtf.replace(/^[db]\s+/, '');
        
        // Comprobar si es un documento RTF válido
        if (!rtf.startsWith('{\\rtf1')) {
            console.warn('rtfToHtml: El contenido no parece ser un documento RTF válido');
            return `<div>${rtf}</div>`;
        }

        // Extraer el texto del documento RTF
        let html = extractCleanText(rtf);
        
        // Verificar si hay contenido después de la extracción
        if (!html || html.trim() === '') {
            console.warn('rtfToHtml: No se pudo extraer contenido del documento RTF');
            return '<div><p>No se pudo extraer contenido del documento RTF.</p></div>';
        }
        
        // Corregir problemas comunes en el HTML resultante
        html = cleanHtml(html);

        return html;
    } catch (error) {
        console.error('rtfToHtml: Error al convertir RTF a HTML:', error);
        return `<div><p>Error al convertir RTF a HTML: ${error.message}</p></div>`;
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
    try {
        let html = '';
        let isInList = false;
        let listType = '';
        let listCounter = 1;
        
        // Dividir el RTF en párrafos basados en delimitadores comunes
        const paragraphs = rtfText.split(/\\par |\\pard/);
        
        for (let paragraph of paragraphs) {
            // Ignorar líneas vacías o que solo contienen códigos RTF
            if (!paragraph || paragraph.trim().length === 0) continue;
            
            // Detectar listas
            const isBulletPoint = paragraph.includes('\\bullet') || paragraph.includes('\\fi-360');
            const isNumberedList = /\\fi-360.*\d+\./.test(paragraph);
            
            // Extraer texto del párrafo, eliminando comandos RTF
            let text = paragraph;
            
            // Eliminar comandos RTF
            text = text.replace(/{\\rtf1.*?\\viewkind4/gs, '');
            text = text.replace(/{\\[^{}]*}/g, '');
            text = text.replace(/\\[a-z0-9]+/g, '');
            text = text.replace(/[{}\\]/g, '');
            
            // Decodificar caracteres RTF especiales como acentos
            text = decodeRtfCharacters(text);
            
            // Eliminar la 'd' o 'b' que aparece al inicio de los párrafos
            text = text.replace(/^[db]\s+/, '');
            text = text.replace(/^[db]/, '');
            // Eliminar '\b' que aparece al inicio de los párrafos en negrita
            text = text.replace(/^\\b\s+/, '');
            
            // Eliminar "Trebuchet MS; ; ;" o "Arial; Arial;;;" que puede aparecer en el texto
            text = text.replace(/Trebuchet MS;\s*;?\s*;?/g, '');
            text = text.replace(/Arial;\s*Arial;{2,3}/g, '');
            text = text.replace(/Segoe UI;\s*;?\s*;?/g, '');
            
            // Eliminar caracteres Â no deseados
            text = text.replace(/Â+\s*/g, '');
            
            // Corregir palabras juntas sin espacio (letra minúscula seguida de mayúscula)
            text = text.replace(/([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2');
            
            text = text.trim();
            
            if (text) {
                // Procesar viñetas y listas numeradas
                if (isBulletPoint) {
                    // Iniciar lista de viñetas si no está ya iniciada
                    if (!isInList || listType !== 'ul') {
                        // Cerrar lista anterior si estaba en una diferente
                        if (isInList) {
                            html += `</${listType}>\n`;
                        }
                        html += '<ul>\n';
                        isInList = true;
                        listType = 'ul';
                    }
                    
                    // Limpiar el texto de la viñeta
                    text = text.replace(/^\s*•\s*/, '').trim();
                    text = text.replace(/^-\s*/, '').trim();
                    text = text.replace(/^-360\s*/, '').trim();
                    
                    html += `<li>${text}</li>\n`;
                } else if (isNumberedList) {
                    // Iniciar lista numerada si no está ya iniciada
                    if (!isInList || listType !== 'ol') {
                        // Cerrar lista anterior si estaba en una diferente
                        if (isInList) {
                            html += `</${listType}>\n`;
                        }
                        html += '<ol>\n';
                        isInList = true;
                        listType = 'ol';
                        listCounter = 1;
                    }
                    
                    // Limpiar el texto de la numeración
                    text = text.replace(/^\s*\d+\.\s*/, '').trim();
                    
                    html += `<li>${text}</li>\n`;
                    listCounter++;
                } else {
                    // Cerrar cualquier lista abierta
                    if (isInList) {
                        html += `</${listType}>\n`;
                        isInList = false;
                        listType = '';
                    }
                    
                    // Detectar si está en negrita
                    if (paragraph.includes('\\b')) {
                        html += `<p><strong>${text}</strong></p>\n`;
                    } else {
                        html += `<p>${text}</p>\n`;
                    }
                }
            }
        }
        
        // Cerrar cualquier lista abierta
        if (isInList) {
            html += `</${listType}>\n`;
        }
        
        return html;
    } catch (error) {
        console.error('extractCleanText: Error al extraer texto limpio:', error);
        
        // Método de respaldo en caso de error
        try {
            console.log('rtfToHtml: Intentando método de respaldo simple');
            
            // Extraer texto plano eliminando códigos RTF
            let plainText = rtfText
                .replace(/{\\rtf1.*?}/gs, '')
                .replace(/\\[a-z0-9]+/g, '')
                .replace(/[{}\\]/g, '')
                .replace(/^[db]\s+/, '')
                .replace(/Â+\s*/g, '')
                .trim();
            
            if (plainText) {
                return `<div><p>${plainText}</p></div>`;
            } else {
                return '<div><p>No se pudo extraer contenido del documento RTF.</p></div>';
            }
        } catch (e) {
            console.error('rtfToHtml: Error en método de respaldo:', e);
            return '<div><p>Error al procesar el documento RTF.</p></div>';
        }
    }
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