// JS for X + Y image parallax
(() => {
  // Respect reduced motion & touch devices
  if (
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    matchMedia('(pointer: coarse)').matches
  ) {
    return;
  }

  document.querySelectorAll('.header__hero').forEach((el) => {
    const img = el.querySelector('.header__hero-img');
    if (!img) return;

    const strength = parseFloat(el.dataset.parallaxStrength) || 30;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = null;

    const lerp = (a, b, t) => a + (b - a) * t;

    function tick() {
      currentX = lerp(currentX, targetX, 0.12);
      currentY = lerp(currentY, targetY, 0.12);

      img.style.transform = `
        translate(
          calc(-50% + ${currentX}px),
          calc(-50% + ${currentY}px)
        )
      `;

      if (
        Math.abs(targetX - currentX) > 0.1 ||
        Math.abs(targetY - currentY) > 0.1
      ) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();

      const relX = (e.clientX - r.left) / r.width;
      const relY = (e.clientY - r.top) / r.height;

      // normalize to -1 → 1
      const nx = (relX - 0.5) * 2;
      const ny = (relY - 0.5) * 2;

      targetX = nx * strength;
      targetY = -ny * strength; // invert Y for natural feel

      if (!rafId) tick();
    });

    el.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
      if (!rafId) tick();
    });
  });
})();
