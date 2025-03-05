/**
 * html-to-rtf.js
 * Conversor de HTML a RTF que preserva formato, tildes, viñetas, negritas, etc.
 * 
 * @author Claude AI
 * @version 1.0
 */

/**
 * Convierte contenido HTML a RTF
 * @param {string} htmlContent - Contenido en formato HTML
 * @returns {string} - Contenido convertido a RTF
 */
function htmlToRtf(htmlContent) {
    // Si no hay contenido, devolver un RTF vacío
    if (!htmlContent) {
        return '{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Segoe UI;}}\r\n\\viewkind4\\uc1\\pard\\f0\\fs22 \\par\r\n}';
    }

    // Inicializar el documento RTF
    let rtf = '{\\rtf1\\ansi\\ansicpg1252\\uc1\\htmautsp\\deff2{\\fonttbl{\\f0\\fcharset0 Times New Roman;}{\\f2\\fcharset0 Segoe UI;}{\\f3\\fcharset0 Aptos;}}{\\colortbl\\red0\\green0\\blue0;\\red255\\green255\\blue255;}\r\n';
    
    // Añadir definición de listas si es necesario
    if (htmlContent.includes('<ul>') || htmlContent.includes('<ol>')) {
        rtf += `{\\*\\listtable
{\\list\\listtemplateid1\\listhybrid
{\\listlevel\\levelnfc23\\levelnfcn23\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid5\\\\u002701\\\\u0027b7}{\\levelnumbers;}\\fi-360\\li720\\lin720\\jclisttab\\tx720}
{\\listlevel\\levelnfc0\\levelnfcn0\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid6\\\\u002702\\\\u002701.;}{\\levelnumbers\\\\u002701;}\\fi-360\\li1440\\lin1440\\jclisttab\\tx1440}
{\\listname ;}\\listid1}}
{\\*\\listoverridetable
{\\listoverride\\listid1\\listoverridecount0\\ls1}
}\r\n`;
    }

    // Comenzar el contenido principal
    rtf += '\\loch\\hich\\dbch\\pard\\plain\\ltrpar\\itap0{\\lang1033\\fs21\\f2\\cf1 \\cf1\\ql';
    
    // Crear un parser de DOM temporal
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Procesar nodos del cuerpo
    const body = doc.body || doc.documentElement;
    
    // Procesar elementos
    rtf += processHtmlNode(body);
    
    // Cerrar el documento RTF
    rtf += '}\r\n}';
    
    return rtf;
}

/**
 * Procesa un nodo HTML y lo convierte a formato RTF
 * @param {Node} node - Nodo DOM a procesar
 * @returns {string} - Fragmento RTF correspondiente
 */
function processHtmlNode(node) {
    let rtfContent = '';
    
    // Procesar nodos hijos
    if (node.nodeType === Node.ELEMENT_NODE) {
        // Manejar diferentes tipos de elementos
        switch (node.nodeName.toLowerCase()) {
            case 'p':
                rtfContent += '{';
                
                // Aplicar clase si existe
                if (node.className) {
                    if (node.className.includes('MsoNormal')) {
                        rtfContent += '\\fs22\\f3 ';
                    }
                }
                
                // Procesar contenido del párrafo
                for (let child of node.childNodes) {
                    rtfContent += processHtmlNode(child);
                }
                
                rtfContent += '\\li0\\ri0\\sa160\\sb0\\fi0\\ql\\par}\r\n';
                break;
                
            case 'div':
                // Simplemente procesa el contenido del div
                for (let child of node.childNodes) {
                    rtfContent += processHtmlNode(child);
                }
                break;
                
            case 'br':
                rtfContent += '\\par ';
                break;
                
            case 'b':
            case 'strong':
                rtfContent += '{\\b ';
                for (let child of node.childNodes) {
                    rtfContent += processHtmlNode(child);
                }
                rtfContent += '}';
                break;
                
            case 'i':
            case 'em':
                rtfContent += '{\\i ';
                for (let child of node.childNodes) {
                    rtfContent += processHtmlNode(child);
                }
                rtfContent += '}';
                break;
                
            case 'u':
                rtfContent += '{\\ul ';
                for (let child of node.childNodes) {
                    rtfContent += processHtmlNode(child);
                }
                rtfContent += '}';
                break;
                
            case 'span':
                rtfContent += '{';
                
                // Aplicar estilo de lenguaje si existe un atributo lang
                const lang = node.getAttribute('lang');
                if (lang) {
                    rtfContent += `\\lang${getLangCode(lang)}`;
                }
                
                // Aplicar estilo de dirección de texto
                if (node.style.direction === 'rtl') {
                    rtfContent += '\\rtlch';
                } else {
                    rtfContent += '\\ltrch';
                }
                
                // Procesar contenido del span
                for (let child of node.childNodes) {
                    rtfContent += processHtmlNode(child);
                }
                
                rtfContent += '}';
                break;
                
            case 'ul':
                // Procesar elementos de lista
                for (let i = 0; i < node.childNodes.length; i++) {
                    const child = node.childNodes[i];
                    if (child.nodeName.toLowerCase() === 'li') {
                        rtfContent += processBulletedListItem(child);
                    }
                }
                break;
                
            case 'ol':
                // Procesar elementos de lista numerada
                for (let i = 0; i < node.childNodes.length; i++) {
                    const child = node.childNodes[i];
                    if (child.nodeName.toLowerCase() === 'li') {
                        rtfContent += processNumberedListItem(child, i + 1);
                    }
                }
                break;
                
            case 'li':
                // Los elementos <li> se procesarán en <ul> o <ol>
                break;
                
            default:
                // Procesar cualquier otro elemento de manera genérica
                for (let child of node.childNodes) {
                    rtfContent += processHtmlNode(child);
                }
                break;
        }
    } else if (node.nodeType === Node.TEXT_NODE) {
        // Convertir texto a formato RTF
        rtfContent += convertTextToRtf(node.textContent);
    }
    
    return rtfContent;
}

