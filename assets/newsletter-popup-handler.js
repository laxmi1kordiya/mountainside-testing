/**
 * Newsletter vs Back-in-Stock Popup Handler
 *
 * Handles showing the correct success popup based on which customer form was submitted.
 * Both newsletter and back-in-stock use Shopify's customer form, so we need to differentiate.
 */

(function() {
  'use strict';

  // Check if page was just loaded after a customer form submission
  const urlParams = new URLSearchParams(window.location.search);
  const customerPosted = urlParams.get('customer_posted') === 'true';
  const formPosted = urlParams.get('form_posted') === 'true'; // Alternative Shopify param

  // Immediately hide back-in-stock popup if this is a newsletter submission
  if ((customerPosted || formPosted)) {
    const submittedFormType = localStorage.getItem('mm_last_form_submission');
    if (submittedFormType === 'newsletter') {
      // Immediately hide back-in-stock popup before it shows
      hideBackInStockPopupImmediately();
    }
  }

  if (customerPosted || formPosted) {
    // Customer form was submitted successfully
    // Determine which form it was by checking localStorage
    const submittedFormType = localStorage.getItem('mm_last_form_submission');

    if (submittedFormType === 'newsletter') {
      // Show newsletter popup
      setTimeout(function() {
        showNewsletterPopup();
      }, 100); // Small delay to ensure DOM is ready
      localStorage.removeItem('mm_last_form_submission'); // Clean up
    } else if (submittedFormType === 'back_in_stock') {
      // Hide newsletter popup if it's showing
      hideNewsletterPopup();

      // Back-in-stock popup is already handled by the theme
      // The notify-me-stock.js already shows it
      // Just clean up
      localStorage.removeItem('mm_last_form_submission');
    }
  }

  // Listen for newsletter form submissions to mark them
  document.addEventListener('DOMContentLoaded', function() {
    // Find all newsletter forms
    const newsletterForms = document.querySelectorAll('.newsletter form[action*="/contact"]');

    newsletterForms.forEach(function(form) {
      form.addEventListener('submit', function(e) {
        // Check if this is a newsletter form (has newsletter tag)
        const tagsInput = form.querySelector('input[name="contact[tags]"]');
        if (tagsInput && tagsInput.value.includes('newsletter')) {
          // Mark this as a newsletter submission
          localStorage.setItem('mm_last_form_submission', 'newsletter');
        }
      });
    });

    // Find all back-in-stock forms
    const backInStockForm = document.getElementById('notify-me-customer-form');
    if (backInStockForm) {
      backInStockForm.addEventListener('submit', function(e) {
        // Mark this as a back-in-stock submission
        localStorage.setItem('mm_last_form_submission', 'back_in_stock');
      });
    }

    // Setup popup close handlers
    setupNewsletterPopupHandlers();
  });

  /**
   * Show newsletter success popup
   */
  function showNewsletterPopup() {
    const popup = document.getElementById('newsletter-success-popup');
    if (!popup) return;

    // Show popup with animation
    popup.style.display = 'flex';
    setTimeout(function() {
      popup.classList.add('show');
    }, 10);

    // Auto-close after 4 seconds
    setTimeout(function() {
      hideNewsletterPopup();
    }, 4000);
  }

  /**
   * Hide newsletter success popup
   */
  function hideNewsletterPopup() {
    const popup = document.getElementById('newsletter-success-popup');
    if (!popup) return;

    popup.classList.remove('show');
    setTimeout(function() {
      popup.style.display = 'none';
    }, 300); // Match CSS transition duration
  }

  /**
   * Hide back-in-stock popup immediately (before it shows)
   */
  function hideBackInStockPopupImmediately() {
    // Create a style tag to hide the back-in-stock popup immediately
    const style = document.createElement('style');
    style.id = 'hide-back-in-stock-temp';
    style.textContent = `
      #notify-me-modal,
      .notify-me-modal {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Hide back-in-stock popup (when newsletter is submitted instead)
   */
  function hideBackInStockPopup() {
    const backInStockModal = document.getElementById('notify-me-modal');
    if (!backInStockModal) return;

    // Remove the open class and hide it
    backInStockModal.classList.remove('notify-me-modal--open');
    backInStockModal.style.display = 'none';

    // Also hide the success message inside if it's showing
    const successDiv = backInStockModal.querySelector('.notify-me-modal__success');
    if (successDiv) {
      successDiv.style.display = 'none';
    }
  }

  /**
   * Setup newsletter popup event handlers
   */
  function setupNewsletterPopupHandlers() {
    const popup = document.getElementById('newsletter-success-popup');
    if (!popup) return;

    // Close button
    const closeButtons = popup.querySelectorAll('[data-newsletter-popup-close]');
    closeButtons.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        hideNewsletterPopup();
      });
    });

    // ESC key to close
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && popup.classList.contains('show')) {
        hideNewsletterPopup();
      }
    });

    // Click overlay to close
    const overlay = popup.querySelector('.newsletter-success-popup__overlay');
    if (overlay) {
      overlay.addEventListener('click', function() {
        hideNewsletterPopup();
      });
    }
  }

  // Expose functions to window for manual testing if needed
  window.newsletterPopupHandler = {
    show: showNewsletterPopup,
    hide: hideNewsletterPopup
  };

  // Add test command that can be run in browser console
  window.testNewsletterPopup = function() {
    console.log('📧 Testing newsletter popup...');
    showNewsletterPopup();
  };

  window.testPopupFix = function() {
    console.log('🧪 Testing popup fix...');
    console.log('✅ Newsletter popup will show, back-in-stock popup should be hidden');
    hideBackInStockPopupImmediately();
    setTimeout(function() {
      showNewsletterPopup();
    }, 100);
  };

})();
