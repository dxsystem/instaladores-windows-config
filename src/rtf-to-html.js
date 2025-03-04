/**
 * Conversor de RTF a HTML
 * Este archivo contiene funciones para convertir contenido RTF a formato HTML
 * para su visualización en la web.
 * 
 * Versión 1.5 - Correcciones adicionales para manejo de caracteres especiales y viñetas
 */

// Convertir RTF a HTML
function rtfToHtml(rtf) {
    try {
        if (!rtf || typeof rtf !== 'string') {
            console.error('rtfToHtml: El contenido RTF es inválido');
            return '';
        }
        
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
                
                // Eliminar la 'd' que aparece al inicio de los encabezados
                text = text.replace(/^d\s+/, '');
                text = text.replace(/^d/, '');
                
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
                
                // Eliminar caracteres de viñeta y 'd' no deseados
                text = text.replace(/^d\s*/, '');
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
    
    // Eliminar códigos de control RTF
    let text = rtfText
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
    text = text.replace(/d\s+(\d+)\.\s+/g, '$1. ');
    
    // Eliminar 'd' suelta
    text = text.replace(/\s+d\s+/g, ' ');
    text = text.replace(/\s+d$/g, '');
    
    // Eliminar códigos de viñeta
    text = text
        .replace(/\\bullet/g, '')
        .replace(/\\b7/g, '')
        .replace(/\\u8226/g, '')
        .replace(/\\u183/g, '')
        .replace(/\\u00B7/g, '')
        .replace(/•\s*/, '');
    
    // Convertir saltos de línea y tabulaciones
    text = text
        .replace(/\\line/g, '<br>')
        .replace(/\\tab/g, '    ');
    
    // Eliminar llaves y caracteres de control restantes
    text = text.replace(/\{|\}/g, '');
    
    // Decodificar caracteres especiales
    text = decodeRtfCharacters(text);
    
    // Eliminar cualquier código RTF restante
    text = text.replace(/\\[a-z]+\d*/g, '');
    
    // Eliminar barras invertidas antes de caracteres especiales
    text = text.replace(/\\([áéíóúÁÉÍÓÚñÑüÜ©®°])/g, '$1');
    text = text.replace(/\\([a-zA-Z])/g, '$1');
    
    // Eliminar espacios múltiples
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