(() => {
  const button = document.getElementById('install-admin-app');
  let prompt = null;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const update = () => { button.hidden = standalone(); button.style.display = standalone() ? 'none' : ''; };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); prompt = e; update(); });
  window.addEventListener('appinstalled', () => { prompt = null; button.hidden = true; button.style.display = 'none'; });
  matchMedia('(display-mode: standalone)').addEventListener?.('change', update);
  button.addEventListener('click', async () => {
    if (standalone()) return update();
    if (prompt) {
      const current = prompt; prompt = null;
      try { await current.prompt(); await current.userChoice; } catch (e) { console.warn(e); }
      return;
    }
    const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    alert(apple ? 'Abre esta página en Safari. Toca Compartir → Añadir a pantalla de inicio → Añadir. Si aparece Abrir como app web, actívalo.' : 'Abre esta página en Chrome o Edge, mediante HTTPS. En el menú del navegador selecciona Instalar aplicación o Añadir a pantalla de inicio. Si no aparece, recarga la página y vuelve a intentarlo.');
  });
  update();
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./service-worker.js', {scope:'./'}).catch(console.warn);
})();
