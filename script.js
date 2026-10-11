const LAYOUTS = {
  classic: { label: 'Classic', size: '2 × 6 in', shots: 4, summary: 'Four vertically stacked photos' },
  triple: { label: '2 × 5 in', size: '2 × 5 in', shots: 3, summary: 'Three larger photos' },
  portrait: { label: '2 × 4 in', size: '2 × 4 in', shots: 2, summary: 'Oversized portraits' },
  square: { label: '4 × 4 in', size: '4 × 4 in', shots: 4, summary: '2 × 2 square collage' },
};

const FILTERS = [
  { key: 'original', label: 'Original' },
  { key: 'vintage', label: 'Vintage' },
  { key: 'bw', label: 'Black & White' },
  { key: 'fish-eye', label: 'Fish Eye' },
  { key: 'warm', label: 'Warm Film' },
  { key: 'grain', label: 'Film Grain' },
];

const state = {
  stream: null,
  facingMode: 'user',
  timer: 5,
  flashEnabled: true,
  layout: 'classic',
  filter: 'original',
  shots: 4,
  interval: 1,
  audioEnabled: true,
  mirrorSelfie: true,
  showGrid: false,
  showLevel: false,
  captureFlash: true,
  photos: [],
  sessionId: null,
  db: null,
  captureInProgress: false,
};

const ui = {
  video: document.getElementById('cameraVideo'),
  flashOverlay: document.getElementById('flashOverlay'),
  countdownBadge: document.getElementById('countdownBadge'),
  permissionMessage: document.getElementById('permissionMessage'),
  timerBtn: document.getElementById('timerBtn'),
  timerLabel: document.getElementById('timerLabel'),
  flashToggleBtn: document.getElementById('flashToggleBtn'),
  flipCameraBtn: document.getElementById('flipCameraBtn'),
  uploadBtn: document.getElementById('uploadBtn'),
  uploadInput: document.getElementById('uploadInput'),
  captureBtn: document.getElementById('captureBtn'),
  galleryBtn: document.getElementById('galleryBtn'),
  stripsBtn: document.getElementById('stripsBtn'),
  galleryShortcut: document.getElementById('galleryShortcut'),
  stripsShortcut: document.getElementById('stripsShortcut'),
  settingsBtn: document.getElementById('settingsBtn'),
  stripsSheet: document.getElementById('stripsSheet'),
  settingsSheet: document.getElementById('settingsSheet'),
  galleryDrawer: document.getElementById('galleryDrawer'),
  layoutOptions: document.getElementById('layoutOptions'),
  filterOptions: document.getElementById('filterOptions'),
  closeStripsBtn: document.getElementById('closeStripsBtn'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  closeGalleryBtn: document.getElementById('closeGalleryBtn'),
  clearGalleryBtn: document.getElementById('clearGalleryBtn'),
  gridToggle: document.getElementById('gridToggle'),
  levelToggle: document.getElementById('levelToggle'),
  mirrorToggle: document.getElementById('mirrorToggle'),
  timerSelect: document.getElementById('timerSelect'),
  shotsSelect: document.getElementById('shotsSelect'),
  intervalSelect: document.getElementById('intervalSelect'),
  soundToggle: document.getElementById('soundToggle'),
  captureFlashToggle: document.getElementById('captureFlashToggle'),
  cameraGrid: document.getElementById('cameraGrid'),
  levelGuide: document.getElementById('levelGuide'),
  resultSheet: document.getElementById('resultSheet'),
  resultCanvas: document.getElementById('resultCanvas'),
  resultThumbs: document.getElementById('resultThumbs'),
  closeResultBtn: document.getElementById('closeResultBtn'),
  retakeShotBtn: document.getElementById('retakeShotBtn'),
  saveResultBtn: document.getElementById('saveResultBtn'),
  downloadResultBtn: document.getElementById('downloadResultBtn'),
  shareResultBtn: document.getElementById('shareResultBtn'),
  galleryList: document.getElementById('galleryList'),
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateTimerLabel() {
  ui.timerLabel.textContent = `${state.timer}s`;
  ui.timerSelect.value = String(state.timer);
}

function updateFlashUi() {
  ui.flashToggleBtn.classList.toggle('is-on', state.flashEnabled);
}

function updateGridUi() {
  ui.cameraGrid.classList.toggle('hidden', !state.showGrid);
  ui.gridToggle.checked = state.showGrid;
}

function updateLevelUi() {
  ui.levelGuide.classList.toggle('hidden', !state.showLevel);
  ui.levelToggle.checked = state.showLevel;
}

function updateMirrorUi() {
  ui.mirrorToggle.checked = state.mirrorSelfie;
}

function updateFilterPreview() {
  const filterCardButtons = ui.filterOptions.querySelectorAll('.filter-card');
  filterCardButtons.forEach((button) => {
    const active = button.dataset.filter === state.filter;
    button.classList.toggle('active', active);
  });

  const filterCss = getFilterCss(state.filter);
  ui.video.style.filter = filterCss;
}

function updateLayoutPreview() {
  const layoutButtons = ui.layoutOptions.querySelectorAll('.layout-card');
  layoutButtons.forEach((button) => {
    const active = button.dataset.layout === state.layout;
    button.classList.toggle('active', active);
  });
}

function getFilterCss(filterKey) {
  const cssMap = {
    original: 'none',
    vintage: 'sepia(0.52) contrast(1.12) saturate(0.8) brightness(0.96)',
    bw: 'grayscale(1) contrast(1.18) brightness(1.04)',
    'fish-eye': 'saturate(1.15) contrast(1.18)',
    warm: 'sepia(0.28) saturate(1.3) contrast(1.1) brightness(1.04)',
    grain: 'contrast(1.08) brightness(1.02)',
  };
  return cssMap[filterKey] || cssMap.original;
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

function stopTracks() {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
}

async function ensureCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    ui.permissionMessage.textContent = 'Your browser does not support camera access. Please use a modern browser with camera permissions enabled.';
    ui.permissionMessage.classList.remove('hidden');
    return;
  }

  try {
    stopTracks();
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.facingMode },
      audio: false,
    });
    ui.video.srcObject = state.stream;
    ui.permissionMessage.classList.add('hidden');
    updateVideoTransform();
  } catch (error) {
    console.error(error);
    ui.permissionMessage.textContent = 'Camera permission is required. Please allow access and refresh the app to use KLARO*.';
    ui.permissionMessage.classList.remove('hidden');
  }
}

