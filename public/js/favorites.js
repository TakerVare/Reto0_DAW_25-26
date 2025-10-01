// ===== GESTIÓN DE FAVORITOS =====

/**
 * Inicializa el usuario desde el sistema de autenticación
 */
function inicializarUsuarioDesdeAuth() {
    if (typeof obtenerSesion === 'function') {
        const sesion = obtenerSesion();
        
        if (sesion) {
            usuarioActual = sesion;
            
            if (typeof obtenerFavoritosUsuario === 'function') {
                favoritosUsuario = obtenerFavoritosUsuario(sesion.id);
                console.log('✅ Usuario autenticado:', usuarioActual.nombre);
                console.log('⭐ Favoritos cargados:', favoritosUsuario);
            }
        } else {
            usuarioActual = null;
            favoritosUsuario = [];
            console.log('ℹ️ No hay usuario autenticado');
        }
    }
}

/**
 * Alterna el estado de favorito de un evento
 * @param {string} eventoId - ID del evento
 * @param {string} titulo - Título del evento
 */
async function toggleFavorito(eventoId, titulo) {
    if (!usuarioActual) {
        mostrarAlerta('Debes iniciar sesión para marcar favoritos', 'info');
        
        if (typeof abrirModalAuth === 'function') {
            setTimeout(() => abrirModalAuth(), 500);
        }
        return;
    }
    
    const yaEsFavorito = favoritosUsuario.includes(eventoId);
    
    try {
        if (yaEsFavorito) {
            if (typeof eliminarFavorito === 'function') {
                eliminarFavorito(usuarioActual.id, eventoId);
                favoritosUsuario = favoritosUsuario.filter(id => id !== eventoId);
                console.log(`❌ ${titulo} eliminado de favoritos`);
                mostrarNotificacion(`Evento eliminado de favoritos`, 'info');
            }
        } else {
            if (typeof agregarFavorito === 'function') {
                agregarFavorito(usuarioActual.id, eventoId);
                favoritosUsuario.push(eventoId);
                console.log(`⭐ ${titulo} agregado a favoritos`);
                mostrarNotificacion(`¡Evento agregado a favoritos! ⭐`, 'success');
            }
        }
        
        actualizarVistaEventos(obtenerEventosFiltrados());
        
    } catch (error) {
        console.error('❌ Error gestionando favorito:', error);
        mostrarAlerta('Error al gestionar favorito. Intenta de nuevo.', 'error');
    }
}

console.log('✅ Módulo de favoritos cargado');