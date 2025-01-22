# Configuración - Instaladores Windows Online

Interfaz web para la configuración de Instaladores Windows Online.

## Estructura del Proyecto

```
/
├── src/                    # Código fuente
│   └── index.html         # Aplicación principal
├── .github/               # Configuración de GitHub
│   └── workflows/         # GitHub Actions workflows
│       └── pages.yml      # Workflow para GitHub Pages
└── README.md             # Este archivo
```

## Desarrollo Local

1. Clona el repositorio
2. Abre `src/index.html` en tu navegador
3. Los cambios se guardan automáticamente en el almacenamiento local del navegador

## Importar/Exportar Configuración

- Usa el botón "Importar Config" para cargar un archivo JSON existente
- Usa el botón "Exportar Config" para descargar la configuración actual
- También puedes editar el JSON directamente en la pestaña "Editor JSON"

## Despliegue

La aplicación se despliega automáticamente a GitHub Pages cuando se hace push a la rama `main`. 