using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Azure.Identity;
using Microsoft.Graph;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.Graph.Models;
using Microsoft.Graph.Sites.Item.Lists;
using Microsoft.Graph.Sites.Item.Lists.Item.Drive;
using InstaladoresWindowsCOnlineShare.Models;
using System.Drawing;
using System.Windows.Interop;
using System.Windows;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text;
using System.Web;

namespace InstaladoresWindowsCOnlineShare.Services
{
    public class SharePointService
    {
        // Nuevas credenciales para la aplicación
        private readonly string clientId;
        private readonly string clientSecret;
        private readonly string tenantId;
        private readonly string adminEmail;
        private readonly string siteUrl = "ldcigroup.sharepoint.com";
        private readonly string libraryName = "InstaladoresWindowsCOnline";
        private readonly string folderName = "exe";
        private GraphServiceClient graphClient;
        private string driveId;
        private string siteId;
        private string folderId;
        private readonly string localCachePath;
        private readonly string exePath;
        private readonly string resourcesPath;

        public string DriveId => driveId;
        public string SiteId => siteId;
        public bool IsInitialized { get; private set; }

        private const string REQUIRED_APPS_CONFIG = "required_apps_config.json";
        private const string FREE_APPS_CONFIG = "free_apps_config.json";
        private const string PRO_APPS_CONFIG = "pro_apps_config.json";
        private const string ELITE_APPS_CONFIG = "elite_apps_config.json";
        private const string APP_DESCRIPTIONS_CONFIG = "app_descriptions.json";
        private SharePointConfig currentConfig;

        public string AdminEmail => adminEmail;

        public SharePointService(string clientId, string clientSecret, string tenantId, string adminEmail)
        {
            this.clientId = clientId;
            this.clientSecret = clientSecret;
            this.tenantId = tenantId;
            this.adminEmail = adminEmail;

            var baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
            localCachePath = Path.Combine(baseDirectory, "Cache");
            exePath = Path.Combine(baseDirectory, "exe");
            resourcesPath = Path.Combine(baseDirectory, "Resources");
            
            Directory.CreateDirectory(localCachePath);
            Directory.CreateDirectory(exePath);
            Directory.CreateDirectory(resourcesPath);
        }

        public async Task InitializeAsync()
        {
            try 
            {
                var scopes = new[] { "https://graph.microsoft.com/.default" };
                
                var clientSecretCredential = new ClientSecretCredential(
                    tenantId, clientId, clientSecret);
                graphClient = new GraphServiceClient(clientSecretCredential, scopes);
                
                // Obtener el sitio usando el hostname y el relative path
                var siteQuery = $"{siteUrl}:/sites/InstaladoresWindowsC";
                var site = await graphClient.Sites[siteQuery].GetAsync();
                if (site == null)
                    throw new Exception("No se pudo encontrar el sitio de SharePoint");

                siteId = site.Id;
                LogService.LogInfo($"Sitio encontrado: {site.Name}");

                // Obtener la biblioteca de documentos
                var lists = await graphClient.Sites[site.Id].Lists.GetAsync();
                var documentLibrary = lists?.Value?.FirstOrDefault(l => l.Name == libraryName);
                if (documentLibrary == null)
                    throw new Exception($"No se pudo encontrar la biblioteca '{libraryName}'");

                LogService.LogInfo($"Biblioteca encontrada: {documentLibrary.Name}");

                // Obtener el drive asociado a la biblioteca
                var drive = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Drive.GetAsync();
                if (drive == null)
                    throw new Exception("No se pudo obtener el drive asociado a la biblioteca");

                driveId = drive.Id;
                LogService.LogInfo($"Drive ID obtenido: {driveId}");

                // Obtener la carpeta raíz y luego sus elementos
                var root = await graphClient.Drives[driveId].Items["root"].GetAsync();
                if (root == null)
                    throw new Exception("No se pudo obtener la raíz del drive");

                var rootContents = await graphClient.Drives[driveId].Items[root.Id].Children.GetAsync();
                if (rootContents?.Value == null)
                    throw new Exception("No se pudo obtener el contenido del drive");

                // Buscar la carpeta exe
                var exeFolder = rootContents.Value.FirstOrDefault(item => 
                    item.Name?.Equals(folderName, StringComparison.OrdinalIgnoreCase) == true && 
                    item.Folder != null);

                if (exeFolder == null)
                    throw new Exception($"No se encontró la carpeta: {folderName}");

                folderId = exeFolder.Id;
                LogService.LogInfo($"Carpeta exe encontrada con ID: {folderId}");
                LogService.LogInfo("Conexión a SharePoint establecida correctamente");

                // Descargar carpeta Resources si no existe localmente
                await DownloadResourcesAsync();

                IsInitialized = true;
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al inicializar Graph: {ex.Message}");
                IsInitialized = false;
                throw;
            }
        }

