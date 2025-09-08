// WPlace AutoBOT Script Manager - Neon Cyberpunk Edition
// Fixed version with proper content script communication

(function() {
  'use strict';
  
  console.log('%c🎮 WPlace AutoBOT Script Manager v2.0 - FIXED', 'color: #00ff41; font-weight: bold; font-size: 16px;');
  console.log('%c⚡ Neon Cyberpunk Theme with Content Script Bridge', 'color: #00ff41; font-weight: bold;');

  // Available scripts configuration
  const AVAILABLE_SCRIPTS = [
    {
      name: 'Auto-Image.js',
      title: 'Auto Image Placer',
      description: 'Automatically place images on the canvas with smart positioning',
      category: 'Automation',
      primary: true
    },
    {
      name: 'Auto-Farm.js', 
      title: 'Auto Farm Bot',
      description: 'Automated farming and resource collection',
      category: 'Automation'
    },
    {
      name: 'Auto-Repair.js',
      title: 'Auto Repair Tool', 
      description: 'Automatically repair damaged pixels and structures',
      category: 'Utility'
    }
  ];

  // Neon cyberpunk CSS styles
  const NEON_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
    
    @keyframes neon-glow {
      0%, 100% { box-shadow: 0 0 5px #00ff41, 0 0 10px #00ff41, 0 0 15px #00ff41; }
      50% { box-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41; }
    }
    
    @keyframes pixel-blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0.7; }
    }
    
    @keyframes scanline {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100vw); }
    }
    
    @keyframes neon-fade-in {
      from { opacity: 0; transform: scale(0.8) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    @keyframes neon-fade-out {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to { opacity: 0; transform: scale(0.8) translateY(-20px); }
    }
    
    @keyframes backdrop-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes backdrop-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    .script-manager-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(26, 26, 46, 0.8);
      backdrop-filter: blur(5px);
      z-index: 999998;
      animation: backdrop-fade-in 0.3s ease-out forwards;
    }
    
    .script-manager-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 600px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #00ff41;
      border-radius: 0;
      z-index: 999999;
      font-family: 'Press Start 2P', monospace;
      color: #00ff41;
      box-shadow: 0 0 30px rgba(0, 255, 65, 0.5), inset 0 0 30px rgba(0, 255, 65, 0.1);
      animation: neon-fade-in 0.3s ease-out forwards;
      outline: none;
    }
    
    .script-manager-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, #00ff41, transparent);
      z-index: 1;
      pointer-events: none;
      animation: scanline 3s linear infinite;
      opacity: 0.7;
    }
    
    .script-manager-header {
      background: #16213e;
      border-bottom: 2px solid #00ff41;
      padding: 15px 20px;
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header-content {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .header-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
      transition: all 0.3s ease;
      animation: pixel-blink 3s infinite;
    }
    
    .header-icon:hover {
      transform: scale(1.1);
      box-shadow: 0 0 25px rgba(0, 255, 65, 0.6);
    }
    
    .script-manager-title {
      color: #00ff41;
      font-size: 14px;
      text-shadow: 0 0 15px #00ff41;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .script-manager-close {
      background: transparent;
      border: 2px solid #ff073a;
      color: #ff073a;
      width: 40px;
      height: 40px;
      border-radius: 0;
      font-family: 'Press Start 2P', monospace;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-shadow: 0 0 10px #ff073a;
    }
    
    .script-manager-close:hover {
      background: #ff073a;
      color: #000;
      box-shadow: 0 0 20px rgba(255, 7, 58, 0.6);
      transform: scale(1.1);
    }
    
    .script-manager-content {
      padding: 20px;
      min-height: 200px;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .script-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }
    
    .script-card {
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 1px solid #00ff41;
      padding: 15px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .script-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.1), transparent);
      transition: left 0.5s ease;
    }
    
    .script-card:hover::before {
      left: 100%;
    }
    
    .script-card:hover {
      border-color: #39ff14;
      box-shadow: 0 0 20px rgba(0, 255, 65, 0.4);
      transform: translateY(-2px);
    }
    
    .script-card.primary {
      border-color: #39ff14;
      box-shadow: 0 0 15px rgba(57, 255, 20, 0.3);
    }
    
    .script-card.primary::after {
      content: '⭐ RECOMMENDED';
      position: absolute;
      top: 5px;
      right: 5px;
      background: #39ff14;
      color: #000;
      padding: 2px 5px;
      font-size: 6px;
      text-shadow: none;
    }
    
    .script-name {
      color: #00ff41;
      font-size: 10px;
      font-weight: bold;
      text-shadow: 0 0 10px #00ff41;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .script-description {
      color: #00ff41dd;
      font-size: 7px;
      line-height: 1.4;
      margin-bottom: 10px;
      text-shadow: 0 0 5px #00ff41;
    }
    
    .script-category {
      background: rgba(255, 107, 53, 0.2);
      border: 1px solid #ff6b35;
      color: #ff6b35;
      padding: 3px 8px;
      font-size: 7px;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-shadow: 0 0 5px #ff6b35;
      display: inline-block;
    }
    
    .script-manager-footer {
      background: #16213e;
      border-top: 2px solid #00ff41;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .status-text {
      color: #00ff41dd;
      font-size: 8px;
      text-shadow: 0 0 5px #00ff41;
    }
    
    .action-buttons {
      display: flex;
      gap: 10px;
    }
    
    .neon-btn {
      background: #16213e;
      border: 2px solid #00ff41;
      border-radius: 0;
      color: #00ff41;
      padding: 8px 15px;
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.3s ease;
      text-shadow: 0 0 8px #00ff41;
      letter-spacing: 1px;
    }
    
    .neon-btn:hover {
      background: #00ff41;
      color: #000;
      box-shadow: 0 0 20px rgba(0, 255, 65, 0.6);
      transform: scale(1.05);
    }
    
    .neon-btn.secondary {
      border-color: #ff6b35;
      color: #ff6b35;
      text-shadow: 0 0 8px #ff6b35;
    }
    
    .neon-btn.secondary:hover {
      background: #ff6b35;
      color: #000;
      box-shadow: 0 0 20px rgba(255, 107, 53, 0.6);
    }
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      gap: 20px;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 2px solid #16213e;
      border-top: 2px solid #00ff41;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-text {
      color: #00ff41;
      font-size: 10px;
      text-align: center;
      text-shadow: 0 0 10px #00ff41;
      animation: pixel-blink 1.5s infinite;
    }
  `;

  // ESC key handler for closing
  function handleEscKey(event) {
    if (event.key === 'Escape') {
      closeScriptManager();
    }
  }

  // Execute script function with content script communication
  async function executeScript(scriptName) {
    console.group(`%c🚀 Executing ${scriptName}`, 'color: #00ff41; font-weight: bold;');
    
    try {
      showLoading(`Launching ${scriptName}...`);
      
      console.log('%c🔄 Script Manager → Content Script → Background Script → Execute', 'color: #ff6b35; font-weight: bold;');
      console.log('Script Manager runs in page context, using postMessage bridge to extension');
      
      // Create response promise
      const responsePromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout: No response from extension after 10 seconds'));
        }, 10000);
        
        const handleResponse = (event) => {
          if (event.source !== window || !event.data) return;
          
          if (event.data.type === 'AUTOBOT_SCRIPT_RESPONSE') {
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleResponse);
            
            if (event.data.success) {
              resolve(event.data);
            } else {
              reject(new Error(event.data.error || 'Script execution failed'));
            }
          }
        };
        
        window.addEventListener('message', handleResponse);
      });
      
      // Send message to content script
      console.log(`%c📤 Sending postMessage to content script`, 'color: #06b6d4;');
      console.log(`  Script: ${scriptName}`);
      
      window.postMessage({
        type: 'AUTOBOT_EXECUTE_SCRIPT',
        scriptName: scriptName,
        source: 'script-manager',
        timestamp: Date.now()
      }, '*');
      
      // Wait for response
      const response = await responsePromise;
      
      console.log(`%c✅ ${scriptName} executed successfully!`, 'color: #39ff14; font-weight: bold;');
      showSuccess(`${scriptName} launched successfully!`);
      
      setTimeout(() => {
        closeScriptManager();
      }, 2000);
      
    } catch (error) {
      console.error(`%c❌ Failed to execute ${scriptName}:`, 'color: #ff073a; font-weight: bold;', error);
      showError(`Failed to launch ${scriptName}: ${error.message}`);
    } finally {
      console.groupEnd();
    }
  }

  // UI Management functions
  function showLoading(message) {
    const container = document.getElementById('script-manager-content');
    if (!container) return;
    
    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">${message}</div>
      </div>
    `;
  }

  function showSuccess(message) {
    const statusText = document.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = `✅ ${message}`;
      statusText.style.color = '#39ff14';
      statusText.style.textShadow = '0 0 10px #39ff14';
    }
  }

  function showError(message) {
    const statusText = document.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = `❌ ${message}`;
      statusText.style.color = '#ff073a';
      statusText.style.textShadow = '0 0 10px #ff073a';
    }
    
    // Reset the content to show scripts again
    setTimeout(() => {
      renderScripts();
    }, 3000);
  }

  // Render scripts grid
  function renderScripts() {
    const container = document.getElementById('script-manager-content');
    if (!container) return;
    
    const scriptGrid = AVAILABLE_SCRIPTS.map(script => `
      <div class="script-card ${script.primary ? 'primary' : ''}" onclick="executeScript('${script.name}')">
        <div class="script-name">${script.title}</div>
        <p class="script-description">${script.description}</p>
        <span class="script-category">${script.category}</span>
      </div>
    `).join('');
    
    container.innerHTML = `
      <div class="script-grid">
        ${scriptGrid}
      </div>
    `;
  }

  // Close script manager
  function closeScriptManager() {
    const container = document.getElementById('script-manager-container');
    const backdrop = document.getElementById('script-manager-backdrop');
    
    if (container) {
      container.style.animation = 'neon-fade-out 0.3s ease-in forwards';
      setTimeout(() => {
        container.remove();
      }, 300);
    }
    
    if (backdrop) {
      backdrop.style.animation = 'backdrop-fade-out 0.3s ease-in forwards';
      setTimeout(() => {
        backdrop.remove();
      }, 300);
    }
    
    // Remove ESC key listener
    document.removeEventListener('keydown', handleEscKey);
    
    console.log('%c👋 Script Manager closed', 'color: #ff6b35;');
  }

  // Show script manager interface
  function showScriptManager() {
    // Remove any existing manager
    const existing = document.getElementById('script-manager-container');
    if (existing) existing.remove();
    
    const existingBackdrop = document.getElementById('script-manager-backdrop');
    if (existingBackdrop) existingBackdrop.remove();
    
    console.log('%c🎮 Opening Script Manager with Neon Theme', 'color: #00ff41; font-weight: bold;');
    
    // Get icon URL for display
    let iconUrl = '';
    try {
      if (chrome && chrome.runtime && chrome.runtime.getURL) {
        iconUrl = chrome.runtime.getURL('icons/icon32.png');
        console.log('📷 Icon URL:', iconUrl);
      }
    } catch (e) {
      console.log('Extension context not available for icon');
    }
    
    // Inject styles
    if (!document.getElementById('script-manager-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'script-manager-styles';
      styleElement.textContent = NEON_STYLES;
      document.head.appendChild(styleElement);
    }
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'script-manager-backdrop';
    backdrop.className = 'script-manager-backdrop';
    backdrop.addEventListener('click', closeScriptManager);
    
    // Create container
    const container = document.createElement('div');
    container.id = 'script-manager-container';
    container.className = 'script-manager-container';
    
    container.innerHTML = `
      <div class="script-manager-header">
        <div class="header-content">
          ${iconUrl ? `<img src="${iconUrl}" alt="AutoBOT" class="header-icon" onerror="this.style.display='none'">` : ''}
          <h2 class="script-manager-title">⚡ WPlace AutoBOT Script Manager ⚡</h2>
        </div>
        <button class="script-manager-close" onclick="closeScriptManager()">×</button>
      </div>
      <div id="script-manager-content" class="script-manager-content">
        <!-- Scripts will be rendered here -->
      </div>
      <div class="script-manager-footer">
        <div class="status-text">Ready to launch scripts via content script bridge</div>
        <div class="action-buttons">
          <button class="neon-btn secondary" onclick="closeScriptManager()">Cancel</button>
          <button class="neon-btn" onclick="window.location.reload()">Refresh Page</button>
        </div>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(backdrop);
    document.body.appendChild(container);
    
    // Render scripts
    renderScripts();
    
    // Add ESC key listener
    document.addEventListener('keydown', handleEscKey);
    
    // Focus container for accessibility
    container.focus();
    
    console.log('%c✅ Script Manager opened successfully', 'color: #39ff14; font-weight: bold;');
  }

  // Make functions globally available
  window.executeScript = executeScript;
  window.closeScriptManager = closeScriptManager;
  window.showScriptManager = showScriptManager;

  // Test content script communication
  console.group('%c🔍 Content Script Communication Test', 'color: #ff6b35; font-weight: bold;');
  console.log('Testing if content script can receive postMessage...');
  
  // Listen for test response
  const testTimeout = setTimeout(() => {
    console.warn('❌ No response from content script - communication may not work');
    console.groupEnd();
  }, 2000);
  
  window.addEventListener('message', function testHandler(event) {
    if (event.data && event.data.type === 'AUTOBOT_CONTENT_SCRIPT_READY') {
      clearTimeout(testTimeout);
      window.removeEventListener('message', testHandler);
      console.log('✅ Content script communication confirmed!');
      console.groupEnd();
    }
  });
  
  // Send test message
  window.postMessage({
    type: 'AUTOBOT_TEST_CONNECTION',
    source: 'script-manager'
  }, '*');

  // Auto-start the script manager
  console.log('%c🎯 Auto-launching Script Manager...', 'color: #00ff41; font-weight: bold;');
  showScriptManager();

  console.log('%c🚀 WPlace AutoBOT Script Manager v2.0 Ready!', 'color: #39ff14; font-weight: bold; font-size: 16px;');
})();
