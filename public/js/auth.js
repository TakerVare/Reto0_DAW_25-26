// ===== SISTEMA DE AUTENTICACIÓN CON USUARIOS HARDCODEADOS =====

// ===== USUARIOS HARDCODEADOS PARA PRUEBAS =====
const USUARIOS_HARDCODED = [
    {
        id: 1,
        nombre: 'Admin NASA',
        email: 'admin@nasa.com',
        password: 'admin123', // En producción: hash
        rol: 'admin',
        fechaRegistro: '2024-01-01',
        favoritos: ['EONET_15547', 'EONET_15545', 'EONET_15546']
    },
    {
        id: 2,
        nombre: 'Dr. María García',
        email: 'maria@cientifico.es',
        password: 'ciencia123',
        rol: 'cientifico',
        fechaRegistro: '2024-02-15',
        favoritos: ['EONET_15547', 'EONET_15545', 'EONET_15546']
    },
    {
        id: 3,
        nombre: 'Juan Ciudadano',
        email: 'juan@ciudadano.es',
        password: 'ciudadano123',
        rol: 'ciudadano',
        fechaRegistro: '2024-03-20',
        favoritos: ['EONET_15547']
    },
    {
        id: 4,
        nombre: 'Ana Investigadora',
        email: 'ana@universidad.es',
        password: 'investiga123',
        rol: 'cientifico',
        fechaRegistro: '2024-04-10',
        favoritos: ['EONET_15545', 'EONET_15546']
    }
];

// ===== GESTIÓN DE USUARIOS EN LOCALSTORAGE =====
const AUTH_STORAGE_KEY = 'nasa_tracker_usuarios';
const SESSION_STORAGE_KEY = 'nasa_tracker_sesion';

// Inicializar usuarios en localStorage si no existen
function inicializarUsuarios() {
    const usuariosGuardados = localStorage.getItem(AUTH_STORAGE_KEY);
    
    if (!usuariosGuardados) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(USUARIOS_HARDCODED));
        console.log('✅ Usuarios hardcodeados inicializados en localStorage');
    }
}

// Obtener todos los usuarios
function obtenerUsuarios() {
    const usuarios = localStorage.getItem(AUTH_STORAGE_KEY);
    return usuarios ? JSON.parse(usuarios) : [];
}

// Guardar usuarios
function guardarUsuarios(usuarios) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(usuarios));
}

// Obtener usuario por email
function obtenerUsuarioPorEmail(email) {
    const usuarios = obtenerUsuarios();
    return usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
}

// Verificar si existe un email
function existeEmail(email) {
    return obtenerUsuarioPorEmail(email) !== undefined;
}

// ===== GESTIÓN DE SESIÓN =====

// Guardar sesión actual
function guardarSesion(usuario) {
    const sesion = {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        timestamp: Date.now()
    };
    
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sesion));
    console.log('✅ Sesión guardada:', usuario.email);
}

// Obtener sesión actual
function obtenerSesion() {
    const sesion = localStorage.getItem(SESSION_STORAGE_KEY);
    return sesion ? JSON.parse(sesion) : null;
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('👋 Sesión cerrada');
}

// Verificar si hay sesión activa
function haySesionActiva() {
    return obtenerSesion() !== null;
}

// ===== FUNCIONES DE AUTENTICACIÓN =====

// Login
function login(email, password) {
    const usuario = obtenerUsuarioPorEmail(email);
    
    if (!usuario) {
        throw new Error('Usuario no encontrado');
    }
    
    if (usuario.password !== password) {
        throw new Error('Contraseña incorrecta');
    }
    
    // Actualizar último acceso
    const usuarios = obtenerUsuarios();
    const index = usuarios.findIndex(u => u.id === usuario.id);
    usuarios[index].ultimoAcceso = new Date().toISOString();
    guardarUsuarios(usuarios);
    
    // Guardar sesión
    guardarSesion(usuario);
    
    return usuario;
}

// Registro
function registrarUsuario(nombre, email, password, rol = 'ciudadano') {
    // Validaciones
    if (!nombre || nombre.trim().length < 3) {
        throw new Error('El nombre debe tener al menos 3 caracteres');
    }
    
    if (!email || !email.includes('@')) {
        throw new Error('Email inválido');
    }
    
    if (!password || password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
    }
    
    if (existeEmail(email)) {
        throw new Error('Este email ya está registrado');
    }
    
    // Crear nuevo usuario
    const usuarios = obtenerUsuarios();
    const nuevoId = Math.max(...usuarios.map(u => u.id), 0) + 1;
    
    const nuevoUsuario = {
        id: nuevoId,
        nombre: nombre.trim(),
        email: email.toLowerCase().trim(),
        password: password, // En producción: hashear
        rol: rol,
        fechaRegistro: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
        favoritos: []
    };
    
    usuarios.push(nuevoUsuario);
    guardarUsuarios(usuarios);
    
    console.log('✅ Nuevo usuario registrado:', email);
    return nuevoUsuario;
}

