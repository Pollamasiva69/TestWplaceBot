// chat/page-bridge.js
(() => {
  'use strict';
  if (window.__WPLACE_PAGE_BRIDGE__) return;
  window.__WPLACE_PAGE_BRIDGE__ = true;

  function boot() {
    try {
      if (!window.__WPLACE_PAGE_CHAT__ && typeof window.ProjectChat !== 'undefined') {
        const chat = new window.ProjectChat();
        chat.init('wplace-chat-container');
        window.__WPLACE_PAGE_CHAT__ = chat;
      }
    } catch (e) {
      console.error('[chat boot]', e);
    }
  }

  // Intento de boot inmediato
  boot();
 //safe string https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // Reintento on-demand (desde el content-script)
  document.addEventListener('WPLACE_CHAT_BOOT', boot);

  // Mostrar/ocultar chat
  document.addEventListener('WPLACE_CHAT_TOGGLE', () => {
    try {
      const el = document.getElementById('wplace-chat-container');
      if (!el) return;
      const visible = el.style.display !== 'none';
      el.style.display = visible ? 'none' : 'block';
      if (window.__WPLACE_PAGE_CHAT__) {
        if (visible) window.__WPLACE_PAGE_CHAT__.hide();
        else window.__WPLACE_PAGE_CHAT__.show();
      }
    } catch (e) {
      console.error('[chat toggle]', e);
    }
  });
})();
