// Living aurora for the dark cards: a WebGL noise "curtain" rising from the bottom
// in brand colours, with slanted light beams, constant slow drift and a cursor response.
// Falls back to the CSS layers inside .aurora when WebGL is unavailable.
(() => {
  const hosts = [...document.querySelectorAll('.aurora')];
  if (!hosts.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hex = (h) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  // Tweakables
  const COLORS = ['#015d56', '#01bea6', '#013633']; // left → bright → right
  const BRIGHT_AT = 0.35;   // where the brightest stop sits across the width
  const HEIGHT = 0.55;      // how high the glow reaches (0..1)
  const AMPLITUDE = 1.0;    // how much the edge waves
  const BLEND = 0.55;       // softness of the edge
  const SPEED = 1.0;

  const VERT = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform float uTime;
    uniform vec2 uRes;
    uniform vec3 uC0, uC1, uC2, uBgTop, uBgBottom;
    uniform float uBright, uHeight, uAmp, uBlend, uGlow;
    uniform vec2 uMouse;
    uniform float uCssW;   // card width in CSS px — keeps beams the same physical width on any card
    uniform float uMouseStr;

    // 2D simplex noise (Ashima Arts / Ian McEwan, MIT)
    vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m; m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;          // y = 0 at the bottom
      float t = uTime;

      // colour ramp across the width
      vec3 ramp = uv.x < uBright
        ? mix(uC0, uC1, uv.x / uBright)
        : mix(uC1, uC2, (uv.x - uBright) / (1.0 - uBright));

      // waving top edge of the curtain (+ a soft lift under the cursor)
      float n1 = snoise(vec2(uv.x * 1.4 + t * 0.06 + (uMouse.x - 0.5) * 0.35 * uMouseStr, t * 0.16));
      float n2 = snoise(vec2(uv.x * 3.2 - t * 0.09, t * 0.24 + 7.3));
      float near = exp(-pow((uv.x - uMouse.x) * 3.2, 2.0));
      float bump = uMouseStr * near * (0.1 + 0.2 * (1.0 - uMouse.y));
      float edge = uHeight + (n1 * 0.22 + n2 * 0.08) * uAmp + bump;
      float a = 1.0 - smoothstep(edge - uBlend * 0.5, edge + uBlend * 0.5, uv.y);

      // slanted light beams drifting slowly
      float aspect = uRes.y / uRes.x;
      // only 2–3 wide, soft beams across the card
      float s = snoise(vec2(uv.x * 1.9 - uv.y * 0.45 * min(aspect, 1.6) + t * 0.035, t * 0.05 + 3.1)) * 0.5 + 0.5;
      float beams = 0.62 + 0.5 * smoothstep(0.2, 0.95, s);
      float lift = pow(1.0 - uv.y, 1.5);

      vec3 col = ramp * beams * (0.38 + 0.85 * lift);
      col += uC1 * uMouseStr * near * (1.0 - uv.y) * 0.22;   // light follows the cursor

      vec3 bg = mix(uBgBottom, uBgTop, uv.y);
      vec3 rgb = mix(bg, col, clamp(a * uGlow, 0.0, 1.0));
      gl_FragColor = vec4(rgb, 1.0);
    }
  `;

  const init = (host) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'aurora__canvas';
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) return; // keep the CSS fallback

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n) => gl.getUniformLocation(prog, n);
    const u = {
      time: U('uTime'), res: U('uRes'), mouse: U('uMouse'), mouseStr: U('uMouseStr'), cssW: U('uCssW'),
    };
    gl.uniform3fv(U('uC0'), hex(COLORS[0]));
    gl.uniform3fv(U('uC1'), hex(COLORS[1]));
    gl.uniform3fv(U('uC2'), hex(COLORS[2]));
    gl.uniform3fv(U('uBgTop'), hex('#011414'));
    gl.uniform3fv(U('uBgBottom'), hex('#013633'));
    gl.uniform1f(U('uBright'), BRIGHT_AT);
    gl.uniform1f(U('uHeight'), HEIGHT);
    gl.uniform1f(U('uAmp'), AMPLITUDE);
    gl.uniform1f(U('uBlend'), BLEND);
    // brightness per card: data-glow on .aurora, otherwise 0.62 for --dim, 1 for the rest
    const glow = parseFloat(host.dataset.glow) || (host.classList.contains('aurora--dim') ? 0.62 : 1);
    gl.uniform1f(U('uGlow'), glow);

    host.appendChild(canvas);
    host.classList.add('aurora--gl');

    // render at reduced resolution — the glow is soft anyway, so this stays cheap
    const resize = () => {
      const narrow = host.clientWidth < 700;
      const scale = Math.min(window.devicePixelRatio || 1, narrow ? 2 : 1.5) * (narrow ? 0.9 : 0.6);
      const w = Math.max(1, Math.round(host.clientWidth * scale));
      const h = Math.max(1, Math.round(host.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.cssW, host.clientWidth);
    };

    // cursor: tracked over the whole card, smoothed every frame
    const card = host.parentElement;
    const m = { x: 0.35, y: 0.3, tx: 0.35, ty: 0.3, s: 0, ts: 0 };
    card.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      m.tx = (e.clientX - r.left) / r.width;
      m.ty = 1 - (e.clientY - r.top) / r.height;
      m.ts = 1;
    });
    card.addEventListener('pointerleave', () => { m.ts = 0; });

    let running = false;
    let last = performance.now();
    let time = Math.random() * 100;

    const draw = () => {
      resize();
      gl.uniform1f(u.time, time);
      gl.uniform2f(u.mouse, m.x, m.y);
      gl.uniform1f(u.mouseStr, m.s);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const frame = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt * SPEED;
      m.x += (m.tx - m.x) * 0.06;
      m.y += (m.ty - m.y) * 0.06;
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
})();
