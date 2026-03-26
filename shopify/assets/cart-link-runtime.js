(function () {
  const debugEnabled = window.location.search.indexOf('cartDebug=1') !== -1;
  const refreshDelays = [0, 250, 750, 1500];
  let pendingRefreshTimers = [];

  function logDebug(message, payload) {
    if (!debugEnabled || !window.console) {
      return;
    }

    if (typeof payload === 'undefined') {
      console.log('[Kites cart] ' + message);
      return;
    }

    console.log('[Kites cart] ' + message, payload);
  }

  function renderCartText(template, count) {
    const normalizedTemplate = template && template.length > 0 ? template : 'Cart ({count})';

    if (normalizedTemplate.indexOf('{count}') === -1) {
      return normalizedTemplate + ' ' + count;
    }

    return normalizedTemplate.replace(/\{count\}/g, String(count));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function updateCartText(link, count) {
    const template = link.dataset.cartTextTemplate || 'Cart ({count})';
    const text = renderCartText(template, count);
    const textNode = link.querySelector('[data-cart-link-text]');
    const titleNode = document.querySelector('[data-cart-drawer-title]');

    if (textNode) {
      textNode.textContent = text;
    }

    if (titleNode) {
      titleNode.textContent = text;
    }

    link.setAttribute('aria-label', text);
  }

  function getConfig(link) {
    return {
      emptyText: link ? link.dataset.cartEmptyText || '' : '',
      removeText: link ? link.dataset.cartRemoveText || '' : ''
    };
  }

  function getCartLink() {
    return document.querySelector('[data-cart-link]');
  }

  function getDrawer() {
    return document.querySelector('[data-cart-drawer]');
  }

  function getDrawerItems() {
    return document.querySelector('[data-cart-drawer-items]');
  }

  function getDrawerEmpty() {
    return document.querySelector('[data-cart-drawer-empty]');
  }

  function getCheckoutLink() {
    return document.querySelector('[data-cart-drawer-checkout]');
  }

  function setDrawerOpen(isOpen) {
    const drawer = getDrawer();

    if (!drawer) {
      return;
    }

    drawer.classList.toggle('is-open', isOpen);
    drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.documentElement.classList.toggle('cart-drawer-open', isOpen);
  }

  function getCartItemImage(item) {
    if (item.featured_image && item.featured_image.url) {
      return {
        src: item.featured_image.url,
        alt: item.featured_image.alt || item.product_title || item.title || ''
      };
    }

    if (item.image) {
      return {
        src: item.image,
        alt: item.product_title || item.title || ''
      };
    }

    return null;
  }

  function renderCartItem(item, config) {
    const image = getCartItemImage(item);
    const imageMarkup = image
      ? '<img class="cart-drawer-item__image" src="' + escapeHtml(image.src) + '" alt="' + escapeHtml(image.alt) + '" loading="lazy">'
      : '<div class="cart-drawer-item__image cart-drawer-item__image--placeholder" aria-hidden="true"></div>';
    const removeMarkup = config.removeText
      ? '<button type="button" class="cart-drawer-item__remove" data-cart-remove>' + escapeHtml(config.removeText) + '</button>'
      : '';

    return (
      '<article class="cart-drawer-item" data-cart-item-key="' + escapeHtml(item.key) + '">' +
        '<div class="cart-drawer-item__media">' + imageMarkup + '</div>' +
        '<div class="cart-drawer-item__content">' +
          '<p class="cart-drawer-item__title">' + escapeHtml(item.product_title || item.title || 'Product') + '</p>' +
          '<div class="cart-drawer-item__controls">' +
            '<div class="cart-drawer-item__quantity" aria-label="Quantity controls">' +
              '<button type="button" class="cart-drawer-item__quantity-button" data-cart-quantity-change="-1" aria-label="Decrease quantity">-</button>' +
              '<span class="cart-drawer-item__quantity-value">' + escapeHtml(item.quantity) + '</span>' +
              '<button type="button" class="cart-drawer-item__quantity-button" data-cart-quantity-change="1" aria-label="Increase quantity">+</button>' +
            '</div>' +
            removeMarkup +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderCart(cart) {
    const link = getCartLink();
    const itemsNode = getDrawerItems();
    const emptyNode = getDrawerEmpty();
    const checkoutLink = getCheckoutLink();
    const config = getConfig(link);
    const count = cart && typeof cart.item_count === 'number' ? cart.item_count : 0;

    if (link) {
      updateCartText(link, count);
    }

    if (!itemsNode) {
      return;
    }

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      itemsNode.innerHTML = '';
      if (emptyNode) {
        emptyNode.hidden = config.emptyText === '';
      }
      if (checkoutLink) {
        checkoutLink.classList.add('is-disabled');
        checkoutLink.setAttribute('aria-disabled', 'true');
        checkoutLink.setAttribute('tabindex', '-1');
      }
      return;
    }

    itemsNode.innerHTML = cart.items.map(function (item) {
      return renderCartItem(item, config);
    }).join('');
    if (emptyNode) {
      emptyNode.hidden = true;
    }
    if (checkoutLink) {
      checkoutLink.classList.remove('is-disabled');
      checkoutLink.removeAttribute('aria-disabled');
      checkoutLink.removeAttribute('tabindex');
    }
  }

  async function fetchCart() {
    const response = await fetch(window.Shopify.routes.root + 'cart.js?ts=' + Date.now(), {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      logDebug('cart.js request failed', { status: response.status, statusText: response.statusText });
      throw new Error('Failed to load cart state.');
    }

    const cart = await response.json();
    logDebug('cart.js payload received', {
      itemCount: cart && cart.item_count,
      itemKeys: cart && Array.isArray(cart.items) ? cart.items.map(function (item) {
        return item.key;
      }) : []
    });
    return cart;
  }

  async function refreshCart() {
    try {
      const cart = await fetchCart();
      window.KitesCart = window.KitesCart || {};
      window.KitesCart.lastState = cart;
      renderCart(cart);
      document.dispatchEvent(new CustomEvent('cart:state-changed', { detail: cart }));
    } catch (error) {
      logDebug('cart refresh failed', error instanceof Error ? error.message : error);
      // Keep the current UI if cart refresh fails.
    }
  }

  function clearScheduledRefreshes() {
    pendingRefreshTimers.forEach(function (timerId) {
      window.clearTimeout(timerId);
    });
    pendingRefreshTimers = [];
  }

  function scheduleRefresh(options) {
    const source = options && options.source ? options.source : 'unknown';

    clearScheduledRefreshes();
    logDebug('scheduling cart refreshes', { source: source, delays: refreshDelays });

    refreshDelays.forEach(function (delay) {
      if (delay === 0) {
        refreshCart();
        return;
      }

      const timerId = window.setTimeout(function () {
        refreshCart();
        pendingRefreshTimers = pendingRefreshTimers.filter(function (activeTimerId) {
          return activeTimerId !== timerId;
        });
      }, delay);

      pendingRefreshTimers.push(timerId);
    });
  }

  async function changeCartItemQuantity(key, quantity) {
    const response = await fetch(window.Shopify.routes.root + 'cart/change.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        id: key,
        quantity: quantity
      })
    });

    if (!response.ok) {
      throw new Error('Unable to update this cart item.');
    }

    return response.json();
  }

  function setDrawerBusy(isBusy) {
    const drawer = getDrawer();

    if (!drawer) {
      return;
    }

    drawer.classList.toggle('is-busy', isBusy);
  }

  async function handleDrawerClick(event) {
    const changeButton = event.target.closest('[data-cart-quantity-change]');
    const removeButton = event.target.closest('[data-cart-remove]');

    if (!changeButton && !removeButton) {
      return;
    }

    const itemNode = event.target.closest('[data-cart-item-key]');

    if (!itemNode) {
      return;
    }

    const key = itemNode.getAttribute('data-cart-item-key');
    const quantityNode = itemNode.querySelector('.cart-drawer-item__quantity-value');
    const currentQuantity = quantityNode ? Number(quantityNode.textContent) : 0;

    if (!key || !currentQuantity) {
      return;
    }

    const nextQuantity = removeButton ? 0 : currentQuantity + Number(changeButton.getAttribute('data-cart-quantity-change'));

    if (nextQuantity < 0) {
      return;
    }

    setDrawerBusy(true);

    try {
      const cart = await changeCartItemQuantity(key, nextQuantity);
      renderCart(cart);
    } catch (error) {
      scheduleRefresh();
    } finally {
      setDrawerBusy(false);
    }
  }

  function initCartDrawer() {
    const link = getCartLink();
    const drawer = getDrawer();

    if (!link || !drawer || link.dataset.cartReady === 'true') {
      scheduleRefresh({ source: 'init-repeat' });
      return;
    }

    const overlay = drawer.querySelector('[data-cart-drawer-overlay]');
    const closeButtons = drawer.querySelectorAll('[data-cart-drawer-close]');
    const itemsNode = getDrawerItems();
    const checkoutLink = getCheckoutLink();

    link.addEventListener('click', function () {
      const nextOpenState = !drawer.classList.contains('is-open');
      setDrawerOpen(nextOpenState);

      if (nextOpenState) {
        scheduleRefresh({ source: 'drawer-open' });
      }
    });

    if (overlay) {
      overlay.addEventListener('click', function () {
        setDrawerOpen(false);
      });
    }

    closeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setDrawerOpen(false);
      });
    });

    if (itemsNode) {
      itemsNode.addEventListener('click', handleDrawerClick);
    }

    if (checkoutLink) {
      checkoutLink.addEventListener('click', function (event) {
        if (checkoutLink.classList.contains('is-disabled')) {
          event.preventDefault();
        }
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
        setDrawerOpen(false);
      }
    });

    link.dataset.cartReady = 'true';
    scheduleRefresh({ source: 'init' });
  }

  window.KitesCart = window.KitesCart || {};
  window.KitesCart.refresh = scheduleRefresh;
  window.KitesCart.refreshNow = refreshCart;

  document.addEventListener('cart:refresh-request', function () {
    scheduleRefresh({ source: 'event' });
  });
  window.addEventListener('pageshow', function () {
    scheduleRefresh({ source: 'pageshow' });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartDrawer);
  } else {
    initCartDrawer();
  }
})();
