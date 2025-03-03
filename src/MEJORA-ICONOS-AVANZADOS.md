# Mejora: Implementación Avanzada de Búsqueda de Iconos

## Problema Identificado

Se detectó que el servicio de iconos estaba asignando únicamente iconos por defecto basados en la extensión del archivo, sin realizar una búsqueda más sofisticada basada en el nombre de la aplicación. Esto resultaba en una experiencia visual pobre, ya que todas las aplicaciones del mismo tipo (por ejemplo, todos los archivos .exe) mostraban el mismo icono genérico.

## Solución Implementada

Se ha mejorado el servicio de iconos (`js/icon-service.js`) para implementar una búsqueda avanzada similar a la que existe en la versión C# (`IconService.cs`). Esta mejora permite asignar iconos específicos a las aplicaciones basándose en su nombre, realizando una búsqueda más inteligente.

### Características Principales de la Mejora

1. **Mapeo de Nombres a Iconos**:
   - Se ha implementado un diccionario extenso que mapea patrones de nombres de aplicaciones a iconos específicos.
   - Organizado por categorías (navegadores, compresión, multimedia, etc.) para facilitar su mantenimiento.

2. **Algoritmo de Búsqueda Mejorado**:
   - Búsqueda por coincidencia exacta en el mapeo.
   - Extracción del nombre base de la aplicación (eliminando números y caracteres especiales).
   - Búsqueda por nombre base para encontrar coincidencias parciales.

3. **Caché de Iconos**:
   - Implementación de un sistema de caché para evitar cargar el mismo icono múltiples veces.
   - Mejora significativa en el rendimiento, especialmente con muchas aplicaciones.

4. **Precarga de Iconos Comunes**:
   - Los iconos más utilizados se precargan al inicializar el servicio.
   - Reduce la latencia en la visualización de la interfaz.

5. **Manejo Robusto de Errores**:
   - Verificación exhaustiva de parámetros y condiciones.
   - Fallback a iconos por defecto en caso de error.
   - Registro detallado para facilitar la depuración.

## Detalles Técnicos

### Método `findMatchingIcon`

Este método es el corazón de la mejora. Busca un icono que coincida con el nombre de la aplicación:

```javascript
findMatchingIcon(appName) {
    if (!appName) return null;

    // Normalizar el nombre de la aplicación
    appName = appName.toLowerCase().trim();
    const normalizedAppName = appName.replace(/[\s_-]/g, '');

    console.log(`Buscando icono para: ${appName} (normalizado: ${normalizedAppName})`);

    // Primero buscar coincidencia exacta en el mapeo
    for (const [key, value] of Object.entries(this.iconMappings)) {
        if (appName.includes(key.toLowerCase())) {
            console.log(`Coincidencia encontrada en mapeo para ${appName}: ${value}`);
            return value;
        }
    }

    // Extraer el nombre base del programa (eliminar números y caracteres especiales del final)
    const baseAppName = this.extractBaseName(normalizedAppName);
    console.log(`Nombre base extraído para ${appName}: ${baseAppName}`);
    
    // Buscar coincidencia por nombre base en el mapeo
    for (const [key, value] of Object.entries(this.iconMappings)) {
        const baseKey = this.extractBaseName(key.toLowerCase());
        
        if (baseAppName.startsWith(baseKey) || baseKey.startsWith(baseAppName)) {
            console.log(`Coincidencia por nombre base encontrada para ${appName}: ${value}`);
            return value;
        }
    }

    console.log(`No se encontró coincidencia para ${appName}, usando icono por defecto`);
    return null;
}
```

### Método `extractBaseName`

Este método extrae el nombre base de una aplicación, eliminando números y caracteres especiales que suelen indicar versiones:

```javascript
extractBaseName(name) {
    if (!name) return name;

    // Convertir a minúsculas para el procesamiento
    name = name.toLowerCase();

    // Encontrar el primer número o carácter especial que indique el inicio de la versión
    let versionStart = -1;
    for (let i = 0; i < name.length; i++) {
        if (/[\d.v]/.test(name[i])) {
            // Verificar si es parte de un nombre (como "vector" o "office365")
            if (i > 0 && /[a-z]/.test(name[i - 1]) && 
                i < name.length - 1 && /[a-z]/.test(name[i + 1])) {
                continue;
            }
            versionStart = i;
            break;
        }
    }

    // Si encontramos un punto de inicio de versión, extraer el nombre base
    if (versionStart > 0) {
        return name.substring(0, versionStart);
    }

    return name;
}
```

## Resultados Esperados

Con esta mejora, se espera:

1. **Iconos Más Precisos**: Cada aplicación tendrá un icono que corresponda mejor a su tipo o marca.
2. **Mejor Experiencia Visual**: Los usuarios podrán identificar más fácilmente las aplicaciones por sus iconos.
3. **Mayor Consistencia**: Los iconos se asignarán de manera consistente, incluso si el nombre exacto de la aplicación varía.
4. **Mejor Rendimiento**: Gracias al sistema de caché y precarga, la visualización de iconos será más rápida.

## Verificación

Para verificar que los cambios funcionan correctamente, se puede acceder a la aplicación en:
https://dxsystem.github.io/instaladores-windows-config/src/login.html

Después de iniciar sesión, se debe comprobar que:
1. Las aplicaciones muestran iconos específicos según su nombre (no solo iconos genéricos por extensión).
2. Aplicaciones como Chrome, Office, WinRAR, etc. muestran sus iconos correspondientes.
3. No hay errores en la consola del navegador relacionados con la carga de iconos.

## Notas Adicionales

- El mapeo de nombres a iconos puede ampliarse fácilmente para incluir más aplicaciones.
- El algoritmo de búsqueda puede refinarse aún más si es necesario.
- Se recomienda mantener actualizada la lista de iconos comunes para precarga según las aplicaciones más utilizadas. 