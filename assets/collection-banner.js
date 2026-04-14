(function() {
  var titleEl = document.querySelector('.collection-banner__title--typing');
  if (!titleEl) return;

  var textEl = titleEl.querySelector('.collection-banner__title-text');
  var titlesStr = titleEl.getAttribute('data-typing-titles') || '';
  var titles = titlesStr.split('|||').filter(function(t) { return t.trim() !== ''; });

  if (titles.length === 0) return;

  var typingSpeed = parseInt(titleEl.getAttribute('data-typing-speed')) || 80;
  var eraseSpeed = parseInt(titleEl.getAttribute('data-erase-speed')) || 40;
  var pauseBeforeErase = parseInt(titleEl.getAttribute('data-pause-before-erase')) || 2000;
  var pauseBeforeType = parseInt(titleEl.getAttribute('data-pause-before-type')) || 500;

  var currentTitleIndex = 0;
  var currentCharIndex = 0;
  var isErasing = false;

  function type() {
    var currentTitle = titles[currentTitleIndex];

    if (!isErasing) {
      textEl.textContent = currentTitle.substring(0, currentCharIndex + 1);
      currentCharIndex++;

      if (currentCharIndex === currentTitle.length) {
        if (titles.length > 1) {
          setTimeout(function() {
            isErasing = true;
            type();
          }, pauseBeforeErase);
        }
      } else {
        setTimeout(type, typingSpeed);
      }
    } else {
      textEl.textContent = currentTitle.substring(0, currentCharIndex - 1);
      currentCharIndex--;

      if (currentCharIndex === 0) {
        isErasing = false;
        currentTitleIndex = (currentTitleIndex + 1) % titles.length;
        setTimeout(type, pauseBeforeType);
      } else {
        setTimeout(type, eraseSpeed);
      }
    }
  }

  type();
})();

// Handle scroll to collection description bottom on page load
(function() {
  if (window.location.hash === '#collection-description-bottom') {
    window.addEventListener('load', function() {
      setTimeout(function() {
        var target = document.querySelector('.collection--description-bottom.rte');
        if (target) {
          var yOffset = -80;
          var y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;

          window.scrollTo({
            top: y,
            behavior: 'smooth'
          });

          target.style.transition = 'background-color 0.5s ease, padding 0.3s ease';
          target.style.backgroundColor = 'rgba(54, 123, 54, 0.08)';
          target.style.padding = '20px';
          target.style.borderRadius = '8px';

          setTimeout(function() {
            target.style.backgroundColor = '';
            target.style.padding = '';
          }, 2500);
        }
      }, 300);
    });
  }
})();
