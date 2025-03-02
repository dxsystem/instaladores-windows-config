# Script para subir los iconos a GitHub
# Este script agrega, hace commit y sube los iconos a GitHub

# Verificar si estamos en un repositorio Git o en una subcarpeta de un repositorio
$gitRoot = $null
$currentPath = Get-Location
while ($currentPath -ne $null) {
    if (Test-Path (Join-Path $currentPath ".git") -PathType Container) {
        $gitRoot = $currentPath
        break
    }
    
    # Subir un nivel
    $parent = Split-Path -Path $currentPath -Parent
    if ($parent -eq $currentPath) {
        # Llegamos a la raíz del sistema de archivos
        break
    }
    $currentPath = $parent
}

if ($gitRoot -eq $null) {
    Write-Host "No se encontró un repositorio Git en la carpeta actual o en sus padres. Asegúrate de estar dentro de un repositorio Git." -ForegroundColor Red
    exit 1
}

# Cambiar al directorio raíz del repositorio
Write-Host "Cambiando al directorio raíz del repositorio: $gitRoot" -ForegroundColor Cyan
Set-Location $gitRoot

# Agregar todos los iconos al staging
Write-Host "Agregando iconos al staging..." -ForegroundColor Cyan
git add src/img/*.png
git add src/js/icon-service.js
git add src/js/apps-manager.js
git add src/apps.html
git add src/README-icons.md

# Verificar el estado
Write-Host "Estado actual del repositorio:" -ForegroundColor Cyan
git status

# Preguntar si se desea continuar
$continue = Read-Host "¿Deseas continuar con el commit y push? (S/N)"
if ($continue -ne "S" -and $continue -ne "s") {
    Write-Host "Operación cancelada por el usuario." -ForegroundColor Yellow
    exit 0
}

# Hacer commit
Write-Host "Realizando commit..." -ForegroundColor Cyan
git commit -m "Implementación del servicio de iconos para aplicaciones"

# Subir a GitHub
Write-Host "Subiendo cambios a GitHub..." -ForegroundColor Cyan
git push origin master

Write-Host "Proceso completado. Los iconos han sido subidos a GitHub." -ForegroundColor Green 