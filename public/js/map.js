// ===== GESTIÓN DEL MAPA =====

/**
 * Inicializa el mapa con Leaflet
 */
function inicializarMapa() {
    try {
        map = L.map('map').setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            minZoom: 2
        }).addTo(map);
        
        // Eliminar mensaje de carga después de que el mapa esté listo
        const mensajeCarga = document.querySelector('.mapa-cargando');
        if (mensajeCarga) {
            // Añadir una pequeña animación de fade out
            mensajeCarga.style.transition = 'opacity 0.3s ease-out';
            mensajeCarga.style.opacity = '0';
            
            setTimeout(() => {
                mensajeCarga.remove();
            }, 300);
        }
        
        console.log('✅ Mapa inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando el mapa:', error);
        mostrarError('Error al inicializar el mapa. Verifica tu conexión a internet.');
        
        // Cambiar el mensaje de carga a error
        const mensajeCarga = document.querySelector('.mapa-cargando');
        if (mensajeCarga) {
            mensajeCarga.innerHTML = '<p>❌ Error al cargar el mapa</p>';
            mensajeCarga.style.background = 'rgba(248, 215, 218, 0.95)';
            mensajeCarga.style.color = '#721c24';
        }
    }
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
 * Crea el contenido HTML para el popup de un evento
 * @param {Object} evento - Objeto del evento
 * @returns {string} HTML del popup
 */
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

console.log('✅ Módulo de mapa cargado');