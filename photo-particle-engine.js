/**
 * Khushboo Singh Portfolio — 3D Particle Wave & Photo Transition Engine
 * Replicating the WebGL point cloud morphing architecture from Sarthak Sharma's portfolio
 * Fully compatible with local file execution (file:///) via pre-extracted particle buffer data
 */

(function initPhotoParticleEngine() {
  let attempts = 0;
  const maxAttempts = 100;

  function tryInit() {
    const canvas = document.getElementById('heroSignalCanvas');
    const fallback = document.getElementById('artifactFallback');
    const heroSection = document.getElementById('home');
    const hasThree = typeof window.THREE !== 'undefined';

    // If Three.js or DOM elements aren't ready yet, poll every 40ms
    if (!canvas || !fallback || !hasThree) {
      if (attempts++ < maxAttempts) {
        setTimeout(tryInit, 40);
      }
      return;
    }

    startEngine(canvas, fallback, heroSection);
  }

  function startEngine(canvas, fallback, heroSection) {
    const progBar = document.querySelector('.scroll-progress');

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 6);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
    } catch (e) {
      console.warn('WebGL initialization failed, falling back to static visual:', e);
      return;
    }

    // 2. Vertex & Fragment Shaders
    const vertexShader = `
      attribute vec3 aColor;
      attribute float aSeed;
      uniform float uTime;
      uniform float uProgress;
      uniform float uScale;
      uniform float uDpr;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float p = smoothstep(0.02, 0.85, uProgress);
        
        // Morph target: 3 harmonic sinusoidal frequency lines across the screen
        vec3 target = vec3(
          (aSeed - 0.5) * 2.6,
          sin(aSeed * 25.1327) * 0.055 + (floor(position.x * 4.0 + 2.0) - 2.0) * 0.18,
          sin(aSeed * 18.0) * 0.1
        );
        vec3 pos = mix(position, target, p);

        // Gentle organic breathing without harsh edge displacement lines
        pos.x += sin(uTime * 0.22 + aSeed * 25.0) * 0.0025;
        pos.z += sin(aSeed * 64.0 + uTime * 0.22) * 0.012;

        vec4 mv = modelViewMatrix * vec4(pos * uScale, 1.0);
        gl_Position = projectionMatrix * mv;

        // Controlled point size: full, lush hair and scalp coverage
        float lum = dot(aColor, vec3(0.299, 0.587, 0.114));
        float scalpBoost = smoothstep(0.30, 0.48, position.y) * 0.35;
        gl_PointSize = (1.30 + min(lum + scalpBoost, 0.6) * 0.75) * uDpr;

        // Color transition: ensure warm brunette/scalp tones stay distinctly visible against #111210
        vec3 col = aColor;
        if (position.y > 0.30) {
          col = max(col, vec3(0.24, 0.18, 0.12));
        }
        vColor = mix(col, vec3(0.776, 0.953, 0.416), p * 0.55);

        // Full visibility of full head, hair crest, shoulders, and body without cropping
        // Subtle soft feathering only at the very bottom lower torso edge
        float bottomFade = smoothstep(-0.52, -0.44, position.y);
        vAlpha = (1.0 - p * 0.35) * bottomFade;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.2, d) * vAlpha;
        if (alpha < 0.02) discard;

        // Soften any oversaturated yellow/lime rim glare on outer perimeter
        vec3 c = vColor;
        float neonExcess = max(0.0, c.g - c.r * 0.92);
        c.g -= neonExcess * 0.75;

        gl_FragColor = vec4(c, alpha);
      }
    `;

    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uScale: { value: 1.0 },
      uDpr: { value: renderer.getPixelRatio() }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: uniforms
    });

    let pointsMesh = null;
    let isVisible = true;

    // 3. Point cloud initialization — Priority: Pre-extracted buffer data (file:/// offline safe)
    function buildMeshFromData(pData) {
      if (!pData || !pData.positions) return false;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(pData.positions, 3));
      geometry.setAttribute('aColor', new THREE.BufferAttribute(pData.colors, 3));
      geometry.setAttribute('aSeed', new THREE.BufferAttribute(pData.seeds, 1));

      pointsMesh = new THREE.Points(geometry, material);
      scene.add(pointsMesh);

      fallback.classList.add('webgl-active');
      updateAlignment();
      return true;
    }

    if (window.KHUSHBOO_PARTICLES && buildMeshFromData(window.KHUSHBOO_PARTICLES)) {
      // Successfully loaded pre-sampled 74k particles instantly
    } else {
      // Dynamic fallback attempt: image sampling (for servers where script wasn't loaded)
      const img = new Image();
      if (window.location.protocol !== 'file:') {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        try {
          const isMobile = window.innerWidth < 768;
          const w = isMobile ? 240 : 360;
          const h = Math.round((1024 / 953) * w);

          const offCanvas = document.createElement('canvas');
          offCanvas.width = w;
          offCanvas.height = h;
          const ctx = offCanvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;

          const positions = [];
          const colors = [];
          const seeds = [];

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const r = data[idx] / 255;
              const g = data[idx + 1] / 255;
              const b = data[idx + 2] / 255;
              const a = data[idx + 3] / 255;
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;

              if (x < 12 || x > w - 12 || y < 6) continue;
              if (lum < 0.035 || a < 0.08) continue;

              positions.push((x / w - 0.5) * 0.93, 0.5 - y / h, 0.025 * lum);
              colors.push(r, g, b);
              seeds.push(((127 * x + 311 * y) % 997) / 997);
            }
          }

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
          geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));

          pointsMesh = new THREE.Points(geometry, material);
          scene.add(pointsMesh);

          fallback.classList.add('webgl-active');
          updateAlignment();
        } catch (err) {
          console.warn('Canvas dynamic sampling prevented by security policy, falling back to CSS visual:', err);
        }
      };
      img.src = 'images/khushboo-signal.png';
    }

    // 4. Alignment calculation: matching Sarthak Sharma layout with 0.65cm additional vertical spacing and 3cm leftward shift
    function updateAlignment() {
      if (!pointsMesh) return;
      const isMobile = window.innerWidth < 820;
      const vHeight = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
      // 0.65cm in screen pixels = ~24.57px converted to 3D world space
      const shift065cm = (24.57 / window.innerHeight) * vHeight;
      // 3cm in screen pixels = ~113.386px converted to 3D world space
      const shift3cm = (113.386 / window.innerHeight) * vHeight;

      if (isMobile) {
        uniforms.uScale.value = 2.1;
        pointsMesh.position.set(-shift3cm, 0.02 * vHeight - shift065cm, 0);
      } else {
        // Desktop: sized and shifted left by 3cm without changing vertical Y position
        const targetHeightRatio = Math.min(0.74, 590 / window.innerHeight);
        uniforms.uScale.value = targetHeightRatio * vHeight;
        pointsMesh.position.x = -shift3cm;
        pointsMesh.position.y = -0.015 * vHeight - shift065cm;
      }
    }

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uDpr.value = renderer.getPixelRatio();
      updateAlignment();
    }, { passive: true });

    // 5. Interactive pointer tilt
    let pointerX = 0, pointerY = 0;
    window.addEventListener('pointermove', (e) => {
      pointerX = (e.clientX / window.innerWidth) - 0.5;
      pointerY = (e.clientY / window.innerHeight) - 0.5;
    }, { passive: true });

    // 6. Scroll interaction: bidirectional smooth morphing
    let targetProgress = 0;
    function handleScroll() {
      const scrollY = window.scrollY || window.pageYOffset;
      const heroHeight = heroSection ? heroSection.offsetHeight : window.innerHeight;
      
      // Progress from 0 (top) to 1.0 (scrolled past hero)
      targetProgress = Math.max(0, Math.min(1, scrollY / (heroHeight * 0.85)));

      // Global scroll progress indicator bar
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPct = totalScroll > 0 ? scrollY / totalScroll : 0;
      if (progBar) {
        progBar.style.transform = `scaleX(${scrollPct})`;
      }

      // Smoothly fade fallback image if WebGL particle mesh isn't running
      if (fallback && !pointsMesh) {
        fallback.style.transform = `translateX(-50%) translateY(${targetProgress * 40}px) scale(${1 - targetProgress * 0.12})`;
        fallback.style.opacity = (0.85 * (1.0 - targetProgress * 1.1)).toFixed(3);
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // 7. Observer to pause WebGL when hero is far offscreen
    if ('IntersectionObserver' in window && heroSection) {
      const observer = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      observer.observe(heroSection);
    }

    // 8. Animation Loop
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);

      if (!isVisible) return; // Pause rendering when offscreen

      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      uniforms.uTime.value = time;
      // Spring lerp damping for smooth bidirectional scroll progression
      uniforms.uProgress.value += (targetProgress - uniforms.uProgress.value) * 0.08;

      if (pointsMesh) {
        // Perspective interactive 3D tilt
        pointsMesh.rotation.y += (pointerX * 0.04 - pointsMesh.rotation.y) * 0.06;
        pointsMesh.rotation.x += (-pointerY * 0.03 - pointsMesh.rotation.x) * 0.06;
      }

      renderer.render(scene, camera);
    }
    animate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
