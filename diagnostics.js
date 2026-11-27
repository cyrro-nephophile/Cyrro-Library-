(function () {
  'use strict';
  var KEY = 'clibrary_diagnostics_v1';
  var MAX = 300;
  var attached = new WeakSet();

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (_) { return []; }
  }
  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX))); }
    catch (_) {
      try { localStorage.setItem(KEY, JSON.stringify(items.slice(-100))); } catch (__) {}
    }
  }
  function safeText(value) {
    try {
      if (value instanceof Error) return value.name + ': ' + value.message + (value.stack ? '\n' + value.stack : '');
      if (typeof value === 'string') return value;
      return JSON.stringify(value);
    } catch (_) { return String(value); }
  }
  function redact(value) {
    return String(value || '')
      .replace(/(authorization\s*[:=]\s*)([^\s,;]+)/ig, '$1[REDACTED]')
      .replace(/(bearer\s+)[A-Za-z0-9._~+\/-]+=*/ig, '$1[REDACTED]')
      .replace(/([?&](?:access_token|refresh_token|token|apikey|api_key|key|password)=)[^&#\s]*/ig, '$1[REDACTED]');
  }
  function add(level, type, message, source) {
    var items = read();
    items.push({
      time: new Date().toISOString(),
      level: level,
      type: type,
      message: redact(message).slice(0, 4000),
      page: location.pathname,
      source: source || 'app'
    });
    write(items);
  }
  window.CLibraryLog = {
    add: add,
    get: read,
    clear: function () { try { localStorage.removeItem(KEY); } catch (_) {} }
  };

  function watch(win, label) {
    if (!win || attached.has(win)) return;
    try {
      attached.add(win);
      win.addEventListener('error', function (event) {
        var target = event.target && event.target !== win ? event.target : null;
        if (target) {
          var resource = target.src || target.href || target.currentSrc || '';
          var tag = (target.tagName || 'RESOURCE').toLowerCase();
          add('error', 'resource', 'Gagal memuat ' + tag + (resource ? ': ' + resource : ''), label);
          return;
        }
        var err = event.error;
        var detail = event.message || (err && (err.stack || (err.name + ': ' + err.message))) || 'Error tanpa pesan; cek stack pada log berikutnya';
        if (event.filename) detail += '\nSumber: ' + event.filename + ':' + event.lineno + ':' + event.colno;
        add('error', 'javascript', detail, label);
      }, true);
      win.addEventListener('unhandledrejection', function (event) {
        add('error', 'promise', safeText(event.reason), label);
      });
      win.addEventListener('load', function () {
        add('info', 'load', 'Halaman selesai dimuat', label);
      });
    } catch (error) {
      add('warning', 'monitor', 'Tidak dapat memasang pemantau: ' + safeText(error), label);
    }
  }

  watch(window, 'main');
  add('info', 'session', 'Aplikasi dibuka');

  function describeTarget(el) {
    if (!el || !el.closest) return 'Elemen tidak dikenal';
    var control = el.closest('button, a, [role="button"], [role="tab"], input[type="button"], input[type="submit"]');
    if (!control) return '';
    var tag = (control.tagName || '').toLowerCase();
    var label = control.getAttribute('aria-label') || control.getAttribute('title') ||
      control.getAttribute('data-page') || control.id || control.textContent || control.value || tag;
    label = String(label).replace(/\\s+/g, ' ').trim().slice(0, 90);
    if (!label) label = tag || 'kontrol';
    if (tag === 'a' && control.getAttribute('href')) {
      try { label += ' → ' + new URL(control.getAttribute('href'), location.href).pathname; } catch (_) {}
    }
    return label;
  }

  // Rekam tindakan UI tanpa pernah membaca nilai input atau isi formulir.
  document.addEventListener('click', function (event) {
    var label = describeTarget(event.target);
    if (label) add('info', 'tap', 'Ditekan: ' + label, 'ui');
  }, true);

  // Catat panel/menu penting saat benar-benar terbuka atau tertutup.
  var panelNames = {
    gmOverlay: 'Game overlay',
    pfOv: 'Profil overlay',
    playlistOverlay: 'Playlist',
    hdrMenu: 'Menu pengaturan',
    notifMenu: 'Menu notifikasi',
    clogList: 'Change Log'
  };
  var panelState = new WeakMap();
  function panelSnapshot(el) {
    var open = !el.hidden && getComputedStyle(el).display !== 'none';
    var previous = panelState.get(el);
    panelState.set(el, open);
    if (previous !== undefined && previous !== open) {
      add('info', 'ui-state', (panelNames[el.id] || el.id) + (open ? ' dibuka' : ' ditutup'), 'ui');
    }
  }
  Object.keys(panelNames).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    panelSnapshot(el);
    new MutationObserver(function () { panelSnapshot(el); })
      .observe(el, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
  });

  function attachFrames() {
    document.querySelectorAll('iframe').forEach(function (frame, index) {
      if (frame.dataset.clogWatch) return;
      frame.dataset.clogWatch = '1';
      var lastSrc = frame.getAttribute('src') || '';
      if (lastSrc && lastSrc !== 'about:blank') {
        var initialPath = lastSrc;
        try { initialPath = new URL(lastSrc, location.href).pathname; } catch (_) {}
        add('info', 'iframe-start', 'Mulai memuat: ' + initialPath, 'iframe-' + (frame.id || index));
      }
      frame.addEventListener('load', function () {
        var label = 'iframe-' + (frame.id || index);
        var rawSrc = frame.getAttribute('src') || frame.src || '';
        if (!rawSrc || rawSrc === 'about:blank') return;
        var framePath = rawSrc;
        try { framePath = new URL(rawSrc, location.href).pathname; } catch (_) {}
        add('info', 'iframe-load', 'Frame selesai dimuat: ' + framePath, label);
        try { watch(frame.contentWindow, label); }
        catch (_) { add('warning', 'iframe', 'Frame tidak dapat dipantau (mungkin beda origin)', label); }
      });
      new MutationObserver(function () {
        var nextSrc = frame.getAttribute('src') || '';
        if (!nextSrc || nextSrc === lastSrc || nextSrc === 'about:blank') return;
        lastSrc = nextSrc;
        var nextPath = nextSrc;
        try { nextPath = new URL(nextSrc, location.href).pathname; } catch (_) {}
        add('info', 'iframe-start', 'Mulai memuat: ' + nextPath, 'iframe-' + (frame.id || index));
      }).observe(frame, { attributes: true, attributeFilter: ['src'] });
      frame.addEventListener('error', function () {
        add('error', 'iframe-load', 'Gagal memuat iframe: ' + (frame.getAttribute('src') || frame.src || 'unknown'), 'main');
      });
    });
  }
  attachFrames();
  new MutationObserver(attachFrames).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('cyrro:pagechange', function () {
    add('info', 'navigation', 'Tab berubah: ' + (document.body.dataset.page || 'unknown'));
  });
  window.addEventListener('popstate', function () {
    add('info', 'navigation', 'Navigasi riwayat: ' + location.pathname);
  });
  window.addEventListener('online', function () { add('info', 'network', 'Koneksi kembali online'); });
  window.addEventListener('offline', function () { add('warning', 'network', 'Koneksi offline'); });
})();
