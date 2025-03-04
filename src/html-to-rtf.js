/**
 * Conversor de HTML a RTF
 * Versión: 1.3.0
 * 
 * Este archivo contiene funciones para convertir contenido HTML a RTF.
 * Incluye correcciones para manejar caracteres especiales y viñetas.
 * 
 * Correcciones:
 * - Mejora en el manejo de viñetas para evitar caracteres 'd' no deseados
 * - Corrección de la tabulación después de las listas
 * - Soporte para caracteres acentuados
 * - Cambio de tipo de letra a Trebuchet MS
 * - Mejora en el espaciado después de puntos
 */

// Convertir HTML a RTF mejorado
function htmlToRtf(html) {
    if (!html || typeof html !== 'string') {
        console.error('htmlToRtf: El contenido HTML es inválido');
        return '';
    }
    
    try {
        // Crear un documento RTF básico
        let rtf = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang3082';
        
        // Agregar tabla de fuentes con Trebuchet MS
        rtf += '{\\fonttbl{\\f0\\fnil\\fcharset0 Trebuchet MS;}{\\f1\\fnil\\fcharset0 Trebuchet MS;}}';
        
        // Agregar tabla de colores
        rtf += '{\\colortbl;\\red0\\green0\\blue0;}';
        
        // Configuración de documento
        rtf += '\\viewkind4\\uc1\\pard\\f0\\fs22 ';
        
        // Crear un elemento temporal para parsear el HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Convertir el contenido HTML a RTF
        rtf += convertNodeToRtf(tempDiv);
        
        // Cerrar el documento RTF
        rtf += '}';
        
        // Verificar y corregir problemas comunes
        rtf = fixRtfContent(rtf);
        
        return rtf;
    } catch (error) {
        console.error('htmlToRtf: Error al convertir HTML a RTF:', error);
        return '';
    }
}

// Función para corregir problemas específicos en el contenido RTF
function fixRtfContent(content) {
    if (!content) return content;
    
    try {
        // Eliminar cualquier 'd' al inicio del documento
        content = content.replace(/\\pard\\f0\\fs22\s+d\s+/g, '\\pard\\f0\\fs22 ');
        content = content.replace(/\\pard\\f0\\fs22\s+b\s+/g, '\\pard\\f0\\fs22 ');
        
        // Eliminar "Arial; Arial;;;" que puede aparecer en el texto
        content = content.replace(/Arial;\s*Arial;{2,3}/g, '');
        
        // Mejorar espaciado después de puntos
        content = content.replace(/\.\\par/g, '.\\par\\sa200 ');
        content = content.replace(/\.\s+/g, '. ');
        
        // Verificar balance de llaves
        let openBraces = 0;
        let closeBraces = 0;
        
        for (let i = 0; i < content.length; i++) {
            if (content[i] === '{') openBraces++;
            if (content[i] === '}') closeBraces++;
        }
        
        // Agregar llaves faltantes si es necesario
        if (openBraces > closeBraces) {
            console.warn(`fixRtfContent: Faltan ${openBraces - closeBraces} llaves de cierre. Agregando...`);
            for (let i = 0; i < openBraces - closeBraces; i++) {
                content += '}';
            }
        } else if (closeBraces > openBraces) {
            console.warn(`fixRtfContent: Hay ${closeBraces - openBraces} llaves de cierre excesivas.`);
        }
        
        return content;
    } catch (error) {
        console.error('fixRtfContent: Error al corregir el contenido RTF:', error);
        return content;
    }
}

// Función mejorada para escapar caracteres especiales en RTF
function escapeRtf(text) {
    if (!text) return '';
    
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
            // Eliminar la letra 'd' al inicio del texto si es el primer nodo
            let text = child.textContent;
            if (i === 0 && text.trim().startsWith('d ')) {
                text = text.replace(/^d\s+/, '');
            }
            rtf += escapeRtf(text);
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
    // Esto es crucial para evitar que las numeraciones hereden la tabulación de las viñetas
    rtf += '\\pard\\fi0\\li0\\f0\\fs22 ';
    
    return rtf;
} 