function updateVideoTransform() {
  const selfieMode = state.facingMode === 'user' && state.mirrorSelfie;
  ui.video.style.transform = selfieMode ? 'scaleX(-1)' : 'none';
}

function updateSettingsFromState() {
  updateFlashUi();
  updateGridUi();
  updateLevelUi();
  updateMirrorUi();
  updateTimerLabel();
  updateFilterPreview();
  updateLayoutPreview();
  state.shots = LAYOUTS[state.layout].shots;
  ui.timerSelect.value = String(state.timer);
  ui.shotsSelect.value = String(state.shots);
  ui.intervalSelect.value = String(state.interval);
  ui.soundToggle.checked = state.audioEnabled;
  ui.captureFlashToggle.checked = state.captureFlash;
}

function renderLayouts() {
  ui.layoutOptions.innerHTML = Object.entries(LAYOUTS)
    .map(([key, meta]) => {
      const count = { classic: 4, triple: 3, portrait: 2, square: 4 }[key] || 4;
      const spans = Array.from({ length: count }, () => '<span></span>').join('');
      return `
        <button class="layout-card ${key === state.layout ? 'active' : ''}" data-layout="${key}" type="button">
          <div class="layout-preview">
            <div class="layout-figure ${key}">${spans}</div>
          </div>
          <span>${meta.label}</span>
        </button>
      `;
    })
    .join('');
}

function renderFilters() {
  ui.filterOptions.innerHTML = FILTERS.map(
    (filter) => `
      <button class="filter-card ${filter.key === state.filter ? 'active' : ''}" data-filter="${filter.key}" type="button">
        <div class="filter-preview" style="background: linear-gradient(135deg, #d9d9d9, #111); filter: ${getFilterCss(filter.key)};"></div>
        <span>${filter.label}</span>
      </button>
    `
  ).join('');
}