        private async Task DownloadResourcesAsync()
        {
            try
            {
                var iconFiles = new[] { "exe_icon.png", "bat_icon.png", "default_app.png" };
                
                foreach (var iconFile in iconFiles)
                {
                    var localPath = Path.Combine(resourcesPath, iconFile);
                    
                    // Si el archivo no existe localmente, descargarlo
                    if (!File.Exists(localPath))
                    {
                        var iconPath = $"Resources/{iconFile}";
                        var driveItem = await graphClient.Drives[driveId].Root
                            .ItemWithPath(iconPath)
                            .GetAsync();

                        if (driveItem != null)
                        {
                            using (var stream = await graphClient.Drives[driveId].Items[driveItem.Id].Content.GetAsync())
                            using (var fileStream = File.Create(localPath))
                            {
                                await stream.CopyToAsync(fileStream);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al descargar recursos: {ex.Message}");
            }
        }

        public async Task<List<AppItem>> GetAvailableAppsAsync(SubscriptionType subscriptionType)
        {
            try
            {
                LogService.LogInfo($"Obteniendo aplicaciones para suscripción {subscriptionType}...");
                var config = await GetSubscriptionConfigAsync(subscriptionType);

                // Si la configuración es nula o no tiene aplicaciones, intentar crearla
                if (config == null || config.Applications == null || !config.Applications.Any())
                {
                    LogService.LogInfo($"Configuración vacía para {subscriptionType}, creando una nueva...");
                    config = await CreateInitialSubscriptionConfigAsync(subscriptionType);
                }

                if (config?.Applications == null)
                {
                    LogService.LogError($"No se pudo obtener la configuración para {subscriptionType}");
                    return new List<AppItem>();
                }

                LogService.LogInfo($"Configuración cargada. Total de aplicaciones: {config.Applications.Count}");
                var apps = config.Applications.Select(app => new AppItem
                {
                    Name = app.Name,
                    FileName = app.FileName,
                    SharePointId = app.SharePointId,
                    WebUrl = app.WebUrl,
                    Version = app.Version,
                    LastModified = app.LastModified,
                    Size = app.Size,
                    Category = app.Category,
                    Description = app.Description ?? $"Aplicación {app.Name} - Versión {app.Version}",
                    InstallationOrder = app.InstallationOrder,
                    Status = "Disponible",
                    Progress = 0,
                    IsSelected = false,
                    IsDownloaded = false
                }).OrderBy(x => x.InstallationOrder).ToList();

                // Asignar íconos
                foreach (var app in apps)
                {
                    app.Icon = await ExtractFileIconAsync(app.FileName);
                }

                LogService.LogInfo($"Se procesaron {apps.Count} aplicaciones con sus íconos");
                return apps;
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al obtener aplicaciones disponibles: {ex.Message}");
                throw;
            }
        }

        private async Task<SharePointConfig> LoadConfigurationAsync()
        {
            try
            {
                var siteQuery = $"{siteUrl}:/sites/InstaladoresWindowsC";
                var site = await graphClient.Sites[siteQuery].GetAsync();
                if (site == null) return null;

                var lists = await graphClient.Sites[site.Id].Lists.GetAsync();
                var documentLibrary = lists?.Value?.FirstOrDefault(l => l.Name == libraryName);
                if (documentLibrary == null) return null;

                // Obtener el drive
                var drive = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Drive.GetAsync();
                if (drive == null) return null;

                // Buscar el archivo de configuración usando la ruta correcta (como lo hacemos con los otros archivos)
                var items = await graphClient.Drives[drive.Id].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == ELITE_APPS_CONFIG);
                
                if (configFile == null)
                {
                    LogService.LogInfo("No se encontró el archivo de configuración. Use el botón de sincronización para crearlo.");
                    return null;
                }

                // Obtener el contenido del archivo
                using var stream = await graphClient.Drives[drive.Id].Items[configFile.Id].Content.GetAsync();
                if (stream == null) return null;

                using var reader = new StreamReader(stream);
                var jsonContent = await reader.ReadToEndAsync();

                if (string.IsNullOrEmpty(jsonContent))
                {
                    LogService.LogInfo("El archivo de configuración está vacío");
                    return null;
                }

                var config = JsonSerializer.Deserialize<SharePointConfig>(jsonContent);
                if (config == null || config.Applications == null || !config.Applications.Any())
                {
                    LogService.LogInfo("La configuración está vacía o no tiene aplicaciones");
                    return null;
                }

                return config;
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al cargar configuración: {ex.Message}");
                return null;
            }
        }

        private string GenerateSmartDescription(string appName, string version, long size, DateTime? lastModified)
        {
            string baseDescription = "";
            
            // Detectar tipo de aplicación y generar descripción apropiada
            if (appName.Contains("Office", StringComparison.OrdinalIgnoreCase))
            {
                baseDescription = "Herramienta para activar Microsoft Office de forma permanente. " +
                                "Permite la activación completa de la suite ofimática incluyendo Word, Excel, PowerPoint y demás aplicaciones.";
            }
            else if (appName.Contains("Duplicate", StringComparison.OrdinalIgnoreCase) && appName.Contains("File", StringComparison.OrdinalIgnoreCase))
            {
                baseDescription = "Utilidad para encontrar y eliminar archivos duplicados en tu sistema. " +
                                "Ayuda a liberar espacio en disco y mantener tu PC organizado.";
            }
            else if (appName.Contains("Partition", StringComparison.OrdinalIgnoreCase))
            {
                baseDescription = "Gestor avanzado de particiones de disco. " +
                                "Permite crear, eliminar, redimensionar y administrar particiones de manera segura.";
            }
            else if (appName.Contains("Converter", StringComparison.OrdinalIgnoreCase) && appName.Contains("Video", StringComparison.OrdinalIgnoreCase))
            {
                baseDescription = "Conversor de video profesional. " +
                                "Soporta múltiples formatos y permite ajustar la calidad de conversión.";
            }
            else if (appName.Contains("Cryptor", StringComparison.OrdinalIgnoreCase))
            {
                baseDescription = "Software de encriptación de archivos. " +
                                "Protege tus documentos sensibles con encriptación avanzada.";
            }
            else if (appName.Contains("FileOrganizer", StringComparison.OrdinalIgnoreCase))
            {
                baseDescription = "Organizador automático de archivos. " +
                                "Clasifica y ordena tus archivos por tipo, fecha o categorías personalizadas.";
            }
            else if (appName.Contains("7z", StringComparison.OrdinalIgnoreCase))
            {
                baseDescription = "Compresor de archivos 7-Zip. " +
                                "Comprime y descomprime archivos en múltiples formatos con alta tasa de compresión.";
            }
            else
            {
                baseDescription = $"Aplicación {appName}. " +
                                "Herramienta profesional para Windows.";
            }

            // Agregar información técnica
            return $"{baseDescription}\n\n" +
                   $"Versión: {version}\n" +
                   $"Tamaño: {(size / 1024.0 / 1024.0):F2} MB\n" +
                   $"Última actualización: {(lastModified?.ToString("dd/MM/yyyy") ?? "Desconocida")}";
        }

        private async Task<SharePointConfig> CreateInitialConfigurationAsync()
        {
            // Escanear la carpeta exe y crear la configuración inicial
            var config = new SharePointConfig
            {
                LastUpdate = DateTime.UtcNow,
                Applications = new List<ApplicationConfig>(),
                CourseConfig = await GetCourseConfigAsync()
            };

            var filesPage = await graphClient.Drives[driveId].Items[folderId].Children.GetAsync();
            if (filesPage?.Value != null)
            {
                foreach (var item in filesPage.Value.Where(i => 
                    i.Name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) || 
                    i.Name.EndsWith(".bat", StringComparison.OrdinalIgnoreCase)))
                {
                    var version = item.LastModifiedDateTime?.ToString("yyyy.MM.dd") ?? "1.0.0";
                    var name = Path.GetFileNameWithoutExtension(item.Name);
                    
                    config.Applications.Add(new ApplicationConfig
                    {
                        Name = name,
                        FileName = item.Name,
                        SharePointId = item.Id,
                        WebUrl = item.WebUrl,
                        Version = version,
                        LastModified = item.LastModifiedDateTime?.DateTime ?? DateTime.UtcNow,
                        Size = item.Size ?? 0,
                        Category = "General",
                        Description = GenerateSmartDescription(
                            name,
                            version,
                            item.Size ?? 0,
                            item.LastModifiedDateTime?.DateTime
                        ),
                        InstallationOrder = config.Applications.Count + 1
                    });
                }
            }

            // Guardar la configuración en SharePoint
            await SaveConfigurationAsync(config);
            return config;
        }

        public async Task SyncConfigurationAsync()
        {
            try
            {
                var driveItems = new List<DriveItem>();
                var items = await graphClient.Drives[driveId].Items[folderId].Children.GetAsync();
                
                // Obtener todos los elementos usando paginación
                var pageIterator = PageIterator<DriveItem, DriveItemCollectionResponse>
                    .CreatePageIterator(
                        graphClient,
                        items,
                        (item) =>
                        {
                            driveItems.Add(item);
                            return true;
                        },
                        (req) => req
                    );

                await pageIterator.IterateAsync();

                // Crear nueva configuración base
                var baseConfig = new SharePointConfig
                {
                    LastUpdate = DateTime.UtcNow,
                    Applications = new List<ApplicationConfig>(),
                    CourseConfig = await GetCourseConfigAsync()
                };

                // Agregar todas las aplicaciones encontradas
                foreach (var item in driveItems)
                {
                    if (item.Name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) || 
                        item.Name.EndsWith(".bat", StringComparison.OrdinalIgnoreCase) ||
                        item.Name.EndsWith(".sfx", StringComparison.OrdinalIgnoreCase))
                    {
                        baseConfig.Applications.Add(new ApplicationConfig
                        {
                            Name = Path.GetFileNameWithoutExtension(item.Name),
                            FileName = item.Name,
                            SharePointId = item.Id,
                            WebUrl = item.WebUrl,
                            Version = item.LastModifiedDateTime?.ToString("yyyy.MM.dd") ?? "1.0.0",
                            LastModified = item.LastModifiedDateTime?.DateTime ?? DateTime.UtcNow,
                            Size = item.Size ?? 0,
                            Category = "General",
                            InstallationOrder = baseConfig.Applications.Count + 1
                        });
                    }
                }

                // Crear configuraciones específicas para cada tipo de suscripción
                var totalApps = baseConfig.Applications.Count;

                // Configuración Gratuita (hasta 30 apps)
                var freeConfig = new SharePointConfig
                {
                    LastUpdate = baseConfig.LastUpdate,
                    CourseConfig = baseConfig.CourseConfig,
                    Applications = baseConfig.Applications.Take(Math.Min(30, totalApps)).ToList()
                };
                await UploadContentAsync(FREE_APPS_CONFIG, JsonSerializer.Serialize(freeConfig, new JsonSerializerOptions { WriteIndented = true }));

                // Configuración PRO (67% de las apps)
                var proAppsCount = (int)Math.Ceiling(totalApps * 0.67);
                var proConfig = new SharePointConfig
                {
                    LastUpdate = baseConfig.LastUpdate,
                    CourseConfig = baseConfig.CourseConfig,
                    Applications = baseConfig.Applications.Take(Math.Min(proAppsCount, totalApps)).ToList()
                };
                await UploadContentAsync(PRO_APPS_CONFIG, JsonSerializer.Serialize(proConfig, new JsonSerializerOptions { WriteIndented = true }));

                // Configuración ELITE (todas las apps)
                var eliteConfig = new SharePointConfig
                {
                    LastUpdate = baseConfig.LastUpdate,
                    CourseConfig = baseConfig.CourseConfig,
                    Applications = baseConfig.Applications
                };
                await UploadContentAsync(ELITE_APPS_CONFIG, JsonSerializer.Serialize(eliteConfig, new JsonSerializerOptions { WriteIndented = true }));

                // Actualizar la configuración actual
                currentConfig = eliteConfig;
                LogService.LogInfo($"Configuración sincronizada correctamente. Total apps: {totalApps}, Free: {freeConfig.Applications.Count}, Pro: {proConfig.Applications.Count}, Elite: {eliteConfig.Applications.Count}");

                // Notificar que la configuración se ha actualizado
                ConfigurationUpdated?.Invoke(this, EventArgs.Empty);
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al sincronizar configuración: {ex.Message}");
                throw;
            }
        }

        private async Task UploadContentAsync(string fileName, string content)
        {
            var byteArray = System.Text.Encoding.UTF8.GetBytes(content);
            var stream = new MemoryStream(byteArray);

            var items = await graphClient.Drives[driveId].Items["root"].Children.GetAsync();
            var existingFile = items?.Value?.FirstOrDefault(i => i.Name == fileName);

            if (existingFile != null)
            {
                await graphClient.Drives[driveId].Items[existingFile.Id].Content.PutAsync(stream);
            }
            else
            {
                await graphClient.Drives[driveId].Root
                    .ItemWithPath(fileName)
                    .Content
                    .PutAsync(stream);
            }
            LogService.LogInfo($"Archivo {fileName} actualizado correctamente");
        }

        private async Task SaveConfigurationAsync(SharePointConfig config)
        {
            try
            {
                var siteQuery = $"{siteUrl}:/sites/InstaladoresWindowsC";
                var site = await graphClient.Sites[siteQuery].GetAsync();
                if (site == null) throw new Exception("No se pudo encontrar el sitio");

                var lists = await graphClient.Sites[site.Id].Lists.GetAsync();
                var documentLibrary = lists?.Value?.FirstOrDefault(l => l.Name == libraryName);
                if (documentLibrary == null) throw new Exception("No se pudo encontrar la biblioteca");

                var drive = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Drive.GetAsync();
                if (drive == null) throw new Exception("No se pudo obtener el drive");

                // Convertir la configuración a JSON
                var jsonContent = JsonSerializer.Serialize(config);
                var byteArray = System.Text.Encoding.UTF8.GetBytes(jsonContent);
                var stream = new MemoryStream(byteArray);

                // Buscar si ya existe el archivo
                var items = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Items.GetAsync();
                var existingFile = items?.Value?.FirstOrDefault(i => i.Name == ELITE_APPS_CONFIG);

                if (existingFile != null)
                {
                    await graphClient.Drives[drive.Id].Items[existingFile.Id].Content.PutAsync(stream);
                }
                else
                {
                    await graphClient.Drives[drive.Id].Root
                        .ItemWithPath(ELITE_APPS_CONFIG)
                        .Content
                        .PutAsync(stream);
                }

                LogService.LogInfo("Configuración guardada correctamente");
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al guardar la configuración: {ex.Message}");
                throw;
            }
        }

        private async Task<ImageSource> ExtractFileIconAsync(string fileName)
        {
            try
            {
                // Primero intentar obtener el ícono del archivo local si existe
                var localPath = Path.Combine(
                    AppDomain.CurrentDomain.BaseDirectory, 
                    "exe",
                    fileName);

                if (File.Exists(localPath))
                {
                    try
                    {
                        using (var icon = System.Drawing.Icon.ExtractAssociatedIcon(localPath))
                        {
                            if (icon != null)
                            {
                                var bitmap = icon.ToBitmap();
                                var hBitmap = bitmap.GetHbitmap();
                                
                                ImageSource wpfBitmap = Imaging.CreateBitmapSourceFromHBitmap(
                                    hBitmap,
                                    IntPtr.Zero,
                                    System.Windows.Int32Rect.Empty,
                                    BitmapSizeOptions.FromEmptyOptions());

                                DeleteObject(hBitmap); // Liberar recursos
                                return wpfBitmap;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        LogService.LogInfo($"No se pudo extraer ícono del archivo: {ex.Message}");
                    }
                }

                // Si no se pudo obtener el ícono del archivo, usar los íconos de respaldo
                string iconFileName;
                if (fileName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                    iconFileName = "exe_icon.png";
                else if (fileName.EndsWith(".bat", StringComparison.OrdinalIgnoreCase))
                    iconFileName = "bat_icon.png";
                else
                    iconFileName = "default_app.png";

                // Usar los íconos locales
                var iconPath = Path.Combine(resourcesPath, iconFileName);
                if (File.Exists(iconPath))
                {
                    var bitmap = new BitmapImage();
                    bitmap.BeginInit();
                    bitmap.CacheOption = BitmapCacheOption.OnLoad;
                    bitmap.UriSource = new Uri(iconPath);
                    bitmap.EndInit();
                    bitmap.Freeze();
                    return bitmap;
                }

                return null;
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al cargar ícono: {ex.Message}");
                return null;
            }
        }

        [System.Runtime.InteropServices.DllImport("gdi32.dll")]
        private static extern bool DeleteObject(IntPtr hObject);

        public async Task<CourseConfig> GetCourseConfigAsync()
        {
            try
            {
                var siteQuery = $"{siteUrl}:/sites/InstaladoresWindowsC";
                var site = await graphClient.Sites[siteQuery].GetAsync();
                if (site == null) return GetDefaultConfig();

                var lists = await graphClient.Sites[site.Id].Lists.GetAsync();
                var documentLibrary = lists?.Value?.FirstOrDefault(l => l.Name == libraryName);
                if (documentLibrary == null) return GetDefaultConfig();

                // Obtener el drive
                var drive = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Drive.GetAsync();
                if (drive == null) return GetDefaultConfig();

                // Buscar el archivo de configuración usando la ruta correcta
                var items = await graphClient.Drives[drive.Id].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == "app_settings.json");

                if (configFile == null)
                {
                    return GetDefaultConfig();
                }

                // Obtener el contenido del archivo
                using var stream = await graphClient.Drives[drive.Id].Items[configFile.Id].Content.GetAsync();
                if (stream == null) return GetDefaultConfig();

                using var reader = new StreamReader(stream);
                var jsonContent = await reader.ReadToEndAsync();

                try
                {
                    var appSettings = JsonSerializer.Deserialize<AppSettings>(jsonContent);
                    return appSettings?.Course ?? GetDefaultConfig();
                }
                catch (Exception ex)
                {
                    LogService.LogError($"Error al deserializar el archivo de configuración del curso: {ex.Message}");
                    return GetDefaultConfig();
                }
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al cargar la configuración del curso: {ex.Message}");
                return GetDefaultConfig();
            }
        }

        private CourseConfig GetDefaultConfig()
        {
            return new CourseConfig
            {
                VideoUrl = "https://www.youtube.com/embed/piP8XlGf3gc",
                Title = "¡Nuevo Curso Disponible!",
                Description = "Aprende a configurar y optimizar Windows como un profesional",
                Links = new PaymentLinks
                {
                    CardPayment = "https://link-to-payment.com",
                    WhatsApp = "https://wa.me/your_number"
                }
            };
        }

        public async Task<ImportantVideosConfig> GetImportantVideosConfigAsync()
        {
            try
            {
                var siteQuery = $"{siteUrl}:/sites/InstaladoresWindowsC";
                var site = await graphClient.Sites[siteQuery].GetAsync();
                if (site == null) return GetDefaultVideosConfig();

                var lists = await graphClient.Sites[site.Id].Lists.GetAsync();
                var documentLibrary = lists?.Value?.FirstOrDefault(l => l.Name == libraryName);
                if (documentLibrary == null) return GetDefaultVideosConfig();

                // Obtener el drive
                var drive = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Drive.GetAsync();
                if (drive == null) return GetDefaultVideosConfig();

                // Buscar el archivo de configuración usando la ruta correcta
                var items = await graphClient.Drives[drive.Id].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == "app_settings.json");

                if (configFile == null)
                {
                    return GetDefaultVideosConfig();
                }

                // Obtener el contenido del archivo
                using var stream = await graphClient.Drives[drive.Id].Items[configFile.Id].Content.GetAsync();
                if (stream == null) return GetDefaultVideosConfig();

                using var reader = new StreamReader(stream);
                var jsonContent = await reader.ReadToEndAsync();

                try
                {
                    var appSettings = JsonSerializer.Deserialize<AppSettings>(jsonContent);
                    return appSettings?.Videos ?? GetDefaultVideosConfig();
                }
                catch (Exception ex)
                {
                    LogService.LogError($"Error al deserializar el archivo de configuración de videos: {ex.Message}");
                    return GetDefaultVideosConfig();
                }
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al cargar la configuración de videos: {ex.Message}");
                return GetDefaultVideosConfig();
            }
        }

        private ImportantVideosConfig GetDefaultVideosConfig()
        {
            return new ImportantVideosConfig
            {
                DefenderVideoTitle = "Configurar Windows Defender",
                DefenderVideoUrl = "https://www.youtube.com/embed/piP8XlGf3gc",
                EsetVideoTitle = "Configurar Eset Security",
                EsetVideoUrl = "https://www.youtube.com/embed/OWpecpM3_mw"
            };
        }

        public async Task SaveImportantVideosConfigAsync(ImportantVideosConfig config)
        {
            try
            {
                // Convertir las URLs antes de guardar
                config.DefenderVideoUrl = ConvertToEmbedUrl(config.DefenderVideoUrl);
                config.EsetVideoUrl = ConvertToEmbedUrl(config.EsetVideoUrl);

                var siteQuery = $"{siteUrl}:/sites/InstaladoresWindowsC";
                var site = await graphClient.Sites[siteQuery].GetAsync();
                if (site == null) throw new Exception("No se pudo encontrar el sitio");

                var lists = await graphClient.Sites[site.Id].Lists.GetAsync();
                var documentLibrary = lists?.Value?.FirstOrDefault(l => l.Name == libraryName);
                if (documentLibrary == null) throw new Exception("No se pudo encontrar la biblioteca");

                var drive = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Drive.GetAsync();
                if (drive == null) throw new Exception("No se pudo obtener el drive");

                // Obtener la configuración actual
                var items = await graphClient.Drives[drive.Id].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == "app_settings.json");
                AppSettings appSettings;

                if (configFile != null)
                {
                    using var stream = await graphClient.Drives[drive.Id].Items[configFile.Id].Content.GetAsync();
                    using var reader = new StreamReader(stream);
                    var jsonContent = await reader.ReadToEndAsync();
                    appSettings = JsonSerializer.Deserialize<AppSettings>(jsonContent) ?? new AppSettings();
                }
                else
                {
                    appSettings = new AppSettings();
                }

                // Actualizar la configuración de videos
                appSettings.Videos = config;

                // Guardar la configuración actualizada
                var updatedJsonContent = JsonSerializer.Serialize(appSettings);
                var byteArray = System.Text.Encoding.UTF8.GetBytes(updatedJsonContent);
                var memoryStream = new MemoryStream(byteArray);

                if (configFile != null)
                {
                    await graphClient.Drives[drive.Id].Items[configFile.Id].Content.PutAsync(memoryStream);
                }
                else
                {
                    await graphClient.Drives[drive.Id].Root
                        .ItemWithPath("app_settings.json")
                        .Content
                        .PutAsync(memoryStream);
                }

                LogService.LogInfo("Configuración de videos guardada correctamente");
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al guardar la configuración de videos: {ex.Message}");
                throw;
            }
        }

        public async Task SaveCourseConfigAsync(CourseConfig config)
        {
            try
            {
                // Convertir la URL antes de guardar
                config.VideoUrl = ConvertToEmbedUrl(config.VideoUrl);

                var siteQuery = $"{siteUrl}:/sites/InstaladoresWindowsC";
                var site = await graphClient.Sites[siteQuery].GetAsync();
                if (site == null) throw new Exception("No se pudo encontrar el sitio");

                var lists = await graphClient.Sites[site.Id].Lists.GetAsync();
                var documentLibrary = lists?.Value?.FirstOrDefault(l => l.Name == libraryName);
                if (documentLibrary == null) throw new Exception("No se pudo encontrar la biblioteca");

                var drive = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Drive.GetAsync();
                if (drive == null) throw new Exception("No se pudo obtener el drive");

                // Obtener la configuración actual
                var items = await graphClient.Drives[drive.Id].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == "app_settings.json");
                AppSettings appSettings;

                if (configFile != null)
                {
                    using var stream = await graphClient.Drives[drive.Id].Items[configFile.Id].Content.GetAsync();
                    using var reader = new StreamReader(stream);
                    var jsonContent = await reader.ReadToEndAsync();
                    appSettings = JsonSerializer.Deserialize<AppSettings>(jsonContent) ?? new AppSettings();
                }
                else
                {
                    appSettings = new AppSettings();
                }

                // Actualizar la configuración del curso
                appSettings.Course = config;

                // Guardar la configuración actualizada
                var updatedJsonContent = JsonSerializer.Serialize(appSettings);
                var byteArray = System.Text.Encoding.UTF8.GetBytes(updatedJsonContent);
                var memoryStream = new MemoryStream(byteArray);

                if (configFile != null)
                {
                    await graphClient.Drives[drive.Id].Items[configFile.Id].Content.PutAsync(memoryStream);
                }
                else
                {
                    await graphClient.Drives[drive.Id].Root
                        .ItemWithPath("app_settings.json")
                        .Content
                        .PutAsync(memoryStream);
                }

                LogService.LogInfo("Configuración del curso guardada correctamente");
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al guardar la configuración del curso: {ex.Message}");
                throw;
            }
        }

