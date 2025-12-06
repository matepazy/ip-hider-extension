(function() {
  // ipv4 regex
  const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  
  // ipv6 regex
  const ipv6Regex = /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/gi;

  function processNode(node) {
    if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'NOSCRIPT'].includes(node.parentNode.tagName) || 
        node.parentNode.classList.contains('ip-text') ||
        node.parentNode.classList.contains('ip-wrapper')) {
      return;
    }

    const text = node.nodeValue;
    if (!text) return;

    let matches = [];
    let match;

    while ((match = ipv4Regex.exec(text)) !== null) {
      matches.push({ index: match.index, length: match[0].length, text: match[0], type: 'an ipv4 address' });
    }
    while ((match = ipv6Regex.exec(text)) !== null) {
      if (!matches.some(m => m.index === match.index)) {
        matches.push({ index: match.index, length: match[0].length, text: match[0], type: 'an ipv6 address' });
      }
    }

    matches.sort((a, b) => a.index - b.index);

    if (matches.length === 0) return;

    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      const splitNode = node.splitText(m.index); 
      splitNode.nodeValue = splitNode.nodeValue.substring(m.length); // Remove the raw IP text

      const wrapper = document.createElement('span');
      wrapper.className = 'ip-wrapper';
      wrapper.setAttribute('data-label', m.type); // Sets the "an ipv4/6 address" text
      wrapper.title = 'Click to reveal ' + m.text;

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

  document.addEventListener('click', function(e) {
    const wrapper = e.target.closest('.ip-wrapper');
    if (wrapper) {
      wrapper.classList.toggle('revealed');
    }
  });
})();