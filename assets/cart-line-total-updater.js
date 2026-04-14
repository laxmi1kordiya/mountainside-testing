/**
 * Updates cart line item totals in real-time when quantity changes
 * Works globally across all cart items
 * Optimized with debouncing to handle rapid input
 */
(function() {
  'use strict';

  // Debounce timer for cart total updates
  var cartTotalDebounceTimer = null;
  var lineTotalDebounceTimers = {};

  // Simple debounce function
  function debounce(func, wait, key) {
    return function() {
      var context = this;
      var args = arguments;

      if (key) {
        if (lineTotalDebounceTimers[key]) {
          clearTimeout(lineTotalDebounceTimers[key]);
        }
        lineTotalDebounceTimers[key] = setTimeout(function() {
          func.apply(context, args);
          delete lineTotalDebounceTimers[key];
        }, wait);
      } else {
        if (cartTotalDebounceTimer) {
          clearTimeout(cartTotalDebounceTimer);
        }
        cartTotalDebounceTimer = setTimeout(function() {
          func.apply(context, args);
        }, wait);
      }
    };
  }

  // Store unit prices for each cart item using data attributes
  function storeUnitPrices() {
    const cartItems = document.querySelectorAll('[data-cartitem]');

    cartItems.forEach(cartItem => {
      // Get unit prices from Shopify data attributes (already in cents)
      const unitPriceCents = parseInt(cartItem.getAttribute('data-cartitem-price'));
      const originalUnitPriceCents = parseInt(cartItem.getAttribute('data-cartitem-original-price'));

      if (!unitPriceCents) return;

      // Store unit prices as data attributes (no calculation needed)
      cartItem.setAttribute('data-unit-price', unitPriceCents);

      if (originalUnitPriceCents) {
        cartItem.setAttribute('data-original-unit-price', originalUnitPriceCents);
      }
    });
  }

  // Format cents to money string
  function formatMoney(cents) {
    if (window.Shopify && window.Shopify.formatMoney) {
      return window.Shopify.formatMoney(cents, window.Shopify.money_format || '${{amount}}');
    }

    const value = (cents / 100).toFixed(2);
    return '$' + value;
  }

  // Update line total for a cart item (immediate for visual feedback)
  function updateLineTotal(cartItem, newQuantity) {
    const unitPrice = parseInt(cartItem.getAttribute('data-unit-price'));
    const originalUnitPrice = parseInt(cartItem.getAttribute('data-original-unit-price'));

    if (!unitPrice) return;

    const qty = parseInt(newQuantity) || 1;

    // Validate quantity is reasonable (prevent extreme values)
    if (qty < 0 || qty > 9999) return;

    const lineTotalEl = cartItem.querySelector('[data-cartitem-total]');
    const originalLinePriceEl = cartItem.querySelector('.original-price');

    // Update final line total (immediate for instant feedback)
    if (lineTotalEl) {
      const newLineTotal = unitPrice * qty;
      lineTotalEl.innerHTML = formatMoney(newLineTotal);
    }

    // Update original line price (crossed out)
    if (originalLinePriceEl && originalUnitPrice) {
      const newOriginalTotal = originalUnitPrice * qty;
      originalLinePriceEl.innerHTML = formatMoney(newOriginalTotal);
    }

    // Debounce cart total and progress bar update (150ms)
    debouncedCartTotalUpdate();
  }

  // Debounced version of cart total update
  var debouncedCartTotalUpdate = (function() {
    var timer = null;
    return function() {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(function() {
        updateCartTotalAndProgressBar();
        timer = null;
      }, 150);
    };
  })();

  // Calculate cart total and update progress bar
  function updateCartTotalAndProgressBar() {
    const cartItems = document.querySelectorAll('[data-cartitem]');
    let totalCents = 0;

    // Calculate total from all cart items
    cartItems.forEach(cartItem => {
      // Try both possible data attributes for unit price
      const unitPrice = parseInt(cartItem.getAttribute('data-unit-price')) ||
                        parseInt(cartItem.getAttribute('data-cartitem-price')) || 0;

      // Get quantity from visible field first, then fallback
      const visibleField = cartItem.querySelector('.form-field.visible [data-cartitem-quantity]');
      const qtyEl = visibleField || cartItem.querySelector('[data-cartitem-quantity]');
      const qty = qtyEl ? (parseInt(qtyEl.value) || 0) : 1;

      if (unitPrice && qty > 0) {
        totalCents += unitPrice * qty;
      }
    });

    // Update cart total display
    const cartTotalElements = document.querySelectorAll('[data-cart-total]');
    cartTotalElements.forEach(el => {
      el.innerHTML = formatMoney(totalCents);
    });

    // Use global updateShippingBar if available (from static-cart.liquid)
    // This ensures both systems stay in sync
    if (window.updateShippingBar) {
      window.updateShippingBar(totalCents);
    }
  }

  // Handle quantity change with optional debounce
  function handleQuantityChange(qtyInput, immediate) {
    const cartItem = qtyInput.closest('[data-cartitem]');
    if (!cartItem) return;

    const newQuantity = qtyInput.value;

    // Validate input before processing
    if (newQuantity === '' || isNaN(parseInt(newQuantity))) return;

    updateLineTotal(cartItem, newQuantity);
  }

  // Debounced handler for input events (typing)
  var debouncedInputHandler = (function() {
    var timers = {};
    return function(qtyInput) {
      const cartItem = qtyInput.closest('[data-cartitem]');
      if (!cartItem) return;

      const itemKey = cartItem.getAttribute('data-cartitem-key') || 'default';

      if (timers[itemKey]) {
        clearTimeout(timers[itemKey]);
      }

      timers[itemKey] = setTimeout(function() {
        handleQuantityChange(qtyInput);
        delete timers[itemKey];
      }, 100); // 100ms debounce for visual updates
    };
  })();

  // Attach event listeners using event delegation
  function init() {
    // Wait for cart to be available
    const waitForCart = setInterval(function() {
      const cartItems = document.querySelectorAll('[data-cartitem]');

      if (cartItems.length > 0) {
        clearInterval(waitForCart);

        // Store initial unit prices
        storeUnitPrices();

        // Listen for quantity changes on document (change = final value)
        document.addEventListener('change', function(event) {
          if (event.target.matches('[data-cartitem-quantity]')) {
            handleQuantityChange(event.target, true);
          }
        });

        // Listen for input events (typing) with debounce
        document.addEventListener('input', function(event) {
          if (event.target.matches('[data-quantity-input]')) {
            debouncedInputHandler(event.target);
          }
        });

        // Re-initialize when cart updates (debounced to prevent rapid re-init)
        const cartItemList = document.querySelector('[data-cart-item-list]');
        if (cartItemList) {
          var reinitTimer = null;
          const observer = new MutationObserver(function() {
            if (reinitTimer) {
              clearTimeout(reinitTimer);
            }
            reinitTimer = setTimeout(function() {
              storeUnitPrices();
              reinitTimer = null;
            }, 300);
          });

          observer.observe(cartItemList, {
            childList: true,
            subtree: true
          });
        }
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(function() {
      clearInterval(waitForCart);
    }, 5000);
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