        public string ConvertToEmbedUrl(string youtubeUrl)
        {
            if (string.IsNullOrEmpty(youtubeUrl)) return youtubeUrl;

            try
            {
                // Si ya es una URL de embed, devolverla tal cual
                if (youtubeUrl.Contains("/embed/")) return youtubeUrl;

                // Extraer el ID del video y el tiempo (si existe) de diferentes formatos de URL de YouTube
                string videoId = "";
                string timeParameter = "";
                
                var uri = new Uri(youtubeUrl);
                var query = HttpUtility.ParseQueryString(uri.Query);

                // Extraer el parámetro de tiempo si existe
                if (query["t"] != null)
                {
                    var time = query["t"].ToLower();
                    // Convertir el tiempo a segundos si está en formato XXhXXmXXs
                    int seconds = 0;
                    if (time.Contains("h"))
                    {
                        var parts = time.Split('h');
                        seconds += int.Parse(parts[0]) * 3600;
                        time = parts[1];
                    }
                    if (time.Contains("m"))
                    {
                        var parts = time.Split('m');
                        seconds += int.Parse(parts[0]) * 60;
                        time = parts[1];
                    }
                    if (time.Contains("s"))
                    {
                        seconds += int.Parse(time.Replace("s", ""));
                    }
                    else if (int.TryParse(time, out int directSeconds))
                    {
                        seconds = directSeconds;
                    }
                    
                    timeParameter = $"?start={seconds}";
                }

                if (youtubeUrl.Contains("youtu.be/"))
                {
                    var pathParts = uri.AbsolutePath.TrimStart('/').Split('?')[0];
                    videoId = pathParts;
                }
                else if (youtubeUrl.Contains("youtube.com/live/"))
                {
                    videoId = youtubeUrl.Split(new[] { "youtube.com/live/" }, StringSplitOptions.None)[1];
                }
                else if (youtubeUrl.Contains("youtube.com/watch"))
                {
                    videoId = query["v"];
                }
                else if (youtubeUrl.Contains("youtube.com/v/"))
                {
                    videoId = youtubeUrl.Split(new[] { "youtube.com/v/" }, StringSplitOptions.None)[1];
                }
                else if (youtubeUrl.Contains("youtube.com/shorts/"))
                {
                    videoId = youtubeUrl.Split(new[] { "youtube.com/shorts/" }, StringSplitOptions.None)[1];
                }

                // Si no se encontró un ID válido, devolver la URL original
                if (string.IsNullOrEmpty(videoId)) return youtubeUrl;

                // Si hay parámetros adicionales en la URL, eliminarlos
                if (videoId.Contains("&"))
                {
                    videoId = videoId.Split('&')[0];
                }
                if (videoId.Contains("?"))
                {
                    videoId = videoId.Split('?')[0];
                }

                // Construir la URL de embed con el parámetro de tiempo si existe
                return $"https://www.youtube.com/embed/{videoId}{timeParameter}";
            }
            catch
            {
                // Si hay algún error, devolver la URL original
                return youtubeUrl;
            }
        }

