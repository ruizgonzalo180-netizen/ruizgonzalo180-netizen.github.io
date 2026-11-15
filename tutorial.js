(() => {
  'use strict';

  const root = document.getElementById('copy-demo');
  if (!root) return;
  const scenes = [...root.querySelectorAll('[data-demo-scene]')];
  const steps = [...root.querySelectorAll('[data-demo-step]')];
  const play = document.getElementById('demo-play');
  const captionTitle = root.querySelector('.demo-caption strong');
  const captionText = root.querySelector('.demo-caption > span');
  const durations = [4200, 4200, 6200, 4200];
  const captions = [
    ['1. Copie', 'Toque no botão verde desta página.'],
    ['2. Abra seu navegador', 'Vá para a tela inicial do celular e abra o Chrome ou Safari.'],
    ['3. Cole o endereço', 'Toque e segure a barra de endereços e toque em «Colar».'],
    ['4. Entre no site', 'Toque em «Ir» ou na seta do teclado. Pronto!']
  ];
  let current = 0;
  let elapsed = 0;
  let startedAt = 0;
  let timer = null;
  let manuallyPaused = false;
  let inView = false;

  const destination = (window.GUIDE_CONFIG?.destinations || []).find(item => item?.id === 'web');
  let url = '';
  try {
    const parsed = new URL(destination?.url || '');
    if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) url = parsed.href;
  } catch (_) { /* Keep a neutral placeholder when configuration is incomplete. */ }
  root.querySelectorAll('[data-demo-url]').forEach(label => {
    label.textContent = url || 'O endereço do seu guia';
  });

  function canPlay() {
    return inView && !document.hidden && !manuallyPaused;
  }

  function updateControls() {
    // A start button is never required. "Continuar" appears only after an explicit pause.
    play.textContent = manuallyPaused ? 'Continuar' : 'Pausar exemplo';
    play.setAttribute('aria-label', manuallyPaused ? 'Continuar o exemplo automático' : 'Pausar o exemplo animado');
  }

  function stopClock() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      elapsed += performance.now() - startedAt;
    }
    root.dataset.playing = 'false';
    updateControls();
  }

  function syncPlayback() {
    if (!canPlay()) { stopClock(); return; }
    if (timer !== null) return;
    root.dataset.playing = 'true';
    startedAt = performance.now();
    timer = window.setTimeout(() => {
      timer = null;
      showStep((current + 1) % scenes.length);
    }, Math.max(50, durations[current] - elapsed));
    updateControls();
  }

  function showStep(index) {
    stopClock();
    current = Math.max(0, Math.min(scenes.length - 1, index));
    elapsed = 0;
    root.dataset.step = String(current);
    root.style.setProperty('--demo-duration', `${durations[current]}ms`);
    scenes.forEach((scene, i) => { scene.hidden = i !== current; });
    steps.forEach((step, i) => {
      if (i === current) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    captionTitle.textContent = captions[current][0];
    captionText.textContent = captions[current][1];
    // Restart the selected illustration, including when replaying the same step.
    if (typeof scenes[current].getAnimations === 'function') {
      scenes[current].getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = elapsed; });
    }
    syncPlayback();
  }

  play.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    syncPlayback();
  });
  document.querySelectorAll('[data-demo-start]').forEach(link => link.addEventListener('click', () => {
    // Every helper shows the complete demonstration automatically, from the beginning.
    manuallyPaused = false;
    showStep(0);
  }));
  document.addEventListener('visibilitychange', syncPlayback);
  window.addEventListener('pagehide', stopClock);
  window.addEventListener('pageshow', syncPlayback);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const previouslyVisible = inView;
      inView = entries[0].isIntersecting;
      // Start at step 1 each time the phone returns to view, unless the visitor paused it.
      if (inView && !previouslyVisible && !manuallyPaused) showStep(0);
      else syncPlayback();
    }, { threshold: 0 });
    observer.observe(root.querySelector('.demo-phone'));
  } else {
    inView = true;
  }
  showStep(0);
})();
