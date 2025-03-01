class SharePointGraph {
    constructor(auth) {
        this.auth = auth;
        this.baseUrl = "https://graph.microsoft.com/v1.0";
        this.siteId = null;
        this.listId = null;
        
        // Configuración del sitio de SharePoint con los valores correctos
        this.tenantName = "ldcigroup";
        this.sitePath = "/sites/InstaladoresWindowsC";
        this.listName = "Usuarios";
        
        // ID de lista conocido (usar si los métodos de descubrimiento fallan)
        this.knownListId = "3d452065-b0e1-4f9b-932b-36212fac8632";
    }
    
    async initialize() {
        try {
            this.siteId = await this.getSiteId();
            this.listId = await this.getListId();
            console.log("SharePoint Graph inicializado correctamente");
            console.log("Site ID:", this.siteId);
            console.log("List ID:", this.listId);
            return true;
        } catch (error) {
            console.error("Error al inicializar SharePoint Graph:", error);
            throw error;
        }
    }
    
    async getSiteId() {
        if (this.siteId) return this.siteId;
        
        try {
            console.log("Intentando obtener el ID del sitio de SharePoint...");
            
            // Método 1: Obtener por ruta relativa
            try {
                console.log(`Método 1: Intentando con ${this.baseUrl}/sites/${this.tenantName}:${this.sitePath}`);
                const response = await this.makeGraphRequest(
                    `${this.baseUrl}/sites/${this.tenantName}:${this.sitePath}`
                );
                console.log("Método 1 exitoso:", response);
                return response.id;
            } catch (error) {
                console.log("Método 1 falló:", error.message);
            }
            
            // Método 2: Obtener por nombre de host y ruta relativa
            try {
                console.log(`Método 2: Intentando con ${this.baseUrl}/sites/${this.tenantName}.sharepoint.com:${this.sitePath}`);
                const response = await this.makeGraphRequest(
                    `${this.baseUrl}/sites/${this.tenantName}.sharepoint.com:${this.sitePath}`
                );
                console.log("Método 2 exitoso:", response);
                return response.id;
            } catch (error) {
                console.log("Método 2 falló:", error.message);
            }
            
            // Método 3: Buscar el sitio por nombre
            try {
                console.log(`Método 3: Intentando con ${this.baseUrl}/sites?search=InstaladoresWindowsC`);
                const response = await this.makeGraphRequest(
                    `${this.baseUrl}/sites?search=InstaladoresWindowsC`
                );
                console.log("Respuesta de búsqueda:", response);
                if (response.value && response.value.length > 0) {
                    console.log("Método 3 exitoso:", response.value[0]);
                    return response.value[0].id;
                }
            } catch (error) {
                console.log("Método 3 falló:", error.message);
            }
            
            // Método 4: Obtener sitio raíz y navegar
            try {
                console.log(`Método 4: Intentando obtener sitio raíz`);
                const rootResponse = await this.makeGraphRequest(
                    `${this.baseUrl}/sites/root`
                );
                console.log("Sitio raíz:", rootResponse);
                
                // Intentar listar todos los sitios
                const sitesResponse = await this.makeGraphRequest(
                    `${this.baseUrl}/sites?search=*`
                );
                console.log("Todos los sitios disponibles:", sitesResponse);
                
                if (sitesResponse.value && sitesResponse.value.length > 0) {
                    // Buscar el sitio que contenga "InstaladoresWindowsC" en su nombre o URL
                    const targetSite = sitesResponse.value.find(site => 
                        site.name.includes("InstaladoresWindowsC") || 
                        (site.webUrl && site.webUrl.includes("InstaladoresWindowsC"))
                    );
                    
                    if (targetSite) {
                        console.log("Sitio encontrado en la lista:", targetSite);
                        return targetSite.id;
                    }
                }
            } catch (error) {
                console.log("Método 4 falló:", error.message);
            }
            
            // Si todos los métodos fallan, lanzar error
            throw new Error("No se pudo encontrar el sitio de SharePoint. Verifica la configuración y los permisos.");
            
        } catch (error) {
            console.error("Error al obtener el ID del sitio:", error);
            throw new Error(`Error al obtener el ID del sitio: ${error.message}`);
        }
    }
    
    async getListId() {
        if (this.listId) return this.listId;
        
        try {
            // Si tenemos un ID de lista conocido, usarlo directamente
            if (this.knownListId) {
                console.log("Usando ID de lista conocido:", this.knownListId);
                this.listId = this.knownListId;
                return this.knownListId;
            }
            
            // Asegurarse de que tenemos el ID del sitio
            if (!this.siteId) {
                this.siteId = await this.getSiteId();
            }
            
            // Obtener la lista por nombre
            console.log(`Buscando lista "${this.listName}" en el sitio ${this.siteId}`);
            const response = await this.makeGraphRequest(
                `${this.baseUrl}/sites/${this.siteId}/lists?$filter=displayName eq '${this.listName}'`
            );
            
            console.log("Respuesta de búsqueda de lista:", response);
            
            if (response.value && response.value.length > 0) {
                return response.value[0].id;
            }
            
            // Si no se encuentra por nombre, intentar listar todas las listas
            console.log("Lista no encontrada por nombre, listando todas las listas...");
            const allListsResponse = await this.makeGraphRequest(
                `${this.baseUrl}/sites/${this.siteId}/lists`
            );
            
            console.log("Todas las listas disponibles:", allListsResponse);
            
            if (allListsResponse.value && allListsResponse.value.length > 0) {
                // Usar la primera lista como fallback
                console.log("Usando la primera lista disponible:", allListsResponse.value[0]);
                return allListsResponse.value[0].id;
            }
            
            throw new Error(`Lista "${this.listName}" no encontrada`);
        } catch (error) {
            console.error("Error al obtener el ID de la lista:", error);
            throw new Error(`Error al obtener el ID de la lista: ${error.message}`);
        }
    }
    
    async getUsers() {
        try {
            // Asegurarse de que tenemos los IDs necesarios
            if (!this.siteId) {
                this.siteId = await this.getSiteId();
            }
            
            if (!this.listId) {
                this.listId = await this.getListId();
            }
            
            console.log(`Obteniendo usuarios de la lista ${this.listId} en el sitio ${this.siteId}`);
            
            // Obtener los elementos de la lista
            const response = await this.makeGraphRequest(
                `${this.baseUrl}/sites/${this.siteId}/lists/${this.listId}/items?expand=fields`
            );
            
            console.log("Respuesta de elementos de la lista:", response);
            
            if (response.value) {
                // Transformar los elementos en objetos de usuario
                return response.value.map(item => {
                    const fields = item.fields;
                    return {
                        id: item.id,
                        username: fields.Title || fields.Username || "Sin nombre",
                        email: fields.Email || "",
                        role: fields.Role || "User",
                        status: fields.Status || "Active",
                        lastLogin: fields.LastLogin || null
                    };
                });
            }
            
            return [];
        } catch (error) {
            console.error("Error al obtener usuarios:", error);
            throw new Error(`Error al obtener usuarios: ${error.message}`);
        }
    }
    
    async createUser(userData) {
        try {
            // Asegurarse de que tenemos los IDs necesarios
            if (!this.siteId) {
                this.siteId = await this.getSiteId();
            }
            
            if (!this.listId) {
                this.listId = await this.getListId();
            }
            
            // Preparar los campos para el nuevo elemento
            const fields = {
                Title: userData.username,
                Email: userData.email,
                Role: userData.role || "User",
                Status: userData.status || "Active"
            };
            
            // Crear el elemento en la lista
            const response = await this.makeGraphRequest(
                `${this.baseUrl}/sites/${this.siteId}/lists/${this.listId}/items`,
                'POST',
                { fields }
            );
            
            return {
                id: response.id,
                ...userData
            };
        } catch (error) {
            console.error("Error al crear usuario:", error);
            throw new Error(`Error al crear usuario: ${error.message}`);
        }
    }
    
    async updateUser(userId, userData) {
        try {
            // Asegurarse de que tenemos los IDs necesarios
            if (!this.siteId) {
                this.siteId = await this.getSiteId();
            }
            
            if (!this.listId) {
                this.listId = await this.getListId();
            }
            
            // Preparar los campos para actualizar
            const fields = {
                Title: userData.username,
                Email: userData.email,
                Role: userData.role,
                Status: userData.status
            };
            
            // Actualizar el elemento en la lista
            await this.makeGraphRequest(
                `${this.baseUrl}/sites/${this.siteId}/lists/${this.listId}/items/${userId}`,
                'PATCH',
                { fields }
            );
            
            return {
                id: userId,
                ...userData
            };
        } catch (error) {
            console.error("Error al actualizar usuario:", error);
            throw new Error(`Error al actualizar usuario: ${error.message}`);
        }
    }
    
    async deleteUser(userId) {
        try {
            // Asegurarse de que tenemos los IDs necesarios
            if (!this.siteId) {
                this.siteId = await this.getSiteId();
            }
            
            if (!this.listId) {
                this.listId = await this.getListId();
            }
            
            // Eliminar el elemento de la lista
            await this.makeGraphRequest(
                `${this.baseUrl}/sites/${this.siteId}/lists/${this.listId}/items/${userId}`,
                'DELETE'
            );
            
            return true;
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            throw new Error(`Error al eliminar usuario: ${error.message}`);
        }
    }
    
    async makeGraphRequest(url, method = 'GET', data = null) {
        try {
            const token = await this.auth.getAccessToken();
            
            const options = {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };
            
            if (data && (method === 'POST' || method === 'PATCH')) {
                options.body = JSON.stringify(data);
            }
            
            console.log(`Realizando solicitud ${method} a: ${url}`);
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error en solicitud (${response.status}):`, errorText);
                throw new Error(`${response.status} ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("Error en solicitud Graph API:", error);
            throw error;
        }
    }
} 