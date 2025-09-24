// ===== CONFIGURACIÓN GLOBAL =====
let map;
let eventosData = [];
let todoEventosData = []; // Almacena TODOS los eventos de la API
let marcadores = [];
let usuarioActual = null; // Se carga desde JWT en localStorage
let favoritosUsuario = []; // Array de IDs de eventos favoritos
let ubicacionUsuario = null; // {lat, lng} del usuario
let radioProximidad = 1000; // Radio en km para filtrar eventos cercanos

// NUEVAS VARIABLES PARA OPTIMIZACIÓN
let cacheEventos = new Map(); // Cache para evitar re-cargas
let soloEventosActivos = true; // Filtrar solo eventos abiertos inicialmente
let limiteEventosIniciales = 50; // Máximo de eventos a cargar inicialmente
let debounceTimer = null; // Para debouncing de filtros

// Configuración de iconos basada en categorías reales de NASA EONET
const configuracionEventos = {
    // Categorías reales de la API NASA EONET
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

// URLs para integraciones con backend Java (ultra-simple)
const API_ENDPOINTS = {
    // Autenticación JWT (sin persistir sesiones en BD)
    auth: {
        login: '/api/auth/login',      // POST → Devuelve JWT
        register: '/api/auth/register' // POST → Crea usuario y devuelve JWT
    },
    // Favoritos (solo 2 endpoints necesarios)
    favoritos: {
        obtener: (usuarioId) => `/api/usuarios/${usuarioId}/favoritos`,           // GET → Array de evento_ids
        toggle: (usuarioId) => `/api/usuarios/${usuarioId}/favoritos`             // POST/DELETE → Agregar/Eliminar
    },
    // API NASA EONET (directo desde frontend) - OPTIMIZADA
    nasa: {
        eventos: 'https://eonet.gsfc.nasa.gov/api/v3/events',
        eventosActivos: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open', // Solo eventos abiertos
        eventosCerrados: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=closed', // Solo eventos cerrados
        categorias: 'https://eonet.gsfc.nasa.gov/api/v3/categories'
    }
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando NASA EONET Tracker (Optimizado)...');
    
    inicializarMapa();
    configurarEventosInterfaz();
    inicializarUsuario(); // Verificar JWT en localStorage
    obtenerUbicacionUsuario(); // Obtener ubicación para filtrar eventos cercanos
    
    console.log('✅ Aplicación inicializada correctamente');
});

