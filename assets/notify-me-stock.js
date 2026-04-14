/**
 * Notify Me When Available - Back in Stock Notifications
 * Uses Shopify customer form to create customers with tags
 * Works like newsletter signup - creates a customer record
 */
(function() {
  'use strict';

  // Modal elements (cached after DOM load)
  var modal = null;
  var modalForm = null;
  var modalEmail = null;
  var modalTags = null;
  var modalProductName = null;
  var modalError = null;
  var modalSubmitBtn = null;
  var modalSubmitText = null;
  var modalSubmitLoading = null;

  // Current product data
  var currentProductData = {
    productId: '',
    variantId: '',
    productTitle: '',
    variantTitle: '',
    productHandle: ''
  };

  function initNotifyMe() {
    // Cache modal elements
    modal = document.querySelector('[data-notify-me-modal]');
    if (modal) {
      modalForm = modal.querySelector('form');
      modalEmail = modal.querySelector('[data-notify-me-modal-email]');
      modalTags = modal.querySelector('[data-notify-me-modal-tags]');
      modalProductName = modal.querySelector('[data-notify-me-modal-product-name]');
      modalError = modal.querySelector('[data-notify-me-modal-error]');
      modalSubmitBtn = modal.querySelector('[data-notify-me-modal-submit]');
      if (modalSubmitBtn) {
        modalSubmitText = modalSubmitBtn.querySelector('.notify-me-modal__submit-text');
        modalSubmitLoading = modalSubmitBtn.querySelector('.notify-me-modal__submit-loading');
      }
    }

    // Handle Notify Me trigger button clicks (opens popup)
    document.addEventListener('click', function(e) {
      var triggerBtn = e.target.closest('[data-notify-me-trigger]');
      if (triggerBtn) {
        e.preventDefault();
        openNotifyMeModal(triggerBtn);
      }
    });

    // Handle modal close buttons
    document.addEventListener('click', function(e) {
      var closeBtn = e.target.closest('[data-notify-me-modal-close]');
      if (closeBtn) {
        e.preventDefault();
        closeNotifyMeModal();
      }
    });

    // Handle form submission with AJAX - use event delegation to ensure it works
    document.addEventListener('submit', function(e) {
      var form = e.target.closest('#notify-me-customer-form');
      if (form) {
        e.preventDefault();
        e.stopPropagation();
        handleFormSubmit();
        return false;
      }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal && modal.classList.contains('notify-me-modal--open')) {
        closeNotifyMeModal();
      }
    });

    // Listen for variant changes to update trigger button data
    document.addEventListener('variantChange', function(e) {
      if (e.detail && e.detail.variant) {
        updateTriggerButtonsForVariant(e.detail.variant);
      }
    });

    // Check if form was just submitted successfully (page reload case)
    checkForSuccessfulSubmission();
  }

  /**
   * Open the Notify Me modal and populate with product data
   */
  function openNotifyMeModal(triggerBtn) {
    if (!modal) return;

    // Get data from trigger button
    currentProductData = {
      productId: triggerBtn.dataset.productId || '',
      variantId: triggerBtn.dataset.variantId || '',
      productTitle: triggerBtn.dataset.productTitle || '',
      variantTitle: triggerBtn.dataset.variantTitle || '',
      productHandle: triggerBtn.dataset.productHandleId || ''
    };
    var customerEmail = triggerBtn.dataset.customerEmail || '';
    // Update tags field with product/variant info for Shopify Flow
    // Tag format: {productId}_{variantId}
    if (modalTags) {
      // var notifyTag = currentProductData.productId + '_' + currentProductData.variantId;
      var notifyTag = 'back_in_stock_start' + currentProductData.productHandle + 'back_in_stock_end';
      modalTags.value = notifyTag;
    }

    // Pre-fill email if customer is logged in
    if (modalEmail && customerEmail) {
      modalEmail.value = customerEmail;
    }

    // Show product name in modal
    if (modalProductName) {
      var displayName = currentProductData.productTitle;
      if (currentProductData.variantTitle && currentProductData.variantTitle !== 'Default Title') {
        displayName += ' - ' + currentProductData.variantTitle;
      }
      modalProductName.textContent = displayName;
    }

    // Reset modal state
    resetModalState();

    // Show modal
    modal.classList.add('notify-me-modal--open');
    document.body.style.overflow = 'hidden';

    // Focus on email input
    setTimeout(function() {
      if (modalEmail) modalEmail.focus();
    }, 100);
  }

  /**
   * Close the Notify Me modal
   */
  function closeNotifyMeModal() {
    if (!modal) return;

    modal.classList.remove('notify-me-modal--open');
    document.body.style.overflow = '';

    // Reset after animation
    setTimeout(function() {
      resetModalState();
    }, 300);
  }

  /**
   * Reset modal to initial state
   */
  function resetModalState() {
    if (modalError) modalError.style.display = 'none';
    if (modalSubmitBtn) modalSubmitBtn.disabled = false;
    if (modalSubmitText) modalSubmitText.style.display = 'inline';
    if (modalSubmitLoading) modalSubmitLoading.style.display = 'none';
    if (modalEmail) {
      modalEmail.style.borderColor = '';
    }

    // Hide success message and re-show form inputs so the modal resets fully
    if (modalForm) {
      var successDiv = modalForm.querySelector('.notify-me-modal__success');
      if (successDiv) successDiv.style.display = 'none';

      var formElements = modalForm.querySelectorAll('.notify-me-modal__input-group, .notify-me-modal__submit');
      formElements.forEach(function(el) {
        el.style.display = '';
      });
    }
  }

  /**
   * Handle form submission using AJAX
   * Submits the Shopify customer form which creates a customer with tags
   */
  function handleFormSubmit() {
    // Get form directly to ensure we have the latest reference
    var form = document.getElementById('notify-me-customer-form');
    var emailInput = form ? form.querySelector('[data-notify-me-modal-email]') : modalEmail;

    if (!form || !emailInput) return;

    var email = emailInput.value.trim();

    // Validate email
    if (!email || !isValidEmail(email)) {
      emailInput.style.borderColor = '#dc3545';
      emailInput.focus();
      return;
    }

    // Reset error styling
    emailInput.style.borderColor = '';

    // Show loading state
    var submitBtn = form.querySelector('[data-notify-me-modal-submit]');
    var submitText = submitBtn ? submitBtn.querySelector('.notify-me-modal__submit-text') : null;
    var submitLoading = submitBtn ? submitBtn.querySelector('.notify-me-modal__submit-loading') : null;

    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.style.display = 'none';
    if (submitLoading) submitLoading.style.display = 'inline-flex';

    // Get form data (includes Shopify's authenticity token)
    var formData = new FormData(form);

    // Get form action URL, fallback to /contact
    var actionUrl = form.action || '/contact#contact_form';

    // Submit using fetch
    fetch(actionUrl, {
      method: 'POST',
      body: formData
    })
    .then(function() {
      // Shopify customer form returns 200 on success
      // Store notification locally for tracking
      storeNotificationLocally({
        email: email,
        product_id: currentProductData.productId,
        variant_id: currentProductData.variantId,
        product_title: currentProductData.productTitle,
        variant_title: currentProductData.variantTitle,
        tags: modalTags ? modalTags.value : '',
        timestamp: new Date().toISOString()
      });

      // Show success message
      showSuccessState();

      // Auto-close after 3 seconds
      setTimeout(function() {
        closeNotifyMeModal();
      }, 3000);
    })
    .catch(function(error) {
      console.error('Notify Me error:', error);
      // Still consider it successful - Shopify may have processed it
      storeNotificationLocally({
        email: email,
        product_id: currentProductData.productId,
        variant_id: currentProductData.variantId,
        product_title: currentProductData.productTitle,
        variant_title: currentProductData.variantTitle,
        tags: modalTags ? modalTags.value : '',
        timestamp: new Date().toISOString(),
        error: true
      });

      showSuccessState();
      setTimeout(function() {
        closeNotifyMeModal();
      }, 3000);
    });
  }

  /**
   * Show success state in modal
   */
  function showSuccessState() {
    // Hide form elements and show success
    var formElements = modalForm.querySelectorAll('.notify-me-modal__input-group, .notify-me-modal__submit');
    formElements.forEach(function(el) {
      el.style.display = 'none';
    });

    // Show the success message (already in the HTML template)
    var successDiv = modalForm.querySelector('.notify-me-modal__success');
    if (successDiv) {
      successDiv.style.display = 'block';
    }
  }

  /**
   * Check if the form was submitted successfully on page load
   */
  function checkForSuccessfulSubmission() {
    if (!modal) return;

    // Check for customer_posted parameter in URL (Shopify adds this after form submit)
    var urlParams = new URLSearchParams(window.location.search);
    var hash = window.location.hash;

    if (urlParams.has('customer_posted') || hash.includes('notify-me-customer-form')) {
      // Clean up the URL - remove customer_posted param and hash
      cleanUpUrl();

      // Show success modal
      modal.classList.add('notify-me-modal--open');
      document.body.style.overflow = 'hidden';

      // Show success message
      showSuccessState();

      // Auto-close after 3 seconds
      setTimeout(function() {
        closeNotifyMeModal();
      }, 3000);

      return;
    }

    // Note: Removed stale success div check that caused the modal to
    // reopen after an AJAX submission. AJAX submissions are fully handled
    // inline (showSuccessState + auto-close). Only the customer_posted
    // URL param check above is needed for page-reload submissions.
  }

  /**
   * Clean up URL by removing customer_posted parameter and hash
   */
  function cleanUpUrl() {
    var url = new URL(window.location.href);
    url.searchParams.delete('customer_posted');
    url.hash = '';
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }

  /**
   * Store notification in localStorage for tracking
   */
  function storeNotificationLocally(data) {
    try {
      var notifications = JSON.parse(localStorage.getItem('mm_notify_requests') || '[]');
      notifications.push(data);
      if (notifications.length > 50) {
        notifications = notifications.slice(-50);
      }
      localStorage.setItem('mm_notify_requests', JSON.stringify(notifications));
    } catch (e) {
      console.warn('Could not store notification locally:', e);
    }
  }

  /**
   * Update trigger buttons when variant changes
   */
  function updateTriggerButtonsForVariant(variant) {
    var triggerButtons = document.querySelectorAll('[data-notify-me-trigger]');
    triggerButtons.forEach(function(btn) {
      btn.dataset.variantId = variant.id;
      btn.dataset.variantTitle = variant.title || variant.name || '';
    });
  }

  /**
   * Validate email format
   */
  function isValidEmail(email) {
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifyMe);
  } else {
    initNotifyMe();
  }
})();
