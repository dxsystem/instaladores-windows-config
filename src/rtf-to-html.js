/**
 * Convierte contenido RTF a HTML
 * @param {string} rtfContent - Contenido RTF a convertir
 * @returns {string} Contenido HTML convertido
 */
function rtfToHtml(rtfContent) {
    // Verificar si el contenido es válido
    if (!rtfContent || typeof rtfContent !== 'string') {
        return '';
    }

    try {
        // Extraer el contenido RTF del objeto JSON si es necesario
        let rtfText = rtfContent;
        if (rtfContent.includes('"Content":')) {
            const rtfObject = JSON.parse(rtfContent);
            rtfText = rtfObject.TermsAndConditions.Content;
        }

        // Procesar caracteres especiales y codificación
        let htmlContent = rtfText
            // Reemplazar caracteres especiales RTF
            .replace(/\\\'/(\d+)/g, (match, code) => String.fromCharCode(code))
            .replace(/\\u(\d+)\?/g, (match, code) => String.fromCharCode(code))
            .replace(/\\\u(\d+)/g, (match, code) => String.fromCharCode(code))
            .replace(/\\par/g, '</p><p class="MsoNormal">')
            .replace(/\\pard/g, '')
            .replace(/\\plain/g, '')
            .replace(/\\f\d+/g, '')
            .replace(/\\fs\d+/g, '')
            .replace(/\\cf\d+/g, '')
            
            // Procesar estilos
            .replace(/\\b\s/g, '<b>')
            .replace(/\\b0\s/g, '</b>')
            .replace(/\\i\s/g, '<i>')
            .replace(/\\i0\s/g, '</i>')
            .replace(/\\ul\s/g, '<u>')
            .replace(/\\ulnone\s/g, '</u>')
            
            // Procesar listas
            .replace(/\\pntext[^}]*}/g, '')
            .replace(/\\ls\d+\\ilvl\d+/g, '')
            .replace(/\\listtext/g, '')
            .replace(/\{\\\\pn[^}]*\}/g, '')
            .replace(/\\bullet/g, '•')
            
            // Limpiar códigos RTF restantes
            .replace(/\{\\rtf1[^}]*\}/g, '')
            .replace(/\{\\fonttbl[^}]*\}/g, '')
            .replace(/\{\\colortbl[^}]*\}/g, '')
            .replace(/\{\\stylesheet[^}]*\}/g, '')
            .replace(/\{\\listtable[^}]*\}/g, '')
            .replace(/\{\\listoverridetable[^}]*\}/g, '')
            .replace(/\\[a-z]+\d*/g, '')
            .replace(/\{|\}/g, '')
            
            // Limpiar espacios y líneas vacías múltiples
            .replace(/\s+/g, ' ')
            .replace(/(<\/p><p class="MsoNormal">)\s*(<\/p><p class="MsoNormal">)/g, '$1')
            .trim();

        // Procesar listas
        htmlContent = procesarListas(htmlContent);

        // Envolver el contenido en los divs necesarios
        htmlContent = `<div id="termsPreview" class="terms-preview p-3" style="max-height: 300px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 0.25rem;" bis_skin_checked="1">
            <p class="MsoNormal">${htmlContent}</p>
        </div>`;

        // Limpiar formato final
        return htmlContent
            .replace(/<p class="MsoNormal"><\/p>/g, '')
            .replace(/\s+</g, '<')
            .replace(/>\s+/g, '>')
            .replace(/\s+/g, ' ');
    } catch (error) {
        console.error('Error al convertir RTF a HTML:', error);
        return '';
    }
}

/**
 * Procesa y formatea las listas en el contenido
 * @param {string} content - Contenido a procesar
 * @returns {string} Contenido con listas formateadas
 */
function procesarListas(content) {
    // Detectar elementos de lista
    const listaRegex = /•\s*([^•]+)(?=•|$)/g;
    const items = content.match(listaRegex);

    if (items && items.length > 0) {
        let listaHtml = '<ul>';
        items.forEach(item => {
            const textoItem = item.replace('•', '').trim();
            // Preservar negritas y otros formatos dentro de los items
            listaHtml += `<li>${textoItem}</li>`;
        });
        listaHtml += '</ul>';

        // Reemplazar la sección de lista en el contenido original
        content = content.replace(items.join(''), listaHtml);
    }

    return content;
}
