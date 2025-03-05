/**
 * Convierte contenido HTML a RTF
 * @param {string} htmlContent - Contenido HTML a convertir
 * @returns {string} Contenido RTF convertido
 */
function htmlToRtf(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') {
        return '';
    }

    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const contentDiv = tempDiv.querySelector('#termsPreview') || tempDiv;
        
        // Encabezado RTF con configuración para español
        let rtfContent = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang3082{\\fonttbl{\\f0\\fnil\\fcharset0 Segoe UI;}{\\f1\\fnil\\fcharset0 Times New Roman;}}\n';
        rtfContent += '{\\*\\generator Riched20 10.0.19041}{\\*\\mmathPr\\mdispDef1\\mwrapIndent1440 }\\viewkind4\\uc1\n';
        
        // Tabla de colores
        rtfContent += '{\\colortbl ;\\red0\\green0\\blue0;\\red255\\green255\\blue255;}\n';
        
        // Configuración de listas
        rtfContent += '{\\*\\listtable{\\list\\listtemplateid1\\listhybrid{\\listlevel\\levelnfc23\\levelnfcn23\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1{\\leveltext\\leveltemplateid1\\\'01\\bullet;}{\\levelnumbers;}\\f3\\fbias0 \\fi-360\\li720\\lin720 }\\listname ;\\listid1}}\n';
        rtfContent += '{\\*\\listoverridetable{\\listoverride\\listid1\\listoverridecount0\\ls1}}\n';

        // Configuración de estilos
        rtfContent += '{\\stylesheet{\\ql \\li0\\ri0\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 \\rtlch\\fcs1 \\af0\\afs22\\alang1025 \\ltrch\\fcs0 \\fs22\\lang3082\\langfe3082\\cgrid\\langnp3082\\langfenp3082 \\snext0 Normal;}\n';
        rtfContent += '{\\s15\\ql \\li0\\ri0\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 \\rtlch\\fcs1 \\af0\\afs22\\alang1025 \\ltrch\\fcs0 \\fs22\\lang3082\\langfe3082\\cgrid\\langnp3082\\langfenp3082 \\sbasedon0 \\snext15 Normal (Web);}}\n';

        // Convertir el contenido
        let mainContent = procesarContenidoHtml(contentDiv);
        rtfContent += mainContent;

        // Cerrar documento RTF
        rtfContent += '}';

        return JSON.stringify({
            "TermsAndConditions": {
                "Content": rtfContent
            }
        });
    } catch (error) {
        console.error('Error al convertir HTML a RTF:', error);
        return '';
    }
}

/**
 * Procesa el contenido HTML y lo convierte a formato RTF
 * @param {HTMLElement} elemento - Elemento HTML a procesar
 * @returns {string} Contenido RTF procesado
 */
