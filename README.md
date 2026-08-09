# 💆‍♀️ Masajes Antonella Morselli

Sitio web profesional para reservas de masajes terapéuticos.

## 🚀 Arquitectura actual

El frontend es estático y se puede publicar en GitHub Pages, Vercel o cualquier hosting estático.
El backend se prepara con Supabase Edge Functions y Supabase Database.

## 🔐 Configurar Supabase

1. Crear un proyecto en [Supabase](https://supabase.com/).
2. Ejecutar `supabase/migrations/20260808000000_create_bookings.sql` desde el SQL Editor.
3. Copiar la URL del proyecto y la `anon key` en `supabase-config.js`.
4. Configurar estas variables como secretos de las Edge Functions:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SERVICE_ROLE_KEY=tu_service_role_key
MERCADOPAGO_ACCESS_TOKEN=tu_access_token
GOOGLE_SERVICE_ACCOUNT_JSON=pendiente_de_configurar
GOOGLE_CALENDAR_ID=tu_calendario
```

5. Desplegar las funciones de `supabase/functions/` con Supabase CLI.

La `service_role key`, el access token de Mercado Pago y las credenciales de Google nunca deben ir en el frontend.

## 🚀 Deploy del frontend

### 1. Configurar Variables de Entorno

En el dashboard de Vercel, configura estas variables:

```bash
GOOGLE_API_KEY=tu_api_key_real
GOOGLE_CLIENT_ID=tu_client_id_real.apps.googleusercontent.com  
GOOGLE_CALENDAR_ID=tu_calendar_id_real@group.calendar.google.com
MERCADOPAGO_LINK=https://mpago.la/tu_link_real
WHATSAPP_PHONE=5491112345678
```

### 2. Deploy Automático

1. Conecta tu repositorio a Vercel
2. Las variables de entorno se configuran automáticamente
3. El sitio se deploya automáticamente en cada push

## 🔧 Desarrollo Local

1. Crea archivo `.env` basado en `.env.example`
2. Completa con tus credenciales reales
3. Abre `index.html` en un servidor local

## 📁 Estructura del Proyecto

```
├── index.html          # Página principal
├── exito.html          # Página de confirmación
├── styles.css          # Estilos CSS
├── script.js           # Funcionalidad JavaScript
├── calendar-api.js     # API de Google Calendar
├── calendar-config.js  # Configuración del calendario
├── env-loader.js       # Cargador de variables de entorno
├── anto.png           # Logo/imagen
├── .env.example       # Ejemplo de variables de entorno
└── vercel.json        # Configuración de Vercel
```

## 🔐 Seguridad

- ❌ NO subas archivos `.env` o credenciales JSON
- ✅ Usa variables de entorno de Vercel
- ✅ Todos los datos sensibles están protegidos

## 👥 Usuarios y roles

La aplicación usa dos tipos de acceso:

- **Administradoras / masajistas:** usuarios de Supabase Auth con `profiles.role = 'admin'`. Pueden gestionar los horarios del negocio desde un futuro panel privado.
- **Clientes:** pueden reservar, consultar y cancelar como invitados. No necesitan crear una cuenta.

La migración `20260809000000_add_profiles_and_business_hours.sql` crea los perfiles, roles, permisos RLS y horarios editables por día. Los horarios iniciales son lunes a viernes de 14:00 a 17:00, con turnos de 60 minutos.

La migración `20260809000001_add_multi_business_model.sql` agrega el modelo comercial multi-negocio. Cada cuenta tiene un `business` propio y el frontend selecciona el negocio mediante `SUPABASE_CONFIG.BUSINESS_SLUG`. El negocio inicial es `antonella-morselli`.

Para habilitar una administradora:

1. Crear el usuario desde Supabase Dashboard > Authentication > Users.
2. Ejecutar en el SQL Editor: `update public.profiles set role = 'admin' where id = 'UUID_DEL_USUARIO';`

Supabase es la fuente oficial de reservas y disponibilidad. Google Calendar será una proyección visual sincronizada por backend después de la confirmación del pago.

Para dar de alta una nueva masajista desde el futuro panel, la plataforma deberá crear el usuario de Auth, crear su negocio, asociarlo en `business_members` y asignarle el rol `admin`. Los clientes seguirán reservando sin autenticarse.

## 📞 Funcionalidades

- ✅ Reserva de turnos online
- ✅ Integración con Google Calendar
- ✅ Pagos con Mercado Pago
- ✅ Notificaciones por WhatsApp
- ✅ Consulta y cancelación de turnos
- ✅ Diseño responsive

---

Desarrollado para Antonella Morselli - Masajista Profesional
