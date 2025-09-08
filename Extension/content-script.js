// Content script for WPlace AutoBOT - Creates in-page UI
(() => {
  'use strict';

  // Ejecutar sólo en wplace.live (+ subdominios)
  const h = location.hostname;
  if (!(h === 'wplace.live' || h.endsWith('.wplace.live'))) return;

  // Evitar doble ejecución del content-script
  if (window.__WPLACE_CS_LOADED__) return;
  window.__WPLACE_CS_LOADED__ = true;

  // ---------- Estado local ----------
  let autobotButton = null;
  let buttonRemoved = false;
  let buttonHiddenByModal = false;
  let currentScript = null;

  const DEFAULT_SCRIPT = 'Script-manager.js';

  // ---------- Helpers seguros (sin eval / sin inline) ----------
  function ensureScript(id, src) {
    // Inyecta <script src="chrome-extension://..."> en PAGE world
    if (document.getElementById(id)) return Promise.resolve(true);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.id = id;
      s.src = src;
      s.type = 'text/javascript';
      s.onload = () => resolve(true);
      s.onerror = (e) => reject(e);
      (document.head || document.documentElement).appendChild(s);
    });
  }

  function ensureStyle(id, href) {
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id;
    l.rel = 'stylesheet';
    l.href = href;
    (document.head || document.documentElement).appendChild(l);
  }

  // ---------- Detección de modales / visibilidad ----------
  function isAnyModalOpen() {
    const modals = document.querySelectorAll('dialog.modal[open], dialog[open]');
    return modals.length > 0;
  }

  function handleButtonVisibility() {
    if (!autobotButton || buttonRemoved) return;
    if (isAnyModalOpen()) {
      if (!buttonHiddenByModal) {
        buttonHiddenByModal = true;
        autobotButton.style.transition = 'all 0.3s ease-out';
        autobotButton.style.opacity = '0';
        autobotButton.style.transform = 'scale(0.8)';
        autobotButton.style.pointerEvents = 'none';
      }
    } else if (buttonHiddenByModal) {
      buttonHiddenByModal = false;
      autobotButton.style.transition = 'all 0.3s ease-in';
      autobotButton.style.opacity = '1';
      autobotButton.style.transform = 'scale(1)';
      autobotButton.style.pointerEvents = 'auto';
    }
  }

  function removeButtonWithAnimation() {
    buttonRemoved = true;
    if (autobotButton && autobotButton.parentNode) {
      autobotButton.style.transition = 'all 0.5s ease-out';
      autobotButton.style.opacity = '0';
      autobotButton.style.transform = 'scale(0.5) translateY(-10px)';
      setTimeout(() => {
        if (autobotButton && autobotButton.parentNode) {
          autobotButton.parentNode.removeChild(autobotButton);
          autobotButton = null;
        }
      }, 500);
    }
  }

  // ---------- Ejecutar scripts de la extensión ----------
  async function executeScript(scriptName) {
    if (!autobotButton || currentScript) return;

    try {
      autobotButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5 animate-spin">
          <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
        </svg>`;
      autobotButton.style.opacity = '0.7';
      autobotButton.disabled = true;
      currentScript = scriptName;

      const response = await chrome.runtime.sendMessage({ action: 'executeScript', scriptName });

      if (response && response.success) {
        autobotButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
            <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
          </svg>`;
        autobotButton.style.background = '#4CAF50';
        autobotButton.disabled = false;
        autobotButton.title = `${scriptName} executed successfully`;
        setTimeout(resetButton, 2000);
      } else {
        throw new Error(response?.error || 'Failed to execute script');
      }
    } catch (error) {
      console.error('Error executing script:', error);
      currentScript = null;
      if (autobotButton) {
        autobotButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
            <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
          </svg>`;
        autobotButton.style.opacity = '1';
        autobotButton.style.background = '#f44336';
        autobotButton.title = `Error: ${error.message} - Click to retry`;
        setTimeout(resetButton, 3000);
      }
    }
  }

  function resetButton() {
    if (autobotButton) {
      autobotButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
          <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12A2,2 0 0,1 6,10M18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12A2,2 0 0,1 18,10M8,17.5H16V16H8V17.5Z"/>
      </svg>`;
      autobotButton.style.background = '';
      autobotButton.title = `AutoBot - Click to run ${DEFAULT_SCRIPT}`;
      autobotButton.disabled = false;
      currentScript = null;
    }
  }

  // ---------- CHAT: inyección en PAGE world sin inline ----------
  async function injectChatSystem() {
    try {
      const commUrl   = chrome.runtime.getURL('chat/CommUnit.js');
      const bridgeUrl = chrome.runtime.getURL('chat/page-bridge.js'); // nuevo archivo
      const cssUrl    = chrome.runtime.getURL('chat/auto-image-styles.css');

      // Asegura CSS (debe estar en web_accessible_resources)
      ensureStyle('__comm_unit_css__', cssUrl);

      // Contenedor
      const hostId = 'wplace-chat-container';
      if (!document.getElementById(hostId)) {
        const host = document.createElement('div');
        host.id = hostId;
        host.style.cssText = `
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 10000;
          display: none;
        `;
        document.body.appendChild(host);
      }

      // 1) Cargar CommUnit.js en PAGE world
      await ensureScript('__comm_unit_js__', commUrl);
      // 2) Cargar el bridge en PAGE world (sin inline)
      await ensureScript('__comm_unit_bridge__', bridgeUrl);

      // 3) Botón flotante que emite evento de toggle (el bridge lo escucha)
      if (!document.getElementById('__chat_toggle_btn__')) {
        const chatBtn = document.createElement('button');
        chatBtn.id = '__chat_toggle_btn__';
        chatBtn.innerHTML = '💬';
        chatBtn.style.cssText = `
          position: fixed;
          bottom: 100px;
          right: 20px;
          width: 50px;
          height: 50px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,123,255,0.4);
        `;
        chatBtn.addEventListener('click', () => {
          // Enviamos evento DOM (lo recibe el bridge en PAGE world)
          document.dispatchEvent(new CustomEvent('WPLACE_CHAT_TOGGLE'));
        });
        document.body.appendChild(chatBtn);
      }

      // Forzamos boot (por si el bridge cargó antes que ProjectChat)
      document.dispatchEvent(new CustomEvent('WPLACE_CHAT_BOOT'));

      console.log('✅ Chat system loaded (external bridge, no inline)');
    } catch (error) {
      console.error('❌ Error loading chat:', error);
    }
  }

  // Llamar tras un pequeño retraso
  setTimeout(injectChatSystem, 1500);

  // ---------- Listener para ejecuciones desde Script Manager ----------
  window.addEventListener('autobot-execute-script', async (event) => {
    const { scriptName } = event.detail;
    console.log(`%c📡 Content script received execution request for: ${scriptName}`, 'color: #00ff41; font-weight: bold;');
    try {
      const response = await chrome.runtime.sendMessage({ action: 'executeScript', scriptName });
      if (response && response.success) {
        console.log(`%c✅ ${scriptName} executed successfully via content script`, 'color: #39ff14; font-weight: bold;');
      } else {
        console.error(`%c❌ Script execution failed:`, 'color: #ff073a; font-weight: bold;', response?.error);
      }
    } catch (error) {
      console.error(`%c❌ Script execution error:`, 'color: #ff073a; font-weight: bold;', error);
    }
  });

  // ---------- Botón AutoBOT en el menú ----------
  function createAutoButton() {
    if (buttonRemoved) return;
    const menuContainer = document.querySelector('.absolute.right-2.top-2.z-30 .flex.flex-col.gap-3.items-center');
    if (!menuContainer) { setTimeout(createAutoButton, 1000); return; }
    if (document.getElementById('wplace-autobot-btn')) return;

    autobotButton = document.createElement('button');
    autobotButton.id = 'wplace-autobot-btn';
    autobotButton.className = 'btn btn-square shadow-md';
    autobotButton.title = `AutoBot - Click to run ${DEFAULT_SCRIPT}`;
    autobotButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-5">
        <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12A2,2 0 0,1 6,10M18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12A2,2 0 0,1 18,10M8,17.5H16V16H8V17.5Z"/>
      </svg>`;
    autobotButton.style.cssText = `transition: all 0.2s ease;`;
    autobotButton.addEventListener('click', () => executeScript(DEFAULT_SCRIPT));

    menuContainer.appendChild(autobotButton);
    setTimeout(handleButtonVisibility, 100);
    console.log('AutoBot button added to menu');
  }

  function setupModalObservers() {
    const modalAttributeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
          handleButtonVisibility();
        }
      }
    });

    const domObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          handleButtonVisibility();
        }
      }
    });

    const existingModals = document.querySelectorAll('dialog.modal, dialog');
    existingModals.forEach((modal) => {
      modalAttributeObserver.observe(modal, { attributes: true, attributeFilter: ['open'] });
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  const buttonObserver = new MutationObserver(() => {
    if (!buttonRemoved && !document.getElementById('wplace-autobot-btn')) {
      setTimeout(createAutoButton, 500);
    }
  });

  // ---------- Inicialización ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createAutoButton();
      setupModalObservers();
    });
  } else {
    createAutoButton();
    setupModalObservers();
  }

  setTimeout(() => {
    createAutoButton();
    setupModalObservers();
  }, 2000);

  buttonObserver.observe(document.body, { childList: true, subtree: true });

  console.log('WPlace AutoBOT content script loaded');
})();