// ===== GESTIÓN DE UBICACIÓN Y PROXIMIDAD OPTIMIZADA =====
async function obtenerUbicacionUsuario() {
    try {
        mostrarEstadoCarga('Obteniendo tu ubicación para eventos cercanos...');
        
        // Verificar si la geolocalización está disponible
        if (!navigator.geolocation) {
            console.warn('⚠️ Geolocalización no disponible, cargando eventos activos globales');
            cargarEventosActivosIniciales();
            return;
        }
        
        // Opciones para la geolocalización (más agresivo para velocidad)
        const opciones = {
            enableHighAccuracy: false, // Menos preciso pero más rápido
            timeout: 5000, // 5 segundos en vez de 10
            maximumAge: 600000 // 10 minutos de cache
        };
        
        // Obtener ubicación del usuario
        navigator.geolocation.getCurrentPosition(
            // Éxito
            async (posicion) => {
                ubicacionUsuario = {
                    lat: posicion.coords.latitude,
                    lng: posicion.coords.longitude
                };
                
                console.log('✅ Ubicación obtenida:', ubicacionUsuario);
                
                // Centrar el mapa en la ubicación del usuario
                if (map) {
                    map.setView([ubicacionUsuario.lat, ubicacionUsuario.lng], 6);
                    agregarMarcadorUsuario();
                }
                
                // Cargar eventos cercanos Y ACTIVOS (doble filtro para máxima velocidad)
                await cargarEventosCercanosActivos();
            },
            // Error
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
        
        // Obtener solo eventos ACTIVOS (mucho más rápido)
        const eventosActivos = await obtenerEventosDeAPI(true, limiteEventosIniciales);
        
        if (!eventosActivos || eventosActivos.length === 0) {
            mostrarError('No se encontraron eventos activos o la API no responde.');
            return;
        }
        
        console.log(`⚡ API optimizada: ${eventosActivos.length} eventos activos obtenidos`);
        
        // Guardar todos los eventos activos para uso posterior
        todoEventosData = eventosActivos;
        
        // Filtrar eventos cercanos (dentro del radio especificado)
        const eventosCercanos = filtrarEventosPorProximidadOptimizado(eventosActivos, ubicacionUsuario, radioProximidad);
        
        console.log(`📍 Encontrados ${eventosCercanos.length} eventos activos dentro de ${radioProximidad}km`);
        
        if (eventosCercanos.length === 0) {
            // Si no hay eventos cercanos, mostrar los más recientes activos
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
        
        mostrarEventosEnMapaOptimizado(eventosData);
        mostrarEventosEnLista(eventosData);
        actualizarContadorEventosOptimizado(eventosData.length, eventosActivos.length);
        
    } catch (error) {
        console.error('❌ Error cargando eventos cercanos activos:', error);
        cargarEventosActivosIniciales(); // Fallback a la carga normal
    }
}

async function cargarEventosActivosIniciales() {
    try {
        mostrarEstadoCarga('Cargando eventos activos globales...');
        
        // Cargar solo eventos activos con límite (súper rápido)
        const eventosActivos = await obtenerEventosDeAPI(true, limiteEventosIniciales);
        
        if (eventosActivos && eventosActivos.length > 0) {
            eventosData = eventosActivos;
            todoEventosData = eventosActivos;
            
            mostrarEventosEnMapaOptimizado(eventosActivos);
            mostrarEventosEnLista(eventosActivos);
            actualizarContadorEventosOptimizado(eventosActivos.length);
            
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
        return eventos.slice(0, limiteEventosIniciales); // Limitar si no hay ubicación
    }
    
    const eventosValidos = [];
    let contadorProcesados = 0;
    
    for (const evento of eventos) {
        // Verificar que el evento tenga geometría válida (optimizado)
        if (!evento.geometry?.[0]?.coordinates || evento.geometry[0].coordinates.length < 2) {
            continue;
        }
        
        const geometria = evento.geometry[0];
        const lat = parseFloat(geometria.coordinates[1]);
        const lng = parseFloat(geometria.coordinates[0]);
        
        // Verificar coordenadas válidas (optimizado)
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            continue;
        }
        
        // Calcular distancia usando cache
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
        // Limitar procesamiento para evitar bloquear UI
        if (contadorProcesados >= limiteEventosIniciales * 2) break;
    }
    
    return eventosValidos;
}

function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
    // Fórmula de Haversine optimizada
    const R = 6371; // Radio de la Tierra en km
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

// ===== CARGA DE EVENTOS OPTIMIZADA =====
async function obtenerEventosDeAPI(soloActivos = true, limite = null) {
    try {
        // Construir URL optimizada
        let url = soloActivos ? API_ENDPOINTS.nasa.eventosActivos : API_ENDPOINTS.nasa.eventos;
        
        // Añadir límite si se especifica
        if (limite) {
            url += (soloActivos ? '&' : '?') + `limit=${limite}`;
        }
        
        // Verificar cache primero
        const cacheKey = `${url}-${Date.now() - (Date.now() % 300000)}`; // Cache de 5 minutos
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
        
        // Guardar en cache
        cacheEventos.set(cacheKey, data.events);
        
        console.log(`✅ ${data.events.length} eventos obtenidos de la API NASA ${soloActivos ? '(solo activos)' : ''}`);
        return data.events;
        
    } catch (error) {
        console.error('❌ Error en API NASA:', error);
        throw new Error('No se pudieron obtener los datos de la NASA: ' + error.message);
    }
}

// ===== CARGAR MÁS EVENTOS (FUNCIONES ADICIONALES) =====
async function cargarTodosLosEventosActivos() {
    try {
        mostrarEstadoCarga('Cargando todos los eventos activos...');
        
        const todosEventosActivos = await obtenerEventosDeAPI(true); // Sin límite
        todoEventosData = todosEventosActivos;
        eventosData = todosEventosActivos;
        
        mostrarEventosEnMapaOptimizado(eventosData);
        mostrarEventosEnLista(eventosData);
        actualizarContadorEventosOptimizado(eventosData.length);
        
        console.log(`✅ Cargados todos los eventos activos: ${eventosData.length}`);
    } catch (error) {
        console.error('❌ Error cargando todos los eventos activos:', error);
        mostrarError('Error al cargar todos los eventos activos.');
    }
}

async function cargarEventosCerrados() {
    try {
        mostrarEstadoCarga('Cargando eventos cerrados...');
        
        const eventosCerrados = await obtenerEventosDeAPI(false); // Todos los eventos
        const soloEventosCerrados = eventosCerrados.filter(evento => evento.closed);
        
        // Combinar con eventos actuales
        const eventosCompletos = [...eventosData, ...soloEventosCerrados];
        todoEventosData = eventosCompletos;
        eventosData = eventosCompletos;
        
        mostrarEventosEnMapaOptimizado(eventosData);
        mostrarEventosEnLista(eventosData);
        actualizarContadorEventosOptimizado(eventosData.length);
        
        console.log(`✅ Añadidos ${soloEventosCerrados.length} eventos cerrados`);
    } catch (error) {
        console.error('❌ Error cargando eventos cerrados:', error);
        mostrarError('Error al cargar eventos cerrados.');
    }
}

// ===== MOSTRAR EVENTOS EN MAPA OPTIMIZADO =====
function mostrarEventosEnMapaOptimizado(eventos) {
    // Limpiar marcadores existentes
    limpiarMarcadores();
    
    // Crear marcadores solo para los primeros eventos (evitar sobrecarga)
    const eventosParaMapa = eventos.slice(0, 100); // Máximo 100 marcadores
    
    eventosParaMapa.forEach((evento, index) => {
        if (!evento.geometry?.[0]?.coordinates || evento.geometry[0].coordinates.length < 2) return;
        
        const geometria = evento.geometry[0];
        const lat = parseFloat(geometria.coordinates[1]);
        const lng = parseFloat(geometria.coordinates[0]);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return;
        }
        
        // Determinar tipo basado en categorías reales
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
        
        // Mostrar popup solo en click, no en hover (optimización)
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

// ===== CONFIGURACIÓN DE EVENTOS DE INTERFAZ OPTIMIZADA =====
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
    
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    
    if (fechaInicio) fechaInicio.addEventListener('change', validarFechas);
    if (fechaFin) fechaFin.addEventListener('change', validarFechas);
    
    // Agregar botones optimizados
    agregarBotonesOptimizados();
    
    console.log('✅ Eventos de interfaz configurados (optimizado)');
}

function agregarBotonesOptimizados() {
    const controlesMapa = document.querySelector('.controles-mapa');
    if (!controlesMapa) return;
    
    // Botón para cargar todos los eventos activos
    if (!document.getElementById('btnTodosEventosActivos')) {
        const btnTodosActivos = document.createElement('button');
        btnTodosActivos.id = 'btnTodosEventosActivos';
        btnTodosActivos.innerHTML = '⚡ Más Eventos Activos';
        btnTodosActivos.classList.add('btn-optimizado');
        btnTodosActivos.addEventListener('click', cargarTodosLosEventosActivos);
        controlesMapa.appendChild(btnTodosActivos);
    }
    
    // Botón para cargar eventos cerrados
    if (!document.getElementById('btnEventosCerrados')) {
        const btnCerrados = document.createElement('button');
        btnCerrados.id = 'btnEventosCerrados';
        btnCerrados.innerHTML = '🔍 Ver Eventos Cerrados';
        btnCerrados.classList.add('btn-secundario-opt');
        btnCerrados.addEventListener('click', cargarEventosCerrados);
        controlesMapa.appendChild(btnCerrados);
    }
}

// ===== FILTROS OPTIMIZADOS CON DEBOUNCING =====
function aplicarFiltroFechasOptimizado() {
    // Limpiar timer anterior
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    // Debounce de 300ms para evitar múltiples ejecuciones
    debounceTimer = setTimeout(() => {
        aplicarFiltroFechas();
    }, 300);
}

function filtrarPorTipoEventoOptimizado() {
    // Limpiar timer anterior
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    // Debounce de 200ms
    debounceTimer = setTimeout(() => {
        filtrarPorTipoEvento();
    }, 200);
}

function actualizarContadorEventosOptimizado(mostrados, total = null) {
    const contador = document.getElementById('contadorEventos');
    if (contador) {
        const favoritosCount = eventosData.filter(e => favoritosUsuario.includes(e.id)).length;
        
        let texto;
        if (total && total > mostrados) {
            texto = `📊 ${mostrados} de ${total} eventos`;
        } else if (ubicacionUsuario && todoEventosData.length > 0 && mostrados < todoEventosData.length) {
            texto = `📍 ${mostrados} eventos cercanos de ${todoEventosData.length} totales`;
        } else {
            texto = `⚡ ${mostrados} eventos ${soloEventosActivos ? 'activos' : ''}`;
        }
        
        if (favoritosCount > 0) {
            texto += ` | ⭐ ${favoritosCount} favoritos`;
        }
        
        contador.innerHTML = `<span>${texto}</span>`;
    }
}

// ===== GESTIÓN DE USUARIO Y FAVORITOS (SIN CAMBIOS) =====
async function inicializarUsuario() {
    const token = localStorage.getItem('nasa_tracker_token');
    
    if (token && !esTokenExpirado(token)) {
        usuarioActual = decodificarJWT(token);
        console.log('✅ Usuario autenticado:', usuarioActual.email);
        await cargarFavoritosUsuario();
        actualizarInterfazUsuario();
    } else {
        usuarioActual = null;
        favoritosUsuario = [];
        if (token) localStorage.removeItem('nasa_tracker_token');
        console.log('ℹ️ Usuario no autenticado');
        mostrarFormularioLogin();
    }
}

function decodificarJWT(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.sub,
            email: payload.email,
            nombre: payload.nombre || payload.email.split('@')[0],
            rol: payload.rol || 'ciudadano'
        };
    } catch (error) {
        console.error('❌ Error decodificando JWT:', error);
        return null;
    }
}

function esTokenExpirado(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const ahora = Math.floor(Date.now() / 1000);
        return payload.exp < ahora;
    } catch {
        return true;
    }
}

