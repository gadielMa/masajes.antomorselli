// Configuración de fechas válidas (Lunes a Viernes)
function isValidDate(date) {
    const day = date.getDay();
    return day >= 1 && day <= 5; // 1=Lunes, 5=Viernes
}

// Configurar fecha mínima (hoy) y validar días de la semana
function setupDateValidation() {
    const dateInput = document.getElementById('date');
    // Fecha mínima: 23/7/2025
    const minDate = '2025-07-23';
    dateInput.min = minDate;
    
    // Validar cuando cambia la fecha
    dateInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        if (!isValidDate(selectedDate)) {
            alert('Solo se pueden reservar citas de lunes a viernes.');
            this.value = '';
        }
    });
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
    const date = document.getElementById('date').value;
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
    
    // Validar fecha mínima
    const selectedDate = new Date(date);
    const minDate = new Date('2025-07-23');
    if (selectedDate < minDate) {
        alert('La fecha debe ser a partir del 23/7/2025.');
        return false;
    }
    
    // Validar fecha
    if (!isValidDate(selectedDate)) {
        alert('Solo se pueden reservar citas de lunes a viernes.');
        return false;
    }
    
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
    const date = document.getElementById('date').value;
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
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('bookingData', JSON.stringify(bookingData));
}

// Procesar pago con Mercado Pago
function processMercadoPago() {
    // Guardar datos de la reserva antes de redirigir
    saveBookingData();
    
    const mercadoPagoUrl = envLoader.get('MERCADOPAGO_LINK') || 'https://mpago.la/tu_link_aqui';
    
    // Redirigir a Mercado Pago
    window.location.href = mercadoPagoUrl;
}

// Procesar transferencia bancaria
function processBankTransfer() {
    const service = document.getElementById('service').value;
    const price = getServicePrice(service);
    
    const bankName = envLoader.get('BANK_NAME') || 'Banco';
    const bankCBU = envLoader.get('BANK_CBU') || 'CBU_NO_CONFIGURADO';
    const bankOwner = envLoader.get('BANK_OWNER') || 'Titular';
    
    alert(`Por favor, realiza la transferencia a:\n\nBanco ${bankName}\nCBU: ${bankCBU}\nTitular: ${bankOwner}\nMonto: ${formatPrice(price)}\n\nEnvía el comprobante por WhatsApp a Antonella para confirmar tu reserva.`);
    
    // Después de mostrar los datos, proceder con WhatsApp
    setTimeout(() => {
        const confirmed = confirm('¿Has realizado la transferencia bancaria?');
        if (confirmed) {
            processSuccessfulPayment();
        }
    }, 1000);
}

// Procesar pago exitoso
async function processSuccessfulPayment() {
    closeModal();
    
    try {
        // Obtener datos de la reserva
        const bookingData = {
            name: document.getElementById('name').value,
            dni: document.getElementById('dni').value,
            service: document.getElementById('service').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value
        };
        
        // Crear evento en Google Calendar
        const calendarResult = await calendarAPI.createEvent(bookingData);
        
        if (calendarResult.success) {
            console.log('Evento creado en calendario:', calendarResult.eventId);
        } else {
            console.warn('No se pudo crear el evento en calendario:', calendarResult.error);
        }
        
        // Mostrar mensaje de éxito
        alert('¡Pago realizado con éxito! Tu reserva ha sido confirmada. Se enviará un mensaje de WhatsApp a Antonella.');
        
        // Enviar WhatsApp
        sendWhatsApp();
        
        // Limpiar formulario
        document.getElementById('bookingForm').reset();
        clearTimeSlots();
        
    } catch (error) {
        console.error('Error procesando pago:', error);
        alert('Pago realizado, pero hubo un problema al procesar la reserva. Por favor contacta a Antonella directamente.');
        sendWhatsApp();
    }
}

// Enviar mensaje de WhatsApp
function sendWhatsApp() {
    const name = document.getElementById('name').value;
    const dni = document.getElementById('dni').value;
    const service = document.getElementById('service').value;
    const date = document.getElementById('date').value;
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
    updateBankInfo();
    
    // Inicializar Google Calendar API
    const calendarInitialized = await calendarAPI.init();
    
    // Configurar botón de autenticación si es necesario
    setupAuthButton(calendarInitialized);
    
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
    document.getElementById('transferBtn').addEventListener('click', processBankTransfer);
    
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
        const availableSlots = await calendarAPI.getAvailableSlots(date);
        
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

// Actualizar información bancaria en la UI
function updateBankInfo() {
    const bankNameEl = document.getElementById('bankName');
    const bankCBUEl = document.getElementById('bankCBU');
    const bankOwnerEl = document.getElementById('bankOwner');
    
    if (bankNameEl) bankNameEl.textContent = envLoader.get('BANK_NAME') || 'No configurado';
    if (bankCBUEl) bankCBUEl.textContent = envLoader.get('BANK_CBU') || 'No configurado';
    if (bankOwnerEl) bankOwnerEl.textContent = envLoader.get('BANK_OWNER') || 'No configurado';
}

// Configurar botón de autenticación
function setupAuthButton(calendarInitialized) {
    const authButton = document.getElementById('authButton');
    const calendarAuthInfo = document.getElementById('calendarAuthInfo');
    
    if (authButton) {
        authButton.addEventListener('click', async function() {
            try {
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
                
                const success = await calendarAPI.signIn();
                
                if (success) {
                    this.innerHTML = '<i class="fas fa-check"></i> Conectado';
                    this.style.background = '#4CAF50';
                    setTimeout(() => {
                        calendarAuthInfo.style.display = 'none';
                    }, 2000);
                } else {
                    this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                    this.style.background = '#f44336';
                    setTimeout(() => {
                        this.innerHTML = '<i class="fab fa-google"></i> Reintentar';
                        this.style.background = '#4285F4';
                        this.disabled = false;
                    }, 3000);
                }
            } catch (error) {
                console.error('Error en autenticación:', error);
                this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                this.style.background = '#f44336';
            }
        });
    }
    
    // Mostrar botón si Google Calendar está configurado pero no autenticado
    if (isCalendarConfigured() && calendarInitialized && !calendarAPI.isSignedIn) {
        console.log('📅 Google Calendar configurado pero no autenticado. Mostrando botón de login.');
        if (calendarAuthInfo) {
            calendarAuthInfo.style.display = 'block';
        }
    }
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
        const minDate = new Date('2025-07-23');
        
        if (selectedDate < minDate) {
            this.style.borderColor = '#f44336';
            this.setCustomValidity('La fecha debe ser a partir del 23/7/2025');
            clearTimeSlots();
        } else if (!isValidDate(selectedDate)) {
            this.style.borderColor = '#f44336';
            this.setCustomValidity('Solo se pueden reservar citas de lunes a viernes');
            clearTimeSlots();
        } else {
            this.style.borderColor = '#8B4B6B';
            this.setCustomValidity('');
            // Cargar horarios disponibles
            await loadAvailableTimeSlots(this.value);
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