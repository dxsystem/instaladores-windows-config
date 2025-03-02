# Script para subir los cambios a GitHub
# Este script sube todos los archivos necesarios, incluyendo los iconos

# Configuración
$repoRoot = (Get-Location).Path
$commitMessage = "Implementación del servicio de iconos para aplicaciones"

Write-Host "Iniciando proceso de subida a GitHub..." -ForegroundColor Cyan
Write-Host "Directorio actual: $repoRoot" -ForegroundColor Cyan

# Verificar si estamos en un repositorio Git
if (-not (Test-Path -Path ".git")) {
    Write-Host "No se encontró un repositorio Git en el directorio actual." -ForegroundColor Yellow
    
    # Buscar el directorio raíz del repositorio
    $currentDir = $repoRoot
    $foundGit = $false
    
    while ($currentDir -ne $null -and -not $foundGit) {
        if (Test-Path -Path (Join-Path $currentDir ".git")) {
            $repoRoot = $currentDir
            $foundGit = $true
            Write-Host "Repositorio Git encontrado en: $repoRoot" -ForegroundColor Green
            Set-Location $repoRoot
        } else {
            $parentDir = Split-Path -Parent $currentDir
            if ($parentDir -eq $currentDir) {
                break
            }
            $currentDir = $parentDir
        }
    }
    
    if (-not $foundGit) {
        Write-Host "No se pudo encontrar un repositorio Git. Asegúrese de estar en un repositorio Git válido." -ForegroundColor Red
        exit 1
    }
}

# Verificar el estado actual del repositorio
Write-Host "Verificando el estado del repositorio..." -ForegroundColor Cyan
git status

# Agregar los archivos modificados y nuevos
Write-Host "Agregando archivos al área de preparación..." -ForegroundColor Cyan

# Agregar los archivos JavaScript
git add js/icon-service.js
git add js/apps-manager.js

# Agregar los archivos HTML
git add apps.html
git add test-icons.html
git add test-icon-loading.html
git add verify-icons.html

# Agregar los scripts de PowerShell
git add download-icons.ps1
git add copy-missing-icons.ps1
git add upload-icons.ps1
git add upload-to-github.ps1

# Agregar el archivo README
git add README-icons.md

# Agregar los iconos
git add img/*.png

# Verificar qué archivos se han agregado
Write-Host "Archivos agregados al área de preparación:" -ForegroundColor Green
git status

# Confirmar los cambios
Write-Host "Confirmando cambios..." -ForegroundColor Cyan
git commit -m "$commitMessage"

# Subir los cambios al repositorio remoto
Write-Host "Subiendo cambios a GitHub..." -ForegroundColor Cyan
git push

# Verificar el resultado
if ($LASTEXITCODE -eq 0) {
    Write-Host "¡Los cambios se han subido correctamente a GitHub!" -ForegroundColor Green
} else {
    Write-Host "Hubo un problema al subir los cambios a GitHub. Código de salida: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host "Proceso completado." -ForegroundColor Cyan 