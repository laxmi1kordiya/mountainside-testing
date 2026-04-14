/**
 * Collection Category Carousel - Standalone JS
 * Handles: Tab switching, carousel navigation, autoplay, quantity selectors, Add to Cart
 * All ATC/quantity logic is self-contained (no dependency on product-card-buttons.js)
 */
(function() {
  'use strict';

  var sections = document.querySelectorAll('[data-ccc-section]');
  if (!sections.length) return;

  sections.forEach(function(section) {
    initSection(section);
  });

  function initSection(section) {
    // Read settings from data attributes
    var cardGap = parseInt(section.dataset.cccCardGap) || 15;
    var autoplaySpeed = (parseInt(section.dataset.cccAutoplaySpeed) || 4) * 1000;
    var enableAutoplay = section.dataset.cccEnableAutoplay === 'true';
    var viewAllTemplate = section.dataset.cccViewAllText || 'View All [collection]';

    // =====================
    // Collection Circles Tab Switching
    // =====================
    var circles = section.querySelectorAll('[data-ccc-circle]');
    var panels = section.querySelectorAll('[data-ccc-panel]');
    var viewAllBtn = section.querySelector('[data-ccc-view-all]');
    var viewAllText = section.querySelector('[data-ccc-view-all-text]');

    function switchTab(index) {
      circles.forEach(function(c) { c.classList.remove('ccc__circle--active'); });
      var activeCircle = section.querySelector('[data-ccc-index="' + index + '"]');
      if (activeCircle) activeCircle.classList.add('ccc__circle--active');

      panels.forEach(function(p) { p.classList.remove('ccc__panel--active'); });
      var activePanel = section.querySelector('[data-ccc-panel="' + index + '"]');
      if (activePanel) {
        activePanel.classList.add('ccc__panel--active');
        var container = activePanel.querySelector('[data-ccc-products-container]');
        if (container) container.scrollLeft = 0;
        updateProductArrowVisibility(activePanel);
      }

      if (viewAllBtn && activeCircle) {
        var collTitle = activeCircle.getAttribute('data-ccc-title');
        var collUrl = activeCircle.getAttribute('data-ccc-url');
        viewAllBtn.href = collUrl;
        if (viewAllText) {
          viewAllText.textContent = viewAllTemplate.replace('[collection]', collTitle);
        }
      }

      stopAutoplay();
      startAutoplay();
    }

    circles.forEach(function(circle) {
      circle.addEventListener('click', function() {
        var index = this.getAttribute('data-ccc-index');
        switchTab(index);
      });
    });

    // =====================
    // Collection Circles Carousel Nav
    // =====================
    var circlesContainer = section.querySelector('[data-ccc-circles-container]');
    var circlesPrev = section.querySelector('[data-ccc-circle-prev]');
    var circlesNext = section.querySelector('[data-ccc-circle-next]');

    function updateCircleArrowVisibility() {
      if (!circlesContainer) return;
      var scrollLeft = circlesContainer.scrollLeft;
      var maxScroll = circlesContainer.scrollWidth - circlesContainer.offsetWidth;

      if (circlesPrev) {
        if (scrollLeft <= 5) {
          circlesPrev.classList.add('ccc__arrow--disabled');
        } else {
          circlesPrev.classList.remove('ccc__arrow--disabled');
        }
      }
      if (circlesNext) {
        if (scrollLeft >= maxScroll - 5) {
          circlesNext.classList.add('ccc__arrow--disabled');
        } else {
          circlesNext.classList.remove('ccc__arrow--disabled');
        }
      }
    }

    if (circlesPrev) {
      circlesPrev.addEventListener('click', function() {
        circlesContainer.scrollBy({ left: -150, behavior: 'smooth' });
      });
    }
    if (circlesNext) {
      circlesNext.addEventListener('click', function() {
        circlesContainer.scrollBy({ left: 150, behavior: 'smooth' });
      });
    }
    if (circlesContainer) {
      circlesContainer.addEventListener('scroll', updateCircleArrowVisibility, { passive: true });
      updateCircleArrowVisibility();
    }

    // =====================
    // Product Carousel Nav
    // =====================
    function getActivePanel() {
      return section.querySelector('.ccc__panel--active');
    }

    function getActiveProductContainer() {
      var panel = getActivePanel();
      return panel ? panel.querySelector('[data-ccc-products-container]') : null;
    }

    function getCardWidth() {
      var panel = getActivePanel();
      if (!panel) return 220;
      var card = panel.querySelector('[data-ccc-card]');
      return card ? card.offsetWidth + cardGap : 220;
    }

    function updateProductArrowVisibility(panel) {
      if (!panel) panel = getActivePanel();
      if (!panel) return;

      var container = panel.querySelector('[data-ccc-products-container]');
      var prevArrow = panel.querySelector('[data-ccc-product-prev]');
      var nextArrow = panel.querySelector('[data-ccc-product-next]');

      if (!container) return;

      var scrollLeft = container.scrollLeft;
      var maxScroll = container.scrollWidth - container.offsetWidth;

      if (prevArrow) {
        if (scrollLeft <= 5) {
          prevArrow.classList.add('ccc__arrow--disabled');
        } else {
          prevArrow.classList.remove('ccc__arrow--disabled');
        }
      }
      if (nextArrow) {
        if (scrollLeft >= maxScroll - 5) {
          nextArrow.classList.add('ccc__arrow--disabled');
        } else {
          nextArrow.classList.remove('ccc__arrow--disabled');
        }
      }
    }

    // Delegated click handlers for product arrows
    section.addEventListener('click', function(e) {
      var prevBtn = e.target.closest('[data-ccc-product-prev]');
      var nextBtn = e.target.closest('[data-ccc-product-next]');

      if (prevBtn) {
        var container = getActiveProductContainer();
        if (container) container.scrollBy({ left: -getCardWidth(), behavior: 'smooth' });
      }
      if (nextBtn) {
        var container = getActiveProductContainer();
        if (container) container.scrollBy({ left: getCardWidth(), behavior: 'smooth' });
      }
    });

    // Scroll listener for product arrow visibility
    panels.forEach(function(panel) {
      var container = panel.querySelector('[data-ccc-products-container]');
      if (container) {
        container.addEventListener('scroll', function() {
          updateProductArrowVisibility(panel);
        }, { passive: true });
      }
    });

    updateProductArrowVisibility();

    // =====================
    // Autoplay
    // =====================
    var autoplayInterval = null;
    var isHovering = false;
    var scrollTimeout = null;

    function startAutoplay() {
      if (!enableAutoplay || autoplaySpeed <= 0 || isHovering) return;
      stopAutoplay();
      autoplayInterval = setInterval(function() {
        var container = getActiveProductContainer();
        if (!container) return;
        if (container.scrollLeft + container.offsetWidth >= container.scrollWidth - 10) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: getCardWidth(), behavior: 'smooth' });
        }
      }, autoplaySpeed);
    }

    function stopAutoplay() {
      if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
      }
    }

    function handleMouseEnter() {
      isHovering = true;
      stopAutoplay();
    }

    function handleMouseLeave() {
      isHovering = false;
      startAutoplay();
    }

    section.addEventListener('mouseenter', handleMouseEnter);
    section.addEventListener('mouseleave', handleMouseLeave);

    panels.forEach(function(panel) {
      var container = panel.querySelector('[data-ccc-products-container]');
      if (container) {
        container.addEventListener('touchstart', function() {
          isHovering = true;
          stopAutoplay();
        }, { passive: true });

        container.addEventListener('touchend', function() {
          setTimeout(function() {
            isHovering = false;
            if (!isHovering) startAutoplay();
          }, 3000);
        }, { passive: true });

        container.addEventListener('scroll', function() {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(function() {
            if (!isHovering) startAutoplay();
          }, 3000);
        }, { passive: true });
      }
    });

    startAutoplay();

    // Recalculate on resize
    var resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        updateCircleArrowVisibility();
        updateProductArrowVisibility();
      }, 250);
    });

  } // end initSection

  // =========================================================
  // Quantity Selectors & Add to Cart (global, event delegation)
  // =========================================================

  // --- Quantity increase ---
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-ccc-qty-increase]');
    if (!btn) return;
    e.preventDefault();
    var wrapper = btn.closest('[data-ccc-qty-selector]');
    if (!wrapper) return;
    var input = wrapper.querySelector('[data-ccc-qty-value]');
    if (!input) return;

    var currentQty = parseInt(input.value) || 1;
    var newQty = currentQty + 1;
    var atcBtn = wrapper.closest('.ccc__buttons').querySelector('[data-ccc-atc]');
    var maxQty = atcBtn && atcBtn.dataset.inventoryQuantity ? parseInt(atcBtn.dataset.inventoryQuantity) : null;

    if (maxQty && !isNaN(maxQty) && newQty > maxQty) {
      newQty = maxQty;
    }
    input.value = newQty;
    updateCccQtyButtonStates(wrapper, newQty, maxQty);
  });

  // --- Quantity decrease ---
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-ccc-qty-decrease]');
    if (!btn) return;
    e.preventDefault();
    var wrapper = btn.closest('[data-ccc-qty-selector]');
    if (!wrapper) return;
    var input = wrapper.querySelector('[data-ccc-qty-value]');
    if (!input) return;

    var currentQty = parseInt(input.value) || 1;
    var newQty = currentQty - 1;
    if (newQty < 1) newQty = 1;
    input.value = newQty;

    var atcBtn = wrapper.closest('.ccc__buttons').querySelector('[data-ccc-atc]');
    var maxQty = atcBtn && atcBtn.dataset.inventoryQuantity ? parseInt(atcBtn.dataset.inventoryQuantity) : null;
    updateCccQtyButtonStates(wrapper, newQty, maxQty);
  });

  // --- Manual input change ---
  document.addEventListener('input', function(e) {
    var input = e.target.closest('[data-ccc-qty-value]');
    if (!input || input.tagName !== 'INPUT') return;
    // Just let them type; we validate on blur
  });

  document.addEventListener('blur', function(e) {
    var input = e.target;
    if (!input.hasAttribute || !input.hasAttribute('data-ccc-qty-value') || input.tagName !== 'INPUT') return;

    var value = parseInt(input.value);
    if (!value || value < 1) {
      input.value = 1;
      value = 1;
    }

    var wrapper = input.closest('[data-ccc-qty-selector]');
    if (!wrapper) return;
    var atcBtn = wrapper.closest('.ccc__buttons').querySelector('[data-ccc-atc]');
    var maxQty = atcBtn && atcBtn.dataset.inventoryQuantity ? parseInt(atcBtn.dataset.inventoryQuantity) : null;
    updateCccQtyButtonStates(wrapper, value, maxQty);
  }, true);

  // --- Update +/- button disabled states ---
  function updateCccQtyButtonStates(wrapper, currentQty, maxQty) {
    var decreaseBtn = wrapper.querySelector('[data-ccc-qty-decrease]');
    var increaseBtn = wrapper.querySelector('[data-ccc-qty-increase]');

    if (decreaseBtn) {
      decreaseBtn.disabled = currentQty <= 1;
    }
    if (increaseBtn) {
      if (maxQty && !isNaN(maxQty)) {
        increaseBtn.disabled = currentQty >= maxQty;
      } else {
        increaseBtn.disabled = false;
      }
    }
  }

  // --- Add to Cart ---
  document.addEventListener('click', function(e) {
    var button = e.target.closest('[data-ccc-atc]');
    if (!button || button.disabled) return;
    e.preventDefault();

    // Prevent rapid duplicate clicks
    var now = Date.now();
    if (button.dataset.lastClick && (now - parseInt(button.dataset.lastClick)) < 300) return;
    button.dataset.lastClick = now;

    var variantId = button.dataset.variantId;
    if (!variantId) return;

    // Find quantity input within the same card
    var card = button.closest('.ccc__card') || button.closest('.ccc__buttons');
    var qtyInput = card ? card.querySelector('[data-ccc-qty-value]') : null;

    var desiredQuantity = 1;
    var maxQty = button.dataset.inventoryQuantity ? parseInt(button.dataset.inventoryQuantity) : null;

    if (qtyInput) {
      desiredQuantity = parseInt(qtyInput.value) || 1;
      if (desiredQuantity < 1) {
        desiredQuantity = 1;
        qtyInput.value = 1;
      }
      if (maxQty && !isNaN(maxQty) && desiredQuantity > maxQty) {
        showCccInventoryAlert(maxQty);
        desiredQuantity = maxQty;
        qtyInput.value = maxQty;
        return;
      }
    }

    // Loading state
    var originalText = button.textContent;
    var textSpan = button.querySelector('span');
    if (textSpan) {
      textSpan.textContent = 'Adding...';
    } else {
      button.textContent = 'Adding...';
    }
    button.disabled = true;

    // Check cart for existing item, then add
    fetch('/cart.js')
    .then(function(response) { return response.json(); })
    .then(function(cart) {
      var existingItem = null;
      for (var i = 0; i < cart.items.length; i++) {
        if (cart.items[i].variant_id == variantId) {
          existingItem = cart.items[i];
          break;
        }
      }

      if (existingItem) {
        var newQuantity = existingItem.quantity + desiredQuantity;
        if (maxQty && !isNaN(maxQty) && newQuantity > maxQty) {
          resetButton(button, textSpan, originalText);
          showCccInventoryAlert(maxQty);
          return Promise.reject('Inventory limit exceeded');
        }

        return fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existingItem.key, quantity: newQuantity })
        })
        .then(function(response) { return response.json(); })
        .then(function(updatedCart) {
          var updatedItem = null;
          for (var i = 0; i < updatedCart.items.length; i++) {
            if (updatedCart.items[i].variant_id == variantId) {
              updatedItem = updatedCart.items[i];
              break;
            }
          }
          return { item: updatedItem, cart: updatedCart };
        });
      } else {
        return fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity: desiredQuantity })
        })
        .then(function(response) { return response.json(); })
        .then(function(addedItem) {
          return fetch('/cart.js')
            .then(function(res) { return res.json(); })
            .then(function(fullCart) {
              return { item: addedItem, cart: fullCart };
            });
        });
      }
    })
    .then(function(data) {
      resetButton(button, textSpan, originalText);

      // Update cart count in header
      updateCccCartCount(data.cart.item_count);

      // Show cart notification if available
      showCccCartNotification(data.item, data.cart);

      // Dispatch global event so other scripts (product-card-buttons.js) can sync
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: data.cart }));
    })
    .catch(function(error) {
      if (error !== 'Inventory limit exceeded') {
        console.error('CCC: Error adding to cart:', error);
        alert('Error adding product to cart. Please try again.');
      }
      resetButton(button, textSpan, originalText);
    });
  });

  function resetButton(button, textSpan, originalText) {
    if (textSpan) {
      textSpan.textContent = originalText;
    } else {
      button.textContent = originalText;
    }
    button.disabled = false;
  }

  function updateCccCartCount(count) {
    var headerCartCount = document.querySelector('[data-header-cart-count]');
    if (headerCartCount) {
      if (count > 0) {
        headerCartCount.setAttribute('data-header-cart-count', count);
        headerCartCount.classList.add('visible');
      } else {
        headerCartCount.setAttribute('data-header-cart-count', '');
        headerCartCount.classList.remove('visible');
      }
    }
    var cartCountElements = document.querySelectorAll('[data-cart-count], .cart-link--count');
    cartCountElements.forEach(function(el) {
      el.textContent = count;
    });

    if (typeof jQuery !== 'undefined') {
      var $header = jQuery('[data-section-type="static-header"]');
      if ($header.length) {
        $header.trigger('cartcount:update', { response: { item_count: count } });
      }
    }
  }

  function showCccCartNotification(itemData, cart) {
    var cartNotification = document.getElementById('cart-notification');
    if (!cartNotification || !cart || !itemData) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    var imageContainer = cartNotification.querySelector('[data-cart-notification-image]');
    var titleEl = cartNotification.querySelector('[data-cart-notification-title]');
    var variantEl = cartNotification.querySelector('[data-cart-notification-variant]');
    var qtyEl = cartNotification.querySelector('[data-cart-notification-qty]');
    var subtotalEl = cartNotification.querySelector('[data-cart-notification-subtotal]');
    var viewCartBtn = cartNotification.querySelector('.cart-notification__btn--view-cart');

    if (imageContainer) {
      if (itemData.featured_image && itemData.featured_image.url) {
        imageContainer.innerHTML = '<img src="' + itemData.featured_image.url + '" alt="' + (itemData.product_title || '') + '">';
      } else if (itemData.image) {
        imageContainer.innerHTML = '<img src="' + itemData.image + '" alt="' + (itemData.product_title || itemData.title || '') + '">';
      }
    }
    if (titleEl) titleEl.textContent = itemData.product_title || itemData.title || '';
    if (variantEl) {
      if (itemData.variant_title && itemData.variant_title !== 'Default Title') {
        variantEl.textContent = itemData.variant_title;
        variantEl.style.display = 'block';
      } else {
        variantEl.style.display = 'none';
      }
    }
    if (qtyEl && itemData.quantity && itemData.price) {
      qtyEl.textContent = itemData.quantity + ' x ' + formatCccMoney(itemData.price);
    }
    if (subtotalEl && cart.total_price !== undefined) {
      subtotalEl.textContent = formatCccMoney(cart.total_price);
    }
    if (viewCartBtn && cart.item_count !== undefined) {
      viewCartBtn.textContent = 'View cart (' + cart.item_count + ')';
    }

    setTimeout(function() {
      cartNotification.classList.add('cart-notification--visible');
    }, 300);

    if (window._cccNotificationTimeout) clearTimeout(window._cccNotificationTimeout);
    window._cccNotificationTimeout = setTimeout(function() {
      cartNotification.classList.remove('cart-notification--visible');
    }, 5300);
  }

  function showCccInventoryAlert(maxQty) {
    var existingAlert = document.querySelector('.inventory-alert-overlay');
    if (existingAlert) existingAlert.remove();

    var overlay = document.createElement('div');
    overlay.className = 'inventory-alert-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;animation:fadeIn 0.2s ease;';

    var alertBox = document.createElement('div');
    alertBox.style.cssText = 'background:white;padding:24px;border-radius:12px;max-width:400px;width:90%;box-shadow:0 10px 40px rgba(0,0,0,0.3);animation:slideUp 0.3s ease;text-align:center;';

    var icon = document.createElement('div');
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#ffc107"/></svg>';
    icon.style.cssText = 'width:48px;height:48px;margin:0 auto 16px;';

    var title = document.createElement('h3');
    title.textContent = 'Limited Stock Available';
    title.style.cssText = 'margin:0 0 12px;font-size:20px;font-weight:600;color:#333;';

    var message = document.createElement('p');
    message.innerHTML = 'Only <strong style="color:#333;font-weight:700;">' + maxQty + '</strong> units are currently available for this product.';
    message.style.cssText = 'margin:0 0 20px;font-size:14px;color:#666;line-height:1.5;';

    var btn = document.createElement('button');
    btn.textContent = 'Got it';
    btn.style.cssText = 'background:#367b36;color:white;border:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s ease;';
    btn.onmouseover = function() { this.style.background = '#4dbe4d'; };
    btn.onmouseout = function() { this.style.background = '#367b36'; };
    btn.onclick = function() {
      overlay.style.opacity = '0';
      setTimeout(function() { overlay.remove(); }, 200);
    };

    alertBox.appendChild(icon);
    alertBox.appendChild(title);
    alertBox.appendChild(message);
    alertBox.appendChild(btn);
    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);

    overlay.onclick = function(e) {
      if (e.target === overlay) btn.onclick();
    };

    if (!document.getElementById('ccc-alert-animations')) {
      var style = document.createElement('style');
      style.id = 'ccc-alert-animations';
      style.textContent = '@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
      document.head.appendChild(style);
    }
  }

  function formatCccMoney(cents) {
    if (typeof cents === 'undefined' || cents === null) return '$0.00';
    return '$' + (cents / 100).toFixed(2);
  }

})();
