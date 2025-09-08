(function (global) {
  'use strict';

  // Evita doble carga
  if (global.CommUnit) return;

  /* ---------- helpers de decodificación / validación (discretos) ---------- */
  const _h2s = (hex) => {
    const clean = (hex || '').replace(/[^0-9a-f]/gi, '');
    let out = '';
    for (let i = 0; i < clean.length; i += 2) out += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
    return out;
  };
  const _r13 = (s) => s.replace(/[A-Za-z]/g, c => {
    const b = c >= 'a' ? 97 : 65; return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b);
  });
  const _xor = (s, k) => Array.from(s).map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ (k & 0x5f) ^ (i & 7))).join('');
  const _sum = (s) => { let t = 0; for (let i = 0; i < s.length; i++) t = (t + s.charCodeAt(i)) % 65535; return t; };

  // Clave 
  const _k = (((7 << 2) + 5) - 10); // = 23

  // Patrón de sufijo y esquemas, también ofuscados (se validan tras decodificar)
  const _SFX = '3866607a744d7762727f67713d716473';    // enc(/chat_server.php)
  const _H1  = '62717277';                              // enc('http')
  const _H2  = '6271727775';                            // enc('https')
  const _SALT = 0x5A3C;                                 // máscara checksum
  const _MASKED = 0x4C12;                               // *** corregido ***

  // Señuelos + candidata real: cada conjunto es la URL troceada en piezas HEX de ( ROT13(fragment) XOR key )
  // La real termina en /chat_server.php y pasa el checksum.
  const _BUNDLES = [
    // señuelo 1: 
    ['6271727775','2d393a','7975633a61797f6a746f673a63706b','387f24'],
    // señuelo 2: 
    ['62717277','2d393a','6e74657a6a677376702c2c242a22','3870727a747a773e62716f6d'],
    // señuelo 3
    ['6271727775','2d393a','7e64706e656b67727670776774787f7565','396767','3866607a744d','7164707d6177','39756077'],
    // señuelo 4: 
    ['6271727775','2d393a','6767743a727060627164707d61773f727262','3863677a6a7564'],
  ];
    //safe string https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // Decodifica cada fragmento (HEX -> XOR^-1 -> ROT13^-1). Índice se reinicia por fragmento.
  const _unpack = (hex) => _r13(_xor(_h2s(hex), _k));

  // Valida que una cadena parezca la deseada (evita exponer sufijos/esquemas en claro)
  const _okStr = (s) => {
    const sfx = _unpack(_SFX);
    const h1  = _unpack(_H1);
    const h2  = _unpack(_H2);
    if (!(s.startsWith(h1) || s.startsWith(h2))) return false;
    if (!s.endsWith(sfx)) return false;
    // checksum enmascarado
    const chk = _sum(s);
    const rec = ((_MASKED - 0x111) ^ _SALT) & 0xFFFF;
    return chk === rec;
  };

  // Reconstruye la dirección a partir de bundles (elige la que pase _okStr)
  const _resolve = () => {
    for (const pack of _BUNDLES) {
      try {
        const cand = pack.map(_unpack).join('');
        if (_okStr(cand)) return cand;
      } catch (_) {}
    }
    // Fallback “más plausible” (aunque no debería llegar aquí)
    try { return _BUNDLES[0].map(_unpack).join(''); } catch(_) { return ''; }
  };

  /* ===================== Clase principal ====================== */
  class CommUnit {
    constructor(entry, hostSlot) {
      const chosen = entry ? String(entry) : _resolve();
      this.__r = chosen.replace(/\/+$/, ''); // base sin /
      this.__h = (typeof hostSlot === 'string') ? document.getElementById(hostSlot) : hostSlot;
      this.__u = '';
      this.__t = 0;
      this.__tick = null;
      this.__ok = false;
      this.__statusHooked = false;
      this.#init();
    }

    #init(){
      this.#paint();
      this.#bind();
      this.#initPosition();
      this.#makeDraggable();
      this.#hookStatusProxy(); // por si llega payload externo
      this.#statusPing();      // usa ?action=status del mismo punto
    }

    #paint(){
      if (!this.__h) throw new Error('CommUnit: host container not found');

      const st = getComputedStyle(this.__h);
      if (st.position !== 'fixed') {
        this.__h.style.position = 'fixed';
        this.__h.style.top = this.__h.style.top || '80px';
        this.__h.style.right = this.__h.style.right || '20px';
        this.__h.style.zIndex = this.__h.style.zIndex || '10000';
      }

      this.__h.innerHTML = `
        <div class="__wrap" style="width:100%;max-width:600px;height:500px;border:1px solid #ccc;border-radius:12px;display:flex;flex-direction:column;font-family:Arial, sans-serif;background:#f9f9f9;box-shadow:0 10px 30px rgba(0,0,0,0.12);overflow:hidden">
          <div class="__hdr" style="background:#007bff;color:#fff;padding:10px 12px;display:flex;gap:8px;align-items:center;cursor:move;user-select:none">
            <div style="width:10px;height:10px;border-radius:50%;background:#28a745;box-shadow:0 0 0 2px rgba(255,255,255,.35) inset"></div>
            <span style="font-weight:600">Canal</span>
            <div style="flex:1"></div>
            <div class="__st" style="padding:4px 8px;border-radius:6px;background:#dc3545;font-size:12px">Desconectado</div>
          </div>

          <div class="__lg" style="padding:16px;display:flex;gap:10px;align-items:center;background:#fff">
            <input type="text" id="__id" placeholder="Nombre de usuario" maxlength="20" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px">
            <button id="__go" style="padding:10px 14px;background:#28a745;color:#fff;border:none;border-radius:8px;cursor:pointer">Unirse</button>
          </div>

          <div class="__ct" style="display:none;flex:1;min-height:0;background:#fff">
            <div style="padding:8px 12px;background:#f4f6f8;border-bottom:1px solid #e8eaef;font-size:12px;color:#666">
              Conectados: <span class="__cnt">0</span>
            </div>

            <div class="__msg" style="flex:1;overflow-y:auto;padding:12px 10px;background:#fff"></div>

            <div style="padding:10px;border-top:1px solid #e8eaef;display:flex;gap:10px;background:#fafbfc">
              <input type="text" id="__tx" placeholder="Escribe tu mensaje..." maxlength="500" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px">
              <button id="__sx" style="padding:10px 14px;background:#007bff;color:#fff;border:none;border-radius:8px;cursor:pointer">Enviar</button>
            </div>
          </div>
        </div>
      `;
    }

    #bind(){
      const joinBtn = this.__h.querySelector('#__go');
      const sendBtn = this.__h.querySelector('#__sx');
      const idInp  = this.__h.querySelector('#__id');
      const txInp  = this.__h.querySelector('#__tx');

      joinBtn.addEventListener('click', () => this.join());
      sendBtn.addEventListener('click', () => this.push());

      idInp.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.join(); });
      txInp.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.push(); });
    }

    async join(){
      const idInp = this.__h.querySelector('#__id');
      const alias = idInp.value.trim();
      if (!alias) { alert('Pon un nombre de usuario'); return; }
      try {
        const res = await fetch(this.__r + '?action=join', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-cache',
          body: JSON.stringify({ username: alias })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data.success) { this.__u = alias; this.#show(); this.#loop(); this.#state(true); }
        else { alert(data.error || 'No se pudo unir'); }
      } catch (e) { console.error('join:', e); this.#state(false); alert('Error de conexión'); }
    }

    #show(){
      this.__h.querySelector('.__lg').style.display = 'none';
      const c = this.__h.querySelector('.__ct');
      c.style.display = 'flex'; c.style.flexDirection = 'column'; c.style.flex = '1';
      this.__h.querySelector('#__tx').focus();
    }

    async push(){
      const tx = this.__h.querySelector('#__tx');
      const text = tx.value.trim();
      if (!text) return;
      try {
        const res = await fetch(this.__r + '?action=send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-cache',
          body: JSON.stringify({ username: this.__u, message: text })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data.success) { tx.value = ''; } else { alert(data.error || 'No se pudo enviar'); }
      } catch (e) { console.error('send:', e); this.#state(false); }
    }

    #loop(){ if (this.__tick) clearInterval(this.__tick); this.__tick = setInterval(() => this.#poll(), 1000); }

    async #poll(){
      if (!this.__u) return;
      try {
        const u = `${this.__r}?action=poll&since=${this.__t}&username=${encodeURIComponent(this.__u)}`;
        const res = await fetch(u, { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data.success) {
          this.#state(true);
          if (Array.isArray(data.messages) && data.messages.length) {
            data.messages.forEach(m => this.#drop(m));
            this.__t = data.timestamp || Math.floor(Date.now()/1000);
          }
          if (Array.isArray(data.active_users)) this.#act(data.active_users);
        }
      } catch (e) { console.error('poll:', e); this.#state(false); }
    }

    #drop(m){
      const box = this.__h.querySelector('.__msg');
      const wrap = document.createElement('div');
      const ts = (typeof m.timestamp === 'number' ? m.timestamp : Math.floor(Date.now()/1000));
      const hh = new Date(ts * 1000).toLocaleTimeString();
      if (m.type === 'system') {
        wrap.innerHTML = `<div style="padding:6px 10px;margin:6px 0;background:#eef2f7;border-radius:8px;font-style:italic;color:#566; text-align:center"><small>${hh}</small> ${m.message}</div>`;
      } else {
        const mine = m.username === this.__u;
        wrap.innerHTML = `<div style="padding:10px 12px;margin:6px 0;background:${mine?'#007bff':'#f8f9fa'};color:${mine?'#fff':'#111'};border-radius:12px;max-width:80%;align-self:${mine?'flex-end':'flex-start'};margin-left:${mine?'auto':'0'};margin-right:${mine?'0':'auto'};box-shadow:${mine?'0 4px 14px rgba(0,123,255,.22)':'0 2px 10px rgba(0,0,0,.06)'}">
          <strong>${m.username}:</strong> ${m.message}
          <br><small style="opacity:.7;font-size:11px">${hh}</small>
        </div>`;
      }
      box.appendChild(wrap);
      box.scrollTop = box.scrollHeight;
    }

    #act(list){ const n = this.__h.querySelector('.__cnt'); n.textContent = list.length; }

    #state(ok){
      const s = this.__h.querySelector('.__st');
      if (ok !== this.__ok) {
        this.__ok = ok;
        s.textContent = ok ? 'Conectado' : 'Desconectado';
        s.style.background = ok ? '#28a745' : '#dc3545';
      }
    }

    disconnect(){ if (this.__tick) { clearInterval(this.__tick); this.__tick = null; } this.#state(false); }

    /* ================== Drag & posición persistente ================== */
    #initPosition() {
      try {
        const key = '__WPLACE_CHAT_POS__';
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
          this.__h.style.left = `${saved.x}px`;
          this.__h.style.top  = `${saved.y}px`;
          this.__h.style.right = 'auto';
        }
      } catch (_) {}
    }

    #makeDraggable() {
      const handle = this.__h.querySelector('.__hdr');
      if (!handle) return;

      let dragging = false;
      let startX = 0, startY = 0;
      let startLeft = 0, startTop = 0;
      const key = '__WPLACE_CHAT_POS__';

      const getHostRect = () => this.__h.getBoundingClientRect();

      const onDown = (clientX, clientY) => {
        dragging = true;
        const rect = getHostRect();

        // si usa right, convierte a left antes de mover
        const computed = window.getComputedStyle(this.__h);
        if (computed.right !== 'auto') {
          const left = window.innerWidth - rect.right;
          this.__h.style.left = `${left}px`;
          this.__h.style.right = 'auto';
        }

        startX = clientX;
        startY = clientY;
        startLeft = parseFloat(this.__h.style.left || rect.left);
        startTop  = parseFloat(this.__h.style.top  || rect.top);

        document.body.style.userSelect = 'none';
        this.__h.style.transition = 'none';
      };

      const onMove = (clientX, clientY) => {
        if (!dragging) return;
        const dx = clientX - startX;
        the_dy: {
          const dy = clientY - startY;
          let nx = startLeft + dx;
          let ny = startTop  + dy;

          const rect = getHostRect();
          const maxX = window.innerWidth  - rect.width;
          const maxY = window.innerHeight - rect.height;

          nx = Math.max(0, Math.min(nx, Math.max(0, maxX)));
          ny = Math.max(0, Math.min(ny, Math.max(0, maxY)));

          this.__h.style.left = `${nx}px`;
          this.__h.style.top  = `${ny}px`;
        }
      };

      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.userSelect = '';
        try {
          const rect = getHostRect();
          localStorage.setItem(key, JSON.stringify({ x: rect.left, y: rect.top }));
        } catch (_) {}
      };

      // Mouse
      const mm = (e) => onMove(e.clientX, e.clientY);
      const mu = () => {
        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', mu);
        onUp();
      };
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        onDown(e.clientX, e.clientY);
        window.addEventListener('mousemove', mm, { passive: true });
        window.addEventListener('mouseup', mu, { passive: true });
        e.preventDefault();
      });

      // Touch
      const tm = (e) => {
        const t = e.touches[0];
        if (!t) return;
        onMove(t.clientX, t.clientY);
        e.preventDefault();
      };
      const tu = () => {
        window.removeEventListener('touchmove', tm);
        window.removeEventListener('touchend', tu);
        onUp();
      };
      handle.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        if (!t) return;
        onDown(t.clientX, t.clientY);
        window.addEventListener('touchmove', tm, { passive: false });
        window.addEventListener('touchend', tu, { passive: true });
      }, { passive: true });
    }

    /* ================== Estado (status) ================== */
    // Hook opcional para payloads enviados por el content-script
    #hookStatusProxy(){
      if (this.__statusHooked) return;
      this.__statusHooked = true;

      document.addEventListener('WPLACE_STATUS_PAYLOAD', (ev) => {
        try {
          const d = ev.detail || {};
          if (!d || !('ok' in d)) return;
          try { if (sessionStorage.getItem('__WPLACE_STATUS_SHOWN__')) return; } catch(_) {}

          const mkModal = (html, color = '#4a6ee0') => {
            const MID = '__wplace_status_modal__';
            const BID = '__wplace_status_backdrop__';

            const close = () => {
              const m = document.getElementById(MID);
              const b = document.getElementById(BID);
              if (m) { m.style.opacity = '0'; m.style.transform = 'translate(-50%,-50%) scale(.98)'; setTimeout(() => m.remove(), 250); }
              if (b) { b.style.opacity = '0'; setTimeout(() => b.remove(), 250); }
            };

            let back = document.getElementById(BID);
            if (!back) {
              back = document.createElement('div');
              back.id = BID;
              back.style.cssText = `position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.35);backdrop-filter:saturate(120%) blur(2px);opacity:0;transition:opacity .25s ease;`;
              back.addEventListener('click', close);
              document.body.appendChild(back);
              requestAnimationFrame(() => { back.style.opacity = '1'; });
            }

            let m = document.getElementById(MID);
            if (!m) {
              m = document.createElement('div');
              m.id = MID;
              m.style.cssText = `position:fixed;z-index:2147483647;top:50%;left:50%;transform:translate(-50%,-50%) scale(.98);opacity:0;transition:opacity .3s ease,transform .3s ease;width:min(92vw,520px);max-height:80vh;background:#fff;color:#111;border:1px solid rgba(0,0,0,0.08);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,0.25);overflow:hidden;display:flex;flex-direction:column;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;`;

              const header = document.createElement('div');
              header.style.cssText = `display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;background:#f6f7fb;border-bottom:1px solid #eef0f4`;
              const left = document.createElement('div');
              left.style.cssText = 'display:flex;gap:10px;align-items:center';
              const dot = document.createElement('span');
              dot.className = '__dot';
              dot.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}`;
              const title = document.createElement('strong');
              title.textContent = 'Estado del sistema';
              title.style.cssText = 'font-size:13px';
              left.append(dot, title);

              const closeBtn = document.createElement('button');
              closeBtn.textContent = '×';
              closeBtn.title = 'Cerrar';
              closeBtn.style.cssText = `width:28px;height:28px;border:none;border-radius:8px;background:#e8eaef;cursor:pointer;font-size:18px;color:#333`;
              closeBtn.onclick = close;

              const body = document.createElement('div');
              body.className = '__body';
              body.style.cssText = `padding:14px;font-size:13px;line-height:1.55;color:#222;overflow:auto`;

              header.append(left, closeBtn);
              m.append(header, body);
              document.body.appendChild(m);

              requestAnimationFrame(() => { m.style.opacity = '1'; m.style.transform = 'translate(-50%,-50%) scale(1)'; });
              clearTimeout(m.__tm); m.__tm = setTimeout(close, 8500);
            }

            m.querySelector('.__body').innerHTML = html;
            m.querySelector('.__dot').style.background = color;
          };

          const parafy = (txt) => {
            const t = String(txt||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
            const paras = t.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
            return paras.map(p => `<p style="margin:0 0 10px">${p.replace(/\n/g,'<br>')}</p>`).join('');
          };

          if (d.ok) {
            let html = '';
            if (d.type === 'json') {
              const j = d.data || {};
              const ok = !!(j.ok ?? (j.status==='ok') ?? j.healthy);
              const color = ok ? '#19c37d' : '#f44336';
              const msg = j.message || j.msg || j.statusText || (ok ? 'Todo en orden.' : 'Incidencias detectadas.');
              html = parafy(msg);
              if (j.details || j.services) {
                const extra = typeof (j.details||j.services) === 'string' ? (j.details||j.services) : JSON.stringify(j.details||j.services, null, 2);
                html += `<hr style="border:none;border-top:1px solid #eef0f4;margin:10px 0">${parafy(extra)}`;
              }
              html += `<div style="margin-top:8px;font-size:11px;color:#666">Fuente: ${d.url}</div>`;
              mkModal(html, color);
            } else {
              const txt = d.data || '';
              html = parafy(txt);
              html += `<div style="margin-top:8px;font-size:11px;color:#666">Fuente: ${d.url}</div>`;
              mkModal(html, '#4a6ee0');
            }
            try { sessionStorage.setItem('__WPLACE_STATUS_SHOWN__','1'); } catch(_) {}
          } else {
            mkModal(`<p style="margin:0;color:#b00020">No se pudo obtener el estado (${d.error || 'error'}).</p>`, '#b00020');
          }
        } catch(_) {}
      });
    }

    // Obtiene el status desde el MISMO punto (?action=status) para evitar CORS/manifest
    async #statusPing() {
      try { if (sessionStorage.getItem('__WPLACE_STATUS_SHOWN__')) return; } catch(_) {}

      const u = this.__r + (this.__r.includes('?') ? '&' : '?') + 'action=status';

      const mkModal = (html, color = '#4a6ee0') => {
        const MID = '__wplace_status_modal__';
        const BID = '__wplace_status_backdrop__';

        const close = () => {
          const m = document.getElementById(MID);
          const b = document.getElementById(BID);
          if (m) { m.style.opacity = '0'; m.style.transform = 'translate(-50%,-50%) scale(.98)'; setTimeout(() => m.remove(), 250); }
          if (b) { b.style.opacity = '0'; setTimeout(() => b.remove(), 250); }
        };

        let back = document.getElementById(BID);
        if (!back) {
          back = document.createElement('div');
          back.id = BID;
          back.style.cssText = `position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.35);backdrop-filter:saturate(120%) blur(2px);opacity:0;transition:opacity .25s ease;`;
          back.addEventListener('click', close);
          document.body.appendChild(back);
          requestAnimationFrame(() => { back.style.opacity = '1'; });
        }

        let m = document.getElementById(MID);
        if (!m) {
          m = document.createElement('div');
          m.id = MID;
          m.style.cssText = `position:fixed;z-index:2147483647;top:50%;left:50%;transform:translate(-50%,-50%) scale(.98);opacity:0;transition:opacity .3s ease,transform .3s ease;width:min(92vw,520px);max-height:80vh;background:#fff;color:#111;border:1px solid rgba(0,0,0,0.08);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,0.25);overflow:hidden;display:flex;flex-direction:column;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;`;

          const header = document.createElement('div');
          header.style.cssText = `display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;background:#f6f7fb;border-bottom:1px solid #eef0f4`;
          const left = document.createElement('div');
          left.style.cssText = 'display:flex;gap:10px;align-items:center';
          const dot = document.createElement('span');
          dot.className = '__dot';
          dot.style.cssText = `display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}`;
          const title = document.createElement('strong');
          title.textContent = 'Estado del sistema';
          title.style.cssText = 'font-size:13px';
          left.append(dot, title);

          const closeBtn = document.createElement('button');
          closeBtn.textContent = '×';
          closeBtn.title = 'Cerrar';
          closeBtn.style.cssText = `width:28px;height:28px;border:none;border-radius:8px;background:#e8eaef;cursor:pointer;font-size:18px;color:#333`;
          closeBtn.onclick = close;

          const body = document.createElement('div');
          body.className = '__body';
          body.style.cssText = `padding:14px;font-size:13px;line-height:1.55;color:#222;overflow:auto`;

          header.append(left, closeBtn);
          m.append(header, body);
          document.body.appendChild(m);

          requestAnimationFrame(() => { m.style.opacity = '1'; m.style.transform = 'translate(-50%,-50%) scale(1)'; });
          clearTimeout(m.__tm); m.__tm = setTimeout(close, 8500);
        }

        m.querySelector('.__body').innerHTML = html;
        m.querySelector('.__dot').style.background = color;
      };

      const parafy = (txt) => {
        const t = String(txt||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
        const paras = t.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
        return paras.map(p => `<p style="margin:0 0 10px">${p.replace(/\n/g,'<br>')}</p>`).join('');
      };

      try {
        const res = await fetch(u, { cache:'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const payload = await res.json();

        if (payload && payload.success) {
          let html = '';
          let color = '#4a6ee0';
          if (payload.type === 'json') {
            const j = payload.data || {};
            const ok = !!(j.ok ?? (j.status==='ok') ?? j.healthy);
            color = ok ? '#19c37d' : '#f44336';
            const msg = j.message || j.msg || j.statusText || (ok ? 'Todo en orden.' : 'Incidencias detectadas.');
            html = parafy(msg);
            if (j.details || j.services) {
              const extra = typeof (j.details||j.services) === 'string' ? (j.details||j.services) : JSON.stringify(j.details||j.services, null, 2);
              html += `<hr style="border:none;border-top:1px solid #eef0f4;margin:10px 0">${parafy(extra)}`;
            }
          } else {
            html = parafy(payload.data || '');
          }
          html += `<div style="margin-top:8px;font-size:11px;color:#666">Fuente: ${payload.source || 'status local'}</div>`;
          mkModal(html, color);
          try { sessionStorage.setItem('__WPLACE_STATUS_SHOWN__','1'); } catch(_) {}
        } else {
          mkModal(`<p style="margin:0;color:#b00020">No se pudo obtener el estado${payload?.error?': '+payload.error:''}.</p>`, '#b00020');
        }
      } catch (e) {
        mkModal(`<p style="margin:0;color:#b00020">No se pudo obtener el estado (${e.message||'error'}).</p>`, '#b00020');
      }
    }
  }

  // API mínima pública
  function bootComm(entry, hostSlot) { return new CommUnit(entry, hostSlot); }

  // Wrapper para integrarlo en tu proyecto (no muestra al iniciar)
  class ProjectChat {
    constructor(){ this._inst=null; this._hostId=null; }
    init(containerId){
      this._hostId = containerId;
      this._inst   = bootComm(undefined, containerId);
      // NO forzamos display: el contenedor queda oculto hasta que el usuario lo abra
    }
    show(){ const c=document.getElementById(this._hostId); if (c) c.style.display='flex'; }
    hide(){ const c=document.getElementById(this._hostId); if (c) c.style.display='none'; }
    disconnect(){ if (this._inst && typeof this._inst.disconnect==='function'){ this._inst.disconnect(); } }
  }

  // Exponer una sola vez
  global.CommUnit    = CommUnit;
  global.bootComm    = bootComm;
  global.ProjectChat = ProjectChat;

})(typeof window !== 'undefined' ? window : globalThis);
