/**
 * Conversor de HTML a RTF
 * Este archivo contiene funciones para convertir contenido HTML a formato RTF
 * compatible con WPF RichTextBox.
 */

// Convertir HTML a RTF mejorado
function htmlToRtf(html) {
    // Encabezado RTF básico compatible con WPF RichTextBox
    let rtf = '{\\rtf1\\ansi\\ansicpg1252\\uc1\\htmautsp\\deff2{\\fonttbl{\\f0\\fcharset0 Times New Roman;}{\\f2\\fcharset0 Segoe UI;}{\\f3\\fcharset0 Aptos;}}}';
    rtf += '{\\colortbl\\red0\\green0\\blue0;\\red255\\green255\\blue255;}';
    
    // Agregar tabla de listas para soportar listas con viñetas
    rtf += '\r\n{\\*\\listtable\r\n';
    rtf += '{\\list\\listtemplateid1\\listhybrid\r\n';
    rtf += '{\\listlevel\\levelnfc23\\levelnfcn23\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid5\\\u002701\\\u0027b7}{\\levelnumbers;}\\fi-360\\li720\\lin720\\jclisttab\\tx720}\r\n';
    rtf += '{\\listlevel\\levelnfc0\\levelnfcn0\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid6\\\u002702\\\u002701.;}{\\levelnumbers\\\u002701;}\\fi-360\\li1440\\lin1440\\jclisttab\\tx1440}\r\n';
    rtf += '{\\listlevel\\levelnfc0\\levelnfcn0\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid7\\\u002702\\\u002702.;}{\\levelnumbers\\\u002701;}\\fi-360\\li2160\\lin2160\\jclisttab\\tx2160}\r\n';
    rtf += '{\\listlevel\\levelnfc0\\levelnfcn0\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid8\\\u002702\\\u002703.;}{\\levelnumbers\\\u002701;}\\fi-360\\li2880\\lin2880\\jclisttab\\tx2880}\r\n';
    rtf += '{\\listlevel\\levelnfc0\\levelnfcn0\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid9\\\u002702\\\u002704.;}{\\levelnumbers\\\u002701;}\\fi-360\\li3600\\lin3600\\jclisttab\\tx3600}\r\n';
    rtf += '{\\listlevel\\levelnfc0\\levelnfcn0\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid10\\\u002702\\\u002705.;}{\\levelnumbers\\\u002701;}\\fi-360\\li4320\\lin4320\\jclisttab\\tx4320}\r\n';
    rtf += '{\\listlevel\\levelnfc0\\levelnfcn0\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid11\\\u002702\\\u002706.;}{\\levelnumbers\\\u002701;}\\fi-360\\li5040\\lin5040\\jclisttab\\tx5040}\r\n';
    rtf += '{\\listlevel\\levelnfc0\\levelnfcn0\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid12\\\u002702\\\u002707.;}{\\levelnumbers\\\u002701;}\\fi-360\\li5760\\lin5760\\jclisttab\\tx5760}\r\n';
    rtf += '{\\listlevel\\levelnfc0\\levelnfcn0\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid13\\\u002702\\\u002708.;}{\\levelnumbers\\\u002701;}\\fi-360\\li6480\\lin6480\\jclisttab\\tx6480}\r\n';
    rtf += '{\\listname ;}\\listid1}}\r\n';
    rtf += '{\\*\\listoverridetable\r\n';
    rtf += '{\\listoverride\\listid1\\listoverridecount0\\ls1}\r\n';
    rtf += '}\r\n';
    
    // Iniciar el cuerpo del documento
    rtf += '\\loch\\hich\\dbch\\pard\\plain\\ltrpar\\itap0{\\lang1033\\fs21\\f2\\cf1 \\cf1\\ql';
    
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
                    prefix = '{\\fs22\\f3\\b {\\lang10250\\ltrch ';
                    suffix = '}\\li0\\ri0\\sa160\\sb0\\fi0\\ql\\par}\r\n';
                    break;
                case 'h2':
                    prefix = '{\\fs22\\f3 {\\lang10250\\b\\ltrch ';
                    suffix = '}\\li0\\ri0\\sa160\\sb0\\fi0\\ql\\par}\r\n';
                    break;
                case 'p':
                    if (node.className === 'bold') {
                        prefix = '{\\fs22\\f3 {\\lang10250\\b\\ltrch ';
                        suffix = '}{\\lang10250\\ltrch  \\~ }\\li0\\ri0\\sa160\\sb0\\fi0\\ql\\par}\r\n';
                    } else {
                        prefix = '{\\fs22\\f3 {\\lang10250\\ltrch ';
                        suffix = '}\\li0\\ri0\\sa160\\sb0\\fi0\\ql\\par}\r\n';
                    }
                    break;
                case 'span':
                    if (node.className === 'bold') {
                        prefix = '{\\lang10250\\b\\ltrch ';
                        suffix = '}';
                    } else {
                        prefix = '{\\lang10250\\ltrch ';
                        suffix = '}';
                    }
                    break;
                case 'b':
                case 'strong':
                    prefix = '{\\lang10250\\b\\ltrch ';
                    suffix = '}';
                    break;
                case 'i':
                case 'em':
                    prefix = '{\\lang10250\\i\\ltrch ';
                    suffix = '}';
                    break;
                case 'u':
                    prefix = '{\\lang10250\\ul\\ltrch ';
                    suffix = '}';
                    break;
                case 'br':
                    return '\\line ';
                case 'ul':
                    // No añadir prefijo/sufijo especial, se maneja en los elementos li
                    break;
                case 'li':
                    prefix = '{\\fs22\\f3 {\\pntext \\\u0027B7\\tab}{\\*\\pn\\pnlvlblt\\pnstart1{\\pntxtb\\\u0027B7}}{\\lang10250\\ltrch ';
                    suffix = '}\\li720\\ri0\\sa160\\sb0\\jclisttab\\tx720\\fi-360\\ql\\par}\r\n';
                    break;
                case 'a':
                    // Para enlaces, simplemente mostrar el texto sin formato especial
                    prefix = '';
                    suffix = '';
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
        content = '{\\fs22\\f3 {\\lang10250\\ltrch  }\\li0\\ri0\\sa160\\sb0\\fi0\\ql\\par}\r\n';
    }
    
    // Finalizar el RTF
    rtf += content + '}';
    return rtf;
}

