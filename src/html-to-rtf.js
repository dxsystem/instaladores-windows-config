/**
 * Conversor de HTML a RTF
 * Versión: 1.6.0
 * 
 * Este archivo contiene funciones para convertir contenido HTML a RTF.
 * Incluye correcciones para manejar caracteres especiales y viñetas.
 * 
 * Correcciones:
 * - Mejorado el manejo de viñetas para evitar espacios innecesarios
 * - Corregido el problema de palabras juntas sin espacio
 * - Mejorado el soporte para caracteres acentuados
 * - Eliminación de símbolos no deseados
 * - Cambiado tipo de letra a Segoe UI
 * - Corregido el formato de las viñetas para evitar el "•-" en la salida
 * - Mejorado el soporte para encabezados H1, H2, H3
 */

/**
 * Convierte contenido HTML a formato RTF
 * @param {string} html - El contenido HTML a convertir
 * @return {string} - El contenido en formato RTF
 */
function htmlToRtf(html) {
    try {
        if (!html) {
            console.error('htmlToRtf: No se proporcionó contenido HTML');
            return '';
        }

        // Crear un documento temporal
        const tempDoc = document.implementation.createHTMLDocument('');
        tempDoc.body.innerHTML = html;

        // Iniciar documento RTF
        let rtf = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang3082';
        
        // Tabla de fuentes - Cambiado a Segoe UI
        rtf += '{\\fonttbl{\\f0\\fnil\\fcharset0 Segoe UI;}}';
        
        // Tabla de colores
        rtf += '{\\colortbl;\\red0\\green0\\blue0;}';
        
        // Información del documento
        rtf += '\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1\\f0\\fs22 ';
        
        // Convertir contenido del body
        rtf += convertNodeToRtf(tempDoc.body);
        
        // Cerrar documento RTF
        rtf += '}';
        
        // Aplicar correcciones finales al RTF generado
        rtf = fixRtfContent(rtf);
        
        return rtf;
    } catch (error) {
        console.error('htmlToRtf: Error al convertir HTML a RTF:', error);
        return '';
    }
}

/**
 * Aplica correcciones finales al contenido RTF
 * @param {string} content - El contenido RTF a corregir
 * @return {string} - El contenido RTF corregido
 */
