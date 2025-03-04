/**
 * Conversor de RTF a HTML
 * Versión: 1.3.0
 * 
 * Este archivo contiene funciones para convertir contenido RTF a HTML.
 * Incluye correcciones para manejar caracteres especiales y viñetas.
 * 
 * Correcciones:
 * - Eliminación de caracteres 'd' y 'b' no deseados al inicio del documento, antes de viñetas y después de listas
 * - Mejora en el manejo de viñetas y listas
 * - Soporte para caracteres acentuados
 * - Eliminación de símbolos extraños como "Arial; Arial;;;"
 */

// Convertir RTF a HTML
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
        
        // Eliminar "Arial; Arial;;;" que puede aparecer en el texto
        rtf = rtf.replace(/Arial;\s*Arial;{2,3}/g, '');
        
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
            if (paragraph.includes('\\bullet') || paragraph.includes('\\b7') || paragraph.includes('\\pntext') || paragraph.includes('•')) {
                let text = extractCleanText(paragraph);
                
                // Eliminar caracteres de viñeta y 'd' o 'b' no deseados
                text = text.replace(/^[db]\s*/, '');
                text = text.replace(/^•\s*/, '');
                text = text.replace(/\\bullet\s*/, '');
                text = text.replace(/\\b7\s*/, '');
                text = text.replace(/\\u183\?/, '');
                text = text.replace(/\\u00B7\?/, '');
                
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
            if (isInList && !paragraph.includes('\\bullet') && !paragraph.includes('\\b7') && !paragraph.includes('\\pntext') && !paragraph.includes('•')) {
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
            
            // Eliminar "Arial; Arial;;;" que puede aparecer en el texto
            text = text.replace(/Arial;\s*Arial;{2,3}/g, '');
            
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
                .replace(/Arial;\s*Arial;{2,3}/g, '') // Eliminar "Arial; Arial;;;"
                .trim();
            
            return `<p>${plainText}</p>`;
        } catch (e) {
            console.error('rtfToHtml: Error en método de respaldo:', e);
            return `<p>Error al convertir el contenido RTF: ${e.message}</p>`;
        }
    }
}

// Función para extraer texto limpio de un fragmento RTF
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
    
    // Eliminar "Arial; Arial;;;" que puede aparecer en el texto
    text = text.replace(/Arial;\s*Arial;{2,3}/g, '');
    
    // Limpiar espacios múltiples
    text = text.replace(/\s+/g, ' ').trim();
    
    return decodeRtfCharacters(text);
}

// Función para decodificar caracteres especiales en RTF
function decodeRtfCharacters(text) {
    if (!text) return '';
    
    // Decodificar códigos RTF específicos para tildes y caracteres especiales
    const rtfCharMap = {
        "'e1": "á", "'e9": "é", "'ed": "í", "'f3": "ó", "'fa": "ú",
        "'c1": "Á", "'c9": "É", "'cd": "Í", "'d3": "Ó", "'da": "Ú",
        "'f1": "ñ", "'d1": "Ñ", "'fc": "ü", "'dc": "Ü",
        "'bf": "¿", "'a1": "¡", "'a9": "©",
        "'ae": "®", "'b0": "°", "'b7": "·"
    };
    
    // Reemplazar códigos RTF específicos
    for (const [code, char] of Object.entries(rtfCharMap)) {
        text = text.replace(new RegExp(code, 'g'), char);
    }
    
    // Decodificar caracteres especiales en formato hexadecimal
    text = text.replace(/\\'([0-9a-f]{2})/g, function(match, hex) {
        try {
            // Convertir el código hexadecimal a decimal
            const decimal = parseInt(hex, 16);
            // Convertir el decimal a carácter
            return String.fromCharCode(decimal);
        } catch (e) {
            console.error('Error al decodificar carácter RTF:', match, e);
            return match;
        }
    });
    
    // Decodificar caracteres Unicode
    text = text.replace(/\\u(\d+)\s*\?/g, function(match, unicode) {
        try {
            // Convertir el código Unicode a carácter
            return String.fromCharCode(parseInt(unicode, 10));
        } catch (e) {
            console.error('Error al decodificar carácter Unicode:', match, e);
            return match;
        }
    });
    
    // Reemplazar códigos específicos de RTF de forma individual
    text = text.replace(/\\bullet/g, "•");
    text = text.replace(/\\endash/g, "-");
    text = text.replace(/\\emdash/g, "--");
    text = text.replace(/\\lquote/g, "'");
    text = text.replace(/\\rquote/g, "'");
    text = text.replace(/\\ldblquote/g, "\"");
    text = text.replace(/\\rdblquote/g, "\"");
    text = text.replace(/\\~/g, " ");
    text = text.replace(/\\_/g, "-");
    text = text.replace(/\\:/g, " ");
    text = text.replace(/\\;/g, " ");
    text = text.replace(/\\ltrmark/g, "");
    text = text.replace(/\\rtlmark/g, "");
    
    return text;
} 