/**
 * Convierte contenido HTML a RTF
 * @param {string} htmlContent - Contenido HTML a convertir
 * @returns {string} Contenido RTF convertido
 */
function htmlToRtf(htmlContent) {
    // Verificar si el contenido es válido
    if (!htmlContent || typeof htmlContent !== 'string') {
        return '';
    }

    try {
        // Extraer el contenido del div si existe
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const contentDiv = tempDiv.querySelector('#termsPreview') || tempDiv;
        
        // Iniciar el documento RTF
        let rtfContent = '{\\rtf1\\ansi\\ansicpg1252\\uc1\\htmautsp\\deff2{\\fonttbl{\\f0\\fcharset0 Times New Roman;}{\\f2\\fcharset0 Segoe UI;}{\\f3\\fcharset0 Aptos;}}{\\colortbl\\red0\\green0\\blue0;\\red255\\green255\\blue255;}\n';
        
        // Agregar tabla de listas
        rtfContent += '{\\*\\listtable{\\list\\listtemplateid1\\listhybrid{\\listlevel\\levelnfc23\\levelnfcn23\\leveljc0\\leveljcn0\\levelfollow0\\levelstartat1\\levelspace0\\levelindent0{\\leveltext\\leveltemplateid5\\\'01\\\'b7}{\\levelnumbers;}\\fi-360\\li720\\lin720\\jclisttab\\tx720}\\listname ;}\\listid1}}\n';
        rtfContent += '{\\*\\listoverridetable{\\listoverride\\listid1\\listoverridecount0\\ls1}}\n';

        // Convertir el contenido HTML a RTF
        let mainContent = procesarContenidoHtml(contentDiv);
        rtfContent += mainContent;

        // Cerrar el documento RTF
        rtfContent += '}';

        // Envolver en el formato JSON requerido
        const jsonRtf = {
            "TermsAndConditions": {
                "Content": rtfContent
            }
        };

        return JSON.stringify(jsonRtf);
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
                .replace(/[\\{}]/g, '\\$&')
                .replace(/[áàäâã]/g, '\\\'e1')
                .replace(/[éèëê]/g, '\\\'e9')
                .replace(/[íìïî]/g, '\\\'ed')
                .replace(/[óòöôõ]/g, '\\\'f3')
                .replace(/[úùüû]/g, '\\\'fa')
                .replace(/[ñ]/g, '\\\'f1')
                .replace(/[©]/g, '\\\'a9');
        } else if (nodo.nodeType === Node.ELEMENT_NODE) {
            switch (nodo.tagName.toLowerCase()) {
                case 'p':
                    rtfContent += '\\pard\\plain\\ltrpar\\qj\\f2\\fs22 ';
                    rtfContent += procesarContenidoHtml(nodo);
                    rtfContent += '\\par\n';
                    break;
                case 'b':
                    rtfContent += '{\\b ';
                    rtfContent += procesarContenidoHtml(nodo);
                    rtfContent += '}';
                    break;
                case 'i':
                    rtfContent += '{\\i ';
                    rtfContent += procesarContenidoHtml(nodo);
                    rtfContent += '}';
                    break;
                case 'u':
                    rtfContent += '{\\ul ';
                    rtfContent += procesarContenidoHtml(nodo);
                    rtfContent += '}';
                    break;
                case 'ul':
                    for (let li of nodo.children) {
                        if (li.tagName.toLowerCase() === 'li') {
                            rtfContent += '{\\pntext\\f3\\\'b7\\tab}';
                            rtfContent += procesarContenidoHtml(li);
                            rtfContent += '\\par\n';
                        }
                    }
                    break;
                case 'span':
                    if (nodo.getAttribute('lang')) {
                        rtfContent += '{\\lang' + (nodo.getAttribute('lang') === 'ES' ? '3082' : '1033') + ' ';
                        rtfContent += procesarContenidoHtml(nodo);
                        rtfContent += '}';
                    } else {
                        rtfContent += procesarContenidoHtml(nodo);
                    }
                    break;
                default:
                    rtfContent += procesarContenidoHtml(nodo);
            }
        }
    }

    return rtfContent;
}
