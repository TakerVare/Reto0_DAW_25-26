// ===== CONFIGURACIÓN GLOBAL =====
let map;
let eventosData = [];
let todoEventosData = [];
let marcadores = [];
let usuarioActual = null; // Se carga desde auth.js
let favoritosUsuario = []; // Se carga desde auth.js
let ubicacionUsuario = null;
let radioProximidad = 10000;

// VARIABLES PARA OPTIMIZACIÓN
let cacheEventos = new Map();
let soloEventosActivos = true;
let limiteEventosIniciales = 50;
let debounceTimer = null;

// Configuración de iconos basada en categorías reales de NASA EONET
const configuracionEventos = {
    'drought': { emoji: '☀️', color: '#FFD700', nombre: 'Sequía' },
    'dustHaze': { emoji: '🌫️', color: '#D2B48C', nombre: 'Polvo y Neblina' },
    'earthquakes': { emoji: '🌍', color: '#8B4513', nombre: 'Terremotos' },
    'floods': { emoji: '🌊', color: '#4169E1', nombre: 'Inundaciones' },
    'landslides': { emoji: '🏔️', color: '#A0522D', nombre: 'Deslizamientos' },
    'manmade': { emoji: '🏭', color: '#696969', nombre: 'Origen Humano' },
    'seaLakeIce': { emoji: '🧊', color: '#87CEEB', nombre: 'Hielo Marino' },
    'severeStorms': { emoji: '🌪️', color: '#FF4444', nombre: 'Tormentas Severas' },
    'snow': { emoji: '❄️', color: '#F0F8FF', nombre: 'Nieve' },
    'tempExtremes': { emoji: '🌡️', color: '#FF6347', nombre: 'Temperaturas Extremas' },
    'volcanoes': { emoji: '🌋', color: '#DC143C', nombre: 'Volcanes' },
    'waterColor': { emoji: '💧', color: '#20B2AA', nombre: 'Color del Agua' },
    'wildfires': { emoji: '🔥', color: '#FF4500', nombre: 'Incendios Forestales' },
    'default': { emoji: '⚠️', color: '#666666', nombre: 'Evento Natural' }
};

// URLs de la API NASA EONET
const API_ENDPOINTS = {
    nasa: {
        eventos: 'https://eonet.gsfc.nasa.gov/api/v3/events',
        eventosActivos: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open',
        eventosCerrados: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=closed',
        categorias: 'https://eonet.gsfc.nasa.gov/api/v3/categories'
    }
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando NASA EONET Tracker (Optimizado con autenticación)...');
    inicializarFechas();
    inicializarMapa();
    configurarEventosInterfaz();
    inicializarUsuarioDesdeAuth(); // Cargar usuario desde auth.js
    obtenerUbicacionUsuario();
    
    console.log('✅ Aplicación inicializada correctamente');
});

// ===== INICIALIZACIÓN DE FECHAS =====
function inicializarFechas() {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 14);
    document.getElementById("fechaInicio").value = fechaInicio.toISOString().slice(0, 10);
    
    const fechaFin = new Date();
    fechaFin.setHours(23, 59, 59, 999);
    document.getElementById("fechaFin").value = fechaFin.toISOString().slice(0, 10);
}

// ===== INICIALIZACIÓN DE USUARIO (INTEGRACIÓN CON AUTH.JS) =====
function inicializarUsuarioDesdeAuth() {
    // Obtener sesión desde auth.js
    if (typeof obtenerSesion === 'function') {
        const sesion = obtenerSesion();
        
        if (sesion) {
            usuarioActual = sesion;
            
            // Cargar favoritos del usuario
            if (typeof obtenerFavoritosUsuario === 'function') {
                favoritosUsuario = obtenerFavoritosUsuario(sesion.id);
                console.log('✅ Usuario autenticado:', usuarioActual.nombre);
                console.log('⭐ Favoritos cargados:', favoritosUsuario);
            }
        } else {
            usuarioActual = null;
            favoritosUsuario = [];
            console.log('ℹ️ No hay usuario autenticado');
        }
    }
}

