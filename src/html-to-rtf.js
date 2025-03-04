/**
 * Conversor de HTML a RTF
 * Versión: 1.4.0
 * 
 * Este archivo contiene funciones para convertir contenido HTML a RTF.
 * Incluye correcciones para manejar caracteres especiales y viñetas.
 * 
 * Correcciones:
 * - Mejora en el manejo de viñetas para evitar caracteres 'd' no deseados
 * - Corrección de la tabulación después de las listas
 * - Soporte para caracteres acentuados
 * - Cambio de tipo de letra a Segoe UI
 * - Mejora en el espaciado después de puntos y entre palabras
 * - Eliminación de caracteres Â no deseados
 */

/**
 * Convierte contenido HTML a formato RTF
 * @param {string} html - El contenido HTML a convertir
 * @return {string} - El contenido en formato RTF
 */
function htmlToRtf(html) {
    if (!html || typeof html !== 'string') {
        console.error('htmlToRtf: El contenido HTML es inválido');
        return '';
    }
    
    try {
        // Crear un documento RTF básico
        let rtf = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang3082';
        
        // Agregar tabla de fuentes con Segoe UI
        rtf += '{\\fonttbl{\\f0\\fnil\\fcharset0 Segoe UI;}{\\f1\\fnil\\fcharset0 Segoe UI;}}';
        
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

/**
 * Aplica correcciones finales al contenido RTF
 * @param {string} content - El contenido RTF a corregir
 * @return {string} - El contenido RTF corregido
 */
function fixRtfContent(content) {
    if (!content) return content;
    
    try {
        // Eliminar cualquier 'd' al inicio del documento
        content = content.replace(/\\pard\\f0\\fs22\s+d\s+/g, '\\pard\\f0\\fs22 ');
        content = content.replace(/\\pard\\f0\\fs22\s+b\s+/g, '\\pard\\f0\\fs22 ');
        
        // Eliminar "Trebuchet MS; ; ;" o "Arial; Arial;;;" que puede aparecer en el texto
        content = content.replace(/Trebuchet MS;\s*;?\s*;?/g, '');
        content = content.replace(/Arial;\s*Arial;{2,3}/g, '');
        content = content.replace(/Segoe UI;\s*;?\s*;?/g, '');
        
        // Eliminar caracteres Â no deseados
        content = content.replace(/Â/g, ' ');
        
        // Asegurar espacios entre palabras
        content = content.replace(/([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ])([A-Z])/g, '$1 $2'); // Espacio entre palabra y mayúscula
        content = content.replace(/([a-zA-Z0-9áéíóúÁÉÍÓÚñÑ])(\d)/g, '$1 $2'); // Espacio entre palabra y número
        content = content.replace(/(\d)([a-zA-Z])/g, '$1 $2'); // Espacio entre número y palabra
        
        // Mejorar espaciado después de puntos
        content = content.replace(/\.([a-zA-Z0-9])/g, '. $1'); // Espacio después de punto
        content = content.replace(/\.\\par/g, '.\\par\\sa200 ');
        
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
                return rtf + '\\par ';
                
            case 'div':
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\par ';
                
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
                return rtf + '\\b0\\fs22\\par ';
                
            case 'h2':
                rtf += '\\pard\\sa200\\sl276\\slmult1\\f0\\fs36\\b ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\b0\\fs22\\par ';
                
            case 'h3':
                rtf += '\\pard\\sa200\\sl276\\slmult1\\f0\\fs28\\b ';
                // Recorrer los hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                return rtf + '\\b0\\fs22\\par ';
                
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
                return rtf + '\\par ';
                
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