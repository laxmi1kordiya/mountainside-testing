/**
 * Custom JS - Collection Filters
 * Handles: price slider, mobile filter sidebar
 * All filters (availability, type, vendor, tags) use <a> links built in Liquid
 */

(function() {
  'use strict';

  const CollectionFilters = {
    init: function() {
      this.filtersContainer = document.querySelector('.productgrid--sidebar [data-collection-filters]');
      this.mobileSidebar = document.querySelector('[data-mobile-filter-sidebar]');

      this.initMobileFilterSidebar();

      if (!this.filtersContainer) return;

      this.initPriceSliders();
      this.bindMobileEvents();
    },

    /* Price range sliders */
    initPriceSliders: function() {
      var self = this;

      document.querySelectorAll('[data-price-filter]').forEach(function(priceFilter) {
        var sliderMin = priceFilter.querySelector('[data-price-slider-min]');
        var sliderMax = priceFilter.querySelector('[data-price-slider-max]');
        var minInput = priceFilter.querySelector('[data-price-min-input]');
        var maxInput = priceFilter.querySelector('[data-price-max-input]');
        var applyBtn = priceFilter.querySelector('[data-price-apply]');

        if (!sliderMin || !sliderMax) return;

        var rangeMin = parseInt(priceFilter.dataset.rangeMin) || 0;
        var rangeMax = parseInt(priceFilter.dataset.rangeMax) || 100000;
        var gap = Math.max(1, Math.floor((rangeMax - rangeMin) * 0.02));

        self.updatePriceRange(priceFilter);

        sliderMin.addEventListener('input', function() {
          var minVal = parseInt(sliderMin.value);
          var maxVal = parseInt(sliderMax.value);
          if (minVal > maxVal - gap) {
            sliderMin.value = maxVal - gap;
          }
          if (minInput) minInput.value = sliderMin.value;
          self.updatePriceRange(priceFilter);
        });

        sliderMax.addEventListener('input', function() {
          var minVal = parseInt(sliderMin.value);
          var maxVal = parseInt(sliderMax.value);
          if (maxVal < minVal + gap) {
            sliderMax.value = minVal + gap;
          }
          if (maxInput) maxInput.value = sliderMax.value;
          self.updatePriceRange(priceFilter);
        });

        if (minInput) {
          minInput.addEventListener('input', function() {
            var val = parseInt(minInput.value) || rangeMin;
            val = Math.max(rangeMin, Math.min(val, rangeMax));
            sliderMin.value = val;
            self.updatePriceRange(priceFilter);
          });
          minInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              self.submitPrice(priceFilter);
            }
          });
        }

        if (maxInput) {
          maxInput.addEventListener('input', function() {
            var val = parseInt(maxInput.value) || rangeMax;
            val = Math.min(rangeMax, Math.max(val, rangeMin));
            sliderMax.value = val;
            self.updatePriceRange(priceFilter);
          });
          maxInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              self.submitPrice(priceFilter);
            }
          });
        }

        if (applyBtn) {
          applyBtn.addEventListener('click', function() {
            self.submitPrice(priceFilter);
          });
        }
      });
    },

    /* Update price range bar visual */
    updatePriceRange: function(priceFilter) {
      var sliderMin = priceFilter.querySelector('[data-price-slider-min]');
      var sliderMax = priceFilter.querySelector('[data-price-slider-max]');
      var rangeDisplay = priceFilter.querySelector('[data-price-range]');

      if (!sliderMin || !sliderMax || !rangeDisplay) return;

      var min = parseInt(sliderMin.min);
      var max = parseInt(sliderMin.max);
      var minVal = parseInt(sliderMin.value);
      var maxVal = parseInt(sliderMax.value);

      var leftPercent = ((minVal - min) / (max - min)) * 100;
      var rightPercent = ((maxVal - min) / (max - min)) * 100;

      rangeDisplay.style.left = leftPercent + '%';
      rangeDisplay.style.width = (rightPercent - leftPercent) + '%';
    },

    /* Submit price filter - preserves current tag path */
    submitPrice: function(priceFilter) {
      if (priceFilter.closest('[data-mobile-filter-sidebar]')) return;

      var minInput = priceFilter.querySelector('[data-price-min-input]');
      var maxInput = priceFilter.querySelector('[data-price-max-input]');
      var minParam = priceFilter.dataset.minParam;
      var maxParam = priceFilter.dataset.maxParam;
      var rangeMin = parseInt(priceFilter.dataset.rangeMin) || 0;
      var rangeMax = parseInt(priceFilter.dataset.rangeMax) || 100000;
      var minVal = parseInt(minInput.value) || rangeMin;
      var maxVal = parseInt(maxInput.value) || rangeMax;

      var url = new URL(window.location.href);
      url.searchParams.delete(minParam);
      url.searchParams.delete(maxParam);
      url.searchParams.delete('page');

      if (minVal > rangeMin) url.searchParams.set(minParam, minVal);
      if (maxVal < rangeMax) url.searchParams.set(maxParam, maxVal);

      var qs = url.searchParams.toString();
      window.location.href = url.pathname + (qs ? '?' + qs : '');
    },

    /* Desktop mobile toggle */
    bindMobileEvents: function() {
      var self = this;

      document.querySelectorAll('[data-mobile-filters-toggle]').forEach(function(toggle) {
        toggle.addEventListener('click', function() { self.toggleMobileFilters(); });
      });

      document.querySelectorAll('[data-filters-close]').forEach(function(btn) {
        btn.addEventListener('click', function() { self.closeMobileFilters(); });
      });

      document.querySelectorAll('[data-filters-overlay]').forEach(function(overlay) {
        overlay.addEventListener('click', function() { self.closeMobileFilters(); });
      });
    },

    toggleMobileFilters: function() {
      if (this.filtersContainer) {
        this.filtersContainer.classList.toggle('is-open');
        document.body.classList.toggle('filters-open');
      }
    },

    closeMobileFilters: function() {
      if (this.filtersContainer) {
        this.filtersContainer.classList.remove('is-open');
        document.body.classList.remove('filters-open');
      }
      var sidebar = document.querySelector('[data-mobile-filter-sidebar]');
      var overlay = document.querySelector('[data-mobile-filter-overlay]');
      if (sidebar) sidebar.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-visible');
      document.body.classList.remove('mobile-filters-open');
    },

    /* Mobile filter sidebar */
    initMobileFilterSidebar: function() {
      var self = this;

      document.querySelectorAll('[data-mobile-filter-trigger]').forEach(function(trigger) {
        trigger.addEventListener('click', function() { self.openMobileFilters(); });
      });

      document.querySelectorAll('[data-mobile-filter-close]').forEach(function(btn) {
        btn.addEventListener('click', function() { self.closeMobileFilters(); });
      });

      document.querySelectorAll('[data-mobile-filter-overlay]').forEach(function(overlay) {
        overlay.addEventListener('click', function() { self.closeMobileFilters(); });
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') self.closeMobileFilters();
      });
    },

    openMobileFilters: function() {
      var sidebar = document.querySelector('[data-mobile-filter-sidebar]');
      var overlay = document.querySelector('[data-mobile-filter-overlay]');

      if (sidebar && sidebar.parentElement !== document.body) {
        document.body.appendChild(sidebar);
      }
      if (overlay && overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
      }

      if (sidebar) sidebar.classList.add('is-open');
      if (overlay) overlay.classList.add('is-visible');
      document.body.classList.add('mobile-filters-open');
    }
  };

  /* ============ Collection Filter (client-side, no page reload) ============ */
  const CollectionFilterHandler = {
    selectedCollections: [],

    init: function() {
      this.bindCheckboxEvents();
    },

    bindCheckboxEvents: function() {
      var self = this;
      document.addEventListener('click', function(e) {
        var label = e.target.closest('[data-collection-filter]');
        if (!label) return;

        e.preventDefault();
        e.stopPropagation();

        var checkbox = label.querySelector('.filter-list__checkbox');
        if (!checkbox) return;

        var text = label.querySelector('.filter-list__text');
        var collName = text ? text.textContent.trim() : '';
        if (!collName) return;

        var isActive = checkbox.dataset.filterActive === 'true';

        // Toggle state
        if (isActive) {
          checkbox.checked = false;
          checkbox.dataset.filterActive = 'false';
          label.classList.remove('filter-list__label--active');
          self.selectedCollections = self.selectedCollections.filter(function(c) { return c !== collName; });
        } else {
          checkbox.checked = true;
          checkbox.dataset.filterActive = 'true';
          label.classList.add('filter-list__label--active');
          if (self.selectedCollections.indexOf(collName) === -1) {
            self.selectedCollections.push(collName);
          }
        }

        // Filter products and update active tags
        self.applyFilter();
        self.updateActiveTags();
      });
    },

    applyFilter: function() {
      var productGrid = document.querySelector('.productgrid--items');
      if (!productGrid) return;

      var items = productGrid.querySelectorAll('[data-product-item]');
      if (!items.length) return;

      var selected = this.selectedCollections;
      var visibleCount = 0;

      items.forEach(function(item) {
        if (selected.length === 0) {
          item.style.display = '';
          visibleCount++;
          return;
        }

        var productCollections = (item.getAttribute('data-product-collections') || '').split('|||').map(function(c) {
          return c.trim();
        }).filter(function(c) { return c; });

        var matches = selected.some(function(sel) {
          return productCollections.indexOf(sel) !== -1;
        });

        if (matches) {
          item.style.display = '';
          visibleCount++;
        } else {
          item.style.display = 'none';
        }
      });

      // Handle no results state
      var existingNoResults = productGrid.parentNode.querySelector('.productgrid--no-results-filtered');
      if (visibleCount === 0 && selected.length > 0) {
        if (!existingNoResults) {
          existingNoResults = document.createElement('div');
          existingNoResults.className = 'productgrid--no-results productgrid--no-results-filtered';
          existingNoResults.innerHTML = '<h2 class="productgrid--no-results-title">No products match your selected filters.</h2>' +
            '<a class="productgrid--no-results-button" href="' + window.location.pathname + '">Clear Filters</a>';
          productGrid.parentNode.insertBefore(existingNoResults, productGrid.nextSibling);
        }
        existingNoResults.style.display = '';
      } else if (existingNoResults) {
        existingNoResults.style.display = 'none';
      }
    },

    updateActiveTags: function() {
      var self = this;
      var filtersDiv = document.querySelector('.productgrid--filters');

      if (this.selectedCollections.length === 0) {
        // Remove the filters div if it was created by JS and no other tags exist
        if (filtersDiv && filtersDiv.dataset.collectionFilter === 'true') {
          filtersDiv.remove();
        }
        return;
      }

      // Create or get the filters div
      if (!filtersDiv) {
        filtersDiv = document.createElement('div');
        filtersDiv.className = 'productgrid--filters';
        filtersDiv.dataset.collectionFilter = 'true';
        // Insert before the productgrid--utils or productgrid--items
        var headerWrapper = document.querySelector('.collection--header-wrapper');
        var infoDiv = headerWrapper ? headerWrapper.querySelector('.collection--information') : null;
        if (infoDiv) {
          infoDiv.parentNode.insertBefore(filtersDiv, infoDiv.nextSibling);
        }
      }

      // Build the tag list
      var html = '<ul class="filter-group--grid">';
      this.selectedCollections.forEach(function(collName) {
        html += '<li class="filter-item--grid">' +
          '<a href="#" class="active-tag" data-remove-collection="' + collName.replace(/"/g, '&quot;') + '">' +
          '<span class="filter-text">' + collName + '</span>' +
          '<span class="filter-icon--remove">' +
          '<svg aria-hidden="true" focusable="false" role="presentation" width="12" height="12" viewBox="0 0 12 12"><path d="M10 2L2 10M2 2l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
          '<span class="visually-hidden">Remove filter</span>' +
          '</span></a></li>';
      });

      if (this.selectedCollections.length > 1) {
        html += '<li class="filter-item--grid-simple"><a href="#" data-remove-all-collections>Remove All</a></li>';
      }

      html += '</ul>';
      filtersDiv.innerHTML = html;

      // Bind remove click events
      filtersDiv.querySelectorAll('[data-remove-collection]').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          var name = link.getAttribute('data-remove-collection');
          self.selectedCollections = self.selectedCollections.filter(function(c) { return c !== name; });

          // Uncheck sidebar checkbox
          document.querySelectorAll('[data-filter-group="collection"] [data-collection-filter]').forEach(function(label) {
            var text = label.querySelector('.filter-list__text');
            if (text && text.textContent.trim() === name) {
              var cb = label.querySelector('.filter-list__checkbox');
              if (cb) { cb.checked = false; cb.dataset.filterActive = 'false'; }
              label.classList.remove('filter-list__label--active');
            }
          });

          self.applyFilter();
          self.updateActiveTags();
        });
      });

      var removeAll = filtersDiv.querySelector('[data-remove-all-collections]');
      if (removeAll) {
        removeAll.addEventListener('click', function(e) {
          e.preventDefault();
          self.selectedCollections = [];
          document.querySelectorAll('[data-filter-group="collection"] [data-collection-filter]').forEach(function(label) {
            var cb = label.querySelector('.filter-list__checkbox');
            if (cb) { cb.checked = false; cb.dataset.filterActive = 'false'; }
            label.classList.remove('filter-list__label--active');
          });
          self.applyFilter();
          self.updateActiveTags();
        });
      }
    }
  };

  /* ============ Vendor Tag Fallback ============ */
  /* When a vendor is in the URL as a tag but no products have that tag,
     fetch the unfiltered collection page and show products matching the vendor */
  const VendorTagFallback = {
    init: function() {
      var grid = document.querySelector('[data-vendor-fallback-grid]');
      if (!grid) return;

      var collectionUrl = grid.getAttribute('data-collection-url');
      var currentTags = grid.getAttribute('data-current-tags') || '';
      var tagList = currentTags.split('|||').filter(function(t) { return t.length > 0; });

      if (!collectionUrl || tagList.length === 0) return;

      // Fetch the unfiltered collection page HTML
      fetch(collectionUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');

          // Restore sidebar filters from unfiltered page
          var currentFilters = document.querySelector('[data-collection-filters]');
          var fetchedFilters = doc.querySelector('[data-collection-filters]');
          if (currentFilters && fetchedFilters) {
            currentFilters.innerHTML = fetchedFilters.innerHTML;

            // Mark the active vendor and hide non-selected vendors
            currentFilters.querySelectorAll('[data-filter-group="vendor"] .filter-list__item').forEach(function(item) {
              var link = item.querySelector('a[data-tag-filter]');
              if (!link) return;
              var linkText = (link.querySelector('.filter-list__text') || {}).textContent || '';
              var linkHandle = linkText.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              var isActive = false;
              for (var i = 0; i < tagList.length; i++) {
                var tagHandle = tagList[i].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                if (linkHandle === tagHandle) {
                  isActive = true;
                  break;
                }
              }
              if (isActive) {
                link.classList.add('filter-list__label--active');
                // Update link to remove vendor (go back to unfiltered)
                link.setAttribute('href', collectionUrl);
              } else {
                // Hide non-selected vendors
                item.style.display = 'none';
              }
            });

            // Re-init price sliders after restoring filters
            CollectionFilters.initPriceSliders();
          }

          var allProducts = doc.querySelectorAll('[data-product-item]');
          var matched = [];
          var matchedVendorName = '';

          // For each tag, check if it matches a product vendor
          allProducts.forEach(function(product) {
            var vendor = (product.getAttribute('data-product-vendor') || '').toLowerCase().trim();
            var vendorHandle = vendor.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

            for (var i = 0; i < tagList.length; i++) {
              var tagHandle = tagList[i].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              if (vendorHandle === tagHandle || vendor === tagList[i].toLowerCase()) {
                matched.push(product.outerHTML);
                if (!matchedVendorName) {
                  matchedVendorName = product.getAttribute('data-product-vendor') || '';
                }
                break;
              }
            }
          });

          // Fix collection title: replace "to {vendor}" with "by {Vendor}"
          if (matchedVendorName) {
            var titleEl = document.querySelector('.collection--title');
            if (titleEl) {
              var baseTitle = doc.querySelector('.collection--title');
              var baseTitleText = baseTitle ? baseTitle.textContent.trim() : '';
              if (baseTitleText) {
                titleEl.textContent = baseTitleText + ' by ' + matchedVendorName;
              }
            }
          }

          if (matched.length > 0) {
            grid.innerHTML = matched.join('');
            // Re-init any product JS (quick shop, etc.)
            if (window.theme && window.theme.ProductGridItem) {
              grid.querySelectorAll('[data-product-item]').forEach(function(item) {
                new window.theme.ProductGridItem(item);
              });
            }
          } else {
            // No vendor matches — show no results
            var noResults = document.querySelector('[data-vendor-fallback-no-results]');
            if (noResults) noResults.style.display = '';
            grid.style.display = 'none';
          }
        })
        .catch(function() {
          var noResults = document.querySelector('[data-vendor-fallback-no-results]');
          if (noResults) noResults.style.display = '';
          grid.style.display = 'none';
        });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { CollectionFilters.init(); CollectionFilterHandler.init(); VendorTagFallback.init(); });
  } else {
    CollectionFilters.init();
    CollectionFilterHandler.init();
    VendorTagFallback.init();
  }

  window.CollectionFilters = CollectionFilters;
})();
