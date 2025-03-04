/**
 * Conversor de HTML a RTF
 * Este archivo contiene funciones para convertir contenido HTML a formato RTF
 * compatible con WPF RichTextBox.
 */

// Convertir HTML a RTF mejorado
function htmlToRtf(html) {
    if (!html) return '';
    
    // Crear encabezado RTF básico - simplificado para evitar problemas
    let rtf = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang3082{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}';
    rtf += '{\\colortbl;\\red0\\green0\\blue0;}';
    rtf += '\\viewkind4\\uc1\\pard\\f0\\fs22 ';
    
    // Crear un elemento temporal para analizar el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Convertir el contenido HTML a RTF
    rtf += convertNodeToRtf(tempDiv);
    
    // Cerrar el documento RTF
    rtf += '}';
    
    // Corregir problemas específicos en el contenido RTF
    rtf = fixRtfContent(rtf);
    
    return rtf;
}

// Función para corregir problemas específicos en el contenido RTF
function fixRtfContent(content) {
    // Corregir múltiples saltos de línea consecutivos
    content = content.replace(/\\par\\par\\par+/g, '\\par\\par');
    
    // Asegurar que los párrafos vacíos se muestren correctamente
    content = content.replace(/\\par\s+\\par/g, '\\par\\par');
    
    // Corregir espacios en blanco excesivos
    content = content.replace(/\s+/g, ' ').replace(/\s+\\par/g, '\\par');
    
    // Asegurar que hay espacio después de cada párrafo para mejor legibilidad
    content = content.replace(/\\par/g, '\\par\\sa200 ');
    
    // Eliminar caracteres 'd' que aparecen al inicio de párrafos
    content = content.replace(/\\par d /g, '\\par ');
    content = content.replace(/\\bullet d /g, '\\bullet ');
    
    // Eliminar la letra 'd' al inicio del documento
    content = content.replace(/\\pard\\f0\\fs22\s+d\s+/g, '\\pard\\f0\\fs22 ');
    content = content.replace(/\\pard\\f0\\fs22\s+d([^a-zA-Z])/g, '\\pard\\f0\\fs22$1');
    
    // Verificar balance de llaves
    let openBraces = 0;
    let closeBraces = 0;
    
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '{' && (i === 0 || content[i-1] !== '\\')) {
            openBraces++;
        } else if (content[i] === '}' && (i === 0 || content[i-1] !== '\\')) {
            closeBraces++;
        }
    }
    
    // Agregar llaves de cierre faltantes
    if (openBraces > closeBraces) {
        const missingBraces = openBraces - closeBraces;
        content += '}'.repeat(missingBraces);
        console.log(`Agregadas ${missingBraces} llaves de cierre faltantes al RTF`);
    }
    
    // Eliminar llaves de cierre excesivas
    if (closeBraces > openBraces) {
        console.warn(`El RTF tiene ${closeBraces - openBraces} llaves de cierre excesivas`);
        // No eliminamos automáticamente para evitar cortar contenido importante
    }
    
    return content;
}

// Función mejorada para escapar caracteres especiales en RTF
function escapeRtf(text) {
    if (!text) return '';
    
    // Eliminar la letra 'd' al inicio del texto
    if (text.trim().startsWith('d ')) {
        text = text.replace(/^d\s+/, '');
    }
    
    // Reemplazar caracteres especiales con sus equivalentes RTF
    let escaped = text;
    
    // Caracteres de control RTF
    escaped = escaped.replace(/\\/g, '\\\\');
    escaped = escaped.replace(/\{/g, '\\{');
    escaped = escaped.replace(/\}/g, '\\}');
    
    // Caracteres acentuados y especiales - versión simplificada
    escaped = escaped.replace(/á/g, "\\'e1");
    escaped = escaped.replace(/é/g, "\\'e9");
    escaped = escaped.replace(/í/g, "\\'ed");
    escaped = escaped.replace(/ó/g, "\\'f3");
    escaped = escaped.replace(/ú/g, "\\'fa");
    escaped = escaped.replace(/Á/g, "\\'c1");
    escaped = escaped.replace(/É/g, "\\'c9");
    escaped = escaped.replace(/Í/g, "\\'cd");
    escaped = escaped.replace(/Ó/g, "\\'d3");
    escaped = escaped.replace(/Ú/g, "\\'da");
    escaped = escaped.replace(/ñ/g, "\\'f1");
    escaped = escaped.replace(/Ñ/g, "\\'d1");
    escaped = escaped.replace(/ü/g, "\\'fc");
    escaped = escaped.replace(/Ü/g, "\\'dc");
    escaped = escaped.replace(/¿/g, "\\'bf");
    escaped = escaped.replace(/¡/g, "\\'a1");
    escaped = escaped.replace(/€/g, "\\'80");
    escaped = escaped.replace(/£/g, "\\'a3");
    escaped = escaped.replace(/©/g, "\\'a9");
    escaped = escaped.replace(/®/g, "\\'ae");
    escaped = escaped.replace(/°/g, "\\'b0");
    escaped = escaped.replace(/±/g, "\\'b1");
    escaped = escaped.replace(/²/g, "\\'b2");
    escaped = escaped.replace(/³/g, "\\'b3");
    escaped = escaped.replace(/·/g, "\\'b7");
    escaped = escaped.replace(/¼/g, "\\'bc");
    escaped = escaped.replace(/½/g, "\\'bd");
    escaped = escaped.replace(/¾/g, "\\'be");
    escaped = escaped.replace(/×/g, "\\'d7");
    escaped = escaped.replace(/÷/g, "\\'f7");
    
    // Caracteres especiales que no tienen representación directa en ANSI
    // Para estos usamos una aproximación o un marcador
    escaped = escaped.replace(/[""]/g, "\"");
    escaped = escaped.replace(/['']/g, "'");
    escaped = escaped.replace(/–/g, "-");
    escaped = escaped.replace(/—/g, "--");
    escaped = escaped.replace(/•/g, "*");
    escaped = escaped.replace(/…/g, "...");
    escaped = escaped.replace(/™/g, "(TM)");
    
    return escaped;
}

