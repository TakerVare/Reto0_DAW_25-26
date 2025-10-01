// ===== GESTIÓN DE EVENTOS =====

/**
 * Actualiza la vista sincronizada de eventos (lista y mapa)
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
    
    // Actualizar mapa con los mismos eventos
    mostrarEventosEnMapaOptimizado(eventos);
    
    // Actualizar contador
    actualizarContador(eventos.length, eventos, mostrarTotal);
    
    console.log(`✅ Vista sincronizada: ${eventos.length} eventos en lista y mapa`);
}

/**
 * Carga eventos cercanos activos basados en la ubicación del usuario
 */
async function cargarEventosCercanosActivos() {
    try {
        mostrarEstadoCarga('Buscando eventos activos cercanos...');
        
        const eventosActivos = await obtenerEventosDeAPI(true, limiteEventosIniciales);
        
        if (!eventosActivos || eventosActivos.length === 0) {
            mostrarError('No se encontraron eventos activos o la API no responde.');
            return;
        }
        
        console.log(`⚡ API optimizada: ${eventosActivos.length} eventos activos obtenidos`);
        
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
        
        // Actualizar vista con sincronización completa
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
        mostrarEstadoCarga('Cargando eventos activos globales...');
        
        const eventosActivos = await obtenerEventosDeAPI(true, limiteEventosIniciales);
        
        if (eventosActivos && eventosActivos.length > 0) {
            eventosData = eventosActivos;
            todoEventosData = eventosActivos;
            
            // Actualizar vista con sincronización completa
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
        
        // Actualizar vista con sincronización completa
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
        
        // Actualizar vista con sincronización completa
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
    
    // Actualizar vista con sincronización completa
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
        
        // Click en el evento para centrar en el mapa
        li.addEventListener('click', (e) => {
            // No activar si se hace click en el botón de favoritos
            if (e.target.classList.contains('btn-favorito-lista')) return;
            
            if (evento.geometry && evento.geometry.length > 0) {
                const lat = parseFloat(evento.geometry[0].coordinates[1]);
                const lng = parseFloat(evento.geometry[0].coordinates[0]);
                
                // Centrar mapa en el evento
                map.setView([lat, lng], 8);
                
                // Abrir popup del marcador correspondiente
                const indiceEnMapa = Math.min(index, marcadores.length - 1);
                if (marcadores[indiceEnMapa]) {
                    marcadores[indiceEnMapa].openPopup();
                }
                
                console.log(`🗺️ Mapa centrado en: ${evento.title}`);
            }
        });
        
        lista.appendChild(li);
    });
    
    console.log(`✅ Lista actualizada con ${eventos.length} eventos`);
}

console.log('✅ Módulo de eventos cargado');