/* ===========================================================================
 * NAPPE — le sol de la section des outils.
 *
 * Ce module ne peint qu'une chose : une nappe generative tres legere sur le
 * papier. Les objets de la section — les tuiles des outils, celles de verre,
 * le titre — sont dans le document, pas ici. La division est nette et elle est
 * voulue : le DOM porte ce qui se lit, la scene porte ce qui bouge dessous.
 *
 * C'est la meme idee que le voile des toiles d'orchestration, a l'echelle de
 * la page. Trois foyers de la palette, moyennes, qui derivent lentement. Deux
 * regles la tiennent, et ce sont celles qui avaient ete demandees pour les
 * toiles :
 *
 *   — le GRIS a le dernier mot. Ce ne sont pas des couleurs, ce sont des
 *     nuances tres legeres posees sur du papier ;
 *   — rien de colore ne touche les BORDS. Une nappe qui court jusqu'a l'arete
 *     donne une page teintee ; retenue au centre, elle reste une variation.
 *
 * Elle existe surtout pour etre vue A TRAVERS LE VERRE : les tuiles sans nom
 * de cette section sont des flous, et un flou sur un aplat ne montre rien. Il
 * faut quelque chose dessous qui change lentement de place.
 * ======================================================================== */

Stage.register(
  (() => {
    const PAPER = [0.929, 0.918, 0.89];
    const field = PAPER.slice();

    let gl, prog, u, vao;
    let mx = 0, my = 0, tx = 0, ty = 0;

    const VS = `#version 300 es
    in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

    /* Aucun accent grave, aucune apostrophe courbe, et surtout AUCUN accent
     * grave inverse dans ce texte : une seule de ces marques dans un
     * commentaire ferme le litteral JavaScript et la scene devient noire.
     * C'est arrive deux fois. */
    const FS = `#version 300 es
precision highp float;
out vec4 o;

uniform vec2  uRes;
uniform float uTime;
uniform vec3  uBG;
uniform vec2  uMouse;
uniform float uProg;

const vec3 BLUE  = vec3(0.102, 0.184, 0.984);
const vec3 AMBER = vec3(0.949, 0.694, 0.235);
const vec3 INK   = vec3(0.078, 0.078, 0.110);

vec3 tone(int i){ return i == 0 ? BLUE : (i == 1 ? AMBER : INK); }

/* La nappe : trois gaussiennes, moyenne PONDEREE. Une somme donnerait du
 * blanc la ou les trois se recouvrent ; une moyenne donne la teinte
 * dominante, ce qui est le comportement d'un degrade et non d'une lumiere. */
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

/* TROIS HORLOGES, PAS UNE.
 *
 *   — le TEMPS fait respirer la nappe quand personne ne touche a rien. Deux
 *     periodes premieres entre elles par foyer : le motif ne se repete jamais
 *     a l'echelle ou on le regarde.
 *   — le DEFILEMENT fait tourner la constellation entiere, d'un tiers de tour
 *     sur la section, et ecarte les foyers a mesure qu'on descend. C'est ce
 *     qui fait que le sol n'est pas le meme en haut et en bas de la section :
 *     il a ete traverse.
 *   — le POINTEUR pousse les foyers, chacun d'autant plus qu'il est loin du
 *     centre. Un deplacement d'ensemble se lirait comme une image qui glisse ;
 *     un deplacement par foyer deforme la nappe, ce qui est le propre d'une
 *     matiere et non d'un fond. */
vec3 nappe(vec2 p, float t, float prog, vec2 m){
  vec3 acc = vec3(0.0);
  float w = 0.0;
  /* Un DEMI-TOUR et demi sur la section, et un ecartement qui double : entre
   * le haut et le bas de la section le sol n'a pas seulement bouge, il a
   * change de composition. Une derive plus sage se lisait comme une lenteur,
   * pas comme un parcours. */
  float tour = prog * 3.6;
  float ec = 0.24 + prog * 0.34;
  for(int i = 0; i < 3; i++){
    float f = float(i);
    vec2 base = rot(tour + f * 2.09) * vec2(ec, 0.0);
    vec2 c = base
           + vec2(sin(t * 0.043 + f * 2.1), cos(t * 0.031 + f * 1.7)) * 0.34
           + m * (0.13 + f * 0.07);
    vec2 d = p - c;
    /* Les foyers s'elargissent en descendant : la nappe passe d'un jeu de
     * taches distinctes a un fondu large, et ce glissement se voit. */
    float k = exp(-dot(d, d) * (2.2 - prog * 0.7));
    acc += tone(i) * k;
    w += k;
  }
  return acc / max(w, 1e-4);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float asp = uRes.x / uRes.y;
  vec3 col = uBG;

  /* LES BORDS RESTENT DU PAPIER. La mesure est normalisee sur chaque axe —
   * 1.0 est l'arete, quelle que soit la forme du cadre — sinon un ecran large
   * garderait de la couleur a gauche et a droite et n'en aurait plus en haut. */
  float bord = max(abs(uv.x) / (0.5 * asp), abs(uv.y) / 0.5);
  float dedans = 1.0 - smoothstep(0.22, 1.0, bord);

  /* 0,26 et non 0,085. Sur une petite toile, le voile n'a qu'a empecher onze
   * rectangles du meme gris d'etre le meme objet. Ici il est le SOL, et un sol
   * qu'on ne voit pas ne sert a rien : les tuiles de verre de cette section
   * n'ont que lui a montrer, et un flou sur un aplat ne montre rien.
   * Le gris garde le dernier mot quand meme — a un quart, une teinte pure de
   * la palette ne deplace le papier que de quelques pour cent. */
  col = mix(col, nappe(uv, uTime, uProg, uMouse), 0.26 * dedans);

  /* Le grain. Un degrade tres etale sur huit bits fait des bandes ; un
   * pouieme de bruit les casse pour rien du tout. */
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.012;
  o = vec4(col, 1.0);
}`;

    return {
      name: "nappe",
      section: "#core",
      field,

      init(a) {
        gl = a.gl;
        prog = a.program(VS, FS);
        u = a.uniforms(prog, ["uRes", "uTime", "uBG", "uMouse", "uProg"]);
        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]),
                      gl.STATIC_DRAW);
        const al = gl.getAttribLocation(prog, "p");
        gl.enableVertexAttribArray(al);
        gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        addEventListener("pointermove", (e) => {
          tx = (e.clientX / innerWidth) * 2 - 1;
          ty = (e.clientY / innerHeight) * 2 - 1;
        }, { passive: true });
      },

      frame(ctx) {
        mx += (tx - mx) * 0.05;
        my += (ty - my) * 0.05;

        gl.useProgram(prog);
        gl.bindVertexArray(vao);
        gl.disable(gl.BLEND);
        gl.uniform2f(u.uRes, ctx.w * ctx.dpr, ctx.h * ctx.dpr);
        gl.uniform3f(u.uBG, field[0], field[1], field[2]);
        gl.uniform1f(u.uTime, ctx.t);
        gl.uniform2f(u.uMouse, mx, my);
        gl.uniform1f(u.uProg, ctx.prog);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        gl.enable(gl.BLEND);
      },
    };
  })(),
);