// ===== GESTIÓN DE FAVORITOS (INTEGRADA CON AUTH.JS) =====
async function toggleFavorito(eventoId, titulo) {
    // Verificar si hay usuario logueado
    if (!usuarioActual) {
        mostrarAlerta('Debes iniciar sesión para marcar favoritos', 'info');
        
        // Abrir modal de login
        if (typeof abrirModalAuth === 'function') {
            setTimeout(() => abrirModalAuth(), 500);
        }
        return;
    }
    
    const yaEsFavorito = favoritosUsuario.includes(eventoId);
    
    try {
        if (yaEsFavorito) {
            // Eliminar favorito usando auth.js
            if (typeof eliminarFavorito === 'function') {
                eliminarFavorito(usuarioActual.id, eventoId);
                favoritosUsuario = favoritosUsuario.filter(id => id !== eventoId);
                console.log(`❌ ${titulo} eliminado de favoritos`);
                mostrarNotificacion(`Evento eliminado de favoritos`, 'info');
            }
        } else {
            // Agregar favorito usando auth.js
            if (typeof agregarFavorito === 'function') {
                agregarFavorito(usuarioActual.id, eventoId);
                favoritosUsuario.push(eventoId);
                console.log(`⭐ ${titulo} agregado a favoritos`);
                mostrarNotificacion(`¡Evento agregado a favoritos! ⭐`, 'success');
            }
        }
        
        // Actualizar interfaz completa sincronizadamente
        actualizarVistaEventos(obtenerEventosFiltrados());
        
    } catch (error) {
        console.error('❌ Error gestionando favorito:', error);
        mostrarAlerta('Error al gestionar favorito. Intenta de nuevo.', 'error');
    }
}

// ===== FUNCIÓN UNIFICADA PARA ACTUALIZAR VISTA (LISTA Y MAPA SINCRONIZADOS) =====
function actualizarVistaEventos(eventos, mostrarTotal = null) {
    if (!eventos || !Array.isArray(eventos)) {
        console.error('❌ Error: eventos no es un array válido');
        return;
    }
    
    console.log(`🔄 Actualizando vista con ${eventos.length} eventos`);
    
    // 1. Actualizar lista de eventos
    mostrarEventosEnLista(eventos);
    
    // 2. Actualizar mapa con los MISMOS eventos
    mostrarEventosEnMapaOptimizado(eventos);
    
    // 3. Actualizar contador
    actualizarContador(eventos.length, eventos, mostrarTotal);
    
    console.log(`✅ Vista sincronizada: ${eventos.length} eventos en lista y mapa`);
}

// Obtener eventos filtrados según el select de tipo
function obtenerEventosFiltrados() {
    const tipoSeleccionado = document.getElementById('selectTipoEvento')?.value;
    
    if (!tipoSeleccionado) {
        return eventosData;
    }
    
    return eventosData.filter(evento => 
        evento.categories && evento.categories.some(cat => cat.id === tipoSeleccionado)
    );
}

// ===== NOTIFICACIONES =====
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
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
    
    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function mostrarAlerta(mensaje, tipo = 'info') {
    alert(mensaje); // Fallback simple
}

// ===== CARGA DE EVENTOS =====
async function obtenerUbicacionUsuario() {
    try {
        mostrarEstadoCarga('Obteniendo tu ubicación para eventos cercanos...');
        
        if (!navigator.geolocation) {
            console.warn('⚠️ Geolocalización no disponible, cargando eventos activos globales');
            cargarEventosActivosIniciales();
            return;
        }
        
        const opciones = {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 600000
        };
        
        navigator.geolocation.getCurrentPosition(
            async (posicion) => {
                ubicacionUsuario = {
                    lat: posicion.coords.latitude,
                    lng: posicion.coords.longitude
                };
                
                console.log('✅ Ubicación obtenida:', ubicacionUsuario);
                
                if (map) {
                    ajustarZoomPorRadio();
                    agregarMarcadorUsuario();
                }
                
                await cargarEventosCercanosActivos();
            },
            (error) => {
                let mensaje = 'No se pudo obtener tu ubicación';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        mensaje = 'Ubicación denegada por el usuario';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        mensaje = 'Información de ubicación no disponible';
                        break;
                    case error.TIMEOUT:
                        mensaje = 'Timeout obteniendo ubicación';
                        break;
                }
                
                console.warn('⚠️', mensaje, '- Cargando eventos activos globales');
                cargarEventosActivosIniciales();
            },
            opciones
        );
        
    } catch (error) {
        console.error('❌ Error en geolocalización:', error);
        cargarEventosActivosIniciales();
    }
}

