# Script para descargar iconos comunes de aplicaciones
# Este script descarga iconos de aplicaciones comunes y los guarda en la carpeta img

# Crear la carpeta img si no existe
$imgFolder = "img"
if (-not (Test-Path $imgFolder)) {
    New-Item -ItemType Directory -Path $imgFolder | Out-Null
    Write-Host "Carpeta $imgFolder creada"
}

# Lista de iconos a descargar
$icons = @(
    @{ Name = "office"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/office.png" },
    @{ Name = "chrome"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/chrome.png" },
    @{ Name = "firefox"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/firefox.png" },
    @{ Name = "edge"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/edge.png" },
    @{ Name = "adobe"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/adobe.png" },
    @{ Name = "winrar"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/winrar.png" },
    @{ Name = "7zip"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/7zip.png" },
    @{ Name = "visualstudio"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/visualstudio.png" },
    @{ Name = "vscode"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/vscode.png" },
    @{ Name = "notepadplus"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/notepadplus.png" },
    @{ Name = "ccleaner"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/ccleaner.png" },
    @{ Name = "vlc"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/vlc.png" },
    @{ Name = "teams"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/teams.png" },
    @{ Name = "security"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/security.png" },
    @{ Name = "eset"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/eset.png" },
    @{ Name = "defender"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/defender.png" },
    @{ Name = "teamviewer"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/teamviewer.png" },
    @{ Name = "anydesk"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/anydesk.png" },
    @{ Name = "network"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/network.png" },
    @{ Name = "driver"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/driver.png" },
    @{ Name = "update"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/update.png" },
    @{ Name = "install"; Url = "https://raw.githubusercontent.com/papnkukn/qml-icons/master/icons/install.png" }
)

# Descargar cada icono
foreach ($icon in $icons) {
    $outputFile = Join-Path $imgFolder "$($icon.Name).png"
    
    # Verificar si el archivo ya existe
    if (Test-Path $outputFile) {
        Write-Host "El icono $($icon.Name) ya existe, omitiendo..."
        continue
    }
    
    try {
        Write-Host "Descargando icono $($icon.Name)..."
        Invoke-WebRequest -Uri $icon.Url -OutFile $outputFile
        Write-Host "Icono $($icon.Name) descargado correctamente"
    }
    catch {
        Write-Host "Error al descargar el icono $($icon.Name): $_"
    }
}

Write-Host "Proceso completado. Se han descargado los iconos en la carpeta $imgFolder" 