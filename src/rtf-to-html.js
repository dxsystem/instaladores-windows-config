/**
 * Conversor de RTF a HTML
 * Este archivo contiene funciones para convertir contenido RTF a formato HTML
 * para su visualización en la web.
 */

// Convertir RTF a HTML
function rtfToHtml(rtf) {
    // Si no hay contenido RTF, devolver cadena vacía
    if (!rtf || rtf.trim() === '') {
        console.warn('rtfToHtml: No hay contenido RTF para convertir');
        return '';
    }
    
    try {
        console.log('rtfToHtml: Iniciando conversión, longitud RTF:', rtf.length);
        
        // Limpiar encabezado RTF y metadatos
        rtf = rtf.replace(/\\rtf1.*?\\viewkind\d+\\uc1/s, '');
        
        // Eliminar la letra 'd' al inicio del documento
        rtf = rtf.replace(/^\s*d\s+/m, '');
        
        // Crear el HTML base
        let html = '';
        
        // Extraer y procesar párrafos
        const paragraphs = rtf.split('\\par');
        
        // Variables para seguimiento
        let isInList = false;
        let listItems = [];
        
        // Procesar cada párrafo
        for (let i = 0; i < paragraphs.length; i++) {
            let paragraph = paragraphs[i].trim();
            
            // Saltar párrafos vacíos o muy cortos
            if (paragraph.length < 5) continue;
            
            // Saltar párrafos que solo contienen códigos de control
            if (paragraph.startsWith('\\') && !paragraph.match(/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/)) continue;
            
            // Si es el primer párrafo, eliminar cualquier 'd' al inicio
            if (i === 0) {
                paragraph = paragraph.replace(/^\s*d\s+/m, '');
            }
            
            // Detectar si es una viñeta
            const isBulletPoint = paragraph.includes('\\pntext') || 
                                 paragraph.includes('\\'+'b7') || 
                                 paragraph.includes('\\bullet') || 
                                 paragraph.includes('\\pnlvlblt') ||
                                 (paragraph.includes('\\fi-360') && paragraph.includes('\\li720')) ||
                                 paragraph.trim() === 'd';
            
            // Si encontramos solo una 'd', podría ser un marcador de viñeta
            if (paragraph.trim() === 'd' && i < paragraphs.length - 1) {
                // Verificar si el siguiente párrafo debe ser una viñeta
                continue; // Saltamos este párrafo y procesaremos el siguiente como viñeta
            }
            
            // Detectar si el párrafo anterior era solo una 'd'
            const prevParagraphWasD = i > 0 && paragraphs[i-1].trim() === 'd';
            
            // Detectar listas
            if (isBulletPoint || prevParagraphWasD) {
                // Iniciar lista si no estamos en una
                if (!isInList) {
                    html += '<ul>\n';
                    isInList = true;
                }
                
                // Extraer el texto limpio
                let listContent = extractCleanText(paragraph);
                
                // Eliminar cualquier carácter de viñeta que pueda haber quedado
                listContent = listContent.replace(/^[\s•\*\-\u2022\u25E6\u25AA\u00B7]+/, '').trim();
                
                // Eliminar la 'd' que aparece al inicio de las viñetas
                listContent = listContent.replace(/^d\s*[•\*\-\u2022\u25E6\u25AA\u00B7]?\s*/, '');
                
                // Detectar si está en negrita
                const isBold = paragraph.includes('\\b');
                
                // Solo agregar elemento de lista si tiene contenido
                if (listContent.trim()) {
                    if (isBold) {
                        html += `<li><strong>${listContent}</strong></li>\n`;
                    } else {
                        html += `<li>${listContent}</li>\n`;
                    }
                }
                
                continue;
            }
            
            // Cerrar lista si estamos saliendo de ella
            if (isInList && !isBulletPoint && !prevParagraphWasD) {
                html += '</ul>\n';
                isInList = false;
            }
            
            // Detectar encabezados
            if (paragraph.includes('\\fs') && paragraph.includes('\\b')) {
                const fontSize = paragraph.match(/\\fs(\d+)/);
                if (fontSize) {
                    const size = parseInt(fontSize[1]);
                    let headingLevel = 3; // Por defecto h3
                    
                    if (size >= 40) headingLevel = 1;
                    else if (size >= 32) headingLevel = 2;
                    else if (size >= 28) headingLevel = 3;
                    else if (size >= 24) headingLevel = 4;
                    
                    const headingText = extractCleanText(paragraph);
                    html += `<h${headingLevel}>${headingText}</h${headingLevel}>\n`;
                    continue;
                }
            }
            
            // Párrafos normales
            let text = extractCleanText(paragraph);
            
            // Eliminar la 'd' que aparece al inicio de los párrafos
            text = text.replace(/^d\s+/, '');
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
                .trim();
            
            // Eliminar la 'd' al inicio del texto
            plainText = plainText.replace(/^\s*d\s+/m, '');
            
            return `<p>${plainText}</p>`;
        } catch (e) {
            console.error('rtfToHtml: Error en método de respaldo:', e);
            return '<p>Error al procesar el contenido RTF.</p>';
        }
    }
}

// Función para extraer texto limpio de un fragmento RTF
function extractCleanText(rtfText) {
    if (!rtfText) return '';
    
    // Eliminar la 'd' al inicio del texto
    rtfText = rtfText.replace(/^\s*d\s+/m, '');
    
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
        .replace(/\\qc/g, '')
        
        // Eliminar códigos de lista
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
        .replace(/\\pncard/g, '')
        
        // Eliminar caracteres 'd' al inicio de líneas
        .replace(/^d\s+/gm, '')
        .replace(/\\par\s+d\s+/g, '\\par ')
        .replace(/\\bullet\s+d\s+/g, '\\bullet ')
        
        // Eliminar códigos de viñeta
        .replace(/\\bullet/g, '')
        .replace(/\\b7/g, '')
        .replace(/\\u8226/g, '')
        .replace(/\\u183/g, '')
        .replace(/\\u00B7/g, '')
        
        // Convertir saltos de línea y tabulaciones
        .replace(/\\line/g, '<br>')
        .replace(/\\tab/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    
    // Manejar formato de texto
    // Negrita
    text = text.replace(/\\b\s+([^\\]+?)(?:\\|\}|$)/g, '<strong>$1</strong>');
    // Cursiva
    text = text.replace(/\\i\s+([^\\]+?)(?:\\|\}|$)/g, '<em>$1</em>');
    // Subrayado
    text = text.replace(/\\ul\s+([^\\]+?)(?:\\|\}|$)/g, '<u>$1</u>');
    // Tachado
    text = text.replace(/\\strike\s+([^\\]+?)(?:\\|\}|$)/g, '<del>$1</del>');
    
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