// Función para escapar caracteres especiales en RTF
function escapeRtf(text) {
    if (!text) return '';
    
    // Reemplazar caracteres especiales con sus equivalentes RTF
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\n/g, ' ')  // Reemplazar saltos de línea con espacios
        .replace(/\r/g, '')   // Eliminar retornos de carro
        .replace(/\t/g, '\\tab ')  // Convertir tabulaciones
        .replace(/á/g, '\\\u0027e1')
        .replace(/é/g, '\\\u0027e9')
        .replace(/í/g, '\\\u0027ed')
        .replace(/ó/g, '\\\u0027f3')
        .replace(/ú/g, '\\\u0027fa')
        .replace(/ñ/g, '\\\u0027f1')
        .replace(/Á/g, '\\\u0027c1')
        .replace(/É/g, '\\\u0027c9')
        .replace(/Í/g, '\\\u0027cd')
        .replace(/Ó/g, '\\\u0027d3')
        .replace(/Ú/g, '\\\u0027da')
        .replace(/Ñ/g, '\\\u0027d1')
        .replace(/ü/g, '\\\u0027fc')
        .replace(/Ü/g, '\\\u0027dc')
        .replace(/©/g, '\\\u0027a9')
        .replace(/"/g, '\u0022')  // Comillas dobles
        .replace(/'/g, '\\\u0027')  // Comilla simple
        .replace(/–/g, '\\\u0027-')  // Guión largo
        .replace(/—/g, '\\\u0027-')  // Guión más largo
        .replace(/…/g, '...');  // Puntos suspensivos
} 