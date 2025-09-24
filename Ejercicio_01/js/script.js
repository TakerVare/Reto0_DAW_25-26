// ===== CONFIGURACIÓN GLOBAL =====
let map;
let eventosData = [];
let todoEventosData = []; // Almacena TODOS los eventos de la API
let marcadores = [];
let usuarioActual = null; // Se carga desde JWT en localStorage
let favoritosUsuario = []; // Array de IDs de eventos favoritos
let ubicacionUsuario = null; // {lat, lng} del usuario
let radioProximidad = 1000; // Radio en km para filtrar eventos cercanos

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
    // API NASA EONET (directo desde frontend)
    nasa: {
        eventos: 'https://eonet.gsfc.nasa.gov/api/v3/events',
        categorias: 'https://eonet.gsfc.nasa.gov/api/v3/categories'
    }
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando NASA EONET Tracker...');
    
    inicializarMapa();
    configurarEventosInterfaz();
    inicializarUsuario(); // Verificar JWT en localStorage
    obtenerUbicacionUsuario(); // Obtener ubicación para filtrar eventos cercanos
    
    console.log('✅ Aplicación inicializada correctamente');
});

// ===== GESTIÓN DE UBICACIÓN Y PROXIMIDAD =====
async function obtenerUbicacionUsuario() {
    try {
        mostrarEstadoCarga('Obteniendo tu ubicación para eventos cercanos...');
        
        // Verificar si la geolocalización está disponible
        if (!navigator.geolocation) {
            console.warn('⚠️ Geolocalización no disponible, cargando todos los eventos');
            cargarEventosIniciales();
            return;
        }
        
        // Opciones para la geolocalización
        const opciones = {
            enableHighAccuracy: true,
            timeout: 10000, // 10 segundos
            maximumAge: 300000 // 5 minutos de cache
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
                    
                    // Añadir marcador de ubicación del usuario
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
                                    position: relative;
                                "></div>
                                <div style="
                                    position: absolute;
                                    top: 25px;
                                    left: -30px;
                                    background: rgba(0,123,255,0.9);
                                    color: white;
                                    padding: 2px 8px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    white-space: nowrap;
                                ">Tu ubicación</div>
                            `,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(map);
                }
                
                // Cargar eventos cercanos
                await cargarEventosCercanos();
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
                
                console.warn('⚠️', mensaje, '- Cargando todos los eventos');
                cargarEventosIniciales();
            },
            opciones
        );
        
    } catch (error) {
        console.error('❌ Error en geolocalización:', error);
        cargarEventosIniciales();
    }
}

async function cargarEventosCercanos() {
    try {
        mostrarEstadoCarga('Buscando eventos cercanos a tu ubicación...');
        
        // Obtener todos los eventos de la API
        const todosLosEventos = await obtenerEventosDeAPI();
        
        if (!todosLosEventos || todosLosEventos.length === 0) {
            mostrarError('No se encontraron eventos o la API no responde.');
            return;
        }
        
        // Guardar todos los eventos para uso posterior
        todoEventosData = todosLosEventos;
        
        // Filtrar eventos cercanos (dentro del radio especificado)
        const eventosCercanos = filtrarEventosPorProximidad(todosLosEventos, ubicacionUsuario, radioProximidad);
        
        console.log(`📍 Encontrados ${eventosCercanos.length} eventos dentro de ${radioProximidad}km`);
        
        if (eventosCercanos.length === 0) {
            // Si no hay eventos cercanos, mostrar los 20 más recientes
            const eventosRecientes = todosLosEventos
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
        
        mostrarEventosEnMapa(eventosData);
        mostrarEventosEnLista(eventosData);
        actualizarContadorEventos(eventosData.length, todosLosEventos.length);
        
    } catch (error) {
        console.error('❌ Error cargando eventos cercanos:', error);
        cargarEventosIniciales(); // Fallback a la carga normal
    }
}

function filtrarEventosPorProximidad(eventos, ubicacionUsuario, radioKm) {
    if (!ubicacionUsuario) {
        return eventos;
    }
    
    return eventos.filter(evento => {
        // Verificar que el evento tenga geometría válida
        if (!evento.geometry || evento.geometry.length === 0) {
            return false;
        }
        
        // Usar la primera geometría del evento
        const geometria = evento.geometry[0];
        if (!geometria.coordinates || geometria.coordinates.length < 2) {
            return false;
        }
        
        const lat = parseFloat(geometria.coordinates[1]);
        const lng = parseFloat(geometria.coordinates[0]);
        
        // Verificar coordenadas válidas
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return false;
        }
        
        // Calcular distancia
        const distancia = calcularDistanciaKm(
            ubicacionUsuario.lat, ubicacionUsuario.lng,
            lat, lng
        );
        
        return distancia <= radioKm;
    });
}

function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
    // Fórmula de Haversine para calcular distancia entre dos puntos en la Tierra
    const R = 6371; // Radio de la Tierra en km
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distancia = R * c; // Distancia en km
    
    return distancia;
}

function mostrarMensajeSinEventosCercanos() {
    const contador = document.getElementById('contadorEventos');
    if (contador) {
        contador.innerHTML = `
            <span>📍 No hay eventos dentro de ${radioProximidad}km de tu ubicación</span>
            <br>
            <small style="color: #666;">Mostrando los 20 eventos más recientes en su lugar</small>
        `;
    }
}

function cargarTodosLosEventos() {
    if (todoEventosData && todoEventosData.length > 0) {
        eventosData = todoEventosData;
        mostrarEventosEnMapa(eventosData);
        mostrarEventosEnLista(eventosData);
        actualizarContadorEventos(eventosData.length);
        console.log('✅ Mostrando todos los eventos globales');
    } else {
        cargarEventosIniciales();
    }
}

// ===== GESTIÓN DE USUARIO SIMPLIFICADA (JWT SIN BD) =====
async function inicializarUsuario() {
    // Verificar si hay JWT guardado en localStorage
    const token = localStorage.getItem('nasa_tracker_token');
    
    if (token && !esTokenExpirado(token)) {
        // Decodificar JWT para obtener datos del usuario
        usuarioActual = decodificarJWT(token);
        console.log('✅ Usuario autenticado:', usuarioActual.email);
        
        // Cargar favoritos del usuario
        await cargarFavoritosUsuario();
        
        // Actualizar interfaz
        actualizarInterfazUsuario();
    } else {
        // No hay usuario autenticado
        usuarioActual = null;
        favoritosUsuario = [];
        
        // Limpiar token expirado si existe
        if (token) {
            localStorage.removeItem('nasa_tracker_token');
        }
        
        console.log('ℹ️ Usuario no autenticado');
        mostrarFormularioLogin();
    }
}

function decodificarJWT(token) {
    try {
        // Decodificar payload del JWT (parte central)
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
        return true; // Si no se puede decodificar, consideramos expirado
    }
}

async function cargarFavoritosUsuario() {
    if (!usuarioActual) return;
    
    try {
        const token = localStorage.getItem('nasa_tracker_token');
        
        // TODO: Reemplazar con llamada real al backend Java
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
        
        // Mock para desarrollo - Simular algunos favoritos
        favoritosUsuario = ['EONET_15547', 'EONET_15545'];
    }
}

function actualizarInterfazUsuario() {
    if (usuarioActual) {
        // Agregar info del usuario al header
        const nav = document.querySelector('nav ul');
        
        // Eliminar info previa si existe
        const userInfoExistente = nav.querySelector('.user-info-container');
        if (userInfoExistente) {
            userInfoExistente.remove();
        }
        
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
    // Opcional: Mostrar formulario de login en la interfaz
    // Por ahora solo mostramos en consola
    console.log('💡 Para probar favoritos, simular login con: simularLogin()');
}

// Función de utilidad para pruebas
function simularLogin() {
    // Simular usuario logueado para desarrollo
    usuarioActual = {
        id: 2,
        nombre: "Dr. María García",
        email: "maria.garcia@cientifico.es",
        rol: "cientifico"
    };
    
    // Simular token JWT (solo para desarrollo)
    const mockToken = btoa(JSON.stringify({
        header: {},
        payload: {
            sub: usuarioActual.id,
            email: usuarioActual.email,
            nombre: usuarioActual.nombre,
            rol: usuarioActual.rol,
            exp: Math.floor(Date.now() / 1000) + 3600 // 1 hora
        },
        signature: 'mock'
    }));
    
    localStorage.setItem('nasa_tracker_token', `header.${btoa(JSON.stringify(usuarioActual))}.signature`);
    
    cargarFavoritosUsuario();
    actualizarInterfazUsuario();
    
    console.log('✅ Login simulado exitoso');
}

function logout() {
    // Limpiar datos de usuario
    usuarioActual = null;
    favoritosUsuario = [];
    
    // Limpiar token JWT
    localStorage.removeItem('nasa_tracker_token');
    
    // Actualizar interfaz
    const userContainer = document.querySelector('.user-info-container');
    if (userContainer) {
        userContainer.remove();
    }
    
    // Actualizar iconos de favoritos
    actualizarIconosFavoritos();
    
    console.log('👋 Sesión cerrada');
}

// ===== GESTIÓN DE FAVORITOS SIMPLIFICADA =====
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
        
        // Actualizar interfaz inmediatamente
        actualizarIconosFavoritos();
        actualizarContadorEventos(eventosData.length);
        
        // Re-renderizar eventos para mostrar cambios
        const eventosActuales = document.getElementById('selectTipoEvento').value 
            ? eventosData.filter(evento => 
                evento.categories && evento.categories.some(cat => cat.id === document.getElementById('selectTipoEvento').value)
            )
            : eventosData;
        
        mostrarEventosEnMapa(eventosActuales);
        mostrarEventosEnLista(eventosActuales);
        
    } catch (error) {
        console.error('❌ Error gestionando favorito:', error);
        alert('Error al gestionar favorito. Intenta de nuevo.');
    }
}

async function agregarFavorito(eventoId) {
    const token = localStorage.getItem('nasa_tracker_token');
    
    try {
        // TODO: Implementar llamada real al backend Java
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
        // Simulación para desarrollo
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

async function eliminarFavorito(eventoId) {
    const token = localStorage.getItem('nasa_tracker_token');
    
    try {
        // TODO: Implementar llamada real al backend Java
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
        // Simulación para desarrollo
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

function actualizarIconosFavoritos() {
    // Los marcadores se actualizarán cuando se re-rendericen
    // Los popups se actualizarán cuando se abran
    console.log('🔄 Iconos de favoritos actualizados');
}

// ===== INICIALIZACIÓN DEL MAPA =====
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

// ===== CONFIGURACIÓN DE EVENTOS DE INTERFAZ =====
function configurarEventosInterfaz() {
    const btnAplicar = document.getElementById('btnAplicarFiltro');
    if (btnAplicar) btnAplicar.addEventListener('click', aplicarFiltroFechas);
    
    const btnLimpiar = document.getElementById('btnLimpiarFiltro');
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltros);
    
    const btnCentrar = document.getElementById('btnCentrarMapa');
    if (btnCentrar) {
        btnCentrar.addEventListener('click', centrarMapa);
        // Actualizar texto del botón
        btnCentrar.innerHTML = ubicacionUsuario ? '📍 Mi Ubicación' : '🌍 Centrar Mapa';
    }
    
    const selectTipo = document.getElementById('selectTipoEvento');
    if (selectTipo) {
        selectTipo.addEventListener('change', filtrarPorTipoEvento);
        // Actualizar opciones con categorías reales
        actualizarOpcionesCategorias(selectTipo);
    }
    
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    
    if (fechaInicio) fechaInicio.addEventListener('change', validarFechas);
    if (fechaFin) fechaFin.addEventListener('change', validarFechas);
    
    // Agregar botón para ver todos los eventos
    agregarBotonTodosEventos();
    
    console.log('✅ Eventos de interfaz configurados');
}

function agregarBotonTodosEventos() {
    const controlesMapa = document.querySelector('.controles-mapa');
    if (controlesMapa && !document.getElementById('btnTodosEventos')) {
        const btnTodos = document.createElement('button');
        btnTodos.id = 'btnTodosEventos';
        btnTodos.innerHTML = '🌍 Ver Todos los Eventos';
        btnTodos.addEventListener('click', cargarTodosLosEventos);
        controlesMapa.appendChild(btnTodos);
    }
}

function actualizarOpcionesCategorias(selectElement) {
    // Limpiar opciones existentes (excepto "Todos")
    const primeraOpcion = selectElement.firstElementChild;
    selectElement.innerHTML = '';
    selectElement.appendChild(primeraOpcion);
    
    // Agregar opciones basadas en categorías reales de NASA
    Object.entries(configuracionEventos).forEach(([id, config]) => {
        if (id !== 'default') {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${config.emoji} ${config.nombre}`;
            selectElement.appendChild(option);
        }
    });
}

