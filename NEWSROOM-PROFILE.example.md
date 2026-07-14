---
# ─────────────────────────────────────────────────────────────────────────
#  Profil de rédaction — rempli UNE FOIS, réutilisé sur CHAQUE visuel
#  Copiez ce fichier en `NEWSROOM-PROFILE.md` à la racine de votre projet,
#  puis remplacez les valeurs par les vôtres. Tout est optionnel.
# ─────────────────────────────────────────────────────────────────────────

palette:                      # les couleurs de votre charte ; la 1re = principale
  - "#0A5C36"                 # vert maison (couleur principale des visuels)
  - "#C8102E"                 # une 2e couleur de série
accent: "#C8102E"             # couleur d'accent (mise en avant)

source:                       # attribution par défaut sous chaque visuel
  name: "Heidi.news"          # le nom affiché (« Source : Heidi.news »)
  url: "https://heidi.news"   # lien optionnel

lang: "fr"                    # langue par défaut des livrables (fr, en, de, it…)
                              # le crédit suit automatiquement la langue (« Source : » en fr)

theme: "light"                # thème des CARTES : "dark" = fond sombre sur chaque carte,
                              # "light" (défaut) = fond clair. Réglé une fois pour une
                              # rédaction au thème sombre. (Un choix par-visuel prime.)
---

# Comment remplir ce profil

Ce fichier définit le **style maison** que Atelier réutilise sur tous vos visuels, pour ne pas
avoir à le redonner à chaque fois. Chaque visuel peut toujours **surcharger** une valeur au cas
par cas — ce que vous mettez ici sert de **défaut**.

- **palette** — les couleurs de votre charte graphique, en codes hexadécimaux (`#RRGGBB`). La
  première est la couleur **principale**. Astuce : votre graphiste ou votre charte les connaît ;
  sinon, un outil comme « pipette de couleur » vous les donne depuis votre logo.
  > ⚠️ Si une couleur maison est difficile à distinguer pour un daltonien, Atelier la **garde
  > quand même** (c'est votre marque) et vous le **signale** à la relecture — à vous de trancher.

- **accent** — la couleur que vous utilisez pour **mettre en avant** un élément.

- **source** — le nom de votre rédaction (ou de la source de données) affiché sous le visuel, et
  un lien optionnel. Si un article cite une autre source, celle-ci **prend le dessus**.

- **lang** — la langue par défaut de vos publications (`fr`, `en`, `de`, `it`…). Elle règle
  automatiquement le format du crédit (« Source : » en français, « Source: » en anglais).

- **theme** — le fond de vos **cartes** : `dark` pour un fond sombre sur chaque carte (une rédaction
  au thème sombre le règle une fois), `light` (défaut) pour un fond clair. Un choix par-carte prime
  toujours. _(S'applique aux cartes map-native et map-scrolly ; le fond sombre Datawrapper arrivera
  plus tard.)_

_Couleurs, source, langue et thème de carte sont pris en charge aujourd'hui. Un gabarit de crédit
personnalisé, le logo et la police de caractères arriveront plus tard._
