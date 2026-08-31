/* ===========================================================================
 * INSPIRATION — the stories orbit the title, and are drawn into it.
 *
 * Every tile travels one intake: it appears at the wide mouth close to the
 * viewer, orbits the centre, and spirals inward while receding, until it is
 * swallowed where the headline sits. Then it is recycled to the mouth. The
 * ring is squashed vertically so it fills a landscape frame, and the whole
 * funnel parallaxes with the pointer.
 *
 * Ink field, so a tile deep in the funnel genuinely sinks into it.
 * The tiles are slot frames: the gallery has no real imagery yet.
 * ======================================================================== */

Stage.register(
  (() => {
    const INK = [0.078, 0.078, 0.11];

    const TEX_W = 460;
    const TEX_H = 434; // ratio 1.06, the design system's framed stage

    const P = {
      count: 36,
      /* LA BOUCHE EST HORS CADRE, et c'est une contrainte, pas un réglage
       * d'allure. À 3,6 une grande vignette avait déjà son bord intérieur
       * dans le cadre au moment où elle apparaissait : on la voyait se
       * révéler sur place au lieu d'entrer. À 4,6 même la plus large, au plus
       * petit de ses rayons propres, est entièrement dehors — elle traverse
       * la bordure, elle n'y naît pas. */
      rMouth: 5.2, // ring radius where a tile enters, world units
      rThroat: 0.95, // radius where it is swallowed — leaves a hole open
      centerX: 0, // the funnel is centred: the title sits in its hole
      centerY: 0,
      flatten: 0.98, // 1 is a true circle; below that the ring flattens
      zMouth: -2.6, // depth at the mouth, closest to the viewer
      zThroat: -13, // depth at the throat, deep behind the title
      /* LES VIGNETTES SE DISSOLVENT EN APPROCHANT DU CENTRE, et c'est ce
       * réglage-là qui distribue le champ.
       *
       * À 0,36, une tuile disparaissait au premier tiers de l'entonnoir —
       * c'est-à-dire alors qu'elle est encore au large, contre le bord. Toutes
       * les tuiles visibles étaient donc sur le grand rayon, et le milieu du
       * cadre restait vide : ce n'était pas un trou ménagé pour le titre,
       * c'était un champ qui n'existait qu'aux angles.
       *
       * À 0,66 elles vivent les deux tiers du trajet et traversent réellement
       * le cadre. Ce qui les efface n'est plus un point du parcours mais leur
       * DISTANCE AU CENTRE : `clearFade` à 0,92 étale l'extinction depuis
       * l'anneau extérieur jusqu'au moyeu, au lieu de la concentrer sur une
       * bande étroite. Une tuile ne s'éteint pas, elle se dilue. */
      swallow: 0.66, // how far down the intake a tile survives
      clear: 0.74, // where the dissolve toward the hub begins
      clearFade: 0.95, // how much of that radius the dissolve spans
      /* CE QUI APPROCHE DU MOYEU RAPETISSE, et pas seulement par la
       * perspective. La perspective seule donne un rapport de deux à trois
       * sur le trajet visible — assez pour dire « c'est plus loin », pas
       * assez pour dire « ça s'en va ». Le retrait géométrique s'y ajoute et
       * porte le rapport à un sur six : une vignette au bord du trou est un
       * timbre, ce qui est exactement ce qu'on veut voir d'une chose sur le
       * point d'être avalée. */
      shrink: 0.74, // how much of its size a tile loses on the way in
      dim: 0.66, // every tile sits back into the ink field a little
      spin: 0.06, // orbit speed
      swirl: 4.1, // extra turns accumulated on the way in
      roll: 1, // 1 = the foot points exactly at the hub, 0 = upright
      /* LA DESCENTE. `suck` est ce qui avale au repos, `pull` ce que le
       * défilement ajoute. À 0,022 une vignette mettait une demi-minute à
       * traverser : le champ tournait, mais il n'allait nulle part. Presque
       * doublé, le trajet fait une quinzaine de secondes — assez pour qu'on
       * suive une image du bord au moyeu, assez peu pour qu'on voie que ça
       * coule. */
      suck: 0.04, // idle intake speed
      pull: 1.9, // extra intake driven by the scroll
      mouse: 0.55,
      fov: 62,
    };

    let gl, m4, plane, texFromCanvas;
    let prog, u, vao, geo;
    let tiles = [],
      textures = [],
      ratios = [],
      entryList = [];
    let mx = 0,
      my = 0,
      mtx = 0,
      mty = 0;
    let lastProg = 0,
      scrollPull = 0;
    let section = null;
    let built = false;

    /* ------------------------------------------------------------ 2D painting */
    function tracked(c, text, x, y, sp) {
      let cx = x;
      for (const ch of text) {
        c.fillText(ch, cx, y);
        cx += c.measureText(ch).width + sp;
      }
    }

    /** The empty state: a hatched slot frame with its ratio. */
    function paintSlot(entry) {
      const cv = document.createElement("canvas");
      cv.width = TEX_W;
      cv.height = TEX_H;
      const c = cv.getContext("2d");

      /* LE MÊME ANGLE ADOUCI QUE TOUTES LES SURFACES DE LA PAGE. La texture
       * porte son alpha, donc découper le canvas suffit : le coin est rond
       * une fois la tuile posée dans la scène, sans masque supplémentaire. */
      const R = Math.round(TEX_W * 0.035);
      c.beginPath();
      c.roundRect(0, 0, TEX_W, TEX_H, R);
      c.clip();

      c.fillStyle = "#20202b";
      c.fillRect(0, 0, TEX_W, TEX_H);
      c.strokeStyle = "rgba(237,234,227,.09)";
      c.lineWidth = 1;
      for (let d = -TEX_H; d < TEX_W + TEX_H; d += 11) {
        c.beginPath();
        c.moveTo(d, 0);
        c.lineTo(d + TEX_H, TEX_H);
        c.stroke();
      }
      c.strokeStyle = "rgba(237,234,227,.46)";
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(1, 1, TEX_W - 2, TEX_H - 2, R);
      c.stroke();
      c.fillStyle = "#f2b13c";
      c.font = '500 15px "Space Grotesk", sans-serif';
      tracked(c, (entry.desk || "INFOVIZ").toUpperCase(), 20, 34, 2.2);
      c.fillStyle = "rgba(237,234,227,.55)";
      c.font = '500 14px "Space Grotesk", sans-serif';
      tracked(c, "1.06 : 1", 20, TEX_H - 42, 2.2);
      return cv;
    }

    /** A real story, drawn whole at its own aspect — never cropped to a frame. */
    function paintStory(img, entry) {
      const W = 560;
      const ratio = (entry.w && entry.h ? entry.w / entry.h : img.width / img.height) || 1;
      const H = Math.round(W / ratio);
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const c = cv.getContext("2d");
      const TEX_W = W, TEX_H = H;

      const R = Math.round(TEX_W * 0.035);
      c.beginPath();
      c.roundRect(0, 0, TEX_W, TEX_H, R);
      c.clip();

      c.fillStyle = "#14141c";
      c.fillRect(0, 0, TEX_W, TEX_H);

      c.drawImage(img, 0, 0, TEX_W, TEX_H);

      // Caption only when there is something to say: these entries carry no
      // title or source, and an empty gradient band on every tile reads as a
      // rendering fault rather than a design.
      const hasText = (entry.source || "").trim() || (entry.title || "").trim();
      if (hasText) {
        const band = 78;
        const g = c.createLinearGradient(0, TEX_H - band * 1.7, 0, TEX_H);
        g.addColorStop(0, "rgba(20,20,28,0)");
        g.addColorStop(1, "rgba(20,20,28,.92)");
        c.fillStyle = g;
        c.fillRect(0, TEX_H - band * 1.7, TEX_W, band * 1.7);

        c.fillStyle = "#f2b13c";
        c.font = '500 14px "Space Grotesk", sans-serif';
        tracked(c, (entry.source || "").toUpperCase(), 18, TEX_H - 44, 2);

        c.fillStyle = "#edeae3";
        c.font = '500 19px "Space Grotesk", sans-serif';
        const words = String(entry.title || "").split(/\s+/);
        let line = "";
        for (const w of words) {
          const test = line ? line + " " + w : w;
          if (c.measureText(test).width > TEX_W - 36) break;
          line = test;
        }
        c.fillText(
          line + (line.length < (entry.title || "").length ? "…" : ""),
          18,
          TEX_H - 18,
        );
      }

      c.strokeStyle = "rgba(237,234,227,.22)";
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(1, 1, TEX_W - 2, TEX_H - 2, R);
      c.stroke();
      return cv;
    }

    /* ------------------------------------------------- deterministic seeding */
    function hash(n) {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    }

    function seed(n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({
          // u is where the tile sits along the intake: 0 at the mouth, 1 at the
          // throat. Spreading the seeds evenly keeps the stream continuous.
          u: (i + hash(i * 5 + 1) * 0.6) / n,
          angle: hash(i * 5 + 2) * 6.283,
          scale: 0.5 + hash(i * 5 + 3) * 0.86,
          lean: (hash(i * 5 + 4) * 2 - 1) * 0.5,
          /* SON PROPRE RAYON. Les places sont réparties régulièrement le long
           * de l'admission — c'est ce qui garde le flux continu — mais du
           * coup deux tuiles voisines dans la file se retrouvaient au même
           * rayon, et l'anneau se lisait comme un empilement. Ce facteur
           * ouvre l'anneau en BANDE : à distance égale du goulot, deux tuiles
           * ne sont plus au même endroit. */
          rj: 0.62 + hash(i * 5 + 6) * 0.78,
          tex: i % Math.max(1, textures.length),
        });
      }
      return out;
    }

    /* ---------------------------------------------------------------- shaders */
    const VS = `#version 300 es
  precision highp float;
  in vec3 aPos; in vec2 aUv;
  uniform mat4  uProj;
  uniform vec2  uSize;
  uniform vec3  uPos;
  uniform float uTurn;
  uniform float uRoll;
  out vec2 vUv;
  void main() {
    vUv = aUv;
    // le ROULIS, dans le plan de la tuile : elle tourne avec l'orbite au lieu
    // de rester d'aplomb comme une pancarte. uTurn, lui, est un lacet — il
    // oriente la tuile dans la profondeur, pas dans son propre plan.
    vec2 f = vec2(aPos.x * uSize.x, aPos.y * uSize.y);
    float rc = cos(uRoll), rs = sin(uRoll);
    f = vec2(f.x * rc - f.y * rs, f.x * rs + f.y * rc);
    vec3 local = vec3(f, 0.0);
    float c = cos(uTurn), s = sin(uTurn);
    vec3 turned = vec3(local.x * c, local.y, -local.x * s);
    gl_Position = uProj * vec4(turned + uPos, 1.0);
  }`;

    const FS = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform sampler2D uTex;
  uniform float uAlpha, uDim;
  out vec4 outColor;
  void main() {
    vec4 t = texture(uTex, vUv);
    // held back from full brightness so the ring reads as a ground the
    // headline sits on, not as a wall of competing pictures
    outColor = vec4(t.rgb * uDim, t.a * uAlpha);
  }`;

    /* -------------------------------------------------------------- lifecycle */
    return {
      name: "inspiration",
      section: "#inspiration",
      field: INK,

      /* LE MODULE RÉCLAME LE CANEVAS PENDANT LE RIDEAU. Sans ça l'arbitrage de
       * la scène ne le lui donne qu'aux quatre cinquièmes du trajet, et le
       * champ arrive d'un bloc à la fin : on découvre une section vide, puis
       * elle se remplit. Ce qu'on veut découvrir, c'est une section qui
       * tournait déjà. */
      hold: () => !!window.__insHold,

      init(api) {
        gl = api.gl;
        m4 = api.m4;
        plane = api.plane;
        texFromCanvas = api.texFromCanvas;

        prog = api.program(VS, FS);
        u = api.uniforms(prog, ["uProj", "uSize", "uPos", "uTurn", "uRoll", "uTex", "uAlpha", "uDim"]);

        geo = plane(1, 1);
        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const pb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pb);
        gl.bufferData(gl.ARRAY_BUFFER, geo.pos, gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(prog, "aPos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
        const ub = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ub);
        gl.bufferData(gl.ARRAY_BUFFER, geo.uv, gl.STATIC_DRAW);
        const aUv = gl.getAttribLocation(prog, "aUv");
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
        const ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);
        gl.bindVertexArray(null);

        section = document.querySelector("#inspiration");

        addEventListener("pointermove", (e) => {
          mtx = (e.clientX / innerWidth) * 2 - 1;
          mty = (e.clientY / innerHeight) * 2 - 1;
        });
        addEventListener("pointerleave", () => {
          mtx = 0;
          mty = 0;
        });

        const build = () => {
          const real = window.__infoviz || [];
          const fallback = (window.__data && window.__data.GALLERY) || [{}];
          const src = real.length ? real : fallback;

          // slot frames first so the ring is never empty, then swap each one
          // for its thumbnail as it arrives
          textures = src.map((e) => texFromCanvas(paintSlot(e)));
          entryList = src;
          ratios = src.map((e) => (e.w && e.h ? e.w / e.h : TEX_W / TEX_H));
          real.forEach((entry, i) => {
            const source = entry.src || entry.file;
            if (!source) return;
            const img = new Image();
            img.onload = () => {
              textures[i] = texFromCanvas(paintStory(img, entry));
              ratios[i] = entry.w && entry.h ? entry.w / entry.h : img.width / img.height;
            };
            img.onerror = () => {};
            /* SANS CECI, RIEN NE S'AFFICHE. La vignette est peinte dans un
             * canvas avant d'en faire une texture ; une image d'un autre
             * domaine SOUILLE ce canvas, et `texImage2D` refuse alors de le
             * lire. On ne voyait que les cadres d'attente. Le stockage répond
             * `access-control-allow-origin: *`, donc la demande explicite
             * suffit — et elle doit précéder l'affectation de la source. */
            img.crossOrigin = "anonymous";
            img.src = source;
          });
          tiles = seed(P.count);
          built = true;

          const strip = section.querySelector('[style*="translate3d"]');
          if (strip) strip.classList.add("gl-replaced");
          section.classList.add("gl-field");

          // The headline belongs in the middle of the ring, not in the flow.
          // The sticky frame is a positioned element, so an absolute child
          // centres on it without disturbing the rubric or the thanks.
          if (!document.getElementById("gl-orbit-css")) {
            const st = document.createElement("style");
            st.id = "gl-orbit-css";
            st.textContent =
              ".gl-orbit-centre{position:absolute!important;inset:0;display:grid!important;" +
              "place-content:center;justify-items:center;text-align:center;gap:16px;" +
              "padding:0 26px;pointer-events:none}" +
              ".gl-orbit-centre h2{font-size:clamp(30px,5.4vw,76px);max-width:15ch}" +
              ".gl-orbit-centre p{max-width:46ch}" +
              // the headline left the flow, so the sticky grid has one row too
              // many and the thanks would climb into the gap
              ".gl-orbit-frame{grid-template-rows:auto minmax(0,1fr) auto!important}";
            document.head.appendChild(st);
          }
          const sticky = section.querySelector('[style*="sticky"]');
          const headline = sticky && sticky.children[1];
          if (headline) headline.classList.add("gl-orbit-centre");
          if (sticky) sticky.classList.add("gl-orbit-frame");
        };
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(build).catch(build);
        } else build();

        this.resize(innerWidth, innerHeight);
      },

      resize(w, h) {
        /* L'ANNEAU SUIT LE FORMAT DU CADRE. `flatten` est réglé pour un cadre
         * couché : il écrase le cercle pour qu'il remplisse la largeur. Sur un
         * téléphone en portrait c'est l'inverse qu'il faut — un cercle projeté
         * dans un cadre debout sort par la gauche et la droite, et il ne reste
         * plus rien en haut ni en bas. On l'étire donc du rapport du cadre,
         * plafonné : au-delà, les vignettes du haut et du bas passent si loin
         * qu'elles ne traversent plus. */
        this.flat = P.flatten * (w >= h ? 1 : Math.min(2.1, (h / w) * 0.9));
        const fov = (P.fov * Math.PI) / 180;
        this.persp = m4.perspective(fov, w / h, 0.1, 60);
        this.tan = Math.tan(fov / 2);
        this.aspect = w / h;
        this.unit = 2 * 3 * Math.tan(fov / 2) * 0.3;
        this.aspect = w / h;
      },

      frame(ctx) {
        if (!built || !tiles.length) return;

        /* LA COUPE. Pendant le rideau, la MÊME ligne sépare le document et le
         * canevas : au-dessus, la section qu'on quitte et son papier ; en
         * dessous, l'encre et le champ. Le ciseau s'en charge pour les deux —
         * il repeint le haut en papier, puis il borne le dessin des tuiles au
         * bas. Un shader de fond aurait fait le même travail pour un programme
         * de plus ; ici il n'y a rien à compiler.
         *
         * Le papier est celui du module d'à côté, à la virgule près : c'est le
         * sol de la section des outils, et un raccord de deux teintes voisines
         * se voit davantage qu'un raccord franc. */
        const cut = window.__insCut || 0;
        const W = Math.round(ctx.w * ctx.dpr);
        const H = Math.round(ctx.h * ctx.dpr);
        const c = Math.min(H, Math.round(cut * ctx.dpr));
        if (c > 1) {
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(0, H - c, W, c);
          gl.clearColor(0.929, 0.918, 0.89, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.scissor(0, 0, W, Math.max(0, H - c));
        }

        mx += (mtx - mx) * 0.05;
        my += (mty - my) * 0.05;

        // scrolling shoves the whole stream further down the intake
        const d = ctx.prog - lastProg;
        lastProg = ctx.prog;
        scrollPull += d * P.pull;

        const proj = m4.mul(
          this.persp,
          m4.translate(-mx * P.mouse, my * P.mouse * 0.5, 0),
        );

        gl.bindVertexArray(vao);
        gl.useProgram(prog);
        gl.uniformMatrix4fv(u.uProj, false, proj);
        gl.uniform1i(u.uTex, 0);
        gl.uniform1f(u.uDim, P.dim);
        gl.activeTexture(gl.TEXTURE0);
        gl.disable(gl.DEPTH_TEST);

        const t = ctx.t;
        const list = [];
        for (const tile of tiles) {
          // where it is along the intake, wrapped so the stream never runs out
          let uu = (tile.u + t * P.suck + scrollPull) % 1;
          if (uu < 0) uu += 1;

          // ease so tiles crowd near the throat, the way a vortex tightens
          const e = uu * uu;
          const r = (P.rMouth + (P.rThroat - P.rMouth) * e) * tile.rj;
          const z = P.zMouth + (P.zThroat - P.zMouth) * e;
          const a = tile.angle + t * P.spin + uu * P.swirl;

          const x = Math.cos(a) * r + P.centerX;
          const y = Math.sin(a) * r * this.flat + P.centerY;

          // billboards in depth: never yawed, always square to the camera
          const turn = 0;

          /* LE BAS DE L'IMAGE VISE LE CENTRE DE L'ORBITE. Ce n'est pas une
           * inclinaison décorative : c'est une contrainte géométrique, et elle
           * se résout exactement.
           *
           * Le bas de la tuile, une fois roulée de θ, pointe vers
           * (sin θ, −cos θ). On veut qu'il pointe vers le centre, c'est-à-dire
           * à l'opposé de la position de la tuile — donc vers
           * −(cos a, sin a · flatten). Égaler les deux donne
           * θ = atan2(−cos a, sin a · flatten), et c'est tout.
           *
           * Le `flatten` est DANS le calcul, pas négligé : sur une ellipse la
           * direction du centre n'est pas la normale au cercle, et un anneau
           * écrasé ferait pointer les tuiles à côté du trou.
           *
           * Ce que ça produit : en haut de l'anneau l'image est d'aplomb, sur
           * les côtés elle est couchée, en bas elle est renversée. C'est
           * l'orientation d'une roue — et une roue, ça se regarde tourner. */
          const roll =
            Math.atan2(-Math.cos(a), Math.sin(a) * this.flat) * P.roll;

          // fade in at the mouth, and out as it is swallowed
          // swallowed well before the axis, so a hole stays open on the title
          /* Le fondu d'entrée est court exprès : il ne sert plus qu'à couvrir
           * l'image du recyclage, puisque la bouche est hors champ. Étalé, il
           * se serait vu à l'intérieur du cadre. */
          const alpha =
            Math.min(1, uu / 0.03) *
            Math.max(0, 1 - Math.max(0, (uu - P.swallow) / (1 - P.swallow)));

          // Screen-space clearance: a tile whose projection lands near the
          // middle of the frame gives way, so the headline in the hole stays
          // readable whatever the funnel is set to.
          const d = Math.max(1e-3, -z);
          const sx = x / d / this.tan / this.aspect;
          const sy = y / d / this.tan;
          const rad = Math.sqrt(sx * sx + sy * sy);
          const inner = P.clear * (1 - P.clearFade);
          const room =
            rad <= inner
              ? 0
              : rad >= P.clear
                ? 1
                : (rad - inner) / Math.max(1e-4, P.clear - inner);

          list.push({
            x, y, z, turn, roll,
            alpha: alpha * room,
            scale: tile.scale * (1 - P.shrink * e),
            tex: tile.tex,
          });
        }
        // no depth test: deepest in the funnel first
        list.sort((a, b) => a.z - b.z);

        for (const p of list) {
          if (p.alpha <= 0.002) continue;
          gl.bindTexture(gl.TEXTURE_2D, textures[p.tex]);
          const ratio = ratios[p.tex] || TEX_W / TEX_H;
          gl.uniform2f(u.uSize, this.unit * p.scale * ratio, this.unit * p.scale);
          gl.uniform3f(u.uPos, p.x, p.y, p.z);
          gl.uniform1f(u.uTurn, p.turn);
          gl.uniform1f(u.uRoll, p.roll);
          gl.uniform1f(u.uAlpha, p.alpha * ctx.vis);
          gl.drawElements(gl.TRIANGLES, geo.count, gl.UNSIGNED_SHORT, 0);
        }
        if (c > 1) gl.disable(gl.SCISSOR_TEST);
        gl.bindVertexArray(null);
      },
    };
  })(),
);
