(() => {
  const element = document.querySelector('#layout-viewer');
  if (!element) return;
  const fallback = document.querySelector('[data-layout-fallback]');
  const status = document.querySelector('[data-layout-status]');
  const help = document.querySelector('[data-layout-help]');
  const controls = document.querySelector('[data-layout-controls]');
  const retry = document.querySelector('[data-layout-retry]');
  const fullButton = document.querySelector('[data-layout-full]');
  const figure = element.closest('figure');
  fullButton.hidden = !document.fullscreenEnabled;
  let viewer;
  function fail() {
    element.hidden = true;
    fallback.hidden = false;
    controls.hidden = true;
    help.hidden = true;
    retry.hidden = false;
    status.textContent = 'The zoomable layout could not load. The preview is available below.';
  }
  function start() {
    viewer?.destroy();
    element.hidden = false;
    retry.hidden = true;
    status.textContent = 'Loading layout.';
    help.hidden = true;
    if (typeof OpenSeadragon !== 'function') { fail(); return; }
    viewer = OpenSeadragon({
      element,
      prefixUrl: 'assets/vendor/osd-images/',
      tileSources: 'assets/protocol-emulator/layout/layout.dzi',
      showNavigator: true,
      navigatorWidth: 220,
      navigatorHeight: 121,
      navigatorBackground: 'transparent',
      showNavigationControl: false,
      maxZoomPixelRatio: 1,
      gestureSettingsMouse: { scrollToZoom: false },
      gestureSettingsTouch: { pinchToZoom: true },
      minScrollDeltaTime: 0,
      animationTime: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.5,
      visibilityRatio: 0.8,
      constrainDuringPan: true
    });
    // Disabling wheel zoom alone still cancels browser scrolling in OSD 6.
    viewer.addHandler('canvas-scroll', event => { event.preventDefault = false; });
    viewer.addHandler('navigator-scroll', event => { event.preventDefault = false; });
    viewer.addHandler('open', () => {
      fallback.hidden = true;
      controls.hidden = false;
      help.hidden = false;
      const canvas = element.querySelector('.openseadragon-canvas');
      canvas?.setAttribute('aria-label', 'ASIC layout. Arrow keys pan. Plus and minus keys zoom.');
    });
    viewer.addHandler('fully-loaded-change', event => {
      if (event.fullyLoaded && retry.hidden) status.textContent = '';
    });
    viewer.addHandler('open-failed', fail);
    // A missing high-resolution tile needs a visible recovery path as well.
    viewer.addHandler('tile-load-failed', () => {
      status.textContent = 'Some layout tiles could not load. Retry to reload the layout.';
      retry.hidden = false;
    });
  }
  document.querySelector('[data-layout-in]').addEventListener('click', () => { viewer.viewport.zoomBy(1.6); viewer.viewport.applyConstraints(); });
  document.querySelector('[data-layout-out]').addEventListener('click', () => { viewer.viewport.zoomBy(1 / 1.6); viewer.viewport.applyConstraints(); });
  document.querySelector('[data-layout-home]').addEventListener('click', () => viewer.viewport.goHome());
  fullButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement === figure) await document.exitFullscreen();
      else await figure.requestFullscreen();
    } catch {
      status.textContent = 'Full screen is unavailable. You can still zoom and pan here.';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullButton.textContent = document.fullscreenElement === figure ? 'Exit full screen' : 'Full screen';
  });
  retry.addEventListener('click', start);
  start();
})();