// ===== NUEVA FUNCIÓN: AJUSTAR ZOOM SEGÚN RADIO =====
function ajustarZoomPorRadio() {
    if (!map || !ubicacionUsuario) {
        console.log('⚠️ No se puede ajustar zoom: mapa o ubicación no disponibles');
        return;
    }
    
    let zoomLevel;
    
    // Mapear radio a nivel de zoom
    if (radioProximidad >= 999999) {
        zoomLevel = 2; // Vista global
    } else if (radioProximidad >= 20000) {
        zoomLevel = 4; // Continental
    } else if (radioProximidad >= 15000) {
        zoomLevel = 5; // Regional amplio
    } else if (radioProximidad >= 10000) {
        zoomLevel = 6; // Regional
    } else if (radioProximidad >= 5000) {
        zoomLevel = 7; // Local amplio
    } else {
        zoomLevel = 8; // Local
    }
    
    map.setView([ubicacionUsuario.lat, ubicacionUsuario.lng], zoomLevel);
    console.log(`🗺️ Zoom ajustado a nivel ${zoomLevel} para radio ${radioProximidad}km`);
}

// ===== NUEVA FUNCIÓN: ACTUALIZAR EVENTOS POR RADIO =====
async function actualizarEventosPorRadio() {
    const nuevoRadio = parseInt(document.getElementById('radioProximidad').value);
    
    if (nuevoRadio === radioProximidad) {
        console.log('ℹ️ El radio no ha cambiado');
        return;
    }
    
    radioProximidad = nuevoRadio;
    console.log(`📍 Radio actualizado a ${radioProximidad}km`);
    
    // Ajustar zoom del mapa según el nuevo radio
    ajustarZoomPorRadio();
    
    // Si no hay ubicación del usuario, solo mostrar todos los eventos
    if (!ubicacionUsuario) {
        console.log('ℹ️ Sin ubicación del usuario, mostrando todos los eventos');
        actualizarVistaEventos(eventosData);
        return;
    }
    
    // Si es global, mostrar todos los eventos
    if (radioProximidad >= 999999) {
        console.log('🌍 Radio global seleccionado, mostrando todos los eventos');
        eventosData = todoEventosData;
        actualizarVistaEventos(eventosData);
        return;
    }
    
    // Filtrar eventos por el nuevo radio
    mostrarEstadoCarga(`Filtrando eventos dentro de ${radioProximidad}km...`);
    
    const eventosCercanos = filtrarEventosPorProximidadOptimizado(
        todoEventosData, 
        ubicacionUsuario, 
        radioProximidad
    );
    
    console.log(`📍 Encontrados ${eventosCercanos.length} eventos dentro de ${radioProximidad}km`);
    
    if (eventosCercanos.length === 0) {
        // Si no hay eventos cercanos, mostrar los 20 más recientes
        const eventosRecientes = todoEventosData
            .sort((a, b) => {
                const fechaA = a.geometry && a.geometry.length > 0 ? new Date(a.geometry[0].date) : new Date(0);
                const fechaB = b.geometry && b.geometry.length > 0 ? new Date(b.geometry[0].date) : new Date(0);
                return fechaB - fechaA;
            })
            .slice(0, 20);
        
        eventosData = eventosRecientes;
        mostrarMensajeSinEventosCercanos();
    } else {
        eventosData = eventosCercanos;
    }
    
    // Actualizar vista con los nuevos eventos
    actualizarVistaEventos(eventosData, todoEventosData.length);
}

