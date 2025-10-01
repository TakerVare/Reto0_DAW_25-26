// ===== GESTIÓN DE EVENTOS CON SOPORTE 3D =====

/**
 * Actualiza la vista sincronizada de eventos (lista, mapa 2D y globo 3D)
 * @param {Array} eventos - Eventos a mostrar
 * @param {number} mostrarTotal - Total de eventos para el contador
 */
function actualizarVistaEventos(eventos, mostrarTotal = null) {
    if (!eventos || !Array.isArray(eventos)) {
        console.error('❌ Error: eventos no es un array válido');
        return;
    }
    
    console.log(`🔄 Actualizando vista con ${eventos.length} eventos`);
    
    // Actualizar lista de eventos
    mostrarEventosEnLista(eventos);
    
    // Actualizar mapa 2D con los mismos eventos
    mostrarEventosEnMapaOptimizado(eventos);
    
    // Actualizar globo 3D si está activo
    if (isGlobeActive && typeof mostrarEventosEnGlobo3D === 'function') {
        mostrarEventosEnGlobo3D(eventos);
        
        // Actualizar contador del globo
        const contadorGlobo = document.getElementById('contadorGlobo3D');
        if (contadorGlobo) {
            contadorGlobo.textContent = Math.min(eventos.length, 100);
            const contenedorContador = document.querySelector('.contador-eventos-3d');
            if (contenedorContador) {
                contenedorContador.style.display = eventos.length > 0 ? 'block' : 'none';
            }
        }
    }
    
    // Actualizar contador
    actualizarContador(eventos.length, eventos, mostrarTotal);
    
    console.log(`✅ Vista sincronizada: ${eventos.length} eventos en lista, mapa 2D y globo 3D`);
}

/**
 * Carga eventos cercanos activos basados en la ubicación del usuario
 */