        public async Task<RequiredAppsConfig> GetRequiredAppsConfigAsync()
        {
            try
            {
                var items = await graphClient.Drives[driveId].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == REQUIRED_APPS_CONFIG);
                
                if (configFile != null)
                {
                    using var stream = await graphClient.Drives[driveId].Items[configFile.Id].Content.GetAsync();
                    using var reader = new StreamReader(stream);
                    var jsonContent = await reader.ReadToEndAsync();
                    return JsonSerializer.Deserialize<RequiredAppsConfig>(jsonContent) ?? new RequiredAppsConfig();
                }

                return new RequiredAppsConfig();
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al cargar configuración de apps obligatorias: {ex.Message}");
                return new RequiredAppsConfig();
            }
        }

        public async Task SaveRequiredAppsConfigAsync(RequiredAppsConfig config)
        {
            try
            {
                var jsonContent = JsonSerializer.Serialize(config);
                var byteArray = System.Text.Encoding.UTF8.GetBytes(jsonContent);
                var stream = new MemoryStream(byteArray);

                var items = await graphClient.Drives[driveId].Items["root"].Children.GetAsync();
                var existingFile = items?.Value?.FirstOrDefault(i => i.Name == REQUIRED_APPS_CONFIG);

                if (existingFile != null)
                {
                    await graphClient.Drives[driveId].Items[existingFile.Id].Content.PutAsync(stream);
                }
                else
                {
                    await graphClient.Drives[driveId].Root
                        .ItemWithPath(REQUIRED_APPS_CONFIG)
                        .Content
                        .PutAsync(stream);
                }

                LogService.LogInfo("Configuración de apps obligatorias guardada correctamente");
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al guardar configuración de apps obligatorias: {ex.Message}");
                throw;
            }
        }

        // Evento para notificar cambios en la configuración
        public event EventHandler ConfigurationUpdated;

        public async Task DownloadFileAsync(string fileName, string destinationPath)
        {
            try
            {
                var items = await graphClient.Drives[driveId].Items["root"].Children.GetAsync();
                var file = items?.Value?.FirstOrDefault(i => i.Name == fileName);
                
                if (file == null)
                    throw new Exception($"No se encontró el archivo {fileName}");

                using (var stream = await graphClient.Drives[driveId].Items[file.Id].Content.GetAsync())
                using (var fileStream = File.Create(destinationPath))
                {
                    await stream.CopyToAsync(fileStream);
                }

                LogService.LogInfo($"Archivo {fileName} descargado correctamente");
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al descargar {fileName}: {ex.Message}");
                throw;
            }
        }

        public async Task<string> GetFileContentAsync(string fileName)
        {
            try
            {
                LogService.LogInfo($"Buscando archivo {fileName}...");
                var items = await graphClient.Drives[driveId].Items["root"].Children.GetAsync();
                var file = items?.Value?.FirstOrDefault(i => i.Name == fileName);

                if (file == null)
                {
                    LogService.LogInfo($"Archivo {fileName} no encontrado en la raíz");
                    return "[]";
                }

                LogService.LogInfo($"Archivo {fileName} encontrado, obteniendo contenido...");
                using (var stream = await graphClient.Drives[driveId].Items[file.Id].Content.GetAsync())
                using (var reader = new StreamReader(stream))
                {
                    var content = await reader.ReadToEndAsync();
                    LogService.LogInfo($"Contenido de {fileName} leído. Longitud: {content?.Length ?? 0} caracteres");
                    return content;
                }
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al leer archivo {fileName}: {ex.Message}");
                throw;
            }
        }

