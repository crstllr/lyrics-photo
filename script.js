(() => {
  const canvas = document.getElementById("wall");
  const ctx = canvas.getContext("2d");
  const btn = document.getElementById("download");

  const FOCUS_Y    = 0.55;   // 0 = itaas ng picture, 1 = ibaba (para sa crop)
  const EXPORT_SCALE = 3;    // gaano kalinaw ang na-download (3 = 3x ng screen)
  const MAX_EXPORT_PX = 4096; // limit sa pinakamahabang gilid, para hindi mag-crash ang phone
  const FILE_NAME  = "lyrics-photo.png";

  const words = document.getElementById("lyrics").textContent
    .trim().replace(/\s+/g, " ").toLowerCase().split(" ").filter(Boolean);

  const img = new Image();
  img.src = "bg.jpg";

  // Kuwentahin ang "cover" na posisyon ng picture
  function coverRect(W, H) {
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s, dh = img.height * s;
    return { dx: (W - dw) / 2, dy: (H - dh) * FOCUS_Y, dw, dh };
  }

  // Iguhit ang lyrics na kulay-picture sa kahit anong canvas context.
  // W, H = laki sa "logical px"; scale = dami ng totoong pixel bawat logical px
  function renderLyrics(c, W, H, scale) {
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, W, H);

    const fs = Math.max(8, Math.min(13, Math.min(W, H) / 52));
    const lh = fs * 1.08;
    c.font = `800 ${fs}px "Segoe UI", Arial, sans-serif`;
    c.textBaseline = "alphabetic";
    c.fillStyle = "#fff";

    const spaceW = c.measureText(" ").width;
    const lines = Math.ceil(H / lh) + 1;
    let wi = 0;

    for (let row = 0; row < lines; row++) {
      const line = [];
      let width = 0;
      while (true) {
        const w = words[wi % words.length];
        const ww = c.measureText(w).width;
        const need = width + (line.length ? spaceW : 0) + ww;
        if (need > W && line.length) break;
        line.push({ w, ww });
        width = need;
        wi++;
        if (line.length > 200) break;
      }
      const textW = line.reduce((s, x) => s + x.ww, 0);
      const gap = line.length > 1 ? (W - textW) / (line.length - 1) : spaceW;
      let x = 0;
      const y = (row + 1) * lh - fs * 0.2;
      for (const item of line) {
        c.fillText(item.w, x, y);
        x += item.ww + gap;
      }
    }

    // Picture ang kulay ng letra
    const r = coverRect(W, H);
    c.globalCompositeOperation = "source-in";
    c.drawImage(img, r.dx, r.dy, r.dw, r.dh);
    c.globalCompositeOperation = "source-over";
  }

  // ---------- Pang-screen ----------
  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    renderLyrics(ctx, W, H, dpr);
  }

  // ---------- Pang-download ----------
  function download() {
    btn.disabled = true;
    const label = btn.innerHTML;
    btn.textContent = "Saving...";

    // Maliit na delay para lumabas muna ang "Saving..."
    setTimeout(() => {
      try {
        const W = window.innerWidth, H = window.innerHeight;
        const scale = Math.min(EXPORT_SCALE, MAX_EXPORT_PX / Math.max(W, H));
        const outW = Math.round(W * scale), outH = Math.round(H * scale);

        // 1) Lyrics layer (mataas ang resolution)
        const lyr = document.createElement("canvas");
        lyr.width = outW; lyr.height = outH;
        renderLyrics(lyr.getContext("2d"), W, H, scale);

        // 2) Final na canvas: malabong photo sa likod + lyrics sa ibabaw
        const out = document.createElement("canvas");
        out.width = outW; out.height = outH;
        const o = out.getContext("2d");
        const canFilter = "filter" in o;

        o.fillStyle = "#04060d";
        o.fillRect(0, 0, outW, outH);

        // malabong photo sa likod (tulad ng nasa screen)
        const r = coverRect(W, H);
        o.save();
        o.translate(outW / 2, outH / 2);
        o.scale(1.1, 1.1);
        o.translate(-outW / 2, -outH / 2);
        if (canFilter) {
          o.filter = `blur(${24 * scale}px) brightness(.35) saturate(1.2)`;
        } else {
          o.globalAlpha = 0.35;   // fallback para sa browser na walang canvas filter
        }
        o.drawImage(img, r.dx * scale, r.dy * scale, r.dw * scale, r.dh * scale);
        o.restore();

        // lyrics sa ibabaw (kasama ang liwanag/contrast tulad ng sa screen)
        if (canFilter) o.filter = "brightness(1.35) contrast(1.1) saturate(1.2)";
        o.drawImage(lyr, 0, 0);
        if (canFilter) o.filter = "none";

        // 3) I-save bilang PNG
        out.toBlob(blob => {
          if (!blob) throw new Error("Hindi nagawa ang file.");
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = FILE_NAME;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          btn.innerHTML = label;
          btn.disabled = false;
        }, "image/png");
      } catch (err) {
        console.error(err);
        alert("Hindi na-save. Kung local file ang binubuksan mo, patakbuhin gamit ang: npx serve");
        btn.innerHTML = label;
        btn.disabled = false;
      }
    }, 50);
  }

  btn.addEventListener("click", download);

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(draw, 150);
  });

  function start() {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    else draw();
  }

  if (img.complete && img.naturalWidth) start();
  else img.onload = start;
  img.onerror = () => console.error("Hindi makita ang bg.jpg, i-check ang pangalan at folder.");
})();