async function cargarEventosCercanosActivos() {
    try {
        mostrarEstadoCarga('Buscando todos los eventos activos cercanos...');
        
        // Cargar TODOS los eventos activos sin límite
        const eventosActivos = await obtenerEventosDeAPI(true, null);
        
        if (!eventosActivos || eventosActivos.length === 0) {
            mostrarError('No se encontraron eventos activos o la API no responde.');
            return;
        }
        
        console.log(`⚡ ${eventosActivos.length} eventos activos obtenidos de la API`);
        
        // Guardar todos los eventos disponibles
        todoEventosData = eventosActivos;
        
        // Filtrar por proximidad si hay ubicación
        const eventosCercanos = filtrarEventosPorProximidadOptimizado(
            eventosActivos, 
            ubicacionUsuario, 
            radioProximidad
        );
        
        console.log(`📍 Encontrados ${eventosCercanos.length} eventos activos dentro de ${radioProximidad}km`);
        
        if (eventosCercanos.length === 0) {
            // Si no hay eventos cercanos, mostrar los más recientes
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
        
        // Actualizar vista con sincronización completa (incluye globo 3D)
        actualizarVistaEventos(eventosData, eventosActivos.length);
        
    } catch (error) {
        console.error('❌ Error cargando eventos cercanos activos:', error);
        cargarEventosActivosIniciales();
    }
}

/**
 * Carga eventos activos globales iniciales
 */
async function cargarEventosActivosIniciales() {
    try {
        mostrarEstadoCarga('Cargando todos los eventos activos globales...');
        
        // Cargar TODOS los eventos activos sin límite
        const eventosActivos = await obtenerEventosDeAPI(true, null);
        
        if (eventosActivos && eventosActivos.length > 0) {
            eventosData = eventosActivos;
            todoEventosData = eventosActivos;
            
            // Actualizar vista con sincronización completa (incluye globo 3D)
            actualizarVistaEventos(eventosActivos);
            
            console.log(`⚡ Carga inicial completa: ${eventosActivos.length} eventos activos`);
        } else {
            mostrarError('No se encontraron eventos activos o la API no responde.');
        }
        
    } catch (error) {
        console.error('❌ Error cargando eventos activos iniciales:', error);
        mostrarError('Error al cargar los eventos activos. Verifica tu conexión a internet.');
    }
}

/**
 * Carga todos los eventos activos disponibles
 */
async function cargarTodosLosEventosActivos() {
    try {
        mostrarEstadoCarga('Cargando todos los eventos activos...');
        
        const todosEventosActivos = await obtenerEventosDeAPI(true);
        todoEventosData = todosEventosActivos;
        eventosData = todosEventosActivos;
        
        // Limpiar filtros de tipo al cargar todos los eventos
        const selectTipo = document.getElementById('selectTipoEvento');
        if (selectTipo) selectTipo.value = '';
        
        // Limpiar filtros de fecha
        document.getElementById('fechaInicio').value = '';
        document.getElementById('fechaFin').value = '';
        
        // Actualizar vista con sincronización completa (incluye globo 3D)
        actualizarVistaEventos(eventosData);
        
        console.log(`✅ Cargados todos los eventos activos: ${eventosData.length}`);
        
        // Mostrar notificación
        mostrarNotificacion(`✅ ${eventosData.length} eventos activos cargados`, 'success');
    } catch (error) {
        console.error('❌ Error cargando todos los eventos activos:', error);
        mostrarError('Error al cargar todos los eventos activos.');
    }
}

/**
 * Carga eventos cerrados y los añade a los existentes
 */
async function cargarEventosCerrados() {
    try {
        mostrarEstadoCarga('Cargando eventos cerrados...');
        
        const eventosCerrados = await obtenerEventosDeAPI(false);
        const soloEventosCerrados = eventosCerrados.filter(evento => evento.closed);
        
        // Combinar eventos activos actuales con cerrados
        const eventosCompletos = [...eventosData, ...soloEventosCerrados];
        todoEventosData = eventosCompletos;
        eventosData = eventosCompletos;
        
        // Limpiar filtros al añadir eventos cerrados
        const selectTipo = document.getElementById('selectTipoEvento');
        if (selectTipo) selectTipo.value = '';
        
        // Limpiar filtros de fecha
        document.getElementById('fechaInicio').value = '';
        document.getElementById('fechaFin').value = '';
        
        // Actualizar vista con sincronización completa (incluye globo 3D)
        actualizarVistaEventos(eventosData);
        
        console.log(`✅ Añadidos ${soloEventosCerrados.length} eventos cerrados`);
        
        // Mostrar notificación
        mostrarNotificacion(`✅ ${soloEventosCerrados.length} eventos cerrados añadidos`, 'success');
    } catch (error) {
        console.error('❌ Error cargando eventos cerrados:', error);
        mostrarError('Error al cargar eventos cerrados.');
    }
}

/**
 * Actualiza eventos según el radio de proximidad seleccionado
 * Esta función se ejecuta automáticamente al cambiar el radio
 */
async function actualizarEventosPorRadio() {
    const nuevoRadio = parseInt(document.getElementById('radioProximidad').value);
    
    if (nuevoRadio === radioProximidad) {
        console.log('ℹ️ El radio no ha cambiado');
        return;
    }
    
    radioProximidad = nuevoRadio;
    console.log(`📍 Radio actualizado a ${radioProximidad}km`);
    
    // Ajustar zoom del mapa
    ajustarZoomPorRadio();
    
    if (!ubicacionUsuario) {
        console.log('ℹ️ Sin ubicación del usuario, mostrando todos los eventos');
        actualizarVistaEventos(eventosData);
        return;
    }
    
    if (radioProximidad >= 999999) {
        console.log('🌍 Radio global seleccionado, mostrando todos los eventos');
        eventosData = todoEventosData;
        
        // Limpiar filtros al mostrar todos
        const selectTipo = document.getElementById('selectTipoEvento');
        if (selectTipo) selectTipo.value = '';
        
        // Limpiar filtros de fecha
        document.getElementById('fechaInicio').value = '';
        document.getElementById('fechaFin').value = '';
        
        actualizarVistaEventos(eventosData);
        return;
    }
    
    mostrarEstadoCarga(`Filtrando eventos dentro de ${radioProximidad}km...`);
    
    // Filtrar eventos por proximidad
    const eventosCercanos = filtrarEventosPorProximidadOptimizado(
        todoEventosData, 
        ubicacionUsuario, 
        radioProximidad
    );
    
    console.log(`📍 Encontrados ${eventosCercanos.length} eventos dentro de ${radioProximidad}km`);
    
    if (eventosCercanos.length === 0) {
        // Si no hay eventos cercanos, mostrar los más recientes
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
    
    // Actualizar vista con sincronización completa (incluye globo 3D)
    actualizarVistaEventos(eventosData, todoEventosData.length);
}

/**
 * Muestra un mensaje cuando no hay eventos cercanos
 */
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

/**
 * Muestra eventos en una lista HTML
 * @param {Array} eventos - Eventos a mostrar
 */
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
        
        // Click en el evento para centrar en el mapa o globo
        li.addEventListener('click', (e) => {
            // No activar si se hace click en el botón de favoritos
            if (e.target.classList.contains('btn-favorito-lista')) return;
            
            if (evento.geometry && evento.geometry.length > 0) {
                const lat = parseFloat(evento.geometry[0].coordinates[1]);
                const lng = parseFloat(evento.geometry[0].coordinates[0]);
                
                // Verificar si está en modo 3D
                if (isGlobeActive && typeof centrarGloboEn === 'function') {
                    centrarGloboEn(lat, lng);
                    
                    // Mostrar información del evento
                    if (typeof mostrarInfoEvento3D === 'function') {
                        mostrarInfoEvento3D(evento);
                    }
                } else {
                    // Centrar mapa 2D en el evento
                    map.setView([lat, lng], 8);
                    
                    // Abrir popup del marcador correspondiente
                    const indiceEnMapa = Math.min(index, marcadores.length - 1);
                    if (marcadores[indiceEnMapa]) {
                        marcadores[indiceEnMapa].openPopup();
                    }
                }
                
                console.log(`🗺️ Vista centrada en: ${evento.title}`);
            }
        });
        
        lista.appendChild(li);
    });
    
    console.log(`✅ Lista actualizada con ${eventos.length} eventos`);
}

console.log('✅ Módulo de eventos cargado (con soporte 3D)');