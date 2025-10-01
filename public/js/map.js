// ===== GESTIÓN DEL MAPA CON CAPAS Y CLIMA =====

/**
 * Inicializa el mapa con Leaflet y capas base
 * Ejercicio 8: Sistema de capas alternativas
 */
function inicializarMapa() {
    try {
        map = L.map('map').setView([20, 0], 2);
        
        // Crear todas las capas base disponibles
        Object.keys(CAPAS_MAPA).forEach(capaId => {
            const capaConfig = CAPAS_MAPA[capaId];
            capasBase[capaId] = L.tileLayer(capaConfig.url, {
                attribution: capaConfig.attribution,
                maxZoom: capaConfig.maxZoom,
                minZoom: 2
            });
        });
        
        // Añadir capa por defecto (OpenStreetMap)
        capasBase['openstreetmap'].addTo(map);
        capaBaseActual = 'openstreetmap';
        
        console.log(`✅ Mapa inicializado con ${Object.keys(capasBase).length} capas disponibles`);
        
        // Eliminar mensaje de carga
        const mensajeCarga = document.querySelector('.mapa-cargando');
        if (mensajeCarga) {
            mensajeCarga.style.transition = 'opacity 0.3s ease-out';
            mensajeCarga.style.opacity = '0';
            
            setTimeout(() => {
                mensajeCarga.remove();
            }, 300);
        }
        
    } catch (error) {
        console.error('❌ Error inicializando el mapa:', error);
        mostrarError('Error al inicializar el mapa. Verifica tu conexión a internet.');
        
        const mensajeCarga = document.querySelector('.mapa-cargando');
        if (mensajeCarga) {
            mensajeCarga.innerHTML = '<p>❌ Error al cargar el mapa</p>';
            mensajeCarga.style.background = 'rgba(248, 215, 218, 0.95)';
            mensajeCarga.style.color = '#721c24';
        }
    }
}

/**
 * Cambia la capa base del mapa
 * Ejercicio 8: Alternancia entre capas
 * @param {string} capaId - Identificador de la capa
 */