async function cargarFavoritosUsuario() {
    if (!usuarioActual) return;
    
    try {
        const token = localStorage.getItem('nasa_tracker_token');
        const response = await fetch(API_ENDPOINTS.favoritos.obtener(usuarioActual.id), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const favoritos = await response.json();
            favoritosUsuario = Array.isArray(favoritos) ? favoritos : favoritos.map(f => f.eventoId || f.evento_id);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
        console.log('✅ Favoritos del usuario cargados:', favoritosUsuario);
    } catch (error) {
        console.warn('⚠️ Error cargando favoritos (usando mock):', error);
        favoritosUsuario = ['EONET_15547', 'EONET_15545'];
    }
}

function actualizarInterfazUsuario() {
    if (usuarioActual) {
        const nav = document.querySelector('nav ul');
        const userInfoExistente = nav.querySelector('.user-info-container');
        if (userInfoExistente) userInfoExistente.remove();
        
        const userContainer = document.createElement('li');
        userContainer.className = 'user-info-container';
        userContainer.innerHTML = `
            <span class="user-info">
                👤 ${usuarioActual.nombre} 
                <small>(${usuarioActual.rol})</small>
            </span>
            <button class="btn-logout" onclick="logout()">Salir</button>
        `;
        nav.appendChild(userContainer);
    }
}

function mostrarFormularioLogin() {
    console.log('💡 Para probar favoritos, simular login con: simularLogin()');
}

function simularLogin() {
    usuarioActual = {
        id: 2,
        nombre: "Dr. María García",
        email: "maria.garcia@cientifico.es",
        rol: "cientifico"
    };
    
    localStorage.setItem('nasa_tracker_token', `header.${btoa(JSON.stringify(usuarioActual))}.signature`);
    cargarFavoritosUsuario();
    actualizarInterfazUsuario();
    console.log('✅ Login simulado exitoso');
}

function logout() {
    usuarioActual = null;
    favoritosUsuario = [];
    localStorage.removeItem('nasa_tracker_token');
    
    const userContainer = document.querySelector('.user-info-container');
    if (userContainer) userContainer.remove();
    actualizarIconosFavoritos();
    console.log('👋 Sesión cerrada');
}

async function toggleFavorito(eventoId, titulo) {
    if (!usuarioActual) {
        alert('Debes iniciar sesión para marcar favoritos');
        console.log('💡 Prueba con: simularLogin()');
        return;
    }
    
    const esFavorito = favoritosUsuario.includes(eventoId);
    
    try {
        if (esFavorito) {
            await eliminarFavorito(eventoId);
            favoritosUsuario = favoritosUsuario.filter(id => id !== eventoId);
            console.log(`❌ ${titulo} eliminado de favoritos`);
        } else {
            await agregarFavorito(eventoId);
            favoritosUsuario.push(eventoId);
            console.log(`⭐ ${titulo} agregado a favoritos`);
        }
        
        actualizarIconosFavoritos();
        actualizarContadorEventosOptimizado(eventosData.length);
        
        const eventosActuales = document.getElementById('selectTipoEvento').value 
            ? eventosData.filter(evento => 
                evento.categories && evento.categories.some(cat => cat.id === document.getElementById('selectTipoEvento').value)
            )
            : eventosData;
        
        mostrarEventosEnMapaOptimizado(eventosActuales);
        mostrarEventosEnLista(eventosActuales);
        
    } catch (error) {
        console.error('❌ Error gestionando favorito:', error);
        alert('Error al gestionar favorito. Intenta de nuevo.');
    }
}

async function agregarFavorito(eventoId) {
    const token = localStorage.getItem('nasa_tracker_token');
    
    try {
        const response = await fetch(API_ENDPOINTS.favoritos.toggle(usuarioActual.id), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ evento_id: eventoId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Favorito agregado:', result);
        
    } catch (error) {
        console.warn('⚠️ Error en API, usando simulación:', error);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

async function eliminarFavorito(eventoId) {
    const token = localStorage.getItem('nasa_tracker_token');
    
    try {
        const response = await fetch(`${API_ENDPOINTS.favoritos.toggle(usuarioActual.id)}/${eventoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('✅ Favorito eliminado');
        
    } catch (error) {
        console.warn('⚠️ Error en API, usando simulación:', error);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

function actualizarIconosFavoritos() {
    console.log('🔄 Iconos de favoritos actualizados');
}

// ===== FUNCIONES HEREDADAS (SIN CAMBIOS IMPORTANTES) =====
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
                ` : ''}
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
    
    mostrarEventosEnMapaOptimizado(eventosFiltrados);
    mostrarEventosEnLista(eventosFiltrados);
    actualizarContadorEventosOptimizado(eventosFiltrados.length, eventosData.length);
}

function limpiarFiltros() {
    document.getElementById('fechaInicio').value = '';
    document.getElementById('fechaFin').value = '';
    document.getElementById('selectTipoEvento').value = '';
    
    mostrarEventosEnMapaOptimizado(eventosData);
    mostrarEventosEnLista(eventosData);
    actualizarContadorEventosOptimizado(eventosData.length);
}

function filtrarPorTipoEvento() {
    const tipoSeleccionado = document.getElementById('selectTipoEvento').value;
    
    if (!tipoSeleccionado) {
        mostrarEventosEnMapaOptimizado(eventosData);
        mostrarEventosEnLista(eventosData);
        actualizarContadorEventosOptimizado(eventosData.length);
        return;
    }
    
    const eventosFiltrados = eventosData.filter(evento => {
        return evento.categories && evento.categories.some(cat => cat.id === tipoSeleccionado);
    });
    
    mostrarEventosEnMapaOptimizado(eventosFiltrados);
    mostrarEventosEnLista(eventosFiltrados);
    actualizarContadorEventosOptimizado(eventosFiltrados.length, eventosData.length);
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
                ` : ''}
            </div>
        `;
        
        li.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-favorito-lista')) return;
            
            if (evento.geometry && evento.geometry.length > 0) {
                const lat = parseFloat(evento.geometry[0].coordinates[1]);
                const lng = parseFloat(evento.geometry[0].coordinates[0]);
                map.setView([lat, lng], 8);
                
                if (marcadores[index] && index < 100) { // Verificar que el marcador existe
                    marcadores[index].openPopup();
                }
            }
        });
        
        lista.appendChild(li);
    });
}

function limpiarMarcadores() {
    marcadores.forEach(marcador => map.removeLayer(marcador));
    marcadores = [];
}

function centrarMapa() {
    if (ubicacionUsuario) {
        map.setView([ubicacionUsuario.lat, ubicacionUsuario.lng], 6);
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

// ===== FUNCIONES GLOBALES PARA HTML =====
window.limpiarFiltros = limpiarFiltros;
window.cargarEventosActivosIniciales = cargarEventosActivosIniciales;
window.cargarTodosLosEventosActivos = cargarTodosLosEventosActivos;
window.cargarEventosCerrados = cargarEventosCerrados;
window.toggleFavorito = toggleFavorito;
window.logout = logout;
window.simularLogin = simularLogin; // Solo para desarrollo

// ===== UTILIDADES PARA DESARROLLO =====
console.log(`
🚀 NASA EONET Tracker - Versión ULTRA-OPTIMIZADA

⚡ NUEVAS OPTIMIZACIONES:
📍 Carga inicial: Solo eventos ACTIVOS + filtro de ubicación
🎯 Límite inteligente: Máximo 50 eventos iniciales
💾 Cache avanzado: Evita recálculos de distancias
🗺️ Mapa optimizado: Máximo 100 marcadores simultáneos
⏱️ Debouncing: Filtros sin lag
🔄 Botones adicionales: "Más Eventos Activos" y "Ver Eventos Cerrados"

Para probar favoritos:
1. simularLogin() - Simula un científico logueado
2. logout() - Cierra sesión

Para cargar más contenido:
1. cargarTodosLosEventosActivos() - Todos los eventos activos
2. cargarEventosCerrados() - Añadir eventos cerrados

Optimizaciones implementadas:
✅ Solo eventos activos inicialmente (status=open)
✅ Límite de 50 eventos en carga inicial
✅ Cache de distancias para evitar recálculos
✅ Máximo 100 marcadores en mapa
✅ Debouncing en filtros (300ms)
✅ Geolocalización más rápida
✅ URLs optimizadas de API NASA
`);

// Auto-simular login en desarrollo (remover en producción)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
        if (!usuarioActual) {
            console.log('🔧 Auto-simulando login para desarrollo...');
            simularLogin();
        }
    }, 1000); // Reducido a 1 segundo
}