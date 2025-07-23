// 🔐 Cargador de Variables de Entorno
// Funciona tanto en desarrollo local como en producción

class EnvLoader {
    constructor() {
        this.env = {};
        this.isProduction = window.location.hostname !== 'localhost';
    }

    // Cargar variables de entorno
    async loadEnv() {
        if (this.isProduction) {
            // En producción: usar variables hardcodeadas (GitHub Pages no soporta .env)
            return this.loadProductionEnv();
        } else {
            // En desarrollo: intentar cargar desde .env
            return this.loadLocalEnv();
        }
    }

    // Variables para producción (GitHub Pages)
    loadProductionEnv() {
        this.env = {
            GOOGLE_API_KEY: 'TU_API_KEY_AQUI',
            GOOGLE_CLIENT_ID: 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
            GOOGLE_CALENDAR_ID: 'tu_email@gmail.com',
            MERCADOPAGO_LINK: 'https://mpago.la/tu_link_aqui',
            WHATSAPP_PHONE: '54911xxxxxxxx',
            BANK_NAME: 'Tu_Banco',
            BANK_CBU: 'tu_cbu_aqui',
            BANK_OWNER: 'Tu Nombre Completo'
        };
        console.log('🌍 Variables de producción cargadas');
        return true;
    }

    // Cargar desde archivo .env local
    async loadLocalEnv() {
        try {
            const response = await fetch('/.env');
            if (!response.ok) {
                console.warn('⚠️ No se encontró archivo .env, usando valores por defecto');
                return this.loadDefaultEnv();
            }

            const envText = await response.text();
            this.parseEnvFile(envText);
            console.log('📁 Variables locales cargadas desde .env');
            return true;
        } catch (error) {
            console.warn('⚠️ Error cargando .env:', error.message);
            return this.loadDefaultEnv();
        }
    }

    // Parsear archivo .env
    parseEnvFile(envText) {
        const lines = envText.split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            
            // Ignorar comentarios y líneas vacías
            if (line.startsWith('#') || !line.includes('=')) {
                return;
            }

            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=').trim();
            
            if (key && value) {
                this.env[key] = value;
            }
        });
    }

    // Variables por defecto (fallback)
    loadDefaultEnv() {
        this.env = {
            GOOGLE_API_KEY: 'TU_API_KEY_AQUI',
            GOOGLE_CLIENT_ID: 'TU_CLIENT_ID_AQUI',
            GOOGLE_CALENDAR_ID: 'tu_email@gmail.com',
            MERCADOPAGO_LINK: 'https://mpago.la/tu_link_aqui',
            WHATSAPP_PHONE: '54911xxxxxxxx',
            BANK_NAME: 'Tu_Banco',
            BANK_CBU: 'tu_cbu_aqui',
            BANK_OWNER: 'Tu Nombre'
        };
        console.log('🔧 Variables por defecto cargadas');
        return false;
    }

    // Obtener variable de entorno
    get(key) {
        return this.env[key] || '';
    }

    // Verificar si las variables están configuradas
    isConfigured() {
        const requiredVars = ['GOOGLE_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CALENDAR_ID'];
        return requiredVars.every(key => {
            const value = this.get(key);
            return value && !value.includes('TU_') && !value.includes('tu_');
        });
    }

    // Obtener todas las variables
    getAll() {
        return { ...this.env };
    }
}

// Instancia global
const envLoader = new EnvLoader(); 