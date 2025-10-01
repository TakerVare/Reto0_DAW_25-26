// ===== FUNCIONES UTILITARIAS =====

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del primer punto
 * @param {number} lng1 - Longitud del primer punto
 * @param {number} lat2 - Latitud del segundo punto
 * @param {number} lng2 - Longitud del segundo punto
 * @returns {number} Distancia en kilómetros
 */
function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Valida que las fechas de inicio no sean posteriores a las finales
 */
function validarFechas() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    
    if (fechaInicio && fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        
        if (inicio > fin) {
            document.getElementById('fechaFin').value = fechaInicio;
            alert('La fecha final se ajustó automáticamente.');
        }
    }
}

/**
 * Inicializa las fechas por defecto (últimos 14 días)
 */
function inicializarFechas() {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 14);
    document.getElementById("fechaInicio").value = fechaInicio.toISOString().slice(0, 10);
    
    const fechaFin = new Date();
    fechaFin.setHours(23, 59, 59, 999);
    document.getElementById("fechaFin").value = fechaFin.toISOString().slice(0, 10);
}

/**
 * Muestra un estado de carga en el contador
 * @param {string} mensaje - Mensaje a mostrar
 */
function mostrarEstadoCarga(mensaje) {
    const contador = document.getElementById('contadorEventos');
    if (contador) {
        contador.innerHTML = `<span class="cargando">⏳ ${mensaje}</span>`;
    }
}

/**
 * Muestra un mensaje de error
 * @param {string} mensaje - Mensaje de error
 */
function mostrarError(mensaje) {
    const lista = document.getElementById('listaEventos');
    const contador = document.getElementById('contadorEventos');
    
    if (lista) {
        lista.innerHTML = `
            <li class="error-mensaje">
                <p>❌ ${mensaje}</p>
                <button onclick="cargarEventosActivosIniciales()" class="btn-reintentar">
                    🔄 Reintentar
                </button>
            </li>
        `;
    }
    
    if (contador) {
        contador.innerHTML = '<span class="error">❌ Error al cargar</span>';
    }
    
    console.error('❌', mensaje);
}

/**
 * Muestra una notificación temporal
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de notificación (success, error, info)
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notif = document.createElement('div');
    notif.className = `notificacion notif-${tipo}`;
    notif.textContent = mensaje;
    notif.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${tipo === 'success' ? '#d4edda' : tipo === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${tipo === 'success' ? '#155724' : tipo === 'error' ? '#721c24' : '#0c5460'};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        border: 1px solid ${tipo === 'success' ? '#c3e6cb' : tipo === 'error' ? '#f5c6cb' : '#bee5eb'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
        font-weight: 600;
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

/**
 * Muestra una alerta simple
 * @param {string} mensaje - Mensaje a mostrar
 * @param {string} tipo - Tipo de alerta
 */
function mostrarAlerta(mensaje, tipo = 'info') {
    alert(mensaje);
}

// Añadir estilos para animaciones de notificaciones
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(styleSheet);

console.log('✅ Módulo de utilidades cargado');
