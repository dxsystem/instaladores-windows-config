/**
 * Conversor de RTF a HTML
 * Este archivo contiene funciones para convertir contenido RTF a formato HTML
 * para su visualización en la web.
 */

// Convertir RTF a HTML
function rtfToHtml(rtf) {
    // Si no hay contenido RTF, devolver cadena vacía
    if (!rtf || rtf.trim() === '') {
        console.warn('rtfToHtml: No hay contenido RTF para convertir');
        return '';
    }
    
    try {
        console.log('rtfToHtml: Iniciando conversión, longitud RTF:', rtf.length);
        
        // Buscar el inicio del contenido real
        const contentStart = rtf.indexOf('\\ltrpar\\itap0');
        if (contentStart === -1) {
            throw new Error('No se pudo encontrar el contenido RTF válido');
        }

        // Extraer el contenido
        let content = rtf.substring(contentStart);
        
        // Crear el HTML base
        let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Términos y Condiciones - Instaladores de Windows Online C#</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            width: 100%;
            margin: 0;
            padding: 0;
            color: #000;
            background-color: #fff;
        }
        h1, h2 {
            color: #000;
        }
        ul {
            padding-left: 40px;
        }
        .bold {
            font-weight: bold;
        }
    </style>
</head>
<body>`;

        // Extraer y procesar párrafos
        const paragraphs = content.split('\\par');
        
        // Variables para seguimiento
        let isInList = false;
        let foundWarning = false;
        let foundTermsTitle = false;
        let foundMetadata = false;
        
        // Para el título principal
        for (let i = 0; i < paragraphs.length; i++) {
            let paragraph = paragraphs[i].trim();
            
            // Título "Términos y Condiciones"
            if (paragraph.includes('rminos y Condiciones de Uso') && !foundTermsTitle) {
                const title = extractCleanText(paragraph);
                html += `\n    <h1>${title}</h1>\n`;
                foundTermsTitle = true;
                continue;
            }
            
            // Metadatos (Aplicación, Versión, etc.)
            if (paragraph.includes('Aplicaci') && paragraph.includes('Versi') && !foundMetadata) {
                html += `\n    <p>\n`;
                
                // Procesar cada parte de los metadatos
                const metaLabels = ['Aplicación:', 'Versión:', 'Empresa:', 'Derechos Reservados:'];
                let metaText = extractCleanText(paragraph);
                
                for (let label of metaLabels) {
                    if (metaText.includes(label)) {
                        const startIdx = metaText.indexOf(label);
                        let endIdx;
                        
                        // Encontrar dónde termina esta etiqueta
                        if (label === 'Derechos Reservados:') {
                            endIdx = metaText.length;
                        } else {
                            const nextLabel = metaLabels[metaLabels.indexOf(label) + 1];
                            endIdx = metaText.indexOf(nextLabel);
                        }
                        
                        if (endIdx > startIdx) {
                            const value = metaText.substring(startIdx + label.length, endIdx).trim();
                            html += `        <span class="bold">${label}</span> ${value} `;
                        }
                    }
                }
                
                html += `\n    </p>\n`;
                foundMetadata = true;
                continue;
            }
            
            // Advertencia en negrita
            if (paragraph.includes('POR FAVOR, LEA ESTOS') && !foundWarning) {
                let warning = extractCleanText(paragraph);
                html += `\n    <p class="bold">\n        ${warning}\n    </p>\n`;
                foundWarning = true;
                continue;
            }
            
            // Procesar secciones numeradas
            const sectionMatch = paragraph.match(/(\d+)\.\s+([^:]+):/);
            if (sectionMatch) {
                // Si estábamos en una lista, cerrarla
                if (isInList) {
                    html += `    </ul>\n`;
                    isInList = false;
                }
                
                const sectionTitle = extractCleanText(paragraph);
                html += `\n    <h2>${sectionTitle}</h2>\n`;
                
                // Caso especial para "Restricciones de Uso"
                if (sectionTitle.includes("3. Restricciones de Uso")) {
                    continue;
                }
                
                continue;
            }
            
            // Mensaje "Usted se compromete a NO:"
            if (paragraph.includes('Usted se compromete a NO:')) {
                html += `    <p>Usted se compromete a NO:</p>\n`;
                html += `    <ul>\n`;
                isInList = true;
                continue;
            }
            
            // Elementos de lista (viñetas)
            if (paragraph.includes('\\pntext') || paragraph.includes('\\\'B7')) {
                if (!isInList) {
                    html += `    <ul>\n`;
                    isInList = true;
                }
                
                let listContent = extractCleanText(paragraph);
                const isBold = paragraph.includes('\\b\\ltrch');
                
                html += `        <li${isBold ? ' class="bold"' : ''}>${listContent}</li>\n`;
                continue;
            }
            
            // Cierra la lista si estamos saliendo de ella y entrando a otra sección
            if (isInList && paragraph.includes('4. Descargo')) {
                html += `    </ul>\n`;
                isInList = false;
            }
            
            // Párrafos normales y especiales
            if (paragraph.length > 10 && 
                !paragraph.includes('\\ltrpar\\itap0') && 
                !paragraph.includes('\\pntext') && 
                !paragraph.includes('\\fonttbl') &&
                !paragraph.includes('\\colortbl') &&
                !paragraph.includes('\\listlevel')) {
                    
                let text = extractCleanText(paragraph);
                
                // Omitir párrafos que ya hemos procesado
                if (text.includes('Términos y Condiciones de Uso') || 
                    text.includes('Aplicación:') || 
                    text.includes('POR FAVOR, LEA ESTOS') ||
                    text.includes('Usted se compromete a NO:') ||
                    text.length < 5) {
                    continue;
                }
                
                // Manejo especial de los párrafos de la sección "Descargo de Responsabilidad"
                if (paragraph.includes('Edudigital. LATAM no se hace responsable por ning')) {
                    html += `    <p class="bold">\n        ${text}\n    </p>\n`;
                    continue;
                }
                
                if (paragraph.includes('Edudigital. LATAM no se hace responsable por el uso indebido')) {
                    html += `    <p class="bold">\n        ${text}\n    </p>\n`;
                    continue;
                }
                
                // Sección de contacto con enlace
                if (paragraph.includes('Si tiene alguna pregunta')) {
                    text = text.replace(/(https?:\/\/[^\s\.]+\.[^\s]+)/g, '<a href="$1">$1</a>');
                    html += `    <p>\n        ${text}\n    </p>\n`;
                    continue;
                }
                
                // Pie de página (copyright)
                if (paragraph.includes('2025 Edudigital. LATAM. Todos los derechos reservados') && 
                    !paragraph.includes('Aplicación:')) {
                    html += `    <p class="bold">${text}</p>\n`;
                    continue;
                }
                
            // Párrafos normales
                if (text.trim()) {
                    html += `    <p>\n        ${text}\n    </p>\n`;
                }
            }
        }
        
        // Cerrar el documento
        html += `</body>\n</html>`;
        
        return html;
    } catch (error) {
        console.error('rtfToHtml: Error al convertir RTF a HTML:', error);
        
        // Método de respaldo en caso de error
        try {
            console.log('rtfToHtml: Intentando método de respaldo');
            
            // Extraer texto plano eliminando códigos RTF
            let plainText = rtf
                .replace(/{\\rtf1.*?}/gs, '')
                .replace(/\\~/g, ' ')
                .replace(/\.\s*\\~\s*/g, '. ')
                .replace(/\\[a-z0-9]+/g, ' ')
                .replace(/\{|\}/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Crear HTML básico
            let fallbackHtml = `
                <h1>Términos y Condiciones</h1>
                <p>El contenido original está en formato RTF. A continuación se muestra una versión simplificada:</p>
                <div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0; background-color: #f9f9f9;">
                    ${plainText.split(/\.\s+/).map(sentence => `<p>${sentence.trim()}.</p>`).join('')}
                </div>
                <p><em>Nota: Esta es una versión simplificada. Para ver el formato completo, edite manualmente el contenido.</em></p>
            `;
            
            console.log('rtfToHtml: HTML de respaldo generado');
            return fallbackHtml;
            
        } catch (backupError) {
            console.error('rtfToHtml: Error en el método de respaldo:', backupError);
            return `
                <h1>Términos y Condiciones</h1>
                <p>No se pudo procesar el contenido RTF. Por favor, contacte al administrador.</p>
                <p><em>Error: ${error.message}</em></p>
            `;
        }
    }
}

// Función para extraer texto limpio de un fragmento RTF
function extractCleanText(rtfText) {
    if (!rtfText) return '';
    
    // Eliminar códigos de control RTF
    let text = rtfText
        .replace(/\\pard/g, '')
        .replace(/\\plain/g, '')
        .replace(/\\f\d+/g, '')
        .replace(/\\fs\d+/g, '')
        .replace(/\\cf\d+/g, '')
        .replace(/\\highlight\d+/g, '')
        .replace(/\\ltrch/g, '')
        .replace(/\\rtlch/g, '')
        .replace(/\\lang\d+/g, '')
        .replace(/\\langfe\d+/g, '')
        .replace(/\\langnp\d+/g, '')
        .replace(/\\langfenp\d+/g, '')
        .replace(/\\fi-?\d+/g, '')
        .replace(/\\li\d+/g, '')
        .replace(/\\sa\d+/g, '')
        .replace(/\\sl\d+/g, '')
        .replace(/\\slmult\d+/g, '')
        .replace(/\\tx\d+/g, '')
        .replace(/\\itap\d+/g, '')
        .replace(/\\ltrpar/g, '')
        .replace(/\\rtlpar/g, '')
        .replace(/\\qj/g, '')
        .replace(/\\ql/g, '')
        .replace(/\\qr/g, '')
        .replace(/\\qc/g, '')
        .replace(/\\pntext/g, '')
        .replace(/\\pnlvlblt/g, '')
        .replace(/\\pnlvlbody/g, '')
        .replace(/\\pnlvlcont/g, '')
        .replace(/\\pnlvlbody/g, '')
        .replace(/\\pnstart\d+/g, '')
        .replace(/\\pnindent\d+/g, '')
        .replace(/\\pnhang/g, '')
        .replace(/\\pntxtb/g, '')
        .replace(/\\pntxta/g, '')
        .replace(/\\pncard/g, '')
        .replace(/\\line/g, '<br>')
        .replace(/\\tab/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    
    // Manejar formato de texto
    // Negrita
    text = text.replace(/\\b\s+([^\\]+?)(?:\\|\}|$)/g, '<strong>$1</strong>');
    // Cursiva
    text = text.replace(/\\i\s+([^\\]+?)(?:\\|\}|$)/g, '<em>$1</em>');
    // Subrayado
    text = text.replace(/\\ul\s+([^\\]+?)(?:\\|\}|$)/g, '<u>$1</u>');
    // Tachado
    text = text.replace(/\\strike\s+([^\\]+?)(?:\\|\}|$)/g, '<del>$1</del>');
    
    // Eliminar llaves y caracteres de control restantes
    text = text.replace(/\{|\}/g, '');
    
    // Decodificar caracteres especiales
    text = decodeRtfCharacters(text);
    
    return text.trim();
}

// Función para decodificar caracteres especiales en RTF
function decodeRtfCharacters(text) {
    if (!text) return '';
    
    // Decodificar caracteres especiales en formato hexadecimal
    text = text.replace(/\\'([0-9a-f]{2})/g, function(match, hex) {
        try {
            // Convertir el código hexadecimal a decimal
            const decimal = parseInt(hex, 16);
            // Convertir el decimal a carácter
            return String.fromCharCode(decimal);
        } catch (e) {
            console.error('Error al decodificar carácter RTF:', match, e);
            return match;
        }
    });
    
    // Decodificar caracteres Unicode
    text = text.replace(/\\u(\d+)\s*\?/g, function(match, unicode) {
        try {
            // Convertir el código Unicode a carácter
            return String.fromCharCode(parseInt(unicode, 10));
        } catch (e) {
            console.error('Error al decodificar carácter Unicode:', match, e);
            return match;
        }
    });
    
    // Reemplazar códigos específicos de RTF de forma individual
    text = text.replace(/\\bullet/g, "•");
    text = text.replace(/\\endash/g, "-");
    text = text.replace(/\\emdash/g, "--");
    text = text.replace(/\\lquote/g, "'");
    text = text.replace(/\\rquote/g, "'");
    text = text.replace(/\\ldblquote/g, "\"");
    text = text.replace(/\\rdblquote/g, "\"");
    text = text.replace(/\\~/g, " ");
    text = text.replace(/\\_/g, "-");
    text = text.replace(/\\:/g, " ");
    text = text.replace(/\\;/g, " ");
    text = text.replace(/\\ltrmark/g, "");
    text = text.replace(/\\rtlmark/g, "");
    
    return text;
} 