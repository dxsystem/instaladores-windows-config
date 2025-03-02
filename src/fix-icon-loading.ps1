# Script para subir las correcciones de carga de iconos a GitHub
# Este script sube las correcciones para asegurar que los iconos se carguen correctamente

# Configuración
$repoRoot = (Get-Location).Path
$commitMessage = "Corregir carga de iconos para asegurar que se carguen después de las aplicaciones"

Write-Host "Iniciando proceso de subida de correcciones a GitHub..." -ForegroundColor Cyan
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

# Agregar los archivos modificados
Write-Host "Agregando archivos al área de preparación..." -ForegroundColor Cyan

# Agregar los archivos JavaScript modificados
git add src/js/apps-manager.js
git add src/js/icon-service.js

# Agregar este script
git add src/fix-icon-loading.ps1

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
    Write-Host "¡Las correcciones se han subido correctamente a GitHub!" -ForegroundColor Green
} else {
    Write-Host "Hubo un problema al subir los cambios a GitHub. Código de salida: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host "Proceso completado." -ForegroundColor Cyan 