function agregarMarcadorUsuario() {
    L.marker([ubicacionUsuario.lat, ubicacionUsuario.lng], {
        icon: L.divIcon({
            html: `
                <div style="
                    background: #007bff;
                    border: 3px solid white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    box-shadow: 0 2px 10px rgba(0,123,255,0.5);
                "></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map).bindPopup('📍 Tu ubicación');
}

async function cargarEventosCercanosActivos() {
    try {
        mostrarEstadoCarga('Buscando eventos activos cercanos...');
        
        const eventosActivos = await obtenerEventosDeAPI(true, limiteEventosIniciales);
        
        if (!eventosActivos || eventosActivos.length === 0) {
            mostrarError('No se encontraron eventos activos o la API no responde.');
            return;
        }
        
        console.log(`⚡ API optimizada: ${eventosActivos.length} eventos activos obtenidos`);
        
        todoEventosData = eventosActivos;
        
        const eventosCercanos = filtrarEventosPorProximidadOptimizado(eventosActivos, ubicacionUsuario, radioProximidad);
        
        console.log(`📍 Encontrados ${eventosCercanos.length} eventos activos dentro de ${radioProximidad}km`);
        
        if (eventosCercanos.length === 0) {
            const eventosRecientes = eventosActivos
                .sort((a, b) => {
                    const fechaA = a.geometry && a.geometry.length > 0 ? new Date(a.geometry[0].date) : new Date(0);
                    const fechaB = b.geometry && b.geometry.length > 0 ? new Date(b.geometry[0].date) : new Date(0);
                    return fechaB - fechaA;
                })
                .slice(0, 20);
            
            eventosData = eventosRecientes;
            mostrarMensajeSinEventosCercanos();
        } else {
            eventosData = eventosCercanos;
        }
        
        // Usar función unificada para sincronizar lista y mapa
        actualizarVistaEventos(eventosData, eventosActivos.length);
        
    } catch (error) {
        console.error('❌ Error cargando eventos cercanos activos:', error);
        cargarEventosActivosIniciales();
    }
}

async function cargarEventosActivosIniciales() {
    try {
        mostrarEstadoCarga('Cargando eventos activos globales...');
        
        const eventosActivos = await obtenerEventosDeAPI(true, limiteEventosIniciales);
        
        if (eventosActivos && eventosActivos.length > 0) {
            eventosData = eventosActivos;
            todoEventosData = eventosActivos;
            
            // Usar función unificada para sincronizar lista y mapa
            actualizarVistaEventos(eventosActivos);
            
            console.log(`⚡ Carga inicial ultrarrápida: ${eventosActivos.length} eventos activos`);
        } else {
            mostrarError('No se encontraron eventos activos o la API no responde.');
        }
        
    } catch (error) {
        console.error('❌ Error cargando eventos activos iniciales:', error);
        mostrarError('Error al cargar los eventos activos. Verifica tu conexión a internet.');
    }
}

function filtrarEventosPorProximidadOptimizado(eventos, ubicacionUsuario, radioKm) {
    if (!ubicacionUsuario) {
        return eventos.slice(0, limiteEventosIniciales);
    }
    
    const eventosValidos = [];
    let contadorProcesados = 0;
    
    for (const evento of eventos) {
        if (!evento.geometry?.[0]?.coordinates || evento.geometry[0].coordinates.length < 2) {
            continue;
        }
        
        const geometria = evento.geometry[0];
        const lat = parseFloat(geometria.coordinates[1]);
        const lng = parseFloat(geometria.coordinates[0]);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            continue;
        }
        
        const cacheKey = `${ubicacionUsuario.lat},${ubicacionUsuario.lng}-${lat},${lng}`;
        let distancia = cacheEventos.get(cacheKey);
        
        if (distancia === undefined) {
            distancia = calcularDistanciaKm(ubicacionUsuario.lat, ubicacionUsuario.lng, lat, lng);
            cacheEventos.set(cacheKey, distancia);
        }
        
        if (distancia <= radioKm) {
            eventosValidos.push(evento);
        }
        
        contadorProcesados++;
        if (contadorProcesados >= limiteEventosIniciales * 2) break;
    }
    
    return eventosValidos;
}

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

function mostrarMensajeSinEventosCercanos() {
    const contador = document.getElementById('contadorEventos');
    if (contador) {
        contador.innerHTML = `
            <div class="mensaje-ubicacion">
                📍 No hay eventos activos dentro de ${radioProximidad}km
                <br><small>Mostrando eventos activos más recientes</small>
            </div>
        `;
    }
}

async function obtenerEventosDeAPI(soloActivos = true, limite = null) {
    try {
        let url = soloActivos ? API_ENDPOINTS.nasa.eventosActivos : API_ENDPOINTS.nasa.eventos;
        
        if (limite) {
            url += (soloActivos ? '&' : '?') + `limit=${limite}`;
        }
        
        const cacheKey = `${url}-${Date.now() - (Date.now() % 300000)}`;
        if (cacheEventos.has(cacheKey)) {
            console.log('⚡ Datos obtenidos del cache');
            return cacheEventos.get(cacheKey);
        }
        
        console.log(`🔄 Cargando desde API: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data?.events) {
            throw new Error('Respuesta de API inválida');
        }
        
        cacheEventos.set(cacheKey, data.events);
        
        console.log(`✅ ${data.events.length} eventos obtenidos de la API NASA ${soloActivos ? '(solo activos)' : ''}`);
        return data.events;
        
    } catch (error) {
        console.error('❌ Error en API NASA:', error);
        throw new Error('No se pudieron obtener los datos de la NASA: ' + error.message);
    }
}

// ===== FUNCIONES DE MAPEO =====
function inicializarMapa() {
    try {
        map = L.map('map').setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            minZoom: 2
        }).addTo(map);
        
        console.log('✅ Mapa inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando el mapa:', error);
        mostrarError('Error al inicializar el mapa. Verifica tu conexión a internet.');
    }
}

