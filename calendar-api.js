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
            if (!isCalendarConfigured()) {
                console.warn('Google Calendar no está configurado. Usando modo simulación.');
                return false;
            }

            // Cargar Google API
            await this.loadGoogleAPI();
            
            // Inicializar gapi
            await gapi.load('client:auth2', async () => {
                await gapi.client.init({
                    apiKey: CALENDAR_CONFIG.API_KEY,
                    clientId: CALENDAR_CONFIG.CLIENT_ID,
                    discoveryDocs: [CALENDAR_CONFIG.DISCOVERY_DOC],
                    scope: CALENDAR_CONFIG.SCOPES
                });

                this.isInitialized = true;
                this.checkSignInStatus();
            });

            return true;
        } catch (error) {
            console.error('Error inicializando Google Calendar API:', error);
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

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Verificar estado de autenticación
    checkSignInStatus() {
        if (!this.isInitialized) return false;
        
        const authInstance = gapi.auth2.getAuthInstance();
        this.isSignedIn = authInstance.isSignedIn.get();
        return this.isSignedIn;
    }

    // Iniciar sesión (solo para testing/administración)
    async signIn() {
        if (!this.isInitialized) return false;
        
        try {
            const authInstance = gapi.auth2.getAuthInstance();
            await authInstance.signIn();
            this.isSignedIn = true;
            return true;
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            return false;
        }
    }

    // Obtener eventos de un día específico
    async getEventsForDate(date) {
        if (!isCalendarConfigured()) {
            return this.getSimulatedEvents(date);
        }

        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const response = await gapi.client.calendar.events.list({
                calendarId: CALENDAR_CONFIG.CALENDAR_ID,
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                singleEvents: true,
                orderBy: 'startTime'
            });

            return response.result.items || [];
        } catch (error) {
            console.error('Error obteniendo eventos:', error);
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
        const selectedDate = new Date(date);
        const dayOfWeek = selectedDate.getDay();
        
        // Verificar si es día laborable
        if (!CALENDAR_CONFIG.WORKING_HOURS.days.includes(dayOfWeek)) {
            return [];
        }

        // Obtener eventos existentes
        const events = await this.getEventsForDate(date);
        
        // Generar todos los horarios posibles
        const allSlots = this.generateTimeSlots(date);
        
        // Filtrar horarios ocupados
        const availableSlots = allSlots.filter(slot => {
            return !this.isSlotOccupied(slot, events);
        });

        return availableSlots;
    }

    // Generar todos los horarios posibles para un día
    generateTimeSlots(date) {
        const slots = [];
        const { start, end, interval } = CALENDAR_CONFIG.WORKING_HOURS;
        
        for (let hour = start; hour < end; hour++) {
            const slotStart = new Date(date);
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
            const eventStart = new Date(event.start.dateTime || event.start.date);
            const eventEnd = new Date(event.end.dateTime || event.end.date);
            
            // Verificar si hay superposición
            return (slot.start < eventEnd && slot.end > eventStart);
        });
    }

    // Crear evento en el calendario
    async createEvent(bookingData) {
        if (!isCalendarConfigured()) {
            console.log('Simulando creación de evento:', bookingData);
            return { success: true, eventId: 'simulated-' + Date.now() };
        }

        try {
            const startDateTime = new Date(`${bookingData.date}T${bookingData.time}:00`);
            const endDateTime = new Date(startDateTime);
            endDateTime.setHours(endDateTime.getHours() + 1);

            const serviceNames = {
                'descontracturante': 'Masaje Descontracturante',
                'relajante': 'Masaje Relajante',
                'deportivo': 'Masaje Deportivo'
            };

            const event = {
                summary: `${serviceNames[bookingData.service]} - ${bookingData.name}`,
                description: `Cliente: ${bookingData.name}\nDNI: ${bookingData.dni}\nServicio: ${serviceNames[bookingData.service]}\nPago confirmado vía Mercado Pago`,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'America/Argentina/Buenos_Aires'
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'America/Argentina/Buenos_Aires'
                },
                attendees: [
                    { email: CALENDAR_CONFIG.CALENDAR_ID }
                ],
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 }, // 1 día antes
                        { method: 'popup', minutes: 30 } // 30 min antes
                    ]
                }
            };

            const response = await gapi.client.calendar.events.insert({
                calendarId: CALENDAR_CONFIG.CALENDAR_ID,
                resource: event
            });

            return {
                success: true,
                eventId: response.result.id,
                eventLink: response.result.htmlLink
            };
        } catch (error) {
            console.error('Error creando evento:', error);
            return { success: false, error: error.message };
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

// Instancia global
const calendarAPI = new CalendarAPI(); 