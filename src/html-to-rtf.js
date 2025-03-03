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
    rtf += '{\\listlevel\\levelnfc23\\levelnfcn23\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid5\\\u0027b7}{\\levelnumbers;}\\fi-360\\li720\\lin720\\jclisttab\\tx720}\r\n';
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
    
    // Eliminar el título principal si existe
    const titles = tempDiv.querySelectorAll('h1');
    titles.forEach(title => {
        if (title.textContent.includes('Términos y Condiciones') && 
            title.textContent.includes('Instaladores de Windows')) {
            title.remove();
        }
    });
    
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
                    // Verificar si es el título principal que queremos eliminar
                    if (node.textContent.includes('Términos y Condiciones') && 
                        node.textContent.includes('Instaladores de Windows')) {
                        return ''; // Omitir este título
                    }
                    // Título centrado en color blanco con menos espacio
                    prefix = '{\\pard\\sa10\\sl220\\slmult0\\qc\\b\\f0\\fs28\\cf4 ';
                    suffix = '\\par}';
                    break;
                case 'h2':
                    // Subtítulos alineados a la izquierda en color blanco con menos espacio
                    prefix = '{\\pard\\sa10\\sl220\\slmult0\\ql\\b\\f0\\fs24\\cf4 ';
                    suffix = '\\par}';
                    break;
                case 'p':
                    if (node.className === 'bold') {
                        prefix = '{\\pard\\sa0\\sl220\\slmult0\\ql\\b\\f0\\fs22\\cf4 ';
                        suffix = '\\par}';
                    } else {
                        prefix = '{\\pard\\sa0\\sl220\\slmult0\\ql\\f0\\fs22\\cf4 ';
                        suffix = '\\par}';
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
                    return ' '; // Reemplazar <br> con espacio en lugar de salto de línea
                case 'ul':
                    prefix = '{\\pard\\sa0\\sb0\\f0\\fs22\\cf4 ';
                    suffix = '\\par}';
                    break;
                case 'li':
                    prefix = '{\\pard\\fi-360\\li720\\sa0\\sl220\\slmult0\\ql\\tx720{\\*\\pn\\pnlvlblt\\pnf1\\pnindent360{\\pntxtb\\bullet}}\\f0\\fs22\\cf4 ';
                    suffix = '\\par}';
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
        content = '{\\pard\\sa0\\sl220\\slmult0\\ql\\f0\\fs22\\cf4 \\par}';
    }
    
    // Procesar el contenido para asegurar que solo haya un salto de línea después de cada punto
    content = processParagraphBreaks(content);
    
    // Finalizar el RTF
    rtf += content + '}';
    return rtf;
}

// Función para procesar los saltos de párrafo y asegurar que solo haya uno después de cada punto
function processParagraphBreaks(content) {
    // Reemplazar múltiples \par seguidos por un solo \par
    content = content.replace(/\\par\s*\\par+/g, '\\par');
    
    // Asegurar que haya un salto de línea después de cada punto que termina una oración
    content = content.replace(/\.\s*\\par\}/g, '.\\par}');
    
    // Eliminar saltos de línea innecesarios
    content = content.replace(/\\par\}\s*\{\\pard/g, '\\par}{\\pard');
    
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
        '\n': ' ', // Reemplazar saltos de línea con espacios
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