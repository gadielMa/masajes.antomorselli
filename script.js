// Configuración de fechas válidas (Lunes a Viernes)
function isValidDate(date) {
    const day = date.getDay();
    return day >= 1 && day <= 5; // 1=Lunes, 5=Viernes
}

// Configurar fecha mínima (hoy) y validar días de la semana
function setupDateValidation() {
    const dateInput = document.getElementById('date');
    const today = new Date();
    today.setDate(today.getDate() + 1); // Mínimo mañana
    
    // Formatear fecha para input
    const minDate = today.toISOString().split('T')[0];
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
    
    // Validar DNI (solo números)
    if (!/^\d+$/.test(dni)) {
        alert('El DNI debe contener solo números.');
        return false;
    }
    
    // Validar fecha
    const selectedDate = new Date(date);
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

// Generar link de Mercado Pago
function generateMercadoPagoLink() {
    const name = document.getElementById('name').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    
    // Crear descripción del pago
    const description = `Sesión de masaje - ${name} - ${formatDate(date)} ${time}`;
    
    // URL base de Mercado Pago para transferencias
    const mercadoPagoUrl = `https://www.mercadopago.com.ar/money-request/new`;
    
    return mercadoPagoUrl;
}

// Procesar pago con Mercado Pago
function processMercadoPago() {
    const mercadoPagoUrl = generateMercadoPagoLink();
    
    // Abrir Mercado Pago en nueva ventana
    window.open(mercadoPagoUrl, '_blank');
    
    // Simular pago exitoso después de 3 segundos (en producción, esto vendría de MP)
    setTimeout(() => {
        processSuccessfulPayment();
    }, 3000);
}

// Procesar transferencia bancaria
function processBankTransfer() {
    const service = document.getElementById('service').value;
    const price = getServicePrice(service);
    
    alert(`Por favor, realiza la transferencia a:\n\nBanco Galicia\nCBU: 0070035130004028938809\nTitular: Antonella Morselli\nMonto: ${formatPrice(price)}\n\nUna vez realizada la transferencia, tu reserva será confirmada automáticamente.`);
    
    // Simular transferencia exitosa
    setTimeout(() => {
        const confirmed = confirm('¿Has realizado la transferencia bancaria?');
        if (confirmed) {
            processSuccessfulPayment();
        }
    }, 1000);
}

// Procesar pago exitoso
function processSuccessfulPayment() {
    closeModal();
    
    // Mostrar mensaje de éxito
    alert('¡Pago realizado con éxito! Tu reserva ha sido confirmada. Se enviará un mensaje de WhatsApp a Antonella.');
    
    // Enviar WhatsApp
    sendWhatsApp();
    
    // Limpiar formulario
    document.getElementById('bookingForm').reset();
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
    const phoneNumber = '5491140691400'; // +54 9 11 4069-1400
    
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

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Configurar validación de fechas
    setupDateValidation();
    
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

// Validación en tiempo real
function setupRealTimeValidation() {
    const inputs = document.querySelectorAll('#bookingForm input, #bookingForm select');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.required && !this.value.trim()) {
                this.style.borderColor = '#f44336';
            } else {
                this.style.borderColor = '#8B4B6B';
            }
        });
        
        input.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(244, 67, 54)') {
                this.style.borderColor = '#e9ecef';
            }
        });
    });
} 