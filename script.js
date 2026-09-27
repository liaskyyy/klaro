(function(){
  const screens = {};
  ['landing','frameSelect','camera','photoReview','filterSelect','output'].forEach(id => screens[id] = document.getElementById(id));
  function show(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  let frameChoice = 'white';
  let customFrameImg = null;
  const frameColors = { white: '#ffffff', black: '#0a0a0a', gray: '#9a9a9a', red: '#b21f24', blue: '#1b3a7a' };
  const frameTextColor = { white: '#0a0a0a', black: '#ffffff', gray: '#0a0a0a', red: '#ffffff', blue: '#ffffff' };
  const fpFill = document.getElementById('fpFill');

  function paintFramePreview() {
    fpFill.style.background = customFrameImg ? '#e5e5e5' : frameColors[frameChoice];
    fpFill.innerHTML = '';

    if (customFrameImg) {
      const img = document.createElement('img');
      img.src = customFrameImg.src;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      fpFill.appendChild(img);
    } else {
      for (let i = 0; i < 4; i += 1) {
        const slot = document.createElement('div');
        slot.style.cssText = 'position:absolute;left:8%;width:84%;height:18%;top:' + (4 + i * 23) + '%;background:rgba(0,0,0,.08);border:1px solid rgba(0,0,0,.15);';
        fpFill.appendChild(slot);
      }
    }
  }

  paintFramePreview();

  document.querySelectorAll('.swatch[data-frame]').forEach((sw) => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.swatch[data-frame]').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      frameChoice = sw.dataset.frame;
      customFrameImg = null;
      paintFramePreview();
    });
  });

  document.getElementById('uploadFrameBtn').addEventListener('click', () => document.getElementById('frameFileInput').click());
  document.getElementById('frameFileInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const im = new Image();
      im.onload = () => {
        customFrameImg = im;
        document.querySelectorAll('.swatch[data-frame]').forEach((s) => s.classList.remove('active'));
        paintFramePreview();
      };
      im.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  });

  document.getElementById('startBtn').addEventListener('click', () => show('frameSelect'));
  document.getElementById('toCameraBtn').addEventListener('click', () => {
    show('camera');
    startCamera();
  });

  let stream = null;
  let facingMode = 'user';
  let countdownDur = 5;
  let flashOn = true;
  let zoomValue = 1;
  let useHardwareZoom = false;
  let captured = [];

  const video = document.getElementById('video');
  const progressEl = document.getElementById('progress');
  const countNum = document.getElementById('countNum');
  const shutterBtn = document.getElementById('shutterBtn');
  const camMsg = document.getElementById('camMsg');
  const flashDiv = document.getElementById('flash');

  function setVideoTransform() {
    video.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'none';
  }

  async function startCamera() {
    camMsg.style.display = 'none';
    video.style.display = 'block';
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      video.srcObject = stream;
      setVideoTransform();
      setZoom(zoomValue);
    } catch (err) {
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

  document.getElementById('switchCam').addEventListener('click', () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera();
  });

  document.getElementById('flashBtn').addEventListener('click', (e) => {
    flashOn = !flashOn;
    e.currentTarget.classList.toggle('on', flashOn);
    document.getElementById('flashLbl').textContent = flashOn ? 'FLASH' : 'NO FLASH';
  });

  document.getElementById('timerBtn').addEventListener('click', (e) => {
    countdownDur = countdownDur === 5 ? 10 : 5;
    document.getElementById('timerLbl').textContent = countdownDur + 'S';
    e.currentTarget.classList.toggle('on', countdownDur === 10);
  });

  document.getElementById('zoomPill').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    [...document.getElementById('zoomPill').children].forEach((c) => c.classList.remove('on'));
    b.classList.add('on');
    setZoom(parseFloat(b.dataset.z));
  });

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function runCountdown() {
    for (let n = countdownDur; n >= 1; n -= 1) {
      countNum.textContent = n;
      countNum.classList.remove('show');
      void countNum.offsetWidth;
      countNum.classList.add('show');
      await wait(n <= 3 ? 900 : 280);
    }
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
      sx = sx + (cw - sw) / 2;
      sy = sy + (ch - sh) / 2;
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
    await wait(200);
  }

  function updateProgress(n) {
    progressEl.textContent = String(Math.min(n, 4)).padStart(2, '0') + ' / 04';
  }

  shutterBtn.addEventListener('click', async () => {
    if (!stream) return;
    shutterBtn.disabled = true;
    captured = [];
    updateProgress(0);

    for (let i = 0; i < 4; i += 1) {
      await runCountdown();
      await doFlash();
      captured.push(captureFrame());
      updateProgress(i + 1);
      await wait(300);
    }

    shutterBtn.disabled = false;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    buildThumbGrid();
    show('photoReview');
  });

  function buildThumbGrid() {
    const grid = document.getElementById('thumbGrid');
    grid.innerHTML = '';
    captured.forEach((src) => {
      const img = document.createElement('img');
      img.src = src;
      grid.appendChild(img);
    });
  }

  document.getElementById('retakeAllBtn').addEventListener('click', () => {
    show('camera');
    startCamera();
  });

  document.getElementById('toFilterBtn').addEventListener('click', () => {
    applyFilterPreview();
    show('filterSelect');
  });

  let filterMode = 'normal';
  const filterCSS = {
    normal: 'none',
    bw: 'grayscale(1) contrast(1.05)',
    vintage: 'sepia(.35) contrast(1.1) brightness(.95) saturate(1.1)'
  };

  function applyFilterPreview() {
    const preview = document.getElementById('filterPreviewImg');
    preview.src = captured[0];
    preview.style.filter = filterCSS[filterMode];
  }

  document.querySelectorAll('.chip[data-flt]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-flt]').forEach((c) => c.classList.remove('on'));
      chip.classList.add('on');
      filterMode = chip.dataset.flt;
      applyFilterPreview();
    });
  });

  document.getElementById('toOutputBtn').addEventListener('click', () => {
    buildStrip();
    show('output');
  });

  const stripCanvas = document.getElementById('stripCanvas');

  function buildStrip() {
    const DPI = 300;
    const cw = 2 * DPI;
    const ch = 6 * DPI;
    const pad = 18;
    const gap = 10;
    const footer = 90;
    const photoW = cw - pad * 2;
    const photoH = (ch - pad - footer - gap * 3 - pad) / 4;

    stripCanvas.width = cw;
    stripCanvas.height = ch;
    const ctx = stripCanvas.getContext('2d');
    ctx.fillStyle = customFrameImg ? '#e5e5e5' : frameColors[frameChoice];
    ctx.fillRect(0, 0, cw, ch);

    const imgs = captured.map((src) => {
      const im = new Image();
      im.src = src;
      return im;
    });

    let loaded = 0;
    function drawAll() {
      imgs.forEach((im, i) => {
        const y = pad + i * (photoH + gap);
        const targetAR = photoW / photoH;
        const srcAR = im.width / im.height;
        let sx = 0;
        let sy = 0;
        let sw = im.width;
        let sh = im.height;

        if (srcAR > targetAR) {
          sw = im.height * targetAR;
          sx = (im.width - sw) / 2;
        } else {
          sh = im.width / targetAR;
          sy = (im.height - sh) / 2;
        }

        ctx.save();
        ctx.filter = filterCSS[filterMode];
        ctx.drawImage(im, sx, sy, sw, sh, pad, y, photoW, photoH);
        ctx.restore();
      });

      ctx.fillStyle = customFrameImg ? '#0a0a0a' : frameTextColor[frameChoice];
      ctx.textAlign = 'center';
      ctx.font = '700 30px Helvetica Neue, Arial, sans-serif';
      ctx.fillText('KLARO', cw / 2, ch - footer / 2 + 4);
      ctx.font = '13px ui-monospace, monospace';
      ctx.fillText('PHOTOBOOTH', cw / 2, ch - footer / 2 + 28);

      if (customFrameImg) {
        ctx.drawImage(customFrameImg, 0, 0, cw, ch);
      }
    }

    imgs.forEach((im) => {
      im.onload = () => {
        loaded += 1;
        if (loaded === imgs.length) drawAll();
      };
    });

    if (imgs.length === 0) drawAll();
  }

  document.getElementById('retakeBtn2').addEventListener('click', () => {
    captured = [];
    customFrameImg = null;
    filterMode = 'normal';
    document.querySelectorAll('.chip[data-flt]').forEach((c) => c.classList.remove('on'));
    document.querySelector('.chip[data-flt="normal"]').classList.add('on');
    show('camera');
    startCamera();
  });

  document.getElementById('downloadBtn').addEventListener('click', async () => {
    const hint = document.getElementById('resultHint');
    stripCanvas.toBlob(async (blob) => {
      let downloads = null;
      try {
        downloads = window.claude ? await window.claude.use('downloads') : null;
      } catch (e) {
        downloads = null;
      }

      if (downloads) {
        try {
          await downloads.save({ filename: 'klaro-photobooth.png', data: blob });
          hint.textContent = 'Saved.';
        } catch (e) {
          hint.textContent = 'Save cancelled — press and hold the image to save it.';
        }
      } else {
        hint.textContent = 'Press and hold (or right-click) the image above to save it.';
      }
    }, 'image/png');
  });

  document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
    const hint = document.getElementById('resultHint');
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'in', format: [2, 6] });
      const dataUrl = stripCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, 2, 6);
      const blob = pdf.output('blob');

      let downloads = null;
      try {
        downloads = window.claude ? await window.claude.use('downloads') : null;
      } catch (e) {
        downloads = null;
      }

      if (downloads) {
        try {
          await downloads.save({ filename: 'klaro-photobooth.pdf', data: blob });
          hint.textContent = 'PDF saved.';
        } catch (e) {
          hint.textContent = 'Save cancelled.';
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'klaro-photobooth.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        hint.textContent = 'PDF ready — check your downloads.';
      }
    } catch (e) {
      hint.textContent = 'Could not generate PDF. Try PNG or Print instead.';
    }
  });

  document.getElementById('printBtn').addEventListener('click', () => {
    const dataUrl = stripCanvas.toDataURL('image/png');
    document.getElementById('printImg').src = dataUrl;
    window.print();
  });
})();

