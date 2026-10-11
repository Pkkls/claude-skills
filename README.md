# claude-skills

Les skills Claude Code écrits avec kil, au même endroit. Les skills tiers (claude-red, superpowers, webapp-testing, kit UX/UI, Remotion, video-shotcraft) n'y sont pas : ils s'installent depuis leurs dépôts.

| Dossier | Contenu | Va dans |
|---|---|---|
| `skills/` | youtube-upload (YouTube + fiche Chrome, scripts CDP), promo-video (vidéo produit Remotion), site-relearn, x-space, malware-analysis, soc-analyst, autonomy-log, learn-from-errors, renvois publish-stores et vodloop-ops | `~/.claude/skills/` |
| `projects/kick-chat-translator/` | add-language, publish-stores, store-seo | `<repo>/.claude/skills/` |
| `projects/vodloop/` | vodloop-ops, vodloop-repeats | `<repo>/.claude/skills/` |
| `commands/` | les commandes `/` (status, logs, deploy-nano...) | `~/.claude/commands/` |

Installer les skills globaux et les commandes : `powershell -File install.ps1`.

Les adresses du réseau local, les chemins utilisateur et l'identifiant Telegram sont remplacés par des repères (`<nano-ip>`, `C:\Users\<user>`, `<telegram-chat-id>`...). Sur la machine d'origine, `private.map` (jamais commité, une ligne `valeur<TAB>repère`) fait le remplacement dans `sync.ps1` et l'inverse dans `install.ps1`. `sync.ps1` refuse de pousser s'il reste une valeur de la table ou une adresse `192.168.`.

Règle de tenue : après chaque tâche, les erreurs commises vont dans le skill concerné (section ou journal daté), puis `powershell -File sync.ps1` recopie ici et pousse.
