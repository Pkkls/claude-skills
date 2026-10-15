---
name: courses-en-ligne
description: 'Faire les courses en ligne de kil (Carrefour, Courses U, comparaison Leclerc/Auchan/Picard) : qui livre, promos, panier par l''API, livraison offerte, page de recettes. Use when kil says "fais/commande mes courses", "refais le panier", "promos", "code promo", "le moins cher", "qui livre", or mentions Carrefour, Super U, drive.'
---

# Courses en ligne

Méthode rodée le 2026-10-13/14 sur 6 paniers refaits avant validation. Les goûts de kil, ses refus et son matériel sont dans la mémoire `courses-carrefour` : la lire avant de choisir un seul produit.

## Règles dures

- Jamais payer, jamais saisir de mot de passe, jamais créer de compte (même « compte test », même autorisé) : c'est kil qui se connecte et qui paie. Lui assigner une tâche `assign_task` pour le paiement, une seule ouverte à la fois.
- Adresse de livraison : celle enregistrée sur le profil du compte, jamais écrite dans un fichier.
- Deux paniers prêts chez deux enseignes : dire clairement d'en payer un seul.
- Un onglet sur la page de paiement appartient à kil : travailler dans un nouvel onglet, ne jamais le faire naviguer.
- Protection anti-robot (DataDome « Access temporarily restricted », CAPTCHA) : s'arrêter, passer par une recherche web, ne pas contourner. Un 429 : ralentir, pas forcer.

## Ordre de travail

1. **Mémoire** `courses-carrefour` : goûts, produits retirés à ne plus proposer, matériel (air fryer, autocuiseur, induction + wok), seuils.
2. **Qui livre** (si la question se pose) : tester l'éligibilité sur chaque site avec le code postal du profil. <ville> <code-postal> au 2026-10-14 : Carrefour oui, Super U oui (Shopopop), Auchan oui (collaboratif, 50 € min), Picard oui (6 €, offert dès 100 €), Leclerc non (drive <commune-voisine-1> seulement), Intermarché bloqué par anti-robot, Monoprix carte de vérif qui ne charge pas.
3. **Partir des promos, pas des produits.** Récupérer la liste complète des promos du magasin, puis toutes les rubriques spéciales (voir par site). Chercher un produit puis regarder s'il est en promo a été rejeté (« tu ne profites pas des promotions »).
4. **Maximiser les catégories** : tous les rayons alimentaires (y compris petit-déj, sucré, pain, boissons, bière), hygiène, entretien. Écarter bébé, animalerie, maison, électroménager, high-tech, textile.
5. **Quantités qui déclenchent les offres** : « 2e à -X % » → prendre 2, « 3 pour 2 » → 3.
   **Maximiser la cagnotte** (demande du 2026-10-14) : à produit équivalent et prix proche, prendre la version « X % en € Carte U » ; comparer prix moins cagnotte. Signaler aussi les opérations à date (bon d'achat boucherie le jour J) et le créneau qui les déclenche.
6. **Entretien en Prix mini / premier prix** : les marques en promo restent plus chères (sacs poubelle promo 3,95 € contre 0,58 €).
   **Jamais de charcuterie premier prix** (Prix mini, Eco, Simpl, sans marque pas chère : jambon, rosette, saucisson, lardons, saucisses) : « c'est le pire ». Prendre une marque ou une gamme supérieure (U Saveurs, Label Rouge, IGP, local), quitte à en prendre moins.
7. **Diversité** : viande + féculent comme base, mais pas fade : plusieurs viandes (mijotée, grillée, marinée épicée), poisson, légumes pour wok/poêle, une spécialité locale, du petit-déj. Pas d'asiatique (nems, ramen, soja, sriracha retirés), mais le poulet mariné épicé est voulu.
8. **Viser le seuil de livraison offerte NET** (après remises) avec une petite marge ; recompter après chaque modification.
9. **Relire le panier réel** (noms + quantités) après chaque lot d'ajouts : la recherche par mot-clé ajoute des faux amis (voir Journal).
10. **Recettes** : une page artifact (filtre par appareil, température et temps sur chaque fiche, « à avoir à la maison »), republiée à chaque nouveau panier.
11. Quand kil supprime des produits : relire le panier, noter les retraits dans la mémoire (à ne plus proposer), recombler jusqu'au seuil avec ce qu'il a gardé. S'il dit « il me plaît pas » sans détail : demander ce qui ne va pas (AskUserQuestion) avant de refaire.

## Carrefour (carrefour.fr)

Toutes les requêtes depuis un onglet carrefour.fr connecté, en `fetch` same-origin avec `{'Accept':'application/json','x-requested-with':'XMLHttpRequest'}`.

- Recherche : `GET /s?q=<mots>` → `data[].attributes` (title, ean, format, `offers[ean][offerServiceId].attributes.price.{price,perUnit,perUnitLabel}`, `availability.purchasable`, `promotion`).
- Promos du magasin : `GET /promotions?page=N` (30/page, ~119 pages). Écarter `promotion.isLoyalty` (cagnotte) si on veut l'immédiat.
- Panier : `GET /api/cart` → `cart.items[].products[]` (`counter`, `product.attributes.ean`, `offerServiceId`), `totalProductsPrice`, `totalDiscount`, `totalFees`, `totalAmount`.
- Ajouter / fixer une quantité : `PATCH /api/cart` body `{trackingRequest:[{productId:ean,quantity:n,position:1,listName:'search',source:'search'}], items:[{basketServiceId:offerServiceId, counter:n, ean, subBasketType:'drive_clcv'}]}`. `counter` est **absolu**.
- `counter: 0` **ne supprime pas** (200 mais le produit reste). Retirer un produit : bouton « Supprimer » ou « − » dans `/cart/driveclcv`. Vider : bouton « Vider mon panier » (modale du site) ou `DELETE /api/cart`.
- Livraison (<entrepot-carrefour> pour <ville>) : minimum 60 €, frais 7,90 € sous 100 €, 4,90 € de 100 à 150 €, offerte dès 150 € **net de remises**.
- Code `BINGO20` (20 € dès 80 €) : première commande en ligne seulement, refusé sur le compte de kil.

## Super U / Courses U (coursesu.com)

Magasin : Super U <ville> (`/drive-superu-<ville>`), livraison Shopopop, offerte dès 150 €.

- Rubriques à scanner (`/c/<slug>?start=N&sz=36`, ~19 tuiles de carrousel en plus par page, dédoublonner par `data-pid`) : `promotions`, `prix-coutant`, `prix-mini`, `produits-locaux-et-regionaux`, `20-jours-plus`, `produits-bleu-blanc-coeur`, `nouveautes`, `bio`, plus les **opérations datées** listées dans le menu (ex. `en-retrait-le-15-octobre--34-en-bon-dachat-sur-la-boucherie-volaille` : 34 % de toute la viande fraîche en bon d'achat si livraison ce jour-là → le dire à kil pour qu'il choisisse ce créneau). « Idées repas » = pages de recettes, pas de produits.
- **Requêtes séquentielles avec ~800 ms de pause** : en parallèle le site renvoie 429.
- Tuile produit : `.product-tile`, `data-pid`, prix « 1,67 € », prix unitaire « 4,18 €/kg », badges « X% EN € CARTE U » (cagnotte), « -50% SUR LE 2ÈME », « PRIX MINI ».
- Recherche : `GET /recherche?q=<mots>`.
- Ajouter : `POST /on/demandware.store/Sites-DigitalU-Site/fr_FR/Cart-AddProduct?format=ajax` (le `?format=ajax` est obligatoire depuis le 2026-10-14 : sans lui, réponse 200 en page HTML et rien n'est ajouté ; la bonne réponse commence par `<script> var dataLayer = {"cart":...`) (form-urlencoded `pid`, `Quantity`, `quantity`, `csrf_token` lu dans `input[name=csrf_token]`). Ajouter un produit déjà présent incrémente.
- Retirer : sur `/panier`, bouton `aria-label="Retirer une quantité de <nom>"`. Le DOM se re-rend après chaque clic : refaire `find` avant chaque retrait. « Supprimer le produit » par ref ne fait rien ; un clic par ref sur « − » marche parfois. Méthode fiable : `scroll_to`, attendre 2 s (la page se recale d'environ 40 px une fois hydratée, le lien « Ce produit est idéal avec » apparaît), capture, clic aux coordonnées du « − ». Vérifier par rechargement de `/panier`, pas par l'état de la page (une ligne à 0 garde son bouton jusqu'au rechargement).
- Panier : `/panier` (total estimé, « Plus que X € pour la livraison offerte », « Je cagnotte X € Carte U »). Vider : bouton « Vider le panier » + « confirmer ».
- Modale « Tic tac.. Votre choix de créneau arrive à terme » : cliquer « Renouveler mon créneau » (garde le choix de kil).
- **Offres fidélité personnalisées** : `/espace-client?ec-page=fidelite&ec-section=offres` (connecté). À chaque commande, les activer toutes (gratuit, ne paie que si acheté) : boutons « Activer l'offre » cliqués un par un en JS avec ~900 ms de pause, puis vérifier « Activée(s) : N ». 44 offres le 2026-10-14 (jusqu'à 28,30 €), surtout des marques : ne les ajouter au panier que si le produit sert vraiment et que prix moins offre reste bon.
- Codes promo : lire `/conditions-generales-offres.html` ; les codes y sont souvent réservés à un magasin précis (AUTOMNE15 = Vertou seulement).

## Comparer deux enseignes

Comparer au prix au kilo/litre sur les quantités du panier de référence, avec des correspondances strictes (inclure ET exclure : `/huile.*colza/` sans `/mayonnaise|vinaigrette/`). Écarter les lignes où l'équivalent est faux plutôt que de les compter, et dire combien de lignes sont comparées sur le total. Le premier prix (Eco, Prix mini) explique une bonne part des écarts : le préciser. Résultat 2026-10-14 : Leclerc ~20 % moins cher mais sans livraison ; Super U ~5 % moins cher que Carrefour, compensé par les promos Carrefour.

## Journal des erreurs

- 2026-10-13 : chercher les produits puis vérifier la promo → « tu ne profites pas des promotions ». Partir de la liste des promos.
- 2026-10-13 : panier « fadasse », « pas original », « mauvais produits » → refait 4 fois. Demander ce qui ne va pas avant de refaire ; diversifier dès le premier jet (mijoté, mariné, poisson, local, petit-déj).
- 2026-10-13 : Carrefour `counter: 0` laissait les produits en place (36 au lieu de 28). Retirer par l'interface, puis recompter.
- 2026-10-13 : le seuil de 150 € est calculé après remises : à 150,53 € brut, les frais restaient à 4,90 €.
- 2026-10-14 : faux amis de la recherche par mot-clé : « huile d'olive » → taboulé à l'huile d'olive, « fleur de sel » → chocolat à la fleur de sel, « papier toilette » → papier toilette humide, « lessive » → lessive soin noir, « colza » → mayonnaise, « cordon bleu surgelé » → cordon bleu frais, « parmesan » → hachis parmentier. Ancrer les regex sur le début du nom (`^U Lessive liquide.*Fraîcheur`), lister les exclusions, relire les noms ajoutés.
- 2026-10-14 : « Saucisse de Toulouse purée MARIE » est un plat préparé, pas de la viande crue. Pour une viande à cuisiner, exiger le rayon boucherie ou exclure `/pur.e|cuisin|plat|lentille/`.
- 2026-10-14 : charcuterie premier prix (jambon cru Prix mini, lardons Prix mini) refusée net : « c'est le pire ». Toujours une marque ou une gamme supérieure.
- 2026-10-14 : naviguer dans l'onglet efface les données gardées dans `window` (scan des promos perdu). Faire le scan et les ajouts dans le même chargement de page, ou tout stocker dans `localStorage`.
- 2026-10-14 : les outils Chrome bloquent une sortie qui contient de longues suites de chiffres ou du texte proche d'un cookie (`[BLOCKED: Cookie/query string data]`). Ne jamais imprimer les EAN, nettoyer les sorties (`replace(/[^\w\s%,.]/g,' ')`), garder les identifiants dans `window`.
- 2026-10-14 : « le panier a expiré » = session U expirée (page de connexion) et créneau perdu, pas panier vidé. Le panier restait, avec une section « Produits indisponibles » (produits frais « Bientôt disponible ») : les supprimer (« Tout supprimer ») et les remplacer, au lieu de tout refaire. Après une reconnexion, le `csrf_token` d'un onglet ouvert avant est périmé : refaire les ajouts depuis un onglet rechargé après la connexion, avec le scan gardé dans `localStorage`.
- 2026-10-14 : toujours vérifier un ajout en relisant `/panier` (nombre d'articles), jamais sur le seul statut 200.
- 2026-10-14 : une exécution JS de plus de 45 s gèle l'outil : lancer les boucles longues en arrière-plan (`(async()=>{...})()` + drapeau `window.__done`) et lire l'état ensuite.
