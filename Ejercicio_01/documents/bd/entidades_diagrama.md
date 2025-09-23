# Definición de Entidades y Relaciones - NASA EONET Tracker

## 📊 Diagrama de Entidades y Relaciones (ERD)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     USUARIO     │    │    CATEGORIA    │    │     EVENTO      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ 🔑 id (PK)      │    │ 🔑 id (PK)      │    │ 🔑 id (PK)      │
│ nombre          │    │ titulo          │    │ titulo          │
│ email           │    │ descripcion     │    │ descripcion     │
│ password_hash   │    │ color_hex       │    │ link            │
│ rol             │    │ icono_emoji     │    │ cerrado         │
│ fecha_registro  │    │                 │    │ fecha_creacion  │
│ ultimo_acceso   │    │                 │    │ fecha_actual.   │
│ activo          │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         │ 1:N                   │ M:N                   │ 1:N
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│USUARIO_FAVORITOS│    │EVENTO_CATEGORIAS│    │   GEOMETRIAS    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ 🔑 id (PK)      │    │ 🔑 evento_id    │    │ 🔑 id (PK)      │
│ 🔗 usuario_id   │    │ 🔑 categoria_id │    │ 🔗 evento_id    │
│ 🔗 evento_id    │    │                 │    │ fecha           │
│ fecha_agregado  │    │                 │    │ tipo            │
└─────────────────┘    └─────────────────┘    │ latitud         │
                                              │ longitud        │
┌─────────────────┐    ┌─────────────────┐    │ magnitud_valor  │
│USUARIO_ALERTAS  │    │    FUENTES      │    │ magnitud_unidad │
├─────────────────┤    ├─────────────────┤    └─────────────────┘
│ 🔑 id (PK)      │    │ 🔑 id (PK)      │
│ 🔗 usuario_id   │    │ 🔗 evento_id    │    ┌─────────────────┐
│ 🔗 categoria_id │    │ url             │    │   LOG_ACCESOS   │
│ latitud_centro  │    │ nombre          │    ├─────────────────┤
│ longitud_centro │    └─────────────────┘    │ 🔑 id (PK)      │
│ radio_km        │              │            │ 🔗 usuario_id   │
│ activa          │              │ 1:N        │ ip_address      │
│ fecha_creacion  │              │            │ user_agent      │
└─────────────────┘              │            │ accion          │
         │                       │            │ detalles (JSON) │
         │ 1:N                   │            │ timestamp       │
         │                       ▼            └─────────────────┘
         ▼                ┌─────────────────┐
┌─────────────────┐       │     EVENTO      │
│    CATEGORIA    │       │  (referencia)   │
│  (referencia)   │       └─────────────────┘
└─────────────────┘
```

## 🏗️ Entidades Principales

### 1. **USUARIO**
**Propósito**: Gestión de usuarios del sistema (científicos, ciudadanos, administradores)

**Atributos**:
- `id` (INT, PK): Identificador único
- `nombre` (VARCHAR(100)): Nombre completo del usuario
- `email` (VARCHAR(150), UNIQUE): Email único para login
- `password_hash` (VARCHAR(255)): Contraseña encriptada
- `rol` (ENUM): 'cientifico', 'ciudadano', 'admin'
- `fecha_registro` (TIMESTAMP): Fecha de registro
- `ultimo_acceso` (TIMESTAMP): Último acceso al sistema
- `activo` (BOOLEAN): Estado del usuario

**Métodos**:
- `registrar()`: Crear nuevo usuario
- `login()`: Autenticación
- `editarPerfil()`: Modificar datos personales
- `cambiarRol()`: Modificar permisos (solo admin)

---

### 2. **EVENTO**
**Propósito**: Eventos climáticos principales obtenidos de la API NASA EONET

**Atributos**:
- `id` (VARCHAR(100), PK): ID único de la API NASA
- `titulo` (VARCHAR(255)): Nombre del evento
- `descripcion` (TEXT): Descripción detallada
- `link` (VARCHAR(500)): URL de referencia
- `cerrado` (BOOLEAN): Estado del evento
- `fecha_creacion` (TIMESTAMP): Fecha de creación
- `fecha_actualizacion` (TIMESTAMP): Última actualización

**Métodos**:
- `obtenerEventos()`: Consultar eventos desde API
- `filtrarPorCategoria()`: Filtrar por tipo de evento
- `filtrarPorFechas()`: Filtrar por rango temporal
- `actualizarEstado()`: Cambiar estado abierto/cerrado

---

### 3. **CATEGORIA**
**Propósito**: Clasificación de tipos de eventos (incendios, tormentas, etc.)

**Atributos**:
- `id` (VARCHAR(50), PK): Identificador único ('wildfire', 'storm', etc.)
- `titulo` (VARCHAR(100)): Nombre descriptivo
- `descripcion` (TEXT): Descripción detallada
- `color_hex` (VARCHAR(7)): Color para UI (#FF4444)
- `icono_emoji` (VARCHAR(10)): Emoji representativo (🔥, 🌪️)

**Métodos**:
- `obtenerEventosPorCategoria()`: Listar eventos de esta categoría
- `actualizarVisualizacion()`: Modificar colores/iconos

---

### 4. **GEOMETRIA**
**Propósito**: Ubicaciones geográficas y datos temporales de los eventos

**Atributos**:
- `id` (INT, PK): Identificador único
- `evento_id` (VARCHAR(100), FK): Referencia al evento
- `fecha` (TIMESTAMP): Momento específico del evento
- `tipo` (VARCHAR(50)): Tipo de geometría ('Point', 'Polygon')
- `latitud` (DECIMAL(10,8)): Coordenada de latitud
- `longitud` (DECIMAL(11,8)): Coordenada de longitud
- `magnitud_valor` (DECIMAL(10,4)): Valor de magnitud
- `magnitud_unidad` (VARCHAR(20)): Unidad de medida

**Métodos**:
- `calcularDistancia()`: Distancia entre puntos
- `obtenerCoordenadas()`: Coordenadas específicas
- `validarUbicacion()`: Verificar coordenadas válidas

---

### 5. **FUENTE**
**Propósito**: URLs y referencias externas de los eventos

**Atributos**:
- `id` (INT, PK): Identificador único
- `evento_id` (VARCHAR(100), FK): Referencia al evento
- `url` (VARCHAR(1000)): URL de la fuente
- `nombre` (VARCHAR(200)): Nombre descriptivo de la fuente

**Métodos**:
- `validarURL()`: Verificar enlaces activos
- `obtenerMetadatos()`: Extraer información de la URL

---

## 🔗 Relaciones Entre Entidades

### **1:N (Uno a Muchos)**
- `EVENTO` → `GEOMETRIA`: Un evento puede tener múltiples ubicaciones/momentos
- `EVENTO` → `FUENTE`: Un evento puede tener múltiples referencias
- `USUARIO` → `USUARIO_FAVORITOS`: Un usuario puede tener múltiples favoritos
- `USUARIO` → `USUARIO_ALERTAS`: Un usuario puede configurar múltiples alertas
- `USUARIO` → `LOG_ACCESOS`: Un usuario puede tener múltiples accesos registrados

### **M:N (Muchos a Muchos)**
- `EVENTO` ↔ `CATEGORIA`: Un evento puede pertenecer a múltiples categorías, y una categoría puede tener múltiples eventos (tabla intermedia: `EVENTO_CATEGORIAS`)

### **1:1 (Uno a Uno)**
- Ninguna relación directa 1:1 en este diseño

---

## 📋 Entidades de Soporte

### **USUARIO_FAVORITOS**
- **Propósito**: Permite a los usuarios marcar eventos como favoritos
- **Relación**: N:M entre Usuario y Evento

### **USUARIO_ALERTAS**
- **Propósito**: Sistema de alertas geográficas personalizables
- **Funcionalidad**: Notificar cuando ocurran eventos en áreas específicas

### **LOG_ACCESOS**
- **Propósito**: Auditoría y análisis de uso del sistema
- **Datos**: IP, navegador, acciones realizadas, timestamps

### **EVENTO_CATEGORIAS**
- **Propósito**: Tabla intermedia para la relación M:N entre eventos y categorías
- **Permite**: Un evento puede ser clasificado en múltiples categorías

---

## 🎯 Casos de Uso Principales

### **Para Científicos**:
1. Consultar eventos por región geográfica
2. Analizar patrones temporales de eventos
3. Exportar datos para investigación
4. Configurar alertas especializadas

### **Para Ciudadanos**:
1. Visualizar eventos cercanos
2. Recibir notificaciones de emergencia
3. Consultar información básica de eventos
4. Guardar ubicaciones de interés

### **Para Administradores**:
1. Gestionar usuarios y permisos
2. Monitorear uso del sistema
3. Mantener categorías y configuraciones
4. Generar reportes de actividad

---

## 🔍 Consideraciones de Diseño

### **Escalabilidad**:
- Índices optimizados para consultas geográficas
- Particionamiento por fechas para grandes volúmenes
- Estructura preparada para millones de registros

### **Integridad**:
- Claves foráneas con cascadas apropiadas
- Validaciones de coordenadas y fechas
- Restricciones de dominio para enums

### **Performance**:
- Vistas pre-calculadas para consultas complejas
- Índices compuestos para filtros frecuentes
- Procedimientos almacenados para lógica compleja

### **Flexibilidad**:
- Campos JSON para datos variables
- Estructura extensible para nuevas funcionalidades
- Compatibilidad con futuras API versions