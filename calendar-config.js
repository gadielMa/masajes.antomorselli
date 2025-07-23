// Configuración de Google Calendar API
// Para configurar esto, Antonella necesitará:
// 1. Ir a https://console.cloud.google.com/
// 2. Crear un nuevo proyecto o usar uno existente
// 3. Habilitar Google Calendar API
// 4. Crear credenciales (API Key + OAuth 2.0)
// 5. Reemplazar los valores aquí

const CALENDAR_CONFIG = {
    // API Key de Google Calendar (pública, segura para frontend)
    API_KEY: 'TU_API_KEY_AQUI', // Reemplazar con la API Key real
    
    // Client ID para OAuth 2.0
    CLIENT_ID: 'TU_CLIENT_ID_AQUI', // Reemplazar con el Client ID real
    
    // ID del calendario de Antonella (su email de Google)
    CALENDAR_ID: 'antonella@gmail.com', // Reemplazar con el email real de Antonella
    
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

// Función para verificar si la configuración está completa
function isCalendarConfigured() {
    return CALENDAR_CONFIG.API_KEY !== 'TU_API_KEY_AQUI' && 
           CALENDAR_CONFIG.CLIENT_ID !== 'TU_CLIENT_ID_AQUI' &&
           CALENDAR_CONFIG.CALENDAR_ID !== 'antonella@gmail.com';
}

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CALENDAR_CONFIG;
} 