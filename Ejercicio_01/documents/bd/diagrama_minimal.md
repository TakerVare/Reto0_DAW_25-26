# Diagrama Ultra-Simplificado - NASA EONET Tracker

## 📊 Base de Datos Mínima (Solo 2 Tablas)

```
┌─────────────────────────┐          ┌─────────────────────────┐
│        USUARIOS         │          │    USUARIO_FAVORITOS    │
├─────────────────────────┤   1   N  ├─────────────────────────┤
│ 🔑 id (PK)              │◄─────────┤ 🔑 id (PK)              │
│ nombre                  │          │ 🔗 usuario_id (FK)      │
│ email (UNIQUE)          │          │ evento_id (NASA API)    │
│ password_hash           │          │ fecha_agregado          │
│ rol (ENUM)              │          └─────────────────────────┘
│ fecha_registro          │
│ ultimo_acceso           │
│ activo                  │
└─────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       EVENTOS (API EXTERNA)                     │
├─────────────────────────────────────────────────────────────────┤
│ 📡 API NASA EONET - https://eonet.gsfc.nasa.gov/api/v3/        │
│                                                                 │
│ Endpoints utilizados:                                           │
│ • GET /events          → Lista completa de eventos             │
│ • GET /categories      → Categorías disponibles                │
│ • GET /events/geojson  → Formato geográfico                    │
│                                                                 │
│ Estructura típica de evento:                                    │
│ {                                                               │
│   "id": "EONET_15547",                                         │
│   "title": "Tropical Storm Narda",                            │
│   "description": null,                                         │
│   "link": "https://eonet.gsfc.nasa.gov/api/v3/events/...",    │
│   "closed": false,                                             │
│   "categories": [{"id": "severeStorms", "title": "Severe..."}],│
│   "sources": [{"id": "JTWC", "url": "https://..."}],          │
│   "geometry": [{                                               │
│     "date": "2025-09-21T18:00:00Z",                          │
│     "type": "Point",                                          │
│     "coordinates": [-99.4, 14.4],                            │
│     "magnitudeValue": 35.00,                                 │
│     "magnitudeUnit": "kts"                                   │
│   }]                                                          │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      AUTENTICACIÓN (SIN BD)                     │
├─────────────────────────────────────────────────────────────────┤
│ 🔐 JWT (JSON Web Tokens) - Stateless                          │
│                                                                 │
│ Flujo:                                                          │
│ 1. POST /api/auth/login → Validar credenciales                │
│ 2. Generar JWT con datos del usuario                          │
│ 3. Frontend guarda JWT en localStorage/sessionStorage         │
│ 4. Cada request incluye: Authorization: Bearer <token>        │
│ 5. Backend valida JWT sin consultar BD                        │
│                                                                 │
│ JWT Payload ejemplo:                                            │
│ {                                                               │
│   "sub": "123",           // user ID                           │
│   "email": "user@...",    // email                            │
│   "rol": "cientifico",    // role                             │
│   "iat": 1632123456,      // issued at                       │
│   "exp": 1632209856       // expires at                      │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## 🏗️ Entidades y Relaciones

### **USUARIOS** (Tabla Local)
- **Propósito**: Gestión básica de cuentas de usuario
- **Campos clave**:
  - `id`: Clave primaria autoincremental
  - `email`: Único, usado para login
  - `password_hash`: SHA-256 o bcrypt
  - `rol`: 'cientifico', 'ciudadano', 'admin'

### **USUARIO_FAVORITOS** (Tabla Local) 
- **Propósito**: Marcar eventos NASA como favoritos
- **Campos clave**:
  - `usuario_id`: FK a usuarios
  - `evento_id`: ID del evento en NASA API (ej: "EONET_15547")
  - `fecha_agregado`: Timestamp del marcado

### **Relación**: 
- **1:N** → Un usuario puede tener muchos favoritos
- **Restricción**: `UNIQUE(usuario_id, evento_id)` evita duplicados

## 🔄 Flujo de Datos Simplificado

### **Autenticación**:
```
1. Usuario → POST /api/auth/login {email, password}
2. Backend → Valida credenciales en tabla usuarios
3. Backend → Genera JWT con datos del usuario  
4. Frontend → Guarda JWT y lo envía en cada request
5. Backend → Valida JWT (sin consultar BD)
```

### **Gestión de Favoritos**:
```
1. Usuario marca favorito → POST /api/usuarios/123/favoritos {evento_id}
2. Backend → Inserta en tabla usuario_favoritos
3. Frontend → Actualiza UI para mostrar estrella dorada
4. Lista de favoritos → GET /api/usuarios/123/favoritos
5. Frontend → Combina IDs con datos frescos de NASA API
```

### **Visualización de Eventos**:
```
1. Frontend → GET https://eonet.gsfc.nasa.gov/api/v3/events
2. NASA API → Devuelve eventos actualizados
3. Frontend → Si usuario logueado, marca cuáles son favoritos
4. Mapa → Muestra eventos con iconos dorados para favoritos
```

## 🚀 Estructura Java Sugerida

### **Entidades JPA**:
```java
@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id @GeneratedValue
    private Long id;
    
    @Column(unique = true)
    private String email;
    
    private String nombre;
    private String passwordHash;
    
    @Enumerated(EnumType.STRING)
    private Rol rol;
    
    // ... getters/setters
}

@Entity 
@Table(name = "usuario_favoritos")
public class UsuarioFavorito {
    @Id @GeneratedValue
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;
    
    @Column(name = "evento_id")
    private String eventoId; // "EONET_15547"
    
    private LocalDateTime fechaAgregado;
    
    // ... getters/setters
}
```

### **Controlador REST**:
```java
@RestController
@RequestMapping("/api")
public class FavoritosController {
    
    @GetMapping("/usuarios/{id}/favoritos")
    public List<String> obtenerFavoritos(@PathVariable Long id) {
        return favoritosService.obtenerEventosFavoritos(id);
    }
    
    @PostMapping("/usuarios/{id}/favoritos")
    public ResponseEntity<String> agregarFavorito(
        @PathVariable Long id,
        @RequestBody FavoritoRequest request
    ) {
        favoritosService.agregarFavorito(id, request.getEventoId());
        return ResponseEntity.ok("Favorito agregado");
    }
    
    @DeleteMapping("/usuarios/{id}/favoritos/{eventoId}")
    public ResponseEntity<String> eliminarFavorito(
        @PathVariable Long id,
        @PathVariable String eventoId
    ) {
        favoritosService.eliminarFavorito(id, eventoId);
        return ResponseEntity.ok("Favorito eliminado");
    }
}
```

## ✅ Ventajas de esta Arquitectura Ultra-Simple

### **Simplicidad Máxima**:
- Solo 2 tablas en BD
- Sin complejidad de sincronización
- Fácil backup y migración
- Mínimo código de mantenimiento

### **Datos Siempre Actualizados**:
- Eventos vienen directo de NASA
- Sin retrasos por sincronización
- Información oficial y confiable

### **Escalabilidad**:
- BD pequeña y rápida
- Cache en frontend para performance
- Posible CDN para recursos estáticos

### **Seguridad**:
- JWT stateless (sin session hijacking)
- Mínima superficie de ataque
- Passwords hasheados
- Validación en backend

### **Mantenimiento**:
- Sin jobs de sincronización
- Sin limpieza de datos obsoletos
- Actualizaciones automáticas de eventos
- Logs de aplicación suficientes para auditoría

## 🎯 Consideraciones de Implementación

1. **Rate Limiting**: Para API NASA (máximo X requests/minuto)
2. **Cache Frontend**: Guardar eventos por unos minutos
3. **Validación**: Verificar que evento_id existe en NASA API
4. **Error Handling**: Manejar fallos de API NASA gracefully
5. **Monitoreo**: Logs de uso y errores (no en BD)

Esta arquitectura es perfecta para el alcance del proyecto: **máxima simplicidad, mínimo mantenimiento, máxima eficiencia**. 🚀
