/* ===========================================================================
 * STAGE — one shared WebGL2 canvas for every scene on the page.
 *
 * Browsers cap the number of live WebGL contexts, so all modules draw into a
 * single fixed canvas sitting behind the document. A module owns one section:
 * while that section is pinned, the canvas paints its field colour and the
 * module draws. Elsewhere the canvas is transparent and the opaque sections
 * scroll over it.
 *
 * No library. Raw WebGL2 plus the four matrix helpers we actually need.
 * ======================================================================== */

const Stage = (() => {
  const errors = (window.__stageErrors = []);
  const note = (where, e) => {
    errors.push(where + ": " + (e && e.message ? e.message : String(e)));
    console.error("[stage]", where, e);
  };

  const modules = [];
  let canvas,
    gl,
    W = 0,
    H = 0,
    DPR = 1;
  let last = 0,
    time = 0,
    started = false;

  /* ---------------------------------------------------------- mat4 helpers */
  const m4 = {
    ident: () =>
      new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    perspective(fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
      return new Float32Array([
        f / aspect,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (far + near) * nf,
        -1,
        0,
        0,
        2 * far * near * nf,
        0,
      ]);
    },
    rotX(a) {
      const c = Math.cos(a),
        s = Math.sin(a);
      return new Float32Array([
        1,
        0,
        0,
        0,
        0,
        c,
        s,
        0,
        0,
        -s,
        c,
        0,
        0,
        0,
        0,
        1,
      ]);
    },
    translate(x, y, z) {
      const m = m4.ident();
      m[12] = x;
      m[13] = y;
      m[14] = z;
      return m;
    },
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++) {
          let s = 0;
          for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
          o[c * 4 + r] = s;
        }
      return o;
    },
  };

  /* ------------------------------------------------------------- gl helpers */
  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      note("shader", new Error(gl.getShaderInfoLog(s)));
    }
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      note("link", new Error(gl.getProgramInfoLog(p)));
    return p;
  }
  function uniforms(p, names) {
    const u = {};
    for (const n of names) u[n] = gl.getUniformLocation(p, n);
    return u;
  }
  /** A subdivided unit plane, centred, spanning -0.5..0.5 on both axes. */
  function plane(cols, rows) {
    const pos = [],
      uv = [],
      idx = [];
    for (let y = 0; y <= rows; y++)
      for (let x = 0; x <= cols; x++) {
        const u = x / cols,
          v = y / rows;
        pos.push(u - 0.5, 0.5 - v, 0);
        uv.push(u, v);
      }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const a = y * (cols + 1) + x,
          b = a + 1,
          c = a + cols + 1,
          d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    return {
      pos: new Float32Array(pos),
      uv: new Float32Array(uv),
      idx: new Uint16Array(idx),
      count: idx.length,
    };
  }
  function texFromCanvas(c) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    if (aniso) {
      gl.texParameterf(
        gl.TEXTURE_2D,
        aniso.TEXTURE_MAX_ANISOTROPY_EXT,
        Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)),
      );
    }
    return t;
  }

  /* ------------------------------------------------------------------ meter
   * A stats.js-shaped readout, written out rather than pulled in: the page has
   * to stay a single file with no CDN, and the panel is four numbers and a bar
   * graph. Off unless asked for — "?stats" in the URL, or the S key.
   */
  const meter = (() => {
    let box,
      num,
      gfx,
      on = false,
      w = 78,
      h = 30;
    let frames = 0,
      acc = 0,
      worst = 0,
      cost = 0,
      since = 0;
    const bars = new Array(w).fill(0);

    function build() {
      box = document.createElement("div");
      box.style.cssText =
        "position:fixed;left:8px;bottom:8px;z-index:99999;padding:6px 7px 5px;" +
        "background:rgba(12,12,16,.86);border:1px solid rgba(255,255,255,.14);" +
        "font:600 10px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace;" +
        "color:#8de08d;letter-spacing:.04em;pointer-events:none;" +
        "-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)";
      num = document.createElement("div");
      gfx = document.createElement("canvas");
      gfx.width = w * 2;
      gfx.height = h * 2;
      gfx.style.cssText = `display:block;width:${w}px;height:${h}px;margin-top:4px`;
      box.appendChild(num);
      box.appendChild(gfx);
      document.body.appendChild(box);
    }

    function paint(fps, ms) {
      // the active module may name the path it is on, so a slow frame can be
      // pinned to a phase instead of guessed at
      const tag = window.__glPath ? "  " + window.__glPath : "";
      num.textContent = `${fps} FPS  ${ms.toFixed(1)} MS${tag}`;
      num.style.color =
        fps >= 50 ? "#8de08d" : fps >= 30 ? "#e8c86a" : "#e88080";
      const c = gfx.getContext("2d");
      c.setTransform(2, 0, 0, 2, 0, 0);
      c.clearRect(0, 0, w, h);
      c.fillStyle = "rgba(255,255,255,.07)";
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < w; i++) {
        const v = Math.min(1, bars[i] / 70); // 70 fps full scale
        if (!bars[i]) continue;
        c.fillStyle =
          bars[i] >= 50 ? "#8de08d" : bars[i] >= 30 ? "#e8c86a" : "#e88080";
        c.fillRect(i, h - v * h, 1, v * h);
      }
    }

    return {
      toggle(force) {
        on = force === undefined ? !on : force;
        if (on && !box) build();
        if (box) box.style.display = on ? "block" : "none";
      },
      // dt is the real frame interval; ms is what the active module cost us
      tick(dt, ms) {
        if (!on) return;
        frames++;
        acc += dt;
        worst = Math.max(worst, ms);
        if (acc < 0.5) return;
        const fps = Math.round(frames / acc);
        bars.shift();
        bars.push(fps);
        cost = worst;
        paint(fps, cost);
        frames = 0;
        acc = 0;
        worst = 0;
      },
    };
  })();

  /* -------------------------------------------------------------- lifecycle */
  function boot() {
    if (started) return;
    canvas = document.createElement("canvas");
    canvas.id = "stage";
    canvas.style.cssText =
      "position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;transition:opacity .35s ease";
    document.body.insertBefore(canvas, document.body.firstChild);

    gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!gl) {
      console.warn("[stage] no webgl2 — DOM fallback stays visible");
      return;
    }

    started = true;
    resize();
    addEventListener("resize", resize);

    const api = { gl, m4, program, uniforms, plane, texFromCanvas, canvas };
    for (const mod of modules) {
      try {
        mod.init(api);
        mod.ready = true;
      } catch (e) {
        note("init:" + mod.name, e);
        mod.ready = false;
      }
    }
    if (/[?&]stats\b/.test(location.search)) meter.toggle(true);
    addEventListener("keydown", (e) => {
      if (e.key === "s" || e.key === "S") meter.toggle();
    });

    requestAnimationFrame(frame);
  }

  /* La largeur de la zone où le contenu vit — SANS la barre de défilement.
   *
   * innerWidth l'inclut, clientWidth non. Le canvas était dimensionné sur
   * innerWidth et le DOM se met en page dans clientWidth : les deux n'avaient
   * donc pas le même centre, et tout ce qu'une scène centre se retrouvait
   * décalé d'une demi-barre — sept ou huit pixels, invisibles seuls, mais
   * flagrants dès qu'un titre centré passe devant une grille centrée.
   *
   * Le défaut ne se voyait sur aucune capture : le navigateur sans interface
   * tourne avec --hide-scrollbars, donc la barre y fait zéro pixel. */
  const viewW = () =>
    (document.documentElement && document.documentElement.clientWidth) ||
    innerWidth;

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    const vw = viewW();
    W = Math.round(vw * DPR);
    H = Math.round(innerHeight * DPR);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = vw + "px";
    canvas.style.height = innerHeight + "px";
    gl.viewport(0, 0, W, H);
    for (const mod of modules)
      if (mod.ready && mod.resize) mod.resize(vw, innerHeight);
  }

  /** Progress through a tall pinned section, and how much of it we can see. */
  function measure(el) {
    const r = el.getBoundingClientRect();
    const vh = innerHeight;
    const span = el.offsetHeight - vh;
    // share of the viewport the section actually occupies. vis alone saturates
    // at 1 for every section in view at once, and the tie then goes to
    // whichever registered first — which let a one-screen section keep the
    // canvas while the next section already covered most of the window.
    const cover = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)) / vh;
    const prog = span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 0;
    // fully visible while the sticky child is pinned, fading over the last 8vh
    const fade = vh * 0.08;
    let vis = 0;
    if (r.top < vh && r.bottom > 0) {
      vis = Math.min(
        1,
        Math.min(vh - r.top, r.bottom) / fade,
        Math.max(0, Math.min(-r.top + span + vh, vh)) / fade,
      );
      vis = Math.max(0, Math.min(1, vis));
    }
    return { prog, vis, cover };
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;

    let active = null,
      best = 0,
      held = null;
    for (const mod of modules) {
      if (!mod.ready) continue;
      mod.el = mod.el || document.querySelector(mod.section);
      if (!mod.el) continue;
      const m = measure(mod.el);
      mod.prog = m.prog;
      mod.vis = m.vis;
      mod.cover = m.cover;
      // A scene may be mid-transition into the section that is taking the
      // frame from it. Coverage cannot know that: it hands the canvas over on
      // geometry alone, the transition stops receiving frames, and what the
      // reader sees is the destination appearing rather than the passage.
      if (mod.hold && mod.hold()) held = mod;
      const score = m.vis * m.cover;
      if (score > best) {
        best = score;
        active = mod;
      }
    }
    if (held) {
      active = held;
      best = Math.max(best, 1);
    }

    canvas.style.opacity = best > 0 ? "1" : "0";

    /* Diagnostic. Which module owns the canvas, and a frame counter — the one
     * distinction that separates "the loop has stopped" from "the loop is fine
     * and the scroll is locked". They need opposite fixes.
     */
    window.__frames = (window.__frames || 0) + 1;
    window.__active = active ? active.name : null;
    window.__cover = best.toFixed(3);

    if (active) {
      const [r, g, b] = active.field;
      gl.clearColor(r, g, b, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
      );
      const t0 = performance.now();
      try {
        active.frame({
          t: time,
          dt,
          prog: active.prog,
          vis: active.vis,
          cover: active.cover,
          w: viewW(),
          h: innerHeight,
          dpr: DPR,
        });
      } catch (e) {
        note("frame:" + active.name, e);
        active.ready = false;
      }
      meter.tick(dt, performance.now() - t0);
    } else {
      meter.tick(dt, 0);
    }
    requestAnimationFrame(frame);
  }

  return {
    /** mod = { name, section, field:[r,g,b], init(api), resize(w,h), frame(ctx) } */
    register(mod) {
      modules.push(mod);
    },
    boot,
    hasGL: () => !!gl,
  };
})();
