/**
 * rtf-to-html.js
 * Conversor de RTF a HTML que preserva formato, tildes, viñetas, negritas, etc.
 * 
 * @author Claude AI
 * @version 1.0
 */

/**
 * Convierte contenido RTF a HTML
 * @param {string} rtfContent - Contenido en formato RTF
 * @returns {string} - Contenido convertido a HTML
 */
function rtfToHtml(rtfContent) {
    // Si el contenido viene dentro de un objeto JSON, extraerlo
    if (typeof rtfContent === 'string' && rtfContent.includes('"Content":"')) {
        try {
            const jsonObj = JSON.parse(rtfContent);
            if (jsonObj.Content) {
                rtfContent = jsonObj.Content;
            }
        } catch (e) {
            // Si no es JSON válido, usar el contenido tal como está
            if (rtfContent.includes('"Content":"')) {
                const contentMatch = rtfContent.match(/"Content":"((?:\\"|[^"])*?)"/);
                if (contentMatch && contentMatch[1]) {
                    rtfContent = JSON.parse('"' + contentMatch[1] + '"'); // Usar JSON.parse para manejar escapes
                }
            }
        }
    }

    // Reemplazar secuencias de escape de JSON si es necesario
    rtfContent = rtfContent.replace(/\\"/g, '"').replace(/\\r\\n/g, '\r\n');

    // Estructura para almacenar el estado del análisis
    const state = {
        inParagraph: false,
        inList: false,
        inListItem: false,
        isBold: false,
        fontTable: [],
        currentFont: 0,
        colorTable: [],
        currentColor: 0,
        output: '',
        textBuffer: '',
        skipChars: 0,
        listLevel: 0,
        listType: 'ul'
    };

    // Extraer tabla de fuentes si existe
    const fontTableMatch = rtfContent.match(/\{\\fonttbl(.*?)\}/s);
    if (fontTableMatch) {
        const fontTableContent = fontTableMatch[1];
        const fontMatches = fontTableContent.matchAll(/\{\\f(\d+)\\fcharset\d+ ([^;}]+)[;}]/g);
        for (const fontMatch of fontMatches) {
            state.fontTable[parseInt(fontMatch[1])] = fontMatch[2].trim();
        }
    }

    // Extraer tabla de colores si existe
    const colorTableMatch = rtfContent.match(/\{\\colortbl(.*?);?\}/s);
    if (colorTableMatch) {
        const colorTableContent = colorTableMatch[1];
        const colorEntries = colorTableContent.split(';');
        for (let i = 0; i < colorEntries.length; i++) {
            const entry = colorEntries[i];
            if (entry.trim() === '') {
                state.colorTable.push('default');
            } else {
                const colorComponents = entry.match(/\\red(\d+)\\green(\d+)\\blue(\d+)/);
                if (colorComponents) {
                    const r = parseInt(colorComponents[1]);
                    const g = parseInt(colorComponents[2]);
                    const b = parseInt(colorComponents[3]);
                    state.colorTable.push(`rgb(${r}, ${g}, ${b})`);
                } else {
                    state.colorTable.push('default');
                }
            }
        }
    }

    // Analizar el contenido principal (después de las tablas de definición)
    let mainContentMatch = rtfContent.match(/\\pard(.*?)(?:\{\\listtext|$)/s);
    if (!mainContentMatch) {
        mainContentMatch = rtfContent.match(/\\pard(.*?)$/s);
    }

    if (mainContentMatch) {
        let content = mainContentMatch[1];
        parseContent(content, state);
    } else {
        // Si no podemos encontrar el contenido principal, procesar todo después de \pard
        const pardIndex = rtfContent.indexOf('\\pard');
        if (pardIndex !== -1) {
            parseContent(rtfContent.substring(pardIndex), state);
        } else {
            // Último recurso: procesar todo el contenido
            parseContent(rtfContent, state);
        }
    }

    // Convertir listas RTF a HTML
    const listMatches = rtfContent.matchAll(/\{\\listtext(?:\\[^}]+)?\s*(.*?)\}([^{]*)/gs);
    let listHtml = '';
    let currentListType = null;
    let listItems = [];
    
    for (const listMatch of listMatches) {
        const listMarker = listMatch[1];
        const itemContent = listMatch[2];
        
        // Determinar si es una lista numerada u ordenada
        const listType = listMarker.includes('\\u0027B7') ? 'ul' : 'ol';
        
        if (currentListType === null) {
            currentListType = listType;
        } else if (currentListType !== listType) {
            // Si cambia el tipo de lista, cerrar la anterior y comenzar una nueva
            listHtml += `<${currentListType}>${listItems.join('')}</${currentListType}>`;
            listItems = [];
            currentListType = listType;
        }
        
        // Procesar el contenido del ítem
        let itemHtml = itemContent.replace(/\\par/g, '');
        itemHtml = processRtfText(itemHtml);
        
        listItems.push(`<li>${itemHtml}</li>`);
    }
    
    if (listItems.length > 0 && currentListType) {
        listHtml += `<${currentListType}>${listItems.join('')}</${currentListType}>`;
    }

    // Reemplazar marcadores de lista en el HTML final
    let html = state.output;
    if (listHtml) {
        // Buscar y reemplazar el marcador de lista en el HTML
        html = html.replace(/<p class="MsoNormal"><\/p>/, `<p></p>${listHtml}<p></p>`);
    }

    // Asegurar que todo el contenido esté dentro de párrafos
    html = processRtfFinalHtml(html);

    return html;
}

/**
 * Analiza el contenido RTF y lo convierte a HTML
 * @param {string} content - Contenido RTF a analizar
 * @param {object} state - Estado actual del analizador
 */
function parseContent(content, state) {
    // Iniciar el documento HTML
    state.output = '';
    let inParagraph = false;

    // Dividir por \par para identificar párrafos
    const paragraphs = content.split('\\par');
    
    for (let i = 0; i < paragraphs.length; i++) {
        let paragraph = paragraphs[i];
        
        // Saltar párrafos vacíos
        if (paragraph.trim() === '') {
            continue;
        }
        
        // Procesar el texto RTF de este párrafo
        const processedText = processRtfText(paragraph);
        
        // Si hay contenido, añadir como párrafo
        if (processedText.trim()) {
            state.output += `<p class="MsoNormal">${processedText}</p>\n\n`;
        }
    }
}

/**
 * Procesa el texto RTF para convertirlo a HTML
 * @param {string} rtfText - Texto RTF a procesar
 * @returns {string} - Texto HTML procesado
 */
function processRtfText(rtfText) {
    // Limpiar códigos RTF comunes y convertir a HTML
    let htmlText = rtfText;
    
    // Procesar negrita
    htmlText = htmlText.replace(/\\b\s?/g, '<b>');
    htmlText = htmlText.replace(/\\b0\s?/g, '</b>');
    
    // Procesar cursiva
    htmlText = htmlText.replace(/\\i\s?/g, '<i>');
    htmlText = htmlText.replace(/\\i0\s?/g, '</i>');
    
    // Procesar subrayado
    htmlText = htmlText.replace(/\\ul\s?/g, '<u>');
    htmlText = htmlText.replace(/\\ulnone\s?/g, '</u>');
    
    // Convertir caracteres Unicode y códigos de escape
    htmlText = convertUnicodeAndSpecialChars(htmlText);
    
    // Eliminar códigos RTF restantes
    htmlText = htmlText.replace(/\\[a-zA-Z0-9]+\s?/g, '');
    htmlText = htmlText.replace(/\{|\}/g, '');
    
    // Limpiar espacios redundantes
    htmlText = htmlText.replace(/\s+/g, ' ').trim();
    
    return htmlText;
}

/**
 * Convierte caracteres Unicode y códigos de escape RTF a HTML
 * @param {string} text - Texto con códigos RTF
 * @returns {string} - Texto con códigos HTML
 */
function convertUnicodeAndSpecialChars(text) {
    // Manejar caracteres Unicode \u#### 
    text = text.replace(/\\u(\d+)\s?/g, (match, code) => {
        return String.fromCharCode(parseInt(code));
    });
    
    // Manejar caracteres especiales RTF
    const specialChars = {
        "\\'e1": "á",
        "\\'e9": "é",
        "\\'ed": "í",
        "\\'f3": "ó",
        "\\'fa": "ú",
        "\\'c1": "Á",
        "\\'c9": "É",
        "\\'cd": "Í",
        "\\'d3": "Ó",
        "\\'da": "Ú",
        "\\'f1": "ñ",
        "\\'d1": "Ñ",
        "\\'a8": "¨",
        "\\'bf": "¿",
        "\\'a1": "¡"
    };
    
    // Reemplazar cada caracter especial
    for (const [rtfChar, htmlChar] of Object.entries(specialChars)) {
        text = text.replace(new RegExp(rtfChar, 'g'), htmlChar);
    }
    
    // Convertir \' seguido de código hexadecimal a su caracter correspondiente
    text = text.replace(/\\\\'([0-9a-fA-F]{2})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });
    
    return text;
}

/**
 * Procesa el HTML final para asegurar que está correctamente formateado
 * @param {string} html - HTML a procesar
 * @returns {string} - HTML procesado
 */
function processRtfFinalHtml(html) {
    // Asegurarse de que todas las etiquetas están correctamente cerradas
    html = html.replace(/<b>([^<]*?)(?!<\/b>)/g, '<b>$1</b>');
    html = html.replace(/<i>([^<]*?)(?!<\/i>)/g, '<i>$1</i>');
    html = html.replace(/<u>([^<]*?)(?!<\/u>)/g, '<u>$1</u>');
    
    // Reemplazar escapes que no se hayan procesado
    html = html.replace(/&nbsp;/g, ' ');
    html = html.replace(/\\tab/g, '    ');
    
    // Reemplazar espacios de no ruptura
    html = html.replace(/&nbsp;/g, ' ');
    
    // Limpiar cualquier código RTF restante
    html = html.replace(/\\[a-zA-Z0-9]+/g, '');
    
    // Limpiar llaves restantes
    html = html.replace(/\{|\}/g, '');
    
    return html;
}

// Si estamos en un entorno Node.js, exportar la función
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { rtfToHtml };
} else {
    // Si estamos en un navegador, añadir al objeto window
    window.rtfToHtml = rtfToHtml;
}