// ===== GESTIÓN DE FAVORITOS =====

// Obtener favoritos del usuario actual
function obtenerFavoritosUsuario(usuarioId) {
    const usuarios = obtenerUsuarios();
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario ? usuario.favoritos : [];
}

// Agregar favorito
function agregarFavorito(usuarioId, eventoId) {
    const usuarios = obtenerUsuarios();
    const index = usuarios.findIndex(u => u.id === usuarioId);
    
    if (index === -1) {
        throw new Error('Usuario no encontrado');
    }
    
    if (!usuarios[index].favoritos) {
        usuarios[index].favoritos = [];
    }
    
    if (!usuarios[index].favoritos.includes(eventoId)) {
        usuarios[index].favoritos.push(eventoId);
        guardarUsuarios(usuarios);
        console.log('⭐ Favorito agregado:', eventoId);
    }
}

// Eliminar favorito
function eliminarFavorito(usuarioId, eventoId) {
    const usuarios = obtenerUsuarios();
    const index = usuarios.findIndex(u => u.id === usuarioId);
    
    if (index === -1) {
        throw new Error('Usuario no encontrado');
    }
    
    usuarios[index].favoritos = usuarios[index].favoritos.filter(id => id !== eventoId);
    guardarUsuarios(usuarios);
    console.log('❌ Favorito eliminado:', eventoId);
}

// Verificar si un evento es favorito
function esFavorito(usuarioId, eventoId) {
    const favoritos = obtenerFavoritosUsuario(usuarioId);
    return favoritos.includes(eventoId);
}

// ===== INTERFAZ DE USUARIO =====

// Abrir modal de autenticación
function abrirModalAuth() {
    const modal = document.getElementById('modalAuth');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevenir scroll
    }
}

// Cerrar modal de autenticación
function cerrarModalAuth() {
    const modal = document.getElementById('modalAuth');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restaurar scroll
    }
}

// Cambiar entre tabs (login/registro)
function cambiarTab(tab) {
    // Actualizar tabs
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    // Actualizar formularios
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        document.getElementById('formLogin').classList.add('active');
    } else {
        document.getElementById('formRegistro').classList.add('active');
    }
}

// Mostrar alerta en el formulario
function mostrarAlerta(mensaje, tipo = 'error', formId = 'formLogin') {
    const form = document.getElementById(formId);
    
    // Eliminar alertas anteriores
    const alertaAnterior = form.querySelector('.auth-alert');
    if (alertaAnterior) {
        alertaAnterior.remove();
    }
    
    // Crear nueva alerta
    const alerta = document.createElement('div');
    alerta.className = `auth-alert ${tipo}`;
    alerta.textContent = mensaje;
    
    // Insertar al principio del formulario
    form.insertBefore(alerta, form.querySelector('h2').nextSibling);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        alerta.remove();
    }, 5000);
}

// ===== MANEJADORES DE EVENTOS =====

// Manejar login
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const usuario = login(email, password);
        
        mostrarAlerta(`¡Bienvenido/a ${usuario.nombre}! 🚀`, 'success', 'formLogin');
        
        setTimeout(() => {
            cerrarModalAuth();
            actualizarInterfazUsuarioLogueado();
            
            // Si existe la función de script.js, recargar favoritos
            if (typeof cargarFavoritosUsuario === 'function') {
                window.usuarioActual = usuario;
                window.favoritosUsuario = obtenerFavoritosUsuario(usuario.id);
                cargarFavoritosUsuario();
            }
            
            console.log('✅ Login exitoso:', usuario);
        }, 1000);
        
    } catch (error) {
        mostrarAlerta(error.message, 'error', 'formLogin');
        console.error('❌ Error en login:', error);
    }
}

// Manejar registro
function handleRegistro(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('regNombre').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const rol = document.getElementById('regRol').value;
    
    try {
        const nuevoUsuario = registrarUsuario(nombre, email, password, rol);
        
        mostrarAlerta('¡Cuenta creada exitosamente! Iniciando sesión...', 'success', 'formRegistro');
        
        setTimeout(() => {
            // Auto-login después del registro
            guardarSesion(nuevoUsuario);
            cerrarModalAuth();
            actualizarInterfazUsuarioLogueado();
            
            // Limpiar formulario
            document.getElementById('formRegistro').querySelector('form').reset();
            
            console.log('✅ Registro exitoso:', nuevoUsuario);
        }, 1500);
        
    } catch (error) {
        mostrarAlerta(error.message, 'error', 'formRegistro');
        console.error('❌ Error en registro:', error);
    }
}

