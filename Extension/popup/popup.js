// WPlace AutoBOT Popup Script

// Available scripts configuration - Script Manager as primary launcher
const AVAILABLE_SCRIPTS = [
    {
        name: 'Script-manager-fixed.js',
        displayName: '⚡ Script Manager (Fixed)',
        description: 'Neon-themed script launcher with proper communication bridge',
        filename: 'Script-manager-fixed.js',
        isPrimary: true
    },
    {
        name: 'Auto-Farm.js',
        displayName: '🌾 Auto Farm',
        description: 'Automated farming and pixel painting',
        filename: 'Auto-Farm.js'
    },
    {
        name: 'Auto-Image.js',
        displayName: '🖼️ Auto Image',
        description: 'Automated image processing and placement',
        filename: 'Auto-Image.js'
    },
    {
        name: 'Auto-Repair.js',
        displayName: '🔧 Auto Repair',
        description: 'Automated repair and maintenance tasks',
        filename: 'Auto-Repair.js'
    }
];

// DOM elements
let statusDot, statusText, scriptsList, logs;

document.addEventListener('DOMContentLoaded', async () => {
    initializeElements();
    await loadScripts();
    setupEventListeners();
    addLog('Extension popup opened');
    checkCurrentTab();
});

function initializeElements() {
    statusDot = document.getElementById('statusDot');
    statusText = document.getElementById('statusText');
    scriptsList = document.getElementById('scriptsList');
    logs = document.getElementById('logs');
}

async function loadScripts() {
    scriptsList.innerHTML = '';
    
    AVAILABLE_SCRIPTS.forEach(script => {
        const scriptElement = createScriptElement(script);
        scriptsList.appendChild(scriptElement);
    });
}

function createScriptElement(script) {
    const div = document.createElement('div');
    div.className = 'script-item';
    
    // Add special styling for primary script
    if (script.isPrimary) {
        div.style.background = 'rgba(0,255,65,0.1)';
        div.style.boxShadow = '0 0 15px rgb(0 255 65 / 30%)';
    }
    
    div.innerHTML = `
        <div class="script-info-left">
            <div class="script-name">${script.displayName}</div>
            <div class="script-description">${script.description}</div>
        </div>
        <button class="btn ${script.isPrimary ? 'btn-primary' : 'btn-primary'} launch-btn" data-script="${script.filename}">
            <span class="icon">${script.isPrimary ? '⚡' : '▶'}</span>
            ${script.isPrimary ? 'Open' : 'Launch'}
        </button>
    `;
    
    return div;
}

function setupEventListeners() {
    // Launch script buttons
    scriptsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('launch-btn') || e.target.closest('.launch-btn')) {
            const btn = e.target.closest('.launch-btn') || e.target;
            const scriptName = btn.dataset.script;
            await launchScript(scriptName, btn);
        }
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', (e) => {
        e.preventDefault();
        addLog('Settings feature coming soon');
    });
}

async function launchScript(scriptName, button) {
    try {
        addLog('Launching ' + scriptName + '...', 'warning');
        
        // Update button state
        button.disabled = true;
        const originalContent = button.innerHTML;
        button.innerHTML = '<span class="icon">⏳</span> Launching...';
        
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('wplace.live')) {
            throw new Error('Please navigate to wplace.live first');
        }

        // Send message to background script
        const response = await chrome.runtime.sendMessage({
            action: 'executeScript',
            scriptName: scriptName,
            tabId: tab.id
        });

        if (response && response.success) {
            button.innerHTML = '<span class="icon">✅</span> Launched';
            button.style.background = '#4CAF50';
            addLog(scriptName + ' executed successfully', 'success');
            
            // Close popup after success
            setTimeout(() => {
                window.close();
            }, 1500);
        } else {
            throw new Error(response?.error || 'Failed to execute script');
        }

    } catch (error) {
        console.error('Error launching script:', error);
        addLog('Failed to launch ' + scriptName + ': ' + error.message, 'error');
        
        // Reset button
        button.disabled = false;
        button.innerHTML = '<span class="icon">▶</span> Launch';
        button.style.background = '';
    }
}

async function checkCurrentTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab.url.includes('wplace.live')) {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Ready';
            addLog('Ready to launch scripts on wplace.live');
        } else {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Not on WPlace';
            addLog('Please navigate to wplace.live to use scripts', 'warning');
            
            // Disable all launch buttons
            document.querySelectorAll('.launch-btn').forEach(btn => {
                btn.disabled = true;
            });
        }
    } catch (error) {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'Error';
        addLog('Error checking current tab: ' + error.message, 'error');
    }
}
// Control del chat
document.getElementById('chatToggleBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.url.includes('wplace.live')) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: toggleChat
        });
    } else {
        console.log('Chat only works on WPlace');
    }
});

// Función que se ejecuta en la página
function toggleChat() {
    if (window.wplaceChat) {
        const container = document.getElementById('wplace-chat-container');
        if (container.style.display === 'none') {
            container.style.display = 'block';
            window.wplaceChat.show();
        } else {
            container.style.display = 'none';
            window.wplaceChat.hide();
        }
    } else {
        console.log('Chat not loaded yet');
    }
}

function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry ' + type;
    logEntry.textContent = new Date().toLocaleTimeString() + ': ' + message;
    
    logs.appendChild(logEntry);
    logs.scrollTop = logs.scrollHeight;
    
    // Keep only last 20 log entries
    while (logs.children.length > 20) {
        logs.removeChild(logs.firstChild);
    }
}
