# Servicio de Iconos para Aplicaciones

Este módulo implementa un servicio para asignar iconos a las aplicaciones en el sistema de Instaladores Windows C.

## Características

- Asignación automática de iconos basada en el nombre de la aplicación
- Soporte para iconos personalizados por aplicación
- Iconos por defecto según el tipo de archivo (.exe, .bat)
- Caché de iconos para mejorar el rendimiento
- Actualización dinámica de iconos en la interfaz de usuario

## Implementación

El servicio de iconos está implementado en JavaScript y se basa en la lógica de la clase `IconService.cs` del backend. La implementación incluye:

1. **Mapeo de nombres**: Un diccionario que mapea patrones de nombres de aplicaciones a iconos específicos.
2. **Extracción de nombres base**: Algoritmo para extraer el nombre base de una aplicación sin versión.
3. **Carga de iconos**: Sistema para cargar iconos desde archivos y manejar errores.
4. **Actualización de UI**: Mecanismo para actualizar los iconos en la interfaz de usuario.

## Archivos

- `js/icon-service.js`: Implementación del servicio de iconos
- `img/*.png`: Iconos de aplicaciones
- `img/exe_icon.png`: Icono por defecto para archivos .exe
- `img/bat_icon.png`: Icono por defecto para archivos .bat
- `img/default_app.png`: Icono por defecto para otras aplicaciones

## Uso

El servicio de iconos se inicializa automáticamente al cargar la página de aplicaciones:

```javascript
// Inicializar servicio de iconos
iconService = new IconService(spGraph);

// Asignar iconos a las aplicaciones
iconService.assignIconsToApps(apps);
```

## Personalización

Para agregar nuevos mapeos de iconos, edita el método `initializeIconMappings()` en `js/icon-service.js`:

```javascript
initializeIconMappings() {
    return {
        // Agregar nuevos mapeos aquí
        'nombre-app': 'nombre-icono',
    };
}
```

## Mantenimiento

Para agregar nuevos iconos:

1. Coloca el archivo PNG en la carpeta `img/`
2. Actualiza el mapeo en `initializeIconMappings()` si es necesario
3. Ejecuta `upload-icons.ps1` para subir los cambios a GitHub

## Créditos

Implementado basándose en la clase `IconService.cs` del backend de Instaladores Windows C. 