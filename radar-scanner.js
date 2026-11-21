/**
 * 3D Cybernetic Radar Scanner Engine
 * 
 * - Full 3D perspective holographic HUD radar instrument built on Three.js
 * - Layered 3D floating discs (Z-offset parallax) with subtle isometric perspective tilt
 * - Sweeping 3D scanning beam with soft phosphor gradient trailing wedge
 * - Pulsing central tracking beacon with expanding 3D sonar echo wave rings
 * - Target blips with concentric tracking reticles that flash upon sweep contact and fade
 * - Rotating segmented cybernetic gyro brackets and fine azimuth tick compass
 * - Luminous cybernetic palette matching reference: electric cyan, neon violet, and lime accents
 * - Subtle, minimalistic, razor-sharp lines with 100% transparent background (zero white haze)
 * - Interactive cursor 3D tilt tracking, hover lock reticle, and click sonar ping burst
 * - Viewport pausing via IntersectionObserver (0% CPU when offscreen)
 */

(function init3DRadarScanners() {
  let attempts = 0;
  const maxAttempts = 100;

  function tryInit() {
    const containers = document.querySelectorAll('.radar-scanner-container');
    const hasThree = typeof window.THREE !== 'undefined';

    if (!containers || containers.length === 0) {
      if (attempts++ < maxAttempts) {
        setTimeout(tryInit, 50);
      }
      return;
    }

    if (hasThree) {
      try {
        const sharedTexture = createGlowDotTexture();
        containers.forEach((container, idx) => {
          const canvas = container.querySelector('canvas');
          if (canvas && !container.dataset.radar3DInitialized) {
            try {
              startThreeRadar(canvas, container, idx, sharedTexture);
              container.dataset.radar3DInitialized = 'true';
            } catch (threeErr) {
              console.warn('Three.js 3D Radar container initialization failed, falling back to 2D:', threeErr);
              container.dataset.radar3DInitialized = '2d';
              start2DRadarFallback(canvas, container, idx);
            }
          }
        });
        return;
      } catch (err) {
        console.warn('Three.js 3D Radar initialization failed, falling back to 2D:', err);
      }
    }

    if (typeof window.THREE === 'undefined' && attempts++ < 30) {
      setTimeout(tryInit, 80);
      return;
    }

    // 2D Fallback
    containers.forEach((container, idx) => {
      const canvas = container.querySelector('canvas');
      if (canvas && !container.dataset.radar3DInitialized) {
        container.dataset.radar3DInitialized = '2d';
        start2DRadarFallback(canvas, container, idx);
      }
    });
  }

  // Soft glowing radial sprite texture for blips and beacon in portfolio theme (--lime: #c6f36a)
  function createGlowDotTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.20, 'rgba(217, 249, 157, 1.0)'); // Neon lime/ivory highlight #d9f99d
    grad.addColorStop(0.55, 'rgba(198, 243, 106, 1.0)'); // Pure Signature Neon Lime (--lime: #c6f36a)
    grad.addColorStop(0.80, 'rgba(198, 243, 106, 0.55)'); // Glowing lime corona
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  // Helper to build a smooth circular line geometry
  function createCircleLineGeometry(radius, segments = 64) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  // Helper to build an arc curve line geometry
  function createArcLineGeometry(radius, startAngle, endAngle, segments = 24) {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const theta = startAngle + (i / segments) * (endAngle - startAngle);
      points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  // ---------------------------------------------------------------------------
  // Three.js 3D Holographic Radar Engine
  // ---------------------------------------------------------------------------
  function startThreeRadar(canvas, container, instanceIndex, sharedGlowTexture) {
    const rect = container.getBoundingClientRect();
    const size = Math.max(120, Math.min(200, rect.width || 156));

    // Scene & Perspective Camera (delicate 3D isometric view)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1.0, 0.1, 100);
    camera.position.set(0, 0, 3.85);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);

    const glowTexture = sharedGlowTexture || createGlowDotTexture();
    const RADAR_R = 1.12; // Base outer radius in 3D units

    // Master 3D Hologram Group
    const holoGroup = new THREE.Group();
    scene.add(holoGroup);

    // Default neutral orientation: 100% perfect circle for the viewer when not hovering
    const baseTiltX = 0.0;
    const baseTiltY = 0.0;
    holoGroup.rotation.x = baseTiltX;
    holoGroup.rotation.y = baseTiltY;

    // Palette matching the 3D Energy Orb on Page 3 (Education)
    const cLimePrimary = new THREE.Color('#c6f36a'); // Core Signature Neon Lime
    const cLimeBright  = new THREE.Color('#d9f99d'); // Radiant Pale Lime Highlight
    const cLimeVivid   = new THREE.Color('#a3e635'); // Vibrant Chartreuse
    const cLimeMint    = new THREE.Color('#4ade80'); // Spring Mint Green
    const cLimeEmerald = new THREE.Color('#22c55e'); // Luminous Emerald Green
    const cLimePale    = new THREE.Color('#e2f9b8'); // Pale Neon Lime Accent
    const cOrange      = new THREE.Color('#ff885d'); // Portfolio warm accent (--orange)
    const cWhite       = new THREE.Color('#ffffff');

    // =========================================================================
    // LAYER 0 (Z = 0.0): FAINT CONSTELLATION / TOPOGRAPHY POINT FIELD
    // =========================================================================
    // Subtle background scatter dots seen inside the radar scope
    const FIELD_COUNT = 140;
    const fieldPos = new Float32Array(FIELD_COUNT * 3);
    const fieldCols = new Float32Array(FIELD_COUNT * 3);

    for (let i = 0; i < FIELD_COUNT; i++) {
      const u = Math.random();
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(u) * RADAR_R * 0.92;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;

      const idx = i * 3;
      fieldPos[idx] = x;
      fieldPos[idx + 1] = y;
      fieldPos[idx + 2] = -0.01;

      const rand = Math.random();
      let col;
      if (rand < 0.28) {
        col = cLimeEmerald;
      } else if (rand < 0.58) {
        col = cLimeMint;
      } else if (rand < 0.88) {
        col = cLimePrimary;
      } else {
        col = cLimeBright;
      }
      const alpha = (0.20 + Math.random() * 0.30) * 1.25;
      fieldCols[idx] = col.r * alpha;
      fieldCols[idx + 1] = col.g * alpha;
      fieldCols[idx + 2] = col.b * alpha;
    }

    const fieldGeom = new THREE.BufferGeometry();
    fieldGeom.setAttribute('position', new THREE.BufferAttribute(fieldPos, 3));
    fieldGeom.setAttribute('color', new THREE.BufferAttribute(fieldCols, 3));

    const fieldMat = new THREE.PointsMaterial({
      size: 0.024,
      map: glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.75, // +25%
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const fieldPoints = new THREE.Points(fieldGeom, fieldMat);
    holoGroup.add(fieldPoints);

    // =========================================================================
    // LAYER 1 (Z = 0.01): CONCENTRIC RANGE CIRCLES & CARDINAL CROSSHAIRS
    // =========================================================================
    const gridGroup = new THREE.Group();
    gridGroup.position.z = 0.01;
    holoGroup.add(gridGroup);

    // 4 Concentric Range Rings matching the Energy Orb multi-layer depth
    const ringRadii = [0.26, 0.50, 0.74, 1.0];
    const ringColors = [cLimeVivid, cLimeEmerald, cLimeMint, cLimePrimary];
    const ringOpacities = [0.50, 0.45, 0.55, 0.88];
    ringRadii.forEach((ratio, idx) => {
      const r = RADAR_R * ratio;
      const geom = createCircleLineGeometry(r, 72);
      const mat = new THREE.LineBasicMaterial({
        color: ringColors[idx],
        transparent: true,
        opacity: ringOpacities[idx],
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const line = new THREE.LineLoop(geom, mat);
      gridGroup.add(line);
    });

    // Cardinal Crosshairs (Horizontal & Vertical with central clearance gap) - Spring Mint
    const crosshairPoints = [];
    const gap = RADAR_R * 0.12;
    // Horizontal left and right
    crosshairPoints.push(new THREE.Vector3(-RADAR_R * 1.02, 0, 0), new THREE.Vector3(-gap, 0, 0));
    crosshairPoints.push(new THREE.Vector3(gap, 0, 0), new THREE.Vector3(RADAR_R * 1.02, 0, 0));
    // Vertical bottom and top
    crosshairPoints.push(new THREE.Vector3(0, -RADAR_R * 1.02, 0), new THREE.Vector3(0, -gap, 0));
    crosshairPoints.push(new THREE.Vector3(0, gap, 0), new THREE.Vector3(0, RADAR_R * 1.02, 0));

    const crosshairGeom = new THREE.BufferGeometry().setFromPoints(crosshairPoints);
    const crosshairMat = new THREE.LineBasicMaterial({
      color: cLimeMint,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const crosshairs = new THREE.LineSegments(crosshairGeom, crosshairMat);
    gridGroup.add(crosshairs);

    // =========================================================================
    // LAYER 2 (Z = 0.03): AZIMUTH COMPASS TICKS (Fine inward radial marks)
    // =========================================================================
    const TICK_COUNT = 48;
    const tickPoints = [];
    const tickColors = [];

    for (let i = 0; i < TICK_COUNT; i++) {
      const angle = (i / TICK_COUNT) * Math.PI * 2;
      const isMajor = i % 12 === 0; // Every 90°
      const isSemi  = i % 4 === 0;  // Every 30°
      const len = isMajor ? 0.08 : (isSemi ? 0.05 : 0.03);

      const rOuter = RADAR_R * 0.98;
      const rInner = rOuter - len;

      const p1 = new THREE.Vector3(Math.cos(angle) * rInner, Math.sin(angle) * rInner, 0.03);
      const p2 = new THREE.Vector3(Math.cos(angle) * rOuter, Math.sin(angle) * rOuter, 0.03);
      tickPoints.push(p1, p2);

      const col = isMajor ? cLimeBright : (isSemi ? cLimePrimary : cLimeMint);
      const alpha = isMajor ? 1.0 : (isSemi ? 0.80 : 0.50);
      tickColors.push(col.r * alpha, col.g * alpha, col.b * alpha);
      tickColors.push(col.r * alpha, col.g * alpha, col.b * alpha);
    }

    const tickGeom = new THREE.BufferGeometry().setFromPoints(tickPoints);
    tickGeom.setAttribute('color', new THREE.Float32BufferAttribute(tickColors, 3));

    const tickMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const tickLines = new THREE.LineSegments(tickGeom, tickMat);
    holoGroup.add(tickLines);

    // =========================================================================
    // LAYER 3 (Z = 0.05): ROTATING SEGMENTED GYRO ARCS (Multi-Tone Energy Harmony)
    // =========================================================================
    const gyroGroup = new THREE.Group();
    gyroGroup.position.z = 0.05;
    holoGroup.add(gyroGroup);

    // Outer curved bracket 1 (top left): Luminous Emerald into Mint (matching page 3 orbital ribbon)
    const arc1Geom = createArcLineGeometry(RADAR_R * 1.05, Math.PI * 0.55, Math.PI * 1.15, 32);
    const arc1Mat = new THREE.LineBasicMaterial({
      color: cLimeEmerald,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const arc1 = new THREE.Line(arc1Geom, arc1Mat);
    gyroGroup.add(arc1);

    // Outer curved bracket 2 (top right & bottom right): Signature Neon Lime
    const arc2Geom = createArcLineGeometry(RADAR_R * 1.05, Math.PI * 1.75, Math.PI * 2.35, 32);
    const arc2Mat = new THREE.LineBasicMaterial({
      color: cLimePrimary,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const arc2 = new THREE.Line(arc2Geom, arc2Mat);
    gyroGroup.add(arc2);

    // Mid dotted tracking arc: Radiant Pale Lime Highlight (like the orbital spark in Energy Orb)
    const arc3Geom = createArcLineGeometry(RADAR_R * 0.86, Math.PI * 0.1, Math.PI * 0.85, 24);
    const arc3Mat = new THREE.LineBasicMaterial({
      color: cLimeBright,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const arc3 = new THREE.Line(arc3Geom, arc3Mat);
    gyroGroup.add(arc3);

    // =========================================================================
    // LAYER 4 (Z = 0.07): 3D SWEEPING BEAM & PHOSPHOR GRADIENT WEDGE
    // =========================================================================
    const sweepGroup = new THREE.Group();
    sweepGroup.position.z = 0.07;
    holoGroup.add(sweepGroup);

    // Parametric Trailing Phosphor Wedge (36 triangle slices spanning ~42°)
    const WEDGE_SEGS = 36;
    const TRAIL_ANGLE = 0.75; // ~43 degrees
    const wedgePos = new Float32Array((WEDGE_SEGS + 2) * 3);
    const wedgeCols = new Float32Array((WEDGE_SEGS + 2) * 3);
    const wedgeIndices = [];

    // Center origin vertex at index 0 (subtle mint/emerald origin glow)
    wedgePos[0] = 0; wedgePos[1] = 0; wedgePos[2] = 0;
    wedgeCols[0] = cLimeMint.r * 0.25;
    wedgeCols[1] = cLimeMint.g * 0.25;
    wedgeCols[2] = cLimeMint.b * 0.25;

    for (let i = 0; i <= WEDGE_SEGS; i++) {
      const frac = i / WEDGE_SEGS; // 0 (tail) to 1 (leading beam)
      const a = -TRAIL_ANGLE * (1 - frac);
      const x = Math.cos(a) * RADAR_R;
      const y = Math.sin(a) * RADAR_R;

      const vIdx = (i + 1) * 3;
      wedgePos[vIdx] = x;
      wedgePos[vIdx + 1] = y;
      wedgePos[vIdx + 2] = 0;

      // Color gradation inspired by Energy Orb on Page 3:
      // Tail (frac < 0.40): Luminous Emerald (#22c55e) -> Spring Mint (#4ade80)
      // Mid  (0.40 <= frac < 0.80): Spring Mint (#4ade80) -> Signature Neon Lime (#c6f36a)
      // Head (frac >= 0.80): Neon Lime (#c6f36a) -> Radiant Pale Lime (#d9f99d)
      let col = new THREE.Color();
      if (frac < 0.40) {
        col.copy(cLimeEmerald).lerp(cLimeMint, frac / 0.40);
      } else if (frac < 0.80) {
        col.copy(cLimeMint).lerp(cLimePrimary, (frac - 0.40) / 0.40);
      } else {
        col.copy(cLimePrimary).lerp(cLimeBright, (frac - 0.80) / 0.20);
      }

      const alpha = Math.pow(frac, 1.95) * 0.35;
      wedgeCols[vIdx] = col.r * alpha;
      wedgeCols[vIdx + 1] = col.g * alpha;
      wedgeCols[vIdx + 2] = col.b * alpha;

      if (i < WEDGE_SEGS) {
        wedgeIndices.push(0, i + 1, i + 2);
      }
    }

    const wedgeGeom = new THREE.BufferGeometry();
    wedgeGeom.setAttribute('position', new THREE.BufferAttribute(wedgePos, 3));
    wedgeGeom.setAttribute('color', new THREE.BufferAttribute(wedgeCols, 3));
    wedgeGeom.setIndex(wedgeIndices);

    const wedgeMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const wedgeMesh = new THREE.Mesh(wedgeGeom, wedgeMat);
    sweepGroup.add(wedgeMesh);

    // Leading Sweep Beam Line (Radiant Pale Lime highlight from Energy Orb)
    const beamLinePoints = [new THREE.Vector3(0, 0, 0.005), new THREE.Vector3(RADAR_R, 0, 0.005)];
    const beamLineGeom = new THREE.BufferGeometry().setFromPoints(beamLinePoints);
    const beamLineMat = new THREE.LineBasicMaterial({
      color: cLimeBright,
      transparent: true,
      opacity: 0.80,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const beamLine = new THREE.Line(beamLineGeom, beamLineMat);
    sweepGroup.add(beamLine);

    // Tip marker on the beam line (Bright pale accent)
    const tipGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(RADAR_R * 0.99, 0, 0.01)]);
    const tipMat = new THREE.PointsMaterial({
      size: 0.055,
      map: glowTexture,
      color: cLimeBright,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const tipPoint = new THREE.Points(tipGeom, tipMat);
    sweepGroup.add(tipPoint);

    // =========================================================================
    // LAYER 5 (Z = 0.09): DYNAMIC RANDOM TARGET BLIPS & RETICLES (Neon Lime)
    // =========================================================================
    const targetsGroup = new THREE.Group();
    targetsGroup.position.z = 0.09;
    holoGroup.add(targetsGroup);

    // Exactly 3 target slots maximum (random count 1-3 active, random positions, slow decay to zero)
    const TARGET_POOL_SIZE = 3;
    const targetPalette = [cLimeBright, cLimeMint, cLimePrimary, cLimeEmerald, cLimeVivid];

    const targets = [];
    for (let i = 0; i < TARGET_POOL_SIZE; i++) {
      // Primary luminous target dot
      const dotGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
      const dotMat = new THREE.PointsMaterial({
        size: 0.075,
        map: glowTexture,
        color: cLimePrimary.clone(),
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const dot = new THREE.Points(dotGeom, dotMat);
      targetsGroup.add(dot);

      // Delicate concentric targeting reticle
      const retGeom = createCircleLineGeometry(0.075, 32);
      const retMat = new THREE.LineBasicMaterial({
        color: cLimePrimary.clone(),
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const reticle = new THREE.LineLoop(retGeom, retMat);
      targetsGroup.add(reticle);

      targets.push({
        index: i,
        dot: dot,
        dotMat: dotMat,
        reticle: reticle,
        r: 0,
        angle: 0,
        x: 0,
        y: 0,
        col: cLimePrimary.clone(),
        intensity: 0.0,
        hasReticle: false,
        state: 'IDLE',
        cooldown: i * 0.6 + Math.random() * 0.5,
        fadeSpeed: 0.28 + Math.random() * 0.08
      });
    }

    // Function to calculate random coordinates across the radar for an individual target slot
    function spawnTarget(t) {
      let bestX = 0, bestY = 0, bestR = 0, bestAngle = 0;
      const minDistance = RADAR_R * 0.35;

      for (let attempt = 0; attempt < 50; attempt++) {
        // Radius between 0.26 and 0.86 of RADAR_R (well clear of center beacon and perimeter)
        const rRatio = 0.26 + Math.random() * 0.60;
        const r = rRatio * RADAR_R;
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        let valid = true;
        for (let j = 0; j < targets.length; j++) {
          const other = targets[j];
          if (other.index !== t.index && other.state !== 'IDLE') {
            const d = Math.hypot(x - other.x, y - other.y);
            if (d < minDistance) {
              valid = false;
              break;
            }
          }
        }

        if (valid || attempt === 49) {
          bestX = x;
          bestY = y;
          bestR = r;
          bestAngle = angle;
          break;
        }
      }

      t.r = bestR;
      t.angle = bestAngle;
      t.x = bestX;
      t.y = bestY;

      t.dot.position.set(t.x, t.y, 0);
      t.reticle.position.set(t.x, t.y, 0);

      // Random palette selection from Energy Orb colors
      const chosenCol = targetPalette[Math.floor(Math.random() * targetPalette.length)];
      t.col.copy(chosenCol);
      t.dotMat.color.copy(chosenCol);
      t.reticle.material.color.copy(chosenCol);

      t.hasReticle = Math.random() > 0.35;
      t.reticle.visible = t.hasReticle;

      t.intensity = 0.0;
      t.dotMat.opacity = 0.0;
      t.reticle.material.opacity = 0.0;
      t.state = 'ARMED';
      t.fadeSpeed = 0.26 + Math.random() * 0.10; // ~3.0 - 3.8s slow fade
    }

    // Initialize targets with staggered states for dynamic 1-3 random appearance from the first second
    spawnTarget(targets[0]);
    targets[0].state = 'ACTIVE';
    targets[0].intensity = 0.75;
    targets[0].dotMat.opacity = 0.75;

    spawnTarget(targets[1]);
    // Target 1 waits in ARMED state to be discovered by the radar beam

    // Target 2 starts in IDLE cooldown (1.4s) before arming at a new random location

    // =========================================================================
    // LAYER 6 (Z = 0.11): CENTRAL TRACKING BEACON (Steady, zero pulse waves)
    // =========================================================================
    const centerGroup = new THREE.Group();
    centerGroup.position.z = 0.11;
    holoGroup.add(centerGroup);

    // Steady Core beacon point in Pale Lime
    const beaconGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]);
    const beaconMat = new THREE.PointsMaterial({
      size: 0.075,
      map: glowTexture,
      color: cLimeBright,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const beaconPoint = new THREE.Points(beaconGeom, beaconMat);
    centerGroup.add(beaconPoint);

    // Inner core boundary ring in Emerald
    const coreRingGeom = createCircleLineGeometry(RADAR_R * 0.12, 32);
    const coreRingMat = new THREE.LineBasicMaterial({
      color: cLimeEmerald,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coreRing = new THREE.LineLoop(coreRingGeom, coreRingMat);
    centerGroup.add(coreRing);

    // =========================================================================
    // INTERACTIVE CONTROLS (Hover 3D Perspective Tilt & Click Ping)
    // =========================================================================
    // When the mouse is not hovering, tilt remains 0.0 so it is a perfect circle.
    // When the user hovers, it dynamically tilts in 3D perspective toward the cursor.
    let isHovering = false;
    let targetTiltX = 0.0;
    let targetTiltY = 0.0;
    let currentTiltX = 0.0;
    let currentTiltY = 0.0;
    let targetPosY = 0.0;
    let currentPosY = 0.0;
    let speedMult = 1.0;
    let targetSpeedMult = 1.0;
    let clickShockwave = 0.0;

    function handlePointer(e) {
      if (!isHovering) return;

      const bcr = container.getBoundingClientRect();
      const centerX = bcr.left + bcr.width * 0.5;
      const centerY = bcr.top + bcr.height * 0.5;

      const dx = (e.clientX - centerX) / (bcr.width * 0.5);
      const dy = (e.clientY - centerY) / (bcr.height * 0.5);

      // Clamp within normal bounds
      const clampedX = Math.max(-1.4, Math.min(1.4, dx));
      const clampedY = Math.max(-1.4, Math.min(1.4, dy));

      // Dynamic 3D tilt tracking while hovering (increased by 40% from 0.36 to 0.504)
      const tiltStrength = 0.504;
      targetTiltX = -clampedY * tiltStrength; // 3D tilt up/down
      targetTiltY = clampedX * tiltStrength;  // 3D tilt left/right
      targetSpeedMult = 1.6;
    }

    container.addEventListener('pointerenter', (e) => {
      isHovering = true;
      handlePointer(e);
    });

    container.addEventListener('pointermove', handlePointer, { passive: true });

    container.addEventListener('pointerleave', () => {
      isHovering = false;
      targetSpeedMult = 1.0;
      // Return to 0 tilt: 100% perfect circle shape for the viewer
      targetTiltX = 0.0;
      targetTiltY = 0.0;
      targetPosY = 0.0;
    });

    container.addEventListener('click', () => {
      clickShockwave = 1.0;
      // Flash all 3 active targets upon click
      targets.forEach(t => {
        t.intensity = 1.0;
      });
    });

    // Viewport Visibility & Performance Optimization
    let isVisible = true;
    let animId = null;
    let lastTime = performance.now();
    let sweepAngle = instanceIndex * 1.4;

    // Immediately render first frame so canvas is NEVER blank:
    try {
      renderer.render(scene, camera);
    } catch (e) {}

    // Start animation loop immediately
    animId = requestAnimationFrame(renderLoop);

    if (typeof window.IntersectionObserver !== 'undefined') {
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
      }, { threshold: 0, rootMargin: '300px 0px 300px 0px' });

      observer.observe(container);
    }

    window.addEventListener('resize', () => {
      const newRect = container.getBoundingClientRect();
      const newSize = Math.max(120, Math.min(200, newRect.width || 156));
      renderer.setSize(newSize, newSize);
      camera.aspect = 1.0;
      camera.updateProjectionMatrix();
    });

    // =========================================================================
    // MASTER 3D RENDER LOOP
    // =========================================================================
    function renderLoop(now) {
      if (!isVisible) {
        animId = null;
        return;
      }

      animId = requestAnimationFrame(renderLoop);

      const dt = Math.min((now - lastTime) * 0.001, 0.1);
      lastTime = now;

      // Speed interpolation
      speedMult += (targetSpeedMult - speedMult) * 0.08;

      // Sweep Beam Angle Rotation (2.2 rad/s base speed, ~2.8s per rev)
      const prevAngle = sweepAngle;
      sweepAngle = (sweepAngle + 2.2 * speedMult * dt) % (Math.PI * 2);
      sweepGroup.rotation.z = sweepAngle;

      // Subtle Counter-Rotation of Segmented Gyro Brackets
      gyroGroup.rotation.z += 0.0035 * speedMult;

      // Smooth 3D tilt damping (returns cleanly to 0.0 for a perfect circle when not hovering)
      currentTiltX += (targetTiltX - currentTiltX) * 0.08;
      currentTiltY += (targetTiltY - currentTiltY) * 0.08;
      if (!isHovering && Math.abs(currentTiltX) < 0.0005) currentTiltX = 0;
      if (!isHovering && Math.abs(currentTiltY) < 0.0005) currentTiltY = 0;
      holoGroup.rotation.x = currentTiltX;
      holoGroup.rotation.y = currentTiltY;

      // Gentle levitation when hovering; rests at center 0 when not hovering
      targetPosY = isHovering ? Math.sin(now * 0.002) * 0.025 : 0.0;
      currentPosY += (targetPosY - currentPosY) * 0.08;
      if (!isHovering && Math.abs(currentPosY) < 0.0005) currentPosY = 0;
      holoGroup.position.y = currentPosY;

      // Steady Central Beacon (Zero pulse waves or expanding rings)
      beaconMat.size = 0.075;

      if (clickShockwave > 0.001) {
        clickShockwave *= 0.94;
      } else {
        clickShockwave = 0.0;
      }

      // Target lifecycle & sweep discovery (strictly <= 3 targets, random number, random appearance, slow decay to 0)
      targets.forEach(t => {
        if (t.state === 'IDLE') {
          t.dotMat.opacity = 0.0;
          if (t.reticle) t.reticle.material.opacity = 0.0;
          t.cooldown -= dt;
          if (t.cooldown <= 0) {
            spawnTarget(t);
          }
          return;
        }

        if (t.state === 'ARMED') {
          let swept = false;
          if (sweepAngle >= prevAngle) {
            swept = (t.angle >= prevAngle && t.angle <= sweepAngle);
          } else {
            swept = (t.angle >= prevAngle || t.angle <= sweepAngle);
          }

          if (swept) {
            t.state = 'ACTIVE';
            t.intensity = 1.0; // Flash bright upon beam discovery
          } else {
            t.dotMat.opacity = 0.0;
            if (t.reticle) t.reticle.material.opacity = 0.0;
            return;
          }
        }

        if (t.state === 'ACTIVE') {
          // Slow, graceful decay down to 0 opacity (~3 seconds)
          t.intensity -= dt * t.fadeSpeed;

          if (t.intensity <= 0.001) {
            t.intensity = 0.0;
            t.dotMat.opacity = 0.0;
            if (t.reticle) t.reticle.material.opacity = 0.0;
            t.state = 'IDLE';
            t.cooldown = 0.8 + Math.random() * 2.2; // Randomized pause before respawning elsewhere
            return;
          }

          const val = Math.min(1.0, t.intensity);
          t.dotMat.opacity = val;
          t.dotMat.size = 0.055 + val * 0.040;

          if (t.reticle && t.hasReticle) {
            t.reticle.material.opacity = val * 0.90;
            const rScale = 1.0 + (1.0 - val) * 0.20;
            t.reticle.scale.set(rScale, rScale, 1.0);
          }
        }
      });

      renderer.render(scene, camera);
    }
  }

  // ---------------------------------------------------------------------------
  // Canvas 2D Fallback Engine (High-Fidelity Cybernetic Radar)
  // ---------------------------------------------------------------------------
  function start2DRadarFallback(canvas, container, instanceIndex) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 156, height = 156;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = container.getBoundingClientRect();
      width = Math.max(120, Math.min(200, rect.width || 156));
      height = width;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxR = width * 0.44;
    let sweepAngle = instanceIndex * 1.4;
    let prevAngle = sweepAngle;
    let lastTime = performance.now();
    let gyroAngle = 0;

    // Hover tilt
    let isHovering = false;
    let targetTiltX = 0, targetTiltY = 0;
    let curTiltX = 0, curTiltY = 0;

    function handlePointer(e) {
      if (!isHovering) return;
      const bcr = container.getBoundingClientRect();
      const dx = (e.clientX - (bcr.left + bcr.width * 0.5)) / (bcr.width * 0.5);
      const dy = (e.clientY - (bcr.top + bcr.height * 0.5)) / (bcr.height * 0.5);
      targetTiltX = -Math.max(-1.4, Math.min(1.4, dy)) * 0.504;
      targetTiltY = Math.max(-1.4, Math.min(1.4, dx)) * 0.504;
    }

    container.addEventListener('pointerenter', (e) => { isHovering = true; handlePointer(e); });
    container.addEventListener('pointermove', handlePointer, { passive: true });
    container.addEventListener('pointerleave', () => {
      isHovering = false;
      targetTiltX = 0;
      targetTiltY = 0;
    });

    // Exactly 3 Target Dots maximum, with independent random lifecycles and slow decay
    const targetColors = ['#d9f99d', '#4ade80', '#c6f36a', '#22c55e', '#a3e635'];
    const targets = [];
    for (let i = 0; i < 3; i++) {
      targets.push({
        index: i,
        r: 0,
        angle: 0,
        x: 0,
        y: 0,
        col: targetColors[i % targetColors.length],
        intensity: 0.0,
        state: 'IDLE',
        cooldown: i * 0.7,
        fadeSpeed: 0.28 + Math.random() * 0.10
      });
    }

    function spawn2DTarget(t) {
      const minDist = maxR * 0.35;
      let bestX = 0, bestY = 0, bestR = 0, bestA = 0;
      for (let attempt = 0; attempt < 40; attempt++) {
        const r = (0.25 + Math.random() * 0.60) * maxR;
        const a = Math.random() * Math.PI * 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        let ok = true;
        for (let other of targets) {
          if (other.index !== t.index && other.state !== 'IDLE') {
            if (Math.hypot(x - other.x, y - other.y) < minDist) { ok = false; break; }
          }
        }
        if (ok || attempt === 39) {
          bestX = x; bestY = y; bestR = r; bestA = a;
          break;
        }
      }
      t.r = bestR;
      t.angle = bestA;
      t.x = bestX;
      t.y = bestY;
      t.col = targetColors[Math.floor(Math.random() * targetColors.length)];
      t.intensity = 0.0;
      t.state = 'ARMED';
      t.fadeSpeed = 0.26 + Math.random() * 0.12;
    }

    spawn2DTarget(targets[0]);
    targets[0].state = 'ACTIVE';
    targets[0].intensity = 0.75;
    spawn2DTarget(targets[1]);

    // Sonar Ripple
    let sonarPhase = 0;

    function render(now) {
      requestAnimationFrame(render);
      const dt = Math.min((now - lastTime) * 0.001, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Damped tilt
      curTiltX += (targetTiltX - curTiltX) * 0.08;
      curTiltY += (targetTiltY - curTiltY) * 0.08;
      if (!isHovering && Math.abs(curTiltX) < 0.001) curTiltX = 0;
      if (!isHovering && Math.abs(curTiltY) < 0.001) curTiltY = 0;

      // Subtle 2D isometric warp
      ctx.translate(cx, cy);
      ctx.scale(1.0 + curTiltY * 0.12, 1.0 - curTiltX * 0.18);
      ctx.translate(-cx, -cy);

      prevAngle = sweepAngle;
      sweepAngle = (sweepAngle + (isHovering ? 3.5 : 2.2) * dt) % (Math.PI * 2);

      gyroAngle += 0.0035;

      // 1. Concentric Range Rings in Energy Orb Harmony
      const ringStyles = [
        { col: 'rgba(163, 230, 53, 0.50)', w: 0.9 },
        { col: 'rgba(34, 197, 94, 0.45)', w: 0.9 },
        { col: 'rgba(74, 222, 128, 0.55)', w: 0.9 },
        { col: 'rgba(198, 243, 106, 0.88)', w: 1.5 }
      ];
      [0.26, 0.50, 0.74, 1.0].forEach((rRatio, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * rRatio, 0, Math.PI * 2);
        ctx.strokeStyle = ringStyles[idx].col;
        ctx.lineWidth = ringStyles[idx].w;
        ctx.stroke();
      });

      // 2. Cardinal Crosshairs in Spring Mint
      const gap = maxR * 0.12;
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.58)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx - gap, cy);
      ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy - gap);
      ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // 3. Azimuth Ticks in Energy Orb Palette
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const len = (i % 12 === 0) ? 6 : ((i % 4 === 0) ? 4 : 2);
        const r1 = maxR * 0.98;
        const r2 = r1 - len;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.strokeStyle = (i % 12 === 0) ? 'rgba(217, 249, 157, 1.0)' : ((i % 4 === 0) ? 'rgba(198, 243, 106, 0.80)' : 'rgba(74, 222, 128, 0.50)');
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      // 4. Segmented Gyro Brackets (Emerald & Neon Lime)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(gyroAngle);
      ctx.strokeStyle = 'rgba(34, 197, 94, 1.0)'; // Emerald
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, maxR * 1.05, Math.PI * 0.55, Math.PI * 1.15);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(198, 243, 106, 1.0)'; // Neon Lime
      ctx.beginPath();
      ctx.arc(0, 0, maxR * 1.05, Math.PI * 1.75, Math.PI * 2.35);
      ctx.stroke();
      ctx.restore();

      // 5. Sweeping Phosphor Wedge in Energy Orb Multi-Tone Gradient
      const trailAngle = 0.75;
      const wedgeSlices = 28;
      for (let s = 0; s < wedgeSlices; s++) {
        const f1 = s / wedgeSlices;
        const f2 = (s + 1) / wedgeSlices;
        const a1 = sweepAngle - trailAngle * (1 - f1);
        const a2 = sweepAngle - trailAngle * (1 - f2);
        const alpha = Math.pow(f2, 1.95) * 0.35;

        let colStr;
        if (f2 < 0.40) {
          colStr = `rgba(34, 197, 94, ${alpha})`; // Emerald
        } else if (f2 < 0.80) {
          colStr = `rgba(74, 222, 128, ${alpha})`; // Spring Mint
        } else {
          colStr = `rgba(198, 243, 106, ${alpha})`; // Signature Neon Lime
        }

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, a1, a2);
        ctx.closePath();
        ctx.fillStyle = colStr;
        ctx.fill();
      }

      // 6. Leading Beam Line & Tip in Pale Radiant Lime
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const bx = cx + Math.cos(sweepAngle) * maxR;
      const by = cy + Math.sin(sweepAngle) * maxR;
      ctx.lineTo(bx, by);
      ctx.strokeStyle = 'rgba(217, 249, 157, 0.80)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(bx, by, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = '#d9f99d';
      ctx.fill();

      // 7. Active Target Dots (Strictly <= 3 objects, random appearance, slow decay down to 0)
      targets.forEach(t => {
        if (t.state === 'IDLE') {
          t.cooldown -= dt;
          if (t.cooldown <= 0) {
            spawn2DTarget(t);
          }
          return;
        }

        if (t.state === 'ARMED') {
          let swept = (sweepAngle >= prevAngle) ? (t.angle >= prevAngle && t.angle <= sweepAngle) : (t.angle >= prevAngle || t.angle <= sweepAngle);
          if (swept) {
            t.state = 'ACTIVE';
            t.intensity = 1.0;
          } else {
            return;
          }
        }

        if (t.state === 'ACTIVE') {
          t.intensity -= dt * t.fadeSpeed;
          if (t.intensity <= 0.001) {
            t.intensity = 0.0;
            t.state = 'IDLE';
            t.cooldown = 0.8 + Math.random() * 2.2;
            return;
          }

          const alpha = t.intensity;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = t.col;
          ctx.shadowColor = t.col;
          ctx.shadowBlur = 8;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
          ctx.strokeStyle = t.col;
          ctx.lineWidth = 1.0;
          ctx.stroke();
          ctx.restore();
        }
      });

      // Center Tracking Beacon (Steady, zero pulsating waves)
      ctx.beginPath();
      ctx.arc(cx, cy, 3.0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#c6f36a';
      ctx.shadowBlur = 10;
      ctx.fill();

      ctx.restore();
    }

    // Render immediate initial frame
    render(performance.now());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
