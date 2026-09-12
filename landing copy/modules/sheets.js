/* ===========================================================================
 * SHEETS — un champ de feuilles à la dérive, en profondeur de champ.
 *
 * La matière de la section n'est pas un schéma du produit : c'est sa matière
 * première. Des feuilles de journal, très grandes, presque toutes hors du
 * plan de netteté — donc réduites à des rectangles clairs à bord doux sur le
 * papier. Une seule à la fois entre dans le net, et c'est là, et seulement
 * là, que ses filets de colonnes redeviennent lisibles.
 *
 * Le plan de netteté VOYAGE avec les temps de la section : c'est lui qui fait
 * avancer la lecture, pas un mouvement. Rien ne glisse, quelque chose se
 * précise.
 *
 * ------------------------------------------------------------------ le coût
 * Aucun raymarching. Une feuille très floue n'est qu'un rectangle à bord
 * doux : on la dessine analytiquement en espace écran, du fond vers l'avant,
 * et le flou n'est qu'une largeur de transition. Onze feuilles coûtent
 * quelques instructions par pixel au lieu de dizaines de pas de marche — donc
 * pleine résolution, sans tampon réduit ni gouverneur d'images.
 * ======================================================================== */

Stage.register(
  (() => {
    /* Les réglages de PUBLISH, à la main. Touche P sur la section, ou
     * window.__pub depuis la console. « copier » met le JSON au presse-papier
     * pour le figer ici une fois qu'il est bon. */
    const P = {
      size: 1.1,    // la taille des tuiles en orbite
      rad: 0.71,    // le rayon de l'orbite
      orb: 2.0,     // combien elles tournent AUTOUR du mot, sur la traversée
      spin: 3.5,    // combien elles tournent SUR elles-mêmes
      away: 1.55,   // à quelle distance les cinq autres s'en vont
      settle: 3.05, // à quelle vitesse l'orbite s'installe
    };
    window.__pub = P;

    let gl, prog, u, vao;
    /* Le même blanc que la section d'avant, au chiffre près. Deux blancs
     * voisins mais différents ne se lisent pas comme deux sections : ils se
     * lisent comme une erreur de raccord. */
    const field = [1.0, 1.0, 1.0]; // #ffffff, comme #hsec
    let mx = 0, my = 0, tx = 0, ty = 0;
    let focus = 0; // le temps courant, amorti

    /* LE TIRAGE DES COULEURS. Trois pour les retenues — un bleu, un ambre, un
     * noir, battus — et une pour la décision, prise parmi les mêmes.
     * Les valeurs sont les couleurs de la page, en 0-1 : elles sont recopiées
     * ici parce que le nuancier vit en CSS et que le shader ne le lit pas.
     * Si elles changent là-bas, elles changent ici — c'est le seul endroit. */
    const BLEU = [0.102, 0.184, 0.984];
    const AMBRE = [0.949, 0.694, 0.235];
    const ENCRE = [0.078, 0.078, 0.110];
    let pick = [BLEU, AMBRE, ENCRE];
    let vuA = -1e9;        // la dernière image peinte : l'absence dit le passage
    let renverse = false;  // le mot est-il renversé en papier ?
    const tirer = () => {
      const a = [BLEU, AMBRE, ENCRE];
      for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const v = a[i]; a[i] = a[j]; a[j] = v;
      }
      pick = a;
      /* LA CLARTÉ DE LA RETENUE. Le titre des temps « Decide » et « Produce »
       * passe PAR-DESSUS la tuile qui reste, et il est écrit en encre : quand
       * le tirage désigne le noir, un mot noir sur une tuile noire disparaît.
       * La page a donc besoin de savoir si la couleur retenue est sombre. La
       * luminance est pondérée à l'œil — le vert pèse plus que le bleu — parce
       * qu'une moyenne des trois canaux dirait que le bleu pur est clair. */
      const c = a[1];
      const luma = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      window.__sheetsDark = luma < 0.42;
      // le diagnostic vit dans la page : le tirage courant est lisible
      window.__sheetsPick = { pick, luma: +luma.toFixed(3),
                              sombre: window.__sheetsDark,
                              n: (window.__sheetsPick?.n || 0) + 1 };
    };

    const VS = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

    const FS = `#version 300 es
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uBG;
uniform vec2  uMouse;
uniform float uBeat;      // le temps courant, en continu : 0 -> 5
/* L'entrée en scène. La page tient le lecteur à la frontière, porte la vue
 * jusqu'ici, fait venir le texte, et seulement ensuite les tuiles : ce
 * facteur est ce dernier temps. À 0 il n'y a rien à voir sur le sol. */
uniform float uIn;
/* La ligne de coupe du RIDEAU, en pixels depuis le haut du cadre. Au-dessus,
 * le module ne peint que son sol : la section d'avant est encore là et ses
 * tuiles n'ont rien à y faire. En dessous, il peint tout.
 *
 * Il faut cette coupe parce que le canevas est PARTAGÉ et couvre la fenêtre
 * entière : dès que ce module le prend, il peint partout. Sans elle, les
 * tuiles apparaîtraient derrière la section qu'on est en train de quitter. */
uniform float uCut;
/* LES TROIS COULEURS DES RETENUES, tirées au sort à chaque passage — un bleu,
 * un ambre, un noir, jamais dans le même ordre. Le tri ne désigne pas une
 * qualité mais trois candidats de même rang ; leur donner à toutes la même
 * couleur disait le contraire.
 * Ce qui varie d'un passage à l'autre est donc l'ordre des trois — et par
 * conséquent la couleur de celle qui se retrouve dessus au rassemblement. */
uniform vec3 uPick0;
uniform vec3 uPick1;
uniform vec3 uPick2;
/* Les réglages de PUBLISH. Touche P sur la section pour le panneau,
 * window.__pub depuis la console pour les mêmes valeurs. */
uniform float uPubSize;   // la taille des tuiles en orbite
uniform float uPubRad;    // le rayon de l'orbite
uniform float uPubOrb;    // combien elles tournent AUTOUR du mot
uniform float uPubSpin;   // combien elles tournent SUR elles-mêmes
uniform float uPubAway;   // à quelle vitesse les cinq autres s'en vont
uniform float uPubSet;    // à quelle vitesse l'orbite s'installe
out vec4 outColor;

/* Neuf, pas onze. Deux raisons qui tombent juste ensemble : à onze, la
 * rangée d'UNDERSTAND se recouvre à 70 % et se lit comme un escalier serré au
 * lieu d'un rang ; et la grille de PRODUCE tient neuf cases, donc deux tuiles
 * devaient s'effacer pour rien. Neuf tuiles, neuf cases, un rang qui respire. */
const int N = 9;
const float PICK = float(N - 1); /* la tuile que le parcours retient. C'est la
   DERNIÈRE : les tuiles sont peintes dans l'ordre des index, donc n'importe
   quelle autre se serait fait recouvrir par ses voisines de file au moment
   précis où elle doit ressortir. */
const vec3 INK  = vec3(0.078, 0.078, 0.110);
/* Le bruit de base. Déclaré ICI et non plus bas : GLSL exige qu'une fonction
 * soit connue avant d'être appelée, et la nappe s'en sert. */
float hash(float i){ return fract(sin(i*127.1)*43758.5453); }

/* Les trois couleurs des retenues arrivent par les uniformes du tirage. Ces
 * trois-ci sont autre chose : la palette dont est tiré LE VOILE des tuiles en
 * papier. Elles sont écrites ici parce qu'un voile n'est pas un choix, c'est
 * une matière — il ne change pas d'un passage a l'autre. */
const vec3 P_BLUE  = vec3(0.102, 0.184, 0.984);
const vec3 P_AMBER = vec3(0.949, 0.694, 0.235);
const vec3 P_INK   = vec3(0.078, 0.078, 0.110);
/* Cinq pour cent et demi. Au-dela la tuile est colorée, et la couleur est
 * réservée à ce qui est RETENU — c'est tout le propos du tri. La nappe ne doit
 * pas teinter la tuile : elle doit seulement l'empêcher d'être exactement la
 * même que ses dix voisines. */
const float VOILE = 0.055;

vec3 palette(float u){
  float k = fract(u) * 3.0;
  return k < 1.0 ? P_BLUE : (k < 2.0 ? P_AMBER : P_INK);
}

/* LA NAPPE. Trois foyers de couleur posés dans la tuile, chacun avec sa
 * portée, et une moyenne pondérée par la distance : les taches se fondent
 * les unes dans les autres au lieu de se ranger le long d'un axe.
 *
 * Une rampe à deux arrêts, orientée par un angle, ne donnait pas ça. Elle a
 * toujours un SENS, donc onze tuiles se lisaient comme onze dégradés du même
 * type ; ici il n'y a pas de direction du tout, et chaque tuile a sa propre
 * géographie. C'est la différence entre un fondu et une nappe.
 *
 * Le poids gaussien, jamais nul, garantit qu'aucun point n'est laissé sans
 * couleur — pas de trou gris au milieu des trois foyers. */
vec3 nappe(vec2 g, float seed){
  vec3 acc = vec3(0.0);
  float som = 1e-4;
  for(int k = 0; k < 3; k++){
    float f = float(k);
    vec2 c = vec2(hash(seed + f * 3.17 + 0.5), hash(seed + f * 7.71 + 1.5)) * 2.0 - 1.0;
    c *= 0.95;
    float r = 0.62 + hash(seed + f * 11.3 + 2.5) * 0.62;
    vec2 d = g - c;
    float w = exp(-dot(d, d) / (r * r));
    acc += palette(hash(seed + f * 5.53 + 3.5)) * w;
    som += w;
  }
  return acc / som;
}
const vec3 AMBER = vec3(0.949, 0.694, 0.235);
/* LA REVUE est grise, pas bleue. En bleu, la tête de lecture portait déjà la
 * couleur de ce qui est RETENU : on ne pouvait pas distinguer « je regarde »
 * de « je garde », et les six recalées avaient été bleues elles aussi avant
 * de redevenir papier. Le gris ne promet rien — il dit seulement qu'on est
 * en train de lire cette tuile-là.
 * Il est LÉGER, à un cheveu du papier des tuiles : plus sombre, la tête
 * pesait plus que ce qu'elle désigne, et on regardait le passage au lieu de
 * regarder ce qu'il retient. */
const vec3 GREY = vec3(0.72, 0.72, 0.745);


/* La profondeur à laquelle vit la file. Elle est CONSTANTE : c'est ce qui
 * garantit que les tuiles de la file ont toutes exactement le même flou. */
const float FOCUS_FILE = 0.86;

/* Ce qu'une tuile retenue fait quand le tri la garde : elle MONTE, et rien
 * d'autre. Elle ne change ni de place dans la file, ni de taille — elle sort
 * du rang d'un cran, et ça suffit à la désigner. La même montée pour les
 * trois, donc elles se valent. */
const float LIFT = 0.085;

/* Où les trois se rangent à DECIDE : une seule hauteur, une seule taille, et
 * trois places symétriques — une à gauche, une au centre EXACT, une à droite.
 * L'écart est plus grand que la largeur d'une tuile, donc elles ne se
 * touchent pas : c'est une grille, pas une pile. */
const float LEVEL_Y = 0.0;    // centré en hauteur, exactement
const float LEVEL_S = 0.58;
const float LEVEL_X = 0.26;

/* La profondeur de champ, mise sous le coude. Le mécanisme reste entier —
 * le plan de netteté qui vise (focusOf), le cercle de confusion, le flou du
 * bord, l'aplatissement du modelé, l'étalement de l'ombre — mais il est
 * neutralisé : toutes les tuiles sont au naturel, partout, comme dans la
 * file d'UNDERSTAND. Remettre 1.0 le rallume tel quel. */
const float DOF = 0.0;

float sdRect(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

/* Le rang décide de la couleur, et le tirage décide du rang. Un tableau
 * d'uniformes se lirait mieux, mais son indice devrait être constant : ici le
 * rang vient d'une variable de boucle. */
vec3 pickCol(float rank){
  return rank < 0.5 ? uPick0 : (rank < 1.5 ? uPick1 : uPick2);
}

/* --------------------------------------------------------------- les états
 * Une seule matière — des tuiles — et six dispositions. Ce n'est pas une
 * illustration de chaque mot, c'est son GESTE : ça s'aligne, deux se
 * détachent, elles se rejoignent, elles se rangent, elles partent. La forme
 * ne change jamais ; seuls son placement, sa taille, sa profondeur, sa
 * présence et sa teinte changent.
 *
 * c    centre dans le cadre       sc  échelle
 * a    rotation                   z   profondeur, 0 au fond
 * pr   présence, 0 = absente      tn  quantité de teinte, tc sa couleur
 * ord  l'ordre d'entrée dans l'état : c'est lui qui fait la cascade
 */

/* Une tuile garde sa place dans la file, à tous les temps. Elle en avait
 * changé entre UNDERSTAND et RECOMMEND, pour amener les retenues au milieu —
 * et c'est ce qui cassait le tri : la tête balayait les places d'arrivée
 * pendant que les tuiles étaient encore à celles du départ, donc elle
 * parcourait une file qu'on ne voit pas. La place EST l'index, point.
 *
 * Les trois retenues sont donc les index 1, 4 et 7 : dispersées dans la file,
 * et non à la queue. Elles se font recouvrir par leurs voisines de droite
 * tant qu'elles sont dans le rang, ce qui est correct — et dès qu'elles en
 * sortent, elles montent au-dessus de la rangée où il n'y a personne. */
void place(float fi, float h1, float h2, float h3, int b, float asp,
           out vec2 c, out float sc, out float a, out float z, out float pr,
           out float tn, out vec3 tc, out float ord){
  float u = fi / float(N - 1);
  /* Les trois retenues : les index 1, 4 et 7. Et parmi elles, LA seule qui
   * survit à Decide, celle du milieu — c'est elle qui finit au centre. */
  float mine = step(mod(fi + 2.0, 3.0), 0.5) * step(0.5, fi) * step(fi, 7.5);
  float only = step(abs(fi - 4.0), 0.5);
  float rank = (fi - 1.0) / 3.0;   // 0, 1, 2 dans l'ordre de la revue
  /* La couleur par défaut d'une pose est CELLE DE LA TUILE, pas le bleu. Les
   * états où rien n'est teinté — le chapeau, la file, la grille — laissaient
   * la couleur au bleu ; leur teinte étant nulle, on ne le voyait pas… sauf en
   * TRANSITION : le passage interpole la couleur en même temps que la teinte,
   * donc en venant de la file vers le tri, la couleur montait du bleu vers
   * celle tirée, et il passait un bleu dans le geste. C'était le reliquat. */
  z = u; sc = 1.0; a = 0.0; pr = 1.0; tn = 0.0; tc = pickCol(rank); ord = u;
  c = vec2(0.0);

  /* --------------------------------------------------------------- la file
   * Onze tuiles RIGOUREUSEMENT identiques, à une seule échelle près. Même
   * forme, même inclinaison, même netteté, même arrondi. Ce qui change est
   * leur place et leur taille, et rien d'autre.
   *
   * Le point qui les faisait diverger n'était ni le flou ni l'arrondi : c'est
   * l'ÉCART. À écart constant et échelle croissante, une petite tuile du fond
   * est recouverte à 60 % par sa voisine et une grande à 25 % — elles ne
   * montrent pas la même part d'elles-mêmes, donc elles ne lisent pas comme
   * le même objet. L'abscisse est donc l'INTÉGRALE de l'échelle : le pas est
   * proportionnel à la taille locale, et chaque tuile montre exactement la
   * même fraction d'elle-même.
   *
   * Elles sont toutes au plan de netteté, donc toutes floues pareil — c'est
   * la deuxième garantie qu'elles sont identiques. La profondeur se lit à
   * l'échelle et au recouvrement, pas au flou. */
  float S0 = 0.34, S1 = 0.66;
  float t = fi / float(N - 1);
  float fs = mix(S0, S1, t);
  float acc = (S0 * t + (S1 - S0) * t * t * 0.5) / (S0 + (S1 - S0) * 0.5);
  /* Toutes les tuiles reposent sur une MÊME LIGNE DE BASE, comme des objets
   * posés sur une table : le centre de chacune est donc remonté de sa propre
   * demi-hauteur. La base est droite, et c'est le profil du haut qui monte en
   * escalier vers la droite — c'est ce qui donne l'ordre.
   *
   * Ni courbe ni inclinaison : la rangée est franchement horizontale. Une
   * file bombée et inclinée se lit comme un éventail jeté, pas comme un rang. */
  const float BASE = 0.30;
  vec2  fc = vec2((acc - 0.5) * 0.70 * asp, BASE - 0.42 * fs);
  float fa = 0.0;

  if(b <= 0){
    // le chapeau : dispersé, calme, rien n'est encore arrivé
    c = vec2((h1 - 0.5) * 1.62 * asp, (h2 - 0.5) * 1.50);
    sc = mix(0.34, 1.30, u);
    a = (h2 - 0.5) * 0.44;
    z = u;
  } else if(b == 1){
    /* UNDERSTAND — l'alignement se fait ici. Les tuiles se rangent les unes à
     * la suite des autres le long de la course bombée, du fond à gauche vers
     * le premier plan à droite. Rien n'est encore désigné : tout est papier. */
    c = fc; sc = fs; a = fa;
    z = FOCUS_FILE;         // toutes nettes, donc toutes identiques
    ord = t;
  } else if(b == 2){
    /* RECOMMEND — l'état d'ARRIVÉE du tri : les trois retenues sont sorties
     * du groupe et rangées en ligne au centre, colorées ; les six autres sont
     * restées exactement où elles étaient dans la file, en papier.
     *
     * Le tri lui-même — la tête qui passe tuile par tuile, la couleur qui
     * s'allume, la tuile qui sort si elle est retenue et qui redevient papier
     * sinon, puis les recalées qui s'en vont — ne tient pas dans une pose.
     * C'est monté dans main(), où chaque tuile fait son passage vers cet état
     * au moment précis où la tête la touche. */
    c  = fc - vec2(0.0, LIFT) * mine;
    sc = fs;
    z = FOCUS_FILE;
    a = fa;
    tn = mine * 0.86;
    tc = pickCol(rank);
    ord = t;
  } else if(b == 3){
    /* DECIDE — les trois retenues se mettent d'abord d'aplomb, à une même
     * hauteur et une même taille, puis se rangent EN
     * grille : une à gauche, une au centre exact, une à droite. Elles se
     * posent côte à côte, elles ne se confondent pas — trois choix qu'on
     * aligne pour trancher.
     *
     * Elles restent en PAPIER. En plein bleu, le titre qui passe par-dessus
     * devait se renverser en blanc, et un mot blanc sur ce bleu-là ne se lit
     * pas. La couleur reste ce qu'elle est ailleurs : le signe du passage en
     * revue, pas un état.
     *
     * Le mouvement se fait en deux temps — d'abord le niveau, ensuite la
     * mise en grille — et ce découpage vit dans main() : une pose ne sait pas
     * dire « d'abord ceci, ensuite cela ». */
    /* La pose d'arrivée est le RASSEMBLEMENT : les trois au même point, au
     * centre du cadre. La grille de trois n'est pas cette pose-là, c'est le
     * passage obligé pour y venir — elle vit dans main(), comme étape.
     *
     * Les trois GARDENT la couleur qu'elles ont reçue au tri, telle quelle.
     * Une teinte ajoutée au moment du rassemblement les faisait toutes trois
     * changer d'état alors qu'il ne se passe rien de nouveau : le choix a eu
     * lieu au temps d'avant, ici on ne fait que les réunir. La couleur ne
     * bougera qu'à Produce, quand elle a de nouveau quelque chose à dire.
     *
     * SEULE LA RETENUE RESTE. Les tuiles ne sont PAS triées en profondeur —
     * elles sont peintes dans l'ordre de la boucle, et la dernière recouvre
     * les autres quoi qu'on fasse de leur z. Vouloir mettre la retenue devant
     * en la rapprochant ne pouvait donc rien donner : c'est fi = 7 qui passe
     * par-dessus fi = 4, toujours. Et une fois les écartées décolorées, c'est
     * une tuile en papier qui recouvrait le choix.
     * L'ORDRE DE PEINTURE suffit, et c'est le seul moyen honnête : la retenue
     * est tracée en dernier, donc elle couvre les deux autres. Les faire
     * s'effacer marchait aussi, mais Produce a besoin des neuf tuiles — elles
     * revenaient donc du néant juste après, et on voyait deux tuiles
     * disparaître puis reparaître pour rien. Elles restent là, dessous,
     * intactes ; simplement on ne les voit plus. */
    c = vec2(0.0, LEVEL_Y);
    sc = LEVEL_S;
    z = FOCUS_FILE;
    pr = mine;
    tn = mine * 0.86;
    tc = pickCol(rank);
  } else if(b == 4){
    /* PRODUCE — la grille. Elle est en 3 x 3, pas en 4 x 3 : avec un nombre
     * PAIR de colonnes le centre tombe entre deux tuiles, et il n'y a rien à
     * l'endroit d'où la grille est censée partir. Impair dans les deux sens,
     * donc, et la tuile qu'on vient de décider prend la case du milieu.
     *
     * Neuf cases pour onze tuiles : les deux plus lointaines s'effacent. Elles
     * sont les plus petites et les plus floues, personne ne les cherche.
     *
     * Elle ne se remplit pas dans l'ordre des tuiles : elle PART DU CENTRE et
     * s'ouvre vers les bords, parce que c'est ce qui vient d'être décidé qui
     * se déploie. */
    /* Neuf tuiles, neuf cases, et la case du milieu est la 4 — qui est aussi
     * l'index de la tuile décidée. La grille se remplit donc dans l'ordre des
     * index, sans réindexation d'aucune sorte. */
    vec2 slot = vec2(mod(fi, 3.0) - 1.0, floor(fi / 3.0) - 1.0);
    /* La grille prend toute la fenêtre. Le pas horizontal suit le format du
     * cadre pour que les colonnes touchent les bords quelle que soit la
     * largeur ; le pas vertical est fixe, donc les rangs du haut et du bas
     * DÉBORDENT — un cadre en 16/9 est trop court pour trois rangs de tuiles
     * en portrait, et les faire tenir de force les aurait rapetissées.
     * Ce débordement est le signe qu'il y en a plus que ce qu'on voit. */
    c = slot * vec2(0.39 * asp, 0.62);
    sc = 0.57; a = 0.0; z = 0.5;
    ord = clamp(length(slot) / 1.5, 0.0, 1.0);
  } else {
    /* PUBLISH — la grille se défait, et les deux gestes courent EN MÊME TEMPS.
     *
     *   1. cinq tuiles s'en vont tout droit, de plus en plus loin, jusqu'à
     *      quitter le cadre ;
     *   2. les quatre autres se mettent à TOURNER AUTOUR du mot en se
     *      rapprochant de lui, et tournent sur elles-mêmes en même temps.
     *
     * Tout est écrit en POLAIRE autour du centre du cadre, parce que c'est ce
     * que les deux gestes ont en commun : partir de sa case, et faire varier
     * son rayon et son angle. Une tuile qui s'en va garde son angle et gagne
     * du rayon ; une tuile qui reste perd du rayon et gagne de l'angle.
     *
     * Le mouvement est indexé sur l'AVANCEMENT dans ce temps-ci, pas sur
     * l'horloge. Sur l'horloge, l'orbite avait déjà tourné avant que le
     * lecteur n'arrive : les tuiles glissaient vers une position en cours de
     * route au lieu de se mettre à tourner depuis leur case. C'est ce qui
     * faisait que rien ne se lisait comme un départ. */
    float pub = clamp(uBeat - 4.0, 0.0, 2.0);

    vec2 cell = vec2(mod(fi, 3.0) - 1.0, floor(fi / 3.0) - 1.0);
    float keep = step(0.5, mod(fi, 2.0)) * step(fi, 7.5);   // les cases 1,3,5,7

    /* La case de départ, en polaire. La case du centre n'a ni angle ni rayon,
     * on lui en donne : sans ça elle resterait plantée sur le mot. */
    vec2 base = cell * vec2(0.39 * asp, 0.62);
    float a0 = dot(cell, cell) < 0.5 ? 0.7854 : atan(base.y, base.x);
    float r0 = dot(cell, cell) < 0.5 ? 0.18 : length(vec2(base.x / asp, base.y));

    // celles qui s'en vont : même angle, rayon qui grandit
    float rOut = r0 + pub * uPubAway;

    /* Celles qui restent : rayon qui se resserre, angle qui tourne. Tout est
     * lié au SCROLL et à rien d'autre — l'orbite avance quand le lecteur
     * avance et s'arrête quand il s'arrête. C'est lui qui tourne les tuiles,
     * pas une horloge qui tournerait dans son dos. */
    float in0 = min(1.0, pub * uPubSet);
    float rIn = mix(r0, uPubRad, in0);
    float aIn = a0 + pub * uPubOrb;

    float ang = mix(a0, aIn, keep);
    float rad = mix(rOut, rIn, keep);

    c  = vec2(cos(ang) * rad * asp, sin(ang) * rad);
    /* Elles GROSSISSENT en s'installant. Leur rayon grandit du même coup :
     * tournées d'un quart, c'est leur demi-DIAGONALE qui compte, et à taille
     * égale sur l'ancien rayon leur coin serait venu buter dans le mot. Plus
     * grandes et un peu plus loin, leur bord interne est malgré tout plus
     * près du mot qu'avant — c'est le coin qui s'en approche, pas le centre. */
    sc = mix(0.50, mix(0.46, uPubSize, in0), keep);
    // la rotation propre, en parallèle de l'orbite et à une autre vitesse
    a  = keep * pub * uPubSpin;
    z  = 0.5;
    pr = 1.0;                   // rien ne s'évapore : ce qui part, sort
  }
}

/* La netteté ne balaie pas le champ au hasard : elle VISE. Chaque état sait
 * quelle profondeur il veut voir, parce que c'est cette feuille-là que le mot
 * désigne. Une rampe linéaire manquait la feuille retenue de Decide au moment
 * exact où elle devait être seule et nette — le geste tombait à plat. */
float focusOf(int b){
  if(b <= 0) return 0.14;   // rien n'est encore net
  if(b == 1) return FOCUS_FILE;   // la file, tout entière au même plan
  if(b == 2) return 0.97;         // les deux qui sortent du rang
  if(b == 3) return 1.00;   // celle qui reste, au centre
  if(b == 4) return 0.50;   // la grille, tout entière au même plan
  return 0.30;              // ce qui reste quand elle part
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.y = 1.0 - uv.y;
  float asp = uRes.x / uRes.y;
  vec2 P = (uv - 0.5) * vec2(asp, 1.0);

  // au-dessus de la coupe, le sol nu : rien de cette section ne s'y montre
  if (uCut > 0.5 && gl_FragCoord.y > uRes.y - uCut) {
    float g0 = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    outColor = vec4(uBG + (g0 - 0.5) * 0.012, 1.0);
    return;
  }

  int b0 = int(floor(uBeat));
  float bf = smoothstep(0.0, 1.0, uBeat - float(b0));   // le passage, adouci

  float focus = mix(focusOf(b0), focusOf(b0 + 1), bf);

  vec3 col = uBG;

  /* L'ORDRE DE PEINTURE. Les tuiles ne sont pas triées en profondeur : la
   * dernière de la boucle recouvre les autres, quoi qu'on fasse de leur z.
   * Pendant le RASSEMBLEMENT, les trois viennent au même point et c'est la
   * retenue — l'index 4 — qui doit rester visible ; peinte au milieu de la
   * boucle, elle passait sous l'index 7.
   * On échange donc son rang de peinture avec le DERNIER, et seulement
   * pendant ce geste : c'est une permutation de l'ordre de tracé, pas des
   * tuiles — chacune garde son index, donc sa place, sa taille et sa couleur.
   * Ailleurs, l'ordre du balisage est le bon : dans la file, celle de droite
   * doit recouvrir celle de gauche.
   *
   * La permutation tient sur TOUTE LA DÉCISION, pas seulement sur le geste de
   * rassemblement. Bornée au temps 2, elle lâchait dès que l'avancement
   * passait 3 : les trois sont encore empilées au centre à cet instant, et
   * l'index 7 reprenait le dessus. C'est là qu'on voyait le noir passer sur
   * l'ambre. Elle est donc lue sur l'avancement lui-même, du moment où elles
   * commencent à se rejoindre jusqu'à ce que la grille les ait séparées. */
  bool devant = (uBeat > 2.45 && uBeat < 3.60);

  for(int i = 0; i < N; i++){
    int j = devant ? (i == 4 ? N - 1 : (i == N - 1 ? 4 : i)) : i;
    float fi = float(j);
    float h1 = hash(fi + 1.0), h2 = hash(fi + 9.0), h3 = hash(fi + 17.0);

    vec2 cA, cB; vec3 kA, kB;
    float sA, sB, aA, aB, zA, zB, pA, pB, tA, tB, oA, oB;
    place(fi, h1, h2, h3, b0,     asp, cA, sA, aA, zA, pA, tA, kA, oA);
    place(fi, h1, h2, h3, b0 + 1, asp, cB, sB, aB, zB, pB, tB, kB, oB);

    /* Chaque tuile fait le passage à son tour, pas toutes ensemble : elles se
     * rangent UNE PAR UNE. Sans ce décalage, la grille de Produce apparaît
     * d'un bloc et le geste ne se lit pas. */
    /* ------------------------------------------------------------- le tri
     * Aux deux temps du choix, ce n'est pas une cascade décorative qui fait
     * passer les tuiles d'un état à l'autre : c'est une TÊTE DE LECTURE qui
     * parcourt la file, de la dernière tuile — celle du fond — à la première.
     *
     * Elle allume la tuile qu'elle examine. Si celle-ci est retenue, elle
     * sort du groupe et va se ranger au centre EN GARDANT sa couleur ; sinon
     * la couleur se retire et la tuile reste où elle est. Quand toute la file
     * a été vue, les recalées s'en vont et il ne reste que les retenues.
     *
     * Le passage d'une tuile est donc commandé par « la tête est-elle passée
     * sur moi », et par rien d'autre. Une cascade indexée sur le rang ne
     * pouvait pas dire ça : elle faisait sortir les retenues avant qu'on les
     * ait regardées.
     *
     * À DECIDE la même tête repasse, mais sur les trois seules qui restent :
     * une survit, les deux autres s'effacent. */
    // les mêmes désignations que dans place(), qui n'en partage pas le scope
    float slot = fi;
    float mine = step(mod(fi + 2.0, 3.0), 0.5) * step(0.5, fi) * step(fi, 7.5);
    float rank = (fi - 1.0) / 3.0;
    float bfi;
    float lit = 0.0;    // la tuile en cours d'examen
    float gone = 0.0;   // ce qui n'a pas été retenu, à la fin de la revue
    float lvl = -1.0;   // Decide : la mise en grille, puis le rassemblement
    float gth = -1.0;
    float tclk = -1.0;  // Produce : la teinte a sa propre horloge

    if(b0 == 1){
      float head = mix(-0.9, float(N) + 1.4, min(1.0, bf / 0.80));
      bfi  = smoothstep(slot - 0.5, slot + 0.5, head);
      lit  = exp(-pow((slot - head) * 1.5, 2.0));
      gone = (1.0 - mine) * smoothstep(0.84, 1.0, bf);
    } else if(b0 == 2){
      /* DECIDE ne passe plus rien en revue : le tri a eu lieu au temps
       * d'avant. Ce qui reste à faire est un geste en deux temps sur les
       * trois retenues, et rien d'autre. */
      bfi = smoothstep(0.0, 1.0, bf);
      /* Les recalées sont parties au temps précédent et ne reviennent pas.
       * Sans cette ligne elles réapparaissaient d'un coup à l'instant précis
       * où l'avancement se posait sur 2 — le départ n'était acquis que
       * pendant la transition qui l'avait produit. */
      gone = 1.0 - mine;
      /* Le geste de Decide se lit en DEUX temps, et l'ordre compte : les
       * trois se rangent d'abord en grille, centrées, puis seulement se
       * rassemblent en une. Menés ensemble, on ne voit qu'un glissement mou. */
      lvl = smoothstep(0.0, 1.0, min(1.0, bf / 0.50));
      gth = smoothstep(0.0, 1.0, max(0.0, (bf - 0.55) / 0.45));
    } else if(b0 == 3){
      /* PRODUCE — la couleur s'en va AVANT que la tuile se décompose. Une
       * tuile qui se disperse en changeant de couleur dans le même geste ne
       * dit rien : les deux se masquent. Elle redevient papier d'abord, et
       * c'est seulement ensuite qu'elle se déploie en grille.
       *
       * Le déploiement garde sa cascade du centre vers les bords ; elle est
       * simplement décalée dans le temps par la décoloration qui la précède. */
      const float LAG = 0.55;
      tclk = smoothstep(0.0, 1.0, min(1.0, bf / 0.38));
      float go = max(0.0, (bf - 0.42) / 0.58);
      bfi = smoothstep(0.0, 1.0, clamp(go * (1.0 + LAG) - oB * LAG, 0.0, 1.0));
    } else {
      /* Partout ailleurs, la cascade ordinaire : l'ordre d'entrée est celui
       * de l'état VISÉ, donc la grille de Produce se remplit du centre vers
       * les bords et non dans l'ordre des tuiles. */
      const float LAG = 0.55;
      bfi = clamp((bf * (1.0 + LAG) - oB * LAG), 0.0, 1.0);
      bfi = smoothstep(0.0, 1.0, bfi);
    }

    /* Decide passe par une ÉTAPE, pas seulement d'une pose à une autre : les
     * trois viennent d'abord se ranger en grille, centrées en hauteur et en
     * largeur, et se rassemblent seulement ensuite en une. L'abscisse fait
     * donc deux sauts — sa place dans la file, puis sa case de grille, puis
     * le centre — pendant que la hauteur et la taille n'en font qu'un. */
    /* L'ECART des trois places, avec un PLANCHER. Multiplie par le format du
     * cadre, il tombait a la moitie de la largeur d'une tuile en portrait :
     * les trois se rejoignaient au lieu de se ranger. Le plancher est ce
     * qu'il faut pour qu'elles ne se touchent pas dans le cadre le plus
     * etroit — c'est une grille, pas une pile. */
    float gridX = (rank - 1.0) * max(LEVEL_X * asp, 0.163);
    vec2  c  = vec2(lvl < 0.0 ? mix(cA.x, cB.x, bfi)
                              : mix(mix(cA.x, gridX, lvl), cB.x, max(0.0, gth)),
                    mix(cA.y, cB.y, lvl < 0.0 ? bfi : lvl));
    float sc = mix(sA, sB, lvl < 0.0 ? bfi : lvl);
    float ag = mix(aA, aB, bfi);
    float z  = mix(zA, zB, bfi);
    float pr = mix(pA, pB, bfi) * (1.0 - gone) * uIn;
    float tint = mix(tA, tB, tclk < 0.0 ? bfi : tclk);
    vec3  tcol = mix(kA, kB, tclk < 0.0 ? bfi : tclk);
    /* LE RIDEAU. Pendant que la section d'avant remonte, les tuiles d'ici sont
     * déjà composées et immobiles dessous — et une composition parfaitement
     * fixe sous un plan qui glisse se lit comme une image collée derrière une
     * fenêtre. Elles montent donc d'un cheveu pendant le franchissement,
     * commandées par la MÊME ligne de coupe qui découpe le plan du dessus :
     * une seule frontière, deux mouvements qui s'accordent forcément.
     * Hors franchissement uCut vaut zéro, donc ceci ne coûte rien.
     * (AUCUN ACCENT GRAVE dans les commentaires de ce shader : sa source est
     * un gabarit de chaîne, et le premier rencontré en fermerait le texte.
     * Ça a coûté deux scènes noires.) */
    c.y += (uCut / max(1.0, uRes.y)) * 0.055;

    // la couleur de l'examen, par-dessus celle de l'état
    tint = max(tint, lit * 0.86);
    tcol = mix(tcol, GREY, step(0.001, lit));


    /* Les états ORDONNÉS : la rangée d'Understand, la file de Recommend, la
     * grille de Produce, et la superposition de Decide. Dans ceux-là, la
     * dérive propre à chaque tuile s'éteint — une phase par tuile décale
     * chacune dans sa propre direction, et il n'y a plus ni ligne de base, ni
     * rang, ni grille ; à Decide, les deux tuiles qui doivent se confondre au
     * centre finissaient côte à côte. Seuls le chapeau et Publish, qui sont
     * les deux états dispersés, gardent leur dérive libre. */
    /* Publish en fait partie lui aussi : son mouvement est écrit en entier en
     * fonction du scroll, et une dérive qui continuerait par-dessus ferait
     * bouger les tuiles à l'arrêt — exactement ce que le scroll est censé
     * commander seul. Seul le chapeau, qui n'a aucun geste, garde la sienne. */
    float rigA = (b0 >= 1 && b0 <= 5) ? 1.0 : 0.0;
    float rigB = (b0 + 1 >= 1 && b0 + 1 <= 5) ? 1.0 : 0.0;
    float rig  = mix(rigA, rigB, bf);


    if(pr < 0.01) continue;

    // la dérive lente, et la parallaxe : les proches bougent plus
    /* La dérive et le pointeur n'agissent que sur les états DISPERSÉS — le
     * chapeau et Publish. Une composition ordonnée ne flotte pas : elle est
     * arrêtée, et son centre est le centre du cadre.
     *
     * Il y avait ici une dérive d'ensemble, censée faire respirer la
     * composition sans casser ses alignements. Elle ne les cassait pas, en
     * effet — toutes les tuiles bougeaient pareil — mais elle décalait le
     * TOUT par rapport au cadre, de quelques pixels qui se voient dès qu'un
     * mot centré passe devant. Le pointeur faisait la même chose. Une grille
     * qui respire n'est plus une grille centrée ; il fallait choisir. */
    float sp = mix(0.15, 1.0, z) * (1.0 - rig);
    c += vec2(sin(uTime * 0.055 + h3 * 6.28), cos(uTime * 0.041 + h1 * 6.28))
         * 0.055 * sp;
    c += uMouse * 0.05 * sp;
    ag += sin(uTime * 0.03 + h1 * 6.28) * 0.035 * (1.0 - rig);


    /* UNE SEULE forme, à une seule échelle près. Il y avait un jitter de
     * format de plus ou moins 10 % par tuile : deux tuiles à la même
     * profondeur n'avaient donc pas la même taille, et comme le rayon d'angle
     * était calculé sur sc et non sur b, elles n'avaient pas non plus le même
     * arrondi relatif. Le rayon est maintenant une fraction de la
     * demi-largeur, donc le coin est le même partout par construction. */
    /* LA TAILLE DE LA TUILE SUIT LE CADRE, SON FORMAT NON. Les coordonnees
     * sont normalisees par la HAUTEUR : une demi-largeur de 0,30 fait 22 % du
     * demi-cadre sur un ecran de bureau et 75 % sur un telephone en portrait.
     * Les trois tuiles de la decision s'y recouvraient d'un bord a l'autre.
     *
     * UN SEUL facteur, sur les deux axes. Il y en avait deux — la largeur
     * suivait le cadre, la hauteur beaucoup moins — pour eviter de reduire la
     * tuile a un timbre dans un cadre haut. Mais deux facteurs, c'est un autre
     * FORMAT : la feuille devenait un ruban, et une feuille a un format, c'est
     * meme tout ce qu'elle est. Elle rapetisse donc, et garde ses proportions
     * du grand ecran. */
    float kf = clamp(asp / 1.3, 0.34, 1.0);
    vec2 b = vec2(0.30, 0.42) * kf * sc;
    /* Le rayon est une FRACTION de la demi-largeur, donc le coin a le meme
     * dessin a toutes les profondeurs — c'est la raison d'etre de cette
     * ecriture, et elle ne change pas. Ce qui change, c'est la fraction :
     * a 3,4 % la feuille etait le seul objet a angle vif d'une page ou tout
     * le reste est adouci. A 8,5 % elle rejoint la famille — les grandes
     * surfaces du document sont arrondies de quatre a cinq pour cent — sans
     * devenir une pastille, ce qu'une feuille de papier n'est pas. */
    float rad = b.x * 0.085;
    vec2 q = rot(-ag) * (P - c);
    float sd = sdRect(q, b, rad);

    /* Le cercle de confusion pilote tout : la douceur du bord, le contraste
     * interne, la finesse de l'arête. Une feuille nette et une feuille floue
     * sont le même dessin à deux valeurs près. */
    float coc = clamp(abs(z - focus) * 3.2, 0.0, 1.0) * DOF;
    /* Le flou est proportionnel à la TAILLE de la tuile, pas absolu. En
     * unités de cadre, la même largeur de transition mangeait entièrement les
     * coins d'une petite tuile du fond — elle devenait un galet rond — et
     * effleurait ceux d'une grande du premier plan. Les deux ne lisaient plus
     * comme la même forme. Rapporté à la demi-largeur, le coin garde son
     * dessin à toutes les profondeurs. */
    float soft = b.x * (0.02 + coc * coc * 0.58);
    float m = (1.0 - smoothstep(-soft, soft, sd)) * pr;
    if(m < 0.004) continue;

    /* Le matériau est PLAT : un gris légèrement plus sombre que le fond, à
     * peine modelé. Le relief était une simulation d'éclairage, et il rendait
     * les tuiles molles ; ce qui les fait tenir, c'est leur arête franche et
     * leur ombre, pas un dégradé. */
    vec2 g = q / b;
    float lam = 0.5 - g.x * 0.05 - g.y * 0.09;
    lam = mix(lam, 0.5, coc * 0.6);
    vec3 sheet = mix(uBG * 0.975, uBG * 0.915, clamp(lam, 0.0, 1.0));

    /* LE VOILE. Chaque tuile en papier porte une NAPPE qui n'appartient qu'à
     * elle : trois foyers de couleur tirés de son propre index, donc stables
     * d'un bout à l'autre du parcours. Posée à huit pour cent, elle ne colore
     * pas — elle empêche seulement onze rectangles du même gris d'être
     * exactement le même objet, ce qui les faisait lire comme une texture
     * plutôt que comme une file.
     * Elle vient AVANT la teinte du tri, donc une tuile retenue la perd en se
     * colorant : la couleur reste le signe de ce qui est choisi, et rien ne
     * vient la troubler. */
    /* Elle ne touche PAS LES BORDS. Une nappe qui court jusqu'à l'arête donne
     * une tuile colorée : c'est le pourtour qu'on lit en premier, et deux
     * tuiles voisines se retrouvent à se toucher par deux teintes différentes.
     * Retenue au centre, la couleur reste une nuance posée dessus, et le gris
     * garde le dernier mot sur tout le contour. */
    float bord = max(abs(g.x), abs(g.y));
    float dedans = 1.0 - smoothstep(0.30, 0.92, bord);
    sheet = mix(sheet, nappe(g, fi * 4.7 + 1.3), VOILE * dedans);

    // la tuile retenue est la seule colorée, et seulement quand on la propose
    sheet = mix(sheet, tcol, tint);

    /* L'ombre portée met les plans dans l'ordre : sans elle, onze rectangles
     * clairs sur un fond clair forment une brume, pas une profondeur. Son
     * décalage et son étalement suivent la taille de la tuile, pour la même
     * raison que le flou du bord : une ombre de largeur fixe est un halo sur
     * une petite tuile et un liseré sur une grande. */
    float sh = 1.0 - smoothstep(-b.x * 0.14, b.x * (0.58 + coc),
                 sdRect(q + vec2(b.x * 0.10, -b.y * 0.072), b, rad));
    /* 0.90 et non 0.945 : l'ombre est ce qui SÉPARE deux tuiles voisines.
     * Trop faible, une file serrée se lit comme une seule masse et plus
     * personne ne compte les tuiles. */
    col *= mix(1.0, 0.90, sh * (1.0 - coc * 0.35) * pr);

    // un peu de transparence : les plans se lisent les uns à travers les autres
    col = mix(col, sheet, m * 0.92);
  }

  /* Le grain reste : il est symétrique, donc il ne déplace pas la valeur du
   * sol, et sans lui les grands aplats clairs prennent des marches.
   *
   * La vignette, elle, est partie. Elle servait à recentrer le regard sur un
   * fond crème ; sur un blanc franc elle assombrit les bords de quelques pour
   * cent, et la section d'avant, qui est un aplat, ne fait pas la même chose.
   * Le raccord entre les deux se lisait comme une salissure. */
  float gr = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (gr - 0.5) * 0.012;

  outColor = vec4(col, 1.0);
}`;

    return {
      name: "sheets",
      section: "#does",
      field: field,

      /* La page peut réclamer le canevas AVANT que la section n'occupe le
       * cadre. Sans ça, l'arbitrage ne le lui donne qu'à quatre-vingts pour
       * cent du trajet : le rideau s'ouvrait sur un sol vide et les tuiles
       * arrivaient d'un coup, à la toute fin. */
      hold() { return !!window.__sheetsHold; },

      init(a) {
        gl = a.gl;
        // (le tirage initial est fait plus bas, une fois les uniformes liés)
        prog = a.program(VS, FS);
        u = a.uniforms(prog, [
          "uRes", "uTime", "uBG", "uMouse", "uBeat",
          "uPubSize", "uPubRad", "uPubOrb", "uPubSpin", "uPubAway", "uPubSet",
          "uIn", "uCut",
          "uPick0", "uPick1", "uPick2",
        ]);
        tirer();
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
        /* LE TIRAGE, une fois par PASSAGE. Rejoué à chaque image, les tuiles
         * clignoteraient ; tiré une seule fois au chargement, la démonstration
         * serait fausse — ce qu'on veut montrer est justement que le tri peut
         * tomber autrement.
         *
         * Le passage se reconnaît à l'ABSENCE. Guetter l'avancement qui
         * retombe sous le premier temps ne marchait pas : hors de la section,
         * le module n'a plus le canevas et n'est plus appelé du tout, donc son
         * horloge gèle à la dernière valeur vue et ne redescend jamais. C'est
         * son retour qu'il faut guetter, pas son départ — un trou de plus d'un
         * quart de seconde entre deux images signifie qu'il est parti et
         * revenu, donc qu'un nouveau passage commence. */
        if (ctx.t - vuA > 0.25) tirer();
        vuA = ctx.t;

        // l'avancement courant, celui-là même qui part au shader
        const bt = window.__beat === undefined ? focus : window.__beat;

        /* Le mot ne se renverse que pendant les deux temps où il passe SUR la
         * tuile retenue — Decide et le début de Produce. Ailleurs il est sur
         * le fond clair, et un mot en papier y serait invisible à son tour.
         * C'est le module qui le dit, parce que lui seul connaît l'avancement
         * exact et la couleur tirée. */
        const surTuile = bt > 2.55 && bt < 4.05;
        const veut = window.__sheetsDark && surTuile;
        if (veut !== renverse) {
          renverse = veut;
          document.documentElement.classList.toggle('dsombre', veut);
        }

        mx += (tx - mx) * 0.06;
        my += (ty - my) * 0.06;

        /* Le temps courant, en continu. Amorti : un coup de molette brusque ne
         * doit pas faire sauter la matière d'un état à l'autre — c'est le
         * passage qui raconte, pas les poses. */
        const want = Math.max(0, Math.min(5, ctx.prog * 5));
        focus += (want - focus) * 0.075;

        gl.useProgram(prog);
        gl.bindVertexArray(vao);
        gl.disable(gl.BLEND);
        gl.uniform2f(u.uRes, ctx.w * ctx.dpr, ctx.h * ctx.dpr);
        gl.uniform3f(u.uBG, field[0], field[1], field[2]);
        gl.uniform1f(u.uTime, ctx.t);
        gl.uniform2f(u.uMouse, mx, my);
        /* Le diagnostic vit dans la page. L'avancement est amorti, donc une
         * capture à l'arrêt ne montre QUE les poses : la revue elle-même est
         * invisible depuis l'extérieur. __beat force le temps à une valeur
         * exacte et rend chaque image du tri inspectable. */
        gl.uniform1f(u.uBeat, window.__beat === undefined ? focus : window.__beat);
        gl.uniform1f(u.uPubSize, P.size);
        gl.uniform1f(u.uPubRad, P.rad);
        gl.uniform1f(u.uPubOrb, P.orb);
        gl.uniform1f(u.uPubSpin, P.spin);
        gl.uniform1f(u.uPubAway, P.away);
        gl.uniform1f(u.uPubSet, P.settle);
        // la page mène l'entrée en scène ; sans elle, tout est là
        gl.uniform1f(u.uIn, window.__sheetsIn === undefined ? 1 : window.__sheetsIn);
        gl.uniform1f(u.uCut, (window.__sheetsCut || 0) * ctx.dpr);
        gl.uniform3fv(u.uPick0, pick[0]);
        gl.uniform3fv(u.uPick1, pick[1]);
        gl.uniform3fv(u.uPick2, pick[2]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindVertexArray(null);
        gl.enable(gl.BLEND);
      },
    };
  })(),
);