function toggleSheet(name) {
  const sheets = {
    strips: ui.stripsSheet,
    settings: ui.settingsSheet,
    gallery: ui.galleryDrawer,
  };

  Object.entries(sheets).forEach(([key, sheet]) => {
    const isOpen = key === name;
    sheet.classList.toggle('hidden', !isOpen);
  });
}

function closeAllSheets() {
  ui.stripsSheet.classList.add('hidden');
  ui.settingsSheet.classList.add('hidden');
  ui.galleryDrawer.classList.add('hidden');
}

async function playShutterSound() {
  if (!state.audioEnabled) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(640, ctx.currentTime);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.15);
}

function flashCapture() {
  if (!state.captureFlash || !state.flashEnabled) return;
  ui.flashOverlay.classList.remove('active');
  void ui.flashOverlay.offsetWidth;
  ui.flashOverlay.classList.add('active');
}

function captureFrameFromVideo() {
  const width = ui.video.videoWidth || 1080;
  const height = ui.video.videoHeight || 1440;
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const targetRatio = canvas.width / canvas.height;
  let sourceWidth = width;
  let sourceHeight = height;
  let startX = 0;
  let startY = 0;

  if (width / height > targetRatio) {
    sourceHeight = height;
    sourceWidth = height * targetRatio;
    startX = (width - sourceWidth) / 2;
  } else {
    sourceWidth = width;
    sourceHeight = width / targetRatio;
    startY = (height - sourceHeight) / 2;
  }

  ctx.save();
  if (state.facingMode === 'user' && state.mirrorSelfie) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(ui.video, startX, startY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

function applyFilterToCanvas(sourceCanvas, filterKey) {
  const filteredCanvas = document.createElement('canvas');
  filteredCanvas.width = sourceCanvas.width;
  filteredCanvas.height = sourceCanvas.height;
  const ctx = filteredCanvas.getContext('2d');

  const img = new Image();
  img.src = sourceCanvas.toDataURL('image/png');

  ctx.filter = getFilterCss(filterKey);
  ctx.drawImage(img, 0, 0, filteredCanvas.width, filteredCanvas.height);

  if (filterKey === 'fish-eye') {
    return applyFishEye(filteredCanvas);
  }

  if (filterKey === 'warm') {
    return applyWarmFilm(filteredCanvas);
  }

  if (filterKey === 'grain') {
    return applyFilmGrain(filteredCanvas);
  }

  return filteredCanvas;
}

function applyFishEye(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const source = canvas.getContext('2d').getImageData(0, 0, width, height);
  const output = new ImageData(width, height);
  const data = source.data;
  const out = output.data;
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const maxRadius = Math.min(width, height) * 0.48;
      const normalized = Math.min(1, radius / maxRadius);
      const theta = Math.atan2(dy, dx);
      const distort = radius * (1 + normalized * normalized * 0.9);
      const sx = cx + Math.cos(theta) * distort;
      const sy = cy + Math.sin(theta) * distort;

      const sampleX = Math.max(0, Math.min(width - 1, Math.round(sx)));
      const sampleY = Math.max(0, Math.min(height - 1, Math.round(sy)));
      const sourceIndex = (sampleY * width + sampleX) * 4;
      const targetIndex = (y * width + x) * 4;

      out[targetIndex] = data[sourceIndex];
      out[targetIndex + 1] = data[sourceIndex + 1];
      out[targetIndex + 2] = data[sourceIndex + 2];
      out[targetIndex + 3] = 255;
    }
  }

  const processed = document.createElement('canvas');
  processed.width = width;
  processed.height = height;
  processed.getContext('2d').putImageData(output, 0, 0);
  return processed;
}