/**
 * Procesa un elemento de lista con viñetas
 * @param {Element} liElement - Elemento de lista
 * @returns {string} - Fragmento RTF correspondiente
 */
function processBulletedListItem(liElement) {
    let rtfContent = `{\\pntext \\\\u0027B7\\tab}{\\*\\pn\\pnlvlblt\\pnstart1{\\pntxtb\\\\u0027B7}}`;
    
    // Procesar el contenido del elemento de lista
    for (let child of liElement.childNodes) {
        rtfContent += processHtmlNode(child);
    }
    
    rtfContent += '\\li720\\ri0\\sa160\\sb0\\jclisttab\\tx720\\fi-360\\ql\\par}\r\n';
    
    return rtfContent;
}

/**
 * Procesa un elemento de lista numerada
 * @param {Element} liElement - Elemento de lista
 * @param {number} index - Índice del elemento (número)
 * @returns {string} - Fragmento RTF correspondiente
 */
function processNumberedListItem(liElement, index) {
    let rtfContent = `{\\pntext ${index}.\\tab}{\\*\\pn\\pnlvlbody\\pnstart${index}\\pndec{\\pntxta.}}`;
    
    // Procesar el contenido del elemento de lista
    for (let child of liElement.childNodes) {
        rtfContent += processHtmlNode(child);
    }
    
    rtfContent += '\\li720\\ri0\\sa160\\sb0\\jclisttab\\tx720\\fi-360\\ql\\par}\r\n';
    
    return rtfContent;
}

/**
 * Convierte texto plano a formato RTF
 * @param {string} text - Texto plano
 * @returns {string} - Texto en formato RTF
 */
function convertTextToRtf(text) {
    if (!text) return '';
    
    // Escapar caracteres especiales RTF
    text = text
        .replace(/\\/g, '\\\\')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\n/g, '\\par ');
    
    // Manejar caracteres especiales y acentos
    const charMap = {
        'á': "\\'e1",
        'é': "\\'e9",
        'í': "\\'ed",
        'ó': "\\'f3",
        'ú': "\\'fa",
        'Á': "\\'c1",
        'É': "\\'c9",
        'Í': "\\'cd",
        'Ó': "\\'d3",
        'Ú': "\\'da",
        'ñ': "\\'f1",
        'Ñ': "\\'d1",
        'ü': "\\'fc",
        'Ü': "\\'dc",
        '¿': "\\'bf",
        '¡': "\\'a1",
        '€': '\\u8364',
        '£': '\\u163',
        '©': '\\u169',
        '®': '\\u174',
        '°': '\\u176',
        '±': '\\u177',
        '×': '\\u215',
        '÷': '\\u247'
    };
    
    // Reemplazar caracteres especiales
    for (const [char, rtfChar] of Object.entries(charMap)) {
        text = text.replace(new RegExp(char, 'g'), rtfChar);
    }
    
    // Convertir otros caracteres Unicode
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        if (charCode > 127) {
            // Usar notación Unicode RTF para caracteres no ASCII
            if (charCode < 32768) {
                result += `\\u${charCode}?`;  // El ? es un placeholder RTF
            } else {
                // Para caracteres fuera del rango Unicode BMP, necesitamos manejo especial
                result += `\\u-${65536 - charCode}?`;
            }
        } else {
            result += text.charAt(i);
        }
    }
    
    return result;
}

/**
 * Obtiene el código de idioma RTF a partir del código de idioma HTML
 * @param {string} htmlLang - Código de idioma HTML (ej: "es-ES")
 * @returns {number} - Código de idioma RTF
 */
function getLangCode(htmlLang) {
    // Mapeo básico de códigos ISO a códigos RTF
    const langMap = {
        'en': 1033,    // Inglés
        'es': 3082,    // Español
        'fr': 1036,    // Francés
        'de': 1031,    // Alemán
        'it': 1040,    // Italiano
        'pt': 2070,    // Portugués
        'ru': 1049,    // Ruso
        'ja': 1041,    // Japonés
        'zh': 2052,    // Chino
        'ar': 1025,    // Árabe
        'hi': 1081,    // Hindi
        'he': 1037     // Hebreo
    };
    
    // Obtener la parte principal del código de idioma (antes del guion si existe)
    const mainLang = htmlLang.split('-')[0].toLowerCase();
    
    // Devolver el código RTF o un código por defecto
    return langMap[mainLang] || 1033;
}

// Si estamos en un entorno Node.js, exportar la función
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { htmlToRtf };
} else {
    // Si estamos en un navegador, añadir al objeto window
    window.htmlToRtf = htmlToRtf;
}
