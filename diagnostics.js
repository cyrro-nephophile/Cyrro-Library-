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
      if (value && typeof value === 'object') {
        var parts = [];
        ['name', 'message', 'code', 'reason', 'stack'].forEach(function (key) {
          if (value[key] !== undefined && value[key] !== null) parts.push(key + ': ' + String(value[key]));
        });
        if (parts.length) return parts.join('\n');
        try { return JSON.stringify(value, Object.getOwnPropertyNames(value)); } catch (_) {}
      }
      return String(value);
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
    var text = redact(message).slice(0, 4000);
    var src = source || 'app';
    items.push({
      time: new Date().toISOString(),
      level: level,
      type: type,
      message: text,
      page: location.pathname,
      source: src
    });
    write(items);
    // Salinan ke console agar bisa dilihat lewat chrome://inspect; isi sudah diredaksi di atas.
    try {
      var logFn = level === 'error' ? console.error : (level === 'warning' ? console.warn : console.info);
      logFn.call(console, '[C-LIB][ANDROID] ' + type + ': ' + text.split('\n')[0], src);
    } catch (_) {}
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

  // Jika file ini berjalan di dalam frame (misalnya Library terbuka di iframe overlay), catat itu.
  var nested = true;
  try { nested = window.top !== window.self; } catch (_) {}
  if (nested) {
    add('warning', 'nested-boot', 'Dokumen Library dimuat di dalam frame: ' + location.pathname + location.search, 'frame');
  }

  function describeTarget(el) {
    if (!el || !el.closest) return 'Elemen tidak dikenal';
    var control = el.closest('button, a, [role="button"], [role="tab"], input[type="button"], input[type="submit"]');
    if (!control) return '';
    var tag = (control.tagName || '').toLowerCase();
    var gameLabel = control.matches && control.matches('a.card.mg') && control.querySelector('b');
    var label = (gameLabel && gameLabel.textContent) || control.getAttribute('aria-label') || control.getAttribute('title') ||
      control.getAttribute('data-page') || control.textContent || control.value || control.id || tag;
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
    if (label) {
      var isBack = /(?:back|kembali|balik|tutup)/i.test(label) || /(?:gmBack|pfBack)/i.test(event.target && event.target.id || '');
      add('info', isBack ? 'back-control' : 'tap', (isBack ? 'Kontrol kembali ditekan: ' : 'Ditekan: ') + label, 'ui');
    }
  }, true);

  // Catat aksi game secara eksplisit; tidak bergantung pada perubahan atribut iframe.
  window.addEventListener('cyrro:gameopen', function (event) {
    var detail = event.detail || {};
    var path = detail.href || '';
    try { path = new URL(path, location.href).pathname; } catch (_) {}
    add('info', 'game-open', 'Game dibuka: ' + (detail.name || 'Game') + ' (' + path + ')', 'game');
  });
  window.addEventListener('cyrro:gameclose', function (event) {
    var detail = event.detail || {};
    add('info', 'game-close', 'Game ditutup: ' + (detail.name || 'Game'), 'game');
  });

  // Pantau URL dan panjang riwayat iframe game selama overlay terbuka.
  // Hanya mencatat saat berubah; interval dihentikan saat overlay ditutup.
  var gmWatch = { timer: null, lastHref: '', lastLen: -1, lastErr: false };
  function pollGameFrame() {
    var frame = document.getElementById('gmFrame');
    if (!frame) return;
    var href = '', len = -1, err = '';
    try {
      href = frame.contentWindow.location.href;
      len = frame.contentWindow.history.length;
    } catch (_) {
      err = 'tidak bisa dibaca (beda origin atau belum siap)';
    }
    if (err) {
      if (!gmWatch.lastErr) add('warning', 'iframe-location', 'URL iframe ' + err, 'iframe-gmFrame');
      gmWatch.lastErr = true;
      return;
    }
    gmWatch.lastErr = false;
    if (href !== gmWatch.lastHref) {
      var from = gmWatch.lastHref || '(awal)';
      var to = href;
      try { if (gmWatch.lastHref) from = new URL(gmWatch.lastHref).pathname; } catch (_) {}
      try { to = new URL(href).pathname; } catch (_) {}
      add(to === '/' ? 'warning' : 'info', 'iframe-location', 'URL iframe berubah: ' + from + ' → ' + to + '; riwayat=' + len, 'iframe-gmFrame');
      gmWatch.lastHref = href;
    } else if (gmWatch.lastLen !== -1 && len !== gmWatch.lastLen) {
      add('info', 'iframe-history', 'Panjang riwayat iframe: ' + gmWatch.lastLen + ' → ' + len, 'iframe-gmFrame');
    }
    gmWatch.lastLen = len;
  }
  window.addEventListener('cyrro:gameopen', function () {
    if (gmWatch.timer) clearInterval(gmWatch.timer);
    gmWatch.lastHref = ''; gmWatch.lastLen = -1; gmWatch.lastErr = false;
    gmWatch.timer = setInterval(pollGameFrame, 400);
  });
  window.addEventListener('cyrro:gameclose', function () {
    if (gmWatch.timer) clearInterval(gmWatch.timer);
    gmWatch.timer = null;
  });

  // Permintaan tutup dari game (postMessage). Hanya diterima dari iframe overlay yang sedang terbuka,
  // dan memakai tombol BALIK yang sudah ada agar jalur penutupannya sama dengan tap biasa.
  window.addEventListener('message', function (event) {
    var frame = document.getElementById('gmFrame');
    var data = event.data;
    if (!frame || !data || data.type !== 'cyrro:close-game') return;
    if (event.origin !== location.origin) return;
    if (event.source !== frame.contentWindow) return;
    add('info', 'iframe-close-request', 'Game meminta overlay ditutup', 'iframe-gmFrame');
    var back = document.getElementById('gmBack');
    if (back) back.click();
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
        var framePath = '';
        try {
          var frameHref = frame.contentWindow.location.href;
          if (frameHref && frameHref !== 'about:blank') framePath = new URL(frameHref).pathname;
        } catch (_) {}
        if (!framePath && rawSrc && rawSrc !== 'about:blank') {
          try { framePath = new URL(rawSrc, location.href).pathname; } catch (_) { framePath = rawSrc; }
        }
        if (!framePath) return;
        var title = frame.id === 'gmFrame' ? (document.getElementById('gmTitle') || {}).textContent : '';
        add('info', 'iframe-load', (title ? 'Game selesai dimuat: ' + title + ' (' + framePath + ')' : 'Frame selesai dimuat: ' + framePath), label);
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

  window.addEventListener('cyrro:pagechange', function () {
    add('info', 'navigation', 'Tab berubah: ' + (document.body.dataset.page || 'unknown'));
  });
  // Popstate dapat berasal dari tombol/gesture Back Android atau navigasi riwayat;
  // browser tidak selalu menyediakan sumber fisiknya.
  window.addEventListener('popstate', function (event) {
    var state = event.state || {};
    var overlay = !document.getElementById('gmOverlay')?.hidden ? 'Game overlay' :
      (!document.getElementById('pfOv')?.hidden ? 'Profil overlay' : 'tidak ada overlay');
    add('info', 'back-navigation', 'Riwayat mundur/Back terdeteksi; halaman: ' + location.pathname + '; state: ' + safeText(state) + '; konteks: ' + overlay, 'navigation');
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Backspace') {
      add('info', 'back-key', 'Tombol keyboard kembali: ' + event.key + '; target: ' + describeTarget(event.target), 'navigation');
    }
  }, true);
  document.addEventListener('visibilitychange', function () {
    add('info', 'visibility', 'Aplikasi ' + (document.hidden ? 'masuk latar belakang' : 'kembali terlihat'), 'lifecycle');
  });
  window.addEventListener('pagehide', function (event) {
    add('info', 'lifecycle', 'Halaman akan ditinggalkan; persisted=' + !!event.persisted, 'lifecycle');
  });
  window.addEventListener('pageshow', function (event) {
    add('info', 'lifecycle', 'Halaman ditampilkan; persisted=' + !!event.persisted, 'lifecycle');
  });
  window.addEventListener('online', function () { add('info', 'network', 'Koneksi kembali online'); });
  window.addEventListener('offline', function () { add('warning', 'network', 'Koneksi offline'); });
})();
