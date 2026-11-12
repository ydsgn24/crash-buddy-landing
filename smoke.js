// Studio backdrop (variant page). One shader, two shapes sharing the same palette & softness:
//  • hero  (.smoke)       — an arch of light with deep mint above; soft white clearing behind the hero text
//  • band  (.studio-band) — the same arch, animated by scroll: the dark comes down and fills the screen,
//                           then a light dome rises from the bottom and pushes it away
// Soft drifting light, gentle breathing, fine grain; the pointer nudges the light. No libraries.
(() => {
  const hosts = [...document.querySelectorAll('.smoke, .studio-band')];
  if (!hosts.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hex = (h) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  // Tweakables (shared by both shapes)
  const DARK_TOP = '#011414';   // deepest
  const DARK = '#013633';       // deep teal
  const LIGHT = '#8db6b3';      // soft light teal (from #015d56)
  const BUTTON = '#015d56';     // mid teal for the glow
  const BAND_CURVE = 0.16;      // how deep the band's top/bottom edges curve in (share of its height)
  const SPEED = 1.0;

  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FRAG = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime, uMouseStr, uMode, uCurve, uTop, uBot, uAnchor, uFadeTop;
    uniform vec2 uMouse;
    uniform vec3 uDarkTop, uDark, uLight, uBtn;
    uniform vec2 uClearC, uClearR;   // hero only: text clearing centre and radii in canvas uv

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

    vec3 hero(vec2 uv, float aspect, float y, float t, vec3 silver) {
      // ARCH: light rises from below the centre as a dome; deep mint above and at the sides
      float breathe = 0.03 * sin(t * 0.35);
      vec2 a = vec2((uv.x - 0.5) * max(aspect * 0.42, 0.95), uv.y + 0.25);
      float dd = length(a) - breathe;
      float lit = 1.0 - smoothstep(0.42, 1.32, dd);
      vec3 col = mix(uDarkTop, uDark, smoothstep(0.0, 0.6, lit));
      col = mix(col, silver, smoothstep(0.35, 1.0, lit));

      float cx = 0.5 + 0.14 * sin(t * 0.13) + (uMouse.x - 0.5) * 0.3 * uMouseStr;
      vec2 d = (uv - vec2(cx, 0.48)) * vec2(aspect * 0.5, 1.6);
      float bloom = exp(-dot(d, d) * 2.2) * (0.75 + 0.25 * sin(t * 0.4));
      col += mix(uBtn, uLight, 0.6) * bloom * 0.07 * (1.0 - smoothstep(0.6, 0.95, y));

      float side = pow(abs(uv.x - 0.5) * 2.0, 2.0);
      col *= 1.0 - 0.15 * side * (1.0 - smoothstep(0.2, 0.75, y));

      float side2 = abs(uv.x - 0.5) * 2.0;
      float fadeY = y - 0.12 * (1.0 - side2 * side2);
      col = mix(col, vec3(1.0), smoothstep(0.32, 0.9, fadeY));

      vec2 e = (uv - uClearC) / uClearR;
      float clearing = 1.0 - smoothstep(0.55, 1.45, length(e));
      return mix(col, vec3(1.0), clearing);
    }

    vec3 band(vec2 uv, float aspect, float y, float t, vec3 silver) {
      // Same dome geometry as the first screen, anchored to the bottom of the viewport.
      // uTop = dark dome (rises from below and fills the screen), uBot = light dome
      // (rises later and pushes the dark up and away). uAnchor = viewport bottom in canvas uv.
      float breathe = 0.03 * sin(t * 0.35);
      float round = mix(1.0, 1.5, step(1.0, aspect));          // rounder dome on wide screens so the arch reads
      vec2 a = vec2((uv.x - 0.5) * max(aspect * 0.42, 0.95) * round, uv.y - uAnchor + 0.25);
      float L = length(a) - breathe;
      float dIn = 1.0 - smoothstep(0.42, 1.32, L / max(uTop, 0.0001));
      float lOut = 1.0 - smoothstep(0.42, 1.32, L / max(uBot, 0.0001));
      float D = dIn * (1.0 - lOut);                              // 0 white … 1 deep mint

      vec3 dk = mix(uDark, uDarkTop, smoothstep(0.55, 1.0, D) * smoothstep(0.2, 1.0, y));
      vec3 col = mix(vec3(1.0), silver, smoothstep(0.0, 0.4, D));
      col = mix(col, dk, smoothstep(0.28, 1.0, D));

      // soft drifting light inside the dark (follows the pointer a little) + corner vignette
      float cx = 0.5 + 0.14 * sin(t * 0.13) + (uMouse.x - 0.5) * 0.3 * uMouseStr;
      vec2 d = (uv - vec2(cx, 0.48)) * vec2(aspect * 0.5, 1.6);
      float bloom = exp(-dot(d, d) * 2.2) * (0.75 + 0.25 * sin(t * 0.4));
      col += mix(uBtn, uLight, 0.6) * bloom * 0.06 * D;
      float side = pow(abs(uv.x - 0.5) * 2.0, 2.0);
      col *= 1.0 - 0.15 * side * D;

      // bright mint spots near the edges (the centre stays dark for the text)
      vec2 qa = vec2(aspect, 1.0);
      vec2 s1 = vec2(0.08 + 0.03 * sin(t * 0.09), 0.86 + 0.04 * cos(t * 0.07));
      vec2 s2 = vec2(0.93 + 0.03 * cos(t * 0.08), 0.62 + 0.05 * sin(t * 0.06));
      vec2 s3 = vec2(0.78 + 0.04 * sin(t * 0.05), 0.08 + 0.03 * cos(t * 0.09));
      float sp = exp(-dot((uv - s1) * qa, (uv - s1) * qa) * 9.0) * 0.55
               + exp(-dot((uv - s2) * qa, (uv - s2) * qa) * 8.0) * 0.45
               + exp(-dot((uv - s3) * qa, (uv - s3) * qa) * 10.0) * 0.4;
      col += mix(uBtn, uLight, 0.55) * sp * D;
      // before the backdrop pins, its top edge melts into the page above (no straight line)
      col = mix(col, vec3(1.0), (1.0 - smoothstep(0.0, 0.3, y)) * uFadeTop);
      return col;
    }

    vec3 endArch(vec2 uv, float aspect, float y, float t, vec3 silver) {
      // MESH GRADIENT (like the reference): several big soft colour lights blended by weight,
      // with gently warped coordinates so the shapes are organic, not stripes.
      // Space is measured in "transition lengths": ty = 0 where it starts, 1 where it is dark.
      // uTop = start, uAnchor = transition length (canvas fractions), uBot = light tilt.
      float L = max(uAnchor, 0.0001);
      float ty = (y - uTop) / L;
      float tx = uv.x * aspect / L;                    // same units horizontally → round blobs
      float W = aspect / L;                            // canvas width in those units

      // gentle organic warp
      float wx = tx + 0.35 * sin(ty * 1.7 + t * 0.10) + 0.18 * sin(ty * 3.1 - t * 0.07);
      float wy = ty + 0.22 * sin(tx * 0.9 - t * 0.08) + 0.10 * sin(tx * 2.3 + t * 0.05);
      wy += (uv.x - 0.5) * uBot / L;                  // light falls from the top-left
      wy -= (1.0 - uCurve) * 1.1;                     // scroll: starts as light patches, darkens as you approach
      wx += (uMouse.x - 0.5) * 0.4 * uMouseStr;

      vec3 cWhite = vec3(1.0);
      // the same muted tones as the backdrop at the top of the page
      vec3 cHaze  = vec3(0.800, 0.875, 0.867);        // #ccdfdd
      vec3 cMint  = vec3(0.251, 0.525, 0.502);        // #408680
      vec3 cTeal  = vec3(0.004, 0.365, 0.337);        // #015d56
      vec3 cDark  = vec3(0.004, 0.212, 0.200);        // #013633
      vec3 cDeep  = vec3(0.004, 0.078, 0.078);        // #011414

      // blob centres drift slowly
      vec2 b1 = vec2(W * (0.22 + 0.04 * sin(t * 0.07)), 0.18);
      vec2 b2 = vec2(W * (0.46 + 0.05 * cos(t * 0.06)), 0.52);
      vec2 b3 = vec2(W * (0.80 + 0.04 * sin(t * 0.05)), 0.42);
      vec2 b4 = vec2(W * (0.62 + 0.05 * cos(t * 0.08)), 0.98);
      vec2 b5 = vec2(W * (0.15 + 0.04 * cos(t * 0.06)), 0.86);
      vec2 P = vec2(wx, wy);
      float k = 1.6;
      float w1 = exp(-dot(P - b1, P - b1) * k / (1.2 * 1.2));
      float w2 = exp(-dot(P - b2, P - b2) * k / (1.0 * 1.0));
      float w3 = exp(-dot(P - b3, P - b3) * k / (0.95 * 0.95));
      float w4 = exp(-dot(P - b4, P - b4) * k / (1.1 * 1.1));
      float w5 = exp(-dot(P - b5, P - b5) * k / (0.9 * 0.9));
      float wWhite = exp(-pow(max(wy + 0.25, 0.0), 2.0) * 4.5) * 1.8 + smoothstep(-0.05, -0.7, wy) * 4.0;   // soft, cloudy white edge
      float wDeep = smoothstep(0.45, 1.35, wy) * 9.0 + 0.015;   // the form + footer sit on the deepest tone (#011414)

      vec3 col = (cWhite * wWhite + cHaze * w1 * 1.1 + cMint * w2 * 1.2 + cTeal * w3 + cDark * w4 * 1.3
                  + cDark * w5 * 0.9 + cDeep * wDeep)
               / (wWhite + w1 * 1.1 + w2 * 1.2 + w3 + w4 * 1.3 + w5 * 0.9 + wDeep);

      // far below the transition: deep mint with a couple of very soft, slow glows (no stripes)
      vec2 g1 = vec2(0.30 + 0.06 * sin(t * 0.05), 0.55);
      vec2 g2 = vec2(0.72 + 0.05 * cos(t * 0.04), 0.78);
      vec2 qa = vec2(aspect, 1.0);
      float gl1 = exp(-dot((uv - g1) * qa, (uv - g1) * qa) * 2.5);
      float gl2 = exp(-dot((uv - g2) * qa, (uv - g2) * qa) * 3.0);
      col += uDark * (gl1 * 0.10 + gl2 * 0.08) * smoothstep(1.2, 2.2, ty);   // barely-there glows, keeps it super dark

      float melt = smoothstep(0.0, uFadeTop, y);
      return mix(vec3(1.0), col, melt * melt * (3.0 - 2.0 * melt));   // pure white at the top, very soft (no edge line)
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;              // y = 0 at the bottom
      float aspect = uRes.x / uRes.y;
      float y = 1.0 - uv.y;                          // 0 at the top
      float t = uTime;
      vec3 silver = mix(vec3(0.88, 0.94, 0.93), uLight, 0.1);

      vec3 col = uMode < 0.5 ? hero(uv, aspect, y, t, silver)
               : uMode < 1.5 ? band(uv, aspect, y, t, silver) : endArch(uv, aspect, y, t, silver);
      float notWhite = 1.0 - smoothstep(0.96, 1.0, min(min(col.r, col.g), col.b));
      col += (hash(gl_FragCoord.xy) - 0.5) * 0.004 * notWhite;   // invisible dither, only against banding
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const init = (host) => {
    const isBand = host.classList.contains('studio-band');
    const isEnd = host.classList.contains('studio-band--end');
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return; // CSS fallback stays

    const sh = (type, src) => {
      const x = gl.createShader(type);
      gl.shaderSource(x, src);
      gl.compileShader(x);
      return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n) => gl.getUniformLocation(prog, n);
    const u = {
      res: U('uRes'), time: U('uTime'), mouse: U('uMouse'), mouseStr: U('uMouseStr'),
      clearC: U('uClearC'), clearR: U('uClearR'), curve: U('uCurve'), top: U('uTop'), bot: U('uBot'), anchor: U('uAnchor'), fadeTop: U('uFadeTop'),
    };
    gl.uniform3fv(U('uDarkTop'), hex(DARK_TOP));
    gl.uniform3fv(U('uDark'), hex(DARK));
    gl.uniform3fv(U('uLight'), hex(LIGHT));
    gl.uniform3fv(U('uBtn'), hex(BUTTON));
    gl.uniform1f(U('uMode'), isEnd ? 2 : isBand ? 1 : 0);

    host.prepend(canvas);
    host.classList.add('is-gl');

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * (host.clientWidth < 700 ? 0.8 : 0.55);
      const w = Math.max(1, Math.round(host.clientWidth * scale));
      const h = Math.max(1, Math.round(host.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(u.res, w, h);
      if (!isEnd) gl.uniform1f(u.curve, host.clientWidth < 700 ? BAND_CURVE * 0.65 : BAND_CURVE);

      if (!isBand) {
        // white clearing behind the hero heading + lead
        const hr = host.getBoundingClientRect();
        const els = ['.hero__title', '.hero__lead'].map((q) => document.querySelector(q)).filter(Boolean);
        if (els.length && hr.width) {
          const rs = els.map((el) => el.getBoundingClientRect());
          const l = Math.min(...rs.map((r) => r.left)), r = Math.max(...rs.map((r) => r.right));
          const t = Math.min(...rs.map((r) => r.top)), b = Math.max(...rs.map((r) => r.bottom));
          gl.uniform2f(u.clearC, ((l + r) / 2 - hr.left) / hr.width, 1 - ((t + b) / 2 - hr.top) / hr.height);
          gl.uniform2f(u.clearR, ((r - l) / 2 + 70) / hr.width, ((b - t) / 2 + 60) / hr.height);
        }
      }
    };

    const m = { x: 0.5, tx: 0.5, s: 0, ts: 0 };
    window.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      m.tx = (e.clientX - r.left) / r.width;
      m.ts = e.clientY >= r.top && e.clientY <= r.bottom ? 1 : 0;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { m.ts = 0; });

    let time = 3 + Math.random() * 20;
    let last = performance.now();
    let running = false;

    // dark scene: the dark dome rises from below as the scene enters; a light dome pushes it
    // away as the scene's end reaches the viewport (the next block arrives together with it)
    const scene = isBand ? host.closest('.dark-scene') : null;
    const bg = scene && scene.querySelector('.dark-scene__bg');
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const sceneState = () => {
      if (!isBand) return;
      if (isEnd) {                                        // geometry in px → canvas fractions
        const H = Math.max(1, host.clientHeight);
        const narrow = host.clientWidth < 700;
        gl.uniform1f(u.top, (narrow ? 30 : 40) / H);       // light patches start
        gl.uniform1f(u.anchor, (narrow ? 340 : 380) / H);  // length of the white → dark transition
        gl.uniform1f(u.bot, (narrow ? 20 : 50) / H);       // light falls slightly from the top-left
        gl.uniform1f(u.fadeTop, (narrow ? 150 : 230) / H);   // long, soft melt into the white page
        const r = host.getBoundingClientRect();
        const vh = window.innerHeight;
        const prog = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));   // 0 when it appears … 1
        gl.uniform1f(u.curve, ease(prog));
        return;
      }
      // static card (no scroll scene): fully dark with a soft light arch at the bottom (data-light = its size)
      if (!scene || reduced) { gl.uniform1f(u.top, parseFloat(host.dataset.dark) || 3.4); gl.uniform1f(u.bot, parseFloat(host.dataset.light) || 0); gl.uniform1f(u.anchor, 0); gl.uniform1f(u.fadeTop, 0); return; }
      const vh = window.innerHeight;
      const r = scene.getBoundingClientRect();
      const enter = ease(clamp((vh - r.top) / (vh * 0.95)));
      const exit = ease(clamp((vh * 1.2 - r.bottom) / (vh * 0.8)));
      gl.uniform1f(u.top, Math.pow(enter, 2.0) * 3.4);
      gl.uniform1f(u.bot, exit * 3.0);
      const bgTop = bg.getBoundingClientRect().top;
      gl.uniform1f(u.anchor, bgTop / vh);                       // keep the dome on the viewport bottom
      gl.uniform1f(u.fadeTop, clamp(bgTop / (vh * 0.3)));       // soft top edge until it pins
    };

    const parallax = () => {
      if (isBand || reduced) return;
      const y = window.scrollY;
      if (y < window.innerHeight * 1.5) host.style.transform = `translate3d(0, ${(y * 0.35).toFixed(1)}px, 0)`;
    };
    window.addEventListener('scroll', parallax, { passive: true });
    parallax();

    const draw = () => {
      resize();
      sceneState();
      gl.uniform1f(u.time, time);
      gl.uniform2f(u.mouse, m.x, 0.5);
      gl.uniform1f(u.mouseStr, m.s);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const frame = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt * SPEED;
      m.x += (m.tx - m.x) * 0.05;
      m.s += (m.ts - m.s) * 0.04;
      draw();
      requestAnimationFrame(frame);
    };

    draw();
    if (reduced) {
      new ResizeObserver(draw).observe(host);
      return;
    }
    new IntersectionObserver(([e]) => {
      const was = running;
      running = e.isIntersecting;
      if (running && !was) { last = performance.now(); requestAnimationFrame(frame); }
    }).observe(host);
  };

  hosts.forEach((h) => { try { init(h); } catch (e) { /* CSS fallback stays */ } });

  // Header over dark areas → dark translucent glass (variant page only)
  const header = document.querySelector('.header');
  const nav = header && header.querySelector('.nav');
  if (header && nav) {
    const darkZones = () => {
      const zones = [];
      const team = document.querySelector('.team-card');
      if (team) zones.push(team.getBoundingClientRect());
      const end = document.querySelector('.end-scene');
      if (end) {
        const r = end.getBoundingClientRect();
        zones.push({ top: r.top + 260, bottom: r.bottom });   // below the white → dark transition
      }
      return zones;
    };
    const updateHeader = () => {
      const n = nav.getBoundingClientRect();
      const mid = n.top + n.height / 2;
      const atTop = window.scrollY < 140;                     // the dark top of the first-screen backdrop
      const overDark = atTop || darkZones().some((z) => mid > z.top && mid < z.bottom);
      header.classList.toggle('on-dark', overDark);
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', updateHeader);
    updateHeader();
  }

  // Pricing: both green blocks show parts of ONE gradient (offsets measured against the row)
  const row = document.querySelector('.plans2');
  if (row) {
    const tops = [...row.querySelectorAll('.plan2__top')];
    const sync = () => {
      const r = row.getBoundingClientRect();
      const first = tops[0].getBoundingClientRect();
      const last = tops[tops.length - 1].getBoundingClientRect();
      row.style.setProperty('--pw', `${r.width}px`);
      row.style.setProperty('--ph', `${Math.max(first.height, last.bottom - first.top)}px`);
      tops.forEach((el) => {
        const b = el.getBoundingClientRect();
        el.style.setProperty('--ox', `${b.left - r.left}px`);
        el.style.setProperty('--oy', `${b.top - first.top}px`);
      });
    };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
  }
})();
