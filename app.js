(() => {
  'use strict';

  const config = window.GUIDE_CONFIG || {};
  const destinations = Array.isArray(config.destinations) ? config.destinations : [];
  const status = document.getElementById('copy-status');
  const preview = document.getElementById('preview-notice');
  const brand = document.getElementById('site-brand');
  const copyStep = document.getElementById('copy-step');
  const copyCue = document.getElementById('copy-cue');
  const copyNext = document.getElementById('copy-next');
  const watchExample = document.getElementById('watch-example');

  if (typeof config.brand === 'string' && config.brand.trim()) {
    brand.textContent = config.brand.trim();
  }

  function validatedUrl(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    try {
      const url = new URL(raw.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
      return url.href;
    } catch (_) {
      return '';
    }
  }

  function announce(message, failed = false) {
    status.textContent = message;
    status.classList.toggle('is-error', failed);
    status.hidden = false;
  }

  function legacyCopy(text) {
    const priorFocus = document.activeElement;
    const selection = window.getSelection();
    const savedRanges = [];
    if (selection) {
      for (let i = 0; i < selection.rangeCount; i += 1) savedRanges.push(selection.getRangeAt(i).cloneRange());
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    field.setAttribute('aria-label', 'Endereço para copiar');
    Object.assign(field.style, { position: 'fixed', top: '0', left: '0', width: '1px', height: '1px', padding: '0', border: '0', opacity: '0', fontSize: '16px' });
    document.body.appendChild(field);
    let copied = false;
    try {
      field.focus({ preventScroll: true });
      field.select();
      field.setSelectionRange(0, field.value.length);
      copied = document.execCommand('copy');
    } finally {
      field.remove();
      if (priorFocus && typeof priorFocus.focus === 'function') priorFocus.focus({ preventScroll: true });
      if (selection && savedRanges.length) {
        selection.removeAllRanges();
        savedRanges.forEach(range => selection.addRange(range));
      }
    }
    if (!copied) throw new Error('Não foi possível copiar o link.');
  }

  async function copyAddress(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (_) {
        // Alguns navegadores integrados não permitem a Clipboard API.
      }
    }
    legacyCopy(text);
  }

  const buttons = [...document.querySelectorAll('[data-destination]')];
  let available = 0;
  buttons.forEach(button => {
    const id = button.dataset.destination;
    const data = destinations.find(item => item && item.id === id);
    const url = validatedUrl(data && data.url);
    const output = document.getElementById(`url-${id}`);
    const label = button.querySelector('.button-label');
    const hint = button.querySelector('.button-hint');
    const defaultText = label.textContent;
    const defaultHint = hint ? hint.textContent : '';
    const defaultAriaLabel = button.getAttribute('aria-label') || defaultText;

    button.disabled = !url;
    output.textContent = url || 'Link pendente';
    output.classList.toggle('is-pending', !url);
    if (!url) return;

    available += 1;
    output.title = url;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await copyAddress(url);
        label.textContent = 'COPIADO!';
        if (hint) hint.textContent = 'AGORA ABRA SEU NAVEGADOR';
        button.setAttribute('aria-label', 'Link copiado. Toque para copiar novamente');
        copyStep?.classList.add('is-copied');
        if (copyCue) copyCue.hidden = true;
        if (copyNext) copyNext.hidden = false;
        if (watchExample) watchExample.hidden = true;
        announce('✓ Pronto! Agora abra o Chrome ou Safari.');
        document.dispatchEvent(new CustomEvent('guide:copied', { detail: { url } }));
      } catch (_) {
        label.textContent = defaultText;
        if (hint) hint.textContent = defaultHint;
        button.setAttribute('aria-label', defaultAriaLabel);
        copyStep?.classList.remove('is-copied');
        if (copyCue) copyCue.hidden = false;
        if (copyNext) copyNext.hidden = true;
        if (watchExample) watchExample.hidden = false;
        announce('Não foi possível copiar automaticamente. Toque e segure o endereço abaixo do botão e escolha «Copiar».', true);
      } finally {
        button.disabled = false;
      }
    });
  });

  preview.hidden = available === buttons.length && buttons.length > 0;

  const heroImage = document.getElementById('hero-animation');
  const motionButton = document.getElementById('hero-motion');
  if (!heroImage || !motionButton) return;

  const motionLabel = motionButton.querySelector('.motion-label');
  const stillSource = heroImage.dataset.still;
  const fallbackSource = heroImage.dataset.fallback;
  let animationSource = heroImage.dataset.animated;
  let manuallyPaused = false;
  let animationUnavailable = false;

  function updateHero() {
    const playing = !manuallyPaused && !document.hidden && !animationUnavailable;
    const nextSource = playing ? animationSource : stillSource;
    if (heroImage.getAttribute('src') !== nextSource) heroImage.src = nextSource;
    heroImage.dataset.playing = String(playing);
    motionButton.hidden = animationUnavailable;
    motionLabel.textContent = manuallyPaused ? 'Continuar' : 'Pausar';
    motionButton.classList.toggle('is-playing', !manuallyPaused);
    motionButton.setAttribute('aria-label', `${manuallyPaused ? 'Continuar' : 'Pausar'} animação da capa`);
  }

  function handleImageError() {
    if (heroImage.getAttribute('src') === animationSource && animationSource !== fallbackSource) {
      animationSource = fallbackSource;
    } else {
      animationUnavailable = true;
    }
    updateHero();
  }

  heroImage.addEventListener('error', handleImageError);
  motionButton.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    updateHero();
  });
  document.addEventListener('visibilitychange', updateHero);
  window.addEventListener('pageshow', updateHero);

  updateHero();
  if (heroImage.complete && heroImage.naturalWidth === 0) handleImageError();
})();