function fixRtfContent(content) {
    if (!content) return '';
    
    try {
        // Eliminar múltiples espacios seguidos
        content = content.replace(/\s{2,}/g, ' ');
        
        // Corregir espacios alrededor de símbolos
        content = content.replace(/\s+([.,;:!?)])/g, '$1');
        content = content.replace(/([({])\s+/g, '$1');
        
        // Asegurar que haya un espacio después de cada punto, coma o dos puntos (excepto en números decimales)
        content = content.replace(/\.([A-Za-zÁÉÍÓÚáéíóúÑñÜü])/g, '. $1');
        content = content.replace(/,([^\s])/g, ', $1');
        content = content.replace(/:([^\s])/g, ': $1');
        
        // Corregir espacios entre palabras que tienen una letra minúscula seguida de mayúscula
        content = content.replace(/([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2');
        
        // Eliminar "Segoe UI; ; ;"
        content = content.replace(/Segoe UI;\s*;?\s*;?/g, '');
        
        // Eliminar caracteres Â no deseados
        content = content.replace(/Â+\s*/g, ' ');
        
        // Eliminar códigos RTF problemáticos
        content = content.replace(/\\bullet\s+(-|•|\\bullet)/g, '\\bullet ');
        content = content.replace(/\\bullet\s*\\bullet/g, '\\bullet ');
        content = content.replace(/360\s*[-]?/g, '');
        
        // Corregir problema de viñetas duplicadas o con guiones
        content = content.replace(/•-/g, '•');
        content = content.replace(/•\s*•/g, '•');
        
        return content;
    } catch (error) {
        console.error('fixRtfContent: Error al corregir el contenido RTF:', error);
        return content;
    }
}

/**
 * Escapa caracteres especiales para RTF
 * @param {string} text - El texto a escapar
 * @return {string} - El texto escapado para RTF
 */
function escapeRtf(text) {
    if (!text) return '';
    
    try {
        return text
            // Escapar caracteres de control RTF
            .replace(/\\/g, '\\\\')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            // Convertir caracteres acentuados y especiales a formato RTF
            .replace(/á/g, '\\\'e1')
            .replace(/é/g, '\\\'e9')
            .replace(/í/g, '\\\'ed')
            .replace(/ó/g, '\\\'f3')
            .replace(/ú/g, '\\\'fa')
            .replace(/Á/g, '\\\'c1')
            .replace(/É/g, '\\\'c9')
            .replace(/Í/g, '\\\'cd')
            .replace(/Ó/g, '\\\'d3')
            .replace(/Ú/g, '\\\'da')
            .replace(/ñ/g, '\\\'f1')
            .replace(/Ñ/g, '\\\'d1')
            .replace(/ü/g, '\\\'fc')
            .replace(/Ü/g, '\\\'dc')
            // Caracteres especiales adicionales
            .replace(/¿/g, '\\\'bf')
            .replace(/¡/g, '\\\'a1')
            // Otros caracteres especiales comunes
            .replace(/©/g, '\\\'a9')
            .replace(/®/g, '\\\'ae')
            .replace(/™/g, '\\\'99')
            .replace(/€/g, '\\\'80')
            .replace(/£/g, '\\\'a3')
            .replace(/°/g, '\\\'b0')
            .replace(/«/g, '\\\'ab')
            .replace(/»/g, '\\\'bb')
            // Corregir espacios entre palabras que tienen una letra minúscula seguida de mayúscula
            .replace(/([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2');
    } catch (error) {
        console.error('escapeRtf: Error al escapar texto:', error);
        return text;
    }
}

/**
 * Convierte un nodo DOM a formato RTF
 * @param {Node} node - El nodo DOM a convertir
 * @return {string} - El contenido RTF
 */
function convertNodeToRtf(node) {
    if (!node) return '';
    
    let rtf = '';
    
    try {
        // Si es un nodo de texto, simplemente escapar el contenido
        if (node.nodeType === 3) { // Nodo de texto
            return escapeRtf(node.textContent);
        }
        
        // Si no es un elemento, ignorarlo
        if (node.nodeType !== 1) return '';
        
        // Procesar diferentes tipos de elementos
        const tagName = node.tagName.toLowerCase();
        
        switch (tagName) {
            case 'br':
                return '\\line ';
                
            case 'p':
                rtf += '\\pard\\sa200\\sl276\\slmult1 ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\par\\sa200 ';
                
            case 'div':
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\par\\sa200 ';
                
            case 'strong':
            case 'b':
                rtf += '\\b ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\b0 ';
                
            case 'em':
            case 'i':
                rtf += '\\i ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\i0 ';
                
            case 'u':
                rtf += '\\ul ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\ulnone ';
                
            case 'h1':
                rtf += '\\pard\\sa200\\sl276\\slmult1\\f0\\fs40\\b ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\b0\\fs22\\par\\sa200 ';
                
            case 'h2':
                rtf += '\\pard\\sa200\\sl276\\slmult1\\f0\\fs36\\b ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\b0\\fs22\\par\\sa200 ';
                
            case 'h3':
                rtf += '\\pard\\sa200\\sl276\\slmult1\\f0\\fs28\\b ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\b0\\fs22\\par\\sa200 ';
                
            case 'ul':
                return convertListToRtf(node, false);
                
            case 'ol':
                return convertListToRtf(node, true);
                
            case 'li':
                // Este caso normalmente no se ejecuta directamente, ya que los li se manejan en convertListToRtf
                // Pero por si acaso, manejamos el caso
                rtf += '\\pard\\fi-360\\li720 - ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\par\\sa100 ';
                
            case 'a':
                // Convertir a texto normal con énfasis
                rtf += '\\i ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\i0 ';
                
            case 'table':
            case 'tr':
            case 'td':
            case 'th':
                // Tablas no son compatibles, convertir a texto normal
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf;
                
            default:
                // Para cualquier otro tipo de elemento, procesar sus hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf;
        }
    } catch (error) {
        console.error('convertNodeToRtf: Error al convertir nodo:', error);
        return '';
    }
}

/**
 * Convierte una lista (ul/ol) a formato RTF
 * @param {Element} listNode - El elemento de lista
 * @param {boolean} isOrdered - Indica si es una lista ordenada (numerada)
 * @return {string} - El contenido RTF
 */
function convertListToRtf(listNode, isOrdered) {
    let rtf = '';
    let counter = 1;
    
    for (let i = 0; i < listNode.childNodes.length; i++) {
        const child = listNode.childNodes[i];
        
        if (child.nodeType === 1 && child.tagName.toLowerCase() === 'li') {
            // Agregar viñeta o número según el tipo de lista
            if (isOrdered) {
                // Lista numerada - formato simplificado
                rtf += '\\pard\\fi-360\\li720 ' + counter + '.';  // Eliminado el espacio después del número
                counter++;
            } else {
                // Lista con viñetas - formato muy simple y robusto
                rtf += '\\pard\\fi-360\\li720\\bullet';  // Sin espacio después de \\bullet
            }
            
            // Agregar el contenido del elemento de lista, asegurando un espacio después de la viñeta/número
            rtf += ' ' + convertNodeToRtf(child) + '\\par\\sa100 ';
        }
    }
    
    // Restaurar el formato de párrafo normal después de la lista
    // Esto es crucial para evitar que las numeraciones hereden la tabulación de las viñetas
    rtf += '\\pard\\fi0\\li0\\f0\\fs22\\sa200 ';
    
    return rtf;
} 