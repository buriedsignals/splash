/* ===========================================================================
 * WORD — the wordmark, displaced.
 *
 * The letters are not moved one by one: the whole word is composed once into a
 * texture and RESAMPLED along a displacement field. That is the only way the
 * deformation can live inside a glyph — bending a stem, stretching a bowl —
 * rather than nudging six boxes around.
 *
 * The chromatic aberration is not a separate effect laid on top: the texture is
 * read three times, one per channel, at three lengths along that same field.
 * Where the field is null the three reads coincide and the letter is clean ink;
 * where it is strong they separate and the edge fringes. The colour is the
 * deformation, seen.
 * ======================================================================== */

Stage.register(
  (() => {
    let gl, prog, u, vao, tex, mark, track;
    let tw = 0,
      th = 0,
      padY = 0;
    const bg = [1.0, 1.0, 1.0];
    const ink = [0.078, 0.078, 0.11]; // #14141c

    /* Les réglages de l'effet, en un seul endroit : le panneau les écrit, la
     * frame les lit. Les longueurs sont en pixels CSS — elles sont multipliées
     * par la densité au moment de partir au shader, sinon l'effet changerait
     * de taille d'un écran à l'autre. */
    const P = {
      lens: 210, // rayon de la lentille
      pull: 54, // ce qu'elle déplace
      rad: 0.55, // l'aspiration vers le curseur
      swirl: 0.34, // la rotation autour
      flow: 0.8, // le courant qui casse en filaments
      grain: 0.0022, // la maille du courant
      tail: 0.22, // la traîne large
      speed: 0.45, // le tempo
      amb: 2.2, // la houle de repos
      split: 1.0, // l'écart des trois encres
      warm: 0.45, // le temps qu'il met à venir, en secondes
      cool: 0.3, // et à repartir
    };
    let warm = 0; // l'avancement de cette venue, 0 à 1
    let lastSeen = -1e9;   // quand ce module a peint pour la dernière fois
    let mxp = -9999,
      myp = -9999,
      tmx = -9999,
      tmy = -9999;

    const VS = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

    const FS = `#version 300 es
precision highp float;
uniform vec2  uRes;
uniform vec4  uRect;      // le mot à l'écran : x, y, largeur, hauteur, en pixels
uniform vec2  uMouse;     // en pixels, hors cadre quand il n'y a pas de pointeur
uniform float uTime;
uniform vec3  uBG, uInk;
uniform float uLens;      // rayon de la lentille, en pixels
uniform float uPull;      // ce qu'elle tire, en pixels
uniform float uAmb;       // la houle de fond, en pixels
uniform float uTail;      // la traîne large, en part du cœur
uniform float uRad;       // l'aspiration vers le curseur
uniform float uSwirl;     // la rotation autour
uniform float uFlow;      // le courant qui casse en filaments
uniform float uGrain;     // la maille du courant : petit = large
uniform float uSpeed;     // le tempo de tout ce qui bouge
uniform float uSplit;     // l'écart des trois lectures : 0 = pas de frange
uniform float uMix;       // la venue de l'effet : 0 = encre propre, 1 = plein
uniform float uOn;        // le mot est-il rendu ici, ou encore dans le document ?
uniform sampler2D uWord;
out vec4 outColor;

/* Le fond de houle. Deux nappes croisées, lentes : le mot respire quand on ne
 * le touche pas. Elle est appliquée AVANT la séparation des canaux — donc elle
 * déplace l'encre sans jamais la franger. Au repos le mot est propre. */
vec2 swell(vec2 p){
  float t = uTime * 0.45 * uSpeed;
  return vec2(sin(p.y * 6.1 + t * 1.10) * 0.6 + sin(p.y * 11.3 - t * 0.83) * 0.4,
              sin(p.x * 4.3 - t * 0.91) * 0.5 + sin(p.x * 8.1 + t * 1.21) * 0.3);
}

/* Le courant. Un champ de vitesse à deux échelles, replié sur lui-même : la
 * grande nappe déplace la petite, ce qui suffit à faire perdre au champ toute
 * périodicité lisible. C'est lui qui fond les lettres en rubans plutôt que de
 * les gonfler — un tirage radial seul ne donne qu'une loupe. */
vec2 flow(vec2 q){
  float t = uTime * 0.8 * uSpeed;
  vec2 a = vec2(sin(q.y * 1.7 + t * 0.9), sin(q.x * 1.5 - t * 0.7));
  vec2 b = q + a * 1.3;
  return vec2(sin(b.y * 3.1 - t * 1.3) + 0.55 * sin(b.y * 6.7 + t * 0.6),
              sin(b.x * 2.7 + t * 1.1) + 0.55 * sin(b.x * 5.9 - t * 0.9)) * 0.62;
}

void main(){
  if (uOn < 0.5) { outColor = vec4(uBG, 1.0); return; }
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv = (fc - uRect.xy) / uRect.zw;

  vec2 rel = fc - uMouse;
  /* La lentille, mesurée en pixels et non en unités de texture : le mot fait
   * quatre écrans de large, une distance normalisée l'écraserait en ellipse.
   * Deux nappes : un cœur serré qui fond, une traîne large qui tire. */
  float r2 = dot(rel, rel);
  float g  = exp(-r2 / (uLens * uLens));
  float gw = exp(-r2 / (uLens * uLens * 4.0));
  float m  = g + gw * uTail;

  vec2 dir = rel / max(length(rel), 1.0);
  vec2 tng = vec2(-dir.y, dir.x);

  /* aspiration + rotation + courant : la matière tombe vers le curseur, tourne
   * autour, et le courant la casse en filaments pendant qu'elle y va. */
  /* uMix porte toute la déformation du curseur, donc aussi la frange : elle
   * n'existe que là où les trois lectures divergent. L'effet ne s'allume pas,
   * il vient. */
  m *= uMix;
  vec2 d = -dir * m * uPull * uRad;
  d += tng * m * uPull * uSwirl * sin(uTime * 0.9 * uSpeed + length(rel) * 0.006);
  d += flow(fc * uGrain) * m * uPull * uFlow;

  /* La houle : commune aux trois canaux, donc invisible en couleur. */
  vec2 amb = swell(uv) * uAmb;

  vec2 base = vec2(amb.x / uRect.z, amb.y / uRect.w);
  vec2 off  = vec2(d.x   / uRect.z, d.y   / uRect.w);

  /* Trois lectures, trois longueurs le long du MÊME vecteur. La frange n'a
   * donc pas de direction propre : elle suit la déformation, et disparaît
   * exactement là où celle-ci s'annule. */
  float aR = texture(uWord, uv + base + off).a;
  float aG = texture(uWord, uv + base + off * (1.0 - 0.26 * uSplit)).a;
  float aB = texture(uWord, uv + base + off * (1.0 - 0.52 * uSplit)).a;

  vec3 col = vec3(mix(uBG.r, uInk.r, aR),
                  mix(uBG.g, uInk.g, aG),
                  mix(uBG.b, uInk.b, aB));
  outColor = vec4(col, 1.0);
}`;

    /* Le mot, composé une fois. Il est dessiné à sa taille réelle en pixels
     * d'appareil : plus petit, la lettre serait floue une fois étirée sur
     * quatre écrans ; c'est la seule chose ici qui doive rester nette. */
    function build() {
      if (!gl || !mark) return;
      const r = mark.getBoundingClientRect();
      if (r.width < 10) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const W = Math.min(4096, Math.round(r.width * dpr));
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = 8; // provisoire : il faut la fonte pour connaître la hauteur
      const g = cv.getContext("2d");
      const cs = getComputedStyle(mark);
      const scale = W / r.width;
      const font =
        cs.fontWeight +
        " " +
        parseFloat(cs.fontSize) * scale +
        "px " +
        cs.fontFamily;
      g.font = font;
      const m = g.measureText("H");
      const fh = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;

      /* La boîte de ligne du titre est plus courte que la fonte : le document
       * laisse déborder, une texture à la taille de la boîte couperait le
       * jambage du p et la hampe du l. Elle est donc plus haute que le mot, de
       * quoi contenir la fonte entière plus la marge où la déformation va
       * puiser — et le cadre passé au fragment est agrandi d'autant. */
      padY = Math.max(0, (fh / scale - r.height) / 2) + r.height * 0.06;
      const H = Math.min(2048, Math.round((r.height + 2 * padY) * scale));
      cv.height = H; // remet le contexte à zéro : la fonte est reposée après
      g.font = font;
      g.textBaseline = "alphabetic";
      g.fillStyle = "#fff";
      /* La ligne de base, demandée au document plutôt que recalculée : les
       * métriques de la fonte au canevas ne sont pas celles que le navigateur
       * a utilisées pour poser la boîte de ligne, et le mot tombait quarante
       * pixels trop bas au relais. Une cale de hauteur nulle alignée sur la
       * base donne la position exacte, à l'endroit exact. */
      const groups = mark.querySelectorAll(".pg");
      let baseY = 0;
      const shim = document.createElement("i");
      shim.style.cssText =
        "display:inline-block;width:0;height:0;vertical-align:baseline";
      (groups[0] || mark).appendChild(shim);
      baseY = shim.getBoundingClientRect().top;
      shim.remove();
      // hors du cadre, la cale peut donner une base négative : elle reste bonne
      const ok = Math.abs(baseY - r.top) < r.height * 4;
      const base = ok
        ? (baseY - (r.top - padY)) * scale
        : padY * scale + (r.height * scale - fh) / 2 + m.fontBoundingBoxAscent;

      /* Une lettre du titre n'est pas un caractère : c'est un groupe de quatre
       * encres superposées, cyan, magenta, jaune et noire. Lire textContent
       * rend donc chaque glyphe quatre fois — d'où le mot bégayé. On lit les
       * groupes, une encre par groupe, et on les pose là où la mise en page les
       * a mis : le crénage négatif du titre est alors celui du navigateur, et
       * non celui, différent, que le canevas recalculerait. */
      if (groups.length) {
        for (const gp of groups) {
          const ink = gp.querySelector(".k") || gp;
          const gr = gp.getBoundingClientRect();
          g.fillText(ink.textContent, (gr.left - r.left) * scale, base);
        }
      } else {
        const tr = (parseFloat(cs.letterSpacing) || 0) * scale;
        let x = 0;
        for (const c of [...(mark.textContent || "").trim()]) {
          g.fillText(c, x, base);
          x += g.measureText(c).width + tr;
        }
      }

      tex = tex || gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      tw = W;
      th = H;
    }

    return {
      name: "word",
      section: "#hsec",
      field: bg,

      init(a) {
        gl = a.gl;
        mark = document.querySelector(".pmark");
        track = document.getElementById("htrack");
        prog = a.program(VS, FS);
        u = a.uniforms(prog, [
          "uRes",
          "uRect",
          "uMouse",
          "uTime",
          "uBG",
          "uInk",
          "uLens",
          "uPull",
          "uAmb",
          "uTail",
          "uRad",
          "uSwirl",
          "uFlow",
          "uGrain",
          "uSpeed",
          "uSplit",
          "uMix",
          "uOn",
          "uWord",
        ]);
        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW,
        );
        const al = gl.getAttribLocation(prog, "p");
        gl.enableVertexAttribArray(al);
        gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        addEventListener(
          "pointermove",
          (e) => {
            tmx = e.clientX;
            tmy = e.clientY;
          },
          { passive: true },
        );
        addEventListener(
          "pointerleave",
          () => {
            tmx = -9999;
            tmy = -9999;
          },
          { passive: true },
        );

        build();
        if (document.fonts && document.fonts.ready)
          document.fonts.ready.then(build);
        window.__word = P;
      },

      resize() {
        build();
      },

      frame(ctx) {
        if (!tex || !mark) return;
        // le curseur est suivi avec de l'inertie : au pixel près, la coulée
        // saccade au rythme des événements plutôt qu'à celui de l'écran
        if (mxp < -9000) {
          mxp = tmx;
          myp = tmy;
        }
        mxp += (tmx - mxp) * 0.14;
        myp += (tmy - myp) * 0.14;

        const r = mark.getBoundingClientRect();
        const d = ctx.dpr;
        gl.useProgram(prog);
        gl.bindVertexArray(vao);
        gl.disable(gl.BLEND);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(u.uWord, 0);
        gl.uniform2f(u.uRes, ctx.w * d, ctx.h * d);
        gl.uniform4f(
          u.uRect,
          r.left * d,
          (r.top - padY) * d,
          r.width * d,
          (r.height + 2 * padY) * d,
        );
        gl.uniform2f(u.uMouse, mxp * d, myp * d);
        gl.uniform1f(u.uTime, ctx.t);
        gl.uniform3f(u.uBG, bg[0], bg[1], bg[2]);
        gl.uniform3f(u.uInk, ink[0], ink[1], ink[2]);
        gl.uniform1f(u.uLens, P.lens * d);
        gl.uniform1f(u.uPull, P.pull * d);
        gl.uniform1f(u.uAmb, P.amb * d);
        gl.uniform1f(u.uTail, P.tail);
        gl.uniform1f(u.uRad, P.rad);
        gl.uniform1f(u.uSwirl, P.swirl);
        gl.uniform1f(u.uFlow, P.flow);
        gl.uniform1f(u.uGrain, P.grain / d); // la maille est en pixels CSS
        gl.uniform1f(u.uSpeed, P.speed);
        gl.uniform1f(u.uSplit, P.split);

        /* La venue de l'effet. Le mot est repris au document encre propre
         * contre encre propre — c'est ce qui rend le relais invisible — puis
         * la déformation monte en quelques centaines de millisecondes. Le
         * relais et l'effet ne tombent donc pas sur la même frame, et il n'y a
         * rien qui s'allume à la fin de l'animation d'entrée.
         *
         * Elle repart de la même façon : le module garde le cadre le temps que
         * la déformation retombe, même quand le document a repris la main. */
        /* Deux choses distinctes, et les confondre laisse un trou.
         *
         * printed : le document ne dessine pas le mot (.done le met à zéro),
         * donc le module DOIT le rendre — sans quoi il n'y a plus de mot du
         * tout, et c'est la frame blanche.
         *
         * done : l'effet doit-il monter. La page le coupe en avance, par
         * __wordOut, pour que la déformation retombe pendant que le mot est
         * encore au module. L'un s'éteint donc bien avant l'autre. */
        const printed = mark.classList.contains("done");
        const done = printed && !window.__wordOut;

        /* La venue de l'effet repart de ZÉRO après une absence. Ce module ne
         * tourne que quand il tient le canevas partagé ; pendant qu'un autre
         * l'a — le temps d'un rideau entre deux sections, par exemple — sa
         * frame n'est pas appelée et son compteur reste où il en était. Au
         * retour, il était donc déjà à fond : l'aberration réapparaissait d'un
         * coup au lieu de monter.
         *
         * L'absence se lit sur l'horloge de la scène, qui, elle, avance
         * toujours : un écart bien plus grand qu'une image veut dire qu'on
         * n'était pas là. */
        if (ctx.t - lastSeen > 0.25) warm = 0;
        lastSeen = ctx.t;

        const rate = ctx.dt / Math.max(0.05, done ? P.warm : P.cool);
        warm = Math.max(0, Math.min(1, warm + (done ? rate : -rate)));
        const mix = warm * warm * (3 - 2 * warm);
        window.__wordMix = mix; // diagnostic : où en est la venue
        gl.uniform1f(u.uMix, mix);
        /* Tant que le mot s'imprime, c'est le document qui le dessine : c'est
         * là que vivent les encres par lettre et leur mise en registre. On ne
         * le reprend qu'une fois posé, à la même place, sans que ça se voie —
         * et on le garde le temps que la déformation retombe, sans quoi la
         * disparition n'aurait aucune durée : le cadre serait rendu au
         * document dans la frame même où l'effet est encore au plein. */
        const on = printed || warm > 0.01;
        window.__wordOn = on; // diagnostic : le module dessine-t-il le mot ?
        gl.uniform1f(u.uOn, on ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        gl.enable(gl.BLEND);
      },
    };
  })(),
);
