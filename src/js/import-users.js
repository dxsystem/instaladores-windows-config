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
        try {
            console.log('Inicializando UserImporter...');
            
            // Inicializar servicios
            if (window.userManager) {
                this.userManager = window.userManager;
                console.log('UserManager obtenido de la ventana global');
            } else if (window.spGraph) {
                this.userManager = new UserManager(window.spGraph);
                console.log('UserManager creado con spGraph de la ventana global');
            } else {
                console.error('No se encontró userManager ni spGraph en la ventana global');
                throw new Error('No se pudo inicializar UserManager. Falta la instancia de SharePointGraph.');
            }
            
            // Verificar que tenemos todos los elementos del DOM
            if (!this.fileInput || !this.uploadButton || !this.previewTableBody) {
                console.error('Faltan elementos del DOM necesarios para UserImporter');
                throw new Error('No se encontraron todos los elementos del DOM necesarios');
            }
            
            // Configurar eventos
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
            this.uploadButton.addEventListener('click', () => this.fileInput.click());
            this.importButton.addEventListener('click', () => this.importSelectedUsers());
            
            if (this.selectAllCheckbox) {
                this.selectAllCheckbox.addEventListener('change', (e) => this.handleSelectAllChange(e));
            }
            
            if (this.selectAllButton) {
                this.selectAllButton.addEventListener('click', () => this.selectAll(true));
            }
            
            if (this.deselectAllButton) {
                this.deselectAllButton.addEventListener('click', () => this.selectAll(false));
            }
            
            // Configurar evento para descargar plantilla
            if (this.downloadTemplateButton) {
                this.downloadTemplateButton.addEventListener('click', () => this.downloadTemplate());
            }
            
            console.log('UserImporter inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar UserImporter:', error);
            alert(`Error al inicializar el importador de usuarios: ${error.message}`);
        }
    }

    // Maneja la selección del archivo
    handleFileSelect(event) {
        // Llamar a handleFileUpload cuando se selecciona un archivo
        this.handleFileUpload();
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
                    
                    // Detectar si es un archivo CSV o Excel basado en la extensión
                    const fileExtension = file.name.split('.').pop().toLowerCase();
                    
                    if (fileExtension === 'csv') {
                        // Procesar como CSV
                        const text = new TextDecoder('utf-8').decode(new Uint8Array(data));
                        const lines = text.split('\n');
                        const jsonData = lines.map(line => line.split(','));
                        resolve(jsonData);
                    } else {
                        // Procesar como Excel (xlsx o xls)
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        
                        // Convertir a array de arrays manteniendo el formato de las celdas
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                            header: 1,
                            raw: false, // Esto mantendrá el formato de las fechas
                            dateNF: 'yyyy-mm-dd' // Formato de fecha deseado
                        });
                        
                        // Filtrar filas vacías
                        const filteredData = jsonData.filter(row => 
                            row.some(cell => cell !== undefined && cell !== null && cell !== '')
                        );
                        
                        resolve(filteredData);
                    }
                } catch (error) {
                    console.error('Error al procesar archivo:', error);
                    reject(new Error('El archivo no es un archivo Excel o CSV válido.'));
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo.'));
            reader.readAsArrayBuffer(file);
        });
    }

    // Valida y formatea los datos del Excel o CSV
    validateAndFormatData(data) {
        if (data.length < 2) {
            throw new Error('El archivo está vacío o no contiene datos válidos.');
        }

        // Obtener los encabezados para identificar las columnas
        const headers = data[0].map(h => String(h || '').toLowerCase().trim());
        
        // Buscar índices de columnas basados en los encabezados
        const emailIndex = this.findColumnIndex(headers, ['email', 'correo', 'correo electrónico', 'e-mail']);
        const subscriptionIndex = this.findColumnIndex(headers, ['tipo de suscripción', 'suscripcion', 'tipo', 'subscription', 'subscriptiontype']);
        const durationIndex = this.findColumnIndex(headers, ['duración', 'duracion', 'vigencia', 'duration']);
        const statusIndex = this.findColumnIndex(headers, ['estado', 'status', 'activo', 'active']);
        
        // Si no se encuentran los encabezados específicos, usar posiciones por defecto
        const useDefaultPositions = emailIndex === -1;
        
        const today = new Date();
        
        return data.slice(1).map((row, index) => {
            // Verificar que la fila tenga al menos una celda con datos
            if (!row || row.length === 0 || !row[0]) return null;
            
            let email, subscriptionType, duration, isActive;
            
            if (useDefaultPositions) {
                // Usar posiciones por defecto (formato simple)
                email = row[0] ? String(row[0]).trim() : '';
                subscriptionType = row.length > 1 ? String(row[1] || '').trim() : '';
                duration = row.length > 2 ? String(row[2] || '').trim() : '';
                
                // Leer estado (activo/inactivo) si está disponible (columna 4)
                isActive = true; // Por defecto activo
                if (row.length > 3 && row[3] !== undefined) {
                    const activeText = String(row[3]).toLowerCase().trim();
                    isActive = !(activeText === 'no' || activeText === 'false' || activeText === '0' || 
                               activeText === 'inactivo' || activeText === 'inactive' || activeText === 'falso');
                }
            } else {
                // Usar posiciones basadas en encabezados
                email = emailIndex >= 0 && row.length > emailIndex ? String(row[emailIndex] || '').trim() : '';
                subscriptionType = subscriptionIndex >= 0 && row.length > subscriptionIndex ? String(row[subscriptionIndex] || '').trim() : '';
                duration = durationIndex >= 0 && row.length > durationIndex ? String(row[durationIndex] || '').trim() : '';
                
                // Parsear estado
                isActive = true; // Por defecto activo
                if (statusIndex >= 0 && row.length > statusIndex && row[statusIndex] !== undefined) {
                    const activeText = String(row[statusIndex]).toLowerCase().trim();
                    isActive = !(activeText === 'no' || activeText === 'false' || activeText === '0' || 
                               activeText === 'inactivo' || activeText === 'inactive' || activeText === 'falso');
                }
            }
            
            // Calcular fechas basadas en la duración
            const dates = this.calculateDates(duration, today);
            
            const user = {
                email: email,
                password: null, // Siempre null para usuarios nuevos
                subscriptionType: subscriptionType,
                startDate: dates.startDate,
                endDate: dates.endDate,
                isActive: isActive,
                selected: true,
                rowIndex: index + 2,
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
    
    // Parsea una fecha en formato de texto
    parseDate(dateText) {
        if (!dateText) return null;
        
        try {
            // Intentar parsear la fecha
            const date = new Date(dateText);
            
            // Verificar si la fecha es válida
            if (isNaN(date.getTime())) {
                // Si no es válida, intentar con formatos comunes en español
                const parts = dateText.split('/');
                if (parts.length === 3) {
                    // Formato DD/MM/YYYY
                    return new Date(parts[2], parts[1] - 1, parts[0]);
                }
                return null;
            }
            
            return date;
        } catch (e) {
            return null;
        }
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
    
    // Formatea una fecha para mostrarla en formato YYYY-MM-DD
    formatDate(date) {
        if (!date) return '-';
        
        if (typeof date === 'string') {
            // Si ya es una cadena, verificar si ya tiene el formato correcto
            if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
                return date.substring(0, 10); // Devolver solo YYYY-MM-DD
            }
            // Intentar convertir la cadena a fecha
            date = new Date(date);
        }
        
        // Verificar si es un objeto Date válido
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return '-';
        }
        
        // Formatear como YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    // Valida los datos de un usuario
    validateUserData(user) {
        if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
            return 'Email inválido';
        }
        if (!user.subscriptionType) {
            return 'Tipo de suscripción es requerido';
        }
        if (!user.startDate || !user.endDate) {
            return 'Fecha de inicio y fin son requeridas';
        }
        return null;
    }

    // Muestra la previsualización de los usuarios a importar
    async showPreview() {
        try {
            if (!this.users || this.users.length === 0) {
                this.showAlert('No hay usuarios para importar', 'warning');
                return;
            }
            
            // Activar modo de depuración
            const debugMode = true;
            if (debugMode) {
                console.log('%c=== MODO DEPURACIÓN ACTIVADO ===', 'background: #f00; color: #fff; padding: 5px;');
                console.log('Usuarios cargados del archivo:', this.users);
            }
            
            this.showLoading('Verificando usuarios existentes...');
            
            // Limpiar selecciones previas
            this.selectedUsers.clear();
            this.previewTableBody.innerHTML = '';
            
            // Obtener todos los emails para buscar usuarios existentes
            const emails = this.users.map(user => user.email).filter(email => email);
            console.log(`Comparando ${emails.length} emails con la lista de usuarios existentes...`);
            
            if (debugMode) {
                console.log('Lista de emails a comparar:', emails);
            }
            
            // Buscar usuarios existentes por email (usando la lista local)
            const existingUsers = await this.userManager.findUsersByEmails(emails);
            console.log(`Se encontraron ${existingUsers.length} usuarios existentes en la lista local`);
            
            if (debugMode) {
                console.log('Usuarios existentes encontrados:', existingUsers);
            }
            
            // Crear un mapa de usuarios existentes por email para facilitar la búsqueda
            const existingUsersMap = {};
            existingUsers.forEach(user => {
                if (user && user.email) {
                    // Usar email en minúsculas y sin espacios para la comparación
                    const emailLower = user.email.toLowerCase().trim();
                    existingUsersMap[emailLower] = user;
                    console.log(`Usuario existente mapeado: ${emailLower} (ID: ${user.id})`);
                }
            });
            
            console.log('Emails de usuarios existentes:', Object.keys(existingUsersMap));
            
            // Actualizar usuarios con información de usuarios existentes
            this.users.forEach(user => {
                if (user && user.email) {
                    // Usar email en minúsculas y sin espacios para la comparación
                    const emailLower = user.email.toLowerCase().trim();
                    const existingUser = existingUsersMap[emailLower];
                    
                    if (existingUser) {
                        console.log(`Usuario encontrado: ${user.email} (ID: ${existingUser.id})`);
                        user.existingUser = existingUser;
                        user.estado = 'Actualizar';
                    } else {
                        console.log(`Usuario nuevo, no existe: ${user.email}`);
                        user.estado = 'Nuevo';
                    }
                }
            });
            
            // Verificar si hay discrepancias
            const nuevosCount = this.users.filter(u => u.estado === 'Nuevo').length;
            const actualizarCount = this.users.filter(u => u.estado === 'Actualizar').length;
            
            console.log(`Resumen de comparación: ${nuevosCount} nuevos, ${actualizarCount} a actualizar`);
            
            // Mostrar información adicional en modo depuración
            if (debugMode) {
                // Crear un botón para mostrar/ocultar información de depuración
                const debugButton = document.createElement('button');
                debugButton.className = 'btn btn-danger mb-3';
                debugButton.textContent = 'Mostrar Información de Depuración';
                debugButton.addEventListener('click', () => {
                    const debugInfo = document.getElementById('debug-info');
                    if (debugInfo.style.display === 'none') {
                        debugInfo.style.display = 'block';
                        debugButton.textContent = 'Ocultar Información de Depuración';
                    } else {
                        debugInfo.style.display = 'none';
                        debugButton.textContent = 'Mostrar Información de Depuración';
                    }
                });
                
                // Crear contenedor para información de depuración
                const debugInfo = document.createElement('div');
                debugInfo.id = 'debug-info';
                debugInfo.className = 'alert alert-danger';
                debugInfo.style.display = 'none';
                
                // Añadir información de depuración
                let debugHtml = '<h4>Información de Depuración</h4>';
                debugHtml += '<h5>Usuarios en archivo:</h5>';
                debugHtml += '<ul>';
                this.users.forEach(user => {
                    debugHtml += `<li>${user.email} - Estado: ${user.estado}</li>`;
                });
                debugHtml += '</ul>';
                
                debugHtml += '<h5>Usuarios encontrados en la lista local:</h5>';
                debugHtml += '<ul>';
                existingUsers.forEach(user => {
                    debugHtml += `<li>${user.email} - ID: ${user.id}</li>`;
                });
                debugHtml += '</ul>';
                
                // Añadir lista completa de usuarios cargados
                debugHtml += '<h5>Lista completa de usuarios en el sistema:</h5>';
                debugHtml += '<ul>';
                this.userManager.users.forEach(user => {
                    debugHtml += `<li>${user.email} - ID: ${user.id}</li>`;
                });
                debugHtml += '</ul>';
                
                debugInfo.innerHTML = debugHtml;
                
                // Insertar elementos de depuración antes de la tabla
                const tableContainer = this.previewTableBody.closest('.table-responsive');
                tableContainer.parentNode.insertBefore(debugButton, tableContainer);
                tableContainer.parentNode.insertBefore(debugInfo, tableContainer);
            }
            
            // Crear encabezados de tabla más similares a la imagen 2
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <th width="50">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="selectAllCheckbox" checked>
                    </div>
                </th>
                <th>Email</th>
                <th>Estado</th>
                <th>Suscripción Actual</th>
                <th>Nueva Suscripción</th>
                <th>Vigencia Actual</th>
                <th>Nueva Vigencia</th>
                <th>Validación</th>
            `;
            
            // Reemplazar encabezados existentes
            const thead = this.previewTableBody.parentElement.querySelector('thead');
            if (thead) {
                thead.innerHTML = '';
                thead.appendChild(headerRow);
            }
            
            // Agregar filas de usuarios
            this.users.forEach((user, index) => {
                if (!user || !user.email) return; // Saltar filas vacías
                
                const row = document.createElement('tr');
                row.className = user.error ? 'table-danger' : '';
                
                // Determinar si hay cambios en los datos
                const existingUser = user.existingUser;
                const subscriptionChanged = existingUser && existingUser.subscriptionType !== user.subscriptionType;
                const datesChanged = existingUser && (
                    existingUser.startDate !== user.startDate || 
                    existingUser.endDate !== user.endDate
                );
                
                row.innerHTML = `
                    <td>
                        <div class="form-check">
                            <input class="form-check-input user-checkbox" type="checkbox" value="${index}" 
                                ${user.selected ? 'checked' : ''} ${user.error ? 'disabled' : ''}>
                        </div>
                    </td>
                    <td>${this.escapeHtml(user.email)}</td>
                    <td>
                        <span class="badge ${user.estado === 'Nuevo' ? 'bg-primary' : 'bg-warning text-dark'}">
                            ${user.estado}
                        </span>
                    </td>
                    <td>${existingUser ? this.escapeHtml(existingUser.subscriptionType || '-') : '-'}</td>
                    <td>${this.escapeHtml(user.subscriptionType)}</td>
                    <td>${existingUser ? (existingUser.startDate ? `${this.formatDate(existingUser.startDate)} - ${this.formatDate(existingUser.endDate)}` : '-') : '-'}</td>
                    <td>${this.formatDate(user.startDate)} - ${this.formatDate(user.endDate)}</td>
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
            
            // Ocultar el indicador de carga
            this.hideLoading();
            
            console.log('Previsualización completada. Usuarios nuevos vs existentes:');
            console.log('- Nuevos:', this.users.filter(u => u.estado === 'Nuevo').length);
            console.log('- Actualizar:', this.users.filter(u => u.estado === 'Actualizar').length);
            console.log('- Con errores:', this.users.filter(u => u.error).length);
        } catch (error) {
            console.error('Error al mostrar previsualización:', error);
            this.hideLoading();
            this.showAlert(`Error al verificar usuarios existentes: ${error.message}`, 'danger');
        }
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
                // Verificar si el usuario ya existe (usando el objeto existingUser que ya tenemos)
                if (user.estado === 'Actualizar' && user.existingUser && user.existingUser.id) {
                    console.log(`Actualizando usuario existente: ${user.email} (ID: ${user.existingUser.id})`);
                    
                    // Usar el ID del usuario existente para la actualización
                    await this.userManager.updateUser({
                        id: user.existingUser.id,  // Asegurarse de incluir el ID
                        email: user.email,
                        subscriptionType: user.subscriptionType,
                        startDate: user.startDate,
                        endDate: user.endDate,
                        isActive: user.isActive !== undefined ? user.isActive : true
                    });
                    
                    console.log(`Usuario actualizado correctamente: ${user.email}`);
                    results.updated++;
                } else {
                    console.log(`Creando nuevo usuario: ${user.email}`);
                    
                    // Crear nuevo usuario
                    await this.userManager.createUser({
                        email: user.email,
                        subscriptionType: user.subscriptionType,
                        startDate: user.startDate,
                        endDate: user.endDate,
                        isActive: user.isActive !== undefined ? user.isActive : true
                    });
                    
                    console.log(`Usuario creado correctamente: ${user.email}`);
                    results.success++;
                }
            } catch (error) {
                console.error(`Error al procesar usuario ${user.email}:`, error);
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
    // La inicialización ahora se maneja en el script de import-users.html
    // para asegurar que la autenticación esté lista
    // window.userImporter = new UserImporter();
});
