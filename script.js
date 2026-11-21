// Navigation menu toggle
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Toggle navigation');
    menuToggle.textContent = isOpen ? '×' : '☰';
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Toggle navigation');
      menuToggle.textContent = '☰';
    });
  });
}

// Interactive 3D Holographic Tilt for Hero Art (Desktop with mouse)
const heroArt = document.querySelector('.hero-art');
if (heroArt && window.matchMedia('(pointer: fine)').matches) {
  heroArt.addEventListener('mousemove', (e) => {
    const rect = heroArt.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const tiltX = -(y * 6).toFixed(2);
    const tiltY = (x * 6).toFixed(2);
    heroArt.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  });

  heroArt.addEventListener('mouseleave', () => {
    heroArt.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    heroArt.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
    setTimeout(() => {
      heroArt.style.transition = '';
    }, 600);
  });

  heroArt.addEventListener('mouseenter', () => {
    heroArt.style.transition = 'none';
  });
}

// Research Bar Fill Animation on Scroll
const researchBars = document.querySelector('.research-bars');
if (researchBars) {
  researchBars.classList.add('js-ready');
  if ('IntersectionObserver' in window) {
    const barObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          researchBars.classList.add('active');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    barObserver.observe(researchBars);
  } else {
    researchBars.classList.add('active');
  }
}

// Minimalist Scroll Reveal System
const revealTargets = document.querySelectorAll('.section, .project-card, .mini-project, .timeline-item, .facts-grid > div');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealTargets.forEach(el => {
    el.classList.add('scroll-reveal');
    revealObserver.observe(el);
  });
}

// Scientific Telemetry Counter for Metrics
const statElements = [
  ...document.querySelectorAll('.facts-grid strong'),
  ...document.querySelectorAll('.research-stat strong')
];

function animateCount(el) {
  const originalText = el.textContent.trim();
  let target = 0;
  let decimals = 0;
  let suffix = '';
  let prefix = '';

  if (originalText.includes('/')) {
    const parts = originalText.split('/');
    target = parseFloat(parts[0]);
    decimals = 2;
    suffix = '/' + parts[1];
  } else if (originalText.endsWith('+')) {
    target = parseFloat(originalText.replace('+', ''));
    suffix = '+';
  } else {
    target = parseFloat(originalText);
    if (isNaN(target)) return;
  }

  const duration = 1300;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Smooth ease-out exponential curve
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = (target * ease).toFixed(decimals);
    el.textContent = `${prefix}${current}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = originalText;
    }
  }
  requestAnimationFrame(update);
}

if ('IntersectionObserver' in window) {
  const statObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  statElements.forEach(el => statObserver.observe(el));
}

// Interactive 3D Parallax Tilt for Brain Showcase (Desktop)
const brainShowcase = document.querySelector('.brain-showcase');
if (brainShowcase && window.matchMedia('(pointer: fine)').matches) {
  const container = brainShowcase.querySelector('.brain-anim-container');
  if (container) {
    brainShowcase.addEventListener('mousemove', (e) => {
      const rect = brainShowcase.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const tiltX = -(y * 6).toFixed(2);
      const tiltY = (x * 6).toFixed(2);
      container.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });

    brainShowcase.addEventListener('mouseleave', () => {
      container.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      container.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
      setTimeout(() => {
        container.style.transition = '';
      }, 600);
    });

    brainShowcase.addEventListener('mouseenter', () => {
      container.style.transition = 'none';
    });
  }
}



