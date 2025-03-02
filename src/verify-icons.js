/**
 * Script para verificar si los iconos existen en la carpeta img
 * Este script debe ejecutarse en el navegador
 */

// Lista de iconos a verificar
const iconsToVerify = [
    'default_app.png',
    'exe_icon.png',
    'bat_icon.png',
    'chrome.png',
    'Office.png',
    'CCleaner6.15.10623x64.png',
    'MozillaFirefoxSilent.png',
    'WondersharePDFelementProfessional10.3.12.2738x64.png',
    'winrar.png'
];

// Función para verificar si un icono existe
function verifyIcon(iconName) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = `img/${iconName}`;
        
        img.onload = () => {
            console.log(`✅ Icono encontrado: ${url}`);
            resolve(true);
        };
        
        img.onerror = () => {
            console.error(`❌ Icono no encontrado: ${url}`);
            resolve(false);
        };
        
        // Agregar timestamp para evitar caché del navegador
        img.src = url + '?t=' + new Date().getTime();
    });
}

// Verificar todos los iconos
async function verifyAllIcons() {
    console.log('Verificando iconos...');
    
    let foundCount = 0;
    let missingCount = 0;
    
    for (const iconName of iconsToVerify) {
        const exists = await verifyIcon(iconName);
        if (exists) {
            foundCount++;
        } else {
            missingCount++;
        }
    }
    
    console.log(`Resumen: ${foundCount} iconos encontrados, ${missingCount} iconos faltantes`);
}

// Ejecutar la verificación
verifyAllIcons(); 