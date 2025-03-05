class UpdateManager {
    constructor(spGraph) {
        this.spGraph = spGraph;
        this.selectedFile = null;
        this.UPDATE_FILE_NAME = 'InstaladoresWindowsCOnlineShare_Setup.exe';
        this.UPDATE_JSON_FILE = 'update.json';
        
        // Referencias DOM
        this.selectedFileInfo = document.getElementById('selectedFileInfo');
        this.newVersionInput = document.getElementById('newVersionInput');
        this.releaseNotesInput = document.getElementById('releaseNotesInput');
        this.updateLoadingOverlay = document.getElementById('updateLoadingOverlay');
        this.updateLoadingTitle = document.getElementById('updateLoadingTitle');
        this.updateLoadingMessage = document.getElementById('updateLoadingMessage');
        this.updateProgressBar = document.getElementById('updateProgressBar');
        this.updateProgressText = document.getElementById('updateProgressText');
        
        // Inicializar eventos
        this.initializeEvents();
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
            
            // Mostrar estado de carga
            this.showLoading(true);
            this.updateProgress(0, 'Preparando archivo...');
            
            // Subir el archivo de actualización
            this.updateProgress(20, 'Subiendo archivo de actualización...');
            const fileId = await this.spGraph.uploadFile(this.UPDATE_FILE_NAME, this.selectedFile);
            
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
                
                // Limpiar formulario
                this.selectedFile = null;
                this.selectedFileInfo.className = 'alert alert-info';
                this.selectedFileInfo.innerHTML = `
                    <i class="bi bi-info-circle me-2"></i>
                    No se ha seleccionado ningún archivo
                `;
                this.newVersionInput.value = '';
                this.releaseNotesInput.value = '';
            }, 500);
            
        } catch (error) {
            console.error('Error al subir actualización:', error);
            this.showLoading(false);
            showAlert('danger', `Error al subir la actualización: ${error.message}`);
        }
    }
} 