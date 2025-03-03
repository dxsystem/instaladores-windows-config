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
    rtf += '{\\*\\listtable{\\list\\listtemplateid1\\listhybrid{\\listlevel\\levelnfc23\\levelnfcn23\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace360\\levelindent0{\\*\\levelmarker \\{bullet\\}}{\\leveltext\\leveltemplateid1\\\'01\\bullet;}{\\levelnumbers;}\\fi-360\\li720\\jclisttab\\tx720}\\listid1}}';
    rtf += '{\\*\\listoverridetable{\\listoverride\\listid1\\listoverridecount0\\ls1}}';
    
    // Iniciar el cuerpo del documento - Usar \ltrpar\itap0 para compatibilidad con rtf-to-html.js
    // Usar color blanco (cf4)
    rtf += '\\pard\\ltrpar\\itap0\\f0\\fs22\\cf4\\qc';
    
    // Crear un elemento temporal para procesar el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Eliminar elementos no deseados (style, script, etc.)
    const elementsToRemove = tempDiv.querySelectorAll('style, script, head');
    elementsToRemove.forEach(el => el.remove());
    
    // Añadir el título principal en negrita (usando el subtítulo correcto)
    let content = '\\b\\fs28 Términos y Condiciones - Instaladores de Windows Online C#\\b0\\par';
    
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
                    prefix = '\\pard\\qc\\b\\fs28 ';
                    suffix = '\\b0\\par';
                    break;
                case 'h2':
                    // Subtítulos alineados a la izquierda en color blanco
                    prefix = '\\pard\\ql\\b\\fs24 ';
                    suffix = '\\b0\\par';
                    break;
                case 'p':
                    if (node.className === 'bold') {
                        prefix = '\\pard\\ql\\b\\fs22 ';
                        suffix = '\\b0\\par';
                    } else {
                        prefix = '\\pard\\ql\\fs22 ';
                        suffix = '\\par';
                    }
                    break;
                case 'span':
                    if (node.className === 'bold') {
                        prefix = '\\b ';
                        suffix = '\\b0 ';
                    } else {
                        prefix = '';
                        suffix = '';
                    }
                    break;
                case 'b':
                case 'strong':
                    prefix = '\\b ';
                    suffix = '\\b0 ';
                    break;
                case 'i':
                case 'em':
                    prefix = '\\i ';
                    suffix = '\\i0 ';
                    break;
                case 'u':
                    prefix = '\\ul ';
                    suffix = '\\ulnone ';
                    break;
                case 'br':
                    return '\\line';
                case 'ul':
                    // No añadir prefijo/sufijo especial para ul, se maneja en los elementos li
                    break;
                case 'li':
                    // Mejorar el formato de las viñetas
                    prefix = '\\pard{\\*\\pn\\pnlvlblt\\pnf1\\pnindent0{\\pntxtb\\\'95}}\\fi-360\\li720\\ql\\fs22 ';
                    suffix = '\\par';
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
        content = '\\pard\\ql\\fs22 \\par';
    }
    
    // Procesar el contenido para corregir problemas específicos
    content = fixRtfContent(content);
    
    // Finalizar el RTF
    rtf += content + '}';
    return rtf;
}

// Función para corregir problemas específicos en el contenido RTF
function fixRtfContent(content) {
    // Eliminar múltiples \par consecutivos
    content = content.replace(/\\par\s*\\par+/g, '\\par');
    
    // Eliminar secuencias problemáticas que causan la "d" al inicio de líneas
    content = content.replace(/\\par\\pard/g, '\\par\\pard');
    
    // Eliminar espacios después de \line
    content = content.replace(/\\line\s+/g, '\\line');
    
    // Eliminar secuencias de \line consecutivas
    content = content.replace(/\\line\\line+/g, '\\line');
    
    // Corregir viñetas
    content = content.replace(/\\bullet/g, '\\\'95');
    
    // Eliminar espacios extra antes de \par
    content = content.replace(/\s+\\par/g, '\\par');
    
    // Eliminar espacios al inicio de párrafos
    content = content.replace(/\\par\s+/g, '\\par');
    
    // Eliminar espacios después de comandos RTF
    content = content.replace(/\\([a-z0-9]+)\s+/g, '\\$1 ');
    
    // Eliminar espacios duplicados
    content = content.replace(/\s{2,}/g, ' ');
    
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
        '\n': '\\line',
        '\r': '',
        '\t': '\\tab',
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
        '"': '"', // Usar comillas normales en lugar de códigos RTF
        '\'': '\'', // Usar comilla simple normal
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
    
    // Eliminar espacios duplicados
    result = result.replace(/\s{2,}/g, ' ');
    
    return result;
} 