/**
 * Conversor de HTML a RTF
 * Versión: 1.2.2
 * 
 * Este archivo contiene funciones para convertir contenido HTML a RTF.
 * Incluye correcciones para manejar caracteres especiales y viñetas.
 * 
 * Correcciones:
 * - Mejora en el manejo de viñetas para evitar caracteres 'd' no deseados
 * - Corrección de la tabulación después de las listas
 * - Soporte para caracteres acentuados
 * - Cambio de fuente a Segoe UI
 * - Mejora en el espaciado después de puntos
 * - Corrección de problemas con espacios entre palabras
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
        
        // Agregar tabla de fuentes simplificada con Segoe UI como fuente predeterminada
        rtf += '{\\fonttbl{\\f0\\fnil Segoe UI;}}';
        
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
        
        // Eliminar símbolos extraños como "Segoe UI; Segoe UI;;;"
        content = content.replace(/Segoe UI;\s*Segoe UI;+/g, '');
        content = content.replace(/Segoe U I;+/g, '');
        
        // Agregar espacio después de cada punto aparte
        content = content.replace(/\.\\par/g, '.\\sa200\\par');
        
        // Corregir problemas con espacios entre palabras
        content = content.replace(/([a-zA-ZáéíóúÁÉÍÓÚñÑ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2');
        
        // Corregir problemas con palabras pegadas como "deResponsabilidad"
        content = content.replace(/([a-z])([A-ZÁÉÍÓÚÑ])/g, '$1 $2');
        
        // Corregir problemas con dos puntos sin espacio
        content = content.replace(/([a-zA-ZáéíóúÁÉÍÓÚñÑ]):([a-zA-ZáéíóúÁÉÍÓÚñÑ])/g, '$1: $2');
        
        // Corregir problemas con puntos sin espacio
        content = content.replace(/([a-zA-ZáéíóúÁÉÍÓÚñÑ])\.([a-zA-ZáéíóúÁÉÍÓÚñÑ])/g, '$1. $2');
        
        // Corregir problemas con espacios entre letras mayúsculas
        content = content.replace(/([A-ZÁÉÍÓÚÑ])\s+([A-ZÁÉÍÓÚÑ])\s+([A-ZÁÉÍÓÚÑ])/g, '$1$2$3');
        content = content.replace(/([A-ZÁÉÍÓÚÑ])\s+([A-ZÁÉÍÓÚÑ])/g, '$1$2');
        
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
    
    // Manejar diferentes tipos de nodos
    if (node.nodeType === 3) { // Nodo de texto
        return escapeRtf(node.textContent);
    } else if (node.nodeType === 1) { // Nodo de elemento
        const tagName = node.tagName.toLowerCase();
        
        // Manejar diferentes tipos de elementos
        switch (tagName) {
            case 'h1':
                rtf += '\\pard\\f0\\fs40\\b ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\b0\\fs22\\par\n';
                break;
            case 'h2':
                rtf += '\\pard\\f0\\fs36\\b ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\b0\\fs22\\par\n';
                break;
            case 'h3':
                rtf += '\\pard\\f0\\fs28\\b ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\b0\\fs22\\par\n';
                break;
            case 'h4':
            case 'h5':
            case 'h6':
                rtf += '\\pard\\f0\\fs24\\b ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\b0\\fs22\\par\n';
                break;
            case 'p':
                rtf += '\\pard\\f0\\fs22 ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\par\n';
                break;
            case 'strong':
            case 'b':
                rtf += '\\b ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\b0 ';
                break;
            case 'em':
            case 'i':
                rtf += '\\i ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\i0 ';
                break;
            case 'u':
                rtf += '\\ul ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\ulnone ';
                break;
            case 'br':
                rtf += '\\line ';
                break;
            case 'ul':
                rtf += convertListToRtf(node, false);
                break;
            case 'ol':
                rtf += convertListToRtf(node, true);
                break;
            case 'li':
                // El contenido de los elementos li se maneja en convertListToRtf
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                break;
            case 'a':
                // Simplemente incluir el texto del enlace
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                break;
            default:
                // Para otros elementos, procesar sus hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                break;
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
            
            // Procesar el contenido del elemento de lista
            let liContent = '';
            for (let j = 0; j < child.childNodes.length; j++) {
                liContent += convertNodeToRtf(child.childNodes[j]);
            }
            
            // Asegurarse de que no haya duplicación de texto
            rtf += liContent.trim() + '\\par\n';
        }
    }
    
    // Restaurar el formato de párrafo normal después de la lista
    // Esto es crucial para evitar que las numeraciones hereden la tabulación de las viñetas
    rtf += '\\pard\\fi0\\li0\\f0\\fs22 ';
    
    return rtf;
} 