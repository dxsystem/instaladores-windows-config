/**
 * Convierte contenido RTF a HTML
 * @param {string} rtfContent - Contenido RTF a convertir
 * @returns {string} Contenido HTML convertido
 */
function rtfToHtml(rtfContent) {
    if (!rtfContent || typeof rtfContent !== 'string') {
        return '';
    }

    try {
        // Extraer el contenido RTF del objeto JSON si es necesario
        let rtfText = rtfContent;
        if (rtfContent.includes('"Content":')) {
            try {
                const rtfObject = JSON.parse(rtfContent);
                rtfText = rtfObject.TermsAndConditions.Content;
            } catch (e) {
                console.warn('No se pudo parsear el JSON, usando el contenido como está');
            }
        }

        // Limpiar códigos RTF de control y metadatos
        let htmlContent = rtfText
            // Eliminar encabezados RTF y metadatos
            .replace(/\{\\rtf1[^}]*\}/, '')
            .replace(/\{\\fonttbl[^}]*\}/, '')
            .replace(/\{\\colortbl[^}]*\}/, '')
            .replace(/\{\\stylesheet[^}]*\}/, '')
            .replace(/\{\\listtable[^}]*\}/, '')
            .replace(/\{\\listoverridetable[^}]*\}/, '')
            .replace(/\{\\generator[^}]*\}/, '')
            .replace(/\{\\mmathPr[^}]*\}/, '')
            .replace(/\\viewkind\d/, '')
            .replace(/\\uc1/, '')
            
            // Convertir caracteres especiales
            // Vocales con tilde
            .replace(/\\\'e1/g, 'á')
            .replace(/\\\'e9/g, 'é')
            .replace(/\\\'ed/g, 'í')
            .replace(/\\\'f3/g, 'ó')
            .replace(/\\\'fa/g, 'ú')
            .replace(/\\\'c1/g, 'Á')
            .replace(/\\\'c9/g, 'É')
            .replace(/\\\'cd/g, 'Í')
            .replace(/\\\'d3/g, 'Ó')
            .replace(/\\\'da/g, 'Ú')
            // Caracteres especiales españoles
            .replace(/\\\'f1/g, 'ñ')
            .replace(/\\\'d1/g, 'Ñ')
            .replace(/\\\'bf/g, '¿')
            .replace(/\\\'a1/g, '¡')
            // Símbolos especiales
            .replace(/\\\'a9/g, '©')
            .replace(/\\\'ae/g, '®')
            .replace(/\\\'99/g, '™')
            .replace(/\\\'80/g, '€')
            .replace(/\\\'a3/g, '£')
            .replace(/\\\'b0/g, '°')
            // Comillas y otros símbolos
            .replace(/\\\'94/g, '"')
            .replace(/\\\'93/g, '"')
            .replace(/\\\'92/g, "'")
            .replace(/\\\'91/g, "'")
            .replace(/\\\'85/g, '...')
            .replace(/\\\'96/g, '-')
            .replace(/\\\'97/g, '--')
            .replace(/\\\'95/g, '•')
            
            // Convertir formatos RTF a HTML
            .replace(/\\pard\\plain\\sa160\\sl252\\slmult1\\qj\\f0\\fs22\s*/g, '<p class="MsoNormal">')
            .replace(/\\pard\\plain\\qj\\f0\\fs22\s*/g, '<p>')
            .replace(/\\par\s*/g, '</p>')
            .replace(/\{\\b\s+([^}]+)\}/g, '<b>$1</b>')
            .replace(/\{\\i\s+([^}]+)\}/g, '<i>$1</i>')
            .replace(/\{\\ul\s+([^}]+)\}/g, '<u>$1</u>')
            .replace(/\\line\s*/g, '<br>')
            
            // Procesar listas
            .replace(/\\pard\{\\\*\\pn\\pnlvlblt\\pnf2\\pnindent0\{\\pntxtb\\\'95\}\}\\fi-360\\li720\\sa160\\sl252\\slmult1\\f0\\fs22\s*/g, '<ul>')
            .replace(/\\pard\\plain\\f0\\fs22\s*(?=<\/p>)/g, '</ul>')
            
            // Procesar enlaces
            .replace(/\{\\field\{\\*\\fldinst\{HYPERLINK "([^"]+)"\}\}\{\\fldrslt\{\\ul\\cf1\s+([^}]+)\}\}\}/g, '<a href="$1">$2</a>')
            
            // Procesar idiomas
            .replace(/\{\\lang3082\s+([^}]+)\}/g, '<span lang="ES-ES">$1</span>')
            .replace(/\{\\lang1033\s+([^}]+)\}/g, '<span lang="EN-US">$1</span>')
            
            // Limpiar códigos RTF restantes y espacios
            .replace(/\\[a-z]+\d*/g, '')
            .replace(/\{|\}/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return htmlContent;
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
            listaHtml += `<li>${textoItem}</li>`;
        });
        listaHtml += '</ul>';

        // Reemplazar la sección de lista en el contenido original
        content = content.replace(items.join(''), listaHtml);
    }

    return content;
}
