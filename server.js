require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Importar middlewares personalizados
const rateLimitMiddleware = require('./middleware/rateLimit');
const cacheMiddleware = require('./middleware/cache');

// Importar rutas
const authRoutes = require('./routes/auth');
const favoritosRoutes = require('./routes/favoritos');
const nasaRoutes = require('./routes/nasa');

// Importar configuración de base de datos
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARES GLOBALES (KISS: Solo lo esencial) =====

// Seguridad básica
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https://eonet.gsfc.nasa.gov"]
        }
    }
}));

// CORS permisivo para desarrollo
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://tu-dominio.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Compresión
app.use(compression());

// Parseo JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting global
app.use(rateLimitMiddleware.global);

// Servir archivos estáticos (tu frontend actual)
app.use(express.static(path.join(__dirname, 'public')));

// ===== RUTAS API =====

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV 
    });
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de favoritos (protegidas)
app.use('/api/usuarios', favoritosRoutes);

// Proxy para NASA EONET API (con cache)
app.use('/api/nasa', cacheMiddleware.nasaCache, nasaRoutes);

// ===== FALLBACK PARA SPA =====

// Cualquier ruta no encontrada devuelve el index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== MANEJO DE ERRORES (KISS: Simple y efectivo) =====

app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Error de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token JWT inválido' });
    }
    
    // Error de validación
    if (err.isJoi) {
        return res.status(400).json({ 
            error: 'Datos inválidos', 
            details: err.details 
        });
    }
    
    // Error de base de datos
    if (err.code && err.code.startsWith('ER_')) {
        return res.status(500).json({ 
            error: 'Error de base de datos',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
        });
    }
    
    // Error genérico
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ===== INICIALIZACIÓN DEL SERVIDOR =====

async function startServer() {
    try {
        // Verificar conexión a la base de datos
        console.log('🔌 Verificando conexión a la base de datos...');
        await testConnection();
        console.log('✅ Conexión a base de datos exitosa');
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`
🚀 NASA EONET Tracker Backend iniciado correctamente
📍 Servidor: http://localhost:${PORT}
🌍 Entorno: ${process.env.NODE_ENV}
📊 Health: http://localhost:${PORT}/api/health

Endpoints disponibles:
🔐 POST /api/auth/login
🔐 POST /api/auth/register
⭐ GET  /api/usuarios/:id/favoritos
⭐ POST /api/usuarios/:id/favoritos
⭐ DEL  /api/usuarios/:id/favoritos/:eventoId
🛰️  GET  /api/nasa/events (proxy con cache)
🛰️  GET  /api/nasa/categories (proxy con cache)

🎯 Filosofía KISS aplicada: Simple, rápido, efectivo
            `);
        });
        
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('🛑 Cerrando servidor gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Cerrando servidor gracefully...');
    process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;