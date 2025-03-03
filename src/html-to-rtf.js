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
    
    // Tabla de colores
    rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;\\red255\\green0\\blue0;}';
    
    // Información del documento
    rtf += '{\\info{\\title Términos y Condiciones}{\\author Edudigital.LATAM}}';
    
    // Configuración de página
    rtf += '\\viewkind4\\uc1\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440';
    
    // Agregar tabla de listas para soportar listas con viñetas
    rtf += '\r\n{\\*\\listtable\r\n';
    rtf += '{\\list\\listtemplateid1\\listhybrid\r\n';
    rtf += '{\\listlevel\\levelnfc23\\levelnfcn23\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid5\\\u0027b7}{\\levelnumbers;}\\fi-360\\li720\\lin720\\jclisttab\\tx720}\r\n';
    rtf += '{\\listname ;}\\listid1}}\r\n';
    rtf += '{\\*\\listoverridetable\r\n';
    rtf += '{\\listoverride\\listid1\\listoverridecount0\\ls1}\r\n';
    rtf += '}\r\n';
    
    // Iniciar el cuerpo del documento - Usar \ltrpar\itap0 para compatibilidad con rtf-to-html.js
    rtf += '\\ltrpar\\itap0{\\lang1033\\fs22\\f0\\cf1 \\cf1\\ql';
    
    // Crear un elemento temporal para procesar el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Eliminar elementos no deseados (style, script, etc.)
    const elementsToRemove = tempDiv.querySelectorAll('style, script, head');
    elementsToRemove.forEach(el => el.remove());
    
    // Función recursiva para procesar nodos
    function processNode(node, inList = false) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Escapar caracteres especiales de RTF
            return escapeRtf(node.textContent);
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            let content = '';
            let prefix = '';
            let suffix = '';
            
            // Aplicar formato según el tipo de elemento
            switch (node.nodeName.toLowerCase()) {
                case 'body':
                    // Procesar directamente el contenido del body
                    break;
                case 'h1':
                    // Título centrado
                    prefix = '{\\pard\\sa80\\sl240\\slmult1\\qc\\b\\f0\\fs28 ';
                    suffix = '\\par}\r\n';
                    break;
                case 'h2':
                    // Subtítulos alineados a la izquierda
                    prefix = '{\\pard\\sa80\\sl240\\slmult1\\ql\\b\\f0\\fs24 ';
                    suffix = '\\par}\r\n';
                    break;
                case 'p':
                    if (node.className === 'bold') {
                        prefix = '{\\pard\\sa60\\sl240\\slmult1\\ql\\b\\f0\\fs22 ';
                        suffix = '\\par}\r\n';
                    } else {
                        prefix = '{\\pard\\sa60\\sl240\\slmult1\\ql\\f0\\fs22 ';
                        suffix = '\\par}\r\n';
                    }
                    break;
                case 'span':
                    if (node.className === 'bold') {
                        prefix = '{\\b ';
                        suffix = '}';
                    } else {
                        prefix = '{';
                        suffix = '}';
                    }
                    break;
                case 'b':
                case 'strong':
                    prefix = '{\\b ';
                    suffix = '}';
                    break;
                case 'i':
                case 'em':
                    prefix = '{\\i ';
                    suffix = '}';
                    break;
                case 'u':
                    prefix = '{\\ul ';
                    suffix = '}';
                    break;
                case 'br':
                    return '\\line ';
                case 'ul':
                    prefix = '{\\pard\\sa0\\sb0\\f0\\fs22 ';
                    suffix = '\\par}\r\n';
                    break;
                case 'li':
                    prefix = '{\\pard\\fi-360\\li720\\sa40\\sl240\\slmult1\\ql\\tx720{\\*\\pn\\pnlvlblt\\pnf1\\pnindent360{\\pntxtb\\bullet}}\\f0\\fs22 ';
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
                content += processNode(child, node.nodeName.toLowerCase() === 'ul');
            }
            
            return prefix + content + suffix;
        }
        
        return '';
    }
    
    // Procesar el contenido HTML
    let content = '';
    for (const child of tempDiv.childNodes) {
        content += processNode(child);
    }
    
    // Si no hay contenido o solo hay espacios en blanco, agregar un párrafo vacío
    if (!content.trim()) {
        content = '{\\pard\\sa60\\sl240\\slmult1\\ql\\f0\\fs22 \\par}\r\n';
    }
    
    // Finalizar el RTF
    rtf += content + '}';
    return rtf;
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
        '"': '\\\'93',
        '"': '\\\'94',
        '\'': '\\\'91',
        '\'': '\\\'92',
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