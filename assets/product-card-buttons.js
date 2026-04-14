/**
 * Product Card Buttons - OPTIMIZED V7
 * Features: Full quantity sync across all locations, No duplication, Real-time updates
 * Supports: Collection pages, Product pages, Sticky bar, Best Sellers carousel, Featured Products carousel with complete synchronization
 */
(function() {
  'use strict';

  var currentCartCount = 0;
  var cartNotification = null;
  var notificationTimeout = null;
  var cartItems = {}; // Store cart items by variant ID for quick lookup

  function initProductCardButtons() {
    // Capture Shopify money format for price formatting
    // Try to find it from meta tags or Shopify's global variable
    if (!window.shop_money_format) {
      var moneyFormatEl = document.querySelector('meta[name="shop-money-format"]');
      if (moneyFormatEl) {
        window.shop_money_format = moneyFormatEl.getAttribute('content');
      } else if (window.Shopify && window.Shopify.money_format) {
        window.shop_money_format = window.Shopify.money_format;
      } else {
        // Fallback to USD
        window.shop_money_format = '${{amount}}';
      }
    }

    // Load current cart state on page load and set initial quantities
    loadCartStateAndSyncQuantities();

    // Initialize cart notification
    cartNotification = document.getElementById('cart-notification');

    // Initialize grid variant availability - with small delay to ensure all elements are in DOM
    var initGridVariants = function() {
      var gridVariantRows = document.querySelectorAll('[data-product-variants-grid]');

      if (gridVariantRows.length === 0) {
        // No variants found on first try, check again in a moment (for dynamically loaded content)
        setTimeout(initGridVariants, 500);
        return;
      }

      gridVariantRows.forEach(function(row) {
        var productId = row.dataset.productVariantsGrid;
        // Scope all queries to this specific product card to avoid conflicts
        // when the same product appears in multiple places (grid + recently viewed, etc.)
        var cardEl = row.closest('[data-product-item]');
        if (!cardEl) return;

        buildVariantLookupMap(productId, cardEl);
        updateGridVariantAvailability(productId, cardEl);
        updateATCButtonWithSelectedVariant(productId, cardEl);
        updateGridVariantPrice(productId, cardEl);
      });
    };

    // Run immediately and also on DOMContentLoaded in case content is added after
    initGridVariants();
    document.addEventListener('DOMContentLoaded', initGridVariants);

    // Watch for dynamically added content (carousels, recommendations, etc.)
    var observer = new MutationObserver(function(mutations) {
      var hasNewVariants = mutations.some(function(mutation) {
        return Array.from(mutation.addedNodes).some(function(node) {
          return node.nodeType === 1 && // Element node
                 (node.hasAttribute && node.hasAttribute('data-product-variants-grid') ||
                  node.querySelector && node.querySelector('[data-product-variants-grid]'));
        });
      });

      if (hasNewVariants) {
        initGridVariants();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });

    // Listen for variant changes to update product page ATC button
    document.addEventListener('variantChange', function(e) {
      if (e.detail && e.detail.variant) {
        updateProductPageAtcButton(e.detail.variant);
      }
    });

    // CRITICAL FIX: Also listen to the hidden variant select changes directly
    // This is the most reliable way to catch variant changes
    var variantSelect = document.querySelector('[data-variants]');
    if (variantSelect) {
      variantSelect.addEventListener('change', function() {
        var selectedVariantId = variantSelect.value;

        // Get variant data from the JSON embedded in the page
        var variantDataEl = document.querySelector('[data-product-variants-json]');
        if (variantDataEl) {
          try {
            var allVariants = JSON.parse(variantDataEl.textContent);
            var selectedVariant = allVariants.find(function(v) { return v.id == selectedVariantId; });
            if (selectedVariant) {
              updateProductPageAtcButton(selectedVariant);
            }
          } catch (e) {
          }
        }
      });
    }

    // Also listen for changes on individual option selects/radios
    var optionInputs = document.querySelectorAll('[data-product-option]');
    if (optionInputs.length > 0) {
      optionInputs.forEach(function(input) {
        input.addEventListener('change', function() {
          // Wait a moment for the variant select to update
          setTimeout(function() {
            if (variantSelect) {
              variantSelect.dispatchEvent(new Event('change'));
            }
          }, 50);
        });
      });
    }

    // Handle grid variant option changes - update availability dynamically
    document.addEventListener('change', function(e) {
      var gridSelect = e.target.closest('[data-product-option][data-product-id]');
      if (gridSelect && !gridSelect.closest('[data-variants]')) {
        // Scope all updates to the specific product card the user interacted with
        var cardEl = gridSelect.closest('[data-product-item]');
        if (!cardEl) return;
        var productId = gridSelect.dataset.productId;
        updateGridVariantAvailability(productId, cardEl);
        updateATCButtonWithSelectedVariant(productId, cardEl);
        updateGridVariantPrice(productId, cardEl);
      }
    });

    // Close notification button
    document.addEventListener('click', function(e) {
      var closeBtn = e.target.closest('[data-cart-notification-close]');
      if (closeBtn) {
        hideCartNotification();
      }
    });

    // Handle Add to Cart button clicks (Collection Page)
    document.addEventListener('click', function(e) {
      var atcBtn = e.target.closest('[data-product-card-atc]');
      if (atcBtn) {
        e.preventDefault();
        var qtySelector = '[data-qty-value]';
        handleAddToCart(atcBtn, qtySelector);
      }
    });

    // Handle Add to Cart button clicks (Product Page)
    document.addEventListener('click', function(e) {
      var atcBtn = e.target.closest('[data-product-page-atc]');
      if (atcBtn) {
        e.preventDefault();
        var qtySelector = '[data-product-page-qty-value]';
        handleAddToCart(atcBtn, qtySelector);
      }
    });

    // Handle Add to Cart button clicks (Sticky Bar)
    document.addEventListener('click', function(e) {
      var atcBtn = e.target.closest('[data-sticky-bar-atc]');
      if (atcBtn) {
        e.preventDefault();
        var qtySelector = '[data-sticky-bar-qty-value]';
        handleAddToCart(atcBtn, qtySelector);
      }
    });

    // Handle Add to Cart button clicks (Best Sellers Carousel)
    document.addEventListener('click', function(e) {
      var atcBtn = e.target.closest('[data-bsc-atc]');
      if (atcBtn) {
        e.preventDefault();
        var qtySelector = '[data-bsc-qty-value]';
        handleAddToCart(atcBtn, qtySelector);
      }
    });

    // Handle Add to Cart button clicks (Featured Carousel)
    document.addEventListener('click', function(e) {
      var atcBtn = e.target.closest('[data-fc-atc]');
      if (atcBtn) {
        e.preventDefault();
        var qtySelector = '[data-fc-qty-value]';
        handleAddToCart(atcBtn, qtySelector);
      }
    });

    // Handle quantity increase button clicks (All: Collection, Product Page, Sticky Bar)
    document.addEventListener('click', function(e) {
      var increaseBtn = e.target.closest('[data-qty-increase], [data-product-page-qty-increase], [data-sticky-bar-qty-increase]');
      if (increaseBtn) {
        e.preventDefault();
        handleQuantityChange(increaseBtn, 1);
      }
    });

    // Handle quantity decrease button clicks (All: Collection, Product Page, Sticky Bar)
    document.addEventListener('click', function(e) {
      var decreaseBtn = e.target.closest('[data-qty-decrease], [data-product-page-qty-decrease], [data-sticky-bar-qty-decrease]');
      if (decreaseBtn) {
        e.preventDefault();
        handleQuantityChange(decreaseBtn, -1);
      }
    });

    // Handle Best Selling Carousel quantity increase (WITH FULL SYNC)
    document.addEventListener('click', function(e) {
      var increaseBtn = e.target.closest('[data-bsc-qty-increase]');
      if (increaseBtn) {
        e.preventDefault();
        handleQuantityChange(increaseBtn, 1);
      }
    });

    // Handle Best Selling Carousel quantity decrease (WITH FULL SYNC)
    document.addEventListener('click', function(e) {
      var decreaseBtn = e.target.closest('[data-bsc-qty-decrease]');
      if (decreaseBtn) {
        e.preventDefault();
        handleQuantityChange(decreaseBtn, -1);
      }
    });

    // Handle Featured Carousel quantity increase (WITH FULL SYNC)
    document.addEventListener('click', function(e) {
      var increaseBtn = e.target.closest('[data-fc-qty-increase]');
      if (increaseBtn) {
        e.preventDefault();
        handleQuantityChange(increaseBtn, 1);
      }
    });

    // Handle Featured Carousel quantity decrease (WITH FULL SYNC)
    document.addEventListener('click', function(e) {
      var decreaseBtn = e.target.closest('[data-fc-qty-decrease]');
      if (decreaseBtn) {
        e.preventDefault();
        handleQuantityChange(decreaseBtn, -1);
      }
    });

    // Handle manual quantity input changes (All) - WITH REAL-TIME SYNC EVERYWHERE
    document.addEventListener('input', function(e) {
      var qtyInput = e.target.closest('[data-qty-value], [data-product-page-qty-value], [data-sticky-bar-qty-value], [data-bsc-qty-value], [data-fc-qty-value]');
      if (qtyInput && qtyInput.tagName === 'INPUT') {
        // Real-time sync: Update ALL other selectors for this variant (including Best Selling & Featured Carousel)
        var variantId = getVariantIdFromInput(qtyInput);
        if (variantId) {
          syncQuantityAcrossSelectors(variantId, qtyInput.value);
        }

        // Hide any validation messages while typing
        hideQuantityValidationMessage(qtyInput);
      }
    });

    // Handle blur event on quantity input (All) - Show validation message if needed
    document.addEventListener('blur', function(e) {
      var qtyInput = e.target;
      if (qtyInput.hasAttribute &&
          (qtyInput.hasAttribute('data-qty-value') ||
           qtyInput.hasAttribute('data-product-page-qty-value') ||
           qtyInput.hasAttribute('data-sticky-bar-qty-value') ||
           qtyInput.hasAttribute('data-bsc-qty-value') ||
           qtyInput.hasAttribute('data-fc-qty-value')) &&
          qtyInput.tagName === 'INPUT') {
        validateAndShowMessage(qtyInput);
      }
    }, true);
  }

  function loadCartStateAndSyncQuantities() {
    fetch('/cart.js')
    .then(function(response) {
      return response.json();
    })
    .then(function(cart) {
      currentCartCount = cart.item_count;
      updateCartCountDisplay(currentCartCount);

      // Store cart items for quick lookup
      cartItems = {};
      cart.items.forEach(function(item) {
        cartItems[item.variant_id] = item;
      });

      // Set initial quantities based on cart state
      setInitialQuantitiesFromCart();
    })
    .catch(function(error) {
    });
  }

  function setInitialQuantitiesFromCart() {
    // Update all quantity selectors to match cart quantities
    Object.keys(cartItems).forEach(function(variantId) {
      var quantity = cartItems[variantId].quantity;
      syncQuantityAcrossSelectors(variantId, quantity, true);
    });
  }

  function getVariantIdFromInput(input) {
    // First check if the input itself has a variant ID (Best Selling Carousel case)
    if (input.dataset && input.dataset.variantId) {
      return input.dataset.variantId;
    }

    // Otherwise, try to find variant ID from the input's associated button
    var wrapper = input.closest('.productitem--buttons, .product-form--buttons-row, .sticky-product-bar__buttons, .best-selling-carousel__buttons, .featured-carousel__buttons');
    if (!wrapper) return null;

    var atcBtn = wrapper.querySelector('[data-variant-id]');
    return atcBtn ? atcBtn.dataset.variantId : null;
  }

  function syncQuantityAcrossSelectors(variantId, quantity, isInitialLoad) {
    if (!variantId) return;

    var qty = parseInt(quantity) || 1;

    // Find ALL quantity inputs for this variant (INCLUDING Best Selling & Featured Carousel - FULL SYNC)
    var allInputs = document.querySelectorAll('[data-qty-value], [data-product-page-qty-value], [data-sticky-bar-qty-value], [data-bsc-qty-value], [data-fc-qty-value]');

    allInputs.forEach(function(input) {
      var inputVariantId = getVariantIdFromInput(input);
      if (inputVariantId == variantId) {
        // Only update if different (to avoid cursor jumping during typing)
        if (parseInt(input.value) !== qty) {
          input.value = qty;

          // Update button states
          var wrapper = input.closest('[data-qty-selector], [data-product-page-qty-selector], [data-sticky-bar-qty-selector], [data-bsc-qty-selector], [data-fc-qty-selector]');
          if (wrapper) {
            var atcBtn = null;
            if (wrapper.hasAttribute('data-qty-selector')) {
              atcBtn = input.closest('.productitem--buttons').querySelector('[data-product-card-atc]');
            } else if (wrapper.hasAttribute('data-product-page-qty-selector')) {
              atcBtn = document.querySelector('[data-product-page-atc]');
            } else if (wrapper.hasAttribute('data-sticky-bar-qty-selector')) {
              atcBtn = document.querySelector('[data-sticky-bar-atc]');
            } else if (wrapper.hasAttribute('data-bsc-qty-selector')) {
              atcBtn = input.closest('.best-selling-carousel__buttons').querySelector('[data-bsc-atc]');
            } else if (wrapper.hasAttribute('data-fc-qty-selector')) {
              atcBtn = input.closest('.featured-carousel__buttons').querySelector('[data-fc-atc]');
            }

            var maxQty = atcBtn && atcBtn.dataset.inventoryQuantity ? parseInt(atcBtn.dataset.inventoryQuantity) : null;
            updateQuantityButtonStates(wrapper, qty, maxQty);
          }
        }
      }
    });
  }

  // Build a lookup map of variant combinations for fast matching
  // cardEl scopes queries to a specific product card to avoid conflicts with duplicates
  function buildVariantLookupMap(productId, cardEl) {
    var scope = cardEl || document;
    var variantDataEl = scope.querySelector('[data-product-id="' + productId + '"].productitem--variant-data');
    if (!variantDataEl) return;

    try {
      var variantData = JSON.parse(variantDataEl.textContent);
      var allVariants = variantData.variants;
      var lookupMap = {};

      allVariants.forEach(function(variant) {
        if (variant.optionValues) {
          var key = variant.optionValues
            .filter(function(val) { return val && val !== null; })
            .join('|');
          if (key) {
            lookupMap[key] = variant.id;
          }
        }
      });

      var atcBtn = scope.querySelector('[data-product-id="' + productId + '"][data-product-card-atc]');
      if (atcBtn) {
        atcBtn.dataset.variantLookupMap = JSON.stringify(lookupMap);
      }
    } catch (e) {
    }
  }

  // Update ATC button with the selected variant ID
  // cardEl scopes queries to a specific product card
  function updateATCButtonWithSelectedVariant(productId, cardEl) {
    var scope = cardEl || document;
    var atcBtn = scope.querySelector('[data-product-id="' + productId + '"][data-product-card-atc]');
    if (!atcBtn) return;

    var variantSelects = scope.querySelectorAll('[data-product-id="' + productId + '"][data-product-option]');
    if (!variantSelects || variantSelects.length === 0) return;

    // Get selected option values - in order by option index
    var selectedValues = [];
    var selectedOptions = {};

    variantSelects.forEach(function(select) {
      var optionIndex = parseInt(select.dataset.productOption);
      selectedOptions[optionIndex] = select.value;
    });

    for (var i = 0; i < variantSelects.length; i++) {
      if (selectedOptions[i]) {
        selectedValues.push(selectedOptions[i]);
      }
    }

    var lookupMapStr = atcBtn.dataset.variantLookupMap;
    if (!lookupMapStr) return;

    try {
      var lookupMap = JSON.parse(lookupMapStr);
      var key = selectedValues.join('|');

      if (lookupMap[key]) {
        atcBtn.setAttribute('data-selected-variant-id', lookupMap[key]);
      }
    } catch (e) {
    }
  }

  // Update availability of grid variant options based on current selections
  // cardEl scopes queries to a specific product card
  function updateGridVariantAvailability(productId, cardEl) {
    var scope = cardEl || document;
    var variantSelects = scope.querySelectorAll('[data-product-id="' + productId + '"][data-product-option]');
    if (!variantSelects || variantSelects.length === 0) return;

    var variantDataEl = scope.querySelector('[data-product-id="' + productId + '"].productitem--variant-data');
    if (!variantDataEl) return;

    try {
      var variantData = JSON.parse(variantDataEl.textContent);
      var allVariants = variantData.variants;

      if (!allVariants || allVariants.length === 0) {
        return;
      }

      // DEFENSIVE: Ensure all variants have the available property
      allVariants = allVariants.map(function(v) {
        if (typeof v.available === 'undefined' || v.available === null) {
          v.available = true;
        }
        return v;
      });


      // Get currently selected values
      var selectedOptions = {};
      variantSelects.forEach(function(select) {
        var optionIndex = parseInt(select.dataset.productOption);
        var selectedValue = select.value;
        if (selectedValue) {
          selectedOptions[optionIndex] = selectedValue;
        }
      });


      // For each option select, determine which values are available
      variantSelects.forEach(function(select) {
        var optionIndex = parseInt(select.dataset.productOption);
        var selectOptions = select.querySelectorAll('option');


        selectOptions.forEach(function(optionEl) {
          var optionValue = optionEl.value;
          var optionIsAvailable = false;
          var matchingVariants = [];


          // Check if this option value exists in any available variant
          // considering the current selections for other options
          for (var i = 0; i < allVariants.length; i++) {
            var variant = allVariants[i];

            // CRITICAL: Check if variant is available
            if (!variant.available) {
              continue;
            }

            // Check if this variant has the current option value at this position
            if (!variant.optionValues || variant.optionValues[optionIndex] === null || variant.optionValues[optionIndex] === undefined) {
              continue;
            }

            if (variant.optionValues[optionIndex] !== optionValue) {
              continue;
            }


            // Check if other selected options match this variant
            var allOtherSelected = true;
            for (var selectedIndex in selectedOptions) {
              if (selectedOptions.hasOwnProperty(selectedIndex)) {
                var idx = parseInt(selectedIndex);
                if (idx === optionIndex) continue; // Skip current option

                var variantVal = variant.optionValues[idx];
                var selectedVal = selectedOptions[idx];

                if (variantVal !== selectedVal) {
                  allOtherSelected = false;
                  break;
                }
              }
            }

            if (allOtherSelected) {
              matchingVariants.push(variant.id);
              optionIsAvailable = true;
              // Don't break - log all matching variants for debugging
            }
          }

          // Update disabled state
          if (optionIsAvailable) {
            optionEl.disabled = false;
          } else {
            optionEl.disabled = true;
          }
        });
      });

    } catch (e) {
    }
  }

  // Get selected variant from grid variant dropdowns
  // cardEl scopes queries to a specific product card
  function getSelectedVariantFromGrid(productId, cardEl) {
    var scope = cardEl || document;

    var variantSelects = scope.querySelectorAll('[data-product-id="' + productId + '"][data-product-option]');
    if (!variantSelects || variantSelects.length === 0) return null;

    // Get selected options in order
    var selectedOptions = {};
    variantSelects.forEach(function(select) {
      var optionIndex = parseInt(select.dataset.productOption);
      var selectedValue = select.value;
      if (selectedValue) {
        selectedOptions[optionIndex] = selectedValue;
      }
    });

    var variantDataEl = scope.querySelector('[data-product-id="' + productId + '"].productitem--variant-data');
    if (!variantDataEl) return null;

    try {
      var variantData = JSON.parse(variantDataEl.textContent);
      var allVariants = variantData.variants;

      if (!allVariants || allVariants.length === 0) {
        return null;
      }


      for (var i = 0; i < allVariants.length; i++) {
        var variant = allVariants[i];
        var isMatch = true;


        // Check all selected options
        for (var optionIndex in selectedOptions) {
          if (selectedOptions.hasOwnProperty(optionIndex)) {
            var idx = parseInt(optionIndex);
            var selectedValue = selectedOptions[optionIndex];
            var variantOptionValue = variant.optionValues ? variant.optionValues[idx] : null;

            var matches = variantOptionValue === selectedValue;

            if (!matches) {
              isMatch = false;
              break;
            }
          }
        }

        if (isMatch) {
          return String(variant.id);
        }
      }

    } catch (e) {
    }

    return null;
  }

  // Format price in cents to display string (e.g. 2495 -> "$ 24.95")
  function formatMoney(cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents, window.shop_money_format || '${{amount}}');
    }
    // Fallback: format manually
    var amount = (cents / 100).toFixed(2);
    return '$ ' + amount;
  }

  // Update price display when variant selection changes
  // cardEl scopes queries to a specific product card
  function updateGridVariantPrice(productId, cardEl) {
    var scope = cardEl || document;
    var atcBtn = scope.querySelector('[data-product-id="' + productId + '"][data-product-card-atc]');
    if (!atcBtn) return;

    var selectedVariantId = atcBtn.dataset.selectedVariantId;
    if (!selectedVariantId) return;

    var variantDataEl = scope.querySelector('[data-product-id="' + productId + '"].productitem--variant-data');
    if (!variantDataEl) return;

    try {
      var variantData = JSON.parse(variantDataEl.textContent);
      var selectedVariant = variantData.variants.find(function(v) { return v.id == selectedVariantId; });
      if (!selectedVariant) return;

      // Find the product card container — search within the whole card, not just the price row,
      // because when emphasize_price is enabled the price is rendered outside the price row
      var productCard = atcBtn.closest('[data-product-item-content]') || atcBtn.closest('[data-product-item]');
      if (!productCard) return;

      // Update ALL price elements within this product card (handles both emphasize_price on/off)
      var mainPriceEls = productCard.querySelectorAll('[data-price] .money');
      var comparePriceEls = productCard.querySelectorAll('[data-price-compare-at] .money');
      var comparePriceContainers = productCard.querySelectorAll('[data-price-compare-at]');

      if (!mainPriceEls.length) return;

      var formattedPrice = formatMoney(selectedVariant.price);

      // Update main price
      mainPriceEls.forEach(function(el) {
        el.textContent = formattedPrice;
      });

      // Update compare-at price
      var hasComparePrice = selectedVariant.compare_at_price && selectedVariant.compare_at_price > selectedVariant.price;

      if (hasComparePrice) {
        var formattedComparePrice = formatMoney(selectedVariant.compare_at_price);
        comparePriceEls.forEach(function(el) {
          el.textContent = formattedComparePrice;
        });
        comparePriceContainers.forEach(function(el) {
          el.classList.add('visible');
        });
      } else {
        comparePriceContainers.forEach(function(el) {
          el.classList.remove('visible');
        });
      }
    } catch (e) {
    }
  }

  function handleAddToCart(button, qtySelector) {
    if (button.disabled) return;

    // Prevent rapid duplicate clicks
    var now = Date.now();
    if (button.dataset.lastClick && (now - parseInt(button.dataset.lastClick)) < 300) return;
    button.dataset.lastClick = now;

    // Handle grid variants (product cards with variant selectors)
    var variantId = null;
    // Scope queries to the specific product card to avoid conflicts with duplicates
    var cardEl = button.closest('[data-product-item]');

    // CRITICAL: Check if this is a grid variant button
    if (button.dataset.gridVariantsEnabled === 'true') {
      var productId = button.dataset.productId;

      // Re-sync the button with current selections BEFORE using it
      updateATCButtonWithSelectedVariant(productId, cardEl);

      // FIRST: Try to use the synced variant ID from button data attribute (NOW updated)
      if (button.dataset.selectedVariantId) {
        variantId = button.dataset.selectedVariantId;
      } else {
        // FALLBACK: Try to match from grid selects directly
        variantId = getSelectedVariantFromGrid(productId, cardEl);

        if (!variantId) {
          // LAST RESORT: Use default variant from button
          variantId = button.dataset.variantId;
        }
      }
    } else {
      // Check if there might be grid variants even though flag isn't set
      var productId = button.dataset.productId;
      if (productId && cardEl) {
        var gridSelects = cardEl.querySelectorAll('[data-product-id="' + productId + '"][data-product-option]');
        if (gridSelects && gridSelects.length > 0) {
          variantId = getSelectedVariantFromGrid(productId, cardEl);
        }
      }

      // If still no variant ID, use button's variant ID
      if (!variantId) {
        variantId = button.dataset.variantId;

        // Only use the global variant select if button doesn't have a variant ID
        if (!variantId) {
          var variantSelect = document.querySelector('[data-variants]');
          variantId = variantSelect ? variantSelect.value : null;
        }
      }
    }


    // Get quantity from the input field (support all types: collection, product page, sticky bar, best sellers)
    var qtyInput = null;
    if (qtySelector === '[data-qty-value]') {
      // Collection page - find within the product card
      var wrapper = button.closest('.productitem--buttons');
      qtyInput = wrapper ? wrapper.querySelector(qtySelector) : null;
    } else if (qtySelector === '[data-bsc-qty-value]') {
      // Best Selling Carousel - find within the same card
      var bscCard = button.closest('.best-selling-carousel__card');
      if (!bscCard) {
        bscCard = button.closest('.best-selling-carousel__buttons');
      }
      qtyInput = bscCard ? bscCard.querySelector(qtySelector) : null;
    } else if (qtySelector === '[data-fc-qty-value]') {
      // Featured Carousel - find within the same card
      var fcCard = button.closest('.featured-carousel__card');
      if (!fcCard) {
        fcCard = button.closest('.featured-carousel__buttons');
      }
      qtyInput = fcCard ? fcCard.querySelector(qtySelector) : null;
    } else {
      // Product page and sticky bar - single quantity input on page
      qtyInput = document.querySelector(qtySelector);
    }

    var desiredQuantity = 1;
    var maxQty = button.dataset.inventoryQuantity ? parseInt(button.dataset.inventoryQuantity) : null;

    if (qtyInput) {
      desiredQuantity = parseInt(qtyInput.value) || 1;

      // Validate minimum
      if (desiredQuantity < 1) {
        desiredQuantity = 1;
        qtyInput.value = 1;
      }

      // Validate maximum - ONLY if inventory tracking is enabled (data-inventory-quantity exists)
      if (maxQty && !isNaN(maxQty) && desiredQuantity > maxQty) {
        // Show custom alert message
        showInventoryAlert(maxQty);

        desiredQuantity = maxQty;
        qtyInput.value = maxQty;

        // Sync the capped value across all selectors
        var variantId = button.dataset.variantId;
        if (variantId) {
          syncQuantityAcrossSelectors(variantId, maxQty);
        }

        // Don't proceed with adding to cart
        return;
      }
      // If no maxQty (unlimited inventory), allow any quantity - no validation needed
    }

    // Show loading state
    var originalText = button.textContent;
    var textSpan = button.querySelector('.atc-button--text');
    if (textSpan) {
      textSpan.textContent = 'Adding...';
    } else {
      button.textContent = 'Adding...';
    }
    button.disabled = true;

    // Check current cart to see if item already exists
    fetch('/cart.js')
    .then(function(response) {
      return response.json();
    })
    .then(function(cart) {
      // Find if this variant is already in cart
      var existingItem = null;

      for (var i = 0; i < cart.items.length; i++) {
        if (cart.items[i].variant_id == variantId) {
          existingItem = cart.items[i];
          break;
        }
      }

      // If item exists, ADD to the existing quantity
      // If item doesn't exist, ADD with desired quantity
      if (existingItem) {
        // Item exists - ADD the desired quantity to existing quantity
        var newQuantity = existingItem.quantity + desiredQuantity;

        // Check if new total exceeds inventory limit
        if (maxQty && !isNaN(maxQty) && newQuantity > maxQty) {
          // Reset button state
          if (textSpan) {
            textSpan.textContent = originalText;
          } else {
            button.textContent = originalText;
          }
          button.disabled = false;

          // Show alert
          showInventoryAlert(maxQty);

          // Don't proceed
          return Promise.reject('Inventory limit exceeded');
        }

        return fetch('/cart/change.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: existingItem.key,
            quantity: newQuantity
          })
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(updatedCart) {
          // cart/change returns the full cart, find our updated item
          var updatedItem = null;
          for (var i = 0; i < updatedCart.items.length; i++) {
            if (updatedCart.items[i].variant_id == variantId) {
              updatedItem = updatedCart.items[i];
              break;
            }
          }
          return {
            item: updatedItem,
            cart: updatedCart
          };
        });
      } else {
        // Item doesn't exist - ADD it
        return fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: variantId,
            quantity: desiredQuantity
          })
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(addedItem) {
          // cart/add returns the item, fetch the full cart
          return fetch('/cart.js')
            .then(function(res) { return res.json(); })
            .then(function(fullCart) {
              return {
                item: addedItem,
                cart: fullCart
              };
            });
        });
      }
    })
    .then(function(data) {
      // Reset button state
      if (textSpan) {
        textSpan.textContent = originalText;
      } else {
        button.textContent = originalText;
      }
      button.disabled = false;

      // Update cart count immediately
      currentCartCount = data.cart.item_count;
      updateCartCountDisplay(currentCartCount);

      // Update cart items cache
      cartItems = {};
      data.cart.items.forEach(function(item) {
        cartItems[item.variant_id] = item;
      });

      // Sync ALL quantity selectors for this variant to match cart (INCLUDING Best Selling & Featured Carousel)
      syncQuantityAcrossSelectors(variantId, data.item.quantity);

      // Show cart notification with correct data
      showCartNotification(data.item, data.cart);

      // Dispatch custom event
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: data.cart }));
    })
    .catch(function(error) {
      // Revert button state
      if (textSpan) {
        textSpan.textContent = originalText;
      } else {
        button.textContent = originalText;
      }
      button.disabled = false;

      // Don't show alert if it's inventory limit exceeded (we already showed a modal)
      if (error !== 'Inventory limit exceeded') {
        alert('Error adding product to cart. Please try again.');
      }
    });
  }

  function handleQuantityChange(button, change) {
    var wrapper = button.closest('[data-qty-selector], [data-product-page-qty-selector], [data-sticky-bar-qty-selector], [data-bsc-qty-selector], [data-fc-qty-selector]');
    if (!wrapper) return;

    var qtyInput = wrapper.querySelector('[data-qty-value], [data-product-page-qty-value], [data-sticky-bar-qty-value], [data-bsc-qty-value], [data-fc-qty-value]');
    if (!qtyInput) return;

    var currentQty = parseInt(qtyInput.value) || 1;
    var newQty = currentQty + change;

    // Get max quantity from the Add to Cart button
    var atcBtn = null;
    if (wrapper.hasAttribute('data-qty-selector')) {
      atcBtn = button.closest('.productitem--buttons').querySelector('[data-product-card-atc]');
    } else if (wrapper.hasAttribute('data-product-page-qty-selector')) {
      atcBtn = document.querySelector('[data-product-page-atc]');
    } else if (wrapper.hasAttribute('data-sticky-bar-qty-selector')) {
      atcBtn = document.querySelector('[data-sticky-bar-atc]');
    } else if (wrapper.hasAttribute('data-bsc-qty-selector')) {
      atcBtn = button.closest('.best-selling-carousel__buttons').querySelector('[data-bsc-atc]');
    } else if (wrapper.hasAttribute('data-fc-qty-selector')) {
      atcBtn = button.closest('.featured-carousel__buttons').querySelector('[data-fc-atc]');
    }

    var maxQty = atcBtn && atcBtn.dataset.inventoryQuantity ? parseInt(atcBtn.dataset.inventoryQuantity) : null;

    // Enforce minimum
    if (newQty < 1) newQty = 1;

    // Enforce maximum only if inventory tracking is enabled
    if (maxQty && !isNaN(maxQty) && newQty > maxQty) {
      newQty = maxQty;
    }

    // Update input value
    qtyInput.value = newQty;

    // Update button states
    updateQuantityButtonStates(wrapper, newQty, maxQty);

    // Real-time sync across ALL selectors (INCLUDING Best Selling & Featured Carousel - FULL SYNC)
    var variantId = getVariantIdFromInput(qtyInput);
    if (variantId) {
      syncQuantityAcrossSelectors(variantId, newQty);
    }
  }

  function validateAndShowMessage(input) {
    var value = parseInt(input.value);

    // If empty or invalid, set to 1
    if (!value || value < 1) {
      input.value = 1;
      var variantId = getVariantIdFromInput(input);
      if (variantId) {
        syncQuantityAcrossSelectors(variantId, 1);
      }
      return;
    }

    // Get max quantity
    var wrapper = input.closest('[data-qty-selector], [data-product-page-qty-selector], [data-sticky-bar-qty-selector], [data-bsc-qty-selector], [data-fc-qty-selector]');
    var atcBtn = null;

    if (wrapper && wrapper.hasAttribute('data-qty-selector')) {
      atcBtn = input.closest('.productitem--buttons').querySelector('[data-product-card-atc]');
    } else if (wrapper && wrapper.hasAttribute('data-product-page-qty-selector')) {
      atcBtn = document.querySelector('[data-product-page-atc]');
    } else if (wrapper && wrapper.hasAttribute('data-sticky-bar-qty-selector')) {
      atcBtn = document.querySelector('[data-sticky-bar-atc]');
    } else if (wrapper && wrapper.hasAttribute('data-bsc-qty-selector')) {
      atcBtn = input.closest('.best-selling-carousel__buttons').querySelector('[data-bsc-atc]');
    } else if (wrapper && wrapper.hasAttribute('data-fc-qty-selector')) {
      atcBtn = input.closest('.featured-carousel__buttons').querySelector('[data-fc-atc]');
    }

    var maxQty = atcBtn && atcBtn.dataset.inventoryQuantity ? parseInt(atcBtn.dataset.inventoryQuantity) : null;

    // If no inventory tracking (no data-inventory-quantity attribute), allow unlimited quantity
    if (!maxQty || isNaN(maxQty)) {
      hideQuantityValidationMessage(input);
      return;
    }

    // Show message if exceeds available quantity
    if (value > maxQty) {
      showQuantityValidationMessage(input, maxQty);
    } else {
      hideQuantityValidationMessage(input);
    }
  }

  function showQuantityValidationMessage(input, maxQty) {
    var wrapper = input.closest('[data-qty-selector], [data-product-page-qty-selector], [data-sticky-bar-qty-selector], [data-bsc-qty-selector], [data-fc-qty-selector]');
    if (!wrapper) return;

    // Remove any existing message
    hideQuantityValidationMessage(input);

    // Create message container
    var message = document.createElement('div');
    message.className = 'qty-validation-message';

    // Add icon and text
    message.innerHTML = '<svg class="qty-validation-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>' +
      '</svg>' +
      '<span class="qty-validation-text">Only <strong>' + maxQty + '</strong> units available</span>';

    // Apply styles
    message.style.cssText =
      'display: flex;' +
      'align-items: center;' +
      'gap: 6px;' +
      'padding: 8px 12px;' +
      'margin-top: 8px;' +
      'background: #fff3cd;' +
      'border: 1px solid #ffc107;' +
      'border-radius: 6px;' +
      'color: #856404;' +
      'font-size: 12px;' +
      'font-weight: 500;' +
      'line-height: 1.4;' +
      'animation: fadeInDown 0.3s ease;' +
      'box-shadow: 0 2px 4px rgba(0,0,0,0.08);' +
      'width: 100%;' +
      'box-sizing: border-box;';

    // Style the icon
    var iconStyle = 'width: 16px; height: 16px; flex-shrink: 0; color: #ffc107;';

    // Find the right container to insert after
    var insertAfter = null;

    if (wrapper.hasAttribute('data-bsc-qty-selector')) {
      // For Best Selling Carousel, insert after the buttons container
      insertAfter = wrapper.closest('.best-selling-carousel__buttons');
    } else if (wrapper.hasAttribute('data-fc-qty-selector')) {
      // For Featured Carousel, insert after the buttons container
      insertAfter = wrapper.closest('.featured-carousel__buttons');
    } else if (wrapper.hasAttribute('data-product-page-qty-selector')) {
      // For Product Page, insert after the buttons row
      insertAfter = wrapper.closest('.product-form--buttons-row');
      if (!insertAfter) {
        insertAfter = wrapper.closest('.product-form--atc-wrapper');
      }
    } else if (wrapper.hasAttribute('data-sticky-bar-qty-selector')) {
      // For Sticky Bar, insert after the buttons container
      insertAfter = wrapper.closest('.sticky-product-bar__buttons');
    } else if (wrapper.hasAttribute('data-qty-selector')) {
      // For Collection Page, insert after the buttons container
      insertAfter = wrapper.closest('.productitem--buttons');
    }

    // Fallback to wrapper if no container found
    if (!insertAfter) {
      insertAfter = wrapper;
    }

    // Insert message
    if (insertAfter && insertAfter.parentNode) {
      insertAfter.parentNode.insertBefore(message, insertAfter.nextSibling);
    }

    // Add icon styling after insertion
    var icon = message.querySelector('.qty-validation-icon');
    if (icon) {
      icon.style.cssText = iconStyle;
    }

    // Add animation keyframes and responsive styles if not already present
    if (!document.getElementById('qty-validation-animations')) {
      var style = document.createElement('style');
      style.id = 'qty-validation-animations';
      style.textContent =
        '@keyframes fadeInDown {' +
        '  from { opacity: 0; transform: translateY(-10px); }' +
        '  to { opacity: 1; transform: translateY(0); }' +
        '}' +
        '.qty-validation-text strong {' +
        '  font-weight: 700;' +
        '  color: #664d03;' +
        '}' +
        '@media (max-width: 768px) {' +
        '  .qty-validation-message {' +
        '    font-size: 11px !important;' +
        '    padding: 6px 10px !important;' +
        '    margin-top: 6px !important;' +
        '  }' +
        '  .qty-validation-icon {' +
        '    width: 14px !important;' +
        '    height: 14px !important;' +
        '  }' +
        '}' +
        '@media (max-width: 480px) {' +
        '  .qty-validation-message {' +
        '    font-size: 10px !important;' +
        '    padding: 5px 8px !important;' +
        '  }' +
        '  .qty-validation-icon {' +
        '    width: 12px !important;' +
        '    height: 12px !important;' +
        '  }' +
        '}';
      document.head.appendChild(style);
    }
  }

  function showInventoryAlert(maxQty) {
    // Remove any existing alert
    var existingAlert = document.querySelector('.inventory-alert-overlay');
    if (existingAlert) {
      existingAlert.remove();
    }

    // Create overlay
    var overlay = document.createElement('div');
    overlay.className = 'inventory-alert-overlay';
    overlay.style.cssText =
      'position: fixed;' +
      'top: 0;' +
      'left: 0;' +
      'right: 0;' +
      'bottom: 0;' +
      'background: rgba(0, 0, 0, 0.5);' +
      'display: flex;' +
      'align-items: center;' +
      'justify-content: center;' +
      'z-index: 99999;' +
      'animation: fadeIn 0.2s ease;';

    // Create alert box
    var alertBox = document.createElement('div');
    alertBox.className = 'inventory-alert-box';
    alertBox.style.cssText =
      'background: white;' +
      'padding: 24px;' +
      'border-radius: 12px;' +
      'max-width: 400px;' +
      'width: 90%;' +
      'box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);' +
      'animation: slideUp 0.3s ease;' +
      'text-align: center;';

    // Create icon
    var icon = document.createElement('div');
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#ffc107"/>' +
      '</svg>';
    icon.style.cssText = 'width: 48px; height: 48px; margin: 0 auto 16px;';

    // Create title
    var title = document.createElement('h3');
    title.textContent = 'Limited Stock Available';
    title.style.cssText = 'margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #333;';

    // Create message
    var message = document.createElement('p');
    message.innerHTML = 'Only <strong style="color: #333; font-weight: 700;">' + maxQty + '</strong> units are currently available for this product.';
    message.style.cssText = 'margin: 0 0 20px; font-size: 14px; color: #666; line-height: 1.5;';

    // Create button
    var button = document.createElement('button');
    button.textContent = 'Got it';
    button.style.cssText =
      'background: #367b36;' +
      'color: white;' +
      'border: none;' +
      'padding: 12px 32px;' +
      'border-radius: 6px;' +
      'font-size: 14px;' +
      'font-weight: 600;' +
      'cursor: pointer;' +
      'transition: background 0.2s ease;';

    button.onmouseover = function() {
      this.style.background = '#4dbe4d';
    };
    button.onmouseout = function() {
      this.style.background = '#367b36';
    };

    button.onclick = function() {
      overlay.style.opacity = '0';
      setTimeout(function() {
        overlay.remove();
      }, 200);
    };

    // Assemble
    alertBox.appendChild(icon);
    alertBox.appendChild(title);
    alertBox.appendChild(message);
    alertBox.appendChild(button);
    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.onclick = function(e) {
      if (e.target === overlay) {
        button.onclick();
      }
    };

    // Add animations if not present
    if (!document.getElementById('inventory-alert-animations')) {
      var style = document.createElement('style');
      style.id = 'inventory-alert-animations';
      style.textContent =
        '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }' +
        '@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }';
      document.head.appendChild(style);
    }
  }

  function updateProductPageAtcButton(variant) {
    // Update product page ATC button with new variant data
    var productPageAtcBtn = document.querySelector('[data-product-page-atc]');
    if (productPageAtcBtn) {
      // Update variant ID
      productPageAtcBtn.setAttribute('data-variant-id', variant.id);

      // Update inventory quantity if available
      if (variant.inventory_quantity && variant.inventory_quantity > 0) {
        productPageAtcBtn.setAttribute('data-inventory-quantity', variant.inventory_quantity);
      } else {
        productPageAtcBtn.removeAttribute('data-inventory-quantity');
      }

      // Update button availability state
      if (variant.available) {
        productPageAtcBtn.classList.remove('disabled');
        productPageAtcBtn.disabled = false;
      } else {
        productPageAtcBtn.classList.add('disabled');
        productPageAtcBtn.disabled = true;
      }
    }

    // Also update sticky bar button (in case sticky-product-bar.liquid hasn't loaded yet)
    var stickyBarAtcBtn = document.querySelector('[data-sticky-bar-atc]');
    if (stickyBarAtcBtn) {
      stickyBarAtcBtn.setAttribute('data-variant-id', variant.id);

      if (variant.inventory_quantity && variant.inventory_quantity > 0) {
        stickyBarAtcBtn.setAttribute('data-inventory-quantity', variant.inventory_quantity);
      } else {
        stickyBarAtcBtn.removeAttribute('data-inventory-quantity');
      }

      if (variant.available) {
        stickyBarAtcBtn.classList.remove('disabled');
        stickyBarAtcBtn.disabled = false;
      } else {
        stickyBarAtcBtn.classList.add('disabled');
        stickyBarAtcBtn.disabled = true;
      }
    }
  }

  function hideQuantityValidationMessage(input) {
    var wrapper = input.closest('[data-qty-selector], [data-product-page-qty-selector], [data-sticky-bar-qty-selector], [data-bsc-qty-selector], [data-fc-qty-selector]');
    if (!wrapper) return;

    // Find all possible container locations
    var containers = [];

    if (wrapper.hasAttribute('data-bsc-qty-selector')) {
      containers.push(wrapper.closest('.best-selling-carousel__buttons'));
    } else if (wrapper.hasAttribute('data-fc-qty-selector')) {
      containers.push(wrapper.closest('.featured-carousel__buttons'));
    } else if (wrapper.hasAttribute('data-product-page-qty-selector')) {
      containers.push(wrapper.closest('.product-form--buttons-row'));
      containers.push(wrapper.closest('.product-form--atc-wrapper'));
    } else if (wrapper.hasAttribute('data-sticky-bar-qty-selector')) {
      containers.push(wrapper.closest('.sticky-product-bar__buttons'));
    } else if (wrapper.hasAttribute('data-qty-selector')) {
      containers.push(wrapper.closest('.productitem--buttons'));
    }

    // Add wrapper itself as fallback
    containers.push(wrapper);

    // Remove messages after any of these containers
    containers.forEach(function(container) {
      if (container && container.nextSibling) {
        var nextSibling = container.nextSibling;
        if (nextSibling.classList && nextSibling.classList.contains('qty-validation-message')) {
          nextSibling.remove();
        }
      }
    });

    // Also search for any orphaned messages in the parent element
    var parentContainers = [
      document.querySelector('.productitem--buttons'),
      document.querySelector('.product-form--buttons-row'),
      document.querySelector('.sticky-product-bar__buttons'),
      document.querySelector('.best-selling-carousel__buttons'),
      document.querySelector('.featured-carousel__buttons')
    ];

    parentContainers.forEach(function(parent) {
      if (parent) {
        var messages = parent.parentNode.querySelectorAll('.qty-validation-message');
        messages.forEach(function(msg) {
          msg.remove();
        });
      }
    });
  }

  function updateQuantityButtonStates(wrapper, currentQty, maxQty) {
    var decreaseBtn = wrapper.querySelector('[data-qty-decrease], [data-product-page-qty-decrease], [data-sticky-bar-qty-decrease], [data-bsc-qty-decrease], [data-fc-qty-decrease]');
    var increaseBtn = wrapper.querySelector('[data-qty-increase], [data-product-page-qty-increase], [data-sticky-bar-qty-increase], [data-bsc-qty-increase], [data-fc-qty-increase]');

    // Decrease button: disable if quantity is 1 or less
    if (decreaseBtn) {
      decreaseBtn.disabled = currentQty <= 1;
    }

    // Increase button: disable only if we have inventory tracking AND we're at the limit
    if (increaseBtn) {
      if (maxQty && !isNaN(maxQty)) {
        increaseBtn.disabled = currentQty >= maxQty;
      } else {
        // No inventory limit - never disable increase button
        increaseBtn.disabled = false;
      }
    }
  }

  function showCartNotification(itemData, cart) {
    if (!cartNotification || !cart || !itemData) return;

    // Clear any existing timeout
    if (notificationTimeout) clearTimeout(notificationTimeout);

    // Position notification directly below the (possibly shrunk) sticky header.
    var cartNotificationWrapper = cartNotification.closest('[data-cart-notification-wrapper]');
    var headerEl = document.querySelector('[data-site-header]');
    if (cartNotificationWrapper && headerEl) {
      var headerHeight = Math.ceil(headerEl.getBoundingClientRect().height);
      cartNotificationWrapper.style.top = headerHeight + 'px';
    }

    // Update notification content
    var imageContainer = cartNotification.querySelector('[data-cart-notification-image]');
    var titleEl = cartNotification.querySelector('[data-cart-notification-title]');
    var variantEl = cartNotification.querySelector('[data-cart-notification-variant]');
    var qtyEl = cartNotification.querySelector('[data-cart-notification-qty]');
    var subtotalEl = cartNotification.querySelector('[data-cart-notification-subtotal]');
    var viewCartBtn = cartNotification.querySelector('.cart-notification__btn--view-cart');

    // Set product image
    if (imageContainer) {
      if (itemData.featured_image && itemData.featured_image.url) {
        imageContainer.innerHTML = '<img src="' + itemData.featured_image.url + '" alt="' + (itemData.product_title || '') + '">';
      } else if (itemData.image) {
        imageContainer.innerHTML = '<img src="' + itemData.image + '" alt="' + (itemData.product_title || itemData.title || '') + '">';
      }
    }

    // Set product title
    if (titleEl) {
      titleEl.textContent = itemData.product_title || itemData.title || '';
    }

    // Set variant (if not default)
    if (variantEl) {
      if (itemData.variant_title && itemData.variant_title !== 'Default Title') {
        variantEl.textContent = itemData.variant_title;
        variantEl.style.display = 'block';
      } else {
        variantEl.style.display = 'none';
      }
    }

    // Set quantity
    if (qtyEl && itemData.quantity && itemData.price) {
      qtyEl.textContent = itemData.quantity + ' x ' + formatMoney(itemData.price);
    }

    // Set cart subtotal
    if (subtotalEl && cart.total_price !== undefined) {
      subtotalEl.textContent = formatMoney(cart.total_price);
    }

    // Update View Cart button
    if (viewCartBtn && cart.item_count !== undefined) {
      viewCartBtn.textContent = 'View cart (' + cart.item_count + ')';
    }

    // Show notification after a brief delay to allow scroll to start
    setTimeout(function() {
      cartNotification.classList.add('cart-notification--visible');
    }, 300);

    // Auto-hide after 5 seconds
    notificationTimeout = setTimeout(function() {
      hideCartNotification();
    }, 5300);
  }

  function hideCartNotification() {
    if (cartNotification) {
      cartNotification.classList.remove('cart-notification--visible');
    }
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }
  }

  function updateCartCountDisplay(count) {
    // Update header cart count badge
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

    // Update other cart count elements
    var cartCountElements = document.querySelectorAll('[data-cart-count], .cart-link--count');
    cartCountElements.forEach(function(el) {
      el.textContent = count;
    });

    // Trigger jQuery event for theme compatibility
    if (typeof jQuery !== 'undefined') {
      var $header = jQuery('[data-section-type="static-header"]');
      if ($header.length) {
        $header.trigger('cartcount:update', { response: { item_count: count } });
      }
    }
  }

  function formatMoney(cents) {
    if (typeof cents === 'undefined' || cents === null) return '$0.00';
    var dollars = (cents / 100).toFixed(2);
    return '$' + dollars;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductCardButtons);
  } else {
    initProductCardButtons();
  }
})();
