// ===== GESTIÓN DEL GLOBO TERRÁQUEO 3D =====

let scene, camera, renderer, globe, controls;
let eventosMarkers3D = [];
let raycaster, mouse;
let animationFrameId;
let isGlobeActive = false;

/**
 * Inicializa el globo terráqueo 3D con Three.js
 */
function inicializarGlobo3D() {
    try {
        const contenedor = document.getElementById('globe3d');
        if (!contenedor) {
            console.error('❌ No se encontró el contenedor del globo 3D');
            return;
        }

        // Configurar escena
        scene = new THREE.Scene();
        
        // Configurar cámara
        const width = contenedor.clientWidth;
        const height = contenedor.clientHeight;
        camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
        camera.position.z = 300;

        // Configurar renderer
        renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        contenedor.appendChild(renderer.domElement);

        // Crear el globo terráqueo
        crearGloboTerraqueo();

        // Configurar luces
        const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(luzAmbiente);

        const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.8);
        luzDireccional.position.set(5, 3, 5);
        scene.add(luzDireccional);

        // Configurar controles de órbita
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.5;
        controls.minDistance = 150;
        controls.maxDistance = 600;
        controls.enablePan = false;

        // Configurar raycaster para interactividad
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // Event listeners
        renderer.domElement.addEventListener('click', onGlobeClick);
        renderer.domElement.addEventListener('mousemove', onGlobeMouseMove);
        window.addEventListener('resize', onWindowResize);

        console.log('✅ Globo 3D inicializado correctamente');
        
        // Iniciar animación
        animarGlobo();
        
        return true;
    } catch (error) {
        console.error('❌ Error inicializando globo 3D:', error);
        mostrarError('Error al inicializar el globo 3D');
        return false;
    }
}

/**
 * Crea el globo terráqueo con textura
 */
function crearGloboTerraqueo() {
    const geometria = new THREE.SphereGeometry(100, 64, 64);
    
    // Usar textura de la Tierra
    const textureLoader = new THREE.TextureLoader();
    
    // Textura de la Tierra (de dominio público)
    const textura = textureLoader.load(
        'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        () => {
            console.log('✅ Textura del globo cargada');
        },
        undefined,
        (error) => {
            console.warn('⚠️ Error cargando textura, usando color sólido');
        }
    );

    // Textura de relieve/bump map
    const bumpMap = textureLoader.load(
        'https://unpkg.com/three-globe/example/img/earth-topology.png'
    );

    const material = new THREE.MeshPhongMaterial({
        map: textura,
        bumpMap: bumpMap,
        bumpScale: 0.5,
        specular: new THREE.Color(0x333333),
        shininess: 5
    });

    globe = new THREE.Mesh(geometria, material);
    scene.add(globe);

    // Añadir atmósfera
    crearAtmosfera();
}

/**
 * Crea efecto de atmósfera alrededor del globo
 */
function crearAtmosfera() {
    const geometriaAtmosfera = new THREE.SphereGeometry(102, 64, 64);
    const materialAtmosfera = new THREE.ShaderMaterial({
        uniforms: {
            c: { value: 0.5 },
            p: { value: 6.0 }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float c;
            uniform float p;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
                gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    const atmosfera = new THREE.Mesh(geometriaAtmosfera, materialAtmosfera);
    scene.add(atmosfera);
}

/**
 * Muestra eventos en el globo 3D
 * @param {Array} eventos - Array de eventos a mostrar
 */
function mostrarEventosEnGlobo3D(eventos) {
    // Limpiar marcadores anteriores
    limpiarMarcadores3D();

    const eventosParaGlobo = eventos.slice(0, 100);

    eventosParaGlobo.forEach(evento => {
        if (!evento.geometry?.[0]?.coordinates || evento.geometry[0].coordinates.length < 2) return;

        const lat = parseFloat(evento.geometry[0].coordinates[1]);
        const lng = parseFloat(evento.geometry[0].coordinates[0]);

        if (isNaN(lat) || isNaN(lng)) return;

        const tipoEvento = evento.categories?.[0]?.id || 'default';
        const config = configuracionEventos[tipoEvento] || configuracionEventos.default;
        const esFavorito = favoritosUsuario.includes(evento.id);

        // Crear marcador 3D
        const marcador = crearMarcador3D(lat, lng, config, evento.closed, esFavorito);
        marcador.userData = {
            evento: evento,
            lat: lat,
            lng: lng
        };

        globe.add(marcador);
        eventosMarkers3D.push(marcador);
    });

    console.log(`✅ ${eventosMarkers3D.length} eventos mostrados en el globo 3D`);
}

/**
 * Crea un marcador 3D para un evento
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {Object} config - Configuración del evento
 * @param {boolean} cerrado - Si el evento está cerrado
 * @param {boolean} esFavorito - Si es favorito
 * @returns {THREE.Mesh} Marcador 3D
 */
function crearMarcador3D(lat, lng, config, cerrado, esFavorito) {
    // Convertir coordenadas geográficas a posición 3D en la esfera
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const radius = 101; // Ligeramente por encima de la superficie

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    // Crear geometría del marcador
    const geometria = new THREE.SphereGeometry(1.5, 16, 16);
    
    // Color según el tipo de evento
    const color = new THREE.Color(config.color);
    const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: cerrado ? 0.2 : 0.5,
        opacity: cerrado ? 0.7 : 1.0,
        transparent: true
    });

    const marcador = new THREE.Mesh(geometria, material);
    marcador.position.set(x, y, z);

    // Añadir anillo para favoritos
    if (esFavorito) {
        const geometriaAnillo = new THREE.RingGeometry(2, 2.5, 32);
        const materialAnillo = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const anillo = new THREE.Mesh(geometriaAnillo, materialAnillo);
        anillo.lookAt(camera.position);
        marcador.add(anillo);
    }

    // Añadir punta/pin
    const geometriaPunta = new THREE.ConeGeometry(0.8, 3, 8);
    const punta = new THREE.Mesh(geometriaPunta, material);
    punta.position.y = 2;
    marcador.add(punta);

    return marcador;
}

/**
 * Limpia todos los marcadores 3D
 */
function limpiarMarcadores3D() {
    eventosMarkers3D.forEach(marcador => {
        globe.remove(marcador);
        if (marcador.geometry) marcador.geometry.dispose();
        if (marcador.material) marcador.material.dispose();
    });
    eventosMarkers3D = [];
}

/**
 * Animación del globo
 */
function animarGlobo() {
    if (!isGlobeActive) return;

    animationFrameId = requestAnimationFrame(animarGlobo);

    // Rotación automática suave del globo
    if (globe && !controls.isUserInteracting) {
        globe.rotation.y += 0.001;
    }

    // Actualizar controles
    if (controls) {
        controls.update();
    }

    // Renderizar escena
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

/**
 * Maneja el evento de click en el globo
 */
function onGlobeClick(event) {
    event.preventDefault();

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(eventosMarkers3D, true);

    if (intersects.length > 0) {
        let marcador = intersects[0].object;
        
        // Buscar el marcador padre si se clickeó un hijo
        while (marcador && !marcador.userData.evento) {
            marcador = marcador.parent;
        }

        if (marcador && marcador.userData.evento) {
            mostrarInfoEvento3D(marcador.userData.evento);
        }
    }
}

/**
 * Maneja el movimiento del mouse sobre el globo
 */
function onGlobeMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(eventosMarkers3D, true);

    // Cambiar cursor
    if (intersects.length > 0) {
        renderer.domElement.style.cursor = 'pointer';
        
        // Efecto hover
        let marcador = intersects[0].object;
        while (marcador && !marcador.userData.evento) {
            marcador = marcador.parent;
        }
        
        if (marcador && marcador.material) {
            marcador.material.emissiveIntensity = 1.0;
        }
    } else {
        renderer.domElement.style.cursor = 'grab';
        
        // Resetear todos los marcadores
        eventosMarkers3D.forEach(m => {
            if (m.material) {
                m.material.emissiveIntensity = m.userData.evento?.closed ? 0.2 : 0.5;
            }
        });
    }
}

/**
 * Muestra información de un evento en un panel
 * @param {Object} evento - Evento a mostrar
 */
function mostrarInfoEvento3D(evento) {
    const categoria = evento.categories?.[0] || { title: 'Sin categoría', id: 'default' };
    const config = configuracionEventos[categoria.id] || configuracionEventos.default;
    const esFavorito = favoritosUsuario.includes(evento.id);
    
    const fechaGeometria = evento.geometry?.[0] 
        ? new Date(evento.geometry[0].date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : 'Fecha no disponible';

    let panelInfo = document.getElementById('panelInfoEvento3D');
    
    if (!panelInfo) {
        panelInfo = document.createElement('div');
        panelInfo.id = 'panelInfoEvento3D';
        panelInfo.className = 'panel-info-3d';
        document.getElementById('globe3d').appendChild(panelInfo);
    }

    panelInfo.innerHTML = `
        <button class="btn-cerrar-panel" onclick="cerrarPanelInfo3D()">✕</button>
        <div class="panel-header">
            <h3 style="color: ${config.color};">${config.emoji} ${evento.title}</h3>
            ${usuarioActual ? `
                <button class="btn-favorito" onclick="toggleFavorito('${evento.id}', '${evento.title.replace(/'/g, "\\'")}')">
                    ${esFavorito ? '⭐' : '☆'}
                </button>
            ` : ''}
        </div>
        <div class="panel-contenido">
            <p><strong>📋 Categoría:</strong> ${categoria.title}</p>
            <p><strong>📅 Fecha:</strong> ${fechaGeometria}</p>
            <p><strong>🔄 Estado:</strong> 
                <span style="color: ${evento.closed ? '#dc3545' : '#28a745'};">
                    ${evento.closed ? '❌ Cerrado' : '✅ Abierto'}
                </span>
            </p>
            ${evento.geometry?.[0] ? `
                <p><strong>🌍 Coordenadas:</strong> 
                    ${evento.geometry[0].coordinates[1].toFixed(4)}, 
                    ${evento.geometry[0].coordinates[0].toFixed(4)}
                </p>
            ` : ''}
            ${evento.description ? `
                <p><strong>📝 Descripción:</strong></p>
                <p style="font-style: italic; font-size: 0.9rem;">${evento.description}</p>
            ` : ''}
            ${evento.sources?.length ? `
                <p><strong>🔗 Fuentes:</strong></p>
                ${evento.sources.map(s => 
                    `<a href="${s.url}" target="_blank" rel="noopener">${s.id || 'NASA'}</a>`
                ).join(' | ')}
            ` : ''}
        </div>
    `;

    panelInfo.classList.add('visible');
}

/**
 * Cierra el panel de información
 */
function cerrarPanelInfo3D() {
    const panel = document.getElementById('panelInfoEvento3D');
    if (panel) {
        panel.classList.remove('visible');
    }
}

/**
 * Ajusta el tamaño del renderer cuando cambia la ventana
 */
function onWindowResize() {
    if (!isGlobeActive) return;
    
    const contenedor = document.getElementById('globe3d');
    if (!contenedor) return;

    const width = contenedor.clientWidth;
    const height = contenedor.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

/**
 * Alterna entre vista 2D y 3D
 */
function toggleVista3D() {
    const mapa2D = document.getElementById('map');
    const globo3D = document.getElementById('globe3d');
    const btn = document.getElementById('btnToggleVista3D');
    
    if (!globo3D.classList.contains('active')) {
        // Activar vista 3D
        mapa2D.classList.remove('active');
        globo3D.classList.add('active');
        btn.textContent = '🗺️ Vista 2D';
        btn.title = 'Cambiar a vista de mapa 2D';
        isGlobeActive = true;
        
        // Inicializar globo si no existe
        if (!scene) {
            const inicializado = inicializarGlobo3D();
            if (!inicializado) {
                // Si falla la inicialización, volver a 2D
                toggleVista3D();
                return;
            }
        }
        
        // Mostrar eventos actuales en el globo
        mostrarEventosEnGlobo3D(eventosData);
        
        // Iniciar animación
        animarGlobo();
        
        console.log('🌍 Vista 3D activada');
    } else {
        // Activar vista 2D
        globo3D.classList.remove('active');
        mapa2D.classList.add('active');
        btn.textContent = '🌍 Vista 3D';
        btn.title = 'Cambiar a vista de globo 3D';
        isGlobeActive = false;
        
        // Detener animación
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        // Cerrar panel si está abierto
        cerrarPanelInfo3D();
        
        console.log('🗺️ Vista 2D activada');
    }
}

/**
 * Centra el globo en una ubicación específica
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 */
function centrarGloboEn(lat, lng) {
    if (!globe || !camera) return;

    // Convertir coordenadas a rotación del globo
    const targetRotationY = -(lng * Math.PI / 180);
    const targetRotationX = -(lat * Math.PI / 180);

    // Animar rotación (simple)
    globe.rotation.y = targetRotationY;
    globe.rotation.x = targetRotationX;

    console.log(`🌍 Globo centrado en: ${lat}, ${lng}`);
}

/**
 * Limpia recursos del globo 3D
 */
function limpiarGlobo3D() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    limpiarMarcadores3D();

    if (renderer) {
        renderer.dispose();
    }

    if (controls) {
        controls.dispose();
    }

    const contenedor = document.getElementById('globe3d');
    if (contenedor && renderer) {
        contenedor.removeChild(renderer.domElement);
    }

    scene = null;
    camera = null;
    renderer = null;
    globe = null;
    controls = null;
    isGlobeActive = false;

    console.log('✅ Recursos del globo 3D liberados');
}

// Añadir OrbitControls a THREE (no viene por defecto)
THREE.OrbitControls = function(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement || document;
    this.enabled = true;
    this.target = new THREE.Vector3();
    this.minDistance = 0;
    this.maxDistance = Infinity;
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI;
    this.enableDamping = false;
    this.dampingFactor = 0.05;
    this.enableZoom = true;
    this.zoomSpeed = 1.0;
    this.enableRotate = true;
    this.rotateSpeed = 1.0;
    this.enablePan = true;
    this.panSpeed = 1.0;
    this.enableKeys = true;
    this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };
    this.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.isUserInteracting = false;

    const scope = this;
    const EPS = 0.000001;
    const STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY_PAN: 4 };
    let state = STATE.NONE;

    const spherical = new THREE.Spherical();
    const sphericalDelta = new THREE.Spherical();
    let scale = 1;
    const panOffset = new THREE.Vector3();
    let zoomChanged = false;

    const rotateStart = new THREE.Vector2();
    const rotateEnd = new THREE.Vector2();
    const rotateDelta = new THREE.Vector2();

    const panStart = new THREE.Vector2();
    const panEnd = new THREE.Vector2();
    const panDelta = new THREE.Vector2();

    const dollyStart = new THREE.Vector2();
    const dollyEnd = new THREE.Vector2();
    const dollyDelta = new THREE.Vector2();

    this.update = function() {
        const offset = new THREE.Vector3();
        const quat = new THREE.Quaternion().setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0));
        const quatInverse = quat.clone().invert();

        const position = scope.camera.position;
        offset.copy(position).sub(scope.target);
        offset.applyQuaternion(quat);

        spherical.setFromVector3(offset);

        if (scope.enableDamping) {
            spherical.theta += sphericalDelta.theta * scope.dampingFactor;
            spherical.phi += sphericalDelta.phi * scope.dampingFactor;
        } else {
            spherical.theta += sphericalDelta.theta;
            spherical.phi += sphericalDelta.phi;
        }

        spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));
        spherical.makeSafe();
        spherical.radius *= scale;
        spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

        scope.target.add(panOffset);

        offset.setFromSpherical(spherical);
        offset.applyQuaternion(quatInverse);
        position.copy(scope.target).add(offset);
        scope.camera.lookAt(scope.target);

        if (scope.enableDamping === true) {
            sphericalDelta.theta *= (1 - scope.dampingFactor);
            sphericalDelta.phi *= (1 - scope.dampingFactor);
            panOffset.multiplyScalar(1 - scope.dampingFactor);
        } else {
            sphericalDelta.set(0, 0, 0);
            panOffset.set(0, 0, 0);
        }

        scale = 1;

        if (zoomChanged) {
            zoomChanged = false;
            return true;
        }

        return false;
    };

    this.dispose = function() {
        scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
        scope.domElement.removeEventListener('mousedown', onMouseDown, false);
        scope.domElement.removeEventListener('wheel', onMouseWheel, false);
        scope.domElement.removeEventListener('touchstart', onTouchStart, false);
        scope.domElement.removeEventListener('touchend', onTouchEnd, false);
        scope.domElement.removeEventListener('touchmove', onTouchMove, false);
        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('mouseup', onMouseUp, false);
    };

    function rotateLeft(angle) {
        sphericalDelta.theta -= angle;
    }

    function rotateUp(angle) {
        sphericalDelta.phi -= angle;
    }

    function dollyIn(dollyScale) {
        if (dollyScale === undefined) {
            dollyScale = getZoomScale();
        }
        scale /= dollyScale;
    }

    function dollyOut(dollyScale) {
        if (dollyScale === undefined) {
            dollyScale = getZoomScale();
        }
        scale *= dollyScale;
    }

    function getZoomScale() {
        return Math.pow(0.95, scope.zoomSpeed);
    }

    function handleMouseDownRotate(event) {
        rotateStart.set(event.clientX, event.clientY);
        scope.isUserInteracting = true;
    }

    function handleMouseDownDolly(event) {
        dollyStart.set(event.clientX, event.clientY);
    }

    function handleMouseMoveRotate(event) {
        rotateEnd.set(event.clientX, event.clientY);
        rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
        rotateLeft(2 * Math.PI * rotateDelta.x / scope.domElement.clientHeight);
        rotateUp(2 * Math.PI * rotateDelta.y / scope.domElement.clientHeight);
        rotateStart.copy(rotateEnd);
        scope.update();
    }

    function handleMouseMoveDolly(event) {
        dollyEnd.set(event.clientX, event.clientY);
        dollyDelta.subVectors(dollyEnd, dollyStart);
        if (dollyDelta.y > 0) {
            dollyIn(getZoomScale());
        } else if (dollyDelta.y < 0) {
            dollyOut(getZoomScale());
        }
        dollyStart.copy(dollyEnd);
        scope.update();
    }

    function handleMouseWheel(event) {
        if (event.deltaY < 0) {
            dollyOut(getZoomScale());
        } else if (event.deltaY > 0) {
            dollyIn(getZoomScale());
        }
        scope.update();
    }

    function onMouseDown(event) {
        if (scope.enabled === false) return;
        event.preventDefault();
        
        switch (event.button) {
            case scope.mouseButtons.LEFT:
                if (scope.enableRotate === false) return;
                handleMouseDownRotate(event);
                state = STATE.ROTATE;
                break;
            case scope.mouseButtons.MIDDLE:
                if (scope.enableZoom === false) return;
                handleMouseDownDolly(event);
                state = STATE.DOLLY;
                break;
        }

        if (state !== STATE.NONE) {
            document.addEventListener('mousemove', onMouseMove, false);
            document.addEventListener('mouseup', onMouseUp, false);
        }
    }

    function onMouseMove(event) {
        if (scope.enabled === false) return;
        event.preventDefault();

        switch (state) {
            case STATE.ROTATE:
                if (scope.enableRotate === false) return;
                handleMouseMoveRotate(event);
                break;
            case STATE.DOLLY:
                if (scope.enableZoom === false) return;
                handleMouseMoveDolly(event);
                break;
        }
    }

    function onMouseUp(event) {
        if (scope.enabled === false) return;
        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('mouseup', onMouseUp, false);
        state = STATE.NONE;
        scope.isUserInteracting = false;
    }

    function onMouseWheel(event) {
        if (scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE) return;
        event.preventDefault();
        event.stopPropagation();
        handleMouseWheel(event);
    }

    function onContextMenu(event) {
        if (scope.enabled === false) return;
        event.preventDefault();
    }

    function onTouchStart(event) {
        if (scope.enabled === false) return;
        event.preventDefault();
        
        switch (event.touches.length) {
            case 1:
                if (scope.enableRotate === false) return;
                rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
                state = STATE.TOUCH_ROTATE;
                break;
            case 2:
                if (scope.enableZoom === false && scope.enablePan === false) return;
                const dx = event.touches[0].pageX - event.touches[1].pageX;
                const dy = event.touches[0].pageY - event.touches[1].pageY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                dollyStart.set(0, distance);
                state = STATE.TOUCH_DOLLY_PAN;
                break;
        }
    }

    function onTouchMove(event) {
        if (scope.enabled === false) return;
        event.preventDefault();
        event.stopPropagation();

        switch (event.touches.length) {
            case 1:
                if (scope.enableRotate === false) return;
                if (state !== STATE.TOUCH_ROTATE) return;
                rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
                rotateLeft(2 * Math.PI * rotateDelta.x / scope.domElement.clientHeight);
                rotateUp(2 * Math.PI * rotateDelta.y / scope.domElement.clientHeight);
                rotateStart.copy(rotateEnd);
                scope.update();
                break;
            case 2:
                if (scope.enableZoom === false && scope.enablePan === false) return;
                if (state !== STATE.TOUCH_DOLLY_PAN) return;
                const dx = event.touches[0].pageX - event.touches[1].pageX;
                const dy = event.touches[0].pageY - event.touches[1].pageY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                dollyEnd.set(0, distance);
                dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, scope.zoomSpeed));
                dollyIn(dollyDelta.y);
                dollyStart.copy(dollyEnd);
                scope.update();
                break;
        }
    }

    function onTouchEnd(event) {
        if (scope.enabled === false) return;
        state = STATE.NONE;
    }

    this.domElement.addEventListener('contextmenu', onContextMenu, false);
    this.domElement.addEventListener('mousedown', onMouseDown, false);
    this.domElement.addEventListener('wheel', onMouseWheel, false);
    this.domElement.addEventListener('touchstart', onTouchStart, false);
    this.domElement.addEventListener('touchend', onTouchEnd, false);
    this.domElement.addEventListener('touchmove', onTouchMove, false);

    this.update();
};

console.log('✅ Módulo de globo 3D cargado');