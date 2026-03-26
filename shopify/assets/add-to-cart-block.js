(function () {
  const debugEnabled = window.location.search.indexOf('cartDebug=1') !== -1;

  function logDebug(message, payload) {
    if (!debugEnabled || !window.console) {
      return;
    }

    if (typeof payload === 'undefined') {
      console.log('[Kites add-to-cart] ' + message);
      return;
    }

    console.log('[Kites add-to-cart] ' + message, payload);
  }

  function getCartRuntime() {
    if (window.KitesCart && typeof window.KitesCart.refresh === 'function') {
      return window.KitesCart;
    }

    return null;
  }

  function getVariantState(input) {
    if (!input) {
      return { id: '', available: false };
    }

    let available = true;

    if (input.tagName === 'SELECT') {
      const selectedOption = input.options[input.selectedIndex];
      available = selectedOption ? selectedOption.dataset.available !== 'false' : false;
    } else {
      available = input.dataset.available !== 'false';
    }

    return {
      id: input.value,
      available: available
    };
  }

  function updateStatus(statusNode, message) {
    if (!statusNode) {
      return;
    }

    if (message) {
      statusNode.hidden = false;
      statusNode.dataset.status = 'ERROR';
      statusNode.textContent = message;
      return;
    }

    statusNode.hidden = true;
    statusNode.textContent = '';
  }

  function syncButtonState(block) {
    const input = block.querySelector('[data-add-to-cart-variant]');
    const button = block.querySelector('[data-add-to-cart-submit]');
    const statusNode = block.querySelector('[data-add-to-cart-status]');
    const variant = getVariantState(input);

    if (!button) {
      return;
    }

    button.disabled = !variant.id || variant.available !== true;

    if (!variant.id) {
      updateStatus(statusNode, 'The selected product does not currently expose a purchasable variant.');
      return;
    }

    if (variant.available !== true) {
      updateStatus(statusNode, 'The selected variant is currently unavailable.');
      return;
    }

    updateStatus(statusNode, '');
  }

  async function handleSubmit(block) {
    const input = block.querySelector('[data-add-to-cart-variant]');
    const button = block.querySelector('[data-add-to-cart-submit]');
    const statusNode = block.querySelector('[data-add-to-cart-status]');
    const variant = getVariantState(input);

    if (!button) {
      return;
    }

    if (!variant.id) {
      updateStatus(statusNode, 'The selected product does not currently expose a purchasable variant.');
      return;
    }

    if (variant.available !== true) {
      updateStatus(statusNode, 'The selected variant is currently unavailable.');
      return;
    }

    updateStatus(statusNode, '');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          items: [
            {
              id: variant.id,
              quantity: 1
            }
          ]
        })
      });

      if (!response.ok) {
        let message = 'Unable to add this item to the cart.';

        try {
          const payload = await response.json();
          console.error('[Kites add-to-cart] cart/add.js rejected request', {
            status: response.status,
            productHandle: block.dataset.addToCartProductHandle || '',
            variantId: variant.id,
            payload: payload
          });

          if (payload && payload.description) {
            message = payload.description;
          }
        } catch (error) {
          console.error('[Kites add-to-cart] cart/add.js rejected request', {
            status: response.status,
            productHandle: block.dataset.addToCartProductHandle || '',
            variantId: variant.id
          });
          // Ignore parse failures and keep the fallback message.
        }

        throw new Error(message);
      }

      const payload = await response.json();
      logDebug('cart/add.js payload received', payload);
      updateStatus(statusNode, '');

      const cartRuntime = getCartRuntime();

      if (cartRuntime) {
        if (typeof cartRuntime.refreshNow === 'function') {
          await cartRuntime.refreshNow();
        }
        cartRuntime.refresh({ source: 'add-to-cart' });
      } else {
        logDebug('cart runtime unavailable, dispatching fallback event');
        document.dispatchEvent(new CustomEvent('cart:refresh-request'));
      }
    } catch (error) {
      logDebug('add to cart failed', error instanceof Error ? error.message : error);
      updateStatus(statusNode, error instanceof Error ? error.message : 'Unable to add this item to the cart.');
    } finally {
      button.removeAttribute('aria-busy');
      syncButtonState(block);
    }
  }

  function initAddToCartBlocks(root) {
    const scope = root || document;
    const blocks = scope.querySelectorAll('[data-add-to-cart-block]');

    blocks.forEach((block) => {
      if (block.dataset.addToCartReady === 'true') {
        syncButtonState(block);
        return;
      }

      const input = block.querySelector('[data-add-to-cart-variant]');
      const button = block.querySelector('[data-add-to-cart-submit]');

      if (input && input.tagName === 'SELECT') {
        input.addEventListener('change', function () {
          syncButtonState(block);
        });
      }

      if (button) {
        button.addEventListener('click', function () {
          handleSubmit(block);
        });
      }

      block.dataset.addToCartReady = 'true';
      syncButtonState(block);
    });
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAddToCartBlocks(event.target);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAddToCartBlocks(document);
    });
  } else {
    initAddToCartBlocks(document);
  }
})();
