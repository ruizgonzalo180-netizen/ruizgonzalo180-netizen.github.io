(() => {
  'use strict';
  const root = document.querySelector('.browser-demo');
  if (!root) return;
  const panel = document.getElementById('inapp-panel');
  const panels = [panel, document.getElementById('copy-paste-panel')];
  const scenes = [...root.querySelectorAll('[data-nav-scene]')];
  const stepButtons = [...root.querySelectorAll('[data-nav-select]')];
  const pause = document.getElementById('nav-pause');
  const title = document.getElementById('nav-caption-title');
  const detail = document.getElementById('nav-caption-text');
  const destination = window.GUIDE_CONFIG?.destinations?.find(item => item?.id === 'web');
  const continueLink = document.getElementById('nav-continue');
  try {
    const url = new URL(destination?.url || '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('URL inválida');
    continueLink.href = url.href;
  } catch (_) { continueLink.hidden = true; }
  const name = destination?.label || 'o guia';
  document.querySelectorAll('[data-destination-name]').forEach(element => { element.textContent = name; });
  const captions = [
    ['1. Toque nos três pontos', 'Abra o menu do TikTok. A seta mostra onde tocar.'],
    ['2. Abra o navegador', 'Escolha «Abrir no navegador» no menu.'],
    ['3. Continue para o site', 'Já no seu navegador, toque em «Continuar para o site» para entrar no ' + name + '.']
  ];
  const durations = [3600, 4800, 3200];
  // Autoplay is explicit: each complete sequence repeats without a start click.
  root.dataset.motionOptIn = 'true';
  let paused = false;
  let visible = false;
  let current = 0;
  let elapsed = 0;
  let started = 0;
  let timer = null;

  function updateControl() {
    pause.textContent = paused ? 'Continuar animação' : 'Pausar animação';
    pause.setAttribute('aria-label', pause.textContent);
  }
  function stop() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      elapsed += performance.now() - started;
    }
    root.dataset.running = 'false';
  }
  function sync() {
    updateControl();
    if (!visible || panel.hidden || document.hidden || paused) { stop(); return; }
    if (timer !== null) return;
    root.dataset.running = 'true';
    started = performance.now();
    timer = window.setTimeout(() => {
      timer = null;
      showStep((current + 1) % scenes.length);
    }, Math.max(50, durations[current] - elapsed));
  }
  function showStep(index) {
    stop();
    current = Math.max(0, Math.min(scenes.length - 1, index));
    // Manual steps remain readable while paused, instead of freezing at the
    // first frame of the menu opening or success transition.
    elapsed = paused ? [1000, 2600, 1500][current] : 0;
    root.dataset.navStep = String(current);
    root.style.setProperty('--nav-duration', durations[current] + 'ms');
    scenes.forEach((scene, i) => { scene.hidden = i !== current; });
    stepButtons.forEach((button, i) => {
      if (i === current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    title.textContent = captions[current][0];
    detail.textContent = captions[current][1];
    if (typeof root.getAnimations === 'function') {
      root.getAnimations({subtree:true}).forEach(animation => { animation.currentTime = elapsed; });
    }
    sync();
  }
  function selectMode(index) {
    panels.forEach((item, i) => { item.hidden = i !== index; });
    if (index === 0) showStep(0);
    else sync();
  }
  function enableMotion() {
    root.dataset.motionOptIn = 'true';
    paused = false;
  }
  pause.addEventListener('click', () => {
    if (paused) enableMotion();
    else paused = true;
    sync();
  });
  document.getElementById('nav-restart').addEventListener('click', () => {
    enableMotion();
    showStep(0);
  });
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.navSelect))));
  document.querySelectorAll('[data-demo-start]').forEach(link => link.addEventListener('click', () => {
    selectMode(link.dataset.demoStart === 'paste' ? 1 : 0);
  }));
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const entered = !visible && entries[0].isIntersecting;
      visible = entries[0].isIntersecting;
      if (entered && !paused) showStep(0);
      else sync();
    }, {threshold:0.1}).observe(root.querySelector('.nav-phone'));
  } else { visible = true; }
  showStep(0);
})();
