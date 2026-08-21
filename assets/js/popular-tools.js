(() => {
  const $ = (id) => document.getElementById(id);
  const show = (id, text) => { const el = $(id); if (el) el.textContent = text; };
  const downloadBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const imageInput = $('image-input');
  if (imageInput) {
    const preview = $('image-preview');
    const outputPreview = $('image-output-preview');
    let sourceImage = null;
    let sourceName = 'image';
    imageInput.addEventListener('change', () => {
      const file = imageInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) return show('image-status', 'Please choose a valid image.');
      if (file.size > 25 * 1024 * 1024) return show('image-status', 'Please choose an image up to 25 MB.');
      sourceName = file.name.replace(/\.[^.]+$/, '') || 'image';
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        sourceImage = img;
        preview.src = url;
        preview.hidden = false;
        $('image-width').value = img.naturalWidth;
        $('image-height').value = img.naturalHeight;
        show('image-status', `Loaded ${img.naturalWidth}×${img.naturalHeight} • ${(file.size / 1024).toFixed(1)} KB`);
      };
      img.onerror = () => show('image-status', 'This image could not be decoded by the browser.');
      img.src = url;
    });

    let keepRatio = true;
    $('keep-ratio')?.addEventListener('change', (e) => { keepRatio = e.target.checked; });
    $('image-width')?.addEventListener('input', () => {
      if (!sourceImage || !keepRatio) return;
      const w = Number($('image-width').value);
      if (w > 0) $('image-height').value = Math.max(1, Math.round(w * sourceImage.naturalHeight / sourceImage.naturalWidth));
    });
    $('image-height')?.addEventListener('input', () => {
      if (!sourceImage || !keepRatio) return;
      const h = Number($('image-height').value);
      if (h > 0) $('image-width').value = Math.max(1, Math.round(h * sourceImage.naturalWidth / sourceImage.naturalHeight));
    });

    $('image-run')?.addEventListener('click', () => {
      if (!sourceImage) return show('image-status', 'Choose an image first.');
      const width = Math.round(Number($('image-width').value));
      const height = Math.round(Number($('image-height').value));
      const quality = Number($('image-quality').value) / 100;
      const format = $('image-format').value;
      if (!(width > 0 && width <= 10000 && height > 0 && height <= 10000)) return show('image-status', 'Width and height must be between 1 and 10,000 pixels.');
      if (!(quality >= 0.1 && quality <= 1)) return show('image-status', 'Choose a valid quality.');
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: format !== 'image/jpeg' });
      if (format === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }
      ctx.drawImage(sourceImage, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return show('image-status', 'Your browser could not create the output image.');
        const url = URL.createObjectURL(blob);
        outputPreview.src = url; outputPreview.hidden = false;
        $('image-download').disabled = false;
        $('image-download').onclick = () => downloadBlob(blob, `${sourceName}-nexusnova.${format === 'image/webp' ? 'webp' : 'jpg'}`);
        show('image-status', `Ready ${width}×${height} • ${(blob.size / 1024).toFixed(1)} KB`);
      }, format, quality);
    });
  }

  const resumeForm = $('resume-form');
  if (resumeForm) {
    const fields = ['resume-name','resume-title','resume-email','resume-phone','resume-location','resume-summary','resume-skills','resume-experience','resume-education'];
    const escapeHtml = (value) => value.replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const nl2br = (value) => escapeHtml(value).replace(/\n/g, '<br>');
    const render = () => {
      const val = (id) => ($(id)?.value || '').trim();
      $('cv-name').textContent = val('resume-name') || 'Your Name';
      $('cv-title').textContent = val('resume-title') || 'Professional Title';
      const contacts = [val('resume-email'), val('resume-phone'), val('resume-location')].filter(Boolean);
      $('cv-contact').textContent = contacts.join(' • ') || 'email@example.com • Phone • Location';
      $('cv-summary').innerHTML = nl2br(val('resume-summary') || 'Add a concise professional summary.');
      const skills = val('resume-skills').split(',').map(s => s.trim()).filter(Boolean);
      $('cv-skills').innerHTML = skills.length ? skills.map(s => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('') : '<span class="body-muted">Add comma-separated skills.</span>';
      $('cv-experience').innerHTML = nl2br(val('resume-experience') || 'Add your work experience, achievements and responsibilities.');
      $('cv-education').innerHTML = nl2br(val('resume-education') || 'Add education, certifications or relevant training.');
      const draft = Object.fromEntries(fields.map(id => [id, $(id)?.value || '']));
      localStorage.setItem('nexusnova_resume_draft_v1', JSON.stringify(draft));
    };
    try {
      const saved = JSON.parse(localStorage.getItem('nexusnova_resume_draft_v1') || '{}');
      fields.forEach(id => { if ($(id) && typeof saved[id] === 'string') $(id).value = saved[id]; });
    } catch {}
    resumeForm.addEventListener('input', render);
    $('resume-clear')?.addEventListener('click', () => {
      fields.forEach(id => { if ($(id)) $(id).value = ''; });
      localStorage.removeItem('nexusnova_resume_draft_v1'); render();
    });
    $('resume-print')?.addEventListener('click', () => window.print());
    render();
  }

  if ($('prompt-run')) {
    const promptFields = ['prompt-role','prompt-task','prompt-context','prompt-constraints','prompt-output','prompt-tone'];
    const buildPrompt = () => {
      const get = (id) => ($(id)?.value || '').trim();
      const role = get('prompt-role');
      const task = get('prompt-task');
      const context = get('prompt-context');
      const constraints = get('prompt-constraints');
      const output = get('prompt-output');
      const tone = get('prompt-tone');
      if (!task) return show('prompt-status', 'Describe the task you want the AI to perform.');
      const parts = [];
      if (role) parts.push(`ROLE\n${role}`);
      parts.push(`TASK\n${task}`);
      if (context) parts.push(`CONTEXT\n${context}`);
      if (constraints) parts.push(`CONSTRAINTS\n${constraints}`);
      if (output) parts.push(`OUTPUT FORMAT\n${output}`);
      if (tone) parts.push(`TONE\n${tone}`);
      parts.push('QUALITY CHECK\nBefore answering, verify the response against the task, constraints, and requested output format. Do not invent facts; clearly flag uncertainty.');
      $('prompt-output-text').value = parts.join('\n\n');
      localStorage.setItem('nexusnova_prompt_draft_v1', JSON.stringify(Object.fromEntries(promptFields.map(id => [id, $(id)?.value || '']))));
      show('prompt-status', 'Prompt ready. Review it, then copy it into your preferred AI assistant.');
    };
    try {
      const saved = JSON.parse(localStorage.getItem('nexusnova_prompt_draft_v1') || '{}');
      promptFields.forEach(id => { if ($(id) && typeof saved[id] === 'string') $(id).value = saved[id]; });
    } catch {}
    $('prompt-run').addEventListener('click', buildPrompt);
    $('prompt-copy')?.addEventListener('click', async () => {
      const text = $('prompt-output-text').value;
      if (!text) return show('prompt-status', 'Build a prompt first.');
      try { await navigator.clipboard.writeText(text); show('prompt-status', 'Copied to clipboard.'); }
      catch { show('prompt-status', 'Copy was blocked by the browser. Select the text and copy manually.'); }
    });
    $('prompt-clear')?.addEventListener('click', () => {
      promptFields.forEach(id => { if ($(id)) $(id).value = ''; });
      $('prompt-output-text').value = '';
      localStorage.removeItem('nexusnova_prompt_draft_v1');
      show('prompt-status', 'Cleared.');
    });
  }

  const pdfInput = $('pdf-images');
  if (pdfInput) {
    let jpegFiles = [];
    const readAsArrayBuffer = (file) => new Promise((resolve, reject) => {
      const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsArrayBuffer(file);
    });
    const jpegSize = (bytes) => {
      let i = 2;
      while (i < bytes.length) {
        if (bytes[i] !== 0xFF) { i += 1; continue; }
        const marker = bytes[i + 1];
        if ([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)) {
          return { height: (bytes[i+5] << 8) + bytes[i+6], width: (bytes[i+7] << 8) + bytes[i+8] };
        }
        if (marker === 0xD8 || marker === 0xD9) { i += 2; continue; }
        const len = (bytes[i+2] << 8) + bytes[i+3];
        if (!len) break;
        i += 2 + len;
      }
      throw new Error('Could not read JPEG dimensions');
    };
    const ascii = (text) => new TextEncoder().encode(text);
    const concat = (arrays) => {
      const len = arrays.reduce((n,a) => n + a.length, 0);
      const out = new Uint8Array(len); let p = 0;
      arrays.forEach(a => { out.set(a,p); p += a.length; }); return out;
    };
    pdfInput.addEventListener('change', () => {
      jpegFiles = [...(pdfInput.files || [])].filter(f => /image\/jpeg/i.test(f.type) || /\.jpe?g$/i.test(f.name));
      show('pdf-status', jpegFiles.length ? `${jpegFiles.length} JPEG image${jpegFiles.length === 1 ? '' : 's'} selected.` : 'Choose one or more JPG/JPEG images.');
    });
    $('pdf-run')?.addEventListener('click', async () => {
      if (!jpegFiles.length) return show('pdf-status', 'Choose JPG/JPEG images first.');
      if (jpegFiles.length > 30) return show('pdf-status', 'Please use up to 30 images per PDF.');
      if (jpegFiles.some(f => f.size > 15 * 1024 * 1024)) return show('pdf-status', 'Each image must be 15 MB or smaller.');
      try {
        show('pdf-status', 'Building PDF locally…');
        const images = [];
        for (const file of jpegFiles) {
          const bytes = new Uint8Array(await readAsArrayBuffer(file));
          if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) throw new Error(`${file.name} is not a valid JPEG.`);
          images.push({ bytes, ...jpegSize(bytes) });
        }
        const objects = [];
        const pageIds = [];
        const imageIds = [];
        let nextId = 3;
        images.forEach(() => { pageIds.push(nextId++); imageIds.push(nextId++); });
        objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
        objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${images.length} >>`;
        images.forEach((img, idx) => {
          const pageId = pageIds[idx], imgId = imageIds[idx];
          const maxW = 595.28, maxH = 841.89, margin = 24;
          const scale = Math.min((maxW - 2*margin)/img.width, (maxH - 2*margin)/img.height);
          const w = img.width * scale, h = img.height * scale;
          const x = (maxW - w)/2, y = (maxH - h)/2;
          const content = `q\n${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im${idx+1} Do\nQ\n`;
          const contentId = nextId++;
          objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${maxW} ${maxH}] /Resources << /XObject << /Im${idx+1} ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`;
          objects[imgId] = { binary: img.bytes, dict: `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>` };
          const contentBytes = ascii(content);
          objects[contentId] = { binary: contentBytes, dict: `<< /Length ${contentBytes.length} >>` };
        });
        const parts = [ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
        const offsets = [0];
        let pos = parts[0].length;
        const maxId = objects.length - 1;
        for (let id = 1; id <= maxId; id++) {
          offsets[id] = pos;
          const obj = objects[id];
          let chunk;
          if (typeof obj === 'string') {
            chunk = ascii(`${id} 0 obj\n${obj}\nendobj\n`);
          } else {
            chunk = concat([ascii(`${id} 0 obj\n${obj.dict}\nstream\n`), obj.binary, ascii('\nendstream\nendobj\n')]);
          }
          parts.push(chunk); pos += chunk.length;
        }
        const xrefPos = pos;
        let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
        for (let id = 1; id <= maxId; id++) xref += `${String(offsets[id]).padStart(10,'0')} 00000 n \n`;
        xref += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
        parts.push(ascii(xref));
        const pdf = concat(parts);
        downloadBlob(new Blob([pdf], { type: 'application/pdf' }), 'nexusnova-images.pdf');
        show('pdf-status', `PDF created locally with ${images.length} page${images.length === 1 ? '' : 's'}.`);
      } catch (err) {
        show('pdf-status', err?.message || 'Could not build the PDF.');
      }
    });
  }
})();