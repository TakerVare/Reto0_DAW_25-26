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
let soloEventosActivos = true;
let limiteEventosIniciales = 50;
let debounceTimer = null;

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

// URLs de la API NASA EONET
const API_ENDPOINTS = {
    nasa: {
        eventos: 'https://eonet.gsfc.nasa.gov/api/v3/events',
        eventosActivos: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open',
        eventosCerrados: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=closed',
        categorias: 'https://eonet.gsfc.nasa.gov/api/v3/categories'
    }
};

console.log('✅ Configuración global cargada');