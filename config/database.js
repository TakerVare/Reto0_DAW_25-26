const mysql = require('mysql2/promise');

// Configuración de conexión (KISS: Simple y directo)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nasa_eonet_tracker',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Configuración adicional para robustez
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4'
};

// Pool de conexiones (más eficiente que conexiones individuales)
const pool = mysql.createPool(dbConfig);

// Función para ejecutar queries (KISS: Una función para todo)
async function executeQuery(query, params = []) {
    try {
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('❌ Error ejecutando query:', error);
        throw error;
    }
}

// Función para ejecutar múltiples queries (transacciones)
async function executeTransaction(queries) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const results = [];
        for (const { query, params = [] } of queries) {
            const [result] = await connection.execute(query, params);
            results.push(result);
        }
        
        await connection.commit();
        return results;
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Función para verificar conexión
async function testConnection() {
    try {
        const [rows] = await pool.execute('SELECT 1 as test');
        return rows[0].test === 1;
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        throw new Error('No se pudo conectar a la base de datos MySQL');
    }
}

// Función para inicializar la base de datos (ejecutar SQL inicial)
async function initializeDatabase() {
    console.log('🔧 Inicializando base de datos...');
    
    try {
        // Crear tablas si no existen (usando el SQL que ya tienes)
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                rol ENUM('cientifico', 'ciudadano', 'admin') NOT NULL DEFAULT 'ciudadano',
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultimo_acceso TIMESTAMP NULL,
                activo BOOLEAN DEFAULT TRUE,
                
                INDEX idx_email (email),
                INDEX idx_rol (rol),
                INDEX idx_activo (activo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS usuario_favoritos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario_id INT NOT NULL,
                evento_id VARCHAR(100) NOT NULL,
                fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE KEY unique_favorito (usuario_id, evento_id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                
                INDEX idx_usuario_id (usuario_id),
                INDEX idx_evento_id (evento_id),
                INDEX idx_fecha_agregado (fecha_agregado)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        
        console.log('✅ Tablas de base de datos verificadas/creadas');
        
        // Verificar si hay usuarios de prueba, si no, crearlos
        const userCount = await executeQuery('SELECT COUNT(*) as count FROM usuarios');
        
        if (userCount[0].count === 0) {
            console.log('📝 Creando usuarios de prueba...');
            
            const bcrypt = require('bcryptjs');
            
            const usuarios = [
                {
                    nombre: 'Admin NASA',
                    email: 'admin@nasa-tracker.local',
                    password: await bcrypt.hash('admin123', 10),
                    rol: 'admin'
                },
                {
                    nombre: 'Dr. María García',
                    email: 'maria.garcia@cientifico.es',
                    password: await bcrypt.hash('ciencia123', 10),
                    rol: 'cientifico'
                },
                {
                    nombre: 'Juan Ciudadano',
                    email: 'juan@ciudadano.es',
                    password: await bcrypt.hash('ciudadano123', 10),
                    rol: 'ciudadano'
                }
            ];
            
            for (const usuario of usuarios) {
                await executeQuery(
                    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
                    [usuario.nombre, usuario.email, usuario.password, usuario.rol]
                );
            }
            
            console.log('✅ Usuarios de prueba creados');
        }
        
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

// Cerrar pool de conexiones gracefully
async function closePool() {
    try {
        await pool.end();
        console.log('✅ Pool de conexiones MySQL cerrado');
    } catch (error) {
        console.error('❌ Error cerrando pool:', error);
    }
}

module.exports = {
    pool,
    executeQuery,
    executeTransaction,
    testConnection,
    initializeDatabase,
    closePool
};