function procesarContenidoHtml(elemento) {
    let rtfContent = '';
    const nodos = elemento.childNodes;

    for (let nodo of nodos) {
        if (nodo.nodeType === Node.TEXT_NODE) {
            // Convertir caracteres especiales
            rtfContent += nodo.textContent
                // Caracteres de escape RTF
                .replace(/[\\{}]/g, '\\$&')
                // Vocales con tilde
                .replace(/á/g, '\\\'e1')
                .replace(/é/g, '\\\'e9')
                .replace(/í/g, '\\\'ed')
                .replace(/ó/g, '\\\'f3')
                .replace(/ú/g, '\\\'fa')
                // Vocales con diéresis
                .replace(/ä/g, '\\\'e4')
                .replace(/ë/g, '\\\'eb')
                .replace(/ï/g, '\\\'ef')
                .replace(/ö/g, '\\\'f6')
                .replace(/ü/g, '\\\'fc')
                // Vocales con acento grave
                .replace(/à/g, '\\\'e0')
                .replace(/è/g, '\\\'e8')
                .replace(/ì/g, '\\\'ec')
                .replace(/ò/g, '\\\'f2')
                .replace(/ù/g, '\\\'f9')
                // Vocales con circunflejo
                .replace(/â/g, '\\\'e2')
                .replace(/ê/g, '\\\'ea')
                .replace(/î/g, '\\\'ee')
                .replace(/ô/g, '\\\'f4')
                .replace(/û/g, '\\\'fb')
                // Otros caracteres especiales
                .replace(/ñ/g, '\\\'f1')
                .replace(/Ñ/g, '\\\'d1')
                .replace(/©/g, '\\\'a9')
                .replace(/®/g, '\\\'ae')
                .replace(/™/g, '\\\'99')
                .replace(/€/g, '\\\'80')
                .replace(/£/g, '\\\'a3')
                .replace(/°/g, '\\\'b0')
                .replace(/¿/g, '\\\'bf')
                .replace(/¡/g, '\\\'a1')
                // Comillas y otros símbolos
                .replace(/"/g, '\\\'94')
                .replace(/"/g, '\\\'93')
                .replace(/'/g, '\\\'92')
                .replace(/'/g, '\\\'91')
                .replace(/…/g, '\\\'85')
                .replace(/–/g, '\\\'96')
                .replace(/—/g, '\\\'97')
                .replace(/•/g, '\\\'b7');
        } else if (nodo.nodeType === Node.ELEMENT_NODE) {
            switch (nodo.tagName.toLowerCase()) {
                case 'div':
                    rtfContent += procesarContenidoHtml(nodo);
                    break;
                case 'p':
                    if (nodo.className === 'MsoNormal') {
                        rtfContent += '\\pard\\plain\\sa160\\sl252\\slmult1\\f0\\fs22 ';
                    } else {
                        rtfContent += '\\pard\\plain\\f0\\fs22 ';
                    }
                    rtfContent += procesarContenidoHtml(nodo);
                    rtfContent += '\\par\n';
                    break;
                case 'b':
                case 'strong':
                    rtfContent += '{\\b ';
                    rtfContent += procesarContenidoHtml(nodo);
                    rtfContent += '}';
                    break;
                case 'i':
                case 'em':
                    rtfContent += '{\\i ';
                    rtfContent += procesarContenidoHtml(nodo);
                    rtfContent += '}';
                    break;
                case 'u':
                    rtfContent += '{\\ul ';
                    rtfContent += procesarContenidoHtml(nodo);
                    rtfContent += '}';
                    break;
                case 'span':
                    if (nodo.getAttribute('lang')) {
                        const langCode = nodo.getAttribute('lang').toUpperCase();
                        const langId = langCode === 'ES' || langCode === 'ES-ES' ? '3082' : '1033';
                        rtfContent += '{\\lang' + langId + ' ';
                        rtfContent += procesarContenidoHtml(nodo);
                        rtfContent += '}';
                    } else {
                        rtfContent += procesarContenidoHtml(nodo);
                    }
                    break;
                case 'ul':
                    rtfContent += '\\pard{\\*\\pn\\pnlvlblt\\pnf3\\pnindent0{\\pntxtb\\\'b7}}\\fi-360\\li720\\sa160\\sl252\\slmult1\\f0\\fs22 ';
                    for (let li of nodo.children) {
                        if (li.tagName.toLowerCase() === 'li') {
                            rtfContent += procesarContenidoHtml(li);
                            rtfContent += '\\par\n';
                        }
                    }
                    rtfContent += '\\pard\\plain\\f0\\fs22\n';
                    break;
                case 'li':
                    rtfContent += procesarContenidoHtml(nodo);
                    break;
                case 'br':
                    rtfContent += '\\line ';
                    break;
                case 'a':
                    rtfContent += '{\\field{\\*\\fldinst{HYPERLINK "' + 
                        nodo.getAttribute('href').replace(/[\\{}]/g, '\\$&') + 
                        '"}}{\\fldrslt{\\ul\\cf1 ' + 
                        procesarContenidoHtml(nodo) + 
                        '}}}';
                    break;
                default:
                    rtfContent += procesarContenidoHtml(nodo);
            }
        }
    }

    return rtfContent;
}