function mostrarEventosEnMapaOptimizado(eventos) {
    limpiarMarcadores();
    
    const eventosParaMapa = eventos.slice(0, 100);
    
    eventosParaMapa.forEach((evento, index) => {
        if (!evento.geometry?.[0]?.coordinates || evento.geometry[0].coordinates.length < 2) return;
        
        const geometria = evento.geometry[0];
        const lat = parseFloat(geometria.coordinates[1]);
        const lng = parseFloat(geometria.coordinates[0]);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return;
        }
        
        const tipoEvento = evento.categories?.[0]?.id || 'default';
        const esFavorito = favoritosUsuario.includes(evento.id);
        const icono = crearIconoEvento(tipoEvento, !evento.closed, esFavorito);
        
        const marcador = L.marker([lat, lng], { icon: icono })
            .addTo(map)
            .bindPopup(crearContenidoPopup(evento), {
                maxWidth: 350,
                className: 'popup-evento'
            });
        
        marcadores.push(marcador);
        
        marcador.on('click', function() {
            this.openPopup();
        });
    });
    
    if (eventos.length > eventosParaMapa.length) {
        console.log(`⚡ Optimización: Mostrando ${eventosParaMapa.length} de ${eventos.length} eventos en mapa`);
    } else {
        console.log(`✅ Mostrados ${marcadores.length} eventos en el mapa`);
    }
}

function crearIconoEvento(tipoEvento, esAbierto = true, esFavorito = false) {
    const config = configuracionEventos[tipoEvento] || configuracionEventos.default;
    const opacidad = esAbierto ? 1 : 0.6;
    const bordeColor = esFavorito ? '#FFD700' : 'white';
    const bordeTamaño = esFavorito ? '3px' : '2px';
    
    return L.divIcon({
        html: `
            <div style="
                background: ${config.color};
                border: ${bordeTamaño} solid ${bordeColor};
                border-radius: 50%;
                width: 35px;
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                opacity: ${opacidad};
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            " title="${config.nombre}">
                ${config.emoji}
                ${esFavorito ? '<div style="position: absolute; top: -5px; right: -5px; background: #FFD700; border-radius: 50%; width: 12px; height: 12px; font-size: 8px; display: flex; align-items: center; justify-content: center;">⭐</div>' : ''}
            </div>
        `,
        iconSize: [35, 35],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17],
        className: 'custom-evento-icon'
    });
}

function crearContenidoPopup(evento) {
    const categoria = evento.categories && evento.categories.length > 0 
        ? evento.categories[0] 
        : { title: 'Sin categoría', id: 'default' };
    
    const config = configuracionEventos[categoria.id] || configuracionEventos.default;
    const fechaGeometria = evento.geometry && evento.geometry.length > 0 
        ? new Date(evento.geometry[0].date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : 'Fecha no disponible';
    
    const esFavorito = favoritosUsuario.includes(evento.id);
    const iconoFavorito = esFavorito ? '⭐' : '☆';
    
    return `
        <div class="popup-contenido">
            <div class="popup-header">
                <h3 style="margin: 0; color: ${config.color}; flex: 1;">
                    ${config.emoji} ${evento.title}
                </h3>
                ${usuarioActual ? `
                    <button class="btn-favorito" onclick="toggleFavorito('${evento.id}', '${evento.title.replace(/'/g, "\\'")}')">
                        ${iconoFavorito}
                    </button>
                ` : `
                    <button class="btn-favorito" onclick="abrirModalAuth()">
                        ☆
                    </button>
                `}
            </div>
            
            <div class="info-basica">
                <p><strong>📋 Categoría:</strong> ${categoria.title}</p>
                <p><strong>📅 Fecha:</strong> ${fechaGeometria}</p>
                <p><strong>🔄 Estado:</strong> 
                    <span style="color: ${evento.closed ? '#dc3545' : '#28a745'};">
                        ${evento.closed ? '❌ Cerrado' : '✅ Abierto'}
                    </span>
                </p>
                <p><strong>🆔 ID NASA:</strong> ${evento.id}</p>
            </div>
            
            ${evento.description ? `
                <div class="descripcion">
                    <p><strong>📝 Descripción:</strong></p>
                    <p style="font-style: italic;">${evento.description}</p>
                </div>
            ` : ''}
            
            <div class="coordenadas">
                <p><strong>🌍 Coordenadas:</strong> 
                    ${evento.geometry[0].coordinates[1].toFixed(4)}, 
                    ${evento.geometry[0].coordinates[0].toFixed(4)}
                </p>
                ${evento.geometry[0].magnitudeValue ? `
                    <p><strong>📊 Magnitud:</strong> 
                        ${evento.geometry[0].magnitudeValue} ${evento.geometry[0].magnitudeUnit || ''}
                    </p>
                ` : ''}
            </div>
            
            ${evento.sources && evento.sources.length > 0 ? `
                <div class="fuentes">
                    <p><strong>🔗 Fuentes NASA:</strong></p>
                    ${evento.sources.map(source => 
                        `<a href="${source.url}" target="_blank" rel="noopener">${source.id || 'Ver más información'}</a>`
                    ).join('<br>')}
                </div>
            ` : ''}
        </div>
    `;
}

