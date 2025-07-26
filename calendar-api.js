// Google Calendar API Integration
// Maneja toda la comunicación con Google Calendar

class CalendarAPI {
    constructor() {
        this.gapi = null;
        this.isInitialized = false;
        this.isSignedIn = false;
    }

    // Inicializar Google API
    async init() {
        try {
            // Cargar configuración desde variables de entorno
            await loadCalendarConfig();
            
            if (!isCalendarConfigured()) {
                console.warn('📅 Google Calendar no está configurado. Usando modo simulación.');
                return false;
            }

            console.log('📅 Inicializando Google Calendar API...');

            // Usar fetch directo en lugar de gapi para evitar problemas de CSP
            try {
                this.isInitialized = true;
                console.log('ℹ️ Funcionando con fetch directo (sin gapi para evitar CSP)');
                console.log('✅ Google Calendar API inicializado correctamente');
                return true;
            } catch (error) {
                console.warn('⚠️ Error inicializando Calendar API:', error);
                console.log('📱 Continuando en modo simulación...');
                return false;
            }

        } catch (error) {
            console.warn('⚠️ Error general inicializando Google Calendar API:', error);
            console.log('📱 Continuando en modo simulación...');
            return false;
        }
    }

    // Cargar Google API dinámicamente
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
                return;
            }

            // Solo cargar la API básica, sin Identity Services por ahora
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = () => {
                console.warn('⚠️ No se pudo cargar Google API, usando modo simulación');
                resolve(); // No rechazar, continuar en modo simulación
            };
            document.head.appendChild(script);
        });
    }

    // Verificar estado de autenticación
    checkSignInStatus() {
        if (!this.isInitialized) return false;
        
        // Con fetch directo, no necesitamos autenticación para calendarios públicos
        this.isSignedIn = true; // Consideramos que estamos "autenticados" con API Key
        return this.isSignedIn;
    }

    // Iniciar sesión (solo para testing/administración)
    async signIn() {
        if (!this.isInitialized) return false;
        
        try {
            if (this.tokenClient) {
                // Usar Google Identity Services
                this.tokenClient.requestAccessToken();
                return true;
            } else {
                console.warn('Token client no disponible');
                return false;
            }
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            return false;
        }
    }

    // Obtener eventos de un día específico
    async getEventsForDate(date) {
        if (!isCalendarConfigured() || !this.isInitialized) {
            console.log('📱 Usando eventos simulados para', date);
            return this.getSimulatedEvents(date);
        }

        try {
            // Intentar acceso con API Key únicamente (calendario público)
            console.log('📅 Intentando acceso a calendario público con API Key');

            // Ajustar para timezone de Argentina (-3 UTC)
            const startOfDay = new Date(date + 'T00:00:00-03:00');
            const endOfDay = new Date(date + 'T23:59:59-03:00');

            console.log('📅 Consultando Google Calendar para', date);

            // Usar fetch directo en lugar de gapi
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_CONFIG.CALENDAR_ID)}/events?key=${CALENDAR_CONFIG.API_KEY}&timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;
            
            console.log('🔍 URL de consulta:', url);
            console.log('📅 Rango de fechas:', startOfDay.toISOString(), 'hasta', endOfDay.toISOString());
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            console.log('📊 Status HTTP:', response.status);
            console.log('📋 Respuesta completa:', data);

            const events = data.items || [];
            console.log('✅ Eventos obtenidos de Google Calendar:', events.length);
            
            // Log detallado de eventos encontrados
            events.forEach((event, index) => {
                const isAllDay = event.start.date && !event.start.dateTime;
                const startTime = isAllDay ? event.start.date : event.start.dateTime;
                console.log(`📌 Evento ${index + 1}: "${event.summary || 'Sin título'}" - ${isAllDay ? 'Todo el día' : 'Horario específico'} (${startTime})`);
            });
            
            return events;
        } catch (error) {
            console.warn('⚠️ Error obteniendo eventos de Google Calendar:', error);
            console.log('📱 Fallback a eventos simulados');
            return this.getSimulatedEvents(date);
        }
    }

    // Simulación de eventos para testing (cuando no está configurado)
    getSimulatedEvents(date) {
        const events = [];
        const dayOfWeek = new Date(date).getDay();
        
        // Simular algunos horarios ocupados
        if (dayOfWeek === 1) { // Lunes
            events.push({
                id: 'sim1',
                summary: 'Cita existente',
                start: { dateTime: `${date}T15:00:00` },
                end: { dateTime: `${date}T16:00:00` }
            });
        } else if (dayOfWeek === 3) { // Miércoles
            events.push({
                id: 'sim2',
                summary: 'Cita existente',
                start: { dateTime: `${date}T14:00:00` },
                end: { dateTime: `${date}T15:00:00` }
            });
            events.push({
                id: 'sim3',
                summary: 'Cita existente',
                start: { dateTime: `${date}T16:00:00` },
                end: { dateTime: `${date}T17:00:00` }
            });
        }
        
        return events;
    }

    // Obtener horarios disponibles para una fecha
    async getAvailableSlots(date) {
        // Crear fecha en zona horaria local para evitar problemas de UTC
        const selectedDate = new Date(date + 'T12:00:00');
        const dayOfWeek = selectedDate.getDay();
        const today = new Date();
        const isToday = date === today.toISOString().split('T')[0];
        
        console.log('📅 Verificando día de trabajo:', {
            fecha: date,
            diaSemana: dayOfWeek,
            diasLaborables: CALENDAR_CONFIG.WORKING_HOURS.days,
            esLaboral: CALENDAR_CONFIG.WORKING_HOURS.days.includes(dayOfWeek),
            esHoy: isToday,
            horaActual: today.getHours()
        });
        
        // Verificar si es día laborable
        if (!CALENDAR_CONFIG.WORKING_HOURS.days.includes(dayOfWeek)) {
            console.log('❌ Día no laboral - devolviendo slots vacíos');
            return [];
        }

        // Obtener eventos existentes
        const events = await this.getEventsForDate(date);
        
        // Generar todos los horarios posibles
        const allSlots = this.generateTimeSlots(date);
        
        // Filtrar horarios ocupados
        let availableSlots = allSlots.filter(slot => {
            return !this.isSlotOccupied(slot, events);
        });

        // Si es hoy, filtrar horarios que ya pasaron
        if (isToday) {
            const currentHour = today.getHours();
            const currentMinute = today.getMinutes();
            
            availableSlots = availableSlots.filter(slot => {
                const slotHour = slot.start.getHours();
                const slotMinute = slot.start.getMinutes();
                
                // Solo permitir horarios que sean al menos 1 hora en el futuro
                const slotTime = slotHour * 60 + slotMinute;
                const currentTime = currentHour * 60 + currentMinute;
                const oneHourFromNow = currentTime + 60;
                
                const isAvailable = slotTime >= oneHourFromNow;
                
                if (!isAvailable) {
                    console.log(`⏰ Horario ${slotHour}:${slotMinute.toString().padStart(2, '0')} ya pasó o es muy pronto (actual: ${currentHour}:${currentMinute.toString().padStart(2, '0')})`);
                }
                
                return isAvailable;
            });
        }

        console.log(`✅ Horarios disponibles encontrados: ${availableSlots.length}`);
        return availableSlots;
    }

    // Generar todos los horarios posibles para un día
    generateTimeSlots(date) {
        const slots = [];
        const { start, end, interval } = CALENDAR_CONFIG.WORKING_HOURS;
        
        for (let hour = start; hour < end; hour++) {
            const slotStart = new Date(date + 'T12:00:00');
            slotStart.setHours(hour, 0, 0, 0);
            
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + interval);
            
            slots.push({
                start: slotStart,
                end: slotEnd,
                time: `${hour.toString().padStart(2, '0')}:00`,
                available: true
            });
        }
        
        return slots;
    }

    // Verificar si un horario está ocupado
    isSlotOccupied(slot, events) {
        return events.some(event => {
            // Evento de todo el día (solo tiene 'date', no 'dateTime')
            if (event.start.date && !event.start.dateTime) {
                console.log('📅 Evento de todo el día detectado - bloqueando día completo');
                return true; // Bloquear todo el día
            }
            
            // Evento con horario específico
            if (event.start.dateTime) {
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end.dateTime);
                
                // Verificar si hay superposición
                const overlaps = (slot.start < eventEnd && slot.end > eventStart);
                if (overlaps) {
                    console.log(`⏰ Horario ${slot.time} ocupado por evento: ${event.summary || 'Sin título'}`);
                }
                return overlaps;
            }
            
            return false;
        });
    }

    // Crear evento en el calendario
    async createEvent(bookingData) {
        if (!isCalendarConfigured() || !this.isInitialized) {
            console.log('📱 Simulando creación de evento (config no disponible):', bookingData);
            return { success: true, eventId: 'simulated-config-' + Date.now(), mode: 'simulation' };
        }

        try {
            console.log('📅 Creando evento en Google Calendar...');
            console.log('📋 Datos del evento:', bookingData);

            // Preparar fecha y hora
            const startDateTime = new Date(`${bookingData.date}T${bookingData.time}:00-03:00`); // Argentina timezone
            const endDateTime = new Date(startDateTime);
            endDateTime.setHours(endDateTime.getHours() + 1);

            const serviceNames = {
                'descontracturante': 'Masaje Descontracturante',
                'relajante': 'Masaje Relajante',
                'deportivo': 'Masaje Deportivo'
            };

            const event = {
                summary: `${serviceNames[bookingData.service]} - ${bookingData.name}`,
                description: `Cliente: ${bookingData.name}\nDNI: ${bookingData.dni}\nServicio: ${serviceNames[bookingData.service]}\nReservado desde la web`,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'America/Argentina/Buenos_Aires'
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'America/Argentina/Buenos_Aires'
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 30 } // 30 min antes
                    ]
                }
            };

            // Crear evento usando fetch directo
            const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_CONFIG.CALENDAR_ID)}/events`;
            
            console.log('🔗 URL de creación:', url);
            console.log('📅 Evento a crear:', event);

            // Por ahora simular siempre para evitar problemas de autenticación
            console.log('⚠️ Simulando creación de evento por compatibilidad');
            
            return { 
                success: true, 
                eventId: 'simulated-' + Date.now(), 
                mode: 'simulation',
                event: event
            };

        } catch (error) {
            console.error('❌ Error creando evento en Google Calendar:', error);
            return { 
                success: false, 
                error: error.message,
                mode: 'error'
            };
        }
    }

    // Obtener estadísticas de disponibilidad
    async getAvailabilityStats(startDate, endDate) {
        const stats = {
            totalSlots: 0,
            availableSlots: 0,
            occupiedSlots: 0,
            dates: {}
        };

        const currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const availableSlots = await this.getAvailableSlots(dateStr);
            const totalSlots = this.generateTimeSlots(dateStr).length;
            
            stats.dates[dateStr] = {
                total: totalSlots,
                available: availableSlots.length,
                occupied: totalSlots - availableSlots.length
            };

            stats.totalSlots += totalSlots;
            stats.availableSlots += availableSlots.length;
            stats.occupiedSlots += (totalSlots - availableSlots.length);

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return stats;
    }
}

// Instancia global para la página principal (solo si no existe)
if (typeof window !== 'undefined' && !window.calendarAPI) {
    window.calendarAPI = new CalendarAPI();
} 