// ===== CARGA DE EVENTOS DESDE API NASA =====
async function cargarEventosIniciales() {
    try {
        mostrarEstadoCarga('Cargando eventos de la NASA...');
        
        const eventos = await obtenerEventosDeAPI();
        
        if (eventos && eventos.length > 0) {
            eventosData = eventos;
            todoEventosData = eventos; // También guardamos todos para uso posterior
            mostrarEventosEnMapa(eventos);
            mostrarEventosEnLista(eventos);
            actualizarContadorEventos(eventos.length);
        } else {
            mostrarError('No se encontraron eventos o la API no responde.');
        }
        
    } catch (error) {
        console.error('❌ Error cargando eventos:', error);
        mostrarError('Error al cargar los eventos. Verifica tu conexión a internet.');
    }
}

async function obtenerEventosDeAPI() {
    try {
        // TODO: Puede usar proxy Java o directo a NASA
        const response = await fetch(API_ENDPOINTS.nasa.eventos);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.events) {
            throw new Error('Respuesta de API inválida');
        }
        
        console.log(`✅ Cargados ${data.events.length} eventos de la API NASA`);
        return data.events;
        
    } catch (error) {
        console.error('❌ Error en API NASA:', error);
        throw new Error('No se pudieron obtener los datos de la NASA: ' + error.message);
    }
}

