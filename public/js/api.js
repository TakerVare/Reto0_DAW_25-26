// ===== GESTIÓN DE API NASA EONET =====

/**
 * Obtiene eventos de la API NASA EONET con caché
 * @param {boolean} soloActivos - Si se deben obtener solo eventos activos
 * @param {number} limite - Límite de eventos a obtener
 * @returns {Promise<Array>} Array de eventos
 */
async function obtenerEventosDeAPI(soloActivos = true, limite = null) {
    try {
        let url = soloActivos ? API_ENDPOINTS.nasa.eventosActivos : API_ENDPOINTS.nasa.eventos;
        
        if (limite) {
            url += (soloActivos ? '&' : '?') + `limit=${limite}`;
        }
        
        const cacheKey = `${url}-${Date.now() - (Date.now() % 300000)}`;
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
        
        cacheEventos.set(cacheKey, data.events);
        
        console.log(`✅ ${data.events.length} eventos obtenidos de la API NASA ${soloActivos ? '(solo activos)' : ''}`);
        return data.events;
        
    } catch (error) {
        console.error('❌ Error en API NASA:', error);
        throw new Error('No se pudieron obtener los datos de la NASA: ' + error.message);
    }
}

console.log('✅ Módulo de API cargado');