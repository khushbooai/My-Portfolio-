/**
 * Photorealistic 3D Neural Brain Engine
 * 
 * - Seamless 360° rotational animation with equal-power trigonometric sub-frame blending
 * - Uninterrupted continuous cinematic rotation (mouse hover does not disrupt movement)
 * - Interactive multi-stage lime neural glow & internal synaptic bloom on hover
 * - High-DPI crisp rendering on transparent canvas
 */

(function () {
  function init() {
    const canvas = document.getElementById('neuralBrainCanvas');
    if (!canvas) {
      setTimeout(init, 50);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const TOTAL_FRAMES = 41;
    const ASPECT_RATIO = 1240 / 698;
    const images = [];
    let loadedCount = 0;
    let isReady = false;

    // Load bundled base64 frames (synchronous, instant load)
    const framesData = window.BRAIN_FRAMES_DATA || [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= 3 && !isReady) {
          isReady = true;
          requestAnimationFrame(renderLoop);
        }
      };
      img.src = framesData[i];
      images.push(img);
    }

    // Animation state
    let currentFrame = 0.0;
    // Rotation speed adjusted: +10ms per frame turnover (~134ms/frame -> 7.46 frames/sec)
    const SPEED = 7.46;
    let lastTime = 0;

    // Hover glow state (only enhances visual glow, never alters rotation or position)
    let isHovered = false;
    let hoverGlow = 0.0;

    canvas.addEventListener('mouseenter', () => { isHovered = true; });
    canvas.addEventListener('mouseleave', () => { isHovered = false; });
    canvas.addEventListener('touchstart', () => { isHovered = true; }, { passive: true });
    canvas.addEventListener('touchend', () => { isHovered = false; });
    canvas.addEventListener('touchcancel', () => { isHovered = false; });

    // Main 60 FPS Render Loop
    function renderLoop(timestamp) {
      requestAnimationFrame(renderLoop);

      if (!lastTime) lastTime = timestamp;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.06);
      lastTime = timestamp;

      // Uninterrupted, perfectly steady rotation
      currentFrame = (currentFrame + SPEED * dt) % TOTAL_FRAMES;

      // Smooth hover glow transition
      hoverGlow += ((isHovered ? 1.0 : 0.0) - hoverGlow) * 0.08;

      // Handle High-DPI canvas dimensions
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Organic gentle vertical levitation
      const floatOffset = Math.sin(timestamp * 0.0018) * 5;

      // Compute display bounds to preserve aspect ratio
      let drawW = rect.width;
      let drawH = drawW / ASPECT_RATIO;
      if (drawH > rect.height) {
        drawH = rect.height;
        drawW = drawH * ASPECT_RATIO;
      }

      const drawX = (rect.width - drawW) / 2;
      const drawY = (rect.height - drawH) / 2 + floatOffset;

      // Mathematical Equal-Power Cross-Fading (Eliminates frame jump/stutter completely)
      let idx = ((currentFrame % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
      const idxA = Math.floor(idx);
      const idxB = (idxA + 1) % TOTAL_FRAMES;
      const blend = idx - idxA;

      // Equal power trigonometric curve: cos^2(x) + sin^2(x) = 1 (constant energy & seamless continuity)
      const angle = blend * Math.PI * 0.5;
      const alphaA = Math.cos(angle);
      const alphaB = Math.sin(angle);

      const imgA = images[idxA];
      const imgB = images[idxB];

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Draw base fading-out frame
      if (imgA && imgA.complete && imgA.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = alphaA;
        ctx.drawImage(imgA, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      // 2. Draw next fading-in frame
      if (imgB && imgB.complete && imgB.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = alphaB;
        ctx.drawImage(imgB, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      // 3. Interactive internal synaptic bloom on hover (softened)
      if (hoverGlow > 0.01 && imgA && imgA.complete) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = hoverGlow * 0.10;
        ctx.drawImage(imgA, drawX, drawY, drawW, drawH);
        if (imgB && imgB.complete) {
          ctx.drawImage(imgB, drawX, drawY, drawW, drawH);
        }
        ctx.restore();
      }

      ctx.restore();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
