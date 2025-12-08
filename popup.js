document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('excludePrivate');
  const textarea = document.getElementById('excludedSites');

  chrome.storage.sync.get(['excludePrivate', 'excludedSites'], (result) => {
    checkbox.checked = result.excludePrivate || false;
    textarea.value = result.excludedSites || '';
  });
  checkbox.addEventListener('change', () => {
    chrome.storage.sync.set({ excludePrivate: checkbox.checked });
  });
  textarea.addEventListener('input', () => {
    chrome.storage.sync.set({ excludedSites: textarea.value });
  });
});