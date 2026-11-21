/**
 * Energy Orb / Particle Sphere Engine
 * 
 * - Multi-instance support for all timeline items in the Education section
 * - Perfectly circular/spherical floating 3D orb rendered in the page's signature neon lime (#c6f36a)
 * - Zero white halos or outer fog effects; completely transparent background integration
 * - Smooth, minimalistic, subtle flowing filament lines in vibrant neon lime / chartreuse / emerald
 * - Compact balanced proportions (-20% size reduction, 156px)
 * - Slowly rotates with compound multi-axis planetary motion and gentle breathing pulse
 * - Continuously emits delicate neon lime micro-spark particles that drift outward and dissolve
 * - Reacts dynamically to cursor proximity, hover tilt, drag momentum, and click ripples
 * - High-DPI support, zero-cost viewport pausing (IntersectionObserver), and robust 2D Canvas fallback
 */

(function initEnergyOrbs() {
  let attempts = 0;
  const maxAttempts = 100;

  function tryInit() {
    const containers = document.querySelectorAll('.energy-orb-container');
    const hasThree = typeof window.THREE !== 'undefined';

    if (!containers || containers.length === 0) {
      if (attempts++ < maxAttempts) {
        setTimeout(tryInit, 50);
      }
      return;
    }

    if (hasThree) {
      try {
        const sharedTexture = createParticleTexture();
        containers.forEach((container, idx) => {
          const canvas = container.querySelector('canvas');
          if (canvas && !container.dataset.orbInitialized) {
            container.dataset.orbInitialized = 'true';
            startThreeOrb(canvas, container, idx, sharedTexture);
          }
        });
        return;
      } catch (err) {
        console.warn('Three.js WebGL initialization failed, falling back to 2D canvas orbs:', err);
      }
    }

    if (typeof window.THREE === 'undefined' && attempts++ < 30) {
      setTimeout(tryInit, 80);
      return;
    }

    containers.forEach((container, idx) => {
      const canvas = container.querySelector('canvas');
      if (canvas && !container.dataset.orbInitialized) {
        container.dataset.orbInitialized = 'true';
        startCanvas2DOrb(canvas, container, idx);
      }
    });
  }

  // Pure neon lime circular particle sprite texture (zero white wash)
  function createParticleTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(226, 249, 184, 1)');      // Pale neon lime #e2f9b8
    grad.addColorStop(0.25, 'rgba(198, 243, 106, 0.95)'); // Core signature neon lime #c6f36a
    grad.addColorStop(0.5, 'rgba(163, 230, 53, 0.6)');    // Electric chartreuse #a3e635
    grad.addColorStop(0.75, 'rgba(34, 197, 94, 0.2)');    // Luminous emerald #22c55e
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  // ---------------------------------------------------------------------------
  // Three.js WebGL Engine Instance (Pure Neon Lime)
  // ---------------------------------------------------------------------------
  function startThreeOrb(canvas, container, instanceIndex, sharedTexture) {
    const rect = container.getBoundingClientRect();
    const size = Math.max(120, Math.min(200, rect.width || 156));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1.0, 0.1, 100);
    camera.position.set(0, 0, 3.8);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);

    const particleTexture = sharedTexture || createParticleTexture();
    const SPHERE_R = 1.15;

    // Master groups
    const orbGroup = new THREE.Group();
    const coreSphereGroup = new THREE.Group();
    const filamentsGroup = new THREE.Group();
    const emitterGroup = new THREE.Group();

    orbGroup.add(coreSphereGroup);
    orbGroup.add(filamentsGroup);
    orbGroup.add(emitterGroup);
    scene.add(orbGroup);

    // Initial slight angle variation per orb for organic rhythm
    orbGroup.rotation.y = instanceIndex * 0.9;
    orbGroup.rotation.x = (instanceIndex - 1) * 0.15;

    // Neon lime palette matching the page's signature accent color (--lime: #c6f36a)
    const cLimePrimary = new THREE.Color('#c6f36a');
    const cLimeBright  = new THREE.Color('#d9f99d');
    const cLimeVivid   = new THREE.Color('#a3e635');
    const cLimeMint    = new THREE.Color('#4ade80');
    const cLimeEmerald = new THREE.Color('#22c55e');

    // 1. LAYER A: CELESTIAL SPHERICAL PARTICLE GRID & SHELL
    const LAT_RINGS = 24;
    const LON_POINTS = 36;
    const GRID_COUNT = LAT_RINGS * LON_POINTS;
    const FIBONACCI_COUNT = 950;
    const TOTAL_SHELL_COUNT = GRID_COUNT + FIBONACCI_COUNT;

    const shellPositions = new Float32Array(TOTAL_SHELL_COUNT * 3);
    const shellBasePositions = new Float32Array(TOTAL_SHELL_COUNT * 3);
    const shellColors = new Float32Array(TOTAL_SHELL_COUNT * 3);
    const shellPhases = new Float32Array(TOTAL_SHELL_COUNT);
    const shellSpeeds = new Float32Array(TOTAL_SHELL_COUNT);

    let pIndex = 0;

    for (let lat = 0; lat < LAT_RINGS; lat++) {
      const v = (lat + 1) / (LAT_RINGS + 1);
      const phi = v * Math.PI;
      const y = Math.cos(phi) * SPHERE_R;
      const ringR = Math.sin(phi) * SPHERE_R;

      for (let lon = 0; lon < LON_POINTS; lon++) {
        const u = lon / LON_POINTS;
        const theta = u * Math.PI * 2;
        const x = Math.cos(theta) * ringR;
        const z = Math.sin(theta) * ringR;

        const idx = pIndex * 3;
        shellPositions[idx] = x;
        shellPositions[idx + 1] = y;
        shellPositions[idx + 2] = z;
        shellBasePositions[idx] = x;
        shellBasePositions[idx + 1] = y;
        shellBasePositions[idx + 2] = z;

        shellPhases[pIndex] = Math.random() * Math.PI * 2;
        shellSpeeds[pIndex] = 0.7 + Math.random() * 1.0;

        const pCol = new THREE.Color();
        const normY = (y / SPHERE_R + 1) * 0.5;
        const normZ = (z / SPHERE_R + 1) * 0.5;

        if (normY > 0.6) {
          pCol.copy(cLimePrimary).lerp(cLimeBright, (normY - 0.6) * 2.2);
        } else if (normZ > 0.45) {
          pCol.copy(cLimeVivid).lerp(cLimePrimary, normZ);
        } else {
          pCol.copy(cLimeEmerald).lerp(cLimeMint, 0.6);
        }

        const isRim = ringR > SPHERE_R * 0.85;
        const brightness = isRim ? 1.15 : 0.95;

        shellColors[idx] = pCol.r * brightness;
        shellColors[idx + 1] = pCol.g * brightness;
        shellColors[idx + 2] = pCol.b * brightness;

        pIndex++;
      }
    }

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < FIBONACCI_COUNT; i++) {
      const yNorm = 1 - (i / (FIBONACCI_COUNT - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
      const theta = goldenAngle * i;

      const x = Math.cos(theta) * radiusAtY * SPHERE_R;
      const y = yNorm * SPHERE_R;
      const z = Math.sin(theta) * radiusAtY * SPHERE_R;

      const idx = pIndex * 3;
      shellPositions[idx] = x;
      shellPositions[idx + 1] = y;
      shellPositions[idx + 2] = z;
      shellBasePositions[idx] = x;
      shellBasePositions[idx + 1] = y;
      shellBasePositions[idx + 2] = z;

      shellPhases[pIndex] = Math.random() * Math.PI * 2;
      shellSpeeds[pIndex] = 0.8 + Math.random() * 1.2;

      const pCol = new THREE.Color();
      const normX = (x / SPHERE_R + 1) * 0.5;
      const normY = (y / SPHERE_R + 1) * 0.5;

      if (normX < 0.4) {
        pCol.copy(cLimeVivid).lerp(cLimePrimary, normY);
      } else if (normX > 0.6) {
        pCol.copy(cLimeMint).lerp(cLimeBright, normY);
      } else {
        pCol.copy(cLimePrimary).lerp(cLimeBright, 0.45);
      }

      if (Math.random() < 0.08) {
        pCol.copy(cLimeBright);
      }

      const brightness = 1.05;
      shellColors[idx] = pCol.r * brightness;
      shellColors[idx + 1] = pCol.g * brightness;
      shellColors[idx + 2] = pCol.b * brightness;

      pIndex++;
    }

    const shellGeometry = new THREE.BufferGeometry();
    shellGeometry.setAttribute('position', new THREE.BufferAttribute(shellPositions, 3));
    shellGeometry.setAttribute('color', new THREE.BufferAttribute(shellColors, 3));

    const shellMaterial = new THREE.PointsMaterial({
      size: 0.046,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const shellPoints = new THREE.Points(shellGeometry, shellMaterial);
    coreSphereGroup.add(shellPoints);

    // 2. LAYER B: SMOOTH, MINIMALISTIC & LUMINOUS NEON LIME FILAMENTS
    const filamentConfigs = [
      {
        segments: 180,
        turns: 1.15,
        freq: 1.2,
        tiltX: 0.35,
        tiltZ: 0.18,
        rFactor: 0.90,
        width: 0.075,
        cStart: cLimeVivid,
        cMid: cLimePrimary,
        cEnd: cLimeBright,
        speed: 0.75,
        phase: 0.0,
        opacity: 0.66
      },
      {
        segments: 180,
        turns: -1.2,
        freq: 1.35,
        tiltX: -0.38,
        tiltZ: 0.58,
        rFactor: 0.92,
        width: 0.068,
        cStart: cLimeEmerald,
        cMid: cLimePrimary,
        cEnd: cLimeMint,
        speed: 0.9,
        phase: 1.7,
        opacity: 0.62
      },
      {
        segments: 180,
        turns: 1.25,
        freq: 1.1,
        tiltX: 0.72,
        tiltZ: -0.28,
        rFactor: 0.85,
        width: 0.062,
        cStart: cLimeMint,
        cMid: cLimeBright,
        cEnd: cLimePrimary,
        speed: 0.68,
        phase: 3.3,
        opacity: 0.58
      },
      {
        segments: 180,
        turns: -1.05,
        freq: 1.25,
        tiltX: -0.18,
        tiltZ: -0.58,
        rFactor: 0.88,
        width: 0.082,
        cStart: cLimePrimary,
        cMid: cLimeVivid,
        cEnd: cLimeBright,
        speed: 1.0,
        phase: 4.7,
        opacity: 0.65
      },
      {
        segments: 160,
        turns: 1.35,
        freq: 1.45,
        tiltX: 0.18,
        tiltZ: 0.72,
        rFactor: 0.82,
        width: 0.058,
        cStart: cLimeBright,
        cMid: cLimeMint,
        cEnd: cLimeEmerald,
        speed: 0.82,
        phase: 5.6,
        opacity: 0.56
      }
    ];

    const filamentItems = filamentConfigs.map(cfg => {
      const segs = cfg.segments;
      const vertCount = (segs + 1) * 2;
      const posArray = new Float32Array(vertCount * 3);
      const colArray = new Float32Array(vertCount * 3);
      const indices = [];

      for (let s = 0; s < segs; s++) {
        const i0 = s * 2;
        const i1 = s * 2 + 1;
        const i2 = (s + 1) * 2;
        const i3 = (s + 1) * 2 + 1;
        indices.push(i0, i1, i2);
        indices.push(i1, i3, i2);
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
      geom.setIndex(indices);

      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: cfg.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        wireframe: false
      });

      const mesh = new THREE.Mesh(geom, mat);
      filamentsGroup.add(mesh);

      return {
        mesh: mesh,
        geom: geom,
        cfg: cfg,
        posArray: posArray,
        colArray: colArray
      };
    });

    function updateFilaments(t) {
      filamentItems.forEach(item => {
        const cfg = item.cfg;
        const segs = cfg.segments;
        const pos = item.posArray;
        const cols = item.colArray;

        for (let s = 0; s <= segs; s++) {
          const u = s / segs;
          const angle = u * Math.PI * 2 * cfg.turns + t * cfg.speed * 0.22 + cfg.phase;
          const lat = Math.sin(u * Math.PI * 2 * cfg.freq + t * cfg.speed * 0.28 + cfg.phase) * 0.62;
          
          const maxR = SPHERE_R * cfg.rFactor;
          const rCurve = maxR * (0.88 + 0.12 * Math.cos(u * Math.PI * 2 + t * 0.5));

          let cx = rCurve * Math.cos(angle) * Math.cos(lat);
          let cy = rCurve * Math.sin(lat);
          let cz = rCurve * Math.sin(angle) * Math.cos(lat);

          const cosTx = Math.cos(cfg.tiltX), sinTx = Math.sin(cfg.tiltX);
          const cosTz = Math.cos(cfg.tiltZ), sinTz = Math.sin(cfg.tiltZ);
          
          let y1 = cy * cosTx - cz * sinTx;
          let z1 = cy * sinTx + cz * cosTx;
          let x2 = cx * cosTz - y1 * sinTz;
          let y2 = cx * sinTz + y1 * cosTz;
          cx = x2; cy = y2; cz = z1;

          const widthTaper = Math.sin(u * Math.PI);
          const w = cfg.width * widthTaper * (0.85 + 0.15 * Math.sin(t * 1.2 + u * 4));

          const nx = -Math.sin(angle) * w;
          const ny = Math.cos(lat) * w * 0.4;
          const nz = Math.cos(angle) * w;

          const idx0 = s * 2 * 3;
          pos[idx0] = cx + nx;
          pos[idx0 + 1] = cy + ny;
          pos[idx0 + 2] = cz + nz;

          const idx1 = (s * 2 + 1) * 3;
          pos[idx1] = cx - nx;
          pos[idx1 + 1] = cy - ny;
          pos[idx1 + 2] = cz - nz;

          const c = new THREE.Color();
          if (u < 0.45) {
            c.copy(cfg.cStart).lerp(cfg.cMid, u / 0.45);
          } else {
            c.copy(cfg.cMid).lerp(cfg.cEnd, (u - 0.45) / 0.55);
          }

          cols[idx0] = c.r * 0.95;
          cols[idx0 + 1] = c.g * 0.95;
          cols[idx0 + 2] = c.b * 0.95;

          cols[idx1] = c.r * 1.25;
          cols[idx1 + 1] = c.g * 1.25;
          cols[idx1 + 2] = c.b * 1.25;
        }

        item.geom.attributes.position.needsUpdate = true;
        item.geom.attributes.color.needsUpdate = true;
      });
    }

    // 3. LAYER C: LUMINOUS NEON LIME EMITTED MICRO-SPARKS
    const EMITTER_COUNT = 85;
    const emitPositions = new Float32Array(EMITTER_COUNT * 3);
    const emitColors = new Float32Array(EMITTER_COUNT * 3);
    const sparks = [];

    const sparkColors = [cLimePrimary, cLimeBright, cLimeVivid, cLimeMint];

    function spawnSpark(immediateRadius = false) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      const dirX = Math.sin(phi) * Math.cos(theta);
      const dirY = Math.sin(phi) * Math.sin(theta);
      const dirZ = Math.cos(phi);

      const r = immediateRadius ? SPHERE_R * (1.0 + Math.random() * 0.42) : SPHERE_R * 0.98;
      const speed = 0.20 + Math.random() * 0.28;
      const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];

      return {
        x: dirX * r,
        y: dirY * r,
        z: dirZ * r,
        vx: dirX * speed + (Math.random() - 0.5) * 0.06,
        vy: dirY * speed + (Math.random() - 0.5) * 0.06,
        vz: dirZ * speed + (Math.random() - 0.5) * 0.06,
        life: immediateRadius ? Math.random() : 0.0,
        maxLife: 2.2 + Math.random() * 1.5,
        color: color
      };
    }

    for (let i = 0; i < EMITTER_COUNT; i++) {
      sparks.push(spawnSpark(true));
    }

    const emitterGeom = new THREE.BufferGeometry();
    emitterGeom.setAttribute('position', new THREE.BufferAttribute(emitPositions, 3));
    emitterGeom.setAttribute('color', new THREE.BufferAttribute(emitColors, 3));

    const emitterMat = new THREE.PointsMaterial({
      size: 0.042,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const emitterPoints = new THREE.Points(emitterGeom, emitterMat);
    emitterGroup.add(emitterPoints);

    function updateSparks(dt) {
      for (let i = 0; i < EMITTER_COUNT; i++) {
        const s = sparks[i];
        s.life += dt / s.maxLife;

        if (s.life >= 1.0) {
          sparks[i] = spawnSpark(false);
          continue;
        }

        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;

        s.vx *= 0.992;
        s.vy *= 0.992;
        s.vz *= 0.992;

        const idx = i * 3;
        emitPositions[idx] = s.x;
        emitPositions[idx + 1] = s.y;
        emitPositions[idx + 2] = s.z;

        const alpha = Math.sin(s.life * Math.PI) * 0.95;
        emitColors[idx] = s.color.r * alpha;
        emitColors[idx + 1] = s.color.g * alpha;
        emitColors[idx + 2] = s.color.b * alpha;
      }

      emitterGeom.attributes.position.needsUpdate = true;
      emitterGeom.attributes.color.needsUpdate = true;
    }

    // 4. INTERACTIVE CURSOR CONTROLS (Scoped to this instance)
    let targetTiltX = 0, targetTiltY = 0;
    let currentTiltX = 0, currentTiltY = 0;
    let speedMult = 1.0;
    let targetSpeedMult = 1.0;
    let clickShockwave = 0.0;

    function handlePointer(e) {
      const bcr = container.getBoundingClientRect();
      const centerX = bcr.left + bcr.width * 0.5;
      const centerY = bcr.top + bcr.height * 0.5;

      const dx = (e.clientX - centerX) / (bcr.width * 0.5);
      const dy = (e.clientY - centerY) / (bcr.height * 0.5);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2.5) {
        targetTiltX = dy * 0.32;
        targetTiltY = dx * 0.32;
        targetSpeedMult = dist < 1.0 ? 2.0 : 1.4;
      } else {
        targetTiltX = 0;
        targetTiltY = 0;
        targetSpeedMult = 1.0;
      }
    }

    window.addEventListener('pointermove', handlePointer, { passive: true });

    container.addEventListener('pointerenter', () => {
      targetSpeedMult = 2.0;
    });

    container.addEventListener('pointerleave', () => {
      targetSpeedMult = 1.0;
      targetTiltX = 0;
      targetTiltY = 0;
    });

    container.addEventListener('click', () => {
      clickShockwave = 1.0;
      for (let i = 0; i < 20; i++) {
        const s = spawnSpark(false);
        s.vx *= 2.0;
        s.vy *= 2.0;
        s.vz *= 2.0;
        sparks[Math.floor(Math.random() * EMITTER_COUNT)] = s;
      }
    });

    // 5. VIEWPORT OBSERVATION & RENDER LOOP
    let isVisible = false;
    let animId = null;
    let lastTime = performance.now();
    let totalTime = instanceIndex * 1.4; // Organic time phase offset

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          isVisible = true;
          if (!animId) {
            lastTime = performance.now();
            animId = requestAnimationFrame(renderLoop);
          }
        } else {
          isVisible = false;
          if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
          }
        }
      });
    }, { threshold: 0.1 });

    observer.observe(container);

    window.addEventListener('resize', () => {
      const newRect = container.getBoundingClientRect();
      const newSize = Math.max(120, Math.min(200, newRect.width || 156));
      renderer.setSize(newSize, newSize);
      camera.aspect = 1.0;
      camera.updateProjectionMatrix();
    });

    function renderLoop(now) {
      if (!isVisible) {
        animId = null;
        return;
      }

      animId = requestAnimationFrame(renderLoop);

      const dt = Math.min((now - lastTime) * 0.001, 0.1);
      lastTime = now;
      totalTime += dt;

      speedMult += (targetSpeedMult - speedMult) * 0.07;

      orbGroup.position.y = Math.sin(totalTime * 1.3) * 0.032;
      orbGroup.position.x = Math.cos(totalTime * 0.9) * 0.015;

      const breath = 1.0 + 0.026 * Math.sin(totalTime * 1.5) + 0.010 * Math.cos(totalTime * 2.8);
      const shockScale = clickShockwave * 0.05 * Math.sin(clickShockwave * Math.PI * 4);
      const scale = breath + shockScale;
      coreSphereGroup.scale.set(scale, scale, scale);
      filamentsGroup.scale.set(scale, scale, scale);

      if (clickShockwave > 0.001) {
        clickShockwave *= 0.94;
      } else {
        clickShockwave = 0.0;
      }

      currentTiltX += (targetTiltX - currentTiltX) * 0.07;
      currentTiltY += (targetTiltY - currentTiltY) * 0.07;
      orbGroup.rotation.x = currentTiltX;
      orbGroup.rotation.y = currentTiltY;

      coreSphereGroup.rotation.y += 0.006 * speedMult;
      coreSphereGroup.rotation.x += 0.0028 * speedMult;
      coreSphereGroup.rotation.z += 0.0016 * speedMult;

      filamentsGroup.rotation.y -= 0.0045 * speedMult;
      filamentsGroup.rotation.x -= 0.0024 * speedMult;

      const posAttr = shellGeometry.attributes.position;
      const posArray = posAttr.array;
      for (let i = 0; i < TOTAL_SHELL_COUNT; i++) {
        const idx = i * 3;
        const bx = shellBasePositions[idx];
        const by = shellBasePositions[idx + 1];
        const bz = shellBasePositions[idx + 2];

        const wave = 1.0 + 0.016 * Math.sin(totalTime * shellSpeeds[i] * 2.0 + shellPhases[i]);
        posArray[idx] = bx * wave;
        posArray[idx + 1] = by * wave;
        posArray[idx + 2] = bz * wave;
      }
      posAttr.needsUpdate = true;

      updateFilaments(totalTime);
      updateSparks(dt);

      renderer.render(scene, camera);
    }
  }

  // ---------------------------------------------------------------------------
  // Canvas 2D Procedural Fallback Engine (Multi-instance Neon Lime)
  // ---------------------------------------------------------------------------
  function startCanvas2DOrb(canvas, container, instanceIndex) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 156, height = 156;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = container.getBoundingClientRect();
      width = Math.max(120, Math.min(200, rect.width || 156));
      height = width;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const SPHERE_R = width * 0.38;
    const DOT_COUNT = 480;
    const dots = [];

    for (let i = 0; i < DOT_COUNT; i++) {
      const y = 1 - (i / (DOT_COUNT - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = 2.39996 * i;
      dots.push({
        bx: Math.cos(theta) * radiusAtY * SPHERE_R,
        by: y * SPHERE_R,
        bz: Math.sin(theta) * radiusAtY * SPHERE_R,
        phase: Math.random() * Math.PI * 2,
        color: i % 4 === 0 ? '#c6f36a' : (i % 4 === 1 ? '#d9f99d' : (i % 4 === 2 ? '#a3e635' : '#4ade80'))
      });
    }

    let isVisible = true;
    let rotY = instanceIndex * 0.8;

    function render(now) {
      if (!isVisible) return;
      requestAnimationFrame(render);

      const t = now * 0.001 + instanceIndex * 1.5;
      ctx.clearRect(0, 0, width, height);

      rotY += 0.009;
      const rotX = 0.25 + Math.sin(t * 0.6) * 0.1;
      const cx = width * 0.5;
      const cy = height * 0.5 + Math.sin(t * 1.3) * 3;

      ctx.globalCompositeOperation = 'lighter';
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      dots.forEach(d => {
        const x1 = d.bx * cosY - d.bz * sinY;
        const z1 = d.bx * sinY + d.bz * cosY;
        const y2 = d.by * cosX - z1 * sinX;
        const z2 = d.by * sinX + z1 * cosX;

        const scale = 250 / (250 + z2);
        const px = cx + x1 * scale;
        const py = cy + y2 * scale;
        const alpha = Math.max(0.18, (z2 + SPHERE_R) / (2 * SPHERE_R)) * 0.95;

        ctx.fillStyle = d.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.9, 1.9 * scale), 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }

    requestAnimationFrame(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
