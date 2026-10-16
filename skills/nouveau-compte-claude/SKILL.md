---
name: nouveau-compte-claude
description: "Bascule sur un nouveau compte Claude (Max/Pro) sur le PC de kil : ce qui suit le compte, ce qui reste, gestes de kil, reprise complete du contexte des anciens comptes (sessions CLI et desktop, memoires, git). Use when kil dit \"nouveau compte\", \"j'ai change de compte\", \"fresh compte\", \"reprend les personnalisations\", \"retrouve ou on s'est arrete\" apres un /login, ou avant de changer de compte."
---

# Nouveau compte Claude

Un seul moteur fait tout le diagnostic, sur le PC, sans reseau et sans tokens : `compte.py`. Le lancer, lire sa sortie, ne pas refaire a la main ce qu'il couvre.

```
python ~/.claude/skills/nouveau-compte-claude/compte.py              # diagnostic + reprise 14 j
python ~/.claude/skills/nouveau-compte-claude/compte.py --contexte   # tout l'historique, index JSON
python ~/.claude/skills/nouveau-compte-claude/compte.py --jours 60   # autre fenetre
python ~/.claude/skills/nouveau-compte-claude/compte.py --snapshot   # AVANT de changer de compte
python ~/.claude/skills/nouveau-compte-claude/compte.py --selftest   # 11 assertions sur un faux HOME
```

## Ce qui suit le compte, ce qui reste (mesure le 2026-10-16, 3 comptes)

Reste sur le PC, rien a faire : tout `~/.claude` (CLAUDE.md, RTK.md, PUBLIC_WRITING.md, memory-global, memoires de projet, skills, commands, hooks, plugins, settings.json, scheduled-tasks), les MCP locaux de `~/.claude.json` (playwright, lasso), les transcripts `~/.claude/projects/<slug>/<id>.jsonl`, les taches human-in-the-loop ouvertes.

Change avec le compte :
- `oauthAccount` et `githubWebConnectionStatusCache` dans `~/.claude.json` : GitHub web repasse a `not_connected`.
- Connecteurs claude.ai (Gmail, Spotify, Claude Docs...) : `claudeAiMcpEverConnected` est fusionne entre comptes, il dit quoi rebrancher, pas ce qui l'est. L'etat reel : les outils `mcp__claude_ai_<Nom>__*` charges dans la session.
- Session de l'extension Claude in Chrome (l'appairage local `chromeExtension` reste).
- App desktop : barre laterale, Cowork, scratch-workspaces sont ranges par compte dans `AppData/Roaming/Claude/<type>/<uuid compte>/`. Le nouveau compte n'y voit rien. `compte.py` relit ces titres pour tous les comptes.
- Skills claude.ai synchronises : `~/.claude/plugins/synced/<org>_<compte>/`. Aucun skill perso de kil n'y vit (seulement `cowork-plugin-management`, standard).
- Cote serveur, hors de portee du PC : routines cloud, artefacts, conversations claude.ai de l'ancien compte. Les lister seulement si kil les demande, depuis l'ancien compte.

## Avant de changer (si kil previent)

`compte.py --snapshot` : copie `~/.claude.json` en `~/.claude.json.acct-<email>.bak`, reference du prochain diagnostic. Sans instantane, le moteur compare au `.claude.json.*` le plus recent d'un autre compte, il y en a toujours un (backups automatiques).

## Apres le changement

1. `compte.py`. Il donne : compte courant et reference, socle local, connecteurs a garder et refuses, MCP manquants, puis la reprise par projet, puis `# A faire par kil`.
2. Pour chaque ligne `A faire par kil` : verifier `list_tasks` (pas de doublon, 5 taches ouvertes maximum), puis une tache `assign_task`. Ouvrir la page moi-meme, ne jamais donner une commande a taper quand une page peut etre ouverte :
   - GitHub : `start https://claude.ai/code`, kil relie GitHub.
   - Chrome Web Store (si une release KCT est en cours) : `node scripts/stores/cws-listing.mjs launch` dans `~/Downloads/kick-chat-translator`, kil se connecte dans la fenetre Brave de debug.
3. Choix de kil, a respecter a chaque bascule : il REFUSE de rebrancher Gmail et Spotify et de reconnecter l'extension Claude in Chrome, et il a refuse la tache de debug terminal (#78). Ne pas les assigner, une ligne au plus. Opera : jamais (`feedback_no_opera`).
4. Si `/status` a lance le skill infra au lieu de la commande integree du compte : le dire en une ligne, ne pas lancer le check infra.
5. Prendre l'instantane du nouveau compte (`--snapshot`) une fois le diagnostic fait.

## Reprise du contexte (100 %)

- Couverture verifiee : `--contexte` indexe chaque transcript local (411/411 le 2026-10-16), avec titre desktop et compte d'origine quand l'app desktop l'a lancee, premiere et derniere demande de kil, memoires et drapeaux (EN PAUSE, STANDBY, REPRISE, BLOQUE, RESTE, "reste, dans l'ordre"), etat git du projet. Index : `~/.claude/state/contexte-comptes.json`.
- Une session d'un ancien compte se reprend depuis le nouveau avec tout son contexte : `cd "<dossier de reprise>" ; claude --resume <id>` (verifie le 2026-10-16 : session `3464b6ad` reprise, premier message cite mot pour mot). Le dossier de reprise est celui dont le slug nomme le dossier du transcript, PAS forcement celui ou la session a ete lancee : l'app desktop lance dans un scratch-workspace mais Claude Code range transcript et memoire sous le projet git (mesure sur vodloop). `compte.py` calcule ce dossier.
- Une session lancee depuis `~` qui a travaille dans un projet (`-> travaillait dans ...`) a sa memoire dans `~/.claude/projects/C--Users-kil/memory`, pas dans celle du projet. Chercher le projet sous les deux.
- Pour lire la fin d'un transcript : un script qui lit la queue du fichier (`compte.py` le fait), jamais Read d'un .jsonl de plusieurs dizaines de Mo.
- Une consigne donnee juste avant la coupure (ex. "publie uniquement en anglais") reste valable a la reprise. Puis lire la memoire du projet et reprendre a l'etape notee.
- Seule perte reelle mesuree : `cleanupPeriodDays` fait supprimer par Claude Code les transcripts plus vieux que sa valeur. Elle valait 90 (confinement CVP) ; kil l'a passee a 3650 le 2026-10-16 en connaissance de cause. Verifier qu'elle y est toujours. `--contexte` liste les entrees de la barre laterale desktop dont le transcript a disparu (60 le 2026-10-16, toutes de mai a juillet 2026) : non reprenables, rien a voir avec le compte.

## Pieges

- Un heredoc Python passe par Bash perd ses backslashes (`'\n'` devient un vrai saut de ligne, SyntaxError) : ecrire les scripts avec Write, ou corriger avec Edit.
- `C:\Users\<user>\Downloads` est un depot git sans aucun commit : il avale tout dossier non versionne en dessous. `compte.py` ignore les depots sans commit.
- Les `.claude.json.*` contiennent des jetons MCP en clair (ex. Bearer x64dbg dans `.claude.json.rea.backup`) : ne lire que les cles, ne jamais afficher une valeur.
- Une memoire peut etre perimee et contredire CLAUDE.md (ex. `project_vodloop_channels.md` "cx247 EN PAUSE" alors que nanatty247 est coupee depuis le ban) : CLAUDE.md et la memoire la plus recente gagnent, signaler l'ecart a kil, ne pas reecrire sans lui.
