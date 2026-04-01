(function() {
  const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  const ipv6Regex = /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/gi;

  function isPrivateIP(ip) {
    if (ip.includes('.')) {
      const parts = ip.split('.').map(Number);
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
      if (parts[0] === 127) return true;
      return false;
    } else {
      const lower = ip.toLowerCase();
      if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
      if (lower.startsWith('fe80')) return true;
      if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
      return false;
    }
  }

  function isDevSite() {
    const host = window.location.hostname;
    const devSites = ['github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'gist.github.com', 'npmjs.com', 'pypi.org', 'docker.com'];
    return devSites.some(site => host === site || host.endsWith('.' + site));
  }

  function isLikelyFalsePositive(fullText, matchIndex, matchText, settings) {
    const { blurCIDR, blurPort, siteDetection } = settings;
    const isDev = siteDetection && isDevSite();
    const enhancedMAC = true;
    const enhancedGPS = true;
    const enhancedUnits = true;
    const charBefore = matchIndex > 0 ? fullText[matchIndex - 1] : '';
    const charAfter = matchIndex + matchText.length < fullText.length ? fullText[matchIndex + matchText.length] : '';

    // 1. version segments
    if (charAfter === '.' && /[0-9]/.test(fullText[matchIndex + matchText.length + 1])) return true;
    if (charBefore === '.' && /[0-9]/.test(fullText[matchIndex - 2])) return true;
    
    // 2. struct idf
    if (charBefore === '-' || charBefore === '_' || charAfter === '-' || charAfter === '_') return true;

    // 3. prefix check
    if (charBefore.toLowerCase() === 'v' || charBefore === '$') {
       const charBeforeExtra = matchIndex > 1 ? fullText[matchIndex - 2] : ' ';
       if (!/[a-z0-9]/i.test(charBeforeExtra)) return true;
    }

    // 4. keyword based context
    const contextBefore = fullText.substring(Math.max(0, matchIndex - 30), matchIndex).toLowerCase();
    const versionKWs = ['version', 'build', 'rev', 'revision', 'v.', 'patch', 'update', 'stable', 'beta', 'rc', 'release', 'edition'];
    const ipKWs = ['ip', 'addr', 'host', 'server', 'node', 'endpoint', 'dns', 'gateway'];
    
    const hasVersionKW = versionKWs.some(kw => contextBefore.includes(kw));
    const hasIPKW = ipKWs.some(kw => contextBefore.includes(kw));
    
    if (hasVersionKW && !hasIPKW) return true;

    // 5. file extensions and subdomains
    const contextAfter = fullText.substring(matchIndex + matchText.length, matchIndex + matchText.length + 15).toLowerCase();
    const fileSuffixes = ['.exe', '.msi', '.pkg', '.zip', '.dmg', '.deb', '.rpm', '.iso', '.tar', '.gz', '.rar'];
    if (fileSuffixes.some(suffix => contextAfter.includes(suffix))) return true;
    
    // subdomains
    if (charAfter === '.' && /[a-z]/i.test(fullText[matchIndex + matchText.length + 1])) return true;

    // 6. dates
    const firstOctet = matchText.split('.')[0];
    if (firstOctet.length === 4 && parseInt(firstOctet) >= 1990 && parseInt(firstOctet) <= 2100) return true;

    // 7. versioning suffix
    if (/[a-z]/i.test(charAfter) && ![':', ' ', '.', '/'].includes(charAfter)) return true;

    // 8. MAC addr
    if (enhancedMAC) {
      const macPatternSuffix = /^:[0-9a-f]{2}:[0-9a-f]{2}/i;
      const macPatternSuffixHyphen = /^-[0-9a-f]{2}-[0-9a-f]{2}/i;
      if (charAfter === ':' && macPatternSuffix.test(fullText.substring(matchIndex + matchText.length))) return true;
      if (charAfter === '-' && macPatternSuffixHyphen.test(fullText.substring(matchIndex + matchText.length))) return true;
      
      const macPatternPrefix = /[0-9a-f]{2}:[0-9a-f]{2}:$/i;
      const macPatternPrefixHyphen = /[0-9a-f]{2}-[0-9a-f]{2}-$/i;
      if (charBefore === ':' && macPatternPrefix.test(fullText.substring(0, matchIndex))) return true;
      if (charBefore === '-' && macPatternPrefixHyphen.test(fullText.substring(0, matchIndex))) return true;
    }

    // 9. coordinate context
    if (enhancedGPS) {
       const coordKWs = ['lat', 'long', 'gps', 'coordinate', 'pos', 'position', 'location'];
       if (coordKWs.some(kw => contextBefore.includes(kw))) return true;
    }

    // 10. units of measurements
    if (enhancedUnits) {
       const unitSuffixes = ['kb', 'mb', 'gb', 'tb', 'percent', '%', 'hz', 'mhz', 'ghz', 'px', 'em', 'rem'];
       if (unitSuffixes.some(unit => contextAfter.startsWith(unit))) return true;
       if (charBefore === '$' || charBefore === '€' || charBefore === '£') return true;
    }

    // 11. cidr notation and ports
    if (!blurCIDR) {
       if (charAfter === '/' && /[0-9]{1,2}/.test(fullText.substring(matchIndex + matchText.length + 1, matchIndex + matchText.length + 3))) return true;
    }
    if (!blurPort) {
       if (charAfter === ':' && contextAfter.length > 5 && !/^[0-9]{2,5}(\s|$)/.test(contextAfter)) return true;
    }

    // 12. css variable / code context
    if (charBefore === '-' && fullText[matchIndex - 2] === '-') return true;

    // 13. site-specific strictness (e.g. for github/dev sites)
    if (isDev) {
      const hasIPContext = ['ip', 'host', 'addr', 'server'].some(kw => contextBefore.includes(kw));
      if (!hasIPContext) {
        const segments = matchText.split('.').map(Number);
        if (segments.length >= 3 && segments.every(s => s < 100)) return true;
        if (['=', '[', '(', '{', '"', "'"].includes(charBefore) || [']', ')', '}', '"', "'", ';', ','].includes(charAfter)) return true;
      }
    }

    return false;
  }

  function startExtension(settings) {
    const { hideIPv4, hideIPv6, excludePrivate, enhancedDetection, hidingMode, interactionMode } = settings;

    function processNode(node) {
      if (!node.parentNode || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT'].includes(node.parentNode.tagName) || 
          node.parentNode.classList.contains('ip-text') ||
          node.parentNode.classList.contains('ip-wrapper')) {
        return;
      }

      const text = node.nodeValue;
      if (!text) return;

      let matches = [];
      let match;

      if (hideIPv4) {
        ipv4Regex.lastIndex = 0;
        while ((match = ipv4Regex.exec(text)) !== null) {
          if (!excludePrivate || !isPrivateIP(match[0])) {
            const filterFP = enhancedDetection || (settings.siteDetection && isDevSite());
            if (!filterFP || !isLikelyFalsePositive(text, match.index, match[0], settings)) {
              matches.push({ index: match.index, length: match[0].length, text: match[0], type: 'an ipv4 address' });
            }
          }
        }
      }

      if (hideIPv6) {
        ipv6Regex.lastIndex = 0;
        while ((match = ipv6Regex.exec(text)) !== null) {
          if (!matches.some(m => m.index === match.index)) {
             if (!excludePrivate || !isPrivateIP(match[0])) {
                const filterFP = enhancedDetection || (settings.siteDetection && isDevSite());
                if (!filterFP || !isLikelyFalsePositive(text, match.index, match[0], settings)) {
                  matches.push({ index: match.index, length: match[0].length, text: match[0], type: 'an ipv6 address' });
                }
             }
          }
        }
      }

      matches.sort((a, b) => a.index - b.index);
      if (matches.length === 0) return;

      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const splitNode = node.splitText(m.index); 
        splitNode.nodeValue = splitNode.nodeValue.substring(m.length);

        const wrapper = document.createElement('span');
        wrapper.className = `ip-wrapper mode-${hidingMode} inter-${interactionMode}`;
        wrapper.setAttribute('data-label', m.type);
        wrapper.title = interactionMode === 'click' ? 'Click to reveal...' : 'Hover to reveal...';

        const content = document.createElement('span');
        content.className = 'ip-text';
        content.textContent = m.text;

        wrapper.appendChild(content);
        node.parentNode.insertBefore(wrapper, splitNode);
      }
    }

    function walk(root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(processNode);
    }

    console.log(`[IP Hider] Scanning page... Enhanced: ${enhancedDetection}`);
    walk(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) walk(node);
          if (node.nodeType === 3) processNode(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('click', function(e) {
    const wrapper = e.target.closest('.ip-wrapper.inter-click');
    if (wrapper) {
      wrapper.classList.toggle('revealed');
    }
  });

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

  chrome.storage.sync.get(Object.keys(defaultSettings), (result) => {
    const settings = { ...defaultSettings, ...result };
    if (!settings.enabled) return;

    const excludedSites = settings.excludedSites
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const currentHostname = window.location.hostname;
    const isExcluded = excludedSites.some(site => {
      return currentHostname === site || currentHostname.endsWith('.' + site);
    });

    if (!isExcluded) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => startExtension(settings));
      } else {
        startExtension(settings);
      }
    }
  });
})();
