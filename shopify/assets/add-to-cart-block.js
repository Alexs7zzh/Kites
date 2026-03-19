(function () {
  function getVariantState(input) {
    if (!input) {
      return { id: '' };
    }

    return {
      id: input.value
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

    button.disabled = !variant.id;

    if (!variant.id) {
      updateStatus(statusNode, 'The selected product does not currently expose a purchasable variant.');
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

    updateStatus(statusNode, '');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          items: [
            {
              id: Number(variant.id),
              quantity: 1
            }
          ]
        })
      });

      if (!response.ok) {
        let message = 'Unable to add this item to the cart.';

        try {
          const payload = await response.json();

          if (payload && payload.description) {
            message = payload.description;
          }
        } catch (error) {
          // Ignore parse failures and keep the fallback message.
        }

        throw new Error(message);
      }

      await response.json();
      updateStatus(statusNode, '');
      document.dispatchEvent(new CustomEvent('cart:refresh-request'));
    } catch (error) {
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
