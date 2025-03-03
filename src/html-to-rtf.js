/**
 * Conversor de HTML a RTF
 * Este archivo contiene funciones para convertir contenido HTML a formato RTF
 * compatible con WPF RichTextBox.
 */

// Convertir HTML a RTF mejorado
function htmlToRtf(html) {
    // Encabezado RTF mejorado compatible con WPF RichTextBox
    let rtf = '{\\rtf1\\ansi\\deff0\\ansicpg1252';
    
    // Tabla de fuentes - Usar fuentes estándar de Windows
    rtf += '{\\fonttbl{\\f0\\fswiss\\fcharset0 Segoe UI;}{\\f1\\froman\\fcharset0 Times New Roman;}{\\f2\\fswiss\\fcharset0 Arial;}}';
    
    // Tabla de colores - Añadir color blanco (255,255,255)
    rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;\\red255\\green0\\blue0;\\red255\\green255\\blue255;}';
    
    // Información del documento
    rtf += '{\\info{\\title Términos y Condiciones}{\\author Edudigital.LATAM}}';
    
    // Configuración de página - Fondo oscuro
    rtf += '\\viewkind4\\uc1\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440';
    
    // Agregar tabla de listas para soportar listas con viñetas
    rtf += '\r\n{\\*\\listtable\r\n';
    rtf += '{\\list\\listtemplateid1\\listhybrid\r\n';
    rtf += '{\\listlevel\\levelnfc23\\levelnfcn23\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid5\\\'95}{\\levelnumbers;}\\f1\\fs22\\cf4\\dbch\\af0\\loch\\f0\\hich\\f0\\fi-360\\li720\\lin720\\jclisttab\\tx720}\r\n';
    rtf += '{\\listname ;}\\listid1}}\r\n';
    rtf += '{\\*\\listoverridetable\r\n';
    rtf += '{\\listoverride\\listid1\\listoverridecount0\\ls1}\r\n';
    rtf += '}\r\n';
    
    // Iniciar el cuerpo del documento - Usar \ltrpar\itap0 para compatibilidad con rtf-to-html.js
    // Usar color blanco (cf4)
    rtf += '\\ltrpar\\itap0{\\lang1033\\fs22\\f0\\cf4 \\cf4\\ql';
    
    // Crear un elemento temporal para procesar el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Eliminar elementos no deseados (style, script, etc.)
    const elementsToRemove = tempDiv.querySelectorAll('style, script, head');
    elementsToRemove.forEach(el => el.remove());
    
    // Ya no eliminamos el título principal
    
    // Añadir el título principal en negrita
    let content = '{\\pard\\sa20\\sb20\\qc\\b\\f0\\fs28\\cf4 Términos y Condiciones - Instaladores de Windows Online C#\\par}\r\n';
    
    // Función recursiva para procesar nodos
    function processNode(node, inList = false) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Escapar caracteres especiales de RTF
            return escapeRtf(node.textContent);
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            let nodeContent = '';
            let prefix = '';
            let suffix = '';
            
            // Aplicar formato según el tipo de elemento
            switch (node.nodeName.toLowerCase()) {
                case 'body':
                    // Procesar directamente el contenido del body
                    break;
                case 'h1':
                    // Omitir el título principal ya que lo añadimos manualmente
                    if (node.textContent.includes('Términos y Condiciones') && 
                        node.textContent.includes('Instaladores de Windows')) {
                        return '';
                    }
                    // Otros títulos h1
                    prefix = '{\\pard\\sa20\\sb10\\qc\\b\\f0\\fs28\\cf4 ';
                    suffix = '\\par}\r\n';
                    break;
                case 'h2':
                    // Subtítulos alineados a la izquierda en color blanco
                    prefix = '{\\pard\\sa10\\sb10\\ql\\b\\f0\\fs24\\cf4 ';
                    suffix = '\\par}\r\n';
                    break;
                case 'p':
                    if (node.className === 'bold') {
                        prefix = '{\\pard\\sa10\\sb0\\ql\\b\\f0\\fs22\\cf4 ';
                        suffix = '\\par}\r\n';
                    } else {
                        prefix = '{\\pard\\sa10\\sb0\\ql\\f0\\fs22\\cf4 ';
                        suffix = '\\par}\r\n';
                    }
                    break;
                case 'span':
                    if (node.className === 'bold') {
                        prefix = '{\\b\\cf4 ';
                        suffix = '}';
                    } else {
                        prefix = '{\\cf4 ';
                        suffix = '}';
                    }
                    break;
                case 'b':
                case 'strong':
                    prefix = '{\\b\\cf4 ';
                    suffix = '}';
                    break;
                case 'i':
                case 'em':
                    prefix = '{\\i\\cf4 ';
                    suffix = '}';
                    break;
                case 'u':
                    prefix = '{\\ul\\cf4 ';
                    suffix = '}';
                    break;
                case 'br':
                    return '\\line ';
                case 'ul':
                    // No añadir prefijo/sufijo especial para ul, se maneja en los elementos li
                    break;
                case 'li':
                    // Mejorar el formato de las viñetas
                    prefix = '{\\pard\\fi-360\\li720\\sa5\\sb0\\ql\\ls1\\ilvl0\\f0\\fs22\\cf4 ';
                    suffix = '\\par}\r\n';
                    break;
                case 'a':
                    // Para enlaces, usar color azul
                    prefix = '{\\field{\\*\\fldinst{HYPERLINK "' + (node.getAttribute('href') || '') + '"}}{\\fldrslt{\\cf2\\ul ';
                    suffix = '}}}';
                    break;
                default:
                    // Para otros elementos, solo procesar su contenido
                    break;
            }
            
            // Procesar nodos hijos
            for (const child of node.childNodes) {
                nodeContent += processNode(child, node.nodeName.toLowerCase() === 'ul');
            }
            
            return prefix + nodeContent + suffix;
        }
        
        return '';
    }
    
    // Procesar el contenido HTML (excepto el título principal que ya añadimos)
    for (const child of tempDiv.childNodes) {
        // Omitir el título principal si ya está en el contenido
        if (child.nodeType === Node.ELEMENT_NODE && 
            child.nodeName.toLowerCase() === 'h1' && 
            child.textContent.includes('Términos y Condiciones') && 
            child.textContent.includes('Instaladores de Windows')) {
            continue;
        }
        content += processNode(child);
    }
    
    // Si no hay contenido o solo hay espacios en blanco, agregar un párrafo vacío
    if (!content.trim()) {
        content = '{\\pard\\sa0\\ql\\f0\\fs22\\cf4 \\par}';
    }
    
    // Procesar el contenido para corregir problemas específicos
    content = fixRtfContent(content);
    
    // Finalizar el RTF
    rtf += content + '}';
    return rtf;
}