function mostrarEventosEnLista(eventos) {
    const lista = document.getElementById('listaEventos');
    if (!lista) return;
    
    lista.innerHTML = '';
    
    if (eventos.length === 0) {
        lista.innerHTML = `
            <li class="sin-eventos">
                <p>No se encontraron eventos con los filtros aplicados.</p>
                <button onclick="limpiarFiltros()" class="btn-secundario">Limpiar filtros</button>
            </li>
        `;
        return;
    }
    
    eventos.forEach((evento, index) => {
        const categoria = evento.categories && evento.categories.length > 0 
            ? evento.categories[0] 
            : { title: 'Sin categoría', id: 'default' };
        
        const config = configuracionEventos[categoria.id] || configuracionEventos.default;
        const esFavorito = favoritosUsuario.includes(evento.id);
        
        const li = document.createElement('li');
        li.className = 'evento-item';
        li.innerHTML = `
            <div class="evento-header">
                <span class="evento-emoji" style="color: ${config.color};">${config.emoji}</span>
                <h4 class="evento-titulo">${evento.title}</h4>
                <div class="evento-badges">
                    <span class="evento-estado ${evento.closed ? 'cerrado' : 'abierto'}">
                        ${evento.closed ? 'Cerrado' : 'Abierto'}
                    </span>
                    ${esFavorito ? '<span class="badge-favorito">⭐</span>' : ''}
                </div>
            </div>
            <div class="evento-detalles">
                <p><strong>Categoría:</strong> ${categoria.title}</p>
                <p><strong>Fecha:</strong> ${evento.geometry && evento.geometry.length > 0 
                    ? new Date(evento.geometry[0].date).toLocaleDateString('es-ES')
                    : 'No disponible'}
                </p>
                <p><strong>ID NASA:</strong> ${evento.id}</p>
                ${usuarioActual ? `
                    <button class="btn-favorito-lista" onclick="toggleFavorito('${evento.id}', '${evento.title.replace(/'/g, "\\'")}')">
                        ${esFavorito ? '⭐ Quitar favorito' : '☆ Agregar favorito'}
                    </button>
                ` : `
                    <button class="btn-favorito-lista" onclick="abrirModalAuth()">
                        🔐 Iniciar sesión para favoritos
                    </button>
                `}
            </div>
        `;
        
        li.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-favorito-lista')) return;
            
            if (evento.geometry && evento.geometry.length > 0) {
                const lat = parseFloat(evento.geometry[0].coordinates[1]);
                const lng = parseFloat(evento.geometry[0].coordinates[0]);
                map.setView([lat, lng], 8);
                
                // Buscar el marcador correspondiente y abrirlo
                const indiceEnMapa = Math.min(index, marcadores.length - 1);
                if (marcadores[indiceEnMapa]) {
                    marcadores[indiceEnMapa].openPopup();
                }
            }
        });
        
        lista.appendChild(li);
    });
    
    console.log(`✅ Lista actualizada con ${eventos.length} eventos`);
}

