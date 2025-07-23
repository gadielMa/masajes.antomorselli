// Configuración de Google Calendar API
// Para configurar esto, Antonella necesitará:
// 1. Ir a https://console.cloud.google.com/
// 2. Crear un nuevo proyecto o usar uno existente
// 3. Habilitar Google Calendar API
// 4. Crear credenciales (API Key + OAuth 2.0)
// 5. Reemplazar los valores aquí

// 🔄 Configuración dinámica que se carga desde variables de entorno
let CALENDAR_CONFIG = {
    // Se cargarán dinámicamente desde .env (local) o producción
    API_KEY: '', 
    CLIENT_ID: '', 
    CALENDAR_ID: '',
    
    // Configuración de horarios de trabajo
    WORKING_HOURS: {
        start: 14, // 2 PM
        end: 17,   // 5 PM
        interval: 60, // 60 minutos por sesión
        days: [1, 2, 3, 4, 5] // Lunes a Viernes (0=Domingo, 1=Lunes, etc.)
    },
    
    // Configuración de la API
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar'
};

// Cargar configuración desde variables de entorno
async function loadCalendarConfig() {
    await envLoader.loadEnv();
    
    CALENDAR_CONFIG.API_KEY = envLoader.get('GOOGLE_API_KEY');
    CALENDAR_CONFIG.CLIENT_ID = envLoader.get('GOOGLE_CLIENT_ID');
    CALENDAR_CONFIG.CALENDAR_ID = envLoader.get('GOOGLE_CALENDAR_ID');
    
    console.log('📅 Configuración de Calendar cargada:', {
        API_KEY: CALENDAR_CONFIG.API_KEY ? '✅ Configurada' : '❌ Faltante',
        CLIENT_ID: CALENDAR_CONFIG.CLIENT_ID ? '✅ Configurada' : '❌ Faltante',
        CALENDAR_ID: CALENDAR_CONFIG.CALENDAR_ID || '❌ Faltante'
    });
}

// Función para verificar si la configuración está completa
function isCalendarConfigured() {
    return CALENDAR_CONFIG.API_KEY && 
           CALENDAR_CONFIG.CLIENT_ID &&
           CALENDAR_CONFIG.CALENDAR_ID &&
           !CALENDAR_CONFIG.API_KEY.includes('TU_') &&
           !CALENDAR_CONFIG.CLIENT_ID.includes('TU_');
}

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CALENDAR_CONFIG;
} 