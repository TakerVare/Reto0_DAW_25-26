// ===== GESTIÓN DE API NASA EONET Y CLIMA =====

/**
 * Obtiene eventos de la API NASA EONET con caché
 * @param {boolean} soloActivos - Si se deben obtener solo eventos activos
 * @param {number} limite - Límite de eventos a obtener
 * @returns {Promise<Array>} Array de eventos
 */
async function obtenerEventosDeAPI(soloActivos = true, limite = null) {
    try {
        let url;
        let eventos;
        
        if (USE_BACKEND_API) {
            // Usar tu backend
            url = API_ENDPOINTS.backend.eventos;
            console.log(`🔄 Cargando desde Backend: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            
            // El backend devuelve directamente un array de eventos
            eventos = await response.json();
            
            // Filtrar por estado si es necesario
            if (soloActivos) {
                eventos = eventos.filter(evento => !evento.closed || evento.closed === null || evento.closed === "false");
            }
            
            // Aplicar límite si es necesario
            if (limite) {
                eventos = eventos.slice(0, limite);
            }
            
            // Transformar los datos del backend al formato esperado por el frontend
            eventos = transformarEventosBackend(eventos);
            
        } else {
            // Usar API de NASA (código original)
            url = soloActivos ? API_ENDPOINTS.nasa.eventosActivos : API_ENDPOINTS.nasa.eventos;
            
            if (limite) {
                url += (soloActivos ? '&' : '?') + `limit=${limite}`;
            }
            
            console.log(`🔄 Cargando desde API NASA: ${url}`);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data?.events) {
                throw new Error('Respuesta de API inválida');
            }
            
            eventos = data.events;
        }
        
        // Cache
        const cacheKey = `${url}-${Date.now() - (Date.now() % 300000)}`;
        cacheEventos.set(cacheKey, eventos);
        
        console.log(`✅ ${eventos.length} eventos obtenidos`);
        return eventos;
        
    } catch (error) {
        console.error('❌ Error en API:', error);
        throw new Error('No se pudieron obtener los datos: ' + error.message);
    }
}
/**
 * Transforma los eventos del backend al formato esperado por el frontend
 * @param {Array} eventos - Eventos del backend
 * @returns {Array} Eventos transformados
 */
function transformarEventosBackend(eventos) {
    return eventos.map(evento => {
        // Transformar categorías
        const categoriasTransformadas = evento.categories ? evento.categories.map(cat => ({
            id: cat.idCategory || 'default',
            title: cat.titleCategory || 'Sin categoría',
            link: cat.linkCategory || '',
            description: cat.descriptionCategory || ''
        })) : [];
        
        // Transformar geometría
        // IMPORTANTE: El backend no incluye fecha en geometry, pero el frontend la necesita
        // Usaremos una fecha por defecto o la fecha actual si no está disponible
        
        // ----- INICIO DE CAMBIOS -----
        
        // 1. Cambiado de 'const' a 'let' para permitir la reasignación
        let geometriaTransformada = evento.geometry ? evento.geometry.map((geo, index) => {
            // Intentar obtener una fecha del evento o usar la fecha actual
            let fechaGeometria = new Date().toISOString();
            
            // Si el evento tiene una propiedad date, usarla
            if (evento.date) {
                fechaGeometria = evento.date;
            }
            // Si no, intentar calcular una fecha basada en el índice (para eventos históricos)
            else if (index > 0) {
                // Cada geometría podría representar un punto en el tiempo
                const fechaBase = new Date();
                fechaBase.setDate(fechaBase.getDate() - index);
                fechaGeometria = fechaBase.toISOString();
            }
            
            return {
                date: fechaGeometria,
                type: geo.type || 'Point',
                coordinates: geo.coordinates || [0, 0],
                // Mantener cualquier información adicional que pueda existir
                magnitudeValue: geo.magnitudeValue,
                magnitudeUnit: geo.magnitudeUnit
            };
        }) : [];
        
        // Si no hay geometría, crear una por defecto
        if (geometriaTransformada.length === 0) {
            // 2. Reasignar la variable con un nuevo array en lugar de usar .push()
            geometriaTransformada = [{
                date: new Date().toISOString(),
                type: 'Point',
                coordinates: [0, 0]
            }];
        }
        
        // ----- FIN DE CAMBIOS -----
        
        // Transformar sources
        const sourcesTransformadas = evento.sources ? evento.sources.map(source => ({
            id: source.id || 'UNKNOWN',
            url: source.url || ''
        })) : [];
        
        // Normalizar el campo closed a booleano
        let cerrado = false;
        if (typeof evento.closed === 'boolean') {
            cerrado = evento.closed;
        } else if (typeof evento.closed === 'string') {
            cerrado = evento.closed.toLowerCase() === 'true' || evento.closed === '1';
        }
        
        return {
            id: evento.id || `BACKEND_${Date.now()}`,
            title: evento.title || 'Evento sin título',
            description: evento.description || evento.descriptionEvent || null,
            link: evento.link || '',
            closed: cerrado,
            categories: categoriasTransformadas,
            sources: sourcesTransformadas,
            geometry: geometriaTransformada
        };
    });
}

/**
 * Obtiene las categorías disponibles
 */
async function obtenerCategorias() {
    try {
        if (USE_BACKEND_API) {
            const response = await fetch(API_ENDPOINTS.backend.categorias);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const categorias = await response.json();
            
            // Transformar al formato esperado
            return categorias.map(cat => ({
                id: cat.idCategory,
                title: cat.titleCategory,
                link: cat.linkCategory,
                description: cat.descriptionCategory,
                layers: cat.layersCategory
            }));
        } else {
            const response = await fetch(API_ENDPOINTS.nasa.categorias);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            return data.categories || [];
        }
    } catch (error) {
        console.error('❌ Error obteniendo categorías:', error);
        return [];
    }
}

/**
 * Obtiene datos meteorológicos para unas coordenadas específicas
 * Ejercicio 7: Integración con API meteorológica
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {Promise<Object>} Datos del clima
 */
async function obtenerClimaActual(lat, lng) {
    try {
        // Validar coordenadas
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new Error('Coordenadas inválidas');
        }
        
        // Crear clave de caché (redondear a 2 decimales para agrupar ubicaciones cercanas)
        const latRedondeada = Math.round(lat * 100) / 100;
        const lngRedondeada = Math.round(lng * 100) / 100;
        const cacheKey = `clima-${latRedondeada}-${lngRedondeada}`;
        
        // Verificar caché (válido por 30 minutos)
        const cacheTimestamp = Date.now() - (Date.now() % (30 * 60 * 1000));
        const fullCacheKey = `${cacheKey}-${cacheTimestamp}`;
        
        if (cacheClima.has(fullCacheKey)) {
            console.log('⚡ Datos del clima obtenidos del caché');
            return cacheClima.get(fullCacheKey);
        }
        
        // Modo demo para pruebas sin API key
        if (API_ENDPOINTS.clima.usarDemo) {
            console.log('🔧 Usando datos de clima en modo DEMO');
            const climaDemo = generarClimaDemo(lat, lng);
            cacheClima.set(fullCacheKey, climaDemo);
            return climaDemo;
        }
        
        // Realizar petición a OpenWeatherMap
        const url = `${API_ENDPOINTS.clima.base}?lat=${lat}&lon=${lng}&appid=${API_ENDPOINTS.clima.apiKey}&units=metric&lang=es`;
        
        console.log('🌦️ Obteniendo datos del clima...');
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('API key inválida. Configura tu API key en config.js');
            }
            throw new Error(`Error en API del clima: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Procesar datos
        const climaProcesado = {
            temperatura: Math.round(data.main.temp),
            sensacionTermica: Math.round(data.main.feels_like),
            temperaturaMin: Math.round(data.main.temp_min),
            temperaturaMax: Math.round(data.main.temp_max),
            humedad: data.main.humidity,
            presion: data.main.pressure,
            descripcion: data.weather[0].description,
            icono: data.weather[0].icon,
            iconoEmoji: obtenerEmojiClima(data.weather[0].icon),
            vientoVelocidad: Math.round(data.wind.speed * 3.6), // m/s a km/h
            vientoDireccion: data.wind.deg,
            nubosidad: data.clouds.all,
            visibilidad: data.visibility ? Math.round(data.visibility / 1000) : null,
            lluvia: data.rain ? data.rain['1h'] || data.rain['3h'] : null,
            nieve: data.snow ? data.snow['1h'] || data.snow['3h'] : null,
            nombreLugar: data.name,
            pais: data.sys.country,
            amanecer: data.sys.sunrise ? new Date(data.sys.sunrise * 1000) : null,
            atardecer: data.sys.sunset ? new Date(data.sys.sunset * 1000) : null,
            timestamp: new Date(data.dt * 1000)
        };
        
        // Guardar en caché
        cacheClima.set(fullCacheKey, climaProcesado);
        
        console.log(`✅ Clima obtenido: ${climaProcesado.temperatura}°C, ${climaProcesado.descripcion}`);
        return climaProcesado;
        
    } catch (error) {
        console.error('❌ Error obteniendo clima:', error);
        
        // En caso de error, devolver datos básicos
        return {
            error: true,
            mensaje: error.message,
            temperatura: null,
            descripcion: 'No disponible'
        };
    }
}

/**
 * Genera datos de clima de demostración para pruebas
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {Object} Datos del clima demo
 */
function generarClimaDemo(lat, lng) {
    // Generar temperatura basada en latitud (más frío cerca de los polos)
    const tempBase = 25 - Math.abs(lat) * 0.5;
    const variacion = Math.random() * 10 - 5;
    const temperatura = Math.round(tempBase + variacion);
    
    // Condiciones aleatorias pero realistas
    const condiciones = [
        { descripcion: 'cielo despejado', icono: '01d', emoji: '☀️' },
        { descripcion: 'algo nublado', icono: '02d', emoji: '⛅' },
        { descripcion: 'nubes dispersas', icono: '03d', emoji: '☁️' },
        { descripcion: 'muy nublado', icono: '04d', emoji: '☁️' },
        { descripcion: 'lluvia ligera', icono: '10d', emoji: '🌧️' },
        { descripcion: 'tormenta', icono: '11d', emoji: '⛈️' }
    ];
    
    const condicion = condiciones[Math.floor(Math.random() * condiciones.length)];
    
    return {
        temperatura: temperatura,
        sensacionTermica: temperatura + Math.round(Math.random() * 4 - 2),
        temperaturaMin: temperatura - Math.round(Math.random() * 5),
        temperaturaMax: temperatura + Math.round(Math.random() * 5),
        humedad: Math.round(40 + Math.random() * 50),
        presion: Math.round(990 + Math.random() * 40),
        descripcion: condicion.descripcion,
        icono: condicion.icono,
        iconoEmoji: condicion.emoji,
        vientoVelocidad: Math.round(Math.random() * 30),
        vientoDireccion: Math.round(Math.random() * 360),
        nubosidad: Math.round(Math.random() * 100),
        visibilidad: Math.round(5 + Math.random() * 10),
        lluvia: condicion.icono.includes('10') ? Math.round(Math.random() * 5) : null,
        nieve: null,
        nombreLugar: 'Demo Location',
        pais: '--',
        amanecer: new Date(),
        atardecer: new Date(),
        timestamp: new Date(),
        esDemo: true
    };
}

/**
 * Convierte código de icono de OpenWeatherMap a emoji
 * @param {string} iconCode - Código del icono
 * @returns {string} Emoji correspondiente
 */
function obtenerEmojiClima(iconCode) {
    const emojis = {
        '01d': '☀️', '01n': '🌙',  // despejado
        '02d': '⛅', '02n': '☁️',  // parcialmente nublado
        '03d': '☁️', '03n': '☁️',  // nublado
        '04d': '☁️', '04n': '☁️',  // muy nublado
        '09d': '🌧️', '09n': '🌧️',  // lluvia ligera
        '10d': '🌦️', '10n': '🌧️',  // lluvia
        '11d': '⛈️', '11n': '⛈️',  // tormenta
        '13d': '❄️', '13n': '❄️',  // nieve
        '50d': '🌫️', '50n': '🌫️'   // niebla
    };
    
    return emojis[iconCode] || '🌤️';
}

/**
 * Obtiene la dirección del viento en texto
 * @param {number} grados - Grados del viento
 * @returns {string} Dirección textual
 */
function obtenerDireccionViento(grados) {
    const direcciones = [
        'N', 'NNE', 'NE', 'ENE',
        'E', 'ESE', 'SE', 'SSE',
        'S', 'SSO', 'SO', 'OSO',
        'O', 'ONO', 'NO', 'NNO'
    ];
    
    const index = Math.round(grados / 22.5) % 16;
    return direcciones[index];
}

console.log('✅ Módulo de API cargado (con integración meteorológica)');