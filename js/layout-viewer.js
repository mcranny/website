/* Load the native viewer only when a visitor chooses to explore. */
(() => {
  const root = document.querySelector('[data-gds-viewer]');
  if (!root) return;
  const activate = root.querySelector('[data-gds-start]');
  const status = root.querySelector('[data-gds-status]');
  activate.hidden = false;
  let viewer;
  activate.addEventListener('click', async () => {
    activate.disabled = true;
    status.textContent = 'Loading the V2 layout…';
    try {
      const {createViewer} = await import('./gds-viewer.js');
      viewer ||= createViewer(root);
      await viewer.start();
      activate.hidden = true;
    } catch (error) {
      status.textContent = `The interactive layout could not load. ${error.message} The preview and GDS download are still available.`;
      activate.textContent = 'Retry explorer';
    } finally {
      activate.disabled = false;
    }
  });
})();
