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
    
    // Agregar botones de eventos en la sección de filtros
    agregarBotonesEventos();
    
    console.log('✅ Eventos de interfaz configurados (optimizado)');
}

/**
 * Agrega botones de control de eventos a la sección de filtros
 */
function agregarBotonesEventos() {
    const contenedorBotones = document.getElementById('botonesEventos');
    if (!contenedorBotones) {
        console.warn('⚠️ No se encontró el contenedor de botones de eventos');
        return;
    }
    
    // Limpiar contenido existente
    contenedorBotones.innerHTML = '';
    
    // Botón: Más Eventos Activos
    const btnTodosActivos = document.createElement('button');
    btnTodosActivos.id = 'btnTodosEventosActivos';
    btnTodosActivos.innerHTML = '⚡ Más Eventos Activos';
    btnTodosActivos.classList.add('btn-optimizado');
    btnTodosActivos.title = 'Cargar todos los eventos activos disponibles';
    btnTodosActivos.addEventListener('click', cargarTodosLosEventosActivos);
    contenedorBotones.appendChild(btnTodosActivos);
    
    // Botón: Ver Eventos Cerrados
    const btnCerrados = document.createElement('button');
    btnCerrados.id = 'btnEventosCerrados';
    btnCerrados.innerHTML = '🔍 Ver Eventos Cerrados';
    btnCerrados.classList.add('btn-secundario-opt');
    btnCerrados.title = 'Agregar eventos cerrados a la vista actual';
    btnCerrados.addEventListener('click', cargarEventosCerrados);
    contenedorBotones.appendChild(btnCerrados);
    
    console.log('✅ Botones de eventos agregados a la sección de filtros');
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
    
    mostrarEstadoCarga('Filtrando eventos por fechas...');
    
    // Obtener eventos base (puede ser eventosData o todoEventosData dependiendo del contexto)
    const eventosBase = obtenerEventosBaseFiltrado();
    
    const eventosFiltrados = eventosBase.filter(evento => {
        return evento.geometry && evento.geometry.some(geo => {
            const fechaEvento = new Date(geo.date);
            return fechaEvento >= fechaInicioDate && fechaEvento <= fechaFinDate;
        });
    });
    
    console.log(`📅 Filtrado por fechas: ${eventosFiltrados.length} eventos`);
    
    // Actualizar tanto la lista como el mapa
    actualizarVistaEventos(eventosFiltrados, eventosBase.length);
}

/**
 * Limpia todos los filtros aplicados
 */
function limpiarFiltros() {
    // Limpiar campos de fecha
    document.getElementById('fechaInicio').value = '';
    document.getElementById('fechaFin').value = '';
    
    // Limpiar selector de tipo
    const selectTipo = document.getElementById('selectTipoEvento');
    if (selectTipo) {
        selectTipo.value = '';
    }
    
    console.log('🧹 Filtros limpiados');
    
    // Restaurar vista a los eventos actuales (sin filtros de fecha/tipo)
    actualizarVistaEventos(eventosData);
}

/**
 * Filtra eventos por tipo/categoría
 */
function filtrarPorTipoEvento() {
    const tipoSeleccionado = document.getElementById('selectTipoEvento').value;
    
    if (!tipoSeleccionado) {
        // Si no hay tipo seleccionado, mostrar todos los eventos actuales
        actualizarVistaEventos(eventosData);
        console.log('🌐 Mostrando todos los tipos de eventos');
        return;
    }
    
    mostrarEstadoCarga('Filtrando por tipo de evento...');
    
    // Obtener eventos base para filtrar
    const eventosBase = obtenerEventosBaseFiltrado();
    
    const eventosFiltrados = eventosBase.filter(evento => {
        return evento.categories && evento.categories.some(cat => cat.id === tipoSeleccionado);
    });
    
    const nombreTipo = configuracionEventos[tipoSeleccionado]?.nombre || tipoSeleccionado;
    console.log(`🔍 Filtrado por tipo "${nombreTipo}": ${eventosFiltrados.length} eventos`);
    
    // Actualizar tanto la lista como el mapa
    actualizarVistaEventos(eventosFiltrados, eventosBase.length);
}

/**
 * Obtiene los eventos base para aplicar filtros
 * @returns {Array} Eventos base
 */
function obtenerEventosBaseFiltrado() {
    // Si tenemos filtro de fechas activo, usar eventosData
    // Si no, usar todoEventosData o eventosData según disponibilidad
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    
    if (fechaInicio || fechaFin) {
        // Si hay filtro de fechas, usar eventosData actual
        return eventosData;
    }
    
    // Si no hay filtro de fechas, usar todos los eventos disponibles
    return todoEventosData.length > 0 ? todoEventosData : eventosData;
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
    
    // Verificar si hay filtros activos
    const tipoSeleccionado = document.getElementById('selectTipoEvento')?.value;
    const fechaInicio = document.getElementById('fechaInicio')?.value;
    const fechaFin = document.getElementById('fechaFin')?.value;
    const hayFiltros = tipoSeleccionado || fechaInicio || fechaFin;
    
    let texto;
    if (hayFiltros && total && total > mostrados) {
        texto = `🔍 ${mostrados} de ${total} eventos (filtrados)`;
    } else if (total && total > mostrados) {
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
    
    // Ordenar las categorías alfabéticamente por nombre
    const categoriasOrdenadas = Object.entries(configuracionEventos)
        .filter(([id]) => id !== 'default')
        .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre));
    
    categoriasOrdenadas.forEach(([id, config]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${config.emoji} ${config.nombre}`;
        selectElement.appendChild(option);
    });
    
    console.log(`✅ ${categoriasOrdenadas.length} categorías cargadas en el selector`);
}

console.log('✅ Módulo de interfaz de usuario cargado');