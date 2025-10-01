// ===== INICIALIZACIÓN PRINCIPAL =====

/**
 * Inicializa la aplicación NASA EONET Tracker
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando NASA EONET Tracker (Optimizado con autenticación y filtros unificados)...');
    
    inicializarFechas();
    inicializarMapa();
    configurarEventosInterfaz();
    inicializarUsuarioDesdeAuth();
    obtenerUbicacionUsuario();
    
    console.log('✅ Aplicación inicializada correctamente');
});

// Mensaje de información de la aplicación
console.log(`
🚀 NASA EONET Tracker - Versión con FILTROS UNIFICADOS

✅ Sistema de usuarios implementado con localStorage
🔐 Autenticación completa (login/registro)
⭐ Favoritos personalizados por usuario
🎯 4 usuarios de prueba disponibles
🔄 Sincronización AUTOMÁTICA lista-mapa implementada
📍 Filtro de Radio de Proximidad dinámico
🔍 NUEVO: Sistema de filtros unificado mejorado

Características del sistema de filtros:
• Un único botón "🔍 Aplicar Filtros" para todos los filtros
• Aplica simultáneamente: fechas + tipo de evento
• El filtro de radio se mantiene automático (ajusta zoom y proximidad)
• Validaciones mejoradas de fechas
• Mensajes informativos al usuario sobre filtros aplicados
• Botón "🧹 Limpiar Filtros" para resetear todo

Flujo de uso:
1. Selecciona las fechas (desde/hasta)
2. Selecciona el tipo de evento (opcional)
3. Haz clic en "🔍 Aplicar Filtros"
4. El sistema filtra y sincroniza lista + mapa automáticamente

Filtro de Radio (automático):
• Se aplica inmediatamente al cambiar
• Ajusta el zoom del mapa según el radio
• Radio global (999999km): Zoom 2
• 20,000km: Zoom 4
• 15,000km: Zoom 5
• 10,000km: Zoom 6
• 5,000km: Zoom 7

Para usar el sistema:
1. Haz clic en "🔐 Iniciar Sesión" en la esquina superior
2. Usa uno de los usuarios de prueba o crea uno nuevo
3. Configura los filtros según tus preferencias
4. Haz clic en "🔍 Aplicar Filtros"
5. ¡Observa cómo se actualiza todo automáticamente!

Los datos se guardan en localStorage de tu navegador.

📁 ARQUITECTURA MODULAR:
├── config.js - Configuración global y constantes
├── api.js - Gestión de API NASA EONET
├── utils.js - Funciones utilitarias
├── geolocation.js - Geolocalización y proximidad
├── favorites.js - Sistema de favoritos
├── map.js - Gestión del mapa Leaflet
├── events.js - Carga y filtrado de eventos
├── ui.js - Interfaz de usuario (con filtros unificados)
└── main.js - Inicialización principal
`);