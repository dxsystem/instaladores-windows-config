using System;
using System.IO;
using System.IO.Compression;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Windows.Media.Imaging;
using System.Windows.Media;
using InstaladoresWindowsCOnlineShare.Models;
using InstaladoresWindowsCOnlineShare.Utils;

namespace InstaladoresWindowsCOnlineShare.Services
{
    public class IconService
    {
        private readonly string resourcesPath;
        private readonly string zipFileName = "IconosTodos.zip";
        private readonly SharePointService sharePointService;
        private Dictionary<string, string> iconMappings;

        public IconService(SharePointService sharePointService)
        {
            this.sharePointService = sharePointService;
            resourcesPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources");
            
            // Asegurarse de que la carpeta Resources exista y tengamos permisos
            try
            {
                if (!Directory.Exists(resourcesPath))
                {
                    Directory.CreateDirectory(resourcesPath);
                }
                
                // Verificar permisos escribiendo un archivo temporal
                var testFile = Path.Combine(resourcesPath, "test.tmp");
                File.WriteAllText(testFile, "test");
                File.Delete(testFile);
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al verificar permisos en carpeta Resources: {ex.Message}");
                throw new Exception("No hay permisos suficientes en la carpeta Resources. Ejecute la aplicación como administrador.");
            }

            InitializeIconMappings();
        }

        private void InitializeIconMappings()
        {
            iconMappings = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                // Patrones generales de nombres
                { "office", "office" },
                { "microsoft", "office" },
                { "365", "office" },
                { "2021", "office" },
                { "2019", "office" },
                { "2016", "office" },

                // Navegadores
                { "google", "chrome" },
                { "chrome", "chrome" },
                { "firefox", "firefox" },
                { "mozilla", "firefox" },
                { "edge", "edge" },
                { "browser", "chrome" },

                // Adobe y PDF
                { "adobe", "adobe" },
                { "pdf", "adobe" },
                { "acrobat", "adobe" },
                { "reader", "adobe" },

                // Compresión
                { "compress", "winrar" },
                { "zip", "winrar" },
                { "winrar", "winrar" },
                { "7z", "7zip" },
                { "7-zip", "7zip" },
                { "7zip", "7zip" },

                // Desarrollo y editores
                { "visual", "visualstudio" },
                { "vs_", "visualstudio" },
                { "studio", "visualstudio" },
                { "vscode", "vscode" },
                { "code", "vscode" },
                { "notepad", "notepadplus" },
                { "editor", "notepadplus" },

                // Utilidades del sistema
                { "clean", "ccleaner" },
                { "ccleaner", "ccleaner" },
                { "driver", "driver" },
                { "update", "update" },
                { "install", "install" },

                // Multimedia y comunicación
                { "player", "vlc" },
                { "media", "vlc" },
                { "vlc", "vlc" },
                { "video", "vlc" },
                { "audio", "vlc" },
                { "teams", "teams" },
                { "meet", "teams" },
                { "chat", "teams" },

                // Antivirus y seguridad
                { "security", "security" },
                { "antivirus", "security" },
                { "protect", "security" },
                { "eset", "eset" },
                { "defender", "defender" },

                // Herramientas de red
                { "remote", "teamviewer" },
                { "desktop", "teamviewer" },
                { "teamviewer", "teamviewer" },
                { "anydesk", "anydesk" },
                { "network", "network" },
                { "wifi", "network" }
            };
        }