// Función para convertir un nodo HTML a RTF
function convertNodeToRtf(node) {
    if (!node) return '';
    
    let rtf = '';
    
    // Procesar nodos hijos
    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        
        // Nodo de texto
        if (child.nodeType === 3) { // Nodo de texto
            rtf += escapeRtf(child.textContent);
        }
        // Elemento HTML
        else if (child.nodeType === 1) { // Elemento
            const tagName = child.tagName.toLowerCase();
            
            // Aplicar formato según el tipo de elemento
            switch (tagName) {
                case 'p':
                    rtf += convertNodeToRtf(child) + '\\par ';
                    break;
                    
                case 'br':
                    rtf += '\\line ';
                    break;
                    
                case 'b':
                case 'strong':
                    rtf += '{\\b ' + convertNodeToRtf(child) + '}';
                    break;
                    
                case 'i':
                case 'em':
                    rtf += '{\\i ' + convertNodeToRtf(child) + '}';
                    break;
                    
                case 'u':
                    rtf += '{\\ul ' + convertNodeToRtf(child) + '}';
                    break;
                    
                case 'strike':
                case 's':
                case 'del':
                    rtf += '{\\strike ' + convertNodeToRtf(child) + '}';
                    break;
                    
                case 'h1':
                    rtf += '{\\fs40\\b ' + convertNodeToRtf(child) + '}\\par ';
                    break;
                    
                case 'h2':
                    rtf += '{\\fs36\\b ' + convertNodeToRtf(child) + '}\\par ';
                    break;
                    
                case 'h3':
                    rtf += '{\\fs32\\b ' + convertNodeToRtf(child) + '}\\par ';
                    break;
                    
                case 'h4':
                    rtf += '{\\fs28\\b ' + convertNodeToRtf(child) + '}\\par ';
                    break;
                    
                case 'h5':
                    rtf += '{\\fs24\\b ' + convertNodeToRtf(child) + '}\\par ';
                    break;
                    
                case 'h6':
                    rtf += '{\\fs22\\b ' + convertNodeToRtf(child) + '}\\par ';
                    break;
                    
                case 'ul':
                    rtf += convertListToRtf(child, false);
                    break;
                    
                case 'ol':
                    rtf += convertListToRtf(child, true);
                    break;
                    
                case 'li':
                    // Los elementos li se manejan en convertListToRtf
                    rtf += convertNodeToRtf(child);
                    break;
                    
                case 'a':
                    // Enlaces - en RTF básico solo mostramos el texto
                    rtf += '{\\cf1\\ul ' + convertNodeToRtf(child) + '}';
                    break;
                    
                case 'img':
                    // Las imágenes no se soportan en esta implementación básica
                    rtf += '[Imagen]';
                    break;
                    
                case 'table':
                    // Las tablas son complejas en RTF, implementación básica
                    rtf += '[Tabla]\\par ';
                    break;
                    
                case 'div':
                case 'span':
                default:
                    // Para otros elementos, simplemente procesamos su contenido
                    rtf += convertNodeToRtf(child);
                    break;
            }
        }
    }
    
    return rtf;
}

// Función para convertir listas HTML a RTF
function convertListToRtf(listNode, isOrdered) {
    let rtf = '';
    let counter = 1;
    
    for (let i = 0; i < listNode.childNodes.length; i++) {
        const child = listNode.childNodes[i];
        
        if (child.nodeType === 1 && child.tagName.toLowerCase() === 'li') {
            // Agregar viñeta o número según el tipo de lista
            if (isOrdered) {
                // Lista numerada - formato simplificado
                rtf += '\\pard\\fi-360\\li720 ' + counter + '. ';
                counter++;
            } else {
                // Lista con viñetas - formato muy simple y robusto
                rtf += '\\pard\\fi-360\\li720 \\bullet ';
            }
            
            // Agregar el contenido del elemento de lista
            rtf += convertNodeToRtf(child) + '\\par ';
        }
    }
    
    // Restaurar el formato de párrafo normal después de la lista
    rtf += '\\pard\\f0\\fs22 ';
    
    return rtf;
} 