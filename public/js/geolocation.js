// ===== GESTIÓN DE GEOLOCALIZACIÓN =====

/**
 * Obtiene la ubicación del usuario y carga eventos cercanos
 */
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

/**
 * Ajusta el zoom del mapa según el radio de proximidad
 */
function ajustarZoomPorRadio() {
    if (!map || !ubicacionUsuario) {
        console.log('⚠️ No se puede ajustar zoom: mapa o ubicación no disponibles');
        return;
    }
    
    let zoomLevel;
    
    if (radioProximidad >= 999999) {
        zoomLevel = 2;
    } else if (radioProximidad >= 20000) {
        zoomLevel = 4;
    } else if (radioProximidad >= 15000) {
        zoomLevel = 5;
    } else if (radioProximidad >= 10000) {
        zoomLevel = 6;
    } else if (radioProximidad >= 5000) {
        zoomLevel = 7;
    } else {
        zoomLevel = 8;
    }
    
    map.setView([ubicacionUsuario.lat, ubicacionUsuario.lng], zoomLevel);
    console.log(`🗺️ Zoom ajustado a nivel ${zoomLevel} para radio ${radioProximidad}km`);
}

/**
 * Agrega un marcador en el mapa para la ubicación del usuario
 */
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

/**
 * Filtra eventos por proximidad al usuario
 * @param {Array} eventos - Array de eventos
 * @param {Object} ubicacionUsuario - Ubicación del usuario
 * @param {number} radioKm - Radio en kilómetros
 * @returns {Array} Eventos filtrados
 */
function filtrarEventosPorProximidadOptimizado(eventos, ubicacionUsuario, radioKm) {
    if (!ubicacionUsuario) {
        // Si no hay ubicación, devolver todos los eventos
        return eventos;
    }
    
    const eventosValidos = [];
    
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
    }
    
    console.log(`📍 ${eventosValidos.length} eventos encontrados dentro de ${radioKm}km`);
    return eventosValidos;
}

console.log('✅ Módulo de geolocalización cargado');