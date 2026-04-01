document.addEventListener('DOMContentLoaded', () => {
  const masterSwitch = document.getElementById('enabled');
  const hideIPv4Switch = document.getElementById('hideIPv4');
  const hideIPv6Switch = document.getElementById('hideIPv6');
  const excludePrivateSwitch = document.getElementById('excludePrivate');
  const enhancedDetectionSwitch = document.getElementById('enhancedDetection');
  const enhancedOptions = document.getElementById('enhanced-options');
  const blurCIDR = document.getElementById('blurCIDR');
  const blurPort = document.getElementById('blurPort');
  const siteDetectionSwitch = document.getElementById('siteDetection');
  
  
  const modalOverlay = document.getElementById('modal-overlay');
  const modalConfirm = document.getElementById('modal-confirm');
  const modalCancel = document.getElementById('modal-cancel');
  const excludedSitesTextarea = document.getElementById('excludedSites');
  const refreshBar = document.getElementById('refresh-bar');
  const reloadBtn = document.getElementById('reload-btn');
  const statusText = document.getElementById('status-text');
  
  const hidingModeRadios = document.querySelectorAll('input[name="hidingMode"]');
  const interactionModeRadios = document.querySelectorAll('input[name="interactionMode"]');
  
  const quickExcludeContainer = document.getElementById('quick-exclude-container');
  const quickExcludeBtn = document.getElementById('quick-exclude-btn');

  const settingsToggle = document.getElementById('settings-toggle');
  const homepage = document.getElementById('homepage');
  const settingsPage = document.getElementById('settings-page');
  const viewTitle = document.getElementById('view-title');

  const defaultSettings = {
    enabled: true,
    hideIPv4: true,
    hideIPv6: true,
    excludePrivate: false,
    excludedSites: '',
    hidingMode: 'blur',
    interactionMode: 'click',
    enhancedDetection: false,
    blurCIDR: false,
    blurPort: false,
    siteDetection: true,
    enhancedMAC: true,
    enhancedGPS: true,
    enhancedUnits: true
  };

  // load saved settings
  chrome.storage.sync.get(Object.keys(defaultSettings), (result) => {
    const settings = { ...defaultSettings, ...result };

    if (masterSwitch) masterSwitch.checked = settings.enabled;
    if (hideIPv4Switch) hideIPv4Switch.checked = settings.hideIPv4;
    if (hideIPv6Switch) hideIPv6Switch.checked = settings.hideIPv6;
    if (excludePrivateSwitch) excludePrivateSwitch.checked = settings.excludePrivate;
    if (enhancedDetectionSwitch) enhancedDetectionSwitch.checked = settings.enhancedDetection;
    if (blurCIDR) blurCIDR.checked = settings.blurCIDR;
    if (blurPort) blurPort.checked = settings.blurPort;
    if (siteDetectionSwitch) siteDetectionSwitch.checked = settings.siteDetection;
    
    
    if (settings.enhancedDetection && enhancedOptions) {
      enhancedOptions.classList.remove('hidden');
    }
    
    if (excludedSitesTextarea) excludedSitesTextarea.value = settings.excludedSites;
    
    const modeRadio = document.getElementById(`mode-${settings.hidingMode}`);
    if (modeRadio) modeRadio.checked = true;
    
    const interRadio = document.getElementById(`inter-${settings.interactionMode}`);
    if (interRadio) interRadio.checked = true;

    updateStatusText(settings.enabled);
    if (typeof checkCurrentSite === 'function') checkCurrentSite(settings.excludedSites);
  });

  function updateStatusText(enabled) {
    if (statusText) {
      statusText.textContent = enabled ? 'Shield is Active' : 'Shield is Paused';
      statusText.style.color = enabled ? 'var(--success)' : 'var(--danger)';
    }
  }

  function showRefreshBar() {
    if (refreshBar) refreshBar.classList.remove('hidden');
  }

  function checkFileAccess() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || "";
      if (url.startsWith('file://')) {
        chrome.extension.isAllowedFileSchemeAccess((isAllowed) => {
          if (!isAllowed) {
            document.getElementById('file-url-warning').classList.remove('hidden');
            document.getElementById('open-settings-btn').onclick = () => {
              chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
            };
          }
        });
      }
    });
  }
  
  checkFileAccess();

  function checkCurrentSite(excludedSites) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      const host = url.hostname;
      
      const sites = excludedSites.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
      const isExcluded = sites.some(site => host === site || host.endsWith('.' + site));
      
      if (!isExcluded && host && !host.includes('newtab')) {
        if (quickExcludeContainer) quickExcludeContainer.classList.remove('hidden');
        if (quickExcludeBtn) {
          quickExcludeBtn.textContent = `Exclude ${host}`;
          quickExcludeBtn.onclick = () => {
            const newValue = excludedSites ? (excludedSites.trim() + '\n' + host) : host;
            if (excludedSitesTextarea) excludedSitesTextarea.value = newValue;
            chrome.storage.sync.set({ excludedSites: newValue });
            if (quickExcludeContainer) quickExcludeContainer.classList.add('hidden');
            showRefreshBar();
          };
        }
      } else {
        if (quickExcludeContainer) quickExcludeContainer.classList.add('hidden');
      }
    });
  }

  // event listeners
  [masterSwitch, hideIPv4Switch, hideIPv6Switch, excludePrivateSwitch, enhancedDetectionSwitch, blurCIDR, blurPort, siteDetectionSwitch].forEach(el => {
    if (!el) return;
    el.addEventListener('change', () => {
      const key = el.id;
      if (key === 'enhancedDetection') {
        if (el.checked) {
          el.checked = false;
          if (modalOverlay) modalOverlay.classList.remove('hidden');
          
          if (modalConfirm) {
            modalConfirm.onclick = () => {
              el.checked = true;
              chrome.storage.sync.set({ [key]: true });
              if (enhancedOptions) enhancedOptions.classList.remove('hidden');
              if (modalOverlay) modalOverlay.classList.add('hidden');
              showRefreshBar();
            };
          }
          
          if (modalCancel) {
            modalCancel.onclick = () => {
              if (modalOverlay) modalOverlay.classList.add('hidden');
            };
          }
          return;
        } else {
          if (enhancedOptions) enhancedOptions.classList.add('hidden');
        }
      }
      chrome.storage.sync.set({ [key]: el.checked });
      if (key === 'enabled') updateStatusText(el.checked);
      showRefreshBar();
    });
  });

  hidingModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      chrome.storage.sync.set({ hidingMode: radio.value });
      showRefreshBar();
    });
  });

  interactionModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      chrome.storage.sync.set({ interactionMode: radio.value });
      showRefreshBar();
    });
  });

  let timeoutId;
  if (excludedSitesTextarea) {
    excludedSitesTextarea.addEventListener('input', () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        chrome.storage.sync.set({ excludedSites: excludedSitesTextarea.value });
        showRefreshBar();
      }, 500);
    });
  }

  reloadBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
        window.close();
      }
    });
  });

  if (settingsToggle) {
    settingsToggle.addEventListener('click', () => {
      if (!homepage || !settingsPage || !viewTitle) return;
      
      const isHomepage = !homepage.classList.contains('hidden');
      
      if (isHomepage) {
        homepage.classList.add('hidden');
        settingsPage.classList.remove('hidden');
        viewTitle.textContent = 'Settings';
        settingsToggle.innerHTML = `
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        `;
      } else {
        homepage.classList.remove('hidden');
        settingsPage.classList.add('hidden');
        viewTitle.textContent = 'IP Hider';
        settingsToggle.innerHTML = `
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        `;
      }
    });
  }
});