// ===== CREACIÓN DE ICONOS CON FAVORITOS =====
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

// ===== MOSTRAR EVENTOS EN MAPA =====
function mostrarEventosEnMapa(eventos) {
    limpiarMarcadores();
    
    eventos.forEach((evento, index) => {
        if (!evento.geometry || evento.geometry.length === 0) return;
        
        const geometria = evento.geometry[0];
        if (!geometria.coordinates || geometria.coordinates.length < 2) return;
        
        const lat = parseFloat(geometria.coordinates[1]);
        const lng = parseFloat(geometria.coordinates[0]);
        
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn(`Coordenadas inválidas para evento ${evento.id}:`, lat, lng);
            return;
        }
        
        // Determinar tipo basado en categorías reales
        const tipoEvento = evento.categories && evento.categories.length > 0 
            ? evento.categories[0].id 
            : 'default';
        
        const esFavorito = favoritosUsuario.includes(evento.id);
        const icono = crearIconoEvento(tipoEvento, !evento.closed, esFavorito);
        
        const popupContent = crearContenidoPopup(evento);
        
        const marcador = L.marker([lat, lng], { icon: icono })
            .addTo(map)
            .bindPopup(popupContent, {
                maxWidth: 350,
                className: 'popup-evento'
            });
        
        marcadores.push(marcador);
        
        marcador.on('mouseover', function() {
            this.openPopup();
        });
    });
    
    console.log(`✅ Mostrados ${marcadores.length} eventos en el mapa`);
}

