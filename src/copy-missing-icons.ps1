# Script para copiar los iconos faltantes
# Este script copia los iconos faltantes desde otras carpetas o crea iconos por defecto

# Iconos a verificar
$iconsToCheck = @(
    "default_app.png",
    "exe_icon.png",
    "bat_icon.png",
    "chrome.png",
    "Office.png",
    "winrar.png"
)

# Directorio de iconos
$imgDir = "img"

# Verificar si el directorio existe
if (-not (Test-Path $imgDir)) {
    Write-Host "Creando directorio de iconos: $imgDir" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $imgDir -Force | Out-Null
}

# Verificar cada icono
foreach ($icon in $iconsToCheck) {
    $iconPath = Join-Path $imgDir $icon
    
    if (-not (Test-Path $iconPath)) {
        Write-Host "Icono faltante: $icon" -ForegroundColor Yellow
        
        # Intentar copiar desde otra ubicación o crear uno por defecto
        switch ($icon) {
            "default_app.png" {
                # Crear un icono por defecto
                Write-Host "Creando icono por defecto: $icon" -ForegroundColor Cyan
                
                # Descargar un icono genérico de aplicación
                $url = "https://raw.githubusercontent.com/microsoft/fluentui-system-icons/master/assets/Generic/SVG/app_generic_regular.svg"
                $tempFile = [System.IO.Path]::GetTempFileName() + ".svg"
                
                try {
                    Invoke-WebRequest -Uri $url -OutFile $tempFile
                    
                    # Convertir SVG a PNG (requiere ImageMagick)
                    # magick convert $tempFile $iconPath
                    
                    # Como alternativa, copiar un icono existente
                    if (Test-Path "img/default_app3.png") {
                        Copy-Item "img/default_app3.png" $iconPath
                        Write-Host "Icono copiado desde default_app3.png" -ForegroundColor Green
                    } else {
                        Write-Host "No se pudo crear el icono por defecto. Por favor, cree manualmente el archivo $iconPath" -ForegroundColor Red
                    }
                } catch {
                    Write-Host "Error al descargar el icono: $_" -ForegroundColor Red
                } finally {
                    if (Test-Path $tempFile) {
                        Remove-Item $tempFile -Force
                    }
                }
            }
            "exe_icon.png" {
                # Buscar un icono de exe existente
                $exeIcons = Get-ChildItem -Path $imgDir -Filter "*exe*.png" | Select-Object -First 1
                
                if ($exeIcons) {
                    Copy-Item $exeIcons.FullName $iconPath
                    Write-Host "Icono copiado desde $($exeIcons.Name)" -ForegroundColor Green
                } else {
                    Write-Host "No se encontró un icono de exe para copiar. Por favor, cree manualmente el archivo $iconPath" -ForegroundColor Red
                }
            }
            "bat_icon.png" {
                # Buscar un icono de bat existente
                $batIcons = Get-ChildItem -Path $imgDir -Filter "*bat*.png" | Select-Object -First 1
                
                if ($batIcons) {
                    Copy-Item $batIcons.FullName $iconPath
                    Write-Host "Icono copiado desde $($batIcons.Name)" -ForegroundColor Green
                } else {
                    # Buscar un icono de cmd como alternativa
                    $cmdIcons = Get-ChildItem -Path $imgDir -Filter "*cmd*.png" | Select-Object -First 1
                    
                    if ($cmdIcons) {
                        Copy-Item $cmdIcons.FullName $iconPath
                        Write-Host "Icono copiado desde $($cmdIcons.Name)" -ForegroundColor Green
                    } else {
                        Write-Host "No se encontró un icono de bat para copiar. Por favor, cree manualmente el archivo $iconPath" -ForegroundColor Red
                    }
                }
            }
            "chrome.png" {
                # Buscar un icono de Chrome existente
                $chromeIcons = Get-ChildItem -Path $imgDir -Filter "*chrome*.png" | Select-Object -First 1
                
                if ($chromeIcons) {
                    Copy-Item $chromeIcons.FullName $iconPath
                    Write-Host "Icono copiado desde $($chromeIcons.Name)" -ForegroundColor Green
                } else {
                    # Buscar un icono de navegador como alternativa
                    $browserIcons = Get-ChildItem -Path $imgDir -Filter "*GoogleChrome*.png" | Select-Object -First 1
                    
                    if ($browserIcons) {
                        Copy-Item $browserIcons.FullName $iconPath
                        Write-Host "Icono copiado desde $($browserIcons.Name)" -ForegroundColor Green
                    } else {
                        Write-Host "No se encontró un icono de Chrome para copiar. Por favor, cree manualmente el archivo $iconPath" -ForegroundColor Red
                    }
                }
            }
            "Office.png" {
                # Buscar un icono de Office existente
                $officeIcons = Get-ChildItem -Path $imgDir -Filter "*Office*.png" | Select-Object -First 1
                
                if ($officeIcons) {
                    Copy-Item $officeIcons.FullName $iconPath
                    Write-Host "Icono copiado desde $($officeIcons.Name)" -ForegroundColor Green
                } else {
                    Write-Host "No se encontró un icono de Office para copiar. Por favor, cree manualmente el archivo $iconPath" -ForegroundColor Red
                }
            }
            "winrar.png" {
                # Buscar un icono de WinRAR existente
                $winrarIcons = Get-ChildItem -Path $imgDir -Filter "*winrar*.png" | Select-Object -First 1
                
                if ($winrarIcons) {
                    Copy-Item $winrarIcons.FullName $iconPath
                    Write-Host "Icono copiado desde $($winrarIcons.Name)" -ForegroundColor Green
                } else {
                    # Buscar un icono de compresión como alternativa
                    $compressIcons = Get-ChildItem -Path $imgDir -Filter "*rar*.png" | Select-Object -First 1
                    
                    if ($compressIcons) {
                        Copy-Item $compressIcons.FullName $iconPath
                        Write-Host "Icono copiado desde $($compressIcons.Name)" -ForegroundColor Green
                    } else {
                        Write-Host "No se encontró un icono de WinRAR para copiar. Por favor, cree manualmente el archivo $iconPath" -ForegroundColor Red
                    }
                }
            }
            default {
                Write-Host "No hay reglas específicas para el icono $icon" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Icono encontrado: $icon" -ForegroundColor Green
    }
}

Write-Host "Proceso completado. Verifique los iconos en la carpeta $imgDir" -ForegroundColor Cyan 