function applyWarmFilm(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] * 1.12);
    data[i + 1] = Math.min(255, data[i + 1] * 1.06);
    data[i + 2] = Math.min(255, data[i + 2] * 0.94);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function applyFilmGrain(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 26;
    data[i] = Math.max(0, Math.min(255, data[i] + grain));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

async function processCapturedImage(dataUrl, filterKey) {
  const img = await loadImage(dataUrl);
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = 900;
  sourceCanvas.height = 1200;
  const ctx = sourceCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);

  const processed = applyFilterToCanvas(sourceCanvas, filterKey);
  if (processed === sourceCanvas) {
    return sourceCanvas.toDataURL('image/png');
  }
  return processed.toDataURL('image/png');
}

async function captureSequence() {
  if (state.captureInProgress || !state.stream) return;
  state.captureInProgress = true;
  ui.captureBtn.disabled = true;
  state.photos = [];

  for (let index = 0; index < state.shots; index += 1) {
    await showCountdown(state.timer);
    playShutterSound();
    flashCapture();
    const capturedData = captureFrameFromVideo();
    const processedData = await processCapturedImage(capturedData, state.filter);
    state.photos.push(processedData);

    if (index < state.shots - 1) {
      await wait(state.interval * 1000);
    }
  }

  state.captureInProgress = false;
  ui.captureBtn.disabled = false;
  openResultSheet();
}

async function showCountdown(seconds) {
  for (let count = seconds; count >= 1; count -= 1) {
    ui.countdownBadge.textContent = String(count);
    ui.countdownBadge.classList.remove('show');
    void ui.countdownBadge.offsetWidth;
    ui.countdownBadge.classList.add('show');
    await wait(1000);
  }
  ui.countdownBadge.textContent = '';
  ui.countdownBadge.classList.remove('show');
}

function drawFrameBorder(context, width, height, inset = 44) {
  context.fillStyle = '#f5f5f5';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#101010';
  context.fillRect(inset, inset, width - inset * 2, height - inset * 2);
}

function drawLayoutToCanvas(canvas, layoutKey, photos) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const margin = 44;
  const gap = 18;

  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(0, 0, width, height);

  const shotList = photos.slice(0, LAYOUTS[layoutKey]?.shots || photos.length);

  if (layoutKey === 'classic') {
    const boxWidth = width - margin * 2;
    const boxHeight = (height - margin * 2 - gap * (shotList.length - 1)) / shotList.length;
    shotList.forEach((photo, index) => {
      const img = new Image();
      img.src = photo;
      const y = margin + index * (boxHeight + gap);
      ctx.drawImage(img, margin, y, boxWidth, boxHeight);
    });
  }

  if (layoutKey === 'triple') {
    const boxWidth = width - margin * 2;
    const boxHeight = (height - margin * 2 - gap * 2) / 3;
    shotList.forEach((photo, index) => {
      const img = new Image();
      img.src = photo;
      const y = margin + index * (boxHeight + gap);
      ctx.drawImage(img, margin, y, boxWidth, boxHeight);
    });
  }

  if (layoutKey === 'portrait') {
    const boxWidth = (width - margin * 2 - gap) / 2;
    const boxHeight = height - margin * 2;
    shotList.forEach((photo, index) => {
      const img = new Image();
      img.src = photo;
      const x = margin + index * (boxWidth + gap);
      ctx.drawImage(img, x, margin, boxWidth, boxHeight);
    });
  }

  if (layoutKey === 'square') {
    const boxWidth = (width - margin * 2 - gap) / 2;
    const boxHeight = (height - margin * 2 - gap) / 2;
    shotList.forEach((photo, index) => {
      const img = new Image();
      img.src = photo;
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = margin + col * (boxWidth + gap);
      const y = margin + row * (boxHeight + gap);
      ctx.drawImage(img, x, y, boxWidth, boxHeight);
    });
  }

  ctx.fillStyle = '#111';
  ctx.textAlign = 'center';
  ctx.font = '700 28px Arial';
  ctx.fillText('KLARO*', width / 2, height - 22);
}