// ===== CREAR POPUP CON FAVORITOS =====
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
    const textoFavorito = esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos';
    
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

// ===== FILTROS =====
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
    
    mostrarEventosEnMapa(eventosFiltrados);
    mostrarEventosEnLista(eventosFiltrados);
    actualizarContadorEventos(eventosFiltrados.length, eventosData.length);
}

function limpiarFiltros() {
    document.getElementById('fechaInicio').value = '';
    document.getElementById('fechaFin').value = '';
    document.getElementById('selectTipoEvento').value = '';
    
    mostrarEventosEnMapa(eventosData);
    mostrarEventosEnLista(eventosData);
    actualizarContadorEventos(eventosData.length);
}

function filtrarPorTipoEvento() {
    const tipoSeleccionado = document.getElementById('selectTipoEvento').value;
    
    if (!tipoSeleccionado) {
        mostrarEventosEnMapa(eventosData);
        mostrarEventosEnLista(eventosData);
        actualizarContadorEventos(eventosData.length);
        return;
    }
    
    const eventosFiltrados = eventosData.filter(evento => {
        return evento.categories && evento.categories.some(cat => cat.id === tipoSeleccionado);
    });
    
    mostrarEventosEnMapa(eventosFiltrados);
    mostrarEventosEnLista(eventosFiltrados);
    actualizarContadorEventos(eventosFiltrados.length, eventosData.length);
}