function cambiarCapaMapa(capaId) {
    if (!capasBase[capaId]) {
        console.error(`❌ Capa no encontrada: ${capaId}`);
        return;
    }
    
    // Remover capa actual
    if (capaBaseActual && capasBase[capaBaseActual]) {
        map.removeLayer(capasBase[capaBaseActual]);
    }
    
    // Añadir nueva capa
    capasBase[capaId].addTo(map);
    capaBaseActual = capaId;
    
    // Actualizar selector visual
    const botones = document.querySelectorAll('.btn-capa');
    botones.forEach(btn => {
        if (btn.dataset.capa === capaId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    console.log(`🗺️ Capa cambiada a: ${CAPAS_MAPA[capaId].nombre}`);
    mostrarNotificacion(`Mapa: ${CAPAS_MAPA[capaId].nombre}`, 'info');
}

/**
 * Muestra eventos en el mapa de forma optimizada
 * @param {Array} eventos - Array de eventos a mostrar
 */
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
            .addTo(map);
        
        // Crear popup con clima (se carga al abrir)
        marcador.bindPopup(() => {
            return crearContenidoPopupConClima(evento, lat, lng);
        }, {
            maxWidth: 400,
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

/**
 * Crea un icono personalizado para un evento
 * @param {string} tipoEvento - Tipo de evento
 * @param {boolean} esAbierto - Si el evento está abierto
 * @param {boolean} esFavorito - Si es favorito del usuario
 * @returns {L.DivIcon} Icono de Leaflet
 */
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

/**
 * Crea el contenido HTML para el popup con datos del clima
 * Ejercicio 7: Integración con API meteorológica
 * @param {Object} evento - Objeto del evento
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {HTMLElement} Elemento del popup
 */
function crearContenidoPopupConClima(evento, lat, lng) {
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
    
    // Crear contenedor del popup
    const contenedor = document.createElement('div');
    contenedor.className = 'popup-contenido';
    contenedor.innerHTML = `
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
        
        <!-- SECCIÓN DE CLIMA (Ejercicio 7) -->
        <div class="clima-info" id="clima-${evento.id}">
            <div style="text-align: center; padding: 1rem; color: #666;">
                <span class="spinner-clima">⏳ Cargando clima...</span>
            </div>
        </div>
        
        ${evento.sources && evento.sources.length > 0 ? `
            <div class="fuentes">
                <p><strong>🔗 Fuentes NASA:</strong></p>
                ${evento.sources.map(source => 
                    `<a href="${source.url}" target="_blank" rel="noopener">${source.id || 'Ver más información'}</a>`
                ).join('<br>')}
            </div>
        ` : ''}
    `;
    
    // Cargar datos del clima de forma asíncrona
    cargarClimaEnPopup(evento.id, lat, lng);
    
    return contenedor;
}

/**
 * Carga los datos del clima en el popup de forma asíncrona
 * @param {string} eventoId - ID del evento
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 */
async function cargarClimaEnPopup(eventoId, lat, lng) {
    try {
        const climaContainer = document.getElementById(`clima-${eventoId}`);
        if (!climaContainer) return;
        
        // Obtener datos del clima
        const clima = await obtenerClimaActual(lat, lng);
        
        if (clima.error) {
            climaContainer.innerHTML = `
                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 0.75rem; margin: 0.5rem 0;">
                    <p style="margin: 0; color: #856404; font-size: 0.9rem;">
                        ⚠️ ${clima.mensaje}
                    </p>
                </div>
            `;
            return;
        }
        
        // Mostrar datos del clima
        climaContainer.innerHTML = `
            <div class="clima-card">
                <div class="clima-header">
                    <h4 style="margin: 0.5rem 0; color: #00274d;">
                        🌦️ Clima Actual ${clima.esDemo ? '(Demo)' : ''}
                    </h4>
                    ${clima.nombreLugar && clima.nombreLugar !== 'Demo Location' ? 
                        `<p style="margin: 0; font-size: 0.85rem; color: #666;">${clima.nombreLugar}, ${clima.pais}</p>` 
                        : ''
                    }
                </div>
                
                <div class="clima-principal">
                    <div class="clima-temp">
                        <span class="temp-grande">${clima.iconoEmoji} ${clima.temperatura}°C</span>
                        <span class="temp-descripcion">${clima.descripcion}</span>
                    </div>
                    <div class="clima-sensacion">
                        Sensación térmica: ${clima.sensacionTermica}°C
                    </div>
                </div>
                
                <div class="clima-detalles">
                    <div class="clima-detalle">
                        <span class="detalle-icono">🌡️</span>
                        <span class="detalle-texto">
                            Min/Max: ${clima.temperaturaMin}°C / ${clima.temperaturaMax}°C
                        </span>
                    </div>
                    
                    <div class="clima-detalle">
                        <span class="detalle-icono">💧</span>
                        <span class="detalle-texto">
                            Humedad: ${clima.humedad}%
                        </span>
                    </div>
                    
                    <div class="clima-detalle">
                        <span class="detalle-icono">🌪️</span>
                        <span class="detalle-texto">
                            Viento: ${clima.vientoVelocidad} km/h ${obtenerDireccionViento(clima.vientoDireccion)}
                        </span>
                    </div>
                    
                    <div class="clima-detalle">
                        <span class="detalle-icono">☁️</span>
                        <span class="detalle-texto">
                            Nubosidad: ${clima.nubosidad}%
                        </span>
                    </div>
                    
                    ${clima.presion ? `
                        <div class="clima-detalle">
                            <span class="detalle-icono">🔽</span>
                            <span class="detalle-texto">
                                Presión: ${clima.presion} hPa
                            </span>
                        </div>
                    ` : ''}
                    
                    ${clima.visibilidad ? `
                        <div class="clima-detalle">
                            <span class="detalle-icono">👁️</span>
                            <span class="detalle-texto">
                                Visibilidad: ${clima.visibilidad} km
                            </span>
                        </div>
                    ` : ''}
                    
                    ${clima.lluvia ? `
                        <div class="clima-detalle">
                            <span class="detalle-icono">🌧️</span>
                            <span class="detalle-texto">
                                Lluvia: ${clima.lluvia} mm
                            </span>
                        </div>
                    ` : ''}
                    
                    ${clima.nieve ? `
                        <div class="clima-detalle">
                            <span class="detalle-icono">❄️</span>
                            <span class="detalle-texto">
                                Nieve: ${clima.nieve} mm
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                ${clima.esDemo ? `
                    <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 6px; padding: 0.5rem; margin-top: 0.5rem;">
                        <p style="margin: 0; color: #1565c0; font-size: 0.8rem; text-align: center;">
                            💡 Datos de demostración. Configura tu API key en config.js para datos reales.
                        </p>
                    </div>
                ` : ''}
                
                <div style="margin-top: 0.5rem; text-align: center; font-size: 0.75rem; color: #999;">
                    Última actualización: ${clima.timestamp.toLocaleTimeString('es-ES')}
                </div>
            </div>
        `;
        
        console.log(`✅ Clima cargado en popup del evento ${eventoId}`);
        
    } catch (error) {
        console.error('❌ Error cargando clima en popup:', error);
        const climaContainer = document.getElementById(`clima-${eventoId}`);
        if (climaContainer) {
            climaContainer.innerHTML = `
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 0.75rem;">
                    <p style="margin: 0; color: #721c24; font-size: 0.9rem;">
                        ❌ Error cargando datos del clima
                    </p>
                </div>
            `;
        }
    }
}

/**
 * Limpia todos los marcadores del mapa
 */
function limpiarMarcadores() {
    marcadores.forEach(marcador => map.removeLayer(marcador));
    marcadores = [];
}

/**
 * Centra el mapa en la ubicación del usuario o globalmente
 */
function centrarMapa() {
    if (ubicacionUsuario) {
        ajustarZoomPorRadio();
        console.log('✅ Mapa centrado en tu ubicación');
    } else {
        map.setView([20, 0], 2);
        console.log('✅ Mapa centrado globalmente');
    }
}

console.log('✅ Módulo de mapa cargado (con capas y clima)');