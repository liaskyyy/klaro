(function(){
  const screens = {};
  ['landing','frameSelect','camera','photoReview','filterSelect','output'].forEach((id) => {
    screens[id] = document.getElementById(id);
  });

  function show(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove('active'));
    screens[name].classList.add('active');
  }

  let frameChoice = 'white';
  let customFrameImg = null;
  let stream = null;
  let facingMode = 'user';
  let countdownDur = 5;
  let flashOn = true;
  let zoomValue = 1;
  let useHardwareZoom = false;
  let captured = [];
  let filterMode = 'normal';

  const frameColors = { white: '#ffffff', black: '#0a0a0a', gray: '#9a9a9a', red: '#b21f24', blue: '#1b3a7a' };
  const frameTextColor = { white: '#0a0a0a', black: '#ffffff', gray: '#0a0a0a', red: '#ffffff', blue: '#ffffff' };
  const filterCSS = {
    normal: 'none',
    bw: 'grayscale(1) contrast(1.1)',
    vintage: 'sepia(0.45) contrast(1.08) brightness(0.96) saturate(1.1)'
  };

  const fpFill = document.getElementById('fpFill');
  const video = document.getElementById('video');
  const progressEl = document.getElementById('progress');
  const countNum = document.getElementById('countNum');
  const shutterBtn = document.getElementById('shutterBtn');
  const camMsg = document.getElementById('camMsg');
  const flashDiv = document.getElementById('flash');
  const stripCanvas = document.getElementById('stripCanvas');
  const reviewStripCanvas = document.getElementById('reviewStripCanvas');
  const filterCanvas = document.getElementById('filterCanvas');
  const qrCode = document.getElementById('qrCode');
  const hint = document.getElementById('resultHint');

  function paintFramePreview() {
    fpFill.style.background = customFrameImg ? '#e5e5e5' : frameColors[frameChoice];
    fpFill.innerHTML = '';

    if (customFrameImg) {
      const img = document.createElement('img');
      img.src = customFrameImg.src;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      fpFill.appendChild(img);
      return;
    }

    for (let i = 0; i < 4; i += 1) {
      const slot = document.createElement('div');
      slot.style.cssText = 'position:absolute;left:8%;width:84%;height:18%;top:' + (4 + i * 23) + '%;background:rgba(0,0,0,.08);border:1px solid rgba(0,0,0,.15);';
      fpFill.appendChild(slot);
    }
  }

  function updateProgress(n) {
    progressEl.textContent = String(Math.min(n, 4)).padStart(2, '0') + ' / 04';
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setVideoTransform() {
    video.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'none';
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image could not load.'));
      img.src = src;
    });
  }

  function updateQrCode() {
    const shareText = 'https://klaro.photobooth/' + Date.now();
    qrCode.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(shareText);
  }

  async function drawStripToCanvas(targetCanvas, list = captured) {
    const ctx = targetCanvas.getContext('2d');
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = customFrameImg ? '#f3f3f3' : frameColors[frameChoice];
    ctx.fillRect(0, 0, width, height);

    const pad = 18;
    const gap = 10;
    const footerHeight = 70;
    const photoWidth = width - pad * 2;
    const photoHeight = (height - pad * 2 - footerHeight - gap * 3) / 4;

    const usedImages = [];
    for (let i = 0; i < 4; i += 1) {
      const src = list[i];
      if (!src) continue;
      usedImages.push(await loadImage(src));
    }

    usedImages.forEach((img, index) => {
      const y = pad + index * (photoHeight + gap);
      const targetRatio = photoWidth / photoHeight;
      const sourceRatio = img.width / img.height;
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;

      if (sourceRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }

      ctx.save();
      ctx.filter = filterCSS[filterMode];
      ctx.drawImage(img, sx, sy, sw, sh, pad, y, photoWidth, photoHeight);
      ctx.restore();
    });

    ctx.fillStyle = customFrameImg ? '#0a0a0a' : frameTextColor[frameChoice];
    ctx.textAlign = 'center';
    ctx.font = '700 24px Helvetica Neue, Arial, sans-serif';
    ctx.fillText('KLARO', width / 2, height - footerHeight / 2 + 6);
    ctx.font = '12px ui-monospace, monospace';
    ctx.fillText('PHOTOBOOTH', width / 2, height - footerHeight / 2 + 28);

    if (customFrameImg) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.drawImage(customFrameImg, 0, 0, width, height);
      ctx.restore();
    }
  }

  async function refreshReviewStrip() {
    await drawStripToCanvas(reviewStripCanvas, captured);
  }

  async function refreshFilterPreview() {
    await drawStripToCanvas(filterCanvas, captured);
  }

  async function buildStrip() {
    await drawStripToCanvas(stripCanvas, captured);
  }

  async function startCamera() {
    camMsg.style.display = 'none';
    video.style.display = 'block';

    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      video.srcObject = stream;
      setVideoTransform();
      setZoom(zoomValue);
    } catch (error) {
      video.style.display = 'none';
      camMsg.style.display = 'flex';
      camMsg.textContent = 'Camera access is needed to use KLARO. Please allow camera permission and reload, or check that your device has a camera.';
    }
  }

  function setZoom(level) {
    zoomValue = level;
    const track = stream && stream.getVideoTracks()[0];
    const caps = track && track.getCapabilities ? track.getCapabilities() : null;

    if (caps && caps.zoom) {
      useHardwareZoom = true;
      const z = Math.min(caps.zoom.max, Math.max(caps.zoom.min, level));
      track.applyConstraints({ advanced: [{ zoom: z }] }).catch(() => {});
      setVideoTransform();
    } else {
      useHardwareZoom = false;
      const cssScale = level >= 1 ? level : 1;
      video.style.transform = (facingMode === 'user' ? 'scaleX(-1)' : 'none') + ' scale(' + cssScale + ')';
    }
  }

  function buildThumbGrid() {
    const grid = document.getElementById('thumbGrid');
    grid.innerHTML = '';
    captured.forEach((src) => {
      const img = document.createElement('img');
      img.src = src;
      grid.appendChild(img);
    });
  }

  function captureFrame() {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetAR = 3 / 4;
    let cw = vw;
    let ch = vw / targetAR;

    if (ch > vh) {
      ch = vh;
      cw = vh * targetAR;
    }

    let sx = (vw - cw) / 2;
    let sy = (vh - ch) / 2;
    let sw = cw;
    let sh = ch;

    if (!useHardwareZoom && zoomValue > 1) {
      sw = sw / zoomValue;
      sh = sh / zoomValue;
      sx += (cw - sw) / 2;
      sy += (ch - sh) / 2;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    ctx.save();
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    return canvas.toDataURL('image/png');
  }

  async function doFlash() {
    if (!flashOn) return;
    flashDiv.classList.remove('fire');
    void flashDiv.offsetWidth;
    flashDiv.classList.add('fire');
    await wait(180);
  }

  async function runCountdown() {
    for (let n = countdownDur; n >= 1; n -= 1) {
      countNum.textContent = String(n);
      countNum.classList.remove('show');
      void countNum.offsetWidth;
      countNum.classList.add('show');
      await wait(1000);
    }
  }

  async function takeSequence() {
    if (!stream) return;

    shutterBtn.disabled = true;
    captured = [];
    updateProgress(0);

    for (let i = 0; i < 4; i += 1) {
      await runCountdown();
      await doFlash();
      captured.push(captureFrame());
      updateProgress(i + 1);
      await wait(250);
    }

    shutterBtn.disabled = false;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    buildThumbGrid();
    refreshReviewStrip();
    show('photoReview');
  }

  function paintFrameChoiceSelection() {
    document.querySelectorAll('.swatch[data-frame]').forEach((swatch) => {
      swatch.classList.toggle('active', swatch.dataset.frame === frameChoice);
    });
  }

  document.getElementById('startBtn').addEventListener('click', () => show('frameSelect'));
  document.getElementById('toCameraBtn').addEventListener('click', () => {
    show('camera');
    startCamera();
  });

  document.getElementById('switchCam').addEventListener('click', () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera();
  });

  document.getElementById('flashBtn').addEventListener('click', (event) => {
    flashOn = !flashOn;
    event.currentTarget.classList.toggle('on', flashOn);
    document.getElementById('flashLbl').textContent = flashOn ? 'FLASH' : 'NO FLASH';
  });

  document.getElementById('timerBtn').addEventListener('click', (event) => {
    countdownDur = countdownDur === 5 ? 10 : 5;
    document.getElementById('timerLbl').textContent = countdownDur + 'S';
    event.currentTarget.classList.toggle('on', countdownDur === 10);
  });

  document.getElementById('zoomPill').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    document.querySelectorAll('#zoomPill button').forEach((node) => node.classList.remove('on'));
    button.classList.add('on');
    setZoom(parseFloat(button.dataset.z));
  });

  shutterBtn.addEventListener('click', takeSequence);

  document.getElementById('retakeAllBtn').addEventListener('click', () => {
    show('camera');
    startCamera();
  });

  document.getElementById('toFilterBtn').addEventListener('click', async () => {
    await refreshFilterPreview();
    show('filterSelect');
  });

  document.querySelectorAll('.chip[data-flt]').forEach((chip) => {
    chip.addEventListener('click', async () => {
      document.querySelectorAll('.chip[data-flt]').forEach((node) => node.classList.remove('on'));
      chip.classList.add('on');
      filterMode = chip.dataset.flt;
      await refreshFilterPreview();
    });
  });

  document.getElementById('toOutputBtn').addEventListener('click', async () => {
    await buildStrip();
    updateQrCode();
    show('output');
  });

  document.getElementById('retakeBtn2').addEventListener('click', () => {
    captured = [];
    customFrameImg = null;
    filterMode = 'normal';
    document.querySelectorAll('.chip[data-flt]').forEach((node) => node.classList.remove('on'));
    document.querySelector('.chip[data-flt="normal"]').classList.add('on');
    paintFrameChoiceSelection();
    show('camera');
    startCamera();
  });

  document.getElementById('downloadBtn').addEventListener('click', () => {
    stripCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'klaro-strip.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      hint.textContent = 'PNG saved to downloads.';
    }, 'image/png');
  });

  document.getElementById('printBtn').addEventListener('click', () => {
    const dataUrl = stripCanvas.toDataURL('image/png');
    document.getElementById('printImg').src = dataUrl;
    hint.textContent = 'Print preview ready.';
    window.print();
  });

  document.querySelectorAll('.swatch[data-frame]').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      frameChoice = swatch.dataset.frame;
      customFrameImg = null;
      paintFrameChoiceSelection();
      paintFramePreview();
    });
  });

  document.getElementById('uploadFrameBtn').addEventListener('click', () => {
    document.getElementById('frameFileInput').click();
  });

  document.getElementById('frameFileInput').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        customFrameImg = img;
        frameChoice = 'custom';
        paintFrameChoiceSelection();
        paintFramePreview();
      };
      img.src = loadEvent.target.result;
    };
    reader.readAsDataURL(file);
  });

  paintFramePreview();
  paintFrameChoiceSelection();
  show('landing');
  updateProgress(1);
  updateQrCode();
})();

