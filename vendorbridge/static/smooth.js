/**
 * VendorBridge — smooth.js
 * Shared micro-interaction & animation enhancements.
 * Zero external dependencies.
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────
     1. PAGE ENTRANCE — fade body in after fonts/layout settle
     ───────────────────────────────────────────────────────── */
  document.documentElement.classList.add('js-loaded');

  /* ─────────────────────────────────────────────────────────
     2. BUTTON RIPPLE EFFECT
     ───────────────────────────────────────────────────────── */
  function attachRipple(el) {
    el.addEventListener('click', function (e) {
      // Skip if it's a form submit that navigates away immediately
      var existing = el.querySelector('.vb-ripple');
      if (existing) existing.remove();

      var rect   = el.getBoundingClientRect();
      var size   = Math.max(rect.width, rect.height) * 1.6;
      var x      = e.clientX - rect.left - size / 2;
      var y      = e.clientY - rect.top  - size / 2;

      var ripple = document.createElement('span');
      ripple.className = 'vb-ripple';
      ripple.style.cssText =
        'width:'  + size + 'px;' +
        'height:' + size + 'px;' +
        'left:'   + x   + 'px;' +
        'top:'    + y   + 'px;';
      el.appendChild(ripple);

      ripple.addEventListener('animationend', function () { ripple.remove(); });
    });
  }

  document.querySelectorAll('.btn, .btn-logout, .tab-btn, .quick-msg-btn').forEach(attachRipple);

  /* ─────────────────────────────────────────────────────────
     3. FLASH MESSAGE AUTO-DISMISS (5 s fade-out)
     ───────────────────────────────────────────────────────── */
  document.querySelectorAll('.flash').forEach(function (flash) {
    // Add a close (×) button
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'flash-close-btn';
    closeBtn.setAttribute('aria-label', 'Dismiss');
    flash.appendChild(closeBtn);

    function dismiss() {
      flash.style.transition = 'opacity 0.4s ease, transform 0.4s ease, max-height 0.4s ease, padding 0.4s ease, margin 0.4s ease';
      flash.style.opacity    = '0';
      flash.style.transform  = 'translateX(8px)';
      flash.style.maxHeight  = '0';
      flash.style.padding    = '0 16px';
      flash.style.margin     = '0';
      flash.style.overflow   = 'hidden';
      setTimeout(function () { if (flash.parentNode) flash.remove(); }, 420);
    }

    closeBtn.addEventListener('click', dismiss);

    // Auto dismiss after 5 s (success/info only)
    if (flash.classList.contains('flash-success') || flash.classList.contains('flash-info')) {
      setTimeout(dismiss, 5000);
    }
  });

  /* ─────────────────────────────────────────────────────────
     4. TABLE ROW STAGGER — animate tbody rows in on load
     ───────────────────────────────────────────────────────── */
  document.querySelectorAll('tbody tr:not(.bid-drawer-row)').forEach(function (row, i) {
    row.style.animationDelay = (i * 40) + 'ms';
    row.classList.add('row-animate-in');
  });

  /* ─────────────────────────────────────────────────────────
     5. STAT CARD NUMBER COUNT-UP
     ───────────────────────────────────────────────────────── */
  document.querySelectorAll('.stat-value').forEach(function (el) {
    var raw = el.textContent.trim();
    var num = parseInt(raw, 10);
    if (isNaN(num) || num === 0 || raw.length > 6) return; // skip non-numeric / symbols

    el.textContent = '0';
    var duration  = 600;
    var startTime = null;

    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.floor(eased * num);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = num;
    }

    // Delay each card slightly
    setTimeout(function () { requestAnimationFrame(step); }, 200);
  });

  /* ─────────────────────────────────────────────────────────
     6. SMOOTH SCROLL — internal anchor links (#...)
     ───────────────────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ─────────────────────────────────────────────────────────
     7. PAGE-OUT FADE on internal navigation
     ───────────────────────────────────────────────────────── */
  document.querySelectorAll('a[href]').forEach(function (link) {
    var href = link.getAttribute('href');
    // Only handle same-origin non-anchor links
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || link.getAttribute('target') === '_blank') return;

    link.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      document.body.classList.add('page-out');
      var dest = href;
      setTimeout(function () { window.location.href = dest; }, 220);
    });
  });

  /* ─────────────────────────────────────────────────────────
     8. CHAT TEXTAREA — auto-resize as user types
     ───────────────────────────────────────────────────────── */
  var chatArea = document.getElementById('chat-message-input');
  if (chatArea) {
    chatArea.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
  }

  /* ─────────────────────────────────────────────────────────
     9. INPUT FLOATING LABEL EFFECT
        Adds .has-value class to .form-group when input is filled
     ───────────────────────────────────────────────────────── */
  document.querySelectorAll('input, textarea, select').forEach(function (el) {
    function toggle() {
      var group = el.closest('.form-group');
      if (!group) return;
      if (el.value) group.classList.add('has-value');
      else group.classList.remove('has-value');
    }
    el.addEventListener('input', toggle);
    el.addEventListener('change', toggle);
    toggle(); // initial state
  });

}());