// Función para corregir problemas específicos en el contenido RTF
function fixRtfContent(content) {
    // Corregir múltiples saltos de párrafo
    content = content.replace(/\\par\s*\\par+/g, '\\par');
    
    // Asegurar que haya un salto de línea después de cada punto que termina una oración
    content = content.replace(/\.\s*\\par\}/g, '.\\par}');
    
    // Eliminar caracteres extraños al inicio de líneas (como la 'd')
    content = content.replace(/\\par\}\r?\n([a-z])/gi, '\\par}\r\n');
    
    // Corregir viñetas
    content = content.replace(/\\bullet/g, '\\\'95');
    
    // Asegurar que no haya espacios extra entre elementos
    content = content.replace(/\s+\\par/g, '\\par');
    
    return content;
}

// Función mejorada para escapar caracteres especiales en RTF
function escapeRtf(text) {
    if (!text) return '';
    
    // Crear un mapa de caracteres especiales
    const charMap = {
        '\\': '\\\\',
        '{': '\\{',
        '}': '\\}',
        '\n': '\\line ',
        '\r': '',
        '\t': '\\tab ',
        'á': '\\\'e1',
        'é': '\\\'e9',
        'í': '\\\'ed',
        'ó': '\\\'f3',
        'ú': '\\\'fa',
        'ñ': '\\\'f1',
        'Á': '\\\'c1',
        'É': '\\\'c9',
        'Í': '\\\'cd',
        'Ó': '\\\'d3',
        'Ú': '\\\'da',
        'Ñ': '\\\'d1',
        'ü': '\\\'fc',
        'Ü': '\\\'dc',
        'ª': '\\\'aa',
        'º': '\\\'ba',
        '©': '\\\'a9',
        '®': '\\\'ae',
        '™': '\\\'99',
        '€': '\\\'80',
        '£': '\\\'a3',
        '¥': '\\\'a5',
        '¿': '\\\'bf',
        '¡': '\\\'a1',
        '"': '\\\'94', // Comillas dobles de apertura
        '"': '\\\'94', // Comillas dobles de cierre
        '\'': '\\\'91', // Comilla simple de apertura
        '\'': '\\\'92', // Comilla simple de cierre
        '–': '\\\'96',
        '—': '\\\'97',
        '•': '\\\'95',
        '…': '\\\'85'
    };
    
    // Reemplazar cada carácter especial
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        result += charMap[char] || char;
    }
    
    return result;
} 