/**
 * Conversor de RTF a HTML
 * Versión: 1.6.0
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
 * - Mejorada la detección de encabezados (H1, H2, H3)
 * - Eliminación del "360" que aparece antes de las viñetas
 * - Corrección del procesamiento de caracteres acentuados
 * - Mejorado el espaciado entre palabras
 * - Eliminación de caracteres extraños en las viñetas
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
        
        // Corregir 360 que aparece al inicio de las viñetas
        html = html.replace(/<li>360\s*-?\s*/g, '<li>');
        html = html.replace(/<li>•-\s*/g, '<li>');
        
        // Corregir problemas con las viñetas
        html = html.replace(/<li>-\s*/g, '<li>');
        
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
        
        // Detectar encabezados y estilos
        const hasHeaders = rtfText.includes('\\fs28\\b') || rtfText.includes('\\fs32\\b') || 
                         rtfText.includes('\\fs36\\b') || rtfText.includes('\\fs40\\b');
        
        // Dividir el RTF en párrafos basados en delimitadores comunes
        const paragraphs = rtfText.split(/\\par |\\pard/);
        
        for (let paragraph of paragraphs) {
            // Ignorar líneas vacías o que solo contienen códigos RTF
            if (!paragraph || paragraph.trim().length === 0) continue;
            
            // Detectar encabezados
            const isH1 = paragraph.includes('\\fs40\\b') || paragraph.includes('\\b\\fs40');
            const isH2 = paragraph.includes('\\fs36\\b') || paragraph.includes('\\b\\fs36');
            const isH3 = paragraph.includes('\\fs28\\b') || paragraph.includes('\\b\\fs28') || 
                        paragraph.includes('\\fs32\\b') || paragraph.includes('\\b\\fs32');
            
            // Detectar listas
            const isBulletPoint = paragraph.includes('\\bullet') || paragraph.includes('\\fi-360') || 
                                paragraph.includes('•') || paragraph.includes('-360');
            const isNumberedList = /\\fi-360.*\d+\./.test(paragraph) || /^\s*\d+\./.test(paragraph);
            
            // Extraer texto del párrafo, eliminando comandos RTF
            let text = paragraph;
            
            // Eliminar comandos RTF
            text = text.replace(/{\\rtf1.*?\\viewkind4/gs, '');
            text = text.replace(/{\\[^{}]*}/g, '');
            text = text.replace(/\\[a-z0-9]+/g, ' '); // Espacio en lugar de vacío para preservar separaciones
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
            
            // Eliminar "360" al inicio de viñetas
            text = text.replace(/^\s*360\s*-?\s*/, '');
            text = text.replace(/^\s*-360\s*/, '');
            
            text = text.trim();
            
            if (text) {
                // Procesar encabezados
                if (isH1) {
                    // Cerrar cualquier lista abierta
                    if (isInList) {
                        html += `</${listType}>\n`;
                        isInList = false;
                        listType = '';
                    }
                    html += `<h1>${text}</h1>\n`;
                }
                else if (isH2) {
                    // Cerrar cualquier lista abierta
                    if (isInList) {
                        html += `</${listType}>\n`;
                        isInList = false;
                        listType = '';
                    }
                    html += `<h2>${text}</h2>\n`;
                }
                else if (isH3) {
                    // Cerrar cualquier lista abierta
                    if (isInList) {
                        html += `</${listType}>\n`;
                        isInList = false;
                        listType = '';
                    }
                    html += `<h3>${text}</h3>\n`;
                }
                // Procesar viñetas y listas numeradas
                else if (isBulletPoint) {
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
                    text = text.replace(/^\s*-\s*/, '').trim();
                    text = text.replace(/^\s*360\s*-?\s*/, '').trim();
                    text = text.replace(/^\s*-360\s*/, '').trim();
                    
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
                    if (paragraph.includes('\\b') && !isH1 && !isH2 && !isH3) {
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
                .replace(/\\[a-z0-9]+/g, ' ') // Espacio en lugar de vacío para preservar separaciones
                .replace(/[{}\\]/g, '')
                .replace(/^[db]\s+/, '')
                .replace(/Â+\s*/g, '')
                .trim();
            
            // Decodificar caracteres especiales
            plainText = decodeRtfCharacters(plainText);
            
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
        let decoded = text
            // Vocales acentuadas minúsculas
            .replace(/\\'e1/g, 'á')
            .replace(/\\'e9/g, 'é')
            .replace(/\\'ed/g, 'í')
            .replace(/\\'f3/g, 'ó')
            .replace(/\\'fa/g, 'ú')
            // Vocales acentuadas mayúsculas
            .replace(/\\'c1/g, 'Á')
            .replace(/\\'c9/g, 'É')
            .replace(/\\'cd/g, 'Í')
            .replace(/\\'d3/g, 'Ó')
            .replace(/\\'da/g, 'Ú')
            // Otros caracteres españoles
            .replace(/\\'f1/g, 'ñ')
            .replace(/\\'d1/g, 'Ñ')
            .replace(/\\'fc/g, 'ü')
            .replace(/\\'dc/g, 'Ü')
            .replace(/\\'bf/g, '¿')
            .replace(/\\'a1/g, '¡')
            // Símbolos comunes
            .replace(/\\'a9/g, '©')
            .replace(/\\'ae/g, '®')
            .replace(/\\'99/g, '™')
            .replace(/\\'80/g, '€')
            .replace(/\\'a3/g, '£')
            .replace(/\\'b0/g, '°')
            .replace(/\\'ab/g, '«')
            .replace(/\\'bb/g, '»');
        
        // Buscar otros códigos hexadecimales de RTF y convertirlos
        decoded = decoded.replace(/\\'([0-9a-f]{2})/g, function(match, hex) {
            try {
                // Mapeo específico para caracteres especiales comunes
                const charMap = {
                    'e1': 'á', 'e9': 'é', 'ed': 'í', 'f3': 'ó', 'fa': 'ú',
                    'c1': 'Á', 'c9': 'É', 'cd': 'Í', 'd3': 'Ó', 'da': 'Ú',
                    'f1': 'ñ', 'd1': 'Ñ', 'fc': 'ü', 'dc': 'Ü',
                    'bf': '¿', 'a1': '¡', 'a9': '©', 'ae': '®'
                };
                
                if (charMap[hex]) {
                    return charMap[hex];
                }
                
                // Si no está en el mapeo, intentar convertir el código hexadecimal
                const charCode = parseInt(hex, 16);
                if (charCode > 127) { // Solo convertir caracteres no ASCII
                    return String.fromCharCode(charCode);
                }
                return '';
            } catch (e) {
                console.warn('Error al decodificar carácter RTF:', match, e);
                return '';
            }
        });
        
        // Limpiar códigos de Unicode
        decoded = decoded.replace(/\\u([0-9]+)\?/g, function(match, code) {
            try {
                return String.fromCharCode(parseInt(code, 10));
            } catch (e) {
                console.warn('Error al decodificar carácter Unicode:', match, e);
                return '';
            }
        });
        
        return decoded;
    } catch (error) {
        console.error('decodeRtfCharacters: Error al decodificar caracteres:', error);
        return text;
    }
} 