        public async Task SaveFileContentAsync(string fileName, string content)
        {
            try
            {
                LogService.LogInfo($"Iniciando guardado de {fileName}. Contenido a guardar: {content}");
                
                // Verificar que el contenido no esté vacío
                if (string.IsNullOrEmpty(content))
                {
                    LogService.LogError($"Error: Intentando guardar contenido vacío en {fileName}");
                    throw new Exception("El contenido no puede estar vacío");
                }

                // Verificar que el contenido sea un JSON válido si es un archivo .json
                if (fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        JsonDocument.Parse(content);
                    }
                    catch (JsonException ex)
                    {
                        LogService.LogError($"Error: El contenido no es un JSON válido: {ex.Message}");
                        throw new Exception("El contenido no es un JSON válido");
                    }
                }

                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(content)))
                {
                    // Buscar si el archivo ya existe
                    var items = await graphClient.Drives[driveId].Items["root"].Children.GetAsync();
                    var existingFile = items?.Value?.FirstOrDefault(i => i.Name == fileName);

                    if (existingFile != null)
                    {
                        LogService.LogInfo($"Actualizando archivo existente {fileName}");
                        await graphClient.Drives[driveId].Items[existingFile.Id].Content.PutAsync(stream);
                    }
                    else
                    {
                        LogService.LogInfo($"Creando nuevo archivo {fileName}");
                        await graphClient.Drives[driveId].Root
                            .ItemWithPath(fileName)
                            .Content
                            .PutAsync(stream);
                    }

                    LogService.LogInfo($"Archivo {fileName} guardado correctamente");
                }
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al guardar archivo {fileName}: {ex.Message}");
                throw;
            }
        }

        public async Task<GraphServiceClient> GetGraphClientAsync()
        {
            if (graphClient == null)
            {
                await InitializeAsync();
            }
            return graphClient;
        }

        public async Task<string> DownloadFileContentAsync(string fileName)
        {
            try
            {
                var tempPath = Path.Combine(Path.GetTempPath(), fileName);
                await DownloadFileAsync(fileName, tempPath);
                var content = await File.ReadAllTextAsync(tempPath);
                File.Delete(tempPath);
                return content;
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al descargar contenido de {fileName}: {ex.Message}");
                throw;
            }
        }

        public async Task UploadFileContentAsync(string fileName, string content)
        {
            try
            {
                var tempPath = Path.Combine(Path.GetTempPath(), fileName);
                await File.WriteAllTextAsync(tempPath, content);
                await UploadFileAsync(fileName, tempPath);
                File.Delete(tempPath);
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al subir contenido a {fileName}: {ex.Message}");
                throw;
            }
        }

        public async Task<string> UploadFileAsync(string fileName, string filePath)
        {
            try
            {
                var graphClient = await GetGraphClientAsync();
                using (var stream = new FileStream(filePath, FileMode.Open))
                {
                    // Si es el archivo de instalación, guardarlo en la raíz
                    var path = fileName == "InstaladoresWindowsCOnlineShare_Setup.exe" 
                        ? fileName 
                        : $"{folderName}/{fileName}";

                    var driveItem = await graphClient.Drives[driveId]
                        .Root
                        .ItemWithPath(path)
                        .Content
                        .PutAsync(stream);

                    return driveItem.Id;
                }
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al subir archivo {fileName}: {ex.Message}");
                throw;
            }
        }

        public GraphServiceClient GetGraphClient()
        {
            if (graphClient == null)
            {
                var scopes = new[] { "https://graph.microsoft.com/.default" };
                var clientSecretCredential = new ClientSecretCredential(
                    tenantId, clientId, clientSecret);
                graphClient = new GraphServiceClient(clientSecretCredential, scopes);
            }
            return graphClient;
        }

        public async Task<SharePointConfig> GetSubscriptionConfigAsync(SubscriptionType type)
        {
            try
            {
                string configFileName = type switch
                {
                    SubscriptionType.Gratuita => FREE_APPS_CONFIG,
                    SubscriptionType.PRO => PRO_APPS_CONFIG,
                    SubscriptionType.ELITE => ELITE_APPS_CONFIG,
                    _ => throw new ArgumentException("Tipo de suscripción no válido")
                };

                LogService.LogInfo($"Obteniendo configuración para suscripción {type} desde archivo {configFileName}...");

                var siteQuery = $"{siteUrl}:/sites/InstaladoresWindowsC";
                var site = await graphClient.Sites[siteQuery].GetAsync();
                if (site == null)
                {
                    LogService.LogInfo("No se encontró el sitio. Creando configuración inicial...");
                    return await CreateInitialSubscriptionConfigAsync(type);
                }

                var lists = await graphClient.Sites[site.Id].Lists.GetAsync();
                var documentLibrary = lists?.Value?.FirstOrDefault(l => l.Name == libraryName);
                if (documentLibrary == null)
                {
                    LogService.LogInfo("No se encontró la biblioteca. Creando configuración inicial...");
                    return await CreateInitialSubscriptionConfigAsync(type);
                }

                var drive = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Drive.GetAsync();
                if (drive == null)
                {
                    LogService.LogInfo("No se encontró el drive. Creando configuración inicial...");
                    return await CreateInitialSubscriptionConfigAsync(type);
                }

                var items = await graphClient.Drives[drive.Id].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == configFileName);
                
                if (configFile == null)
                {
                    LogService.LogInfo($"No se encontró el archivo de configuración {configFileName}. Creando configuración inicial...");
                    return await CreateInitialSubscriptionConfigAsync(type);
                }

                using var stream = await graphClient.Drives[drive.Id].Items[configFile.Id].Content.GetAsync();
                if (stream == null)
                {
                    LogService.LogInfo("No se pudo obtener el contenido del archivo. Creando configuración inicial...");
                    return await CreateInitialSubscriptionConfigAsync(type);
                }

                using var reader = new StreamReader(stream);
                var jsonContent = await reader.ReadToEndAsync();

                if (string.IsNullOrWhiteSpace(jsonContent))
                {
                    LogService.LogInfo("El archivo de configuración está vacío. Creando configuración inicial...");
                    return await CreateInitialSubscriptionConfigAsync(type);
                }

                try
                {
                    var config = JsonSerializer.Deserialize<SharePointConfig>(jsonContent);
                    if (config == null || config.Applications == null || !config.Applications.Any())
                    {
                        LogService.LogInfo($"La configuración deserializada está vacía o no tiene aplicaciones. Creando configuración inicial...");
                        return await CreateInitialSubscriptionConfigAsync(type);
                    }

                    LogService.LogInfo($"Configuración de {type} cargada correctamente. {config.Applications.Count} aplicaciones encontradas.");
                    return config;
                }
                catch (Exception ex)
                {
                    LogService.LogError($"Error al deserializar el archivo de configuración de {type}: {ex.Message}");
                    LogService.LogInfo("Intentando recrear la configuración...");
                    return await CreateInitialSubscriptionConfigAsync(type);
                }
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al cargar la configuración de {type}: {ex.Message}");
                LogService.LogInfo("Intentando recrear la configuración debido al error...");
                return await CreateInitialSubscriptionConfigAsync(type);
            }
        }

        private async Task<SharePointConfig> CreateInitialSubscriptionConfigAsync(SubscriptionType type)
        {
            try
            {
                LogService.LogInfo($"Creando configuración inicial para suscripción {type}...");
                
                // Obtener todas las aplicaciones directamente de la carpeta exe
                var driveItems = new List<DriveItem>();
                var items = await graphClient.Drives[driveId].Items[folderId].Children.GetAsync();
                
                // Obtener todos los elementos usando paginación
                var pageIterator = PageIterator<DriveItem, DriveItemCollectionResponse>
                    .CreatePageIterator(
                        graphClient,
                        items,
                        (item) =>
                        {
                            if (item.Name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) || 
                                item.Name.EndsWith(".bat", StringComparison.OrdinalIgnoreCase) ||
                                item.Name.EndsWith(".sfx", StringComparison.OrdinalIgnoreCase))
                            {
                                driveItems.Add(item);
                            }
                            return true;
                        },
                        (req) => req
                    );

                await pageIterator.IterateAsync();
                LogService.LogInfo($"Se encontraron {driveItems.Count} aplicaciones en la carpeta exe");

                if (!driveItems.Any())
                {
                    LogService.LogError("No se encontraron aplicaciones en la carpeta exe");
                    throw new Exception("No hay aplicaciones disponibles para crear la configuración");
                }

                // Convertir los DriveItems a ApplicationConfig
                var allApps = driveItems.Select((item, index) => new ApplicationConfig
                {
                    Name = Path.GetFileNameWithoutExtension(item.Name),
                    FileName = item.Name,
                    SharePointId = item.Id,
                    WebUrl = item.WebUrl,
                    Version = item.LastModifiedDateTime?.ToString("yyyy.MM.dd") ?? "1.0.0",
                    LastModified = item.LastModifiedDateTime?.DateTime ?? DateTime.UtcNow,
                    Size = item.Size ?? 0,
                    Category = "General",
                    Description = GenerateSmartDescription(
                        Path.GetFileNameWithoutExtension(item.Name),
                        item.LastModifiedDateTime?.ToString("yyyy.MM.dd") ?? "1.0.0",
                        item.Size ?? 0,
                        item.LastModifiedDateTime?.DateTime
                    ),
                    InstallationOrder = index + 1
                }).OrderBy(x => x.InstallationOrder).ToList();

                LogService.LogInfo($"Se procesaron {allApps.Count} aplicaciones");

                var config = new SharePointConfig
                {
                    LastUpdate = DateTime.UtcNow,
                    Applications = new List<ApplicationConfig>()
                };

                // Determinar cuántas aplicaciones incluir según el tipo de suscripción
                var totalApps = allApps.Count;
                var appsToInclude = type switch
                {
                    SubscriptionType.Gratuita => Math.Min(30, totalApps),
                    SubscriptionType.PRO => Math.Min((int)Math.Ceiling(totalApps * 0.67), totalApps),
                    SubscriptionType.ELITE => totalApps,
                    _ => throw new ArgumentException($"Tipo de suscripción no válido: {type}")
                };

                LogService.LogInfo($"Total de aplicaciones disponibles: {totalApps}, a incluir: {appsToInclude}");

                // Seleccionar las aplicaciones según el tipo de suscripción
                config.Applications = type == SubscriptionType.ELITE
                    ? allApps
                    : allApps.Take(appsToInclude).ToList();

                LogService.LogInfo($"Seleccionadas {config.Applications.Count} aplicaciones para la suscripción {type}");

                // Verificar el contenido antes de guardar
                if (config.Applications.Count == 0)
                {
                    LogService.LogError("La configuración generada no contiene aplicaciones");
                    throw new Exception("No se pudieron seleccionar aplicaciones para la configuración");
                }

                var firstApp = config.Applications[0];
                LogService.LogInfo($"Primera aplicación: {firstApp.Name}, ID: {firstApp.SharePointId}");
                LogService.LogInfo($"Última aplicación: {config.Applications[^1].Name}, ID: {config.Applications[^1].SharePointId}");

                // Guardar la configuración
                string configFileName = type switch
                {
                    SubscriptionType.Gratuita => FREE_APPS_CONFIG,
                    SubscriptionType.PRO => PRO_APPS_CONFIG,
                    SubscriptionType.ELITE => ELITE_APPS_CONFIG,
                    _ => throw new ArgumentException($"Tipo de suscripción no válido: {type}")
                };

                var jsonContent = JsonSerializer.Serialize(config, new JsonSerializerOptions 
                { 
                    WriteIndented = true 
                });

                // Verificar que el JSON no esté vacío
                if (string.IsNullOrWhiteSpace(jsonContent))
                {
                    LogService.LogError("El JSON generado está vacío");
                    throw new Exception("Error al serializar la configuración");
                }

                LogService.LogInfo($"JSON generado (primeros 500 caracteres): {jsonContent.Substring(0, Math.Min(500, jsonContent.Length))}");

                // Guardar el archivo
                await UploadContentAsync(configFileName, jsonContent);
                LogService.LogInfo($"Archivo de configuración {configFileName} guardado exitosamente");
                
                return config;
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al crear configuración inicial para {type}: {ex.Message}");
                throw;
            }
        }

        public async Task<AppSettings> GetAppSettingsAsync()
        {
            try
            {
                var siteQuery = $"{siteUrl}:/sites/InstaladoresWindowsC";
                var site = await graphClient.Sites[siteQuery].GetAsync();
                if (site == null) return GetDefaultAppSettings();

                var lists = await graphClient.Sites[site.Id].Lists.GetAsync();
                var documentLibrary = lists?.Value?.FirstOrDefault(l => l.Name == libraryName);
                if (documentLibrary == null) return GetDefaultAppSettings();

                // Obtener el drive
                var drive = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Drive.GetAsync();
                if (drive == null) return GetDefaultAppSettings();

                // Buscar el archivo de configuración usando la ruta correcta
                var items = await graphClient.Drives[drive.Id].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == "app_settings.json");

                if (configFile == null)
                {
                    return GetDefaultAppSettings();
                }

                // Obtener el contenido del archivo
                using var stream = await graphClient.Drives[drive.Id].Items[configFile.Id].Content.GetAsync();
                if (stream == null) return GetDefaultAppSettings();

                using var reader = new StreamReader(stream);
                var jsonContent = await reader.ReadToEndAsync();

                try
                {
                    var appSettings = JsonSerializer.Deserialize<AppSettings>(jsonContent);
                    return appSettings ?? GetDefaultAppSettings();
                }
                catch (Exception ex)
                {
                    LogService.LogError($"Error al deserializar el archivo de configuración: {ex.Message}");
                    return GetDefaultAppSettings();
                }
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al cargar la configuración: {ex.Message}");
                return GetDefaultAppSettings();
            }
        }

        private AppSettings GetDefaultAppSettings()
        {
            return new AppSettings
            {
                Course = GetDefaultConfig(),
                Videos = GetDefaultVideosConfig(),
                TermsAndConditions = new TermsAndConditionsConfig
                {
                    Content = "Términos y Condiciones por defecto\n\n" +
                             "1. Uso del Software\n" +
                             "   - Este software es proporcionado 'tal cual', sin garantía de ningún tipo.\n" +
                             "   - El uso de este software implica la aceptación de estos términos.\n\n" +
                             "2. Responsabilidad\n" +
                             "   - El usuario es responsable del uso que haga del software.\n" +
                             "   - No nos hacemos responsables por daños causados por el mal uso del software.\n\n" +
                             "3. Propiedad Intelectual\n" +
                             "   - Todos los derechos están reservados.\n" +
                             "   - No se permite la redistribución sin autorización.",
                    LastModified = DateTime.Now
                }
            };
        }

        public async Task SaveAppSettingsAsync(AppSettings appSettings)
        {
            try
            {
                // Convertir las URLs antes de guardar
                if (appSettings.Course != null)
                {
                    appSettings.Course.VideoUrl = ConvertToEmbedUrl(appSettings.Course.VideoUrl);
                }
                
                if (appSettings.Videos != null)
                {
                    appSettings.Videos.DefenderVideoUrl = ConvertToEmbedUrl(appSettings.Videos.DefenderVideoUrl);
                    appSettings.Videos.EsetVideoUrl = ConvertToEmbedUrl(appSettings.Videos.EsetVideoUrl);
                }

                var siteQuery = $"{siteUrl}:/sites/InstaladoresWindowsC";
                var site = await graphClient.Sites[siteQuery].GetAsync();
                if (site == null) throw new Exception("No se pudo encontrar el sitio");

                var lists = await graphClient.Sites[site.Id].Lists.GetAsync();
                var documentLibrary = lists?.Value?.FirstOrDefault(l => l.Name == libraryName);
                if (documentLibrary == null) throw new Exception("No se pudo encontrar la biblioteca");

                var drive = await graphClient.Sites[site.Id].Lists[documentLibrary.Id].Drive.GetAsync();
                if (drive == null) throw new Exception("No se pudo obtener el drive");

                // Obtener la configuración actual
                var items = await graphClient.Drives[drive.Id].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == "app_settings.json");

                // Guardar la configuración actualizada
                var updatedJsonContent = JsonSerializer.Serialize(appSettings);
                var byteArray = System.Text.Encoding.UTF8.GetBytes(updatedJsonContent);
                var memoryStream = new MemoryStream(byteArray);

                if (configFile != null)
                {
                    await graphClient.Drives[drive.Id].Items[configFile.Id].Content.PutAsync(memoryStream);
                }
                else
                {
                    await graphClient.Drives[drive.Id].Root
                        .ItemWithPath("app_settings.json")
                        .Content
                        .PutAsync(memoryStream);
                }

                LogService.LogInfo("Configuración guardada correctamente");
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al guardar la configuración: {ex.Message}");
                throw;
            }
        }

        public async Task<List<AppItem>> GetAppsAsync()
        {
            try
            {
                var config = await GetAppSettingsAsync();
                return config?.Apps?.ToList() ?? new List<AppItem>();
            }
            catch (Exception ex)
            {
                throw new Exception("Error al obtener la lista de aplicaciones", ex);
            }
        }

        public async Task SaveAppDescriptionsConfigAsync(AppDescriptionsConfig newDescriptions)
        {
            try
            {
                // Obtener las descripciones existentes
                var existingDescriptions = await GetAppDescriptionsAsync();
                
                // Actualizar las descripciones existentes y agregar las nuevas
                foreach (var description in newDescriptions.Descriptions)
                {
                    existingDescriptions.Descriptions[description.Key] = description.Value;
                }

                existingDescriptions.LastUpdate = DateTime.UtcNow;

                // Convertir a JSON y guardar
                var jsonContent = JsonSerializer.Serialize(existingDescriptions, new JsonSerializerOptions { WriteIndented = true });
                using (var memoryStream = new MemoryStream(Encoding.UTF8.GetBytes(jsonContent)))
                {
                    var items = await graphClient.Drives[driveId].Items["root"].Children.GetAsync();
                    var configFile = items?.Value?.FirstOrDefault(i => i.Name == APP_DESCRIPTIONS_CONFIG);

                    if (configFile != null)
                    {
                        await graphClient.Drives[driveId].Items[configFile.Id].Content.PutAsync(memoryStream);
                    }
                    else
                    {
                        await graphClient.Drives[driveId].Items["root"]
                            .ItemWithPath(APP_DESCRIPTIONS_CONFIG)
                            .Content
                            .PutAsync(memoryStream);
                    }
                }

                LogService.LogInfo($"Descripciones actualizadas correctamente. Total: {existingDescriptions.Descriptions.Count}");
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al guardar las descripciones: {ex.Message}");
                throw;
            }
        }

        public async Task SaveAppDescriptionsAsync(List<AppItem> apps)
        {
            try
            {
                // Obtener todas las aplicaciones directamente de la carpeta exe
                var baseConfig = await GetBaseConfigurationAsync();
                var allApps = baseConfig.Applications.Select(app => new AppItem
                {
                    Name = app.Name,
                    FileName = app.FileName,
                    SharePointId = app.SharePointId,
                    WebUrl = app.WebUrl,
                    Version = app.Version,
                    LastModified = app.LastModified,
                    Size = app.Size,
                    Category = app.Category,
                    Description = app.Description,
                    InstallationOrder = app.InstallationOrder
                }).ToList();

                LogService.LogInfo($"Iniciando proceso de asignación de descripciones para {allApps.Count} aplicaciones...");
                
                // Obtener las descripciones existentes del SharePoint
                var existingDescriptions = await GetAppDescriptionsAsync();
                LogService.LogInfo($"Descripciones cargadas del diccionario: {existingDescriptions.Descriptions.Count}");
                
                int descripcionesEncontradas = 0;
                int descripcionesGenericas = 0;

                // Actualizar las aplicaciones con las descripciones del diccionario
                foreach (var app in allApps)
                {
                    // Extraer el nombre base eliminando números de versión y caracteres especiales
                    string baseName = app.Name;
                    
                    // Normalizar el nombre primero
                    baseName = baseName.Replace("_", " ")
                                     .Replace("-", " ")
                                     .Replace(".", " ");

                    // Manejar casos especiales primero
                    if (baseName.StartsWith("MSI", StringComparison.OrdinalIgnoreCase))
                    {
                        baseName = "MSIAfterburner";
                    }
                    else if (baseName.StartsWith("AIMP", StringComparison.OrdinalIgnoreCase))
                    {
                        baseName = "AIMP";
                    }
                    else if (baseName.StartsWith("VMware", StringComparison.OrdinalIgnoreCase))
                    {
                        if (baseName.Contains("Workstation", StringComparison.OrdinalIgnoreCase))
                            baseName = "VMwareWorkstation";
                        else if (baseName.Contains("Builder", StringComparison.OrdinalIgnoreCase))
                            baseName = "VMwareInstallBuilder";
                    }
                    else if (baseName.StartsWith("VisioProject", StringComparison.OrdinalIgnoreCase))
                    {
                        baseName = "VisioProject";
                    }
                    else if (baseName.StartsWith("Advanced", StringComparison.OrdinalIgnoreCase))
                    {
                        if (baseName.Contains("Installer", StringComparison.OrdinalIgnoreCase))
                            baseName = "AdvancedInstaller";
                    }
                    else if (baseName.StartsWith("MAGIX", StringComparison.OrdinalIgnoreCase))
                    {
                        if (baseName.Contains("SoundForge", StringComparison.OrdinalIgnoreCase))
                            baseName = "MAGIXSoundForgePro";
                    }
                    else if (baseName.StartsWith("Dism++", StringComparison.OrdinalIgnoreCase) || baseName.StartsWith("DismPlusPlus", StringComparison.OrdinalIgnoreCase))
                    {
                        baseName = "DismPlusPlus";
                    }
                    else if (baseName.StartsWith("CyberLink", StringComparison.OrdinalIgnoreCase))
                    {
                        if (baseName.Contains("Promeo", StringComparison.OrdinalIgnoreCase))
                            baseName = "CyberLinkPromeoPremium";
                    }
                    else if (baseName.StartsWith("VideoProc", StringComparison.OrdinalIgnoreCase))
                    {
                        if (baseName.Contains("Converter", StringComparison.OrdinalIgnoreCase))
                            baseName = "VideoProcConverterAI";
                    }
                    else if (baseName.StartsWith("Notepad++", StringComparison.OrdinalIgnoreCase) || baseName.Contains("NotepadPlusPlus", StringComparison.OrdinalIgnoreCase))
                    {
                        baseName = "NotepadPlusPlus";
                    }
                    else
                    {
                        // Eliminar números de versión comunes (ej: v1.2.3, 1.2.3, V2.1)
                        baseName = System.Text.RegularExpressions.Regex.Replace(baseName, @"[vV]?\d+(\.\d+)*", "");
                        
                        // Eliminar sufijos de versión comunes
                        baseName = baseName
                            .Replace("x86", "")
                            .Replace("x64", "")
                            .Replace("_64bit", "")
                            .Replace("_32bit", "")
                            .Replace("Silent", "")
                            .Replace("Install", "")
                            .Replace("Setup", "")
                            .Replace("Build", "");

                        // Separar por espacios y tomar la parte significativa
                        var parts = baseName.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length > 0)
                        {
                            // Si el primer segmento es muy corto (menos de 3 caracteres), incluir el siguiente
                            if (parts[0].Length < 3 && parts.Length > 1)
                            {
                                baseName = string.Join("", parts.Take(2));
                            }
                            else
                            {
                                baseName = parts[0];
                            }
                        }
                    }

                    // Corregir errores comunes de escritura
                    baseName = baseName
                        .Replace("Actiar", "Activar")
                        .Replace("Conerter", "Converter")
                        .Replace("Recoery", "Recovery")
                        .Replace("Adanced", "Advanced")
                        .Replace("Zoomer", "Zoom")
                        .Replace("&", "And")
                        .Replace("+", "Plus")
                        .Trim();

                    LogService.LogInfo($"Procesando aplicación: {app.Name} (nombre base: {baseName})");

                    // 1. Buscar coincidencia exacta
                    var exactKey = existingDescriptions.Descriptions.Keys
                        .FirstOrDefault(k => k.Equals(baseName, StringComparison.OrdinalIgnoreCase));
                    
                    if (exactKey != null)
                    {
                        app.Description = existingDescriptions.Descriptions[exactKey].Description;
                        app.Category = existingDescriptions.Descriptions[exactKey].Category;
                        LogService.LogInfo($"[Coincidencia Exacta] {app.Name} -> {exactKey}");
                        LogService.LogInfo($"Descripción asignada: {app.Description}");
                        LogService.LogInfo($"Categoría asignada: {app.Category}");
                        descripcionesEncontradas++;
                        continue;
                    }

                    // 2. Buscar por coincidencia al inicio del nombre
                    var startKey = existingDescriptions.Descriptions.Keys
                        .FirstOrDefault(k => k.ToLower().StartsWith(baseName.ToLower()) || 
                                           baseName.ToLower().StartsWith(k.ToLower()));
                    
                    if (startKey != null)
                    {
                        app.Description = existingDescriptions.Descriptions[startKey].Description;
                        app.Category = existingDescriptions.Descriptions[startKey].Category;
                        LogService.LogInfo($"[Coincidencia Inicio] {app.Name} -> {startKey}");
                        LogService.LogInfo($"Descripción asignada: {app.Description}");
                        LogService.LogInfo($"Categoría asignada: {app.Category}");
                        descripcionesEncontradas++;
                        continue;
                    }

                    // 3. Buscar por similitud de nombre
                    var similarKey = existingDescriptions.Descriptions.Keys
                        .FirstOrDefault(k => k.ToLower().Contains(baseName.ToLower()) || 
                                           baseName.ToLower().Contains(k.ToLower()));
                    
                    if (similarKey != null)
                    {
                        app.Description = existingDescriptions.Descriptions[similarKey].Description;
                        app.Category = existingDescriptions.Descriptions[similarKey].Category;
                        LogService.LogInfo($"[Coincidencia Similitud] {app.Name} -> {similarKey}");
                        LogService.LogInfo($"Descripción asignada: {app.Description}");
                        LogService.LogInfo($"Categoría asignada: {app.Category}");
                        descripcionesEncontradas++;
                        continue;
                    }

                    // Solo si no se encontró ninguna coincidencia, usar descripción genérica
                    app.Description = $"Software {app.Name}";
                    app.Category = "General";
                    LogService.LogInfo($"[Sin Coincidencia] {app.Name} -> Descripción genérica asignada");
                    LogService.LogInfo($"Descripción asignada: {app.Description}");
                    LogService.LogInfo($"Categoría asignada: {app.Category}");
                    descripcionesGenericas++;
                }

                LogService.LogInfo($"Resumen de asignación de descripciones:");
                LogService.LogInfo($"- Total de aplicaciones procesadas: {allApps.Count}");
                LogService.LogInfo($"- Descripciones encontradas en diccionario: {descripcionesEncontradas}");
                LogService.LogInfo($"- Descripciones genéricas asignadas: {descripcionesGenericas}");

                // Guardar las actualizaciones en el archivo de configuración elite
                await SaveSubscriptionConfigAsync(SubscriptionType.ELITE, allApps);
                LogService.LogInfo("Configuración elite actualizada con las nuevas descripciones");
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al asignar las descripciones desde el diccionario: {ex.Message}");
                throw;
            }
        }

        public async Task<AppDescriptionsConfig> GetAppDescriptionsAsync()
        {
            try
            {
                var items = await graphClient.Drives[driveId].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == APP_DESCRIPTIONS_CONFIG);
                
                if (configFile != null)
                {
                    using var stream = await graphClient.Drives[driveId].Items[configFile.Id].Content.GetAsync();
                    using var reader = new StreamReader(stream, Encoding.UTF8);
                    var jsonContent = await reader.ReadToEndAsync();
                    
                    // Corregir caracteres especiales
                    jsonContent = FixSpecialCharacters(jsonContent);
                    
                    var options = new JsonSerializerOptions
                    {
                        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                    };
                    return JsonSerializer.Deserialize<AppDescriptionsConfig>(jsonContent, options) ?? new AppDescriptionsConfig();
                }

                return new AppDescriptionsConfig();
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al cargar configuración de descripciones: {ex.Message}");
                return new AppDescriptionsConfig();
            }
        }

        private string FixSpecialCharacters(string text)
        {
            var replacements = new Dictionary<string, string>
            {
                { "Ã³", "ó" },
                { "Ã±", "ñ" },
                { "Ã¡", "á" },
                { "Ã©", "é" },
                { "Ã­", "í" },
                { "Ãº", "ú" },
                { "Ã¼", "ü" },
                { "Ã¢", "â" },
                { "Ã", "Í" }
            };

            foreach (var replacement in replacements)
            {
                text = text.Replace(replacement.Key, replacement.Value);
            }

            return text;
        }

        public async Task SaveSubscriptionConfigAsync(SubscriptionType type, List<AppItem> apps)
        {
            try
            {
                string configFileName = type switch
                {
                    SubscriptionType.Gratuita => FREE_APPS_CONFIG,
                    SubscriptionType.PRO => PRO_APPS_CONFIG,
                    SubscriptionType.ELITE => ELITE_APPS_CONFIG,
                    _ => throw new ArgumentException($"Tipo de suscripción no válido: {type}")
                };

                // Obtener todas las aplicaciones de la carpeta exe
                var baseConfig = await GetBaseConfigurationAsync();
                var allApps = baseConfig.Applications.Select(app => 
                {
                    // Buscar la aplicación correspondiente en la lista de apps con descripciones
                    var appWithDescription = apps.FirstOrDefault(a => a.SharePointId == app.SharePointId);
                    return new AppItem
                    {
                        Name = app.Name,
                        FileName = app.FileName,
                        SharePointId = app.SharePointId,
                        WebUrl = app.WebUrl,
                        Version = app.Version,
                        LastModified = app.LastModified,
                        Size = app.Size,
                        Category = appWithDescription?.Category ?? app.Category,
                        Description = appWithDescription?.Description ?? app.Description,
                        InstallationOrder = app.InstallationOrder
                    };
                }).ToList();

                var appsToSave = new List<AppItem>();

                // Para PRO, tomar el 67% de las aplicaciones totales
                if (type == SubscriptionType.PRO)
                {
                    var totalApps = allApps.Count;
                    var proAppsCount = (int)Math.Ceiling(totalApps * 0.67); // 67% del total
                    
                    LogService.LogInfo($"Configuración PRO: Se seleccionarán {proAppsCount} aplicaciones de {totalApps} totales ({(proAppsCount * 100.0 / totalApps):F1}%)");
                    
                    // Obtener la configuración ELITE existente para mantener las descripciones
                    var eliteConfig = await GetSubscriptionConfigAsync(SubscriptionType.ELITE);
                    
                    // Ordenar por orden de instalación y tomar la cantidad calculada
                    appsToSave = allApps
                        .OrderBy(a => a.InstallationOrder)
                        .Take(proAppsCount)
                        .Select(app => {
                            // Buscar la aplicación en la configuración ELITE para mantener su descripción
                            var eliteApp = eliteConfig.Applications.FirstOrDefault(e => e.SharePointId == app.SharePointId);
                            if (eliteApp != null)
                            {
                                app.Description = eliteApp.Description;
                                app.Category = eliteApp.Category;
                            }
                            return app;
                        })
                        .ToList();
                }
                else if (type == SubscriptionType.ELITE)
                {
                    // Para ELITE, usar todas las aplicaciones de la carpeta exe
                    appsToSave = allApps;
                }
                else if (type == SubscriptionType.Gratuita)
                {
                    var totalApps = allApps.Count;
                    var freeAppsCount = Math.Min(30, totalApps); // Máximo 30 aplicaciones para FREE
                    
                    LogService.LogInfo($"Configuración FREE: Se seleccionarán {freeAppsCount} aplicaciones de {totalApps} totales ({(freeAppsCount * 100.0 / totalApps):F1}%)");
                    
                    // Obtener la configuración ELITE existente para mantener las descripciones
                    var eliteConfig = await GetSubscriptionConfigAsync(SubscriptionType.ELITE);
                    
                    // Ordenar por orden de instalación y tomar la cantidad calculada
                    appsToSave = allApps
                        .OrderBy(a => a.InstallationOrder)
                        .Take(freeAppsCount)
                        .Select(app => {
                            // Buscar la aplicación en la configuración ELITE para mantener su descripción
                            var eliteApp = eliteConfig.Applications.FirstOrDefault(e => e.SharePointId == app.SharePointId);
                            if (eliteApp != null)
                            {
                                app.Description = eliteApp.Description;
                                app.Category = eliteApp.Category;
                            }
                            return app;
                        })
                        .ToList();
                }
                else
                {
                    // Para cualquier otro caso, usar la lista proporcionada
                    appsToSave = apps;
                }

                // Crear la configuración final
                var config = new SharePointConfig
                {
                    LastUpdate = DateTime.UtcNow,
                    Applications = appsToSave.Select(app => new ApplicationConfig
                    {
                        Name = app.Name,
                        FileName = app.FileName,
                        SharePointId = app.SharePointId,
                        WebUrl = app.WebUrl,
                        Version = app.Version,
                        LastModified = app.LastModified,
                        Size = app.Size,
                        Category = app.Category,
                        Description = app.Description,
                        InstallationOrder = app.InstallationOrder
                    }).ToList()
                };

                // Log de descripciones finales
                foreach (var app in config.Applications)
                {
                    LogService.LogInfo($"[{type}] {app.Name} -> {app.Description} ({app.Category})");
                }

                // Convertir a JSON y guardar (reemplazando completamente el contenido anterior)
                var jsonContent = JsonSerializer.Serialize(config, new JsonSerializerOptions 
                { 
                    WriteIndented = true,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                });
                await UploadContentAsync(configFileName, jsonContent);

                LogService.LogInfo($"Archivo {configFileName} reemplazado correctamente");
                LogService.LogInfo($"Configuración de {type} guardada correctamente. Total apps: {config.Applications.Count}");
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al guardar la configuración de {type}: {ex.Message}");
                throw;
            }
        }

        private string ExtractBaseName(string fileName)
        {
            try
            {
                // Eliminar extensión si existe
                fileName = Path.GetFileNameWithoutExtension(fileName);

                // Normalizar el nombre
                fileName = fileName.Replace("_", " ")
                                 .Replace("-", " ")
                                 .Replace(".", " ");

                // Eliminar números y caracteres especiales al final
                var parts = fileName.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                var baseName = parts[0];

                // Si hay más partes, intentar encontrar el nombre base
                for (int i = 1; i < parts.Length; i++)
                {
                    if (!parts[i].Any(char.IsDigit) && !parts[i].Contains("v", StringComparison.OrdinalIgnoreCase))
                    {
                        baseName += parts[i];
                    }
                    else
                    {
                        break;
                    }
                }

                return baseName;
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al extraer el nombre base de {fileName}: {ex.Message}");
                return fileName;
            }
        }

        public async Task<SharePointConfig> GetBaseConfigurationAsync()
        {
            try
            {
                var config = new SharePointConfig();
                var driveItems = new List<DriveItem>();
                var allFiles = new List<string>();
                
                // Contadores por tipo de archivo
                int exeCount = 0;
                int batCount = 0;
                int sfxCount = 0;
                
                // Obtener todos los archivos de la carpeta exe con paginación
                var filesPage = await graphClient.Drives[driveId].Items[folderId].Children.GetAsync();
                if (filesPage?.Value != null)
                {
                    foreach (var item in filesPage.Value)
                    {
                        allFiles.Add(item.Name);
                        if (item.Name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                        {
                            exeCount++;
                            driveItems.Add(item);
                        }
                        else if (item.Name.EndsWith(".bat", StringComparison.OrdinalIgnoreCase))
                        {
                            batCount++;
                            driveItems.Add(item);
                        }
                        else if (item.Name.EndsWith(".sfx", StringComparison.OrdinalIgnoreCase))
                        {
                            sfxCount++;
                            driveItems.Add(item);
                        }
                    }

                    // Procesar páginas adicionales si existen
                    var nextPageRequest = filesPage.OdataNextLink;
                    while (!string.IsNullOrEmpty(nextPageRequest))
                    {
                        var nextPage = await graphClient.Drives[driveId].Items[folderId].Children
                            .WithUrl(nextPageRequest)
                            .GetAsync();

                        if (nextPage?.Value != null)
                        {
                            foreach (var item in nextPage.Value)
                            {
                                allFiles.Add(item.Name);
                                if (item.Name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
                                {
                                    exeCount++;
                                    driveItems.Add(item);
                                }
                                else if (item.Name.EndsWith(".bat", StringComparison.OrdinalIgnoreCase))
                                {
                                    batCount++;
                                    driveItems.Add(item);
                                }
                                else if (item.Name.EndsWith(".sfx", StringComparison.OrdinalIgnoreCase))
                                {
                                    sfxCount++;
                                    driveItems.Add(item);
                                }
                            }
                            
                            nextPageRequest = nextPage.OdataNextLink;
                        }
                        else
                        {
                            break;
                        }
                    }
                }

                LogService.LogInfo($"Desglose de archivos encontrados:");
                LogService.LogInfo($"- Archivos EXE: {exeCount}");
                LogService.LogInfo($"- Archivos BAT: {batCount}");
                LogService.LogInfo($"- Archivos SFX: {sfxCount}");
                LogService.LogInfo($"Total de archivos: {driveItems.Count}");

                // Procesar los archivos encontrados
                var processedFiles = new List<string>();
                var order = 1;
                foreach (var item in driveItems.OrderBy(x => x.Name))
                {
                    var version = item.LastModifiedDateTime?.ToString("yyyy.MM.dd") ?? "1.0.0";
                    var name = item.Name;  // Usar el nombre completo del archivo
                    
                    processedFiles.Add(item.Name);
                    LogService.LogInfo($"Procesando archivo: {item.Name}");
                    
                    config.Applications.Add(new ApplicationConfig
                    {
                        Name = Path.GetFileNameWithoutExtension(name),  // Mantener el nombre completo sin extensión
                        FileName = name,
                        SharePointId = item.Id,
                        WebUrl = item.WebUrl,
                        Version = version,
                        LastModified = item.LastModifiedDateTime?.DateTime ?? DateTime.UtcNow,
                        Size = item.Size ?? 0,
                        Category = "General",
                        Description = GenerateSmartDescription(
                            Path.GetFileNameWithoutExtension(name),
                            version,
                            item.Size ?? 0,
                            item.LastModifiedDateTime?.DateTime
                        ),
                        InstallationOrder = order++
                    });
                }

                // Identificar archivos no procesados
                var unprocessedFiles = allFiles.Except(processedFiles).ToList();
                if (unprocessedFiles.Any())
                {
                    LogService.LogInfo("Archivos no procesados:");
                    foreach (var file in unprocessedFiles)
                    {
                        LogService.LogInfo($"- {file}");
                    }
                }

                LogService.LogInfo($"Se procesaron {config.Applications.Count} aplicaciones en la carpeta exe");
                return config;
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al obtener la configuración base: {ex.Message}");
                throw;
            }
        }

        public async Task SaveAppDescriptionsAsync(AppDescriptionsConfig config)
        {
            try
            {
                var items = await graphClient.Drives[driveId].Items["root"].Children.GetAsync();
                var configFile = items?.Value?.FirstOrDefault(i => i.Name == APP_DESCRIPTIONS_CONFIG);

                if (configFile == null)
                {
                    throw new Exception("No se encontró el archivo de configuración de descripciones");
                }

                var options = new JsonSerializerOptions
                {
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                    WriteIndented = true
                };

                var jsonContent = JsonSerializer.Serialize(config, options);
                var byteArray = Encoding.UTF8.GetBytes(jsonContent);
                using var stream = new MemoryStream(byteArray);

                await graphClient.Drives[driveId].Items[configFile.Id].Content.PutAsync(stream);
                LogService.LogInfo("Configuración de descripciones guardada exitosamente");
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al guardar la configuración de descripciones: {ex.Message}");
                throw;
            }
        }

        public async Task<string> GetAccessTokenAsync()
        {
            var scopes = new[] { "https://graph.microsoft.com/.default" };
            var clientSecretCredential = new ClientSecretCredential(tenantId, clientId, clientSecret);
            var token = await clientSecretCredential.GetTokenAsync(new Azure.Core.TokenRequestContext(scopes), default);
            return token.Token;
        }

        public async Task<byte[]> GetFileContentBytesAsync(string fileName)
        {
            try
            {
                LogService.LogInfo($"Buscando archivo {fileName} para obtener bytes...");
                var items = await graphClient.Drives[driveId].Items["root"].Children.GetAsync();
                var file = items?.Value?.FirstOrDefault(i => i.Name == fileName);

                if (file == null)
                {
                    LogService.LogInfo($"Archivo {fileName} no encontrado en la raíz");
                    throw new Exception($"No se encontró el archivo {fileName}");
                }

                LogService.LogInfo($"Archivo {fileName} encontrado, obteniendo contenido en bytes...");
                using (var stream = await graphClient.Drives[driveId].Items[file.Id].Content.GetAsync())
                using (var memoryStream = new MemoryStream())
                {
                    await stream.CopyToAsync(memoryStream);
                    return memoryStream.ToArray();
                }
            }
            catch (Exception ex)
            {
                LogService.LogError($"Error al leer bytes del archivo {fileName}: {ex.Message}");
                throw;
            }
        }
    }
} 