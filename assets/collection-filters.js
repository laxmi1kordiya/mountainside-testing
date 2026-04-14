/**
 * Collection Filters JavaScript
 * Uses Shopify's native URL-based filtering system
 * Includes client-side vendor filtering
 * Fixed: No price conversion, better availability handling
 */

(function() {
  'use strict';

  const CollectionFilters = {
    selectors: {
      filtersContainer: '[data-collection-filters]',
      filterLabel: '.filter-list__label',
      filterCheckbox: '.filter-list__checkbox',
      vendorFilterGroup: '[data-filter-group="vendor"]',
      collectionFilterGroup: '[data-filter-group="collection"]',
      priceFilter: '[data-price-filter]',
      priceMinInput: '[data-price-min-input]',
      priceMaxInput: '[data-price-max-input]',
      priceSliderMin: '[data-price-slider-min]',
      priceSliderMax: '[data-price-slider-max]',
      priceRange: '[data-price-range]',
      priceApply: '[data-price-apply]',
      mobileToggle: '[data-mobile-filters-toggle]',
      overlay: '[data-filters-overlay]',
      closeBtn: '[data-filters-close]',
      productGrid: '.productgrid--items',
      productItem: '.productgrid--item',
      // Mobile sidebar selectors
      mobileSidebar: '[data-mobile-filter-sidebar]',
      mobileFilterTrigger: '[data-mobile-filter-trigger]',
      mobileFilterClose: '[data-mobile-filter-close]',
      mobileFilterOverlay: '[data-mobile-filter-overlay]',
      mobileFilterApply: '[data-mobile-filter-apply]',
      mobileActiveFilters: '[data-mobile-active-filters]',
      mobileActiveTags: '[data-mobile-active-tags]'
    },

    // Track selected vendors for server-side filtering
    selectedVendors: [],

    // Track selected collections for server-side filtering
    selectedCollections: [],

    // Track selected tags for filtering
    selectedTags: [],

    // Track pending filter selections (before Apply is clicked)
    pendingVendors: [],
    pendingCollections: [],
    pendingTags: [],
    pendingAvailability: null,
    pendingPriceMin: null,
    pendingPriceMax: null,

    // Flag to check if we're in deferred mode (mobile sidebar)
    isDeferredMode: false,

    init: function() {
      // Get desktop filters container (inside productgrid--sidebar, not inside mobile sidebar)
      this.filtersContainer = document.querySelector('.productgrid--sidebar ' + this.selectors.filtersContainer);
      this.productGrid = document.querySelector(this.selectors.productGrid);
      this.mobileSidebar = document.querySelector(this.selectors.mobileSidebar);

      // Parse URL params to track selected filters (always do this)
      this.parseVendorParams();
      this.parseCollectionParams();
      this.parseTagParams();

      // Update pagination links to preserve vendor/collection/tag filters
      // (Must run even without filters container)
      this.updatePaginationLinks();

      // Apply client-side filtering for vendor and collection
      // (Shopify Liquid cannot read custom URL params, so JS filters products after load)
      this.applyClientSideFilters();

      // Add vendor/collection tags to active filters bar on page load
      this.addInitialActiveFilterTags();

      // Bind active filter tag clicks (for removing filters)
      this.bindActiveFilterClicks();

      // Initialize mobile filter sidebar (always run this)
      this.initMobileFilterSidebar();

      // Show mobile active filters if any are selected
      this.updateMobileActiveFilters();

      // Only continue with filter UI initialization if filters container exists
      if (!this.filtersContainer) return;

      this.bindFilterEvents();
      this.initPriceSliders();
      this.bindMobileEvents();

      // Set initial checkbox states from URL params
      this.setInitialCheckboxStates();
    },

    /**
     * Handle clicks on active filter tags to remove them
     * Works for both sidebar active filters and the bar below breadcrumbs
     */
    bindActiveFilterClicks: function() {
      const self = this;

      // Handle vendor active tags (from both sidebar and active filters bar)
      document.querySelectorAll('[data-active-vendor]').forEach(tag => {
        tag.addEventListener('click', (e) => {
          e.preventDefault();
          const vendorToRemove = tag.dataset.activeVendor;

          // Show loading state on the tag
          tag.style.opacity = '0.5';
          tag.style.pointerEvents = 'none';

          // Remove from selectedVendors array
          self.selectedVendors = self.selectedVendors.filter(v => v !== vendorToRemove);

          // Navigate with updated filters (server-side filtering)
          self.navigateWithFilters();
        });
      });

      // Handle availability active tags
      document.querySelectorAll('[data-active-availability]').forEach(tag => {
        tag.addEventListener('click', (e) => {
          e.preventDefault();

          // Remove availability param and reload
          const url = new URL(window.location.href);
          url.searchParams.delete('filter.v.availability');
          window.location.href = url.toString();
        });
      });

      // Handle collection active tags (from both sidebar and active filters bar)
      document.querySelectorAll('[data-active-collection]').forEach(tag => {
        tag.addEventListener('click', (e) => {
          e.preventDefault();
          const collectionToRemove = tag.dataset.activeCollection;

          // Show loading state on the tag
          tag.style.opacity = '0.5';
          tag.style.pointerEvents = 'none';

          // Remove from selectedCollections array
          self.selectedCollections = self.selectedCollections.filter(c => c !== collectionToRemove);

          // Navigate with updated filters (server-side filtering)
          self.navigateWithFilters();
        });
      });

      // Handle tag active tags (from both sidebar and active filters bar)
      document.querySelectorAll('[data-active-tag]').forEach(tag => {
        tag.addEventListener('click', (e) => {
          e.preventDefault();
          const tagToRemove = tag.dataset.activeTag;

          // Show loading state on the tag
          tag.style.opacity = '0.5';
          tag.style.pointerEvents = 'none';

          // Remove from selectedTags array
          self.selectedTags = self.selectedTags.filter(t => t !== tagToRemove);

          // Navigate with updated filters
          self.navigateWithFilters();
        });
      });
    },

    /**
     * Add vendor/collection tags to active filters bar on page load
     * Since Liquid can't read bracket notation params, JavaScript handles this
     */
    addInitialActiveFilterTags: function() {
      // Add vendor tags if any are selected
      if (this.selectedVendors.length > 0) {
        this.selectedVendors.forEach(vendor => {
          // Check if tag already exists (might have been added by Liquid)
          const existingTag = document.querySelector(`[data-active-vendor="${vendor}"]`);
          if (!existingTag) {
            this.addVendorActiveTag(vendor);
          }
        });
      }

      // Add collection tags if any are selected
      if (this.selectedCollections.length > 0) {
        this.selectedCollections.forEach(collection => {
          // Check if tag already exists (might have been added by Liquid)
          const existingTag = document.querySelector(`[data-active-collection="${collection}"]`);
          if (!existingTag) {
            this.addCollectionActiveTag(collection);
          }
        });
      }

      // Add tag filters if any are selected
      if (this.selectedTags.length > 0) {
        this.selectedTags.forEach(tag => {
          // Check if tag already exists
          const existingTag = document.querySelector(`[data-active-tag="${tag}"]`);
          if (!existingTag) {
            this.addTagActiveTag(tag);
          }
        });
      }
    },

    /**
     * Set checkbox states based on URL params on page load
     */
    setInitialCheckboxStates: function() {
      const params = new URLSearchParams(window.location.search);

      // Handle availability filter
      const availabilityParam = params.get('filter.v.availability');
      if (availabilityParam) {
        const availabilityGroup = this.filtersContainer.querySelector('[data-filter-group="availability"]');
        if (availabilityGroup) {
          availabilityGroup.querySelectorAll('.filter-list__checkbox').forEach(checkbox => {
            const label = checkbox.closest('.filter-list__label');
            const text = label.querySelector('.filter-list__text').textContent.trim().toLowerCase();

            // Check if this checkbox matches the URL param
            const isInStock = (availabilityParam === '1' && text.includes('in stock'));
            const isOutOfStock = (availabilityParam === '0' && text.includes('out of stock'));

            if (isInStock || isOutOfStock) {
              checkbox.checked = true;
              checkbox.dataset.filterActive = 'true';
              label.classList.add('filter-list__label--active');
            }
          });
        }
      }

      // Handle vendor filter - update checkbox states based on selectedVendors
      if (this.selectedVendors.length > 0) {
        const vendorGroup = this.filtersContainer.querySelector('[data-filter-group="vendor"]');
        if (vendorGroup) {
          vendorGroup.querySelectorAll('.filter-list__checkbox').forEach(checkbox => {
            const label = checkbox.closest('.filter-list__label');
            const vendorName = label.querySelector('.filter-list__text').textContent.trim();

            if (this.selectedVendors.includes(vendorName)) {
              checkbox.checked = true;
              checkbox.dataset.filterActive = 'true';
              label.classList.add('filter-list__label--active');
            }
          });
        }
      }

      // Handle collection filter - update checkbox states based on selectedCollections
      if (this.selectedCollections.length > 0) {
        const collectionGroup = this.filtersContainer.querySelector('[data-filter-group="collection"]');
        if (collectionGroup) {
          collectionGroup.querySelectorAll('.filter-list__checkbox').forEach(checkbox => {
            const label = checkbox.closest('.filter-list__label');
            const collectionName = label.querySelector('.filter-list__text').textContent.trim();

            if (this.selectedCollections.includes(collectionName)) {
              checkbox.checked = true;
              checkbox.dataset.filterActive = 'true';
              label.classList.add('filter-list__label--active');
            }
          });
        }
      }

      // Handle tag filter - update checkbox states based on selectedTags
      if (this.selectedTags.length > 0) {
        const tagGroup = this.filtersContainer.querySelector('[data-filter-group="tag"]');
        if (tagGroup) {
          tagGroup.querySelectorAll('.filter-list__checkbox').forEach(checkbox => {
            const label = checkbox.closest('.filter-list__label');
            const tagName = label.querySelector('.filter-list__text').textContent.trim();

            if (this.selectedTags.includes(tagName)) {
              checkbox.checked = true;
              checkbox.dataset.filterActive = 'true';
              label.classList.add('filter-list__label--active');
            }
          });
        }
      }
    },

    /**
     * Parse vendor params from URL
     */
    parseVendorParams: function() {
      const params = new URLSearchParams(window.location.search);
      this.selectedVendors = [];

      // Check for vendors param (comma-separated)
      const vendorsParam = params.get('vendors');
      if (vendorsParam) {
        this.selectedVendors = vendorsParam.split(',').map(v => decodeURIComponent(v.trim())).filter(v => v);
      }

    },

    /**
     * Parse collection params from URL (comma-separated format)
     */
    parseCollectionParams: function() {
      const params = new URLSearchParams(window.location.search);
      this.selectedCollections = [];

      // Check for collections param (comma-separated)
      const collectionsParam = params.get('collections');
      if (collectionsParam) {
        this.selectedCollections = collectionsParam.split(',').map(c => decodeURIComponent(c.trim())).filter(c => c);
      }

    },

    /**
     * Parse tag params from URL (comma-separated format)
     */
    parseTagParams: function() {
      const params = new URLSearchParams(window.location.search);
      this.selectedTags = [];

      // Check for tags param (comma-separated)
      const tagsParam = params.get('tags');
      if (tagsParam) {
        this.selectedTags = tagsParam.split(',').map(t => decodeURIComponent(t.trim())).filter(t => t);
      }
    },

    /**
     * Update pagination links to preserve vendor, collection, and tag filters
     * Shopify's pagination URLs don't include custom params, so we add them via JS
     */
    updatePaginationLinks: function() {
      // Only update if we have filters active
      if (this.selectedVendors.length === 0 && this.selectedCollections.length === 0 && this.selectedTags.length === 0) {
        return;
      }

      // Find all pagination links
      const paginationLinks = document.querySelectorAll(
        '.pagination--container a, .pagination--inner a, .pagination a, [data-pagination] a, .pagination--item[href]'
      );

      paginationLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;

        try {
          const url = new URL(href, window.location.origin);

          // Add vendors param if we have selected vendors
          if (this.selectedVendors.length > 0) {
            url.searchParams.set('vendors', this.selectedVendors.join(','));
          }

          // Add collections param if we have selected collections
          if (this.selectedCollections.length > 0) {
            url.searchParams.set('collections', this.selectedCollections.join(','));
          }

          // Add tags param if we have selected tags
          if (this.selectedTags.length > 0) {
            url.searchParams.set('tags', this.selectedTags.join(','));
          }

          link.setAttribute('href', url.toString());
        } catch (e) {
          // If URL parsing fails, try simple string append
          let newHref = href;
          const separator = href.includes('?') ? '&' : '?';

          if (this.selectedVendors.length > 0 && !href.includes('vendors=')) {
            newHref += separator + 'vendors=' + encodeURIComponent(this.selectedVendors.join(','));
          }
          if (this.selectedCollections.length > 0 && !href.includes('collections=')) {
            const sep2 = newHref.includes('?') ? '&' : '?';
            newHref += sep2 + 'collections=' + encodeURIComponent(this.selectedCollections.join(','));
          }
          if (this.selectedTags.length > 0 && !href.includes('tags=')) {
            const sep3 = newHref.includes('?') ? '&' : '?';
            newHref += sep3 + 'tags=' + encodeURIComponent(this.selectedTags.join(','));
          }

          link.setAttribute('href', newHref);
        }
      });
    },

    /**
     * Handle filter clicks using event delegation on labels
     */
    bindFilterEvents: function() {
      const self = this;

      // Use event delegation for better reliability
      this.filtersContainer.addEventListener('click', (e) => {
        // Find if we clicked on a filter label or its children
        const label = e.target.closest(self.selectors.filterLabel);
        if (!label) return;

        const checkbox = label.querySelector(self.selectors.filterCheckbox);
        if (!checkbox) return;

        // Don't do anything if disabled
        if (checkbox.disabled) {
          e.preventDefault();
          return;
        }

        // Prevent default checkbox behavior
        e.preventDefault();
        e.stopPropagation();

        // Check if this is a vendor, collection, or tag filter (use client-side filtering)
        const filterGroup = label.closest('[data-filter-group]');
        const isVendorFilter = filterGroup && filterGroup.dataset.filterGroup === 'vendor';
        const isCollectionFilter = filterGroup && filterGroup.dataset.filterGroup === 'collection';
        const isTagFilter = filterGroup && filterGroup.dataset.filterGroup === 'tag';

        if (isVendorFilter) {
          self.handleVendorFilterClick(checkbox, label);
          return;
        }

        if (isCollectionFilter) {
          self.handleCollectionFilterClick(checkbox, label);
          return;
        }

        if (isTagFilter) {
          self.handleTagFilterClick(checkbox, label);
          return;
        }

        // For availability and other filters, use URL navigation
        const isActive = checkbox.dataset.filterActive === 'true';
        let targetUrl = isActive ? checkbox.dataset.filterUrlRemove : checkbox.dataset.filterUrl;

        if (targetUrl && targetUrl.trim() !== '') {
          // Preserve vendor and collection params when navigating
          targetUrl = self.preserveCustomParams(targetUrl);

          // Show loading state
          label.style.opacity = '0.5';
          label.style.pointerEvents = 'none';

          // Navigate to filtered URL
          window.location.href = targetUrl;
        } else {
          // Fallback: Try to build URL manually for availability filter
          if (filterGroup && filterGroup.dataset.filterGroup && filterGroup.dataset.filterGroup.includes('availability')) {
            self.handleAvailabilityFallback(checkbox, label, isActive);
          }
        }
      });
    },

    /**
     * Fallback handler for availability filter if Shopify URLs are empty
     */
    handleAvailabilityFallback: function(checkbox, label, isActive) {
      const url = new URL(window.location.href);
      const filterText = label.querySelector('.filter-list__text');
      const value = filterText ? filterText.textContent.trim().toLowerCase() : '';

      // Toggle availability filter
      if (isActive) {
        url.searchParams.delete('filter.v.availability');
      } else {
        // "In stock" = 1, "Out of stock" = 0
        const availValue = value.includes('in stock') || value.includes('available') ? '1' : '0';
        url.searchParams.set('filter.v.availability', availValue);
      }

      // Preserve vendor and collection params (comma-separated format)
      if (this.selectedVendors.length > 0) {
        url.searchParams.set('vendors', this.selectedVendors.join(','));
      }
      if (this.selectedCollections.length > 0) {
        url.searchParams.set('collections', this.selectedCollections.join(','));
      }

      label.style.opacity = '0.5';
      label.style.pointerEvents = 'none';
      window.location.href = url.toString();
    },

    /**
     * Handle vendor filter click (server-side filtering - page reload)
     */
    handleVendorFilterClick: function(checkbox, label) {
      const vendorName = label.querySelector('.filter-list__text').textContent.trim();
      const isCurrentlyActive = checkbox.dataset.filterActive === 'true';

      // Show loading state
      label.style.opacity = '0.5';
      label.style.pointerEvents = 'none';

      if (isCurrentlyActive) {
        this.selectedVendors = this.selectedVendors.filter(v => v !== vendorName);
      } else {
        if (!this.selectedVendors.includes(vendorName)) {
          this.selectedVendors.push(vendorName);
        }
      }

      // Reload page with updated vendor params (server-side filtering)
      this.navigateWithFilters();
    },

    /**
     * Handle collection filter click (server-side filtering - page reload)
     */
    handleCollectionFilterClick: function(checkbox, label) {
      const collectionName = label.querySelector('.filter-list__text').textContent.trim();
      const isCurrentlyActive = checkbox.dataset.filterActive === 'true';

      // Show loading state
      label.style.opacity = '0.5';
      label.style.pointerEvents = 'none';

      if (isCurrentlyActive) {
        this.selectedCollections = this.selectedCollections.filter(c => c !== collectionName);
      } else {
        if (!this.selectedCollections.includes(collectionName)) {
          this.selectedCollections.push(collectionName);
        }
      }

      // Reload page with updated collection params (server-side filtering)
      this.navigateWithFilters();
    },

    /**
     * Handle tag filter click (client-side filtering - page reload)
     */
    handleTagFilterClick: function(checkbox, label) {
      const tagName = label.querySelector('.filter-list__text').textContent.trim();
      const isCurrentlyActive = checkbox.dataset.filterActive === 'true';

      // Show loading state
      label.style.opacity = '0.5';
      label.style.pointerEvents = 'none';

      if (isCurrentlyActive) {
        this.selectedTags = this.selectedTags.filter(t => t !== tagName);
      } else {
        if (!this.selectedTags.includes(tagName)) {
          this.selectedTags.push(tagName);
        }
      }

      // Reload page with updated tag params
      this.navigateWithFilters();
    },

    /**
     * Add vendor to active filters display (bar below breadcrumbs only)
     */
    addVendorActiveTag: function(vendorName) {
      const self = this;

      // Helper to create tag with click handler
      const createTag = () => {
        const tag = document.createElement('a');
        tag.href = '#';
        tag.className = 'active-filters-bar__tag';
        tag.dataset.activeVendor = vendorName;
        tag.innerHTML = `
          <span>${vendorName}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        `;

        tag.addEventListener('click', (e) => {
          e.preventDefault();

          // Show loading state
          tag.style.opacity = '0.5';
          tag.style.pointerEvents = 'none';

          // Remove from selected vendors
          self.selectedVendors = self.selectedVendors.filter(v => v !== vendorName);

          // Navigate with updated filters (server-side filtering)
          self.navigateWithFilters();
        });

        return tag;
      };

      // Add to active filters bar (below breadcrumbs)
      let activeBar = document.querySelector('[data-active-filters-bar]');

      // Create the bar if it doesn't exist
      if (!activeBar) {
        activeBar = document.createElement('div');
        activeBar.className = 'active-filters-bar';
        activeBar.dataset.activeFiltersBar = '';
        activeBar.innerHTML = `
          <div class="active-filters-bar__inner">
            <span class="active-filters-bar__label">Active Filters:</span>
            <div class="active-filters-bar__tags"></div>
            <a href="${window.location.pathname}" class="active-filters-bar__clear">Clear All</a>
          </div>
        `;
        // Insert after breadcrumbs
        const breadcrumbs = document.querySelector('.breadcrumbs-container, .breadcrumbs');
        if (breadcrumbs) {
          breadcrumbs.after(activeBar);
        } else {
          const wrapper = document.querySelector('.productgrid--wrapper');
          if (wrapper) {
            wrapper.prepend(activeBar);
          }
        }
      }

      activeBar.style.display = '';
      const barTagsContainer = activeBar.querySelector('.active-filters-bar__tags');
      if (barTagsContainer && !barTagsContainer.querySelector(`[data-active-vendor="${vendorName}"]`)) {
        barTagsContainer.appendChild(createTag());
      }
    },

    /**
     * Remove vendor from active filters display (bar below breadcrumbs)
     */
    removeVendorActiveTag: function(vendorName) {
      document.querySelectorAll(`[data-active-vendor="${vendorName}"]`).forEach(tag => tag.remove());
      this.checkActiveFiltersBarVisibility();
    },

    /**
     * Add collection to active filters display (bar below breadcrumbs only)
     */
    addCollectionActiveTag: function(collectionName) {
      const self = this;

      // Helper to create tag with click handler
      const createTag = () => {
        const tag = document.createElement('a');
        tag.href = '#';
        tag.className = 'active-filters-bar__tag';
        tag.dataset.activeCollection = collectionName;
        tag.innerHTML = `
          <span>${collectionName}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        `;

        tag.addEventListener('click', (e) => {
          e.preventDefault();

          // Show loading state
          tag.style.opacity = '0.5';
          tag.style.pointerEvents = 'none';

          // Remove from selected collections
          self.selectedCollections = self.selectedCollections.filter(c => c !== collectionName);

          // Navigate with updated filters (server-side filtering)
          self.navigateWithFilters();
        });

        return tag;
      };

      // Add to active filters bar (below breadcrumbs)
      let activeBar = document.querySelector('[data-active-filters-bar]');

      // Create the bar if it doesn't exist
      if (!activeBar) {
        activeBar = document.createElement('div');
        activeBar.className = 'active-filters-bar';
        activeBar.dataset.activeFiltersBar = '';
        activeBar.innerHTML = `
          <div class="active-filters-bar__inner">
            <span class="active-filters-bar__label">Active Filters:</span>
            <div class="active-filters-bar__tags"></div>
            <a href="${window.location.pathname}" class="active-filters-bar__clear">Clear All</a>
          </div>
        `;
        // Insert after breadcrumbs
        const breadcrumbs = document.querySelector('.breadcrumbs-container, .breadcrumbs');
        if (breadcrumbs) {
          breadcrumbs.after(activeBar);
        } else {
          const wrapper = document.querySelector('.productgrid--wrapper');
          if (wrapper) {
            wrapper.prepend(activeBar);
          }
        }
      }

      activeBar.style.display = '';
      const barTagsContainer = activeBar.querySelector('.active-filters-bar__tags');
      if (barTagsContainer && !barTagsContainer.querySelector(`[data-active-collection="${collectionName}"]`)) {
        barTagsContainer.appendChild(createTag());
      }
    },

    /**
     * Remove collection from active filters display (bar below breadcrumbs)
     */
    removeCollectionActiveTag: function(collectionName) {
      document.querySelectorAll(`[data-active-collection="${collectionName}"]`).forEach(tag => tag.remove());
      this.checkActiveFiltersBarVisibility();
    },

    /**
     * Add tag to active filters display (bar below breadcrumbs only)
     */
    addTagActiveTag: function(tagName) {
      const self = this;

      // Helper to create tag with click handler
      const createTag = () => {
        const tag = document.createElement('a');
        tag.href = '#';
        tag.className = 'active-filters-bar__tag';
        tag.dataset.activeTag = tagName;
        tag.innerHTML = `
          <span>${tagName}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        `;

        tag.addEventListener('click', (e) => {
          e.preventDefault();

          // Show loading state
          tag.style.opacity = '0.5';
          tag.style.pointerEvents = 'none';

          // Remove from selected tags
          self.selectedTags = self.selectedTags.filter(t => t !== tagName);

          // Navigate with updated filters
          self.navigateWithFilters();
        });

        return tag;
      };

      // Add to active filters bar (below breadcrumbs)
      let activeBar = document.querySelector('[data-active-filters-bar]');

      // Create the bar if it doesn't exist
      if (!activeBar) {
        activeBar = document.createElement('div');
        activeBar.className = 'active-filters-bar';
        activeBar.dataset.activeFiltersBar = '';
        activeBar.innerHTML = `
          <div class="active-filters-bar__inner">
            <span class="active-filters-bar__label">Active Filters:</span>
            <div class="active-filters-bar__tags"></div>
            <a href="${window.location.pathname}" class="active-filters-bar__clear">Clear All</a>
          </div>
        `;
        // Insert after breadcrumbs
        const breadcrumbs = document.querySelector('.breadcrumbs-container, .breadcrumbs');
        if (breadcrumbs) {
          breadcrumbs.after(activeBar);
        } else {
          const wrapper = document.querySelector('.productgrid--wrapper');
          if (wrapper) {
            wrapper.prepend(activeBar);
          }
        }
      }

      activeBar.style.display = '';
      const barTagsContainer = activeBar.querySelector('.active-filters-bar__tags');
      if (barTagsContainer && !barTagsContainer.querySelector(`[data-active-tag="${tagName}"]`)) {
        barTagsContainer.appendChild(createTag());
      }
    },

    /**
     * Remove tag from active filters display (bar below breadcrumbs)
     */
    removeTagActiveTag: function(tagName) {
      document.querySelectorAll(`[data-active-tag="${tagName}"]`).forEach(tag => tag.remove());
      this.checkActiveFiltersBarVisibility();
    },

    /**
     * Check if active filters bar (below breadcrumbs) should be hidden
     */
    checkActiveFiltersBarVisibility: function() {
      const activeBar = document.querySelector('[data-active-filters-bar]');
      if (activeBar) {
        const remainingTags = activeBar.querySelectorAll('.active-filters-bar__tag');
        if (remainingTags.length === 0) {
          activeBar.style.display = 'none';
        }
      }
    },

    /**
     * Preserve vendor and collection params when navigating to a new URL
     * Uses comma-separated format for vendor and collection params
     */
    preserveCustomParams: function(targetUrl) {
      const url = new URL(targetUrl, window.location.origin);

      // Add vendors as comma-separated string
      if (this.selectedVendors.length > 0) {
        url.searchParams.set('vendors', this.selectedVendors.join(','));
      }

      // Add collections as comma-separated string
      if (this.selectedCollections.length > 0) {
        url.searchParams.set('collections', this.selectedCollections.join(','));
      }

      // Add tags as comma-separated string
      if (this.selectedTags.length > 0) {
        url.searchParams.set('tags', this.selectedTags.join(','));
      }

      return url.toString();
    },

    /**
     * Navigate to current URL with all filters applied (server-side filtering)
     * Uses comma-separated format for vendor and collection params
     */
    navigateWithFilters: function() {
      const url = new URL(window.location.href);

      // Remove existing vendor/collection/tag params
      url.searchParams.delete('vendors');
      url.searchParams.delete('collections');
      url.searchParams.delete('tags');

      // Reset to page 1 when filters change
      url.searchParams.delete('page');

      // Add vendors as comma-separated string
      if (this.selectedVendors.length > 0) {
        url.searchParams.set('vendors', this.selectedVendors.join(','));
      }

      // Add collections as comma-separated string
      if (this.selectedCollections.length > 0) {
        url.searchParams.set('collections', this.selectedCollections.join(','));
      }

      // Add tags as comma-separated string
      if (this.selectedTags.length > 0) {
        url.searchParams.set('tags', this.selectedTags.join(','));
      }

      // Navigate to the new URL (triggers client-side filtering)
      window.location.href = url.toString();
    },

    /**
     * Initialize price range sliders - NO CONVERSION, exact values
     */
    initPriceSliders: function() {
      const self = this;

      document.querySelectorAll(this.selectors.priceFilter).forEach(priceFilter => {
        const sliderMin = priceFilter.querySelector(this.selectors.priceSliderMin);
        const sliderMax = priceFilter.querySelector(this.selectors.priceSliderMax);
        const minInput = priceFilter.querySelector(this.selectors.priceMinInput);
        const maxInput = priceFilter.querySelector(this.selectors.priceMaxInput);
        const applyBtn = priceFilter.querySelector(this.selectors.priceApply);

        if (!sliderMin || !sliderMax) return;

        // Use new data attributes (no conversion)
        const rangeMin = parseInt(priceFilter.dataset.rangeMin) || 0;
        const rangeMax = parseInt(priceFilter.dataset.rangeMax) || 100000;
        const gap = Math.max(1, Math.floor((rangeMax - rangeMin) * 0.02));

        // Update display on load
        this.updatePriceRangeDisplay(priceFilter);

        // Slider min change
        sliderMin.addEventListener('input', () => {
          let minVal = parseInt(sliderMin.value);
          let maxVal = parseInt(sliderMax.value);

          if (minVal > maxVal - gap) {
            minVal = maxVal - gap;
            sliderMin.value = minVal;
          }

          if (minInput) minInput.value = minVal;
          self.updatePriceRangeDisplay(priceFilter);
        });

        // Slider max change
        sliderMax.addEventListener('input', () => {
          let minVal = parseInt(sliderMin.value);
          let maxVal = parseInt(sliderMax.value);

          if (maxVal < minVal + gap) {
            maxVal = minVal + gap;
            sliderMax.value = maxVal;
          }

          if (maxInput) maxInput.value = maxVal;
          self.updatePriceRangeDisplay(priceFilter);
        });

        // Input min change
        if (minInput) {
          minInput.addEventListener('input', () => {
            let val = parseInt(minInput.value) || rangeMin;
            val = Math.max(rangeMin, Math.min(val, rangeMax));
            sliderMin.value = val;
            self.updatePriceRangeDisplay(priceFilter);
          });

          minInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              self.submitPriceFilter(priceFilter);
            }
          });
        }

        // Input max change
        if (maxInput) {
          maxInput.addEventListener('input', () => {
            let val = parseInt(maxInput.value) || rangeMax;
            val = Math.min(rangeMax, Math.max(val, rangeMin));
            sliderMax.value = val;
            self.updatePriceRangeDisplay(priceFilter);
          });

          maxInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              self.submitPriceFilter(priceFilter);
            }
          });
        }

        // Apply button
        if (applyBtn) {
          applyBtn.addEventListener('click', () => {
            self.submitPriceFilter(priceFilter);
          });
        }
      });
    },

    /**
     * Update the visual price range bar
     */
    updatePriceRangeDisplay: function(priceFilter) {
      const sliderMin = priceFilter.querySelector(this.selectors.priceSliderMin);
      const sliderMax = priceFilter.querySelector(this.selectors.priceSliderMax);
      const rangeDisplay = priceFilter.querySelector(this.selectors.priceRange);

      if (!sliderMin || !sliderMax || !rangeDisplay) return;

      const min = parseInt(sliderMin.min);
      const max = parseInt(sliderMin.max);
      const minVal = parseInt(sliderMin.value);
      const maxVal = parseInt(sliderMax.value);

      const leftPercent = ((minVal - min) / (max - min)) * 100;
      const rightPercent = ((maxVal - min) / (max - min)) * 100;

      rangeDisplay.style.left = leftPercent + '%';
      rangeDisplay.style.width = (rightPercent - leftPercent) + '%';
    },

    /**
     * Submit price filter - NO conversion, exact values
     * Skips immediate navigation if inside mobile sidebar (deferred mode)
     */
    submitPriceFilter: function(priceFilter) {
      // Check if this price filter is inside the mobile sidebar
      // If so, skip immediate navigation (use Apply Filters button instead)
      if (priceFilter.closest('[data-mobile-filter-sidebar]')) {
        return;
      }

      const minInput = priceFilter.querySelector(this.selectors.priceMinInput);
      const maxInput = priceFilter.querySelector(this.selectors.priceMaxInput);

      const minParam = priceFilter.dataset.minParam;
      const maxParam = priceFilter.dataset.maxParam;

      const rangeMin = parseInt(priceFilter.dataset.rangeMin) || 0;
      const rangeMax = parseInt(priceFilter.dataset.rangeMax) || 100000;

      // Get exact user input - NO conversion
      const minVal = parseInt(minInput.value) || rangeMin;
      const maxVal = parseInt(maxInput.value) || rangeMax;

      // Build URL with current params
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;

      // Remove existing price params
      searchParams.delete(minParam);
      searchParams.delete(maxParam);

      // Submit exact values - NO conversion
      if (minVal > rangeMin) {
        searchParams.set(minParam, minVal);
      }

      if (maxVal < rangeMax) {
        searchParams.set(maxParam, maxVal);
      }

      // Preserve vendor and collection params (comma-separated format)
      if (this.selectedVendors.length > 0) {
        searchParams.set('vendors', this.selectedVendors.join(','));
      }
      if (this.selectedCollections.length > 0) {
        searchParams.set('collections', this.selectedCollections.join(','));
      }

      // Navigate to filtered URL
      const newUrl = url.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
      window.location.href = newUrl;
    },

    /**
     * Mobile filter drawer
     */
    bindMobileEvents: function() {
      document.querySelectorAll(this.selectors.mobileToggle).forEach(toggle => {
        toggle.addEventListener('click', () => this.toggleMobileFilters());
      });

      document.querySelectorAll(this.selectors.closeBtn).forEach(btn => {
        btn.addEventListener('click', () => this.closeMobileFilters());
      });

      document.querySelectorAll(this.selectors.overlay).forEach(overlay => {
        overlay.addEventListener('click', () => this.closeMobileFilters());
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeMobileFilters();
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
    },

    /**
     * Apply client-side filtering for vendor and collection
     * Shopify Liquid cannot read custom URL params, so we filter products after page load
     */
    applyClientSideFilters: function() {
      // Only filter if vendors, collections, or tags are selected
      if (this.selectedVendors.length === 0 && this.selectedCollections.length === 0 && this.selectedTags.length === 0) {
        return;
      }

      const productGrid = document.querySelector(this.selectors.productGrid);
      if (!productGrid) return;

      const productItems = productGrid.querySelectorAll(this.selectors.productItem);
      if (!productItems.length) return;

      let visibleCount = 0;
      let totalCount = productItems.length;

      productItems.forEach(item => {
        const productVendor = item.dataset.productVendor || '';
        const productCollections = item.dataset.productCollections || '';
        const productTags = item.dataset.productTags || '';
        const productCollectionsArray = productCollections.split('|||').map(c => c.trim()).filter(c => c);
        const productTagsArray = productTags.split('|||').map(t => t.trim()).filter(t => t);

        let matchesVendor = true;
        let matchesCollection = true;
        let matchesTag = true;

        // Check vendor filter
        if (this.selectedVendors.length > 0) {
          matchesVendor = this.selectedVendors.includes(productVendor);
        }

        // Check collection filter
        if (this.selectedCollections.length > 0) {
          matchesCollection = this.selectedCollections.some(selectedCol =>
            productCollectionsArray.includes(selectedCol)
          );
        }

        // Check tag filter
        if (this.selectedTags.length > 0) {
          matchesTag = this.selectedTags.some(selectedTag =>
            productTagsArray.includes(selectedTag)
          );
        }

        // Show/hide based on filter matches
        if (matchesVendor && matchesCollection && matchesTag) {
          item.style.display = '';
          item.classList.remove('filter-hidden');
          visibleCount++;
        } else {
          item.style.display = 'none';
          item.classList.add('filter-hidden');
        }
      });

      // Show/hide empty state
      this.updateFilteredEmptyState(productGrid, visibleCount);

      // Update product count display
      this.updateProductCount(visibleCount, totalCount);

      // Hide pagination if client-side filtering is active
      // (Pagination is based on all products, not filtered ones)
      this.updatePaginationVisibility(visibleCount, totalCount);
    },

    /**
     * Show empty state if no products match filters
     */
    updateFilteredEmptyState: function(productGrid, visibleCount) {
      let emptyState = document.querySelector('[data-filtered-empty-state]');

      if (visibleCount === 0) {
        // Create empty state if it doesn't exist
        if (!emptyState) {
          emptyState = document.createElement('div');
          emptyState.className = 'filtered-empty-state';
          emptyState.dataset.filteredEmptyState = '';
          emptyState.innerHTML = `
            <div class="filtered-empty-state__content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="M21 21l-4.35-4.35"></path>
              </svg>
              <h3>No products found</h3>
              <p>No products match your selected filters. Try removing some filters or <a href="${window.location.pathname}">clear all filters</a>.</p>
            </div>
          `;
          productGrid.parentNode.insertBefore(emptyState, productGrid.nextSibling);
        }
        emptyState.style.display = 'block';
        productGrid.style.display = 'none';
      } else {
        if (emptyState) {
          emptyState.style.display = 'none';
        }
        productGrid.style.display = '';
      }
    },

    /**
     * Update the product count display
     */
    updateProductCount: function(visibleCount, totalCount) {
      // Find product count elements (common class names)
      const countElements = document.querySelectorAll(
        '.collection-count, .products-count, [data-product-count], .productgrid--header-count'
      );

      countElements.forEach(el => {
        // Try to update text content
        const originalText = el.textContent;
        // Replace numbers with filtered count
        const newText = originalText.replace(/\d+/, visibleCount);
        el.textContent = newText;
      });

      // Also add a filtered indicator if filtering is active
      const filterIndicator = document.querySelector('[data-filter-indicator]');
      if (this.selectedVendors.length > 0 || this.selectedCollections.length > 0) {
        if (!filterIndicator) {
          const indicator = document.createElement('span');
          indicator.className = 'filter-indicator';
          indicator.dataset.filterIndicator = '';
          indicator.textContent = ` (filtered from ${totalCount})`;
          indicator.style.cssText = 'color: #666; font-size: 0.9em;';

          const countEl = document.querySelector('.collection-count, .products-count, [data-product-count]');
          if (countEl) {
            countEl.appendChild(indicator);
          }
        }
      }
    },

    /**
     * Hide pagination when client-side filtering is active
     * Since we're filtering products that Shopify already paginated,
     * pagination becomes invalid when filters hide products
     */
    updatePaginationVisibility: function(visibleCount, totalCount) {
      // Find pagination containers
      const paginationContainers = document.querySelectorAll(
        '.pagination--container, .pagination, [data-pagination], nav[aria-label="Pagination"]'
      );

      // Check if we're on a page > 1
      const params = new URLSearchParams(window.location.search);
      const currentPage = parseInt(params.get('page')) || 1;

      // If filtering is active (some products were hidden)
      const filteringActive = this.selectedVendors.length > 0 || this.selectedCollections.length > 0 || this.selectedTags.length > 0;

      if (filteringActive) {
        // Hide pagination completely when client-side filtering is active
        // This is because Shopify's pagination is based on ALL products,
        // but we're only showing filtered products
        paginationContainers.forEach(container => {
          container.style.display = 'none';
        });

        // If on page > 1 and no visible products, show message to go to page 1
        if (currentPage > 1 && visibleCount === 0) {
          const emptyState = document.querySelector('[data-filtered-empty-state]');
          if (emptyState) {
            const content = emptyState.querySelector('.filtered-empty-state__content p');
            if (content) {
              // Build URL for page 1 with current filters
              const url = new URL(window.location.href);
              url.searchParams.delete('page');
              content.innerHTML = `All matching products are on <a href="${url.toString()}">page 1</a>. Go back to see your filtered results.`;
            }
          }
        }
      }
    },

    /**
     * Initialize mobile filter sidebar events
     */
    initMobileFilterSidebar: function() {
      const self = this;

      // Mobile filter trigger button
      document.querySelectorAll(this.selectors.mobileFilterTrigger).forEach(trigger => {
        trigger.addEventListener('click', () => self.openMobileFilters());
      });

      // Close button
      document.querySelectorAll(this.selectors.mobileFilterClose).forEach(btn => {
        btn.addEventListener('click', () => self.closeMobileFilters());
      });

      // Overlay click
      document.querySelectorAll(this.selectors.mobileFilterOverlay).forEach(overlay => {
        overlay.addEventListener('click', () => self.closeMobileFilters());
      });

      // Apply button - applies all pending filters and navigates
      document.querySelectorAll(this.selectors.mobileFilterApply).forEach(btn => {
        btn.addEventListener('click', () => self.applyAllPendingFilters());
      });

      // Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') self.closeMobileFilters();
      });

      // Bind filter events inside mobile sidebar for deferred mode
      if (this.mobileSidebar) {
        this.bindMobileSidebarFilterEvents();
      }
    },

    /**
     * Bind filter events inside mobile sidebar (deferred mode - no immediate navigation)
     */
    bindMobileSidebarFilterEvents: function() {
      const self = this;
      const sidebar = this.mobileSidebar;
      if (!sidebar) return;

      // Handle filter clicks with event delegation
      sidebar.addEventListener('click', (e) => {
        const label = e.target.closest(self.selectors.filterLabel);
        if (!label) return;

        const checkbox = label.querySelector(self.selectors.filterCheckbox);
        if (!checkbox || checkbox.disabled) return;

        e.preventDefault();
        e.stopPropagation();

        const filterGroup = label.closest('[data-filter-group]');
        if (!filterGroup) return;

        const groupType = filterGroup.dataset.filterGroup;
        const isActive = checkbox.dataset.filterActive === 'true';
        const filterText = label.querySelector('.filter-list__text');
        const filterValue = filterText ? filterText.textContent.trim() : '';

        // Toggle the checkbox visual state
        if (isActive) {
          checkbox.checked = false;
          checkbox.dataset.filterActive = 'false';
          label.classList.remove('filter-list__label--active');
        } else {
          checkbox.checked = true;
          checkbox.dataset.filterActive = 'true';
          label.classList.add('filter-list__label--active');
        }

        // Update pending filters based on group type
        if (groupType === 'vendor') {
          if (isActive) {
            self.pendingVendors = self.pendingVendors.filter(v => v !== filterValue);
          } else {
            if (!self.pendingVendors.includes(filterValue)) {
              self.pendingVendors.push(filterValue);
            }
          }
        } else if (groupType === 'collection') {
          if (isActive) {
            self.pendingCollections = self.pendingCollections.filter(c => c !== filterValue);
          } else {
            if (!self.pendingCollections.includes(filterValue)) {
              self.pendingCollections.push(filterValue);
            }
          }
        } else if (groupType === 'tag') {
          if (isActive) {
            self.pendingTags = self.pendingTags.filter(t => t !== filterValue);
          } else {
            if (!self.pendingTags.includes(filterValue)) {
              self.pendingTags.push(filterValue);
            }
          }
        } else if (groupType === 'availability' || groupType.includes('availability')) {
          // For availability, it's a toggle (only one can be active)
          // First, uncheck all other availability checkboxes
          filterGroup.querySelectorAll('.filter-list__checkbox').forEach(cb => {
            if (cb !== checkbox) {
              cb.checked = false;
              cb.dataset.filterActive = 'false';
              cb.closest('.filter-list__label').classList.remove('filter-list__label--active');
            }
          });

          if (isActive) {
            self.pendingAvailability = null;
          } else {
            // Determine availability value from text
            const text = filterValue.toLowerCase();
            self.pendingAvailability = (text.includes('in stock') || text.includes('available')) ? '1' : '0';
          }
        }
      });

      // Handle price filter inputs
      const priceMinInput = sidebar.querySelector(this.selectors.priceMinInput);
      const priceMaxInput = sidebar.querySelector(this.selectors.priceMaxInput);

      if (priceMinInput) {
        priceMinInput.addEventListener('input', () => {
          self.pendingPriceMin = priceMinInput.value || null;
        });
      }

      if (priceMaxInput) {
        priceMaxInput.addEventListener('input', () => {
          self.pendingPriceMax = priceMaxInput.value || null;
        });
      }
    },

    /**
     * Apply all pending filters and navigate
     */
    applyAllPendingFilters: function() {
      const url = new URL(window.location.href);
      const priceFilter = this.mobileSidebar ? this.mobileSidebar.querySelector('[data-price-filter]') : null;

      // Clear existing filter params
      url.searchParams.delete('vendors');
      url.searchParams.delete('collections');
      url.searchParams.delete('tags');
      url.searchParams.delete('filter.v.availability');
      url.searchParams.delete('page');

      // Clear existing price params
      if (priceFilter) {
        const minParam = priceFilter.dataset.minParam;
        const maxParam = priceFilter.dataset.maxParam;
        url.searchParams.delete(minParam);
        url.searchParams.delete(maxParam);
      }

      // Add pending vendors
      if (this.pendingVendors.length > 0) {
        url.searchParams.set('vendors', this.pendingVendors.join(','));
      }

      // Add pending collections
      if (this.pendingCollections.length > 0) {
        url.searchParams.set('collections', this.pendingCollections.join(','));
      }

      // Add pending tags
      if (this.pendingTags.length > 0) {
        url.searchParams.set('tags', this.pendingTags.join(','));
      }

      // Add pending availability
      if (this.pendingAvailability !== null) {
        url.searchParams.set('filter.v.availability', this.pendingAvailability);
      }

      // Add pending price filters
      if (priceFilter) {
        const minParam = priceFilter.dataset.minParam;
        const maxParam = priceFilter.dataset.maxParam;
        const rangeMin = parseInt(priceFilter.dataset.rangeMin) || 0;
        const rangeMax = parseInt(priceFilter.dataset.rangeMax) || 100000;

        // Get values from inputs (they may have been updated)
        const minInput = this.mobileSidebar.querySelector(this.selectors.priceMinInput);
        const maxInput = this.mobileSidebar.querySelector(this.selectors.priceMaxInput);

        const minVal = minInput ? parseInt(minInput.value) : null;
        const maxVal = maxInput ? parseInt(maxInput.value) : null;

        // Submit exact values - no conversion
        if (minVal && minVal > rangeMin) {
          url.searchParams.set(minParam, minVal);
        }

        if (maxVal && maxVal < rangeMax) {
          url.searchParams.set(maxParam, maxVal);
        }
      }

      // Navigate to the new URL
      window.location.href = url.toString();
    },

    /**
     * Open mobile filter sidebar
     */
    openMobileFilters: function() {
      const sidebar = document.querySelector(this.selectors.mobileSidebar);
      const overlay = document.querySelector(this.selectors.mobileFilterOverlay);

      // Initialize pending filters with current selections
      this.pendingVendors = [...this.selectedVendors];
      this.pendingCollections = [...this.selectedCollections];
      this.pendingTags = [...this.selectedTags];

      // Get current availability from URL
      const params = new URLSearchParams(window.location.search);
      this.pendingAvailability = params.get('filter.v.availability');

      // Get current price from URL
      const priceFilter = sidebar ? sidebar.querySelector('[data-price-filter]') : null;
      if (priceFilter) {
        const minParam = priceFilter.dataset.minParam;
        const maxParam = priceFilter.dataset.maxParam;
        this.pendingPriceMin = params.get(minParam);
        this.pendingPriceMax = params.get(maxParam);
      }

      // Move sidebar and overlay to body to escape any stacking context issues
      if (sidebar && sidebar.parentElement !== document.body) {
        document.body.appendChild(sidebar);
      }
      if (overlay && overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
      }

      // Sync active filters in sidebar with current URL state
      this.syncSidebarActiveFilters(sidebar);

      if (sidebar) {
        sidebar.classList.add('is-open');
      }
      if (overlay) {
        overlay.classList.add('is-visible');
      }
      document.body.classList.add('mobile-filters-open');
    },

    /**
     * Sync sidebar checkboxes with currently active filters from URL
     */
    syncSidebarActiveFilters: function(sidebar) {
      if (!sidebar) return;

      const self = this;

      // Reset all checkboxes first
      sidebar.querySelectorAll(this.selectors.filterCheckbox).forEach(checkbox => {
        checkbox.checked = false;
        checkbox.dataset.filterActive = 'false';
        const label = checkbox.closest('.filter-list__label');
        if (label) label.classList.remove('filter-list__label--active');
      });

      // Mark vendor filters as active
      this.selectedVendors.forEach(vendor => {
        sidebar.querySelectorAll('[data-filter-group="vendor"] .filter-list__label').forEach(label => {
          const text = label.querySelector('.filter-list__text');
          if (text && text.textContent.trim() === vendor) {
            const checkbox = label.querySelector(self.selectors.filterCheckbox);
            if (checkbox) {
              checkbox.checked = true;
              checkbox.dataset.filterActive = 'true';
              label.classList.add('filter-list__label--active');
            }
          }
        });
      });

      // Mark collection filters as active
      this.selectedCollections.forEach(collection => {
        sidebar.querySelectorAll('[data-filter-group="collection"] .filter-list__label').forEach(label => {
          const text = label.querySelector('.filter-list__text');
          if (text && text.textContent.trim() === collection) {
            const checkbox = label.querySelector(self.selectors.filterCheckbox);
            if (checkbox) {
              checkbox.checked = true;
              checkbox.dataset.filterActive = 'true';
              label.classList.add('filter-list__label--active');
            }
          }
        });
      });

      // Mark tag filters as active
      this.selectedTags.forEach(tag => {
        sidebar.querySelectorAll('[data-filter-group="tag"] .filter-list__label').forEach(label => {
          const text = label.querySelector('.filter-list__text');
          if (text && text.textContent.trim() === tag) {
            const checkbox = label.querySelector(self.selectors.filterCheckbox);
            if (checkbox) {
              checkbox.checked = true;
              checkbox.dataset.filterActive = 'true';
              label.classList.add('filter-list__label--active');
            }
          }
        });
      });

      // Mark availability filter as active
      if (this.pendingAvailability !== null) {
        sidebar.querySelectorAll('[data-filter-group="availability"] .filter-list__label').forEach(label => {
          const text = label.querySelector('.filter-list__text');
          if (text) {
            const textContent = text.textContent.trim().toLowerCase();
            const isInStock = textContent.includes('in stock');
            const shouldBeActive = (isInStock && this.pendingAvailability === '1') ||
                                   (!isInStock && this.pendingAvailability === '0');
            if (shouldBeActive) {
              const checkbox = label.querySelector(self.selectors.filterCheckbox);
              if (checkbox) {
                checkbox.checked = true;
                checkbox.dataset.filterActive = 'true';
                label.classList.add('filter-list__label--active');
              }
            }
          }
        });
      }
    },

    /**
     * Close mobile filter sidebar
     */
    closeMobileFilters: function() {
      const sidebar = document.querySelector(this.selectors.mobileSidebar);
      const overlay = document.querySelector(this.selectors.mobileFilterOverlay);

      if (sidebar) {
        sidebar.classList.remove('is-open');
        sidebar.classList.remove('is-loading');
      }
      if (overlay) {
        overlay.classList.remove('is-visible');
      }
      document.body.classList.remove('mobile-filters-open');
    },

    /**
     * Update mobile active filters display
     * Shows active filters below the filter trigger bar on mobile
     */
    updateMobileActiveFilters: function() {
      const self = this;
      const mobileActiveFilters = document.querySelector(this.selectors.mobileActiveFilters);
      const mobileActiveTags = document.querySelector(this.selectors.mobileActiveTags);

      if (!mobileActiveFilters || !mobileActiveTags) return;

      // Clear existing tags
      mobileActiveTags.innerHTML = '';

      let hasActiveFilters = false;

      // Add vendor tags
      this.selectedVendors.forEach(vendor => {
        hasActiveFilters = true;
        const tag = self.createMobileActiveTag(vendor, 'vendor', vendor);
        mobileActiveTags.appendChild(tag);
      });

      // Add collection tags
      this.selectedCollections.forEach(collection => {
        hasActiveFilters = true;
        const tag = self.createMobileActiveTag(collection, 'collection', collection);
        mobileActiveTags.appendChild(tag);
      });

      // Add tag filter tags
      this.selectedTags.forEach(tagName => {
        hasActiveFilters = true;
        const tag = self.createMobileActiveTag(tagName, 'tag', tagName);
        mobileActiveTags.appendChild(tag);
      });

      // Check for availability filter
      const params = new URLSearchParams(window.location.search);
      const availability = params.get('filter.v.availability');
      if (availability !== null) {
        hasActiveFilters = true;
        const label = availability === '1' ? 'In Stock' : 'Out of Stock';
        const tag = self.createMobileActiveTag(label, 'availability', availability);
        mobileActiveTags.appendChild(tag);
      }

      // Check for price filter
      const priceMin = params.get('filter.v.price.gte');
      const priceMax = params.get('filter.v.price.lte');
      if (priceMin || priceMax) {
        hasActiveFilters = true;
        let priceLabel = 'Price: ';
        if (priceMin && priceMax) {
          priceLabel += '$' + priceMin + ' - $' + priceMax;
        } else if (priceMin) {
          priceLabel += '$' + priceMin + '+';
        } else {
          priceLabel += 'Up to $' + priceMax;
        }
        const tag = self.createMobileActiveTag(priceLabel, 'price', '');
        mobileActiveTags.appendChild(tag);
      }

      // Show/hide the container
      mobileActiveFilters.style.display = hasActiveFilters ? '' : 'none';
    },

    /**
     * Create a mobile active filter tag element
     */
    createMobileActiveTag: function(label, type, value) {
      const self = this;
      const tag = document.createElement('a');
      tag.href = '#';
      tag.className = 'mobile-active-filters__tag';
      tag.dataset.filterType = type;
      tag.dataset.filterValue = value;
      tag.innerHTML = `
        <span>${label}</span>
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `;

      tag.addEventListener('click', (e) => {
        e.preventDefault();
        tag.style.opacity = '0.5';
        tag.style.pointerEvents = 'none';

        if (type === 'vendor') {
          self.selectedVendors = self.selectedVendors.filter(v => v !== value);
          self.navigateWithFilters();
        } else if (type === 'collection') {
          self.selectedCollections = self.selectedCollections.filter(c => c !== value);
          self.navigateWithFilters();
        } else if (type === 'tag') {
          self.selectedTags = self.selectedTags.filter(t => t !== value);
          self.navigateWithFilters();
        } else if (type === 'availability') {
          const url = new URL(window.location.href);
          url.searchParams.delete('filter.v.availability');
          window.location.href = url.toString();
        } else if (type === 'price') {
          const url = new URL(window.location.href);
          url.searchParams.delete('filter.v.price.gte');
          url.searchParams.delete('filter.v.price.lte');
          window.location.href = url.toString();
        }
      });

      return tag;
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CollectionFilters.init());
  } else {
    CollectionFilters.init();
  }

  window.CollectionFilters = CollectionFilters;
})();