// ===== FUNCIONES DE INTERFAZ =====
function configurarEventosInterfaz() {
    const btnAplicar = document.getElementById('btnAplicarFiltro');
    if (btnAplicar) btnAplicar.addEventListener('click', aplicarFiltroFechasOptimizado);
    
    const btnLimpiar = document.getElementById('btnLimpiarFiltro');
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltros);
    
    const btnCentrar = document.getElementById('btnCentrarMapa');
    if (btnCentrar) {
        btnCentrar.addEventListener('click', centrarMapa);
    }
    
    const selectTipo = document.getElementById('selectTipoEvento');
    if (selectTipo) {
        selectTipo.addEventListener('change', filtrarPorTipoEventoOptimizado);
        actualizarOpcionesCategorias(selectTipo);
    }
    
    // NUEVO: Listener para el select de radio de proximidad
    const selectRadio = document.getElementById('radioProximidad');
    if (selectRadio) {
        selectRadio.addEventListener('change', actualizarEventosPorRadio);
        console.log('✅ Listener de radio de proximidad configurado');
    }
    
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    
    if (fechaInicio) fechaInicio.addEventListener('change', validarFechas);
    if (fechaFin) fechaFin.addEventListener('change', validarFechas);
    
    agregarBotonesOptimizados();
    
    console.log('✅ Eventos de interfaz configurados (optimizado)');
}

function agregarBotonesOptimizados() {
    const controlesMapa = document.querySelector('.controles-mapa');
    if (!controlesMapa) return;
    
    if (!document.getElementById('btnTodosEventosActivos')) {
        const btnTodosActivos = document.createElement('button');
        btnTodosActivos.id = 'btnTodosEventosActivos';
        btnTodosActivos.innerHTML = '⚡ Más Eventos Activos';
        btnTodosActivos.classList.add('btn-optimizado');
        btnTodosActivos.addEventListener('click', cargarTodosLosEventosActivos);
        controlesMapa.appendChild(btnTodosActivos);
    }
    
    if (!document.getElementById('btnEventosCerrados')) {
        const btnCerrados = document.createElement('button');
        btnCerrados.id = 'btnEventosCerrados';
        btnCerrados.innerHTML = '🔍 Ver Eventos Cerrados';
        btnCerrados.classList.add('btn-secundario-opt');
        btnCerrados.addEventListener('click', cargarEventosCerrados);
        controlesMapa.appendChild(btnCerrados);
    }
}

async function cargarTodosLosEventosActivos() {
    try {
        mostrarEstadoCarga('Cargando todos los eventos activos...');
        
        const todosEventosActivos = await obtenerEventosDeAPI(true);
        todoEventosData = todosEventosActivos;
        eventosData = todosEventosActivos;
        
        // Usar función unificada para sincronizar lista y mapa
        actualizarVistaEventos(eventosData);
        
        console.log(`✅ Cargados todos los eventos activos: ${eventosData.length}`);
    } catch (error) {
        console.error('❌ Error cargando todos los eventos activos:', error);
        mostrarError('Error al cargar todos los eventos activos.');
    }
}

async function cargarEventosCerrados() {
    try {
        mostrarEstadoCarga('Cargando eventos cerrados...');
        
        const eventosCerrados = await obtenerEventosDeAPI(false);
        const soloEventosCerrados = eventosCerrados.filter(evento => evento.closed);
        
        const eventosCompletos = [...eventosData, ...soloEventosCerrados];
        todoEventosData = eventosCompletos;
        eventosData = eventosCompletos;
        
        // Usar función unificada para sincronizar lista y mapa
        actualizarVistaEventos(eventosData);
        
        console.log(`✅ Añadidos ${soloEventosCerrados.length} eventos cerrados`);
    } catch (error) {
        console.error('❌ Error cargando eventos cerrados:', error);
        mostrarError('Error al cargar eventos cerrados.');
    }
}

function aplicarFiltroFechasOptimizado() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
        aplicarFiltroFechas();
    }, 300);
}

function filtrarPorTipoEventoOptimizado() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
        filtrarPorTipoEvento();
    }, 200);
}

function aplicarFiltroFechas() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    
    if (!fechaInicio || !fechaFin) {
        alert('Por favor, selecciona ambas fechas para filtrar los eventos.');
        return;
    }
    
    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);
    
    if (fechaInicioDate > fechaFinDate) {
        alert('La fecha de inicio no puede ser posterior a la fecha final.');
        return;
    }
    
    mostrarEstadoCarga('Filtrando eventos...');
    
    const eventosFiltrados = eventosData.filter(evento => {
        return evento.geometry.some(geo => {
            const fechaEvento = new Date(geo.date);
            return fechaEvento >= fechaInicioDate && fechaEvento <= fechaFinDate;
        });
    });
    
    // Usar función unificada para sincronizar lista y mapa
    actualizarVistaEventos(eventosFiltrados, eventosData.length);
}