        public async Task DownloadAndExtractIconsAsync()
        {
            try
            {
                LogService.LogInfo("Iniciando proceso de iconos...");
                
                var zipPath = Path.Combine(resourcesPath, zipFileName);
                var needsDownload = true;

                // Verificar si el archivo ZIP existe y es válido
                if (File.Exists(zipPath))
                {
                    try
                    {
                        // Intentar abrir el ZIP para verificar su integridad
                        using (var archive = ZipFile.OpenRead(zipPath))
                        {
                            if (archive.Entries.Count > 0)
                            {
                                needsDownload = false;
                                LogService.LogInfo("Archivo ZIP de iconos existente y válido");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        LogService.LogError($"ZIP existente corrupto, se descargará nuevamente: {ex.Message}");
                        needsDownload = true;
                    }
                }

                // Lista de archivos a preservar
                var backupIcons = new[] { "exe_icon.png", "bat_icon.png", "default_app.png" };
                
                // Limpiar archivos PNG excepto los iconos de respaldo
                foreach (var file in Directory.GetFiles(resourcesPath, "*.png"))
                {
                    var fileName = Path.GetFileName(file);
                    if (!backupIcons.Contains(fileName, StringComparer.OrdinalIgnoreCase))
                    {
                        try
                        {
                            // Forzar la liberación de recursos
                            GC.Collect();
                            GC.WaitForPendingFinalizers();
                            
                            if (File.Exists(file))
                            {
                                File.Delete(file);
                            }
                        }
                        catch (Exception ex)
                        {
                            LogService.LogError($"No se pudo eliminar {file}: {ex.Message}");
                            // Continuar con el siguiente archivo
                            continue;
                        }
                    }
                }

                // Verificar que existan los iconos de respaldo, si no, descargarlos
                foreach (var iconName in backupIcons)
                {
                    var iconPath = Path.Combine(resourcesPath, iconName);
                    if (!File.Exists(iconPath))
                    {
                        try
                        {
                            await sharePointService.DownloadFileAsync(iconName, iconPath);
                            LogService.LogInfo($"Icono de respaldo descargado: {iconName}");
                        }
                        catch (Exception ex)
                        {
                            LogService.LogError($"Error al descargar icono de respaldo {iconName}: {ex.Message}");
                        }
                    }
                }

                // Descargar el ZIP solo si es necesario
                if (needsDownload)
                {
                    LogService.LogInfo("Descargando archivo de iconos...");
                    await sharePointService.DownloadFileAsync("IconosTodos.zip", zipPath);
                }

                if (File.Exists(zipPath))
                {
                    LogService.LogInfo("Extrayendo iconos...");
                    try
                    {
                        // Forzar la liberación de recursos antes de extraer
                        GC.Collect();
                        GC.WaitForPendingFinalizers();
                        
                        using (var archive = ZipFile.OpenRead(zipPath))
                        {
                            foreach (var entry in archive.Entries)
                            {
                                if (string.IsNullOrEmpty(entry.Name)) continue;
                                
                                var destinationPath = Path.Combine(resourcesPath, entry.Name);
                                try
                                {
                                    // Intentar eliminar el archivo si existe
                                    if (File.Exists(destinationPath))
                                    {
                                        File.Delete(destinationPath);
                                    }
                                    entry.ExtractToFile(destinationPath, true);
                                }
                                catch (Exception ex)
                                {
                                    LogService.LogError($"Error al extraer {entry.Name}: {ex.Message}");
                                    // Continuar con el siguiente archivo
                                    continue;
                                }
                            }
                        }

                        LogService.LogInfo("Iconos extraídos correctamente");
                    }
                    catch (Exception ex)
                    {
                        LogService.LogError($"Error al extraer iconos: {ex.Message}");
                        // Si hay error al extraer, eliminar el ZIP para forzar nueva descarga en próximo intento
                        try { File.Delete(zipPath); } catch { }
                        throw;
                    }
                }
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al procesar iconos: {ex.Message}");
                throw;
            }
        }

        public void AssignIconsToApps(IEnumerable<AppItem> apps)
        {
            foreach (var app in apps)
            {
                try
                {
                    // Primero intentar extraer del archivo si existe localmente
                    var fileExtension = Path.GetExtension(app.FilePath)?.ToLower();
                    var exePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "exe");
                    
                    // Obtener todos los archivos en la carpeta exe
                    var localFiles = Directory.Exists(exePath) 
                        ? Directory.GetFiles(exePath)
                        : Array.Empty<string>();

                    // Buscar el archivo con diferentes variaciones del nombre
                    var possibleNames = new[]
                    {
                        app.Name,
                        app.Name.Replace(" ", ""),
                        app.Name.Replace("_", ""),
                        app.Name.Replace("-", "")
                    };

                    var found = false;
                    foreach (var name in possibleNames)
                    {
                        // Buscar coincidencias ignorando mayúsculas/minúsculas
                        var matchingFiles = localFiles.Where(f => 
                            Path.GetFileNameWithoutExtension(f).Equals(name, StringComparison.OrdinalIgnoreCase) ||
                            Path.GetFileName(f).Equals($"{name}{fileExtension}", StringComparison.OrdinalIgnoreCase));

                        foreach (var filePath in matchingFiles)
                        {
                            try
                            {
                                using (var icon = System.Drawing.Icon.ExtractAssociatedIcon(filePath))
                                {
                                    var bitmap = icon.ToBitmap();
                                    using (var stream = new MemoryStream())
                                    {
                                        bitmap.Save(stream, System.Drawing.Imaging.ImageFormat.Png);
                                        stream.Position = 0;

                                        var bitmapImage = new BitmapImage();
                                        bitmapImage.BeginInit();
                                        bitmapImage.StreamSource = stream;
                                        bitmapImage.CacheOption = BitmapCacheOption.OnLoad;
                                        bitmapImage.EndInit();
                                        bitmapImage.Freeze();

                                        app.Icon = bitmapImage;
                                        LogService.LogInfo($"Icono cargado desde archivo local: {filePath} para {app.Name}");
                                        found = true;
                                        break;
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                LogService.LogError($"Error al extraer icono de {filePath}: {ex.Message}");
                            }
                        }
                        if (found) break;
                    }

                    if (found) continue;

                    // Si no se pudo extraer del archivo, buscar un icono personalizado en la carpeta Resources
                    var iconName = FindMatchingIcon(app.Name);
                    if (!string.IsNullOrEmpty(iconName))
                    {
                        try
                        {
                            var iconPath = Path.Combine(resourcesPath, $"{iconName}.png");
                            if (File.Exists(iconPath))
                            {
                                var bitmap = new BitmapImage();
                                bitmap.BeginInit();
                                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                                bitmap.UriSource = new Uri(iconPath);
                                bitmap.EndInit();
                                bitmap.Freeze();
                                app.Icon = bitmap;
                                LogService.LogInfo($"Icono cargado desde Resources: {iconPath}");
                                continue;
                            }
                        }
                        catch (Exception ex)
                        {
                            LogService.LogError($"Error al cargar icono personalizado para {app.Name}: {ex.Message}");
                        }
                    }

                    // Si no se pudo obtener un icono del archivo ni personalizado, usar icono por defecto
                    var defaultIconName = fileExtension switch
                    {
                        ".exe" => "exe_icon.png",
                        ".bat" => "bat_icon.png",
                        _ => "default_app.png"
                    };

                    var defaultIconPath = Path.Combine(resourcesPath, defaultIconName);
                    if (File.Exists(defaultIconPath))
                    {
                        try
                        {
                            var bitmap = new BitmapImage();
                            bitmap.BeginInit();
                            bitmap.CacheOption = BitmapCacheOption.OnLoad;
                            bitmap.UriSource = new Uri(defaultIconPath);
                            bitmap.EndInit();
                            bitmap.Freeze();
                            app.Icon = bitmap;
                            LogService.LogInfo($"Icono por defecto cargado: {defaultIconPath} para {app.Name}");
                        }
                        catch (Exception ex)
                        {
                            LogService.LogError($"Error al cargar icono por defecto {defaultIconName} para {app.Name}: {ex.Message}");
                        }
                    }
                    else
                    {
                        LogService.LogError($"No se encontró el icono por defecto: {defaultIconName} para {app.Name}");
                    }
                }
                catch (Exception ex)
                {
                    LogService.LogError($"Error al asignar icono para {app.Name}: {ex.Message}");
                }
            }
        }

        private string FindMatchingIcon(string appName)
        {
            if (string.IsNullOrEmpty(appName)) return null;

            // Normalizar el nombre de la aplicación
            appName = appName.ToLower().Trim();
            var normalizedAppName = appName.Replace(" ", "").Replace("_", "").Replace("-", "");

            // Primero buscar coincidencia exacta en el mapeo
            foreach (var mapping in iconMappings)
            {
                if (appName.StartsWith(mapping.Key, StringComparison.OrdinalIgnoreCase))
                {
                    var iconPath = Path.Combine(resourcesPath, $"{mapping.Value}.png");
                    if (File.Exists(iconPath))
                    {
                        LogService.LogInfo($"Coincidencia encontrada en mapeo para {appName}: {mapping.Value}");
                        return mapping.Value;
                    }
                }
            }

            // Obtener los archivos PNG disponibles
            var pngFiles = Directory.GetFiles(resourcesPath, "*.png")
                .Select(f => new
                {
                    FullPath = f,
                    Name = Path.GetFileNameWithoutExtension(f)?.ToLower()
                })
                .Where(f => !string.IsNullOrEmpty(f.Name) && 
                           !f.Name.Equals("exe_icon", StringComparison.OrdinalIgnoreCase) &&
                           !f.Name.Equals("bat_icon", StringComparison.OrdinalIgnoreCase) &&
                           !f.Name.Equals("default_app", StringComparison.OrdinalIgnoreCase))
                .ToList();

            // Buscar coincidencia exacta primero
            foreach (var file in pngFiles)
            {
                var normalizedFileName = file.Name.Replace(" ", "").Replace("_", "").Replace("-", "");
                if (normalizedFileName.Equals(normalizedAppName, StringComparison.OrdinalIgnoreCase))
                {
                    LogService.LogInfo($"Coincidencia exacta encontrada para {appName}: {file.Name}");
                    return file.Name;
                }
            }

            // Extraer el nombre base del programa (eliminar números y caracteres especiales del final)
            var baseAppName = ExtractBaseName(normalizedAppName);
            LogService.LogInfo($"Nombre base extraído para {appName}: {baseAppName}");

            // Buscar coincidencia por nombre base
            var bestMatch = pngFiles
                .Select(f => new 
                { 
                    File = f, 
                    BaseName = ExtractBaseName(f.Name.Replace(" ", "").Replace("_", "").Replace("-", ""))
                })
                .Where(f => !string.IsNullOrEmpty(f.BaseName))
                .OrderByDescending(f => f.BaseName.Length)
                .FirstOrDefault(f => 
                    baseAppName.StartsWith(f.BaseName, StringComparison.OrdinalIgnoreCase) ||
                    f.BaseName.StartsWith(baseAppName, StringComparison.OrdinalIgnoreCase));

            if (bestMatch != null)
            {
                LogService.LogInfo($"Coincidencia por nombre base encontrada para {appName}: {bestMatch.File.Name}");
                return bestMatch.File.Name;
            }

            LogService.LogInfo($"No se encontró coincidencia para {appName}, usando icono por defecto");
            return null;
        }

        private string ExtractBaseName(string name)
        {
            if (string.IsNullOrEmpty(name)) return name;

            // Convertir a minúsculas para el procesamiento
            name = name.ToLower();

            // Encontrar el primer número o carácter especial que indique el inicio de la versión
            int versionStart = -1;
            for (int i = 0; i < name.Length; i++)
            {
                if (char.IsDigit(name[i]) || name[i] == 'v' || name[i] == '.')
                {
                    // Verificar si es parte de un nombre (como "vector" o "office365")
                    if (i > 0 && char.IsLetter(name[i - 1]) && 
                        i < name.Length - 1 && char.IsLetter(name[i + 1]))
                    {
                        continue;
                    }
                    versionStart = i;
                    break;
                }
            }

            // Si encontramos un punto de inicio de versión, extraer el nombre base
            if (versionStart > 0)
            {
                return name.Substring(0, versionStart);
            }

            return name;
        }
    }
} 