class UpdateManager {
    constructor(spGraph) {
        this.spGraph = spGraph;
        this.selectedFile = null;
        this.UPDATE_FILE_NAME = 'InstaladoresWindowsCOnlineShare_Setup.exe';
        this.UPDATE_JSON_FILE = 'update.json';
        this.currentVersion = null;
        
        // Referencias DOM
        this.selectedFileInfo = document.getElementById('selectedFileInfo');
        this.newVersionInput = document.getElementById('newVersionInput');
        this.releaseNotesInput = document.getElementById('releaseNotesInput');
        this.updateLoadingOverlay = document.getElementById('updateLoadingOverlay');
        this.updateLoadingTitle = document.getElementById('updateLoadingTitle');
        this.updateLoadingMessage = document.getElementById('updateLoadingMessage');
        this.updateProgressBar = document.getElementById('updateProgressBar');
        this.updateProgressText = document.getElementById('updateProgressText');
        
        // Inicializar eventos y cargar datos
        this.initializeEvents();
        this.loadCurrentVersion();
    }
    
    initializeEvents() {
        // Botón para seleccionar archivo
        document.getElementById('selectUpdateFileBtn').addEventListener('click', () => {
            this.selectUpdateFile();
        });
        
        // Botón para subir actualización
        document.getElementById('uploadUpdateBtn').addEventListener('click', () => {
            this.uploadUpdate();
        });

        // Validación del formato de versión
        this.newVersionInput.addEventListener('input', (e) => {
            const versionRegex = /^\d+\.\d+\.\d+$/;
            if (!versionRegex.test(e.target.value)) {
                e.target.classList.add('is-invalid');
            } else {
                e.target.classList.remove('is-invalid');
            }
        });
    }

    async loadCurrentVersion() {
        try {
            // Mostrar estado de carga
            this.showLoading(true, 'Cargando información', 'Obteniendo versión actual...');
            
            // Intentar obtener el archivo update.json
            const updateJson = await this.spGraph.getFileContent(this.UPDATE_JSON_FILE);
            if (updateJson) {
                const updateInfo = JSON.parse(updateJson);
                this.currentVersion = updateInfo.LatestVersion;
                
                // Actualizar la interfaz
                const versionInfo = document.createElement('div');
                versionInfo.className = 'alert alert-info mb-3';
                versionInfo.innerHTML = `
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>Versión actual:</strong> ${this.currentVersion}
                    <br>
                    <small class="text-muted">Última actualización: ${new Date(updateInfo.LastUpdate).toLocaleString()}</small>
                `;
                
                // Insertar antes del div de selección de archivo
                this.selectedFileInfo.parentNode.insertBefore(versionInfo, this.selectedFileInfo);
                
                // Pre-llenar el campo de nueva versión con la siguiente versión sugerida
                const [major, minor, patch] = this.currentVersion.split('.').map(Number);
                this.newVersionInput.value = `${major}.${minor}.${patch + 1}`;
                
                // Si hay notas de la versión anterior, mostrarlas como referencia
                if (updateInfo.ReleaseNotes) {
                    const previousNotes = document.createElement('div');
                    previousNotes.className = 'mb-3';
                    previousNotes.innerHTML = `
                        <label class="form-label text-muted">Notas de la versión anterior:</label>
                        <div class="form-control bg-light" style="height: auto; min-height: 100px; overflow-y: auto;">
                            ${updateInfo.ReleaseNotes.replace(/\n/g, '<br>')}
                        </div>
                    `;
                    this.releaseNotesInput.parentNode.appendChild(previousNotes);
                }
            }
            
            this.showLoading(false);
        } catch (error) {
            console.error('Error al cargar la versión actual:', error);
            showAlert('warning', 'No se pudo cargar la información de la versión actual. Esta podría ser la primera versión.');
            this.showLoading(false);
        }
    }
    
    showLoading(show, title = 'Subiendo actualización', message = 'Procesando archivo...') {
        if (show) {
            this.updateLoadingTitle.textContent = title;
            this.updateLoadingMessage.textContent = message;
            this.updateLoadingOverlay.classList.remove('d-none');
            document.body.style.overflow = 'hidden';
        } else {
            this.updateLoadingOverlay.classList.add('d-none');
            document.body.style.overflow = '';
        }
    }
    
    updateProgress(percent, message) {
        this.updateProgressBar.style.width = `${percent}%`;
        this.updateProgressBar.setAttribute('aria-valuenow', percent);
        this.updateProgressText.textContent = message;
    }
    
    async selectUpdateFile() {
        try {
            // Crear un input de tipo file temporal
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.exe';
            
            // Manejar la selección del archivo
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.selectedFile = file;
                    this.selectedFileInfo.className = 'alert alert-success';
                    this.selectedFileInfo.innerHTML = `
                        <i class="bi bi-check-circle me-2"></i>
                        Archivo seleccionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)
                    `;
                }
            };
            
            // Simular clic en el input
            input.click();
        } catch (error) {
            console.error('Error al seleccionar archivo:', error);
            showAlert('danger', `Error al seleccionar archivo: ${error.message}`);
        }
    }
    
    async uploadUpdate() {
        try {
            // Validar entrada
            if (!this.selectedFile) {
                showAlert('warning', 'Por favor, seleccione un archivo de actualización primero.');
                return;
            }
            
            if (!this.newVersionInput.value) {
                showAlert('warning', 'Por favor, ingrese el número de la nueva versión.');
                return;
            }

            // Validar formato de versión
            const versionRegex = /^\d+\.\d+\.\d+$/;
            if (!versionRegex.test(this.newVersionInput.value)) {
                showAlert('warning', 'El número de versión debe tener el formato X.Y.Z (ejemplo: 1.0.0)');
                return;
            }

            // Validar que la nueva versión sea mayor que la actual
            if (this.currentVersion) {
                const current = this.currentVersion.split('.').map(Number);
                const new_ = this.newVersionInput.value.split('.').map(Number);
                
                let isGreater = false;
                for (let i = 0; i < 3; i++) {
                    if (new_[i] > current[i]) {
                        isGreater = true;
                        break;
                    } else if (new_[i] < current[i]) {
                        showAlert('warning', `La nueva versión (${this.newVersionInput.value}) debe ser mayor que la versión actual (${this.currentVersion})`);
                        return;
                    }
                }
                
                if (!isGreater) {
                    showAlert('warning', `La nueva versión debe ser diferente a la versión actual (${this.currentVersion})`);
                    return;
                }
            }
            
            // Mostrar estado de carga
            this.showLoading(true);
            this.updateProgress(0, 'Preparando archivo...');
            
            // Crear FormData para el archivo
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            
            // Subir el archivo de actualización
            this.updateProgress(20, 'Subiendo archivo de actualización...');
            const fileId = await this.spGraph.uploadFile(this.UPDATE_FILE_NAME, formData);
            
            // Crear objeto de información de actualización
            const updateInfo = {
                LatestVersion: this.newVersionInput.value,
                UpdateFileName: this.UPDATE_FILE_NAME,
                UpdateFileId: fileId,
                ReleaseNotes: this.releaseNotesInput.value,
                LastUpdate: new Date().toISOString()
            };
            
            // Convertir a JSON
            this.updateProgress(60, 'Actualizando información de versión...');
            const updateJson = JSON.stringify(updateInfo, null, 2);
            
            // Guardar archivo update.json
            this.updateProgress(80, 'Guardando configuración...');
            await this.spGraph.saveFileContent(this.UPDATE_JSON_FILE, updateJson);
            
            // Finalizar
            this.updateProgress(100, '¡Actualización completada!');
            setTimeout(() => {
                this.showLoading(false);
                showAlert('success', 'La actualización se ha subido correctamente.');
                
                // Actualizar la versión actual
                this.currentVersion = this.newVersionInput.value;
                
                // Limpiar formulario
                this.selectedFile = null;
                this.selectedFileInfo.className = 'alert alert-info';
                this.selectedFileInfo.innerHTML = `
                    <i class="bi bi-info-circle me-2"></i>
                    No se ha seleccionado ningún archivo
                `;
                this.newVersionInput.value = '';
                this.releaseNotesInput.value = '';
                
                // Recargar la información de versión
                this.loadCurrentVersion();
            }, 500);
            
        } catch (error) {
            console.error('Error al subir actualización:', error);
            this.showLoading(false);
            showAlert('danger', `Error al subir la actualización: ${error.message}`);
        }
    }
} 