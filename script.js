// Configuración de fechas válidas (Lunes a Viernes)
function isValidDate(date) {
    // Crear nueva fecha con hora específica para evitar problemas de zona horaria
    const localDate = new Date(date.toISOString().split('T')[0] + 'T12:00:00');
    const day = localDate.getDay();
    return day >= 1 && day <= 5; // 1=Lunes, 5=Viernes
}

// Configurar fecha mínima (hoy) y validar días de la semana
function setupDateValidation() {
    // Configurar el input personalizado con Flatpickr
    setupCustomDatePicker();
    
}

// Función helper para obtener la fecha seleccionada
function getSelectedDate() {
    const dateInput = document.getElementById('date');
    return dateInput.getAttribute('data-date') || '';
}

// Configurar el date picker personalizado con Flatpickr
function setupCustomDatePicker() {
    const dateInput = document.getElementById('date');
    
    // Configurar fecha mínima (hoy)
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    
    // Configurar Flatpickr
    const fp = flatpickr(dateInput, {
        locale: "es",
        dateFormat: "Y-m-d",
        minDate: minDate,
        disableMobile: true, // Usar siempre la versión desktop
        allowInput: false,
        clickOpens: true,
        
        // Formato de visualización
        altInput: true,
        altFormat: "l, j \\de F \\de Y", // "lunes, 28 de julio de 2025"
        
        // Personalización
        prevArrow: '<i class="fas fa-chevron-left"></i>',
        nextArrow: '<i class="fas fa-chevron-right"></i>',
        
        // Callback cuando cambia la fecha
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                // Guardar la fecha seleccionada
                dateInput.setAttribute('data-date', dateStr);
                
                // Cargar horarios disponibles
                loadAvailableTimeSlots(dateStr);
            }
        },
        
        // Callback cuando se abre el calendario
        onOpen: function(selectedDates, dateStr, instance) {
            // Agregar clase para personalización adicional
            instance.calendarContainer.classList.add('flatpickr-custom');
        }
    });
    
    // Hacer que el icono también abra el picker
    const dateIcon = document.querySelector('.date-icon');
    if (dateIcon) {
        dateIcon.addEventListener('click', function() {
            fp.open();
        });
    }
}

// Obtener precio según el servicio
function getServicePrice(service) {
    const prices = {
        'descontracturante': 30000,
        'relajante': 25000,
        'deportivo': 35000
    };
    return prices[service] || 0;
}

// Formatear precio
function formatPrice(price) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    }).format(price);
}

// Validar formulario
function validateForm() {
    const name = document.getElementById('name').value.trim();
    const dni = document.getElementById('dni').value.trim();
    const service = document.getElementById('service').value;
    const date = getSelectedDate();
    const time = document.getElementById('time').value;
    
    if (!name || !dni || !service || !date || !time) {
        alert('Por favor, completa todos los campos.');
        return false;
    }
    
    // Validar nombre (solo texto, sin números)
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
        alert('El nombre debe contener solo letras y espacios.');
        return false;
    }
    
    // Validar DNI (solo números, 7-8 dígitos)
    if (!/^\d{7,8}$/.test(dni)) {
        alert('El DNI debe contener entre 7 y 8 dígitos numéricos.');
        return false;
    }
    
    // Validar fecha mínima (no permitir fechas pasadas)
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        alert('No se pueden reservar citas en fechas pasadas.');
        return false;
    }
    
    // Validar fecha - ya no bloqueamos sábados/domingos, solo verificamos disponibilidad
    // if (!isValidDate(selectedDate)) {
    //     alert('Solo se pueden reservar citas de lunes a viernes.');
    //     return false;
    // }
    
    return true;
}

// Formatear fecha para mostrar
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
}

// Mostrar modal de pago
function showPaymentModal() {
    if (!validateForm()) return;
    
    const name = document.getElementById('name').value;
    const dni = document.getElementById('dni').value;
    const service = document.getElementById('service').value;
    const date = getSelectedDate();
    const time = document.getElementById('time').value;
    
    const formattedDate = formatDate(date);
    const price = getServicePrice(service);
    const serviceNames = {
        'descontracturante': 'Masaje Descontracturante',
        'relajante': 'Masaje Relajante',
        'deportivo': 'Masaje Deportivo'
    };
    
    const summary = `
        <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem;">
            <h4 style="color: #2c3e50; margin-bottom: 1rem;">Resumen de la Reserva</h4>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>DNI:</strong> ${dni}</p>
            <p><strong>Servicio:</strong> ${serviceNames[service]}</p>
            <p><strong>Fecha:</strong> ${formattedDate}</p>
            <p><strong>Horario:</strong> ${time}</p>
            <p><strong>Precio:</strong> ${formatPrice(price)}</p>
        </div>
    `;
    
    document.getElementById('paymentSummary').innerHTML = summary;
    document.getElementById('paymentModal').style.display = 'block';
}

// Las credenciales ahora se cargan desde variables de entorno

// Guardar datos de la reserva en localStorage
function saveBookingData() {
    const bookingData = {
        name: document.getElementById('name').value,
        dni: document.getElementById('dni').value,
        service: document.getElementById('service').value,
        date: getSelectedDate(),
        time: document.getElementById('time').value,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('bookingData', JSON.stringify(bookingData));
}

// Procesar pago con Mercado Pago
async function processMercadoPago() {
    try {
        // Mostrar loading
        const mercadoPagoBtn = document.querySelector('[onclick="processMercadoPago()"]');
        const originalText = mercadoPagoBtn.textContent;
        mercadoPagoBtn.textContent = 'Reservando...';
        mercadoPagoBtn.disabled = true;
        
        // Obtener datos de la reserva
        const selectedDate = getSelectedDate();
        console.log('📅 Fecha seleccionada:', selectedDate);
        
        // Validar datos obligatorios
        if (!selectedDate) {
            console.error('❌ No hay fecha seleccionada');
            alert('Por favor selecciona una fecha.');
            mercadoPagoBtn.textContent = originalText;
            mercadoPagoBtn.disabled = false;
            return;
        }
        
        const bookingData = {
            name: document.getElementById('name').value,
            dni: document.getElementById('dni').value,
            service: document.getElementById('service').value,
            date: selectedDate,
            time: document.getElementById('time').value
        };
        
        // Verificar que calendarAPI esté disponible
        if (!window.calendarAPI) {
            console.error('❌ window.calendarAPI no está disponible');
            alert('Sistema de calendario no disponible. Por favor recarga la página e intenta nuevamente.');
            
            // Restaurar botón
            mercadoPagoBtn.textContent = originalText;
            mercadoPagoBtn.disabled = false;
            return;
        }

        // Crear evento en Google Calendar ANTES de ir a Mercado Pago
        console.log('Creando evento en calendario antes del pago...');
        console.log('Datos de la reserva:', bookingData);
        
        const calendarResult = await window.calendarAPI.createEvent(bookingData);
        
        if (calendarResult.success) {
            console.log('✅ Evento procesado:', calendarResult.eventId, `(${calendarResult.mode})`);
            
            // Guardar datos de la reserva
            saveBookingData();
            
            // Obtener URL de Mercado Pago
            const mercadoPagoUrl = envLoader.get('MERCADOPAGO_LINK') || 'https://mpago.la/1g2H3k4J5L';
            
            // Mostrar mensaje según el modo
            if (calendarResult.mode === 'simulation') {
                console.log('📱 Evento simulado - continuando con pago');
            }
            
            // Redirigir a Mercado Pago
            window.location.href = mercadoPagoUrl;
            
        } else {
            console.error('❌ Error creando evento:', calendarResult.error);
            alert('No se pudo procesar la reserva. Por favor intenta nuevamente o contacta a Antonella directamente.');
            
            // Restaurar botón
            mercadoPagoBtn.textContent = originalText;
            mercadoPagoBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('❌ Error en processMercadoPago:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Error message:', error.message);
        
        alert(`Hubo un problema al procesar la reserva: ${error.message}. Por favor intenta nuevamente.`);
        
        // Restaurar botón
        const mercadoPagoBtn = document.querySelector('[onclick="processMercadoPago()"]');
        if (mercadoPagoBtn) {
            mercadoPagoBtn.textContent = 'Pagar con Mercado Pago';
            mercadoPagoBtn.disabled = false;
        }
    }
}



// Procesar pago exitoso
function processSuccessfulPayment() {
    closeModal();
    
    try {
        // Mostrar mensaje de éxito (el evento ya se creó antes del pago)
        alert('¡Pago realizado con éxito! Tu reserva ya está confirmada en el calendario. Se enviará un mensaje de WhatsApp a Antonella.');
        
        // Enviar WhatsApp
        sendWhatsApp();
        
        // Limpiar formulario
        document.getElementById('bookingForm').reset();
        clearTimeSlots();
        
    } catch (error) {
        console.error('Error procesando pago exitoso:', error);
        alert('Pago realizado con éxito. Tu cita ya está reservada.');
        sendWhatsApp();
    }
}

// Enviar mensaje de WhatsApp
function sendWhatsApp() {
    const name = document.getElementById('name').value;
    const dni = document.getElementById('dni').value;
    const service = document.getElementById('service').value;
    const date = getSelectedDate();
    const time = document.getElementById('time').value;
    
    // Formatear fecha para WhatsApp
    const formattedDate = new Date(date).toLocaleDateString('es-ES');
    const serviceNames = {
        'descontracturante': 'Masaje Descontracturante',
        'relajante': 'Masaje Relajante',
        'deportivo': 'Masaje Deportivo'
    };
    
    // Crear mensaje
    const message = `¡Hola Anto! Te acabo de reservar el ${formattedDate} a las ${time}.\nServicio: ${serviceNames[service]}\n${name}\nDNI ${dni}`;
    
    // Número de WhatsApp de Antonella
    const phoneNumber = envLoader.get('WHATSAPP_PHONE') || '5491140691400';
    
    // Crear URL de WhatsApp
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');
}

// Cerrar modal
function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

// Smooth scroll para navegación
function setupSmoothScroll() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Verificar si hay una reserva pendiente y mostrar botón de confirmación
function checkPendingBooking() {
    const bookingData = localStorage.getItem('bookingData');
    const paymentConfirmation = document.getElementById('paymentConfirmation');
    
    if (bookingData && paymentConfirmation) {
        // Mostrar el botón de confirmación
        paymentConfirmation.style.display = 'block';
        
        // Configurar el botón de confirmación
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                // Redirigir a página de éxito
                window.location.href = 'exito.html';
            });
        }
    }
}

// Verificar si el usuario volvió de Mercado Pago
function checkReturnFromPayment() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Si hay datos de reserva y parámetros de pago, redirigir a página de éxito
    if (localStorage.getItem('bookingData') && (
        urlParams.get('collection_status') === 'approved' ||
        urlParams.get('status') === 'approved' ||
        urlParams.get('payment_id') ||
        urlParams.get('collection_id')
    )) {
        window.location.href = 'exito.html';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async function() {
    // Cargar variables de entorno
    await envLoader.loadEnv();
    
    // Actualizar UI con datos bancarios

    
    // Inicializar Google Calendar API
            const calendarInitialized = await window.calendarAPI.init();
    
    // Configurar botón de autenticación si es necesario
    // setupAuthButton(calendarInitialized); // Botón eliminado
    
    // Verificar retorno de pago
    checkReturnFromPayment();
    
    // Verificar reserva pendiente
    checkPendingBooking();
    
    // Configurar validación de fechas
    setupDateValidation();
    
    // Configurar validaciones en tiempo real
    setupRealTimeValidation();
    
    // Configurar smooth scroll
    setupSmoothScroll();
    
    // Botón de pago
    document.getElementById('payButton').addEventListener('click', showPaymentModal);
    
        // Botones del modal
    document.getElementById('mercadoPagoBtn').addEventListener('click', processMercadoPago);
    
    // Cerrar modal
    document.querySelector('.close').addEventListener('click', closeModal);
    
    // Cerrar modal clickeando fuera
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('paymentModal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Agregar efecto hover a las cards de servicios
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Animación de entrada para elementos
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observar elementos para animación
    const elementsToAnimate = document.querySelectorAll('.service-card, .booking-form, .payment-info');
    elementsToAnimate.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Funciones de utilidad adicionales
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        z-index: 3000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Cargar horarios disponibles para una fecha
async function loadAvailableTimeSlots(date) {
    const timeSelect = document.getElementById('time');
    const availabilityInfo = document.getElementById('availabilityInfo');
    const availableCount = document.getElementById('availableCount');
    
    try {
        // Mostrar loading
        timeSelect.innerHTML = '<option value="">Cargando horarios...</option>';
        timeSelect.disabled = true;
        
        // Obtener horarios disponibles
        const availableSlots = await window.calendarAPI.getAvailableSlots(date);
        
        // Limpiar opciones
        timeSelect.innerHTML = '<option value="">Selecciona un horario</option>';
        
        if (availableSlots.length === 0) {
            timeSelect.innerHTML = '<option value="">No hay horarios disponibles</option>';
            availabilityInfo.style.display = 'block';
            availabilityInfo.className = 'availability-info full';
            availableCount.textContent = 'No hay turnos disponibles para esta fecha';
        } else {
            // Agregar horarios disponibles
            availableSlots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot.time;
                option.textContent = slot.time + ' hs';
                timeSelect.appendChild(option);
            });
            
            // Mostrar información de disponibilidad
            availabilityInfo.style.display = 'block';
            const totalSlots = 4; // 14-17hs = 4 horarios posibles
            const availableSlotCount = availableSlots.length;
            
            if (availableSlotCount === totalSlots) {
                availabilityInfo.className = 'availability-info available';
                availableCount.textContent = `✅ ${availableSlotCount} turnos disponibles`;
            } else if (availableSlotCount > 1) {
                availabilityInfo.className = 'availability-info limited';
                availableCount.textContent = `⚠️ ${availableSlotCount} turnos disponibles`;
            } else {
                availabilityInfo.className = 'availability-info limited';
                availableCount.textContent = `⚠️ Solo ${availableSlotCount} turno disponible`;
            }
        }
        
        timeSelect.disabled = false;
        
    } catch (error) {
        console.error('Error cargando horarios:', error);
        timeSelect.innerHTML = '<option value="">Error cargando horarios</option>';
        availabilityInfo.style.display = 'block';
        availabilityInfo.className = 'availability-info full';
        availableCount.textContent = 'Error al cargar la disponibilidad';
        timeSelect.disabled = false;
    }
}

// Limpiar selector de horarios
function clearTimeSlots() {
    const timeSelect = document.getElementById('time');
    const availabilityInfo = document.getElementById('availabilityInfo');
    
    timeSelect.innerHTML = '<option value="">Primero selecciona una fecha</option>';
    availabilityInfo.style.display = 'none';
}



// Configurar botón de autenticación - FUNCIÓN DESHABILITADA
function setupAuthButton(calendarInitialized) {
    // Botón eliminado de la interfaz - función deshabilitada
    return;
}

// Función para testing de la página de éxito
function testSuccessPage() {
    // Crear datos de prueba
    const testBookingData = {
        name: 'María Fernández',
        dni: '12345678',
        service: 'relajante',
        date: '2025-07-25',
        time: '15:00',
        timestamp: new Date().toISOString()
    };
    
    // Guardar en localStorage
    localStorage.setItem('bookingData', JSON.stringify(testBookingData));
    
    // Redirigir a página de éxito
    window.location.href = 'exito.html';
}

// Validación en tiempo real
function setupRealTimeValidation() {
    const nameInput = document.getElementById('name');
    const dniInput = document.getElementById('dni');
    const dateInput = document.getElementById('date');
    
    // Validación del nombre en tiempo real
    nameInput.addEventListener('input', function() {
        // Remover números y caracteres especiales
        this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(this.value)) {
            this.style.borderColor = '#f44336';
        } else {
            this.style.borderColor = '#8B4B6B';
        }
    });
    
    // Validación del DNI en tiempo real
    dniInput.addEventListener('input', function() {
        // Remover caracteres no numéricos
        this.value = this.value.replace(/[^0-9]/g, '');
        
        // Limitar a 8 dígitos máximo
        if (this.value.length > 8) {
            this.value = this.value.slice(0, 8);
        }
        
        if (this.value.length < 7 || this.value.length > 8) {
            this.style.borderColor = '#f44336';
        } else {
            this.style.borderColor = '#8B4B6B';
        }
    });
    
    // Validación de fecha en tiempo real
    dateInput.addEventListener('change', async function() {
        const selectedDate = new Date(this.value);
        const today = new Date();
        const minDate = new Date(today.toISOString().split('T')[0]);
        
        if (selectedDate < minDate) {
            this.style.borderColor = '#f44336';
            this.setCustomValidity('No se pueden reservar citas en fechas pasadas');
            clearTimeSlots();
        } else {
            // Ya no validamos días laborables aquí - dejamos que el sistema maneje la disponibilidad
            this.style.borderColor = '#8B4B6B';
            this.setCustomValidity('');
            // Cargar horarios disponibles
            loadAvailableTimeSlots(this.value);
        }
    });
    
    // Validación general para otros campos
    const inputs = document.querySelectorAll('#bookingForm input, #bookingForm select');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.required && !this.value.trim()) {
                this.style.borderColor = '#f44336';
            } else if (this.style.borderColor !== 'rgb(244, 67, 54)') {
                this.style.borderColor = '#8B4B6B';
            }
        });
    });
} 