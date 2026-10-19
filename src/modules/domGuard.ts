export const domGuard = {
  protect(selector: string, onTamper: () => void, selfHealing: boolean = false) {
    if (typeof window === 'undefined') return () => {}

    const el = document.querySelector(selector)
    if (!el) return () => {}

    // Store original state for self-healing
    const originalOuterHTML = el.outerHTML;
    const parentNode = el.parentNode;
    const nextSibling = el.nextSibling;

    let isHealing = false;

    const observer = new MutationObserver((mutations) => {
      if (isHealing) return;

      let tampered = false;
      mutations.forEach(m => {
        if (m.type === 'childList' || m.type === 'attributes' || m.type === 'characterData') {
          tampered = true;
          document.dispatchEvent(new CustomEvent('hyde:threat', { 
            detail: { source: 'domGuard', selector, type: m.type } 
          }));
        }
      });

      if (tampered) {
        onTamper();

        if (selfHealing && parentNode) {
          isHealing = true;
          try {
            // Re-inject if removed, or revert if modified
            const currentEl = document.querySelector(selector);
            if (currentEl) {
              currentEl.outerHTML = originalOuterHTML;
            } else {
              const temp = document.createElement('div');
              temp.innerHTML = originalOuterHTML;
              const newEl = temp.firstElementChild;
              if (newEl) {
                parentNode.insertBefore(newEl, nextSibling);
              }
            }
          } catch (e) {
            console.error('[HydeSecurity] Failed to self-heal element:', e);
          }
          // Reset observer bindings in a real implementation we might need to reconnect to the new element
          // For simplicity in this demo library, outerHTML replacement keeps the observer alive if we replaced attributes,
          // but if we replaced the node entirely, we'd need to re-observe. 
          // Let's implement a robust re-observe.
          setTimeout(() => {
            isHealing = false;
            const newEl = document.querySelector(selector);
            if (newEl && newEl !== el) {
               observer.disconnect();
               observer.observe(newEl, { childList: true, attributes: true, subtree: true, characterData: true });
            }
          }, 0);
        }
      }
    });

    observer.observe(el, { 
      childList: true, 
      attributes: true, 
      subtree: true,
      characterData: true
    });

    // Also observe the parent to detect if the element itself is removed
    const parentObserver = new MutationObserver((mutations) => {
      if (isHealing || !selfHealing) return;
      let removed = false;
      mutations.forEach(m => {
        m.removedNodes.forEach(node => {
          if (node === el || (node instanceof HTMLElement && node.querySelector(selector))) {
            removed = true;
          }
        });
      });
      if (removed && parentNode) {
        isHealing = true;
        onTamper();
        document.dispatchEvent(new CustomEvent('hyde:threat', { detail: { source: 'domGuard', selector, type: 'node_removed' } }));
        
        const temp = document.createElement('div');
        temp.innerHTML = originalOuterHTML;
        const newEl = temp.firstElementChild;
        if (newEl) {
          parentNode.insertBefore(newEl, nextSibling);
          setTimeout(() => {
            isHealing = false;
            observer.disconnect();
            observer.observe(newEl, { childList: true, attributes: true, subtree: true, characterData: true });
          }, 0);
        } else {
          isHealing = false;
        }
      }
    });

    if (parentNode && selfHealing) {
      parentObserver.observe(parentNode, { childList: true });
    }

    return () => {
      observer.disconnect();
      if (selfHealing) parentObserver.disconnect();
    };
  }
}
