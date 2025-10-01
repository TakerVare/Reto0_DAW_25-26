// ===== INTERFAZ DE USUARIO CON CONTROLES DE CAPAS =====

/**
 * Configura todos los eventos de la interfaz
 */
function configurarEventosInterfaz() {
    // Botón para aplicar todos los filtros (fechas + tipo)
    const btnAplicar = document.getElementById('btnAplicarFiltros');
    if (btnAplicar) {
        btnAplicar.addEventListener('click', aplicarTodosFiltrosUnificado);
        console.log('✅ Botón "Aplicar Filtros" configurado');
    }
    
    const btnLimpiar = document.getElementById('btnLimpiarFiltro');
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltros);
    
    const btnCentrar = document.getElementById('btnCentrarMapa');
    if (btnCentrar) {
        btnCentrar.addEventListener('click', centrarMapa);
    }
    
    // Cargar opciones de categorías en el select
    const selectTipo = document.getElementById('selectTipoEvento');
    if (selectTipo) {
        actualizarOpcionesCategorias(selectTipo);
        console.log('✅ Selector de tipo de evento configurado (sin auto-aplicar)');
    }
    
    // El filtro de radio se mantiene automático por su funcionalidad especial
    const selectRadio = document.getElementById('radioProximidad');
    if (selectRadio) {
        selectRadio.addEventListener('change', actualizarEventosPorRadio);
        console.log('✅ Listener de radio de proximidad configurado (auto-aplicar)');
    }
    
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    
    if (fechaInicio) fechaInicio.addEventListener('change', validarFechas);
    if (fechaFin) fechaFin.addEventListener('change', validarFechas);
    
    // Agregar botones de eventos en la sección de filtros
    agregarBotonesEventos();
    
    // Ejercicio 8: Configurar controles de capas del mapa
    configurarControlesCapas();
    
    console.log('✅ Eventos de interfaz configurados (con filtros unificados y capas)');
}

/**
 * Configura los controles para cambiar las capas del mapa
 * Ejercicio 8: Sistema de capas alternativas
 */
function configurarControlesCapas() {
    const contenedorCapas = document.getElementById('controlesCapas');
    if (!contenedorCapas) {
        console.warn('⚠️ No se encontró el contenedor de controles de capas');
        return;
    }
    
    // Limpiar contenido existente
    contenedorCapas.innerHTML = '<label class="label-capas">🗺️ Tipo de Mapa:</label>';
    
    // Crear botón para cada capa disponible
    Object.keys(CAPAS_MAPA).forEach((capaId, index) => {
        const capaConfig = CAPAS_MAPA[capaId];
        
        const btnCapa = document.createElement('button');
        btnCapa.className = 'btn-capa';
        btnCapa.dataset.capa = capaId;
        btnCapa.textContent = capaConfig.nombre;
        btnCapa.title = `Cambiar a ${capaConfig.nombre}`;
        
        // Marcar la primera capa como activa
        if (index === 0) {
            btnCapa.classList.add('active');
        }
        
        // Añadir evento de click
        btnCapa.addEventListener('click', () => cambiarCapaMapa(capaId));
        
        contenedorCapas.appendChild(btnCapa);
    });
    
    console.log(`✅ ${Object.keys(CAPAS_MAPA).length} controles de capas configurados`);
}

/**
 * Aplica todos los filtros seleccionados (fechas + tipo)
 * Esta es la función principal que se ejecuta al hacer clic en "Aplicar Filtros"
 */
function aplicarTodosFiltrosUnificado() {
    mostrarEstadoCarga('Aplicando filtros...');
    
    // Obtener los eventos base para filtrar
    let eventosFiltrados = obtenerEventosBaseFiltrado();
    
    // 1. Aplicar filtro de tipo de evento
    const tipoSeleccionado = document.getElementById('selectTipoEvento')?.value;
    if (tipoSeleccionado) {
        eventosFiltrados = eventosFiltrados.filter(evento => {
            return evento.categories && evento.categories.some(cat => cat.id === tipoSeleccionado);
        });
        const nombreTipo = configuracionEventos[tipoSeleccionado]?.nombre || tipoSeleccionado;
        console.log(`🔍 Filtrado por tipo "${nombreTipo}": ${eventosFiltrados.length} eventos`);
    }
    
    // 2. Aplicar filtro de fechas
    const fechaInicio = document.getElementById('fechaInicio')?.value;
    const fechaFin = document.getElementById('fechaFin')?.value;
    
    if (fechaInicio && fechaFin) {
        const fechaInicioDate = new Date(fechaInicio);
        const fechaFinDate = new Date(fechaFin);
        
        // Validar fechas
        if (fechaInicioDate > fechaFinDate) {
            alert('La fecha de inicio no puede ser posterior a la fecha final.');
            mostrarEstadoCarga('Error en filtros');
            return;
        }
        
        eventosFiltrados = eventosFiltrados.filter(evento => {
            return evento.geometry && evento.geometry.some(geo => {
                const fechaEvento = new Date(geo.date);
                return fechaEvento >= fechaInicioDate && fechaEvento <= fechaFinDate;
            });
        });
        
        console.log(`📅 Filtrado por fechas: ${eventosFiltrados.length} eventos`);
    } else if (fechaInicio || fechaFin) {
        // Si solo hay una fecha, mostrar advertencia
        alert('Por favor, selecciona ambas fechas (inicio y fin) para filtrar correctamente.');
        mostrarEstadoCarga('Filtros incompletos');
        return;
    }
    
    // Obtener eventos base para el contador
    const eventosBase = obtenerEventosBaseFiltrado();
    
    // Actualizar vista con los eventos filtrados
    actualizarVistaEventos(eventosFiltrados, eventosBase.length);
    
    // Construir mensaje informativo
    let mensajeFiltros = [];
    if (tipoSeleccionado) {
        const nombreTipo = configuracionEventos[tipoSeleccionado]?.nombre || tipoSeleccionado;
        mensajeFiltros.push(`tipo: ${nombreTipo}`);
    }
    if (fechaInicio && fechaFin) {
        mensajeFiltros.push(`fechas: ${fechaInicio} a ${fechaFin}`);
    }
    
    const mensajeCompleto = mensajeFiltros.length > 0 
        ? `Filtros aplicados (${mensajeFiltros.join(', ')})`
        : 'Mostrando todos los eventos disponibles';
    
    console.log(`✅ ${mensajeCompleto}: ${eventosFiltrados.length} eventos mostrados`);
    
    // Mostrar notificación
    if (eventosFiltrados.length === 0) {
        mostrarNotificacion('No se encontraron eventos con los filtros aplicados', 'info');
    } else {
        mostrarNotificacion(`✅ ${eventosFiltrados.length} eventos encontrados`, 'success');
    }
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
    
    // Mostrar notificación
    mostrarNotificacion('Filtros limpiados', 'info');
}

/**
 * Obtiene los eventos base para aplicar filtros
 * @returns {Array} Eventos base
 */
function obtenerEventosBaseFiltrado() {
    // Usar todoEventosData si está disponible, sino usar eventosData
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
    const hayFiltros = tipoSeleccionado || (fechaInicio && fechaFin);
    
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

console.log('✅ Módulo de interfaz de usuario cargado (con controles de capas)');