// Manejar logout
function handleLogout() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        cerrarSesion();
        actualizarInterfazUsuarioLogueado();
        
        // Limpiar variables globales de script.js si existen
        if (window.usuarioActual) {
            window.usuarioActual = null;
            window.favoritosUsuario = [];
        }
        
        console.log('👋 Sesión cerrada exitosamente');
    }
}

// Actualizar interfaz cuando el usuario está logueado
function actualizarInterfazUsuarioLogueado() {
    const sesion = obtenerSesion();
    const nav = document.querySelector('nav ul');
    
    // Eliminar botón de login o info de usuario existente
    const btnLoginExistente = nav.querySelector('.btn-login-header');
    const userInfoExistente = nav.querySelector('.user-info-container');
    
    if (btnLoginExistente) btnLoginExistente.remove();
    if (userInfoExistente) userInfoExistente.remove();
    
    if (sesion) {
        // Usuario logueado - Mostrar info y botón de logout
        const userContainer = document.createElement('li');
        userContainer.className = 'user-info-container';
        userContainer.innerHTML = `
            <span class="user-info">
                ${getRolIcon(sesion.rol)} ${sesion.nombre} 
                <small>(${getRolNombre(sesion.rol)})</small>
            </span>
            <button class="btn-logout" onclick="handleLogout()">Salir</button>
        `;
        nav.appendChild(userContainer);
        
        console.log('👤 Usuario logueado:', sesion.nombre);
    } else {
        // No hay usuario - Mostrar botón de login
        const btnLogin = document.createElement('li');
        btnLogin.innerHTML = `
            <button class="btn-login-header" onclick="abrirModalAuth()">
                🔐 Iniciar Sesión
            </button>
        `;
        nav.appendChild(btnLogin);
        
        console.log('🔓 No hay usuario logueado');
    }
}

// Obtener icono según el rol
function getRolIcon(rol) {
    const iconos = {
        admin: '👑',
        cientifico: '🔬',
        ciudadano: '👤'
    };
    return iconos[rol] || '👤';
}

// Obtener nombre del rol
function getRolNombre(rol) {
    const nombres = {
        admin: 'Administrador',
        cientifico: 'Científico',
        ciudadano: 'Ciudadano'
    };
    return nombres[rol] || 'Usuario';
}

// Auto-completar formulario de login al hacer click en usuario de prueba
document.addEventListener('click', (e) => {
    if (e.target.closest('.usuario-prueba')) {
        const usuarioPrueba = e.target.closest('.usuario-prueba');
        const texto = usuarioPrueba.textContent;
        
        // Extraer email y contraseña del texto
        const emailMatch = texto.match(/📧\s*([^\s]+)/);
        const passwordMatch = texto.match(/🔑\s*([^\s]+)/);
        
        if (emailMatch && passwordMatch) {
            document.getElementById('loginEmail').value = emailMatch[1];
            document.getElementById('loginPassword').value = passwordMatch[1];
            
            mostrarAlerta('Datos autocompletados. Haz clic en "Iniciar Sesión"', 'info', 'formLogin');
        }
    }
});

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 Sistema de autenticación inicializado');
    
    // Inicializar usuarios hardcodeados
    inicializarUsuarios();
    
    // Verificar si hay sesión activa
    actualizarInterfazUsuarioLogueado();
    
    // Si hay sesión, cargar favoritos
    const sesion = obtenerSesion();
    if (sesion) {
        window.usuarioActual = sesion;
        window.favoritosUsuario = obtenerFavoritosUsuario(sesion.id);
        console.log('✅ Sesión restaurada:', sesion.nombre);
        console.log('⭐ Favoritos cargados:', window.favoritosUsuario);
    }
    
    // Cerrar modal al hacer click fuera
    document.getElementById('modalAuth').addEventListener('click', (e) => {
        if (e.target.id === 'modalAuth') {
            cerrarModalAuth();
        }
    });
    
    // Cerrar modal con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cerrarModalAuth();
        }
    });
    
    console.log(`
📊 USUARIOS DE PRUEBA DISPONIBLES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Admin NASA
   📧 admin@nasa.com
   🔑 admin123
   
2. Dr. María García (Científica)
   📧 maria@cientifico.es
   🔑 ciencia123
   
3. Juan Ciudadano
   📧 juan@ciudadano.es
   🔑 ciudadano123
   
4. Ana Investigadora (Científica)
   📧 ana@universidad.es
   🔑 investiga123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
});

// Exportar funciones para uso en script.js
window.obtenerSesion = obtenerSesion;
window.obtenerFavoritosUsuario = obtenerFavoritosUsuario;
window.agregarFavorito = agregarFavorito;
window.eliminarFavorito = eliminarFavorito;
window.esFavorito = esFavorito;
window.handleLogout = handleLogout;
window.abrirModalAuth = abrirModalAuth;
window.cerrarModalAuth = cerrarModalAuth;
window.cambiarTab = cambiarTab;
window.handleLogin = handleLogin;
window.handleRegistro = handleRegistro;