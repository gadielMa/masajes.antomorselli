# 📅 Configuración Google Calendar para Antonella Morselli

## 🎯 **¿Qué hace esta integración?**

✅ **Gestión automática de turnos**
- Verifica disponibilidad en tiempo real
- Bloquea horarios automáticamente tras el pago
- Crea eventos con datos del cliente
- Sincroniza con tu Google Calendar personal

✅ **Beneficios para Antonella**
- No más dobles reservas
- Gestión desde tu Google Calendar
- Recordatorios automáticos
- Historial completo de clientes

## 🚀 **Pasos de Configuración (15 minutos)**

### **Paso 1: Google Cloud Console**

1. **Ir a:** https://console.cloud.google.com/
2. **Crear proyecto nuevo:**
   - Click "Seleccionar proyecto" → "Proyecto nuevo"
   - Nombre: "Masajes Antonella"
   - Click "Crear"

### **Paso 2: Habilitar Google Calendar API**

1. **En el panel izquierdo:** "APIs y servicios" → "Biblioteca"
2. **Buscar:** "Google Calendar API"
3. **Click** en "Google Calendar API"
4. **Click** "HABILITAR"

### **Paso 3: Crear Credenciales**

**A) Crear API Key:**
1. "APIs y servicios" → "Credenciales"
2. Click "CREAR CREDENCIALES" → "Clave de API"
3. **Copiar la API Key** (la necesitaremos después)
4. Click "RESTRINGIR CLAVE"
5. En "Restricciones de API" → Seleccionar "Google Calendar API"
6. Click "GUARDAR"

**B) Crear OAuth 2.0:**
1. Click "CREAR CREDENCIALES" → "ID de cliente de OAuth 2.0"
2. Si aparece pantalla de consentimiento → "CONFIGURAR PANTALLA DE CONSENTIMIENTO"
   - Tipo: "Externo"
   - Nombre de la aplicación: "Masajes Antonella"
   - Email de asistencia: tu email
   - Email de contacto: tu email
   - Click "GUARDAR Y CONTINUAR"
   - Scopes: Click "GUARDAR Y CONTINUAR" (sin agregar ninguno)
   - Usuarios de prueba: Agregar tu email
   - Click "GUARDAR Y CONTINUAR"
3. Volver a "Credenciales" → "CREAR CREDENCIALES" → "ID de cliente de OAuth 2.0"
4. Tipo de aplicación: "Aplicación web"
5. Nombre: "Masajes Antonella Web"
6. **Orígenes autorizados:** 
   - http://localhost:8000
   - https://tu-dominio-final.com (cuando tengas dominio)
7. Click "CREAR"
8. **Copiar el "ID de cliente"** (lo necesitaremos después)

### **Paso 4: Configurar el Código**

1. **Abrir el archivo:** `calendar-config.js`
2. **Reemplazar los valores:**

```javascript
const CALENDAR_CONFIG = {
    // Pegar aquí tu API Key del Paso 3A
    API_KEY: 'tu-api-key-aqui',
    
    // Pegar aquí tu Client ID del Paso 3B
    CLIENT_ID: 'tu-client-id-aqui',
    
    // Tu email de Google (donde quieres recibir las citas)
    CALENDAR_ID: 'antonella@gmail.com', // Cambiar por tu email real
    
    // El resto NO TOCAR
    WORKING_HOURS: {
        start: 14,
        end: 17,
        interval: 60,
        days: [1, 2, 3, 4, 5]
    },
    
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/calendar'
};
```

3. **Guardar el archivo**

### **Paso 5: Compartir el Calendario**

1. **Abrir Google Calendar:** https://calendar.google.com/
2. **Crear calendario nuevo** (opcional, recomendado):
   - En la barra lateral → "+" junto a "Otros calendarios"
   - "Crear calendario nuevo"
   - Nombre: "Masajes - Clientes"
   - Descripción: "Turnos de masajes"
   - Click "Crear calendario"
3. **Si creaste calendario nuevo:** Usar ese email en CALENDAR_ID

## 🧪 **Testing**

### **Modo Simulación (Actual)**
- Funciona SIN configurar Google Calendar
- Simula horarios ocupados para testing
- Lunes: 15:00 ocupado
- Miércoles: 14:00 y 16:00 ocupados

### **Después de Configurar**
- Conecta con tu Google Calendar real
- Muestra disponibilidad real
- Crea eventos automáticamente

## 🎯 **Funcionalidades Incluidas**

### **Para los Clientes**
✅ Solo ven horarios disponibles
✅ No pueden reservar horarios ocupados
✅ Contador de turnos disponibles
✅ Interface visual clara

### **Para Antonella**
✅ Eventos automáticos en Google Calendar
✅ Datos completos del cliente
✅ Recordatorios automáticos
✅ Sincronización en tiempo real

### **Información del Evento**
```
Título: Masaje Relajante - María Fernández
Descripción:
Cliente: María Fernández
DNI: 12345678
Servicio: Masaje Relajante
Pago confirmado vía Mercado Pago

Recordatorios:
- Email 1 día antes
- Popup 30 minutos antes
```

## 🔧 **Soporte**

**Si tienes problemas:**
1. Verificar que las credenciales estén bien copiadas
2. Verificar que el email en CALENDAR_ID sea correcto
3. Probar en modo incógnito del navegador
4. Revisar la consola del navegador (F12) para errores

**El sistema funciona en dos modos:**
- **Sin configurar:** Simulación (actual)
- **Configurado:** Google Calendar real

## 🚀 **Beneficios Finales**

✅ **Gestión profesional** de turnos
✅ **Cero dobles reservas**
✅ **Calendario sincronizado**
✅ **Recordatorios automáticos**
✅ **Historial de clientes**
✅ **Interface moderna** para clientes

¡Tu sitio web se convertirá en un sistema de reservas profesional! 🎉 