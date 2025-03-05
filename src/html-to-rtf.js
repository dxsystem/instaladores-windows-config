/**
 * Conversor de HTML a RTF
 * Versión: 1.2.5
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
 * - Definición correcta del idioma español (3082)
 * - Mejora en el manejo de espacios entre palabras en mayúsculas
 * - Simplificación de la tabla de fuentes para evitar duplicaciones
 * - Eliminación de referencias a fuentes innecesarias
 */

// Convertir HTML a RTF mejorado
function htmlToRtf(html) {
    if (!html || typeof html !== 'string') {
        console.error('htmlToRtf: El contenido HTML es inválido');
        return '';
    }
    
    try {
        // Crear un documento RTF básico con codificación UTF-8 y español como idioma
        // Usamos una sola fuente (Segoe UI) para simplificar y evitar problemas
        let rtf = '{\\rtf1\\ansi\\ansicpg1252\\uc1\\deff0\\deflang3082';
        
        // Tabla de fuentes ultra simplificada - solo Segoe UI
        rtf += '{\\fonttbl{\\f0\\fnil Segoe UI;}}';
        
        // Agregar tabla de colores básica
        rtf += '{\\colortbl;\\red0\\green0\\blue0;}';
        
        // Configuración de documento con idioma español
        rtf += '\\viewkind4\\uc1\\pard\\f0\\fs22\\lang3082 ';
        
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
        content = content.replace(/Times New Roman;/g, '');
        content = content.replace(/Aptos;+/g, '');
        
        // Eliminar patrones extraños de símbolos
        content = content.replace(/\\b7\s*\\\*\\b7/g, '\\b7');
        content = content.replace(/;+/g, '');
        content = content.replace(/\\(\*)+/g, '');
        content = content.replace(/·+/g, '');
        content = content.replace(/\.;+/g, '.');
        
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
        
        // NUEVO: Insertar espacios entre palabras en mayúsculas
        content = content.replace(/([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2');
        
        // Corregir espacios entre palabras en mayúsculas
        content = content.replace(/([A-ZÁÉÍÓÚÑ]{2,})\s+([A-ZÁÉÍÓÚÑ]{2,})/g, '$1 $2');
        
        // Asegurar espacio después de negritas
        content = content.replace(/\\b0\s*([A-Za-záéíóúÁÉÍÓÚÑñ])/g, '\\b0 $1');
        
        // Asegurar espacio después de números de sección
        content = content.replace(/(\d+)\.\s*([A-Za-záéíóúÁÉÍÓÚÑñ])/g, '$1. $2');
        
        // Agregar definición de idioma español después de cada formato
        content = content.replace(/\\pard/g, '\\pard\\lang3082');
        content = content.replace(/\\par/g, '\\par\\lang3082');
        
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
                rtf += '\\pard\\f0\\fs40\\b\\lang3082 ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\b0\\fs22\\sa200\\par\n';
                break;
            case 'h2':
                rtf += '\\pard\\f0\\fs36\\b\\lang3082 ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\b0\\fs22\\sa200\\par\n';
                break;
            case 'h3':
                rtf += '\\pard\\f0\\fs28\\b\\lang3082 ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\b0\\fs22\\sa200\\par\n';
                break;
            case 'h4':
            case 'h5':
            case 'h6':
                rtf += '\\pard\\f0\\fs24\\b\\lang3082 ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\b0\\fs22\\sa200\\par\n';
                break;
            case 'p':
                rtf += '\\pard\\f0\\fs22\\lang3082 ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\sa200\\par\n';
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
            case 'li': // Solo procesamos <li> directamente si está fuera de una lista
                rtf += '\\pard\\f0\\fs22\\lang3082 • ';
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                rtf += '\\sa100\\par\n';
                break;
            case 'a':
                // Simplemente mostrar el texto del enlace sin el formato
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                break;
            case 'img':
                // Las imágenes no se soportan en esta versión, agregar un texto indicativo
                rtf += '[Imagen]';
                break;
            case 'table':
                // Las tablas son complejas en RTF, implementamos una versión básica
                rtf += '\\pard\\f0\\fs22\\lang3082 [Tabla:]\n';
                
                // Procesar cada fila
                for (let i = 0; i < node.rows.length; i++) {
                    const row = node.rows[i];
                    
                    // Procesar cada celda en la fila
                    for (let j = 0; j < row.cells.length; j++) {
                        const cell = row.cells[j];
                        rtf += '• ';
                        for (let k = 0; k < cell.childNodes.length; k++) {
                            rtf += convertNodeToRtf(cell.childNodes[k]);
                        }
                        rtf += '\\tab ';
                    }
                    rtf += '\\par\n';
                }
                rtf += '\\par\n';
                break;
            default:
                // Para otros elementos, simplemente procesar sus hijos
                for (let i = 0; i < node.childNodes.length; i++) {
                    rtf += convertNodeToRtf(node.childNodes[i]);
                }
                break;
        }
    }
    
    return rtf;
}

// Función mejorada para convertir listas a RTF
function convertListToRtf(node, isOrdered) {
    let rtf = '';
    
    try {
        // Procesar cada elemento de la lista
        for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];
            
            if (child.nodeType === 1 && child.tagName.toLowerCase() === 'li') {
                if (isOrdered) {
                    // Lista ordenada: usar números
                    rtf += `\\pard\\f0\\fs22\\lang3082 ${i + 1}. `;
                } else {
                    // Lista no ordenada: usar viñetas (• o similar)
                    rtf += '\\pard\\f0\\fs22\\lang3082 • ';
                }
                
                // Procesar el contenido del elemento de la lista
                for (let j = 0; j < child.childNodes.length; j++) {
                    rtf += convertNodeToRtf(child.childNodes[j]);
                }
                
                // Agregar salto de párrafo después de cada elemento
                rtf += '\\sa100\\par\n';
            }
        }
        
        // Restaurar formato normal después de la lista
        rtf += '\\pard\\f0\\fs22\\lang3082 ';
    } catch (error) {
        console.error('convertListToRtf: Error al convertir lista:', error);
    }
    
    return rtf;
} 