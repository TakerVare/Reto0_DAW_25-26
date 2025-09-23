-- =====================================================
-- BASE DE DATOS ULTRA-SIMPLIFICADA - NASA EONET TRACKER
-- Solo usuarios y favoritos - Sesiones manejadas por JWT/HTTP
-- =====================================================

-- Tabla de Usuarios
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('cientifico', 'ciudadano', 'admin') NOT NULL DEFAULT 'ciudadano',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP NULL,
    activo BOOLEAN DEFAULT TRUE,
    
    -- Índices para optimización
    INDEX idx_email (email),
    INDEX idx_rol (rol),
    INDEX idx_activo (activo)
);

-- Tabla de Favoritos (relación usuario - evento de API NASA)
CREATE TABLE usuario_favoritos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    evento_id VARCHAR(100) NOT NULL, -- ID del evento de la API NASA (ej: "EONET_15547")
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Restricciones
    UNIQUE KEY unique_favorito (usuario_id, evento_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Índices para optimización
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_evento_id (evento_id),
    INDEX idx_fecha_agregado (fecha_agregado)
);

-- =====================================================
-- DATOS DE PRUEBA
-- =====================================================

-- Usuarios de ejemplo para desarrollo
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES 
('Admin NASA', 'admin@nasa-tracker.local', SHA2('admin123', 256), 'admin'),
('Dr. María García', 'maria.garcia@cientifico.es', SHA2('ciencia123', 256), 'cientifico'),
('Juan Ciudadano', 'juan@ciudadano.es', SHA2('ciudadano123', 256), 'ciudadano'),
('Ana Investigadora', 'ana@universidad.es', SHA2('investiga123', 256), 'cientifico');

-- Favoritos de ejemplo usando IDs reales de la API NASA
INSERT INTO usuario_favoritos (usuario_id, evento_id) VALUES 
-- Dr. María García (científica) - Sigue tormentas y volcanes
(2, 'EONET_15547'), -- Tropical Storm Narda
(2, 'EONET_15545'), -- Super Typhoon Ragasa
(2, 'EONET_15546'), -- Typhoon Neoguri

-- Juan Ciudadano - Interesado en eventos locales
(3, 'EONET_15547'), -- Tropical Storm Narda

-- Ana Investigadora - Estudia fenómenos extremos  
(4, 'EONET_15545'), -- Super Typhoon Ragasa
(4, 'EONET_15546'); -- Typhoon Neoguri

-- =====================================================
-- VISTAS ÚTILES PARA REPORTES
-- =====================================================

-- Vista: Estadísticas de usuarios
CREATE VIEW vista_usuarios_stats AS
SELECT 
    u.id,
    u.nombre,
    u.email,
    u.rol,
    u.fecha_registro,
    u.ultimo_acceso,
    u.activo,
    COUNT(uf.id) as total_favoritos,
    COALESCE(MAX(uf.fecha_agregado), u.fecha_registro) as ultima_actividad
FROM usuarios u
LEFT JOIN usuario_favoritos uf ON u.id = uf.usuario_id
GROUP BY u.id, u.nombre, u.email, u.rol, u.fecha_registro, u.ultimo_acceso, u.activo;

-- Vista: Eventos más populares
CREATE VIEW vista_eventos_populares AS
SELECT 
    evento_id,
    COUNT(*) as total_usuarios,
    MIN(fecha_agregado) as primera_vez_agregado,
    MAX(fecha_agregado) as ultima_vez_agregado
FROM usuario_favoritos
GROUP BY evento_id
ORDER BY total_usuarios DESC, ultima_vez_agregado DESC;

-- Vista: Actividad reciente de favoritos
CREATE VIEW vista_actividad_reciente AS
SELECT 
    uf.evento_id,
    uf.fecha_agregado,
    u.nombre as usuario_nombre,
    u.rol as usuario_rol
FROM usuario_favoritos uf
INNER JOIN usuarios u ON uf.usuario_id = u.id
WHERE uf.fecha_agregado >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY uf.fecha_agregado DESC;

-- =====================================================
-- PROCEDIMIENTOS ALMACENADOS BÁSICOS
-- =====================================================

DELIMITER //

-- Agregar evento a favoritos (con validación)
CREATE PROCEDURE AgregarFavorito(
    IN p_usuario_id INT,
    IN p_evento_id VARCHAR(100)
)
BEGIN
    DECLARE v_usuario_existe INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Verificar que el usuario existe y está activo
    SELECT COUNT(*) INTO v_usuario_existe 
    FROM usuarios 
    WHERE id = p_usuario_id AND activo = TRUE;
    
    IF v_usuario_existe = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no existe o está inactivo';
    END IF;

    START TRANSACTION;
    
    -- Insertar o actualizar fecha si ya existe
    INSERT INTO usuario_favoritos (usuario_id, evento_id) 
    VALUES (p_usuario_id, p_evento_id)
    ON DUPLICATE KEY UPDATE fecha_agregado = CURRENT_TIMESTAMP;
    
    -- Actualizar último acceso del usuario
    UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = p_usuario_id;
    
    COMMIT;
END //

-- Eliminar evento de favoritos
CREATE PROCEDURE EliminarFavorito(
    IN p_usuario_id INT,
    IN p_evento_id VARCHAR(100)
)
BEGIN
    DECLARE v_filas_afectadas INT DEFAULT 0;
    
    DELETE FROM usuario_favoritos 
    WHERE usuario_id = p_usuario_id AND evento_id = p_evento_id;
    
    SET v_filas_afectadas = ROW_COUNT();
    
    -- Actualizar último acceso del usuario si se eliminó algo
    IF v_filas_afectadas > 0 THEN
        UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = p_usuario_id;
    END IF;
    
    SELECT v_filas_afectadas as filas_eliminadas;
END //

-- Obtener todos los favoritos de un usuario
CREATE PROCEDURE ObtenerFavoritosUsuario(
    IN p_usuario_id INT
)
BEGIN
    SELECT 
        uf.evento_id,
        uf.fecha_agregado
    FROM usuario_favoritos uf
    INNER JOIN usuarios u ON uf.usuario_id = u.id
    WHERE uf.usuario_id = p_usuario_id AND u.activo = TRUE
    ORDER BY uf.fecha_agregado DESC;
END //

-- Verificar si un evento es favorito de un usuario
CREATE PROCEDURE EsFavorito(
    IN p_usuario_id INT,
    IN p_evento_id VARCHAR(100)
)
BEGIN
    SELECT 
        CASE 
            WHEN COUNT(*) > 0 THEN TRUE 
            ELSE FALSE 
        END as es_favorito,
        COALESCE(MAX(fecha_agregado), NULL) as fecha_agregado
    FROM usuario_favoritos uf
    INNER JOIN usuarios u ON uf.usuario_id = u.id
    WHERE uf.usuario_id = p_usuario_id 
      AND uf.evento_id = p_evento_id 
      AND u.activo = TRUE;
END //

-- Limpiar favoritos antiguos (mantenimiento)
CREATE PROCEDURE LimpiarFavoritosAntiguos(
    IN p_dias_antiguedad INT
)
BEGIN
    DELETE FROM usuario_favoritos 
    WHERE fecha_agregado < DATE_SUB(NOW(), INTERVAL p_dias_antiguedad DAY);
    
    SELECT ROW_COUNT() as favoritos_eliminados;
END //

DELIMITER ;

-- =====================================================
-- ENDPOINTS JAVA SUGERIDOS
-- =====================================================

/*
CONTROLADORES SPRING BOOT SUGERIDOS:

@RestController
@RequestMapping("/api")
public class UsuarioController {
    
    // AUTENTICACIÓN (sin persistir sesiones en BD)
    @PostMapping("/auth/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request)
    
    @PostMapping("/auth/register") 
    public ResponseEntity<Usuario> register(@RequestBody RegistroRequest request)
    
    // PERFIL DE USUARIO
    @GetMapping("/usuarios/{id}")
    public ResponseEntity<Usuario> obtenerUsuario(@PathVariable Long id)
    
    @PutMapping("/usuarios/{id}/perfil")
    public ResponseEntity<Usuario> actualizarPerfil(@PathVariable Long id, @RequestBody Usuario usuario)
    
    // FAVORITOS
    @GetMapping("/usuarios/{id}/favoritos")
    public ResponseEntity<List<FavoritoResponse>> obtenerFavoritos(@PathVariable Long id)
    
    @PostMapping("/usuarios/{id}/favoritos")  
    public ResponseEntity<String> agregarFavorito(@PathVariable Long id, @RequestBody FavoritoRequest request)
    
    @DeleteMapping("/usuarios/{id}/favoritos/{eventoId}")
    public ResponseEntity<String> eliminarFavorito(@PathVariable Long id, @PathVariable String eventoId)
    
    @GetMapping("/usuarios/{id}/favoritos/{eventoId}/check")
    public ResponseEntity<Boolean> esFavorito(@PathVariable Long id, @PathVariable String eventoId)
    
    // ESTADÍSTICAS (para admin)
    @GetMapping("/admin/eventos-populares")
    public ResponseEntity<List<EventoPopular>> eventosPopulares()
    
    @GetMapping("/admin/usuarios-stats")  
    public ResponseEntity<List<UsuarioStats>> usuariosStats()
}

NOTA: La autenticación se maneja con JWT sin persistir en BD:
- Login genera JWT
- JWT se valida en cada request con @PreAuthorize
- No necesitamos tabla de sesiones
*/

-- =====================================================
-- COMENTARIOS SOBRE LA ARQUITECTURA FINAL
-- =====================================================

/*
ARQUITECTURA ULTRA-SIMPLE:

1. BASE DE DATOS (2 TABLAS):
   └── usuarios (gestión básica)
   └── usuario_favoritos (solo IDs de eventos NASA)

2. AUTENTICACIÓN:
   └── JWT sin persistir en BD
   └── Validación stateless en cada request
   └── Spring Security + @PreAuthorize

3. DATOS DE EVENTOS:
   └── Siempre desde API NASA EONET
   └── Cache en frontend para performance
   └── Posible proxy en backend para rate limiting

4. VENTAJAS:
   ✅ Máxima simplicidad
   ✅ Datos siempre actualizados
   ✅ Sin sincronización compleja
   ✅ Escalable y mantenible
   ✅ Backup mínimo requerido
   ✅ Menos superficie de ataque

5. CONSIDERACIONES:
   - Implementar cache Redis para eventos populares (opcional)
   - Rate limiting para API NASA
   - Validación de IDs de eventos en backend
   - Logs de aplicación para auditoría (no en BD)
*/