function renderResultStrip() {
  const stripCanvas = document.createElement('canvas');
  stripCanvas.width = 900;
  stripCanvas.height = 1500;
  drawLayoutToCanvas(stripCanvas, state.layout, state.photos);
  ui.resultCanvas.width = stripCanvas.width;
  ui.resultCanvas.height = stripCanvas.height;
  const ctx = ui.resultCanvas.getContext('2d');
  ctx.clearRect(0, 0, ui.resultCanvas.width, ui.resultCanvas.height);
  ctx.drawImage(stripCanvas, 0, 0);

  ui.resultThumbs.innerHTML = state.photos
    .map((photo, index) => `
      <button class="result-thumb" data-index="${index}" type="button">
        <img src="${photo}" alt="Captured photo ${index + 1}" />
      </button>
    `)
    .join('');
}

function openResultSheet() {
  renderResultStrip();
  ui.resultSheet.classList.remove('hidden');
}

async function retakePhoto(index) {
  if (!state.stream) {
    await ensureCamera();
  }

  await showCountdown(state.timer);
  const capturedData = captureFrameFromVideo();
  const processedData = await processCapturedImage(capturedData, state.filter);
  state.photos[index] = processedData;
  renderResultStrip();
}

function saveSessionToGallery() {
  if (!state.photos.length) return;

  const session = {
    id: `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
    layout: state.layout,
    filter: state.filter,
    strip: ui.resultCanvas.toDataURL('image/png'),
    photos: state.photos,
  };

  const request = indexedDB.open('klaro-gallery', 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('sessions')) {
      db.createObjectStore('sessions', { keyPath: 'id' });
    }
  };

  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').put(session);
    tx.oncomplete = () => {
      renderGallery();
    };
  };
}

function renderGallery() {
  const request = indexedDB.open('klaro-gallery', 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('sessions')) {
      db.createObjectStore('sessions', { keyPath: 'id' });
    }
  };

  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction('sessions', 'readonly');
    const store = tx.objectStore('sessions');
    const itemsRequest = store.getAll();

    itemsRequest.onsuccess = () => {
      const sessions = itemsRequest.result.reverse();

      if (!sessions.length) {
        ui.galleryList.innerHTML = '<p class="gallery-empty">No saved sessions yet.</p>';
        return;
      }

      ui.galleryList.innerHTML = sessions
        .map(
          (item) => `
            <div class="gallery-item">
              <img src="${item.strip}" alt="Saved photostrip" />
              <div class="gallery-meta">
                <span>${item.layout}</span>
                <span>${new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
              <div class="gallery-actions">
                <button type="button" data-download="${item.id}">Download</button>
                <button type="button" data-delete="${item.id}">Delete</button>
              </div>
            </div>
          `
        )
        .join('');
    };
  };
}

async function clearGallery() {
  const request = indexedDB.open('klaro-gallery', 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('sessions')) {
      db.createObjectStore('sessions', { keyPath: 'id' });
    }
  };

  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').clear();
    tx.oncomplete = () => renderGallery();
  };
}

function downloadDataUri(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

async function shareCurrentStrip() {
  if (navigator.share) {
    try {
      const blob = await fetch(ui.resultCanvas.toDataURL('image/png')).then((response) => response.blob());
      const file = new File([blob], 'klaro-strip.png', { type: 'image/png' });
      await navigator.share({
        title: 'KLARO* Photo Strip',
        text: 'Captured with KLARO*',
        files: [file],
      });
      return;
    } catch (error) {
      console.warn('Native share cancelled or unsupported:', error);
    }
  }

  downloadDataUri(ui.resultCanvas.toDataURL('image/png'), 'klaro-strip.png');
}

function handleGalleryActions(event) {
  const target = event.target.closest('[data-delete]');
  if (target) {
    const id = target.dataset.delete;
    const request = indexedDB.open('klaro-gallery', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('sessions', 'readwrite');
      tx.objectStore('sessions').delete(id);
      tx.oncomplete = () => renderGallery();
    };
    return;
  }

  const downloadTarget = event.target.closest('[data-download]');
  if (downloadTarget) {
    const id = downloadTarget.dataset.download;
    const request = indexedDB.open('klaro-gallery', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');

      const itemRequest = store.get(id);
      itemRequest.onsuccess = () => {
        const item = itemRequest.result;
        if (item) downloadDataUri(item.strip, 'klaro-strip.png');
      };
    };
  }
}

function bindEvents() {
  ui.captureBtn.addEventListener('click', captureSequence);
  ui.flashToggleBtn.addEventListener('click', () => {
    state.flashEnabled = !state.flashEnabled;
    updateFlashUi();
  });

  ui.flipCameraBtn.addEventListener('click', async () => {
    state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
    await ensureCamera();
  });

  ui.galleryBtn.addEventListener('click', () => toggleSheet('gallery'));
  ui.galleryShortcut.addEventListener('click', () => toggleSheet('gallery'));
  ui.stripsBtn.addEventListener('click', () => toggleSheet('strips'));
  ui.stripsShortcut.addEventListener('click', () => toggleSheet('strips'));
  ui.settingsBtn.addEventListener('click', () => toggleSheet('settings'));
  ui.closeStripsBtn.addEventListener('click', () => ui.stripsSheet.classList.add('hidden'));
  ui.closeSettingsBtn.addEventListener('click', () => ui.settingsSheet.classList.add('hidden'));
  ui.closeGalleryBtn.addEventListener('click', () => ui.galleryDrawer.classList.add('hidden'));
  ui.closeResultBtn.addEventListener('click', () => ui.resultSheet.classList.add('hidden'));
  ui.clearGalleryBtn.addEventListener('click', clearGallery);

  ui.gridToggle.addEventListener('change', (event) => {
    state.showGrid = event.target.checked;
    updateGridUi();
  });

  ui.levelToggle.addEventListener('change', (event) => {
    state.showLevel = event.target.checked;
    updateLevelUi();
  });

  ui.mirrorToggle.addEventListener('change', (event) => {
    state.mirrorSelfie = event.target.checked;
    updateVideoTransform();
    updateMirrorUi();
  });

  ui.timerSelect.addEventListener('change', (event) => {
    state.timer = Number(event.target.value);
    updateTimerLabel();
  });

  ui.shotsSelect.addEventListener('change', (event) => {
    state.shots = Number(event.target.value);
  });

  ui.intervalSelect.addEventListener('change', (event) => {
    state.interval = Number(event.target.value);
  });

  ui.soundToggle.addEventListener('change', (event) => {
    state.audioEnabled = event.target.checked;
  });

  ui.captureFlashToggle.addEventListener('change', (event) => {
    state.captureFlash = event.target.checked;
  });

  ui.uploadBtn.addEventListener('click', () => ui.uploadInput.click());
  ui.uploadInput.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      const img = await loadImage(loadEvent.target.result);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 900;
      tempCanvas.height = 1200;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      const processed = await processCapturedImage(tempCanvas.toDataURL('image/png'), state.filter);
      state.photos = [processed];
      openResultSheet();
    };
    reader.readAsDataURL(file);
  });

  ui.layoutOptions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-layout]');
    if (!button) return;
    state.layout = button.dataset.layout;
    state.shots = LAYOUTS[state.layout].shots;
    ui.shotsSelect.value = String(state.shots);
    updateLayoutPreview();
  });

  ui.filterOptions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    state.filter = button.dataset.filter;
    updateFilterPreview();
  });

  ui.resultThumbs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-index]');
    if (!button) return;
    retakePhoto(Number(button.dataset.index));
  });

  ui.saveResultBtn.addEventListener('click', () => {
    saveSessionToGallery();
    ui.resultSheet.classList.add('hidden');
  });

  ui.downloadResultBtn.addEventListener('click', () => {
    downloadDataUri(ui.resultCanvas.toDataURL('image/png'), 'klaro-strip.png');
  });

  ui.shareResultBtn.addEventListener('click', shareCurrentStrip);
  ui.retakeShotBtn.addEventListener('click', () => {
    state.photos = [];
    ui.resultSheet.classList.add('hidden');
    closeAllSheets();
  });

  ui.galleryList.addEventListener('click', handleGalleryActions);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllSheets();
      ui.resultSheet.classList.add('hidden');
    }
  });
}

async function init() {
  renderLayouts();
  renderFilters();
  updateSettingsFromState();
  bindEvents();
  await ensureCamera();
  renderGallery();
}

init();

