(function () {
  'use strict';
  var tv = !!window.tizen || /SmartTV|Tizen/i.test(navigator.userAgent);
  var dialog = null, owner = null, observer = null, disposed = false, serial = 0;
  function focus(el) { if (!el || !el.isConnected) return; if (window.SafafiRemote) SafafiRemote.focus(el, true); else el.focus(); }
  function close(restore) {
    if (!dialog) return;
    var previous = owner;
    dialog.remove(); dialog = owner = null;
    if (previous) previous.setAttribute('aria-expanded', 'false');
    if (restore !== false) focus(previous);
  }
  function openSelect(select) {
    if (!tv || !select || !select.isConnected || select.disabled) return false;
    close(false); owner = select;
    dialog = document.createElement('section');
    dialog.className = 'sc-choice-overlay'; dialog.dir = 'rtl';
    dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    var title = document.createElement('h2'); title.id = 'sc-choice-title-' + (++serial);
    title.textContent = select.getAttribute('aria-label') || (select.labels && select.labels[0] && select.labels[0].textContent) || 'اختر';
    dialog.setAttribute('aria-labelledby', title.id);
    var panel = document.createElement('div'); panel.className = 'sc-choice-panel'; panel.appendChild(title);
    var list = document.createElement('div'); list.className = 'sc-choice-list'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-labelledby', title.id);
    var active = null;
    Array.from(select.options).forEach(function (option, index) {
      var button = document.createElement('button'); button.type = 'button'; button.setAttribute('role', 'option');
      button.textContent = option.textContent; button.disabled = option.disabled || !!(option.parentElement && option.parentElement.disabled);
      button.setAttribute('aria-selected', String(index === select.selectedIndex));
      if (index === select.selectedIndex && !button.disabled) active = button;
      button.addEventListener('click', function () {
        if (!owner || !owner.isConnected) { close(false); return; }
        var target = owner;
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(target, option.value);
        target.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      });
      list.appendChild(button);
    });
    panel.appendChild(list);
    var cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'sc-choice-close';
    cancel.textContent = 'رجوع'; cancel.setAttribute('aria-label', 'Close selection'); cancel.addEventListener('click', function () { close(); });
    panel.appendChild(cancel); dialog.appendChild(panel);
    dialog.addEventListener('click', function (event) { if (event.target === dialog) close(); });
    document.body.appendChild(dialog); select.setAttribute('aria-expanded', 'true');
    window.dispatchEvent(new CustomEvent('safafi:overlay'));
    focus(active || list.querySelector('button:not(:disabled)') || cancel);
    return true;
  }
  function decorate(node) {
    if (!node || node.nodeType !== 1) return;
    var inputs = node.matches('select,input[placeholder]') ? [node] : [];
    inputs = inputs.concat(Array.from(node.querySelectorAll('select,input[placeholder]')));
    inputs.forEach(function (input) {
      if (!input.getAttribute('aria-label') && !input.labels.length) input.setAttribute('aria-label', input.placeholder || 'اختيار');
      if (tv && input.tagName === 'SELECT') input.setAttribute('aria-haspopup', 'dialog');
    });
  }
  function click(event) { var select = event.target.closest && event.target.closest('select'); if (tv && select) { event.preventDefault(); openSelect(select); } }
  function navigate() { close(false); }
  function boot() {
    if (disposed) return;
    var root = document.getElementById('root'); if (!root) return;
    decorate(root);
    observer = new MutationObserver(function (changes) {
      if (owner && !owner.isConnected) close(false);
      changes.forEach(function (change) { change.addedNodes.forEach(decorate); });
    });
    observer.observe(root, { childList: true, subtree: true });
  }
  function destroy() {
    if (disposed) return; disposed = true; close(false);
    if (observer) observer.disconnect();
    document.removeEventListener('click', click, true);
    document.removeEventListener('DOMContentLoaded', boot);
    window.removeEventListener('safafi:navigate', navigate);
    window.removeEventListener('pagehide', destroy);
  }
  document.addEventListener('click', click, true);
  window.addEventListener('safafi:navigate', navigate);
  window.addEventListener('pagehide', destroy);
  window.SafafiScreenControls = { openSelect: openSelect, close: close, destroy: destroy };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
}());
