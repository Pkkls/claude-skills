---
name: flow-video
description: 'Générer des plans vidéo IA gratuits dans Google Flow (Veo 3.1) via Claude in Chrome depuis shots.json, les télécharger et ranger, jour après jour. Use when kil says « générer les plans », « continuer les vidéos Flow », « clips IA », épisode kil & Claude, Veo ou Flow.'
---

# Flow video

Génère les plans `todo` d'un `shots.json` dans Google Flow, télécharge chaque MP4,
le range en `<id>.mp4` à côté du JSON et passe le plan en `done`. Reprend là où il
s'est arrêté : relancer le skill le lendemain suffit.

Fichier de référence : `C:\Users\<user>\Downloads\02 - Projects\motion-studio\public\episode\shots\shots.json`
(épisode kil & Claude). Format :

```json
{ "flowProject": "<url du projet Flow>", "model": "Veo 3.1 - Lite",
  "style": "<bloc de style commun, finit par 'SHOT: '>",
  "shots": [{ "id": 1, "status": "todo|generating|done", "prompt": "..." }] }
```

## Faits mesurés (2026-10-14)

- Compte : Google de kil, déjà connecté dans Chrome. Onboarding et règles de
  confidentialité acceptés le 2026-10-14 (avec son accord).
- Gratuit : ~50 crédits/jour. **Veo 3.1 - Lite = 10 crédits par vidéo de 8 s**,
  donc 5 plans par jour. Fast et Quality coûtent plus : rester en Lite sauf demande.
- Sortie : 1280x720, 8 s, MP4 avec son. 1080p/4K = payant.
- Génération : environ 1 min 20 par plan.
- Chrome télécharge dans `C:\Users\<user>\Downloads\A--HANDOFFS CLAUDE\`, nom
  `<Titre_Flow>_<AAAAMMJJhhmmss>.mp4`. Retrouver le fichier par date (< 3 min).

## Déroulé

1. Lire `shots.json`, lister les plans `todo`. Rien à faire : le dire et s'arrêter.
2. Charger en un seul ToolSearch : `tabs_context_mcp, tabs_create_mcp, navigate,
   computer, browser_batch, get_page_text`. Extension déconnectée : assign_task à
   kil (« reconnecte l'extension Claude in Chrome »), stop.
3. Ouvrir `flowProject`. Écran « Choose an account » = déconnecté : assign_task à
   kil pour se connecter (jamais de mot de passe tapé par Claude), stop.
4. Panneau agent à droite (« Que voulez-vous créer ? ») : réglages (icône curseurs)
   = vidéo 16:9, x1, modèle `Veo 3.1 - Lite`, « Confirmer avant de générer : Toujours ».
5. Envoyer **un seul message** pour jusqu'à 5 plans : « Generate N separate 8-second
   16:9 videos (one per SHOT below), no text on screen. Common style: <style> SHOT
   <id>: <prompt> ... ». Pour la cohérence du robot, préciser « the same robot as in
   the previous video ». Envoyer avec le bouton flèche (Entrée seule ne part pas
   toujours).
6. L'agent répond « Voulez-vous que je lance la génération de N vidéos, qui coûtera
   X crédits ? » : vérifier X = 10 x N, cliquer **Approuver** (pas « Toujours
   approuver », qui change un réglage du compte). Passer les plans en `generating`.
7. Attendre en capturant toutes les 30 s (tuiles avec %). Un lot de 4 a été prêt en
   ~1 min. Télécharger **depuis la grille**, une tuile à la fois, avec une capture
   entre chaque étape (jamais d'enchaînement de clics à l'aveugle) :
   survoler la tuile (son titre apparaît en bas à gauche, ex. « Man fist bumping
   robot ») > icône ⋮ en haut à droite de la tuile > survoler « Télécharger » >
   **720p Taille d'origine**. Le menu s'ouvre vers le haut ou vers la gauche selon
   la position : relire la capture avant de cliquer. Ne jamais choisir 1080p/4K
   (« Mettre à niveau » = payant).
8. Associer chaque fichier à son plan par le titre Flow (pas par l'ordre de la
   grille, qui est mélangé). Déplacer vers `<dossier du JSON>\<id>.mp4`, vérifier avec
   `ffprobe` (1280x720, 8 s), passer le plan en `done`. Puis une planche de contrôle
   (2 images par plan, ffmpeg xstack) et la regarder.
9. Fin de quota (l'agent annonce des crédits insuffisants) : laisser le reste en
   `todo`, dire combien restent et que la suite part demain.
10. Tous les plans `done` : prévenir kil, et pour l'épisode, monter les clips dans
    `src/episode` (Remotion) avec la partition et les répliques réelles.

## Règles

- Le téléchargement des plans d'un `shots.json` est autorisé par kil (2026-10-14,
  épisode kil & Claude). Un nouveau projet ou un nouveau fichier = redemander.
- Jamais de visage réel ni de nom de streamer ou créateur dans un prompt. kil est
  filmé de dos ou en silhouette tant qu'il n'a pas donné sa description.
- Ne jamais toucher aux options payantes (Upgrade, 1080p, 4K, « Mettre à niveau »).
- Plan raté (robot incohérent, texte incrusté) : le régénérer coûte 10 crédits ;
  le noter dans `shots.json` (`"status": "todo", "note": "..."`) plutôt que de
  brûler le quota du jour sans le dire.

## Erreurs déjà rencontrées

- 2026-10-14 : nommer un personnage « KIL » dans le prompt a fait apparaître le
  mot « KIL » à l'image (coin du plan, écran d'ordinateur). Écrire « the young man »,
  jamais un nom propre.
- 2026-10-14 : « always seen from behind, face never clear » n'est pas respecté par
  Veo Lite : le visage apparaît, et change d'un plan à l'autre. Pour un personnage
  stable, utiliser l'onglet « Personnages » de Flow (référence réutilisable).
- 2026-10-14 : un enchaînement aveugle (ouvrir une vidéo > télécharger > retour)
  a fini sur l'accueil de Flow sans rien télécharger. Le bouton retour d'une vidéo
  ouverte ne ramène pas toujours au projet : re-`navigate` vers `flowProject`.

- « L'agent est actuellement très sollicité » : le message reste dans la zone de
  saisie, le renvoyer avec le bouton flèche.
- L'agent peut rester muet plus d'une minute sur une question (ex. crédits
  restants) : ne pas l'attendre, envoyer directement la demande de génération,
  la confirmation affiche le coût.