function limpiarFiltros() {
    document.getElementById('fechaInicio').value = '';
    document.getElementById('fechaFin').value = '';
    document.getElementById('selectTipoEvento').value = '';
    
    // Usar función unificada para sincronizar lista y mapa
    actualizarVistaEventos(eventosData);
}

function filtrarPorTipoEvento() {
    const tipoSeleccionado = document.getElementById('selectTipoEvento').value;
    
    if (!tipoSeleccionado) {
        // Usar función unificada para sincronizar lista y mapa
        actualizarVistaEventos(eventosData);
        return;
    }
    
    const eventosFiltrados = eventosData.filter(evento => {
        return evento.categories && evento.categories.some(cat => cat.id === tipoSeleccionado);
    });
    
    // Usar función unificada para sincronizar lista y mapa
    actualizarVistaEventos(eventosFiltrados, eventosData.length);
}

// ===== ACTUALIZACIÓN DE CONTADOR SIMPLIFICADA =====
function actualizarContador(mostrados, eventosActuales = null, total = null) {
    const contador = document.getElementById('contadorEventos');
    if (!contador) return;
    
    // Contar favoritos en los eventos mostrados
    const eventosMostrados = eventosActuales || eventosData;
    const favoritosCount = eventosMostrados.filter(e => favoritosUsuario.includes(e.id)).length;
    
    let texto;
    if (total && total > mostrados) {
        texto = `📊 ${mostrados} de ${total} eventos`;
    } else if (ubicacionUsuario && todoEventosData.length > 0 && mostrados < todoEventosData.length) {
        texto = `📍 ${mostrados} eventos cercanos de ${todoEventosData.length} totales (${radioProximidad}km)`;
    } else {
        texto = `⚡ ${mostrados} eventos ${soloEventosActivos ? 'activos' : ''}`;
    }
    
    if (favoritosCount > 0) {
        texto += ` | ⭐ ${favoritosCount} favoritos`;
    }
    
    contador.innerHTML = `<span>${texto}</span>`;
}

function actualizarOpcionesCategorias(selectElement) {
    const primeraOpcion = selectElement.firstElementChild;
    selectElement.innerHTML = '';
    selectElement.appendChild(primeraOpcion);
    
    Object.entries(configuracionEventos).forEach(([id, config]) => {
        if (id !== 'default') {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${config.emoji} ${config.nombre}`;
            selectElement.appendChild(option);
        }
    });
}

function limpiarMarcadores() {
    marcadores.forEach(marcador => map.removeLayer(marcador));
    marcadores = [];
}

function centrarMapa() {
    if (ubicacionUsuario) {
        ajustarZoomPorRadio();
        console.log('✅ Mapa centrado en tu ubicación');
    } else {
        map.setView([20, 0], 2);
        console.log('✅ Mapa centrado globalmente');
    }
}

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

function mostrarEstadoCarga(mensaje) {
    const contador = document.getElementById('contadorEventos');
    if (contador) {
        contador.innerHTML = `<span class="cargando">⏳ ${mensaje}</span>`;
    }
}

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

console.log(`
🚀 NASA EONET Tracker - Versión con FILTRO DINÁMICO DE RADIO

✅ Sistema de usuarios implementado con localStorage
🔐 Autenticación completa (login/registro)
⭐ Favoritos personalizados por usuario
🎯 4 usuarios de prueba disponibles
🔄 Sincronización AUTOMÁTICA lista-mapa implementada
📍 NUEVO: Filtro de Radio de Proximidad dinámico

Características del filtro de radio:
• El listado se actualiza automáticamente al cambiar el radio
• El zoom del mapa se ajusta según el radio seleccionado
• Radio global (999999 km) muestra todos los eventos
• Radios menores filtran por proximidad a tu ubicación
• Indicador visual del radio actual en el contador

Mapeo de Radio → Zoom:
- Global (999999km): Zoom 2
- 20,000km: Zoom 4
- 15,000km: Zoom 5
- 10,000km: Zoom 6
- 5,000km: Zoom 7

Para usar el sistema:
1. Haz clic en "🔐 Iniciar Sesión" en la esquina superior
2. Usa uno de los usuarios de prueba o crea uno nuevo
3. Cambia el radio de proximidad en el filtro
4. ¡Observa cómo se actualiza todo automáticamente!

Los datos se guardan en localStorage de tu navegador.
`);