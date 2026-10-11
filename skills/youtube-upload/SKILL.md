---
name: youtube-upload
description: Mettre en ligne une vidéo sur la chaîne YouTube de kil (pkkls) puis, sur son ordre, la poser sur la fiche Chrome Web Store et l'envoyer pour examen, le tout sans intervention. À utiliser quand kil demande d'uploader une vidéo sur YouTube ou de la mettre sur le store Chrome.
---

# Mise en ligne YouTube

Parcours vérifié le 2026-10-10 (promo Kick Chat Translator, 7 Mo, 15 s,
https://youtu.be/Uxz8U-CcDQ4). La demande de kil vaut autorisation de publier
CETTE vidéo ; chaque nouvelle vidéo demande sa propre demande.

## Règles

- Visibilité par défaut : **Non répertoriée**. Publique seulement si kil le dit.
- Public : toujours « Non, elle n'est pas conçue pour les enfants ».
- Jamais supprimer une vidéo (ni l'ancienne, ni un essai) : c'est à kil.
- Ne rien toucher d'autre dans Studio (avertissements, monétisation, playlists).

## Pré-requis

- Navigateur : **DEBUG CHROME**, le Chrome lancé avec
  `--user-data-dir=C:\Users\<user>\.config\kick-chat-translator\cws-chrome --remote-debugging-port=9222`.
  Il est connecté à YouTube (chaîne pkkls, @Pkkls2) et au dashboard du Chrome Web Store.
- Si plusieurs navigateurs sont connectés au MCP et aucun n'est choisi, l'outil impose
  AskUserQuestion. Proposer l'écran de confirmation (`switch_browser`) : kil clique
  Connect dans DEBUG CHROME. Une fois choisi, tout le reste se fait sans lui.
- Fichier de **10 Mo maximum** avec `file_upload` du MCP. Au-delà, la voie CDP
  ci-dessous, sans limite et sans clic de kil (vérifiée le 2026-10-10 avec 21,8 Mo).

## Plus de 10 Mo, ou sans le MCP : CDP sur DEBUG CHROME

DEBUG CHROME expose CDP sur le port 9222 (`http://127.0.0.1:9222/json/version`
répond). Le script ouvre l'import dans un nouvel onglet, pose le fichier par
`DOM.setFileInputFiles`, coche « pas pour les enfants », fait Suivant ×3, coche la
visibilité, attend la fin de l'envoi, enregistre et relit le lien puis l'oEmbed :

```
node C:\Users\<user>\.claude\skills\youtube-upload\upload-cdp.mjs "<chemin absolu .mp4>" UNLISTED
```

Il s'arrête sans rien enregistrer si la visibilité n'est pas cochée. Captures de
contrôle dans `yt-upload-shots/` à côté du script. Le titre vient du nom du
fichier : copier le fichier sous le nom voulu avant (`kick-chat-translator-promo.mp4`
donne « kick chat translator promo »). Fermer ensuite l'onglet qu'il a ouvert.

## Étapes

1. `navigate` https://studio.youtube.com, capture d'écran : vérifier « Votre chaîne : pkkls »
   en haut à gauche. Autre chaîne = stop, le dire à kil.
2. Clic sur **Créer** (en haut à droite), puis **Importer des vidéos**.
3. `find` "file input element for selecting video files to upload", puis
   `file_upload` avec ce ref et le chemin absolu. Ne jamais cliquer
   « Sélectionner des fichiers » : le sélecteur natif est invisible pour le MCP.
4. Détails : le titre est pré-rempli depuis le nom du fichier (tirets en espaces).
   Le remplacer seulement si kil a donné un titre. Le lien `https://youtu.be/<id>`
   s'affiche déjà à droite : le noter.
5. `find` "radio button 'Non, elle n'est pas conçue pour les enfants'", `scroll_to`
   puis `left_click` sur ce ref. Sans ce choix, Suivant ne passe pas.
6. **Suivant** trois fois (en bas à droite du dialogue) : Éléments vidéo, Vérifications
   (attendre « Droits d'auteur : Aucun problème détecté »), Visibilité.
7. `find` "radio button 'Non répertoriée'" (ou Publique / Privée), `left_click`,
   puis `zoom` sur le bloc pour voir le bouton coché.
8. **Enregistrer**. Le dialogue « Vidéo mise en ligne » redonne le lien : le relire,
   puis **Fermer**.
9. Vérifier hors navigateur :
   `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json`
   doit répondre 200 avec `author_name` pkkls.

Le traitement HD continue quelques minutes après l'enregistrement ; le lien
fonctionne tout de suite.

## Rendre à kil

Les liens `https://youtu.be/<id>` et `https://www.youtube.com/watch?v=<id>`, la
visibilité, la chaîne, le fichier envoyé (chemin absolu) et le résultat de
l'oEmbed.

## Coller le lien dans le Chrome Web Store (étape séparée)

Sur ordre de kil (« mets-le sur le store », « upload sur chrome »), tout se fait
sans lui, en CDP sur le port 9222 de DEBUG CHROME (le dashboard refuse toute
extension, Claude in Chrome compris). Scripts dans `cws/` à côté de ce fichier,
vérifiés le 2026-10-10 (soumission acceptée, PENDING_REVIEW) :

1. Brouillon propre : `node cws/cws-video.mjs state` affiche l'onglet Package ;
   la version « Brouillon » doit égaler la « Publié ». Sinon stop, demander.
2. Lien vidéo dans les deux champs (internationale + localisée de la langue par
   défaut), enregistrement, relecture après rechargement :
   `node cws/cws-video.mjs setvideo "https://www.youtube.com/watch?v=<id>"`
   La sortie `after reload` doit montrer `<id>` dans les deux champs.
3. Envoi : `node cws/cws-click.mjs "Envoyer pour examen"` deux fois (bouton de la
   page, puis bouton du dialogue de confirmation).
4. Si le bouton reste grisé ou que le dialogue dit « Envoi impossible » :
   `node <repo>/scripts/stores/cws-listing.mjs why` lit la raison. Un champ texte
   se corrige avec `node cws/cws-setfield.mjs <onglet> "<valeur actuelle>" "<nouvelle>"`
   (onglets : `edit`, `edit/privacy`), qui relit après rechargement.
5. Preuve : `node <repo>/scripts/stores/cws.mjs status` doit dire
   `submittedItemRevisionStatus.state: PENDING_REVIEW`.

`<repo>` = `C:\Users\<user>\Downloads\kick-chat-translator`. Captures de contrôle :
`node cws/cws-shot.mjs out.jpg` ; état et boutons : `node cws/cws-peek.mjs`.

## Erreurs déjà commises (à ne pas refaire)

- 2026-10-10 : `file_upload` du MCP refuse au-delà de 10 Mo ; ne pas réencoder la vidéo validée (kil l'a validée telle quelle), passer par `upload-cdp.mjs`.
- 2026-10-10 : DEBUG CHROME se déconnecte du MCP dès qu'on sélectionne un autre navigateur ; CDP sur 9222 marche toujours (`/json/version`).
- 2026-10-10 : uploader avant la validation de kil a produit une vidéo jugée « affreuse » restée en ligne (non répertoriée) ; toujours faire valider le rendu AVANT l'upload.
- 2026-10-10 : le formulaire du dashboard ignore `Input.insertText` ; le setter natif `value` + événements `input`/`change`/`blur` marche (c'est ce que fait `cws-setfield.mjs`).
- 2026-10-10 : un `[role=dialog]` invisible et vide traîne sur la page ; `cws-click.mjs` l'ignore. Le clic souris simulé sur « Envoyer pour examen » n'ouvre rien, le `.click()` de l'élément si.
- 2026-10-10 : URL de confidentialité GitHub `blob/...` = 503 pour le robot Google, donc « Impossible d'accéder au lien vers les règles de confidentialité ». Utiliser `https://raw.githubusercontent.com/Pkkls/kick-chat-translator/master/PRIVACY.md` (en place depuis).
- Détails : journal du 2026-10-10 dans`kick-chat-translator/.claude/skills/publish-stores/SKILL.md` (frappe réelle, dialogue vide, URL de confidentialité).
