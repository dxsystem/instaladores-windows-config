/**
 * Conversor de RTF a HTML
 * Versión: 1.2.5
 * 
 * Este archivo contiene funciones para convertir contenido RTF a HTML.
 * Incluye correcciones para manejar caracteres especiales y viñetas.
 * 
 * Correcciones:
 * - Eliminación de caracteres 'd' no deseados al inicio del documento, antes de viñetas y después de listas
 * - Eliminación de 'd' antes de números de sección
 * - Mejora en el manejo de viñetas y listas
 * - Soporte para caracteres acentuados
 * - Mejora en la detección de encabezados
 * - Eliminación de "Segoe UI; Segoe UI;;;" y otras referencias a fuentes en el texto
 * - Mejora en el manejo de espacios entre palabras en mayúsculas
 * - Corrección de espaciado después de negritas y entre párrafos
 * - Eliminación de texto de tabla de fuentes en el HTML
 * - Optimización para eliminar completamente cualquier info de fuentes
 */

// Convertir RTF a HTML
function rtfToHtml(rtf) {
    try {
        if (!rtf || typeof rtf !== 'string') {
            console.error('rtfToHtml: El contenido RTF es inválido');
            return '';
        }
        
        // Eliminar completamente la tabla de fuentes y la tabla de colores
        rtf = rtf.replace(/\{\\fonttbl.*?\}/gs, '');
        rtf = rtf.replace(/\{\\colortbl.*?\}/gs, '');
        rtf = rtf.replace(/\{\\stylesheet.*?\}/gs, '');
        rtf = rtf.replace(/\{\\info.*?\}/gs, '');
        rtf = rtf.replace(/\{\\listtable.*?\}/gs, '');
        rtf = rtf.replace(/\{\\listoverridetable.*?\}/gs, '');
        
        // Eliminar cualquier referencia a fuentes específicas
        rtf = rtf.replace(/Times New Roman;.*?(\*|\})/gs, '');
        rtf = rtf.replace(/Segoe UI;.*?(\*|\})/gs, '');
        rtf = rtf.replace(/Segoe U I;.*?(\*|\})/gs, '');
        rtf = rtf.replace(/Aptos;.*?(\*|\})/gs, '');
        rtf = rtf.replace(/\\f\d+\\.*?(\*|\})/gs, '');
        
        // Eliminar nombres de fuentes sueltos y patrones problemáticos
        rtf = rtf.replace(/Times New Roman;/g, '');
        rtf = rtf.replace(/Segoe UI;/g, '');
        rtf = rtf.replace(/Segoe U I;/g, '');
        rtf = rtf.replace(/Aptos;/g, '');
        rtf = rtf.replace(/\\f\d+/g, '');
        rtf = rtf.replace(/;+/g, '');
        rtf = rtf.replace(/\\(\\\*)+/g, '');
        rtf = rtf.replace(/\\\*\\·/g, '');
        rtf = rtf.replace(/\.;+/g, '.');
        
        // Eliminar cualquier 'd' al inicio del documento completo
        rtf = rtf.replace(/^d\s+/m, '');
        
        // Eliminar 'd' que aparece antes de las viñetas
        rtf = rtf.replace(/d\\bullet/g, '\\bullet');
        rtf = rtf.replace(/d\\b7/g, '\\b7');
        rtf = rtf.replace(/d\s+•/g, '•');
        
        // Eliminar 'd' que aparece después de las listas
        rtf = rtf.replace(/\\par\s+d\s+/g, '\\par ');
        
        // Eliminar 'd' que aparece antes de números de sección
        rtf = rtf.replace(/d\s+(\d+)\.\s+/g, '$1. ');
        rtf = rtf.replace(/\\par\s+d\s*(\d+)\./g, '\\par $1.');
        rtf = rtf.replace(/d\s*\n*\s*(\d+)\./g, '$1.');
        
        // Remover símbolos extraños en las viñetas
        rtf = rtf.replace(/\\'B7\s*\\\*\\'B7/g, '');
        rtf = rtf.replace(/\\'B7/g, '');
        rtf = rtf.replace(/\\b7/g, '•');
        rtf = rtf.replace(/\\bullet/g, '•');
        
        // Insertar espacios entre palabras en mayúsculas para corregir texto como "PORFA VOR"
        rtf = rtf.replace(/([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2');
        
        // Asegurar espacios entre palabras en mayúsculas pero sin duplicarlos
        rtf = rtf.replace(/([A-ZÁÉÍÓÚÑ]{2,})\s+([A-ZÁÉÍÓÚÑ]{2,})/g, '$1 $2');
        
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
            if (paragraph.includes('\\fs40\\b') || paragraph.includes('\\fs36\\b') || 
                paragraph.includes('\\fs32\\b') || paragraph.includes('\\fs28\\b') || 
                paragraph.includes('\\fs24\\b') || paragraph.includes('\\b\\fs')) {
                
                let text = extractCleanText(paragraph);
                
                // Eliminar la 'd' que aparece al inicio de los encabezados
                text = text.replace(/^d\s+/, '');
                text = text.replace(/^d/, '');
                
                if (text.trim()) {
                    if (paragraph.includes('\\fs40')) {
                        html += `<h1>${text}</h1>\n`;
                    } else if (paragraph.includes('\\fs36')) {
                        html += `<h2>${text}</h2>\n`;
                    } else if (paragraph.includes('\\fs32') || paragraph.includes('\\fs28')) {
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
                
                // Eliminar caracteres de viñeta y 'd' no deseados
                text = text.replace(/^d\s*/, '');
                text = text.replace(/^•\s*/, '');
                text = text.replace(/\\bullet\s*/, '');
                text = text.replace(/\\b7\s*/, '');
                text = text.replace(/\\u183\?/, '');
                text = text.replace(/\\u00B7\?/, '');
                text = text.replace(/\\'B7\s*\\\*\\'B7/g, '');
                text = text.replace(/\\'B7/g, '');
                
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
            
            // Detectar números de sección (como "4. Descargo de Responsabilidad")
            const cleanText = extractCleanText(paragraph);
            if (/^\d+\.\s+\w+/.test(cleanText)) {
                let text = cleanText;
                
                // Eliminar la 'd' que aparece al inicio
                text = text.replace(/^d\s+/, '');
                text = text.replace(/^d/, '');
                
                if (text.trim()) {
                    html += `<p><strong>${text}</strong></p>\n`;
                    continue;
                }
            }
            
            // Párrafos normales
            let text = extractCleanText(paragraph);
            
            // Eliminar la 'd' que aparece al inicio de los párrafos
            text = text.replace(/^d\s+/, '');
            text = text.replace(/^d/, '');
            // Eliminar '\b' que aparece al inicio de los párrafos en negrita
            text = text.replace(/^\\b\s+/, '');
            
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
                .replace(/^\s*d\s+/, '') // Eliminar 'd' al inicio
                .replace(/d\s+•/g, '•') // Eliminar 'd' antes de viñetas
                .replace(/d\s+(\d+)\./g, '$1.') // Eliminar 'd' antes de números
                .replace(/Segoe UI;\s*Segoe UI;+/g, '') // Eliminar "Segoe UI; Segoe UI;;;"
                .replace(/Segoe U I;+/g, '') // Eliminar "Segoe U I;;;"
                .replace(/Times New Roman;/g, '') // Eliminar referencia a Times New Roman
                .replace(/Aptos;+/g, '') // Eliminar referencia a Aptos
                .replace(/\\f\d+/g, '') // Eliminar referencias a fuentes
                .replace(/;+/g, '') // Eliminar punto y comas
                .replace(/\\(\\\*)+/g, '') // Eliminar caracteres extraños
                .replace(/\\\*\\·/g, '') // Eliminar caracteres extraños
                // Insertar espacios entre palabras en mayúsculas
                .replace(/([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
                // Asegurar espacios entre palabras en mayúsculas sin duplicarlos
                .replace(/([A-ZÁÉÍÓÚÑ]{2,})\s+([A-ZÁÉÍÓÚÑ]{2,})/g, '$1 $2')
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
    if (!rtfText) return '';
    
    // Primer paso: Eliminar referencias a la tabla de fuentes y a fuentes específicas
    let text = rtfText;
    
    // Eliminar referencias a fuentes específicas al inicio del texto
    text = text.replace(/Times New Roman;.*?(\\|\*|\})/g, '');
    text = text.replace(/Segoe UI;.*?(\\|\*|\})/g, '');
    text = text.replace(/Segoe U I;.*?(\\|\*|\})/g, '');
    text = text.replace(/Aptos;.*?(\\|\*|\})/g, '');
    text = text.replace(/\\f\d.*?(\\|\*|\})/g, '');
    text = text.replace(/\\f\d+/g, '');
    text = text.replace(/;+/g, '');
    text = text.replace(/\\(\\|\*)+/g, '');
    text = text.replace(/\\\*\\·/g, '');
    text = text.replace(/\.;+/g, '.');
    
    // Eliminar códigos de control RTF
    text = text
        // Eliminar códigos de formato de párrafo
        .replace(/\\pard/g, '')
        .replace(/\\plain/g, '')
        .replace(/\\f\d+/g, '')
        .replace(/\\fs\d+/g, '')
        .replace(/\\cf\d+/g, '')
        .replace(/\\highlight\d+/g, '')
        .replace(/\\ltrch/g, '')
        .replace(/\\rtlch/g, '')
        .replace(/\\lang\d+/g, '')
        .replace(/\\langfe\d+/g, '')
        .replace(/\\langnp\d+/g, '')
        .replace(/\\langfenp\d+/g, '')
        .replace(/\\fi-?\d+/g, '')
        .replace(/\\li\d+/g, '')
        .replace(/\\sa\d+/g, '')
        .replace(/\\sl\d+/g, '')
        .replace(/\\slmult\d+/g, '')
        .replace(/\\tx\d+/g, '')
        .replace(/\\itap\d+/g, '')
        .replace(/\\ltrpar/g, '')
        .replace(/\\rtlpar/g, '')
        .replace(/\\qj/g, '')
        .replace(/\\ql/g, '')
        .replace(/\\qr/g, '')
        .replace(/\\qc/g, '');
    
    // Eliminar códigos de lista
    text = text
        .replace(/\\pntext/g, '')
        .replace(/\\pnlvlblt/g, '')
        .replace(/\\pnlvlbody/g, '')
        .replace(/\\pnlvlcont/g, '')
        .replace(/\\pnlvlbody/g, '')
        .replace(/\\pnstart\d+/g, '')
        .replace(/\\pnindent\d+/g, '')
        .replace(/\\pnhang/g, '')
        .replace(/\\pntxtb/g, '')
        .replace(/\\pntxta/g, '')
        .replace(/\\pncard/g, '');
    
    // Eliminar caracteres 'd' al inicio de líneas
    text = text
        .replace(/^d\s+/gm, '')
        .replace(/^d/gm, '')
        .replace(/\\par\s+d\s+/g, '\\par ')
        .replace(/\\bullet\s+d\s+/g, '\\bullet ');
    
    // Eliminar 'd' antes de números
    text = text
        .replace(/d\s+(\d+)\./g, '$1.')
        .replace(/d\s*(\d+)\./g, '$1.');
    
    // Eliminar códigos de formato de carácter
    text = text
        .replace(/\\b(?!\d)/g, '') // Mantener \b seguido de dígitos (como \b0)
        .replace(/\\b0/g, '')
        .replace(/\\i(?!\d)/g, '')
        .replace(/\\i0/g, '')
        .replace(/\\ul(?!\d)/g, '')
        .replace(/\\ul0/g, '')
        .replace(/\\ulnone/g, '')
        .replace(/\\strike(?!\d)/g, '')
        .replace(/\\strike0/g, '')
        .replace(/\\super(?!\d)/g, '')
        .replace(/\\super0/g, '')
        .replace(/\\sub(?!\d)/g, '')
        .replace(/\\sub0/g, '')
        .replace(/\\expnd\d+/g, '')
        .replace(/\\expndtw\d+/g, '')
        .replace(/\\kerning\d+/g, '')
        .replace(/\\outl(?!\d)/g, '')
        .replace(/\\outl0/g, '')
        .replace(/\\up\d+/g, '')
        .replace(/\\dn\d+/g, '')
        .replace(/\\nosupersub/g, '')
        .replace(/\\charscalex\d+/g, '')
        .replace(/\\caps(?!\d)/g, '')
        .replace(/\\caps0/g, '')
        .replace(/\\scaps(?!\d)/g, '')
        .replace(/\\scaps0/g, '')
        .replace(/\\v(?!\d)/g, '')
        .replace(/\\v0/g, '')
        .replace(/\\revised/g, '')
        .replace(/\\noproof/g, '')
        .replace(/\\lang\d+/g, '')
        .replace(/\\ltrch/g, '')
        .replace(/\\rtlch/g, '');
    
    // Eliminar códigos de control unicode
    text = text
        .replace(/\\u\d+\?/g, '')
        .replace(/\\'[0-9a-f]{2}/g, function(match) {
            // Convertir la representación hexadecimal a un carácter
            try {
                const hexValue = match.substring(2);
                const decimalValue = parseInt(hexValue, 16);
                return String.fromCharCode(decimalValue);
            } catch (e) {
                return '';
            }
        });
    
    // Eliminar secuencias de escape y otras
    text = text
        .replace(/\\\\/g, '\\')
        .replace(/\\{/g, '{')
        .replace(/\\}/g, '}')
        .replace(/\\\n/g, '')
        .replace(/\\\r/g, '');
    
    // Eliminar llaves, espacios múltiples y otros caracteres extraños
    text = text
        .replace(/\{|\}/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\\$/g, '')
        .replace(/\\/g, '')
        .replace(/\*+/g, '')
        .replace(/·+/g, '')
        .replace(/\.;+/g, '.')
        .replace(/;+/g, '')
        .replace(/\s+\./g, '.')
        .replace(/\.\s+/g, '. ');
    
    // Agregar espacios después de caracteres de puntuación si no hay
    text = text
        .replace(/\.([A-Z])/g, '. $1')
        .replace(/\,([A-Z])/g, ', $1')
        .replace(/\:([A-Z])/g, ': $1')
        .replace(/\;([A-Z])/g, '; $1')
        .replace(/\!([A-Z])/g, '! $1')
        .replace(/\?([A-Z])/g, '? $1');
    
    // Insertar espacios entre palabras en mayúsculas
    text = text.replace(/([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2');
    
    // Asegurar que haya un espacio entre palabras con letras mayúsculas y minúsculas
    text = text.replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2');
    
    // Corregir espacios múltiples
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
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