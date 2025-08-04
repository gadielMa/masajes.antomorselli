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

    // Variables para producción (Vercel)
    loadProductionEnv() {
        this.env = {
            // 📅 Google Calendar - VALORES REALES PARA VERCEL
            GOOGLE_API_KEY: 'AIzaSyAcqD9F9ghAAtQ3dgmHheWIYzVEdhqo3Cc',
            GOOGLE_CLIENT_ID: '1070397058047-24s5qj4hmkl6ia3dvf4hpoqbifaa9aan.apps.googleusercontent.com',
            GOOGLE_CALENDAR_ID: 'gadiel.malagrino@gmail.com',
            
            // 💳 Mercado Pago
            MERCADOPAGO_LINK: 'https://mpago.la/1zx2bg3',
            
            // 📱 WhatsApp
            WHATSAPP_PHONE: '5491140691400'
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
                    // Limpiar saltos de línea y espacios extras
                    this.env[key] = value.replace(/\n/g, '').replace(/\r/g, '').trim();
                }
        });
    }

    // Variables por defecto (fallback)
    loadDefaultEnv() {
        this.env = {
            // 📅 Google Calendar - CONFIGURAR EN .ENV O VARIABLES DE ENTORNO
            GOOGLE_API_KEY: 'TU_API_KEY_AQUI',
            GOOGLE_CLIENT_ID: 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
            GOOGLE_CALENDAR_ID: 'TU_CALENDAR_ID_AQUI@group.calendar.google.com',
            
            // 💳 Mercado Pago
            MERCADOPAGO_LINK: 'https://mpago.la/TU_LINK_AQUI',
            
            // 📱 WhatsApp
            WHATSAPP_PHONE: 'TU_TELEFONO_AQUI'
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