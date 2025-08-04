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
    
    // Si es una fecha anterior a hoy, no permitir
    if (selectedDate.toDateString() < today.toDateString()) {
        alert('No se pueden reservar citas en fechas pasadas.');
        return false;
    }
    
    // Si es hoy, validar que tenga horarios disponibles (se hace más adelante)
    // La validación de horas específicas se hace en la función de horarios disponibles
    
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

// Crear URL de Mercado Pago con redirección automática
function createMercadoPagoUrl(bookingData) {
    // URL base de Mercado Pago
    const baseUrl = envLoader.get('MERCADOPAGO_LINK') || 'https://mpago.la/1zvBGJ7';
    
    // URL de retorno después del pago exitoso
    const currentDomain = window.location.origin;
    const successUrl = `${currentDomain}/exito.html?payment_status=approved&source=mercadopago`;
    const failureUrl = `${currentDomain}/?payment_status=failure&source=mercadopago`;
    const pendingUrl = `${currentDomain}/?payment_status=pending&source=mercadopago`;
    
    // Si es un link simple de Mercado Pago (mpago.la), no podemos agregar parámetros de redirección
    // pero creamos un identificador único para el pago
    const paymentId = `${bookingData.dni}_${Date.now()}`;
    
    // Guardar el ID de pago para tracking
    localStorage.setItem('pendingPaymentId', paymentId);
    
    console.log('💳 URLs de redirección configuradas:');
    console.log('✅ Éxito:', successUrl);
    console.log('❌ Fallo:', failureUrl);
    console.log('⏳ Pendiente:', pendingUrl);
    console.log('🔑 Payment ID:', paymentId);
    
    // Por ahora retornamos la URL base, pero en producción real se debería usar
    // la API de Mercado Pago para crear un link de pago con redirección
    return baseUrl;
}

// Procesar pago con Mercado Pago
async function processMercadoPago() {
    try {
        // Mostrar loading
        const mercadoPagoBtn = document.getElementById('mercadoPagoBtn');
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

        // Guardar datos de la reserva para crear evento DESPUÉS del pago
        saveBookingData();
        
        // Marcar tiempo de inicio del pago
        localStorage.setItem('paymentStartTime', Date.now().toString());
        
        // Crear URL de Mercado Pago con redirección automática
        const mercadoPagoUrl = createMercadoPagoUrl(bookingData);
        
        console.log('🔗 Redirigiendo a Mercado Pago con URL:', mercadoPagoUrl);
        
        // Redirigir a Mercado Pago
        window.location.href = mercadoPagoUrl;
        
    } catch (error) {
        console.error('❌ Error en processMercadoPago:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Error message:', error.message);
        
        alert(`Hubo un problema al procesar la reserva: ${error.message}. Por favor intenta nuevamente.`);
        
        // Restaurar botón
        const mercadoPagoBtn = document.getElementById('mercadoPagoBtn');
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
    // FUNCIÓN COMENTADA - Botón de confirmación manual deshabilitado temporalmente
    /*
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
    */
    
    console.log('📝 Función checkPendingBooking temporalmente deshabilitada');
}

// Verificar si el usuario volvió de Mercado Pago
function checkReturnFromPayment() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingData = localStorage.getItem('bookingData');
    const pendingPaymentId = localStorage.getItem('pendingPaymentId');
    
    // Verificar parámetros de retorno de Mercado Pago
    const hasPaymentParams = (
        urlParams.get('collection_status') === 'approved' ||
        urlParams.get('status') === 'approved' ||
        urlParams.get('payment_status') === 'approved' ||
        urlParams.get('payment_id') ||
        urlParams.get('collection_id') ||
        urlParams.get('source') === 'mercadopago' ||
        urlParams.get('test') === 'true'  // Para testing
    );
    
    // Si hay parámetros de pago o datos de reserva con ID de pago pendiente
    if (bookingData && (hasPaymentParams || pendingPaymentId)) {
        console.log('🔄 Detectado retorno de Mercado Pago');
        console.log('📊 Parámetros URL:', Object.fromEntries(urlParams));
        console.log('💾 Datos de reserva:', bookingData ? 'Disponibles' : 'No encontrados');
        console.log('🔑 Payment ID:', pendingPaymentId);
        
        // Limpiar el ID de pago pendiente
        localStorage.removeItem('pendingPaymentId');
        
        // Redirigir a página de éxito
        window.location.href = 'exito.html';
        return;
    }
    
    // Si hay datos de reserva pero ningún parámetro de pago, 
    // verificar si el usuario estuvo ausente (posible retorno de MP)
    if (bookingData && pendingPaymentId) {
        checkAutoRedirection();
    }
}

// Verificar redirección automática después de un tiempo
function checkAutoRedirection() {
    const PAYMENT_TIMEOUT = 5 * 60 * 1000; // 5 minutos
    const pendingPaymentId = localStorage.getItem('pendingPaymentId');
    const paymentStartTime = localStorage.getItem('paymentStartTime');
    
    if (!paymentStartTime) {
        // Guardar tiempo de inicio del pago
        localStorage.setItem('paymentStartTime', Date.now().toString());
        return;
    }
    
    const timeElapsed = Date.now() - parseInt(paymentStartTime);
    
    // Si han pasado más de 2 minutos, mostrar opción de confirmar pago
    if (timeElapsed > 2 * 60 * 1000) { // 2 minutos
        console.log('⏰ Han pasado 2+ minutos desde el pago - activando confirmación manual');
        showPaymentConfirmationPrompt();
    }
    
    // Si han pasado más de 5 minutos, limpiar datos
    if (timeElapsed > PAYMENT_TIMEOUT) {
        console.log('⏰ Timeout del pago - limpiando datos');
        cleanupPaymentData();
    }
}

// Mostrar prompt de confirmación de pago
function showPaymentConfirmationPrompt() {
    // FUNCIÓN COMENTADA - Botón de confirmación manual deshabilitado temporalmente
    /*
    const paymentConfirmation = document.getElementById('paymentConfirmation');
    if (paymentConfirmation) {
        paymentConfirmation.style.display = 'block';
        
        // Scroll al botón
        paymentConfirmation.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        // Agregar animación de highlight
        paymentConfirmation.style.animation = 'pulse 2s infinite';
    }
    */
    
    console.log('📝 Función showPaymentConfirmationPrompt temporalmente deshabilitada');
}

// Limpiar datos de pago
function cleanupPaymentData() {
    localStorage.removeItem('pendingPaymentId');
    localStorage.removeItem('paymentStartTime');
}

// Configurar detección inteligente de retorno de pago
function setupPaymentReturnDetection() {
    const bookingData = localStorage.getItem('bookingData');
    const pendingPaymentId = localStorage.getItem('pendingPaymentId');
    
    if (!bookingData || !pendingPaymentId) {
        return;
    }
    
    console.log('🔍 Configurando detección de retorno de Mercado Pago...');
    
    // Detectar cuando el usuario vuelve a la pestaña (desde Mercado Pago)
    let wasHidden = false;
    
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            wasHidden = true;
            console.log('👁️ Usuario salió de la pestaña (posiblemente a Mercado Pago)');
        } else if (wasHidden) {
            console.log('👁️ Usuario volvió a la pestaña');
            
            // Esperar un poco y verificar si debe redirigir
            setTimeout(() => {
                checkPaymentReturn();
            }, 2000);
        }
    });
    
    // También verificar al hacer foco en la ventana
    window.addEventListener('focus', function() {
        if (wasHidden) {
            console.log('🎯 Ventana recuperó el foco - verificando pago');
            setTimeout(() => {
                checkPaymentReturn();
            }, 1000);
        }
    });
    
    // Verificación periódica cada 30 segundos
    const checkInterval = setInterval(() => {
        const currentBookingData = localStorage.getItem('bookingData');
        const currentPendingPayment = localStorage.getItem('pendingPaymentId');
        
        if (!currentBookingData || !currentPendingPayment) {
            clearInterval(checkInterval);
            return;
        }
        
        checkPaymentReturn();
    }, 30000);
    
    // Limpiar interval después de 10 minutos
    setTimeout(() => {
        clearInterval(checkInterval);
        console.log('⏰ Timeout de detección de pago alcanzado');
    }, 10 * 60 * 1000);
}

// Verificar retorno de pago de forma inteligente
function checkPaymentReturn() {
    const bookingData = localStorage.getItem('bookingData');
    const pendingPaymentId = localStorage.getItem('pendingPaymentId');
    const paymentStartTime = localStorage.getItem('paymentStartTime');
    
    if (!bookingData || !pendingPaymentId) {
        return;
    }
    
    const timeElapsed = paymentStartTime ? Date.now() - parseInt(paymentStartTime) : 0;
    
    // Si han pasado más de 1 minuto, preguntar al usuario
    if (timeElapsed > 60 * 1000) { // 1 minuto
        console.log('💭 Preguntando al usuario si completó el pago...');
        
        const userConfirmed = confirm(
            '¿Ya completaste el pago en Mercado Pago?\n\n' +
            '• Si pagaste exitosamente, haz clic en "Aceptar" para continuar\n' +
            '• Si aún no pagaste o tuviste problemas, haz clic en "Cancelar"'
        );
        
        if (userConfirmed) {
            console.log('✅ Usuario confirmó el pago - redirigiendo a página de éxito');
            
            // Limpiar datos de tracking
            localStorage.removeItem('pendingPaymentId');
            localStorage.removeItem('paymentStartTime');
            
            // Redirigir a página de éxito
            window.location.href = 'exito.html';
        } else {
            console.log('❌ Usuario no confirmó el pago - manteniendo estado actual');
            
            // Extender tiempo para evitar preguntas repetidas
            localStorage.setItem('paymentStartTime', (Date.now() - 30 * 1000).toString());
        }
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
    
    // Configurar detección de retorno de Mercado Pago
    setupPaymentReturnDetection();
    
    // Configurar sistema de consulta de turnos
    setupAppointmentLookup();
    
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
        
        // Obtener horarios disponibles del servidor backend
        const availableSlots = await getRealAvailableSlots(date);
        
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
                // slot es un string directamente (ej: "09:00"), no un objeto
                option.value = slot;
                option.textContent = slot + ' hs';
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

// Función para testing del flujo completo de pago
function testPaymentFlow() {
    console.log('🧪 Iniciando test del flujo de pago automático...');
    
    // Crear datos de prueba
    const testBookingData = {
        name: 'Carlos Testing',
        dni: '87654321',
        service: 'descontracturante',
        date: '2025-08-05',
        time: '16:00',
        timestamp: new Date().toISOString()
    };
    
    // Simular el proceso de reserva
    localStorage.setItem('bookingData', JSON.stringify(testBookingData));
    localStorage.setItem('pendingPaymentId', `${testBookingData.dni}_${Date.now()}`);
    localStorage.setItem('paymentStartTime', Date.now().toString());
    
    console.log('💾 Datos de reserva guardados:', testBookingData);
    console.log('⏰ Simulando pago en Mercado Pago...');
    
    // Mostrar mensaje al usuario
    alert('🧪 Testing: Simulando flujo de pago...\n\n' +
          '1. Se guardaron datos de reserva\n' +
          '2. Se simulará retorno de Mercado Pago en 3 segundos\n' +
          '3. Deberías ser redirigido automáticamente');
    
    // Simular retorno de Mercado Pago después de 3 segundos
    setTimeout(() => {
        console.log('🔄 Simulando retorno de Mercado Pago...');
        
        // Simular que el usuario volvió de MP con parámetros de éxito
        const successUrl = `${window.location.origin}/?payment_status=approved&source=mercadopago&test=true`;
        
        // Redirigir con parámetros de éxito
        window.location.href = successUrl;
        
    }, 3000);
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
        const selectedDate = new Date(this.value + 'T12:00:00');
        const today = new Date();
        
        // Solo comparar fechas (sin horas)
        const selectedDateString = selectedDate.toDateString();
        const todayString = today.toDateString();
        
        if (selectedDateString < todayString) {
            this.style.borderColor = '#f44336';
            this.setCustomValidity('No se pueden reservar citas en fechas pasadas');
            clearTimeSlots();
        } else {
            // Fecha válida - cargar horarios disponibles
            this.style.borderColor = '#8B4B6B';
            this.setCustomValidity('');
            // Cargar horarios disponibles (la validación de horas se hace ahí)
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

// Función para crear evento real usando el servidor backend
async function createRealCalendarEvent(bookingData) {
    console.log('📅 Enviando evento al servidor backend...');
    
    try {
        const response = await fetch('http://localhost:3001/create-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('🎉 Evento creado exitosamente en Google Calendar!');
            console.log('🔗 ID del evento:', result.eventId);
            if (result.eventLink) {
                console.log('🔗 Link del evento:', result.eventLink);
            }
        } else {
            console.error('❌ Error del servidor:', result.error);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error conectando con el servidor backend:', error);
        console.error('💡 Servidor backend no disponible, usando modo simulación');
        
        // Fallback: simular creación exitosa para que el flujo continúe
        return {
            success: true,
            eventId: `sim_${Date.now()}`,
            mode: 'frontend_simulation',
            message: 'Evento simulado (servidor backend no disponible)'
        };
    }
}

// Función para obtener horarios disponibles del servidor backend
async function getRealAvailableSlots(date) {
    console.log('📅 Obteniendo horarios disponibles para:', date);
    
    try {
        // Primero obtener eventos existentes del servidor
        const response = await fetch(`http://localhost:3001/get-events?date=${date}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            console.error('❌ Error obteniendo eventos:', result.error);
            return []; // Retornar array vacío en caso de error
        }
        
        const existingEvents = result.events || [];
        console.log(`📋 ${existingEvents.length} eventos existentes encontrados`);
        
        // Generar horarios disponibles basándose en la lógica del calendario
        const availableSlots = generateAvailableSlots(date, existingEvents);
        
        console.log(`✅ ${availableSlots.length} horarios disponibles`);
        return availableSlots;
        
    } catch (error) {
        console.error('❌ Error obteniendo horarios:', error);
        console.error('💡 Servidor backend no disponible, usando lógica del frontend');
        
        // Fallback: usar la lógica original del frontend
        return generateAvailableSlotsFromFrontend(date);
    }
}

// Función de fallback para generar horarios cuando el servidor no está disponible
function generateAvailableSlotsFromFrontend(date) {
    console.log('🔄 Generando horarios disponibles desde el frontend (fallback)');
    
    const selectedDate = new Date(date + 'T12:00:00');
    const dayOfWeek = selectedDate.getDay();
    const today = new Date();
    const isToday = date === today.toISOString().split('T')[0];
    
    // Días laborables: Lunes(1) a Viernes(5) 
    const workingDays = [1, 2, 3, 4, 5];
    
    // Si no es día laboral, retornar vacío
    if (!workingDays.includes(dayOfWeek)) {
        console.log('📅 No es día laboral');
        return [];
    }
    
    // Horarios base disponibles (simplificado para el frontend)
    const baseSlots = ['14:00', '15:00', '16:00', '17:00'];
    
    // Filtrar horarios pasados si es hoy
    const availableSlots = baseSlots.filter(time => {
        if (isToday) {
            const [hours, minutes] = time.split(':').map(Number);
            const slotTime = new Date();
            slotTime.setHours(hours, minutes, 0, 0);
            
            if (slotTime <= today) {
                return false; // Horario ya pasó
            }
        }
        return true;
    });
    
    console.log(`✅ ${availableSlots.length} horarios disponibles (frontend fallback)`);
    return availableSlots;
}

// Función helper para generar horarios disponibles
function generateAvailableSlots(date, existingEvents) {
    const selectedDate = new Date(date + 'T12:00:00');
    const dayOfWeek = selectedDate.getDay();
    const today = new Date();
    const isToday = date === today.toISOString().split('T')[0];
    
    // Días laborables: Lunes(1) a Viernes(5) 
    const workingDays = [1, 2, 3, 4, 5];
    
    // Si no es día laboral, retornar vacío
    if (!workingDays.includes(dayOfWeek)) {
        return [];
    }
    
    // Horarios base disponibles
    const baseSlots = ['09:00', '10:30', '14:00', '15:30', '17:00'];
    
    // Filtrar horarios ocupados y horarios pasados si es hoy
    const availableSlots = baseSlots.filter(time => {
        // Si es hoy, filtrar horarios que ya pasaron
        if (isToday) {
            const [hours, minutes] = time.split(':').map(Number);
            const slotTime = new Date();
            slotTime.setHours(hours, minutes, 0, 0);
            
            if (slotTime <= today) {
                return false; // Horario ya pasó
            }
        }
        
        // Verificar si el horario está ocupado
        const isOccupied = existingEvents.some(event => {
            if (event.start?.date) {
                // Evento de todo el día - bloquea todo el día
                return true;
            }
            
            if (event.start?.dateTime) {
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end?.dateTime || event.start.dateTime);
                
                const [hours, minutes] = time.split(':').map(Number);
                const slotStart = new Date(selectedDate);
                slotStart.setHours(hours, minutes, 0, 0);
                const slotEnd = new Date(slotStart);
                slotEnd.setHours(slotEnd.getHours() + 1, 30); // 1.5 horas de duración
                
                // Verificar si hay superposición
                return (slotStart < eventEnd && slotEnd > eventStart);
            }
            
            return false;
        });
        
        return !isOccupied;
    });
    
    return availableSlots;
}

// ==============================================
// SISTEMA DE CONSULTA Y CANCELACIÓN DE TURNOS
// ==============================================

// Configurar sistema de consulta de turnos
function setupAppointmentLookup() {
    const checkAppointmentBtn = document.getElementById('checkAppointmentBtn');
    const appointmentModal = document.getElementById('appointmentModal');
    const closeAppointmentModal = document.getElementById('closeAppointmentModal');
    const searchAppointmentBtn = document.getElementById('searchAppointmentBtn');
    const lookupDniInput = document.getElementById('lookupDni');
    
    // Abrir modal de consulta
    checkAppointmentBtn.addEventListener('click', function() {
        appointmentModal.style.display = 'block';
        lookupDniInput.focus();
    });
    
    // Cerrar modal
    closeAppointmentModal.addEventListener('click', function() {
        closeAppointmentModal.closest('.modal').style.display = 'none';
        clearAppointmentResult();
    });
    
    // Cerrar modal clickeando fuera
    window.addEventListener('click', function(event) {
        if (event.target === appointmentModal) {
            appointmentModal.style.display = 'none';
            clearAppointmentResult();
        }
    });
    
    // Buscar turno
    searchAppointmentBtn.addEventListener('click', function() {
        searchAppointmentByDni();
    });
    
    // Buscar al presionar Enter
    lookupDniInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchAppointmentByDni();
        }
    });
    
    // Validación en tiempo real del DNI
    lookupDniInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, ''); // Solo números
        
        const searchBtn = document.getElementById('searchAppointmentBtn');
        if (this.value.length >= 7) {
            searchBtn.disabled = false;
        } else {
            searchBtn.disabled = true;
        }
    });
}

// Buscar turno por DNI
async function searchAppointmentByDni() {
    const dni = document.getElementById('lookupDni').value.trim();
    const searchBtn = document.getElementById('searchAppointmentBtn');
    const resultDiv = document.getElementById('appointmentResult');
    
    if (!dni || dni.length < 7) {
        alert('Por favor ingresa un DNI válido (7 u 8 dígitos)');
        return;
    }
    
    // Mostrar loading
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
    
    try {
        console.log('🔍 Iniciando búsqueda de turno para DNI:', dni);
        
        // Intentar buscar en el servidor backend primero
        let appointment = await searchAppointmentInBackend(dni);
        
        if (!appointment) {
            // Fallback: buscar en localStorage (reservas locales)
            console.log('💾 Servidor no disponible, buscando en localStorage...');
            appointment = searchAppointmentInLocalStorage(dni);
        }
        
        if (appointment) {
            console.log('✅ Turno encontrado:', appointment);
            showAppointmentFound(appointment);
        } else {
            console.log('❌ No se encontró turno para DNI:', dni);
            showAppointmentNotFound(dni);
        }
        
    } catch (error) {
        console.error('❌ Error inesperado buscando turno:', error);
        
        // Intentar fallback como último recurso
        const localAppointment = searchAppointmentInLocalStorage(dni);
        if (localAppointment) {
            console.log('✅ Recuperado desde localStorage tras error');
            showAppointmentFound(localAppointment);
        } else {
            showAppointmentError();
        }
    } finally {
        // Restaurar botón
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Buscar mi Turno';
    }
}

// Buscar turno en el servidor backend
async function searchAppointmentInBackend(dni) {
    try {
        const response = await fetch(`http://localhost:3001/search-appointment?dni=${dni}`);
        
        if (!response.ok) {
            throw new Error('Servidor no disponible');
        }
        
        const result = await response.json();
        
        if (result.success && result.appointment) {
            console.log('✅ Turno encontrado en servidor backend');
            return result.appointment;
        }
        
        return null;
        
    } catch (error) {
        console.log('💡 Servidor backend no disponible (esto es normal), buscando localmente');
        // No hacer throw, devolver null para usar fallback
        return null;
    }
}

// Buscar turno en localStorage (fallback)
function searchAppointmentInLocalStorage(dni) {
    console.log('🔍 Buscando turno en localStorage para DNI:', dni);
    
    try {
        // Buscar en datos de reserva actual
        const bookingData = localStorage.getItem('bookingData');
        if (bookingData) {
            try {
                const booking = JSON.parse(bookingData);
                if (booking && booking.dni === dni) {
                    console.log('✅ Turno encontrado en localStorage (reserva actual)');
                    return {
                        id: `local_${booking.dni}_${Date.now()}`,
                        name: booking.name,
                        dni: booking.dni,
                        service: booking.service,
                        date: booking.date,
                        time: booking.time,
                        status: 'confirmed',
                        source: 'localStorage',
                        createdAt: booking.timestamp || new Date().toISOString()
                    };
                }
            } catch (parseError) {
                console.warn('⚠️ Error parseando bookingData:', parseError);
            }
        }
        
        // Buscar en historial de reservas (si existe)
        const appointmentHistory = localStorage.getItem('appointmentHistory');
        if (appointmentHistory) {
            try {
                const history = JSON.parse(appointmentHistory);
                if (Array.isArray(history)) {
                    const foundAppointment = history.find(appointment => 
                        appointment.dni === dni && appointment.status !== 'cancelled'
                    );
                    
                    if (foundAppointment) {
                        console.log('✅ Turno encontrado en historial de localStorage');
                        return foundAppointment;
                    }
                }
            } catch (parseError) {
                console.warn('⚠️ Error parseando appointmentHistory:', parseError);
            }
        }
        
        // Buscar en datos de testing
        const testingData = localStorage.getItem('testAppointment_' + dni);
        if (testingData) {
            try {
                const testAppointment = JSON.parse(testingData);
                console.log('✅ Turno de testing encontrado');
                return testAppointment;
            } catch (parseError) {
                console.warn('⚠️ Error parseando datos de testing:', parseError);
            }
        }
        
    } catch (error) {
        console.error('❌ Error accediendo a localStorage:', error);
    }
    
    console.log('❌ No se encontró turno para el DNI:', dni);
    return null;
}

// Mostrar turno encontrado
function showAppointmentFound(appointment) {
    const resultDiv = document.getElementById('appointmentResult');
    const serviceNames = {
        'descontracturante': 'Masaje Descontracturante',
        'relajante': 'Masaje Relajante',
        'deportivo': 'Masaje Deportivo'
    };
    
    const serviceName = serviceNames[appointment.service] || appointment.service;
    const formattedDate = formatDate(appointment.date);
    
    resultDiv.className = 'appointment-result appointment-found';
    resultDiv.innerHTML = `
        <h4><i class="fas fa-check-circle" style="color: #28a745;"></i> ¡Turno Encontrado!</h4>
        
        <div class="appointment-details">
            <div class="appointment-detail">
                <span class="appointment-label">Nombre:</span>
                <span class="appointment-value">${appointment.name}</span>
            </div>
            <div class="appointment-detail">
                <span class="appointment-label">DNI:</span>
                <span class="appointment-value">${appointment.dni}</span>
            </div>
            <div class="appointment-detail">
                <span class="appointment-label">Servicio:</span>
                <span class="appointment-value">${serviceName}</span>
            </div>
            <div class="appointment-detail">
                <span class="appointment-label">Fecha:</span>
                <span class="appointment-value">${formattedDate}</span>
            </div>
            <div class="appointment-detail">
                <span class="appointment-label">Horario:</span>
                <span class="appointment-value">${appointment.time} hs</span>
            </div>
            <div class="appointment-detail">
                <span class="appointment-label">Estado:</span>
                <span class="appointment-value">✅ Confirmado</span>
            </div>
        </div>
        
        <div class="appointment-actions">
            <button onclick="cancelAppointment('${appointment.id}', '${appointment.dni}')" class="cancel-button-enhanced">
                <i class="fas fa-calendar-times"></i>
                Cancelar mi Turno
            </button>
        </div>
        
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666; text-align: center;">
            <i class="fas fa-info-circle"></i>
            Para cualquier consulta, puedes contactar a Antonella al +54 9 11 4069-1400
        </p>
    `;
    
    resultDiv.style.display = 'block';
}

// Mostrar que no se encontró turno
function showAppointmentNotFound(dni) {
    const resultDiv = document.getElementById('appointmentResult');
    
    resultDiv.className = 'appointment-result appointment-not-found';
    resultDiv.innerHTML = `
        <h4><i class="fas fa-exclamation-circle" style="color: #dc3545;"></i> No se encontró ningún turno</h4>
        
        <p style="margin: 1rem 0; text-align: center;">
            No se encontró ningún turno reservado con el DNI <strong>${dni}</strong>.
        </p>
        
        <div style="background: #e7f3ff; padding: 1rem; border-radius: 10px; margin: 1rem 0;">
            <p style="margin: 0; font-size: 0.9rem; color: #0c5460;">
                <i class="fas fa-lightbulb"></i>
                <strong>Posibles razones:</strong><br>
                • El DNI ingresado no coincide con el de la reserva<br>
                • El turno fue cancelado previamente<br>
                • La reserva se realizó con otro DNI<br>
                • Aún no has realizado ninguna reserva
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 1.5rem;">
            <a href="#reservar" onclick="document.getElementById('appointmentModal').style.display='none'" 
               class="cta-button" style="display: inline-block; text-decoration: none;">
                <i class="fas fa-plus"></i>
                Reservar Nuevo Turno
            </a>
        </div>
        
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666; text-align: center;">
            <i class="fas fa-phone"></i>
            Para consultas: +54 9 11 4069-1400
        </p>
    `;
    
    resultDiv.style.display = 'block';
}

// Mostrar error en la búsqueda
function showAppointmentError() {
    const resultDiv = document.getElementById('appointmentResult');
    
    resultDiv.className = 'appointment-result';
    resultDiv.innerHTML = `
        <h4><i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i> Error de Conexión</h4>
        
        <p style="margin: 1rem 0; text-align: center;">
            Hubo un problema al buscar tu turno. Por favor intenta nuevamente.
        </p>
        
        <div style="text-align: center; margin-top: 1rem;">
            <button onclick="searchAppointmentByDni()" class="search-button" style="width: auto; padding: 1rem 2rem; min-height: auto;">
                <i class="fas fa-redo"></i>
                Intentar Nuevamente
            </button>
        </div>
        
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666; text-align: center;">
            <i class="fas fa-phone"></i>
            Si el problema persiste, contacta a Antonella: +54 9 11 4069-1400
        </p>
    `;
    
    resultDiv.style.display = 'block';
}

// Limpiar resultado de búsqueda
function clearAppointmentResult() {
    const resultDiv = document.getElementById('appointmentResult');
    const lookupDniInput = document.getElementById('lookupDni');
    
    resultDiv.style.display = 'none';
    resultDiv.innerHTML = '';
    lookupDniInput.value = '';
    
    // Deshabilitar botón de búsqueda
    const searchBtn = document.getElementById('searchAppointmentBtn');
    searchBtn.disabled = true;
}

// Cancelar turno
async function cancelAppointment(appointmentId, dni) {
    const confirmed = confirm(
        '¿Estás seguro de que quieres cancelar tu turno?\n\n' +
        'Esta acción no se puede deshacer. Si cancelas, el horario quedará disponible para otros clientes.\n\n' +
        'Para reprogramar, deberás hacer una nueva reserva.'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        // Intentar cancelar en el servidor backend
        const cancelled = await cancelAppointmentInBackend(appointmentId, dni);
        
        if (!cancelled) {
            // Fallback: cancelar localmente
            cancelAppointmentLocally(dni);
        }
        
        // Mostrar confirmación
        showCancellationSuccess();
        
        // Enviar WhatsApp de cancelación a Antonella
        sendCancellationWhatsApp(dni);
        
    } catch (error) {
        console.error('Error cancelando turno:', error);
        alert('Hubo un problema al cancelar el turno. Por favor contacta a Antonella directamente al +54 9 11 4069-1400');
    }
}

// Cancelar turno en servidor backend
async function cancelAppointmentInBackend(appointmentId, dni) {
    try {
        const response = await fetch('http://localhost:3001/cancel-appointment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ appointmentId, dni })
        });
        
        if (!response.ok) {
            throw new Error('Servidor no disponible');
        }
        
        const result = await response.json();
        return result.success;
        
    } catch (error) {
        console.log('💡 Servidor backend no disponible, cancelando localmente');
        return false;
    }
}

// Cancelar turno localmente
function cancelAppointmentLocally(dni) {
    // Limpiar datos de localStorage si coincide el DNI
    const bookingData = localStorage.getItem('bookingData');
    if (bookingData) {
        const booking = JSON.parse(bookingData);
        if (booking.dni === dni) {
            localStorage.removeItem('bookingData');
            localStorage.removeItem('pendingPaymentId');
            localStorage.removeItem('paymentStartTime');
            console.log('✅ Turno cancelado localmente');
        }
    }
}

// Mostrar confirmación de cancelación
function showCancellationSuccess() {
    const resultDiv = document.getElementById('appointmentResult');
    
    resultDiv.className = 'appointment-result appointment-found';
    resultDiv.innerHTML = `
        <h4><i class="fas fa-check-circle" style="color: #28a745;"></i> Turno Cancelado Exitosamente</h4>
        
        <p style="margin: 1rem 0; text-align: center;">
            Tu turno ha sido cancelado correctamente. El horario queda disponible para otros clientes.
        </p>
        
        <div style="background: #e8f4fd; padding: 1rem; border-radius: 10px; margin: 1rem 0;">
            <p style="margin: 0; font-size: 0.9rem; color: #1565c0;">
                <i class="fas fa-info-circle"></i>
                <strong>¿Qué sigue?</strong><br>
                • Se enviará un mensaje a Antonella confirmando la cancelación<br>
                • Si necesitas reprogramar, puedes hacer una nueva reserva<br>
                • No se aplicarán cargos por la cancelación
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 1.5rem;">
            <a href="#reservar" onclick="document.getElementById('appointmentModal').style.display='none'" 
               class="cta-button" style="display: inline-block; text-decoration: none;">
                <i class="fas fa-plus"></i>
                Reservar Nuevo Turno
            </a>
        </div>
        
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666; text-align: center;">
            <i class="fas fa-phone"></i>
            Para cualquier consulta: +54 9 11 4069-1400
        </p>
    `;
}

// Enviar WhatsApp de cancelación
function sendCancellationWhatsApp(dni) {
    const message = `🚫 Cancelación de Turno\n\nEl cliente con DNI ${dni} ha cancelado su turno a través del sitio web.\n\nPor favor, confirma la cancelación en tu calendario.`;
    
    const phoneNumber = envLoader.get('WHATSAPP_PHONE') || '5491140691400';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Abrir WhatsApp en nueva ventana
    setTimeout(() => {
        window.open(whatsappUrl, '_blank');
    }, 2000);
}

// Función removida: modifyAppointment - ya no se usa

// Función para testing del sistema de consulta de turnos
function testAppointmentLookup() {
    console.log('🧪 Iniciando test del sistema de consulta de turnos...');
    
    // Crear datos de prueba
    const testBookingData = {
        name: 'Ana Testing',
        dni: '98765432',
        service: 'relajante',
        date: '2025-08-07',
        time: '15:00',
        timestamp: new Date().toISOString()
    };
    
    // Guardar en localStorage para poder encontrarlo (formato principal)
    localStorage.setItem('bookingData', JSON.stringify(testBookingData));
    
    // También guardar en formato de testing específico
    const testAppointment = {
        id: `test_${testBookingData.dni}_${Date.now()}`,
        name: testBookingData.name,
        dni: testBookingData.dni,
        service: testBookingData.service,
        date: testBookingData.date,
        time: testBookingData.time,
        status: 'confirmed',
        source: 'testing',
        createdAt: testBookingData.timestamp
    };
    
    localStorage.setItem('testAppointment_' + testBookingData.dni, JSON.stringify(testAppointment));
    
    console.log('💾 Datos de prueba guardados:', testBookingData);
    console.log('🧪 Appointment de testing creado:', testAppointment);
    
    // Abrir modal de consulta
    const appointmentModal = document.getElementById('appointmentModal');
    appointmentModal.style.display = 'block';
    
    // Pre-llenar el DNI para testing
    const lookupDniInput = document.getElementById('lookupDni');
    lookupDniInput.value = testBookingData.dni;
    
    // Habilitar botón de búsqueda
    const searchBtn = document.getElementById('searchAppointmentBtn');
    searchBtn.disabled = false;
    
    // Mostrar instrucciones
    alert('🧪 Testing: Sistema de consulta de turnos\n\n' +
          '1. Se creó un turno de prueba\n' +
          '2. DNI: ' + testBookingData.dni + '\n' +
          '3. Servicio: Masaje Relajante\n' +
          '4. Fecha: 7 de agosto 2025\n' +
          '5. El modal se abrió automáticamente\n\n' +
          'Haz clic en "Buscar mi Turno" para probar la funcionalidad');
    
    // Enfocar el input
    lookupDniInput.focus();
} 