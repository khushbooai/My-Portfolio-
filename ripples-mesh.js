/**
 * Ripples Mesh Flow — Interactive Radial Wave Particle Canvas
 * Moving or hovering the mouse across the mesh triggers propagating waves
 */
(function initRipplesMesh() {
  function start() {
    const canvas = document.getElementById('ripplesMeshCanvas');
    const container = document.getElementById('ripplesMeshWrapper');
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animId = null;
    let isVisible = false;
    let startTime = performance.now();

    // Propagating wave packets triggered by mouse movement
    const wavePackets = [];
    const MAX_PACKETS = 8;

    function triggerPropagatingWave(r, theta, strength = 1.0) {
      if (wavePackets.length >= MAX_PACKETS) {
        wavePackets.shift();
      }
      wavePackets.push({
        startR: r,
        startTheta: theta,
        birthTime: (performance.now() - startTime) * 0.001,
        speed: 130,       // Wave propagation speed in pixels/sec
        duration: 0.85,   // Tighter duration for 60% reduced affected area
        wavelength: 20,   // Compact localized wave cycle length
        strength: strength
      });
    }

    // Mouse tracking
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let hasEntered = false;

    container.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const cx = width * 0.5;
      const cy = height * 0.5;

      const dx = px - cx;
      const dy = py - cy;
      const mouseR = Math.hypot(dx, dy);
      const mouseTheta = Math.atan2(dy, dx);

      const now = performance.now();
      const moveDist = Math.hypot(px - lastX, py - lastY);

      // Trigger propagating wave when mouse moves across the mesh
      if (moveDist > 7 || (now - lastTime > 75 && moveDist > 2)) {
        const minRadius = width * 0.11;
        const maxRadius = width * 0.44;
        const clampedR = Math.max(minRadius, Math.min(maxRadius, mouseR));
        const strength = Math.min(1.4, 0.75 + moveDist * 0.035);

        triggerPropagatingWave(clampedR, mouseTheta, strength);

        lastX = px;
        lastY = py;
        lastTime = now;
      }
    }, { passive: true });

    container.addEventListener('pointerenter', (e) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      lastX = px;
      lastY = py;
      lastTime = performance.now();
      hasEntered = true;

      const dx = px - width * 0.5;
      const dy = py - height * 0.5;
      const mouseR = Math.hypot(dx, dy);
      const mouseTheta = Math.atan2(dy, dx);
      const minRadius = width * 0.11;
      const maxRadius = width * 0.44;
      const clampedR = Math.max(minRadius, Math.min(maxRadius, mouseR));

      triggerPropagatingWave(clampedR, mouseTheta, 1.2);
    }, { passive: true });

    container.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const dx = px - width * 0.5;
      const dy = py - height * 0.5;
      const mouseR = Math.hypot(dx, dy);
      const mouseTheta = Math.atan2(dy, dx);
      const minRadius = width * 0.11;
      const maxRadius = width * 0.44;
      const clampedR = Math.max(minRadius, Math.min(maxRadius, mouseR));

      // Extra vivid propagating wave on click/tap
      triggerPropagatingWave(clampedR, mouseTheta, 1.8);
    });

    function resize() {
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width || 300, 320);
      width = size;
      height = size;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    }

    // Polar Grid Setup: 74 radial rays, 46 concentric rings
    const SPOKES = 74;
    const RINGS = 46;
    const TOTAL = SPOKES * RINGS;

    const particles = new Float32Array(TOTAL * 3);
    let ptr = 0;
    for (let s = 0; s < SPOKES; s++) {
      const angle = (s / SPOKES) * Math.PI * 2;
      for (let r = 0; r < RINGS; r++) {
        const u = r / (RINGS - 1);
        particles[ptr++] = u;
        particles[ptr++] = angle;
        particles[ptr++] = s;
      }
    }

    function render(now) {
      if (!isVisible) return;

      const elapsed = (now - startTime) * 0.001;

      // Clean up finished wave packets
      for (let w = wavePackets.length - 1; w >= 0; w--) {
        const age = elapsed - wavePackets[w].birthTime;
        if (age >= wavePackets[w].duration) {
          wavePackets.splice(w, 1);
        }
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const minRadius = width * 0.11;
      const maxRadius = width * 0.44;
      const radiusSpan = maxRadius - minRadius;

      for (let i = 0; i < TOTAL; i++) {
        const baseIdx = i * 3;
        const u = particles[baseIdx];
        const baseAngle = particles[baseIdx + 1];

        // Base radius along the spoke
        const baseR = minRadius + u * radiusSpan;

        // Base ambient ripple wave physics
        const ambientWave1 = Math.sin(baseR * 0.054 - elapsed * 2.1 + baseAngle * 3.0);
        const ambientWave2 = Math.cos(baseR * 0.038 - elapsed * 1.5 - baseAngle * 2.0);
        const ambientWave3 = Math.sin(baseR * 0.082 - elapsed * 2.8 + baseAngle * 5.0) * 0.45;
        const waveAmp = Math.pow(u, 0.72);
        let totalH = (ambientWave1 * 0.65 + ambientWave2 * 0.35 + ambientWave3) * waveAmp;

        // Propagating waves triggered by mouse movement
        let mouseWaveIntensity = 0;
        for (let w = 0; w < wavePackets.length; w++) {
          const wp = wavePackets[w];
          const age = elapsed - wp.birthTime;
          if (age <= 0 || age >= wp.duration) continue;

          // Propagating wave front radius
          const currentR = wp.startR + age * wp.speed;
          const distFromFront = baseR - currentR;

          // Reduced affected area by 60% (cutoff: 22px instead of 36px, angularSpread scaled by ~0.63)
          if (Math.abs(distFromFront) < 22) {
            const angularSpread = 0.55 + age * 0.68;
            let dTheta = Math.abs(baseAngle - wp.startTheta);
            if (dTheta > Math.PI) dTheta = Math.PI * 2 - dTheta;

            if (dTheta < angularSpread) {
              const decay = Math.pow(1 - age / wp.duration, 1.8) * wp.strength;
              const spatialProfile = Math.exp(-Math.pow(distFromFront / 9.5, 2));
              const angularProfile = Math.exp(-Math.pow(dTheta / (angularSpread * 0.62), 2));
              const waveForm = Math.sin(distFromFront * (Math.PI * 2 / wp.wavelength));

              const pulse = waveForm * spatialProfile * angularProfile * decay;
              totalH += pulse * 1.35 * waveAmp;
              mouseWaveIntensity += Math.abs(pulse);
            }
          }
        }

        // Smooth radial & angular displacement maintaining circular integrity
        const dispAngle = baseAngle + totalH * 0.038;
        const dispR = baseR + totalH * 3.6;

        const px = cx + dispR * Math.cos(dispAngle);
        const py = cy + dispR * Math.sin(dispAngle);

        // Dot size and luminescence: crests illuminate naturally
        const crestFactor = Math.max(-0.5, Math.min(1.4, totalH * 0.55 + mouseWaveIntensity * 0.4));
        const dotRadius = Math.max(0.65, 0.85 + u * 0.85 + crestFactor * 0.65);
        const alpha = Math.max(0.18, Math.min(0.98, 0.38 + u * 0.28 + crestFactor * 0.35));

        // Ivory / cream tone (#f4f1e6 on crests, #b0ab9b in troughs)
        const rVal = Math.round(180 + crestFactor * 65);
        const gVal = Math.round(175 + crestFactor * 65);
        const bVal = Math.round(160 + crestFactor * 65);

        ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!isVisible) {
            isVisible = true;
            animId = requestAnimationFrame(render);
          }
        } else {
          isVisible = false;
          if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
          }
        }
      });
    }, { threshold: 0.05 });

    observer.observe(container);

    window.addEventListener('resize', () => {
      resize();
    }, { passive: true });

    resize();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
