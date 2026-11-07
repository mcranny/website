/* Progressive enhancement: both case studies remain readable without JavaScript. */
(() => {
  const tabs = [...document.querySelectorAll('[data-version-tab]')];
  const panels = [...document.querySelectorAll('[data-version-panel]')];
  if (!tabs.length) return;
  document.querySelector('[data-version-tabs]').setAttribute('role', 'tablist');
  for (const tab of tabs) tab.setAttribute('role', 'tab');
  for (const panel of panels) {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${panel.dataset.versionPanel}`);
    panel.tabIndex = 0;
  }
  function targetPanel() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return null; }
    return document.getElementById(id)?.closest('[data-version-panel]');
  }
  function select(version) {
    for (const tab of tabs) {
      const selected = tab.dataset.versionTab === version;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.dataset.versionPanel !== version;
    window.dispatchEvent(new Event('asicversionchange'));
  }
  function restore() {
    const panel = targetPanel();
    const query = new URL(location.href).searchParams.get('version');
    select(panel?.dataset.versionPanel || (query === 'v2' ? 'v2' : 'v3'));
    if (location.hash) requestAnimationFrame(() => {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      document.getElementById(id)?.scrollIntoView();
    });
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const version = tab.dataset.versionTab;
      const url = new URL(location.href);
      url.searchParams.set('version', version);
      if (targetPanel()) url.hash = '';
      if (url.href !== location.href) history.pushState(null, '', url);
      select(version);
    });
    tab.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); tab.click(); return; }
      const next = {ArrowRight:(index+1)%tabs.length, ArrowLeft:(index+tabs.length-1)%tabs.length, Home:0, End:tabs.length-1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  }
  window.addEventListener('popstate', restore);
  window.addEventListener('hashchange', restore);
  restore();
})();
