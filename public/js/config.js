// ===== CONFIGURACIÓN GLOBAL =====

// Variables globales del estado de la aplicación
let map;
let eventosData = [];
let todoEventosData = [];
let marcadores = [];
let usuarioActual = null;
let favoritosUsuario = [];
let ubicacionUsuario = null;
let radioProximidad = 10000;

// Variables para optimización
let cacheEventos = new Map();
let cacheClima = new Map(); // Caché para datos meteorológicos
let soloEventosActivos = true;
let limiteEventosIniciales = 50;
let debounceTimer = null;

// Variables para gestión de capas del mapa
let capaBaseActual = null;
let capasBase = {};

// Configuración de iconos basada en categorías reales de NASA EONET
const configuracionEventos = {
    'drought': { emoji: '☀️', color: '#FFD700', nombre: 'Sequía' },
    'dustHaze': { emoji: '🌫️', color: '#D2B48C', nombre: 'Polvo y Neblina' },
    'earthquakes': { emoji: '🌍', color: '#8B4513', nombre: 'Terremotos' },
    'floods': { emoji: '🌊', color: '#4169E1', nombre: 'Inundaciones' },
    'landslides': { emoji: '🏔️', color: '#A0522D', nombre: 'Deslizamientos' },
    'manmade': { emoji: '🏭', color: '#696969', nombre: 'Origen Humano' },
    'seaLakeIce': { emoji: '🧊', color: '#87CEEB', nombre: 'Hielo Marino' },
    'severeStorms': { emoji: '🌪️', color: '#FF4444', nombre: 'Tormentas Severas' },
    'snow': { emoji: '❄️', color: '#F0F8FF', nombre: 'Nieve' },
    'tempExtremes': { emoji: '🌡️', color: '#FF6347', nombre: 'Temperaturas Extremas' },
    'volcanoes': { emoji: '🌋', color: '#DC143C', nombre: 'Volcanes' },
    'waterColor': { emoji: '💧', color: '#20B2AA', nombre: 'Color del Agua' },
    'wildfires': { emoji: '🔥', color: '#FF4500', nombre: 'Incendios Forestales' },
    'default': { emoji: '⚠️', color: '#666666', nombre: 'Evento Natural' }
};

/*
        eventos: 'https://eonet.gsfc.nasa.gov/api/v3/events',
        eventosActivos: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open',
        eventosCerrados: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=closed',
        categorias: 'https://eonet.gsfc.nasa.gov/api/v3/categories'
*/

// URLs de la API NASA EONET
const API_ENDPOINTS = {
    backend: {
        eventos: 'http://localhost:5229/api/Event', // Ajusta el puerto según tu configuración
        categorias: 'http://localhost:5229/api/Category',
        sources: 'http://localhost:5229/api/Source',
        geometries: 'http://localhost:5229/api/Geometry'
    },
    // Mantén las URLs originales de NASA por si las necesitas
    nasa: {
        eventos: 'https://eonet.gsfc.nasa.gov/api/v3/events',
        eventosActivos: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open',
        eventosCerrados: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=closed',
        categorias: 'https://eonet.gsfc.nasa.gov/api/v3/categories'
    },
    // API Meteorológica - OpenWeatherMap (requiere API key gratuita)
    clima: {
        base: 'https://api.openweathermap.org/data/2.5/weather',
        // IMPORTANTE: Obtén tu API key gratuita en https://openweathermap.org/api
        apiKey: '2f66cbd5fc2fef01979d223f6c148e04', // ⚠️ Reemplazar con tu API key
        // Para pruebas sin API key, usaremos modo demo
        usarDemo: false // Cambiar a false cuando tengas API key real
    }
};

const USE_BACKEND_API = true;

// Configuración de capas base del mapa (Ejercicio 8)
const CAPAS_MAPA = {
    openstreetmap: {
        nombre: '🗺️ OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    },
    opentopomap: {
        nombre: '⛰️ OpenTopoMap',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap contributors',
        maxZoom: 17
    },
    esrisatellite: {
        nombre: '🛰️ ESRI Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© ESRI',
        maxZoom: 18
    },
    cartodbdark: {
        nombre: '🌙 CartoDB Dark',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© CartoDB',
        maxZoom: 19
    },
    stadiaosmbright: {
        nombre: '🌞 Stadia Bright',
        url: 'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png',
        attribution: '© Stadia Maps © OpenMapTiles',
        maxZoom: 20
    }
};

console.log('✅ Configuración global cargada (con API Clima y Capas)');