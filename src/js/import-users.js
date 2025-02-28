// Clase para manejar la importación de usuarios desde Excel
class UserImporter {
    constructor() {
        this.users = [];
        this.selectedUsers = new Set();
        
        // Referencias a elementos del DOM
        this.fileInput = document.getElementById('excelFileInput');
        this.uploadButton = document.getElementById('uploadButton');
        this.previewContainer = document.getElementById('previewContainer');
        this.previewTableBody = document.getElementById('previewTableBody');
        this.importButton = document.getElementById('importButton');
        this.importButtonContainer = document.getElementById('importButtonContainer');
        this.loadingState = document.getElementById('loadingState');
        this.loadingMessage = document.getElementById('loadingMessage');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.selectAllCheckbox = document.getElementById('selectAllCheckbox');
        this.selectAllButton = document.getElementById('selectAllButton');
        this.deselectAllButton = document.getElementById('deselectAllButton');
        this.downloadTemplateButton = document.getElementById('downloadTemplateButton');
        this.selectedCount = document.getElementById('selectedCount');
        this.totalCount = document.getElementById('totalCount');
        this.successCount = document.getElementById('successCount');
        this.updatedCount = document.getElementById('updatedCount');
        this.errorCount = document.getElementById('errorCount');
        this.errorList = document.getElementById('errorList');
        this.errorDetails = document.getElementById('errorDetails');
    }
    
    // Inicializa el importador
    initialize() {
        this.sharepointGraph = new SharePointGraph();
        this.userManager = new UserManager();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Evento para cargar archivo Excel
        this.uploadButton.addEventListener('click', () => this.handleFileUpload());
        
        // Eventos para selección de usuarios
        this.selectAllCheckbox.addEventListener('change', (e) => this.handleSelectAllChange(e));
        this.selectAllButton.addEventListener('click', () => this.selectAll(true));
        this.deselectAllButton.addEventListener('click', () => this.selectAll(false));
        
        // Evento para importar usuarios seleccionados
        this.importButton.addEventListener('click', () => this.importSelectedUsers());
        
        // Evento para descargar plantilla
        this.downloadTemplateButton.addEventListener('click', () => this.downloadTemplate());
    }

    // Maneja la carga del archivo Excel
    async handleFileUpload() {
        const file = this.fileInput.files[0];
        if (!file) {
            this.showAlert('Por favor seleccione un archivo Excel.', 'warning');
            return;
        }

        this.showLoading('Procesando archivo Excel...');
        
        try {
            const data = await this.readExcelFile(file);
            this.users = this.validateAndFormatData(data);
            await this.showPreview();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showAlert('Error al procesar el archivo: ' + error.message, 'danger');
        }
    }

    // Lee el archivo Excel y retorna los datos
    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('El archivo no es un archivo Excel válido.'));
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo.'));
            reader.readAsArrayBuffer(file);
        });
    }

    // Valida y formatea los datos del Excel
    validateAndFormatData(data) {
        if (data.length < 2) {
            throw new Error('El archivo está vacío o no contiene datos válidos.');
        }

        // Ignoramos los encabezados y leemos directamente por posición
        // Columna 0: correo, Columna 1: tipo suscripción, Columna 2: duración, Columna 3 (opcional): estado
        
        const today = new Date();
        
        return data.slice(1).map((row, index) => {
            // Verificar que la fila tenga al menos una celda con datos
            if (!row || row.length === 0 || !row[0]) return null;
            
            const email = row[0] || '';
            const subscriptionType = row.length > 1 ? row[1] || '' : '';
            const durationText = row.length > 2 ? (row[2] ? String(row[2]).toLowerCase() : '') : '';
            
            // Leer estado (activo/inactivo) si está disponible (columna 3)
            let isActive = true; // Por defecto activo
            if (row.length > 3 && row[3] !== undefined) {
                const activeText = String(row[3]).toLowerCase().trim();
                isActive = !(activeText === 'no' || activeText === 'false' || activeText === '0' || 
                           activeText === 'inactivo' || activeText === 'inactive' || activeText === 'falso');
            }
            
            // Calcular fechas basadas en la duración
            const { startDate, endDate } = this.calculateDates(durationText, today);
            
            const user = {
                email: email,
                password: null, // Siempre null para usuarios nuevos
                subscriptionType: subscriptionType,
                startDate: startDate,
                endDate: endDate,
                isActive: isActive,
                selected: true,
                rowIndex: index + 2,
                durationText: durationText, // Guardamos el texto original para mostrarlo
                existingUser: null // Se llenará después con la información del usuario existente
            };

            // Validar datos
            const validationError = this.validateUserData(user);
            if (validationError) {
                user.error = validationError;
            }

            return user;
        }).filter(user => user && user.email); // Filtrar filas vacías y nulas
    }
    
    // Encuentra el índice de una columna buscando en varios nombres posibles
    findColumnIndex(headers, possibleNames) {
        for (const name of possibleNames) {
            const index = headers.findIndex(h => h.includes(name));
            if (index !== -1) return index;
        }
        return -1;
    }
    
    // Calcula las fechas de inicio y fin basadas en el texto de duración
    calculateDates(durationText, startDateObj = new Date()) {
        const startDate = new Date(startDateObj);
        const endDate = new Date(startDateObj);
        
        // Extraer números y unidades del texto de duración
        const durationMatch = durationText.match(/(\d+)\s*(día|dias|día|dias|semana|semanas|mes|meses|año|años|year|years|month|months|week|weeks|day|days)/i);
        
        if (durationMatch) {
            const amount = parseInt(durationMatch[1]);
            const unit = durationMatch[2].toLowerCase();
            
            if (unit.includes('año') || unit.includes('year')) {
                endDate.setFullYear(endDate.getFullYear() + amount);
            } else if (unit.includes('mes') || unit.includes('month')) {
                endDate.setMonth(endDate.getMonth() + amount);
            } else if (unit.includes('semana') || unit.includes('week')) {
                endDate.setDate(endDate.getDate() + (amount * 7));
            } else if (unit.includes('día') || unit.includes('dia') || unit.includes('day')) {
                endDate.setDate(endDate.getDate() + amount);
            }
        } else {
            // Si no se puede interpretar, usar 1 año por defecto
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
        
        return {
            startDate: this.formatDate(startDate),
            endDate: this.formatDate(endDate)
        };
    }
    
    // Formatea una fecha como YYYY-MM-DD
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // Valida los datos de un usuario
    validateUserData(user) {
        if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
            return 'Email inválido';
        }
        if (!user.subscriptionType) {
            return 'Tipo de suscripción es requerido';
        }
        if (!user.durationText) {
            return 'Duración es requerida';
        }
        return null;
    }

    // Muestra la previsualización de los datos
    async showPreview() {
        this.previewTableBody.innerHTML = '';
        this.selectedUsers.clear();
        
        // Comprobar usuarios existentes
        this.showLoading('Verificando usuarios existentes...');
        
        // Procesar en lotes para no sobrecargar la API
        const batchSize = 5;
        for (let i = 0; i < this.users.length; i += batchSize) {
            const batch = this.users.slice(i, i + batchSize);
            await Promise.all(batch.map(async (user) => {
                try {
                    const existingUser = await this.userManager.findUserByEmail(user.email);
                    if (existingUser) {
                        user.existingUser = existingUser;
                        user.status = 'Actualizar';
                    } else {
                        user.status = 'Nuevo';
                    }
                } catch (error) {
                    console.error(`Error al verificar usuario ${user.email}:`, error);
                    user.status = 'Error';
                }
            }));
        }
        
        this.hideLoading();
        
        // Mostrar usuarios en la tabla
        this.users.forEach((user, index) => {
            const row = document.createElement('tr');
            
            // Determinar si hay cambios si el usuario existe
            let subscriptionChanged = false;
            let datesChanged = false;
            let activeChanged = false;
            
            if (user.existingUser) {
                subscriptionChanged = user.subscriptionType !== user.existingUser.subscriptionType;
                
                const existingStartDate = user.existingUser.startDate ? new Date(user.existingUser.startDate).toISOString().split('T')[0] : '';
                const existingEndDate = user.existingUser.endDate ? new Date(user.existingUser.endDate).toISOString().split('T')[0] : '';
                
                datesChanged = user.startDate !== existingStartDate || user.endDate !== existingEndDate;
                activeChanged = user.isActive !== user.existingUser.isActive;
            }
            
            row.innerHTML = `
                <td>
                    <div class="form-check">
                        <input class="form-check-input user-checkbox" type="checkbox" 
                               value="${index}" ${user.selected && !user.error ? 'checked' : ''} 
                               ${user.error ? 'disabled' : ''}>
                    </div>
                </td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>
                    ${user.status === 'Actualizar' ? 
                        `<span class="badge bg-warning text-dark">Actualizar</span>` : 
                        user.status === 'Nuevo' ? 
                        `<span class="badge bg-success">Nuevo</span>` : 
                        `<span class="badge bg-danger">Error</span>`}
                </td>
                <td>
                    ${user.existingUser ? 
                        `<div class="d-flex flex-column">
                            <div class="mb-1">
                                <small class="text-muted">Actual:</small> 
                                <span class="${subscriptionChanged ? 'text-decoration-line-through text-muted' : 'fw-bold'}">${this.escapeHtml(user.existingUser.subscriptionType)}</span>
                            </div>
                            ${subscriptionChanged ? 
                                `<div>
                                    <small class="text-muted">Nuevo:</small> 
                                    <span class="text-success fw-bold">${this.escapeHtml(user.subscriptionType)}</span>
                                </div>` : 
                                ''}
                        </div>` : 
                        this.escapeHtml(user.subscriptionType)}
                </td>
                <td>${this.escapeHtml(user.durationText)}</td>
                <td>
                    ${user.existingUser ? 
                        `<div class="d-flex flex-column">
                            <div class="mb-1">
                                <small class="text-muted">Actual:</small> 
                                <span class="${datesChanged ? 'text-decoration-line-through text-muted' : 'fw-bold'}">${user.existingUser.startDate || ''} - ${user.existingUser.endDate || ''}</span>
                            </div>
                            ${datesChanged ? 
                                `<div>
                                    <small class="text-muted">Nuevo:</small> 
                                    <span class="text-success fw-bold">${user.startDate} - ${user.endDate}</span>
                                </div>` : 
                                ''}
                        </div>` : 
                        `${user.startDate} - ${user.endDate}`}
                </td>
                <td>
                    ${user.existingUser ? 
                        `<div class="d-flex flex-column">
                            <div class="mb-1">
                                <small class="text-muted">Actual:</small> 
                                <span class="${activeChanged ? 'text-decoration-line-through text-muted' : 'fw-bold'}">${user.existingUser.isActive ? 'Activo' : 'Inactivo'}</span>
                            </div>
                            ${activeChanged ? 
                                `<div>
                                    <small class="text-muted">Nuevo:</small> 
                                    <span class="text-success fw-bold">${user.isActive ? 'Activo' : 'Inactivo'}</span>
                                </div>` : 
                                ''}
                        </div>` : 
                        user.isActive ? 'Activo' : 'Inactivo'}
                </td>
                <td>
                    ${user.error ? 
                        `<span class="badge bg-danger" title="${this.escapeHtml(user.error)}">Error</span>` : 
                        '<span class="badge bg-success">Válido</span>'}
                </td>
            `;

            // Agregar evento de cambio al checkbox
            const checkbox = row.querySelector('.user-checkbox');
            checkbox.addEventListener('change', (e) => this.handleUserSelection(e, index));

            if (user.selected && !user.error) {
                this.selectedUsers.add(index);
            }

            this.previewTableBody.appendChild(row);
        });

        this.updateSelectionCounters();
        this.previewContainer.classList.remove('d-none');
        this.importButtonContainer.classList.remove('d-none');
    }

    // Maneja la selección/deselección de usuarios
    handleUserSelection(event, index) {
        if (event.target.checked) {
            this.selectedUsers.add(index);
        } else {
            this.selectedUsers.delete(index);
        }
        this.updateSelectionCounters();
    }

    // Maneja el cambio en el checkbox "Seleccionar todos"
    handleSelectAllChange(event) {
        this.selectAll(event.target.checked);
    }

    // Selecciona o deselecciona todos los usuarios válidos
    selectAll(select) {
        const checkboxes = this.previewTableBody.querySelectorAll('.user-checkbox:not(:disabled)');
        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = select;
            if (select) {
                this.selectedUsers.add(parseInt(checkbox.value));
            } else {
                this.selectedUsers.delete(parseInt(checkbox.value));
            }
        });
        this.selectAllCheckbox.checked = select;
        this.updateSelectionCounters();
    }

    // Actualiza los contadores de selección
    updateSelectionCounters() {
        const validUsers = this.users.filter(u => !u.error).length;
        this.selectedCount.textContent = this.selectedUsers.size;
        this.totalCount.textContent = validUsers;
        this.importButton.disabled = this.selectedUsers.size === 0;
    }

    // Importa los usuarios seleccionados
    async importSelectedUsers() {
        if (this.selectedUsers.size === 0) {
            this.showAlert('Por favor seleccione al menos un usuario para importar.', 'warning');
            return;
        }

        this.showLoading('Importando usuarios...');
        this.importButton.disabled = true;
        
        const results = {
            success: 0,
            updated: 0,
            errors: []
        };

        for (const index of this.selectedUsers) {
            const user = this.users[index];
            try {
                const existingUser = await this.userManager.findUserByEmail(user.email);
                if (existingUser) {
                    await this.userManager.updateUser({
                        ...existingUser,
                        subscriptionType: user.subscriptionType,
                        startDate: user.startDate,
                        endDate: user.endDate,
                        isActive: user.isActive
                    });
                    results.updated++;
                } else {
                    await this.userManager.createUser(user);
                    results.success++;
                }
            } catch (error) {
                results.errors.push({
                    email: user.email,
                    error: error.message,
                    row: user.rowIndex
                });
            }
        }

        this.showResults(results);
        this.hideLoading();
        this.importButton.disabled = false;
    }

    // Muestra los resultados de la importación
    showResults(results) {
        this.successCount.textContent = results.success;
        this.updatedCount.textContent = results.updated;
        this.errorCount.textContent = results.errors.length;

        if (results.errors.length > 0) {
            this.errorList.innerHTML = results.errors.map(error => `
                <li class="list-group-item list-group-item-danger">
                    <strong>Fila ${error.row}:</strong> ${this.escapeHtml(error.email)} - ${this.escapeHtml(error.error)}
                </li>
            `).join('');
            this.errorDetails.classList.remove('d-none');
        } else {
            this.errorDetails.classList.add('d-none');
        }

        this.resultsContainer.classList.remove('d-none');
        
        if (results.errors.length === 0) {
            this.showAlert('Importación completada con éxito.', 'success');
        } else {
            this.showAlert('Importación completada con algunos errores.', 'warning');
        }
    }

    // Descarga la plantilla de Excel
    downloadTemplate() {
        const headers = [
            'Correo Electrónico',
            'Tipo de Suscripción',
            'Duración',
            'Estado (Activo/Inactivo)'
        ];
        
        const exampleData = [
            ['usuario@ejemplo.com', 'Premium', '1 año', 'Activo'],
            ['otro@ejemplo.com', 'Básico', '6 meses', 'Activo'],
            ['prueba@ejemplo.com', 'Estándar', '3 meses', 'Inactivo']
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
        
        // Añadir una nota explicativa en la celda A6
        XLSX.utils.sheet_add_aoa(ws, [
            ['IMPORTANTE: El sistema lee las columnas por posición, no por nombre.'],
            ['Columna A: Correo electrónico'],
            ['Columna B: Tipo de suscripción'],
            ['Columna C: Duración (ejemplos: "1 año", "6 meses", "2 semanas")'],
            ['Columna D: Estado (Activo/Inactivo) - Opcional']
        ], {origin: 'A6'});
        
        XLSX.writeFile(wb, 'plantilla_usuarios.xlsx');
    }

    // Muestra un mensaje de alerta
    showAlert(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        alertContainer.appendChild(alert);
        
        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    }

    // Muestra el estado de carga
    showLoading(message) {
        this.loadingMessage.textContent = message;
        this.loadingState.classList.remove('d-none');
    }

    // Oculta el estado de carga
    hideLoading() {
        this.loadingState.classList.add('d-none');
    }

    // Escapa caracteres HTML para prevenir XSS
    escapeHtml(unsafe) {
        return unsafe
            ? unsafe
                .toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
            : '';
    }
}

// Inicializar la clase cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const userImporter = new UserImporter();
    userImporter.initialize();
});
