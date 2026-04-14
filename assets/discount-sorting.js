/**
 * Custom Discount Sorting for Collection Pages
 * Handles discount-based sorting (low to high, high to low)
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiscountSorting);
  } else {
    initDiscountSorting();
  }

  function initDiscountSorting() {
    const sortSelect = document.querySelector('[data-productgrid-trigger-sort]');
    const sortButtons = document.querySelectorAll('[data-productgrid-trigger-sort-button]');
    const productGrid = document.querySelector('.productgrid--items');

    if (!productGrid) return;

    // Handle select dropdown change - use capture phase to intercept before other handlers
    if (sortSelect) {
      sortSelect.addEventListener('change', handleSortChange, true);
    }

    // Handle modal button clicks - use capture phase to intercept before other handlers
    if (sortButtons.length > 0) {
      sortButtons.forEach(button => {
        button.addEventListener('click', handleSortButtonClick, true);
      });
    }

    // Check if we're already on a discount sort page
    const urlParams = new URLSearchParams(window.location.search);
    const currentSort = urlParams.get('sort_by');
    if (currentSort === 'discount-high-to-low') {
      applyDiscountSort(currentSort);
    }
  }

  function handleSortChange(event) {
    const sortValue = event.target.value;

    if (sortValue === 'discount-high-to-low') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      applyDiscountSort(sortValue);
      updateURL(sortValue);
      return false;
    }
  }

  function handleSortButtonClick(event) {
    const sortValue = event.target.value;

    if (sortValue === 'discount-high-to-low') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      // Update active state for modal buttons
      const allButtons = document.querySelectorAll('[data-productgrid-trigger-sort-button]');
      allButtons.forEach(btn => {
        btn.classList.remove('utils-sortby--modal-button--active');
        btn.disabled = false;
      });
      event.target.classList.add('utils-sortby--modal-button--active');
      event.target.disabled = true;

      applyDiscountSort(sortValue);
      updateURL(sortValue);

      // Close modal if it's open
      const modal = document.querySelector('.modal');
      if (modal && modal.classList.contains('modal--open')) {
        modal.classList.remove('modal--open');
      }

      return false;
    }
  }

  function applyDiscountSort(sortType) {
    const productGrid = document.querySelector('.productgrid--items');
    if (!productGrid) return;

    const productItems = Array.from(productGrid.querySelectorAll('[data-product-item]'));

    // Calculate discount for each product
    const productsWithDiscount = productItems.map(item => {
      const discount = calculateDiscount(item);
      return { element: item, discount: discount };
    });

    // Sort based on discount (high to low)
    productsWithDiscount.sort((a, b) => {
      return b.discount - a.discount;
    });

    // Re-append items in sorted order
    productsWithDiscount.forEach(item => {
      productGrid.appendChild(item.element);
    });

    // Update select dropdown to reflect current sort
    const sortSelect = document.querySelector('[data-productgrid-trigger-sort]');
    if (sortSelect) {
      sortSelect.value = sortType;
    }
  }

  function calculateDiscount(productItem) {
    // Try to find price elements
    const priceElement = productItem.querySelector('.productitem--price');
    if (!priceElement) return 0;

    // Look for compare at price (original price) in the compare-at div
    const compareAtPriceDiv = priceElement.querySelector('.price--compare-at');
    const salePriceDiv = priceElement.querySelector('.price--main');

    // If no compare at price div or it's not visible, there's no discount
    if (!compareAtPriceDiv || !compareAtPriceDiv.classList.contains('visible')) {
      return 0;
    }

    // Get the money elements
    const compareAtPriceElement = compareAtPriceDiv.querySelector('.money');
    const salePriceElement = salePriceDiv ? salePriceDiv.querySelector('.money') : null;

    if (!compareAtPriceElement || !salePriceElement) return 0;

    // Get price values - remove currency symbols and convert to numbers
    const compareAtPrice = parsePrice(compareAtPriceElement.textContent);
    const salePrice = parsePrice(salePriceElement.textContent);

    // Calculate discount percentage
    if (compareAtPrice > 0 && salePrice > 0 && salePrice < compareAtPrice) {
      const discountAmount = compareAtPrice - salePrice;
      const discountPercentage = (discountAmount / compareAtPrice) * 100;
      return Math.round(discountPercentage);
    }

    return 0;
  }

  function parsePrice(priceText) {
    // Remove all non-numeric characters except decimal point
    const cleanPrice = priceText.replace(/[^0-9.]/g, '');
    return parseFloat(cleanPrice) || 0;
  }

  function updateURL(sortValue) {
    // Update URL without reloading page
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('sort_by', sortValue);

    const newURL = window.location.pathname + '?' + urlParams.toString();
    window.history.pushState({ path: newURL }, '', newURL);
  }

})();
