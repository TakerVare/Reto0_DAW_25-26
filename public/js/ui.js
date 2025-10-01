// ===== INTERFAZ DE USUARIO =====

/**
 * Configura todos los eventos de la interfaz
 */
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

/**
 * Agrega botones adicionales a la interfaz
 */
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

/**
 * Aplica filtro de fechas con debounce
 */
function aplicarFiltroFechasOptimizado() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
        aplicarFiltroFechas();
    }, 300);
}

/**
 * Filtra por tipo de evento con debounce
 */
function filtrarPorTipoEventoOptimizado() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
        filtrarPorTipoEvento();
    }, 200);
}

/**
 * Aplica el filtro de fechas a los eventos
 */
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
    
    actualizarVistaEventos(eventosFiltrados, eventosData.length);
}

/**
 * Limpia todos los filtros aplicados
 */
function limpiarFiltros() {
    document.getElementById('fechaInicio').value = '';
    document.getElementById('fechaFin').value = '';
    document.getElementById('selectTipoEvento').value = '';
    
    actualizarVistaEventos(eventosData);
}

/**
 * Filtra eventos por tipo/categoría
 */
function filtrarPorTipoEvento() {
    const tipoSeleccionado = document.getElementById('selectTipoEvento').value;
    
    if (!tipoSeleccionado) {
        actualizarVistaEventos(eventosData);
        return;
    }
    
    const eventosFiltrados = eventosData.filter(evento => {
        return evento.categories && evento.categories.some(cat => cat.id === tipoSeleccionado);
    });
    
    actualizarVistaEventos(eventosFiltrados, eventosData.length);
}

/**
 * Actualiza el contador de eventos
 * @param {number} mostrados - Cantidad de eventos mostrados
 * @param {Array} eventosActuales - Eventos actuales
 * @param {number} total - Total de eventos disponibles
 */
function actualizarContador(mostrados, eventosActuales = null, total = null) {
    const contador = document.getElementById('contadorEventos');
    if (!contador) return;
    
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

/**
 * Actualiza las opciones del select de categorías
 * @param {HTMLSelectElement} selectElement - Elemento select
 */
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

console.log('✅ Módulo de interfaz de usuario cargado');