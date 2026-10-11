---
name: promo-video
description: Faire une vidéo de présentation d'un produit de kil (extension, app, site) avec Remotion et video-shotcraft, de la capture de la vraie interface au MP4 validé. À utiliser quand kil demande une vidéo promo, un trailer, une vidéo de store ou de « refaire la vidéo de présentation ».
---

# Vidéo promo

Projet de référence : `C:\Users\<user>\Downloads\02 - Projects\motion-studio` (Remotion 4,
skills Remotion + video-shotcraft installés). Film Kick Chat Translator 2026-10-10 :
`src/film/` (timeline, parts, scenes, Film), validé par kil, en ligne sur
https://youtu.be/_KleHb1_VUc.

## Ordre (chaque étape a coûté une version ratée quand elle a été sautée)

1. Lire `video-shotcraft` (SKILL.md puis `references/pipeline.md`). Carte blanche = mode
   « création libre autonome » ; sinon proposer les modes.
2. Brief + direction tirée des tokens du produit (couleurs, police, rayons du code).
3. Storyboard avec frames, texte exact et sons, AVANT le code.
4. Vraies captures du produit, jamais d'interface redessinée : `scripts/capture.mjs`
   lance le build de l'extension dans Chromium sur un salon inventé, moteur de
   traduction répondu en local, en 4x (`deviceScaleFactor: 4`).
5. Montage plan par plan, planches de contrôle (ffmpeg `select=eq(n\,N)`, `tile`) à
   chaque passe, coupes regardées image par image.
6. Son après l'image : musique et effets de `video-shotcraft/assets/audio`
   (Mixkit, URL tracée) ; mesurer `ebur128` : viser -16 LUFS, crête < -1 dBTP.
7. Rendu, puis **validation de kil sur le MP4** avant tout upload (skill youtube-upload).

## Erreurs déjà commises

- 2026-10-10 : v1 dessinée en canvas sans storyboard validé ni vraie interface :
  « c'est affreux ». Repartir des captures réelles et de video-shotcraft.
- 2026-10-10 : v1 uploadée sur YouTube avant validation ; elle y reste (non répertoriée).
- Mix trop bas (-20 LUFS) : la crête venait de deux effets sur la même image (Tab) ;
  baisser ceux-là, monter la musique, remesurer.
- Le flash de transition doit retomber de l'autre côté de la coupe, sinon saut au noir.
- Une valeur mesurée sur la page de capture (hauteur 1800) réutilisée avec la hauteur
  du film (860) a donné des marges négatives : garder les mesures de capture à part.
- Un contour « trail » interpolé sans borne gauche s'affichait dès l'image 0 :
  toujours `[0, x, y]` avec la valeur de départ explicite.
- Le Playwright du repo kick-chat-translator exige `UX_KIT=C:/Users/<user>/.claude/ux-ui-agent-skills`.
- L'extension envoie ses lots Google en `POST translate_a/t` (q répété, réponse
  `[[traduction, langue], ...]`) : un faux moteur qui ne gère que `GET translate_a/single`
  laisse les lignes non traduites.
- `npx` dans Bash est réécrit par le hook RTK (« Unknown command ») : lancer npx en PowerShell.
- Relecture indépendante (agent design-critic) : la lancer tôt, pas après la validation.