// ===== MOSTRAR EVENTOS EN LISTA CON FAVORITOS =====
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
            // No navegar si se hizo clic en el botón de favorito
            if (e.target.classList.contains('btn-favorito-lista')) return;
            
            if (evento.geometry && evento.geometry.length > 0) {
                const lat = parseFloat(evento.geometry[0].coordinates[1]);
                const lng = parseFloat(evento.geometry[0].coordinates[0]);
                map.setView([lat, lng], 8);
                
                if (marcadores[index]) {
                    marcadores[index].openPopup();
                }
            }
        });
        
        lista.appendChild(li);
    });
}

// ===== UTILIDADES =====
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

function actualizarContadorEventos(mostrados, total = null) {
    const contador = document.getElementById('contadorEventos');
    if (contador) {
        const favoritosCount = eventosData.filter(e => favoritosUsuario.includes(e.id)).length;
        
        let texto;
        if (total && total > mostrados) {
            // Mostrando filtro de todos los eventos disponibles
            texto = `📊 ${mostrados} de ${total} eventos`;
        } else if (ubicacionUsuario && todoEventosData.length > 0 && mostrados < todoEventosData.length) {
            // Mostrando solo eventos cercanos
            texto = `📍 ${mostrados} eventos cercanos de ${todoEventosData.length} totales`;
        } else {
            // Mostrando todos los disponibles
            texto = `📊 ${mostrados} eventos`;
        }
        
        if (favoritosCount > 0) {
            texto += ` | ⭐ ${favoritosCount} favoritos`;
        }
        
        contador.innerHTML = `<span>${texto}</span>`;
    }
}

function mostrarError(mensaje) {
    const lista = document.getElementById('listaEventos');
    const contador = document.getElementById('contadorEventos');
    
    if (lista) {
        lista.innerHTML = `
            <li class="error-mensaje">
                <p>❌ ${mensaje}</p>
                <button onclick="cargarEventosIniciales()" class="btn-reintentar">
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
window.cargarEventosIniciales = cargarEventosIniciales;
window.cargarTodosLosEventos = cargarTodosLosEventos;
window.toggleFavorito = toggleFavorito;
window.logout = logout;
window.simularLogin = simularLogin; // Solo para desarrollo

// ===== UTILIDADES PARA DESARROLLO =====
// Función para probar la aplicación fácilmente
console.log(`
🚀 NASA EONET Tracker - Versión Ultra-Simplificada con Filtrado por Proximidad

Nuevas características:
📍 Carga inicial: Solo eventos dentro de 1000km de tu ubicación
🌍 Botón "Ver Todos los Eventos" para cargar eventos globales
📱 Solicita permiso de ubicación al cargar la página

Para probar favoritos en desarrollo:
1. simularLogin() - Simula un científico logueado
2. logout() - Cierra sesión

Para probar todas las funciones:
1. cargarTodosLosEventos() - Carga todos los eventos mundiales
2. Permitir ubicación cuando el navegador lo solicite

Estructura de BD:
- usuarios (2 tablas solamente)
- usuario_favoritos (solo IDs de eventos NASA)

JWT: Autenticación stateless sin persistir sesiones
API: Eventos siempre frescos desde NASA EONET
Geolocalización: Filtrado automático por proximidad (1000km)
`);

// Auto-simular login en desarrollo (remover en producción)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Solo para desarrollo local
    setTimeout(() => {
        if (!usuarioActual) {
            console.log('🔧 Auto-simulando login para desarrollo...');
            simularLogin();
        }
    }, 2000);
}