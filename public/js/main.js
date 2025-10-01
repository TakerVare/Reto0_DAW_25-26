// ===== INICIALIZACIÓN PRINCIPAL =====

/**
 * Inicializa la aplicación NASA EONET Tracker
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando NASA EONET Tracker (Optimizado con autenticación)...');
    
    inicializarFechas();
    inicializarMapa();
    configurarEventosInterfaz();
    inicializarUsuarioDesdeAuth();
    obtenerUbicacionUsuario();
    
    console.log('✅ Aplicación inicializada correctamente');
});

// Mensaje de información de la aplicación
console.log(`
🚀 NASA EONET Tracker - Versión con FILTRO DINÁMICO DE RADIO

✅ Sistema de usuarios implementado con localStorage
🔐 Autenticación completa (login/registro)
⭐ Favoritos personalizados por usuario
🎯 4 usuarios de prueba disponibles
🔄 Sincronización AUTOMÁTICA lista-mapa implementada
📍 NUEVO: Filtro de Radio de Proximidad dinámico

Características del filtro de radio:
• El listado se actualiza automáticamente al cambiar el radio
• El zoom del mapa se ajusta según el radio seleccionado
• Radio global (999999 km) muestra todos los eventos
• Radios menores filtran por proximidad a tu ubicación
• Indicador visual del radio actual en el contador

Mapeo de Radio → Zoom:
- Global (999999km): Zoom 2
- 20,000km: Zoom 4
- 15,000km: Zoom 5
- 10,000km: Zoom 6
- 5,000km: Zoom 7

Para usar el sistema:
1. Haz clic en "🔐 Iniciar Sesión" en la esquina superior
2. Usa uno de los usuarios de prueba o crea uno nuevo
3. Cambia el radio de proximidad en el filtro
4. ¡Observa cómo se actualiza todo automáticamente!

Los datos se guardan en localStorage de tu navegador.

📁 ARQUITECTURA MODULAR:
├── config.js - Configuración global y constantes
├── api.js - Gestión de API NASA EONET
├── utils.js - Funciones utilitarias
├── geolocation.js - Geolocalización y proximidad
├── favorites.js - Sistema de favoritos
├── map.js - Gestión del mapa Leaflet
├── events.js - Carga y filtrado de eventos
├── ui.js - Interfaz de usuario
└── main.js - Inicialización principal
`);