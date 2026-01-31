// JS just for background parallax effect
(() => {
  if (matchMedia('(pointer: coarse)').matches) return;
  if (!matchMedia('(hover: hover)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.header__hero').forEach((el) => {
    const img = el.querySelector('.header__hero-img');
    if (!img) return;

    const strength = parseFloat(el.dataset.parallaxStrength) || 30;
    let targetY = 0;
    let currentY = 0;
    let rafId = null;

    const lerp = (a, b, t) => a + (b - a) * t;

    function tick() {
      currentY = lerp(currentY, targetY, 0.12);
      img.style.transform = `translateY(${currentY}px)`;
      // img.style.transform = `translate(-50%, calc(-50% + ${currentY}px))`;

      if (Math.abs(targetY - currentY) > 0.1) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const relY = (e.clientY - r.top) / r.height;
      const n = (relY - 0.5) * 2;

      targetY = -n * strength;
      if (!rafId) tick();
    });

    el.addEventListener('pointerleave', () => {
      targetY = 0;
      if (!rafId) tick();
    });
  });
})();
