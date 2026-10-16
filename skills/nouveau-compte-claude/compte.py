"""Nouveau compte Claude sur le PC de kil : ce qui suit le compte, ce qui reste, ou reprendre.

Tous les comptes partagent ~/.claude (CLAUDE.md, memoires, skills, hooks,
plugins, settings, MCP locaux, transcripts). Ce qui change avec le compte vit
dans ~/.claude.json (oauthAccount, connecteurs claude.ai, GitHub web, extension
Chrome) et dans les dossiers par compte de l'app desktop
(AppData/Roaming/Claude/<type>/<uuid compte>/...), que la barre laterale du
nouveau compte ne montre plus. Les transcripts restent reprenables d'un compte
a l'autre (`claude --resume <id>` depuis le dossier de la session, verifie le
2026-10-16).

  python compte.py              diagnostic du compte + reprise (projets actifs 14 j)
  python compte.py --contexte   index complet de tous les projets, ecrit en JSON
  python compte.py --jours 60   fenetre de la reprise
  python compte.py --snapshot   instantane du compte courant (avant de changer)
  python compte.py --selftest   controle sur un faux HOME, rien ne touche au vrai

Zero reseau, lecture seule (sauf --snapshot et le JSON d'index).
"""
import glob, json, os, re, shutil, subprocess, sys, tempfile, time

ARGS = sys.argv[1:]
JOURS = int(ARGS[ARGS.index('--jours') + 1]) if '--jours' in ARGS else 14
# Choix de kil (2026-10-16) : refuses a chaque bascule, ne plus les demander.
REFUSES = {'claude.ai Gmail', 'claude.ai Spotify', 'claude.ai Opera', 'chrome'}
BROUILLONS = ('scratch-workspaces', os.path.join('AppData', 'Local', 'Temp'))
# Majuscules = marqueurs que les memoires posent expres ; "en cours" en prose n'en est pas un.
DRAPEAUX = re.compile(r'EN PAUSE|STANDBY|EN COURS|A REPRENDRE|REPRISE|BLOQU|RESTE[ :]|[Rr]este,? dans l.ordre')


def charger(p):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def email(d):
    return ((d or {}).get('oauthAccount') or {}).get('emailAddress')


def quand(ts):
    return time.strftime('%Y-%m-%d %H:%M', time.localtime(ts))


class Home:
    def __init__(self, h):
        self.h = h
        self.cfg = os.path.join(h, '.claude.json')
        self.cl = os.path.join(h, '.claude')
        self.app = os.path.join(h, 'AppData', 'Roaming', 'Claude')


# ---- 1. le compte --------------------------------------------------------------

def diagnostic(H):
    cur = charger(H.cfg)
    if cur is None:
        return None, [('socle', f'{H.cfg} illisible : lancer claude une fois et se connecter')]
    moi = email(cur)
    autres = sorted(
        ((os.path.getmtime(p), p, d) for p in glob.glob(H.cfg + '.*') if (d := charger(p)) and email(d) and email(d) != moi),
        key=lambda x: x[0], reverse=True)
    ref = autres[0][2] if autres else {}
    out = {'compte': moi, 'reference': email(ref), 'reference_fichier': autres[0][1] if autres else None}
    a_faire = []

    conn = sorted(set(cur.get('claudeAiMcpEverConnected', [])) | set(ref.get('claudeAiMcpEverConnected', [])))
    out['connecteurs_voulus'] = [c for c in conn if c not in REFUSES]
    out['connecteurs_refuses'] = [c for c in conn if c in REFUSES]

    gh = (cur.get('githubWebConnectionStatusCache') or {}).get('status')
    out['github'] = gh
    if gh != 'connected':
        a_faire.append(('github', 'GitHub web non relie : ouvrir https://claude.ai/code (start), kil relie GitHub'))

    m_cur, m_ref = set(cur.get('mcpServers') or {}), set(ref.get('mcpServers') or {})
    out['mcp'] = sorted(m_cur)
    if m_ref - m_cur:
        a_faire.append(('mcp', f'MCP absents vs reference : {sorted(m_ref - m_cur)} (cles seulement, jetons jamais affiches)'))

    socle = {k: os.path.isfile(os.path.join(H.cl, *k.split('/'))) for k in ('CLAUDE.md', 'memory-global/MEMORY.md', 'settings.json')}
    out['socle'] = socle
    out['skills'] = len(glob.glob(os.path.join(H.cl, 'skills', '*', 'SKILL.md')))
    out['plugins'] = [k for k, v in ((charger(os.path.join(H.cl, 'settings.json')) or {}).get('enabledPlugins') or {}).items() if v]
    for k, ok in socle.items():
        if not ok:
            a_faire.append(('socle', f'~/.claude/{k} absent : nouveau PC, pas nouveau compte. Restaurer depuis le repo claude-config'))
    if not autres:
        a_faire.append(('snapshot', 'aucun instantane d un autre compte : comparaison a l aveugle'))
    return out, a_faire


# ---- 2. le contexte ------------------------------------------------------------

def comptes_connus(H):
    """uuid compte -> email, lu dans tous les .claude.json* (cles seulement)."""
    m = {}
    for p in glob.glob(H.cfg) + glob.glob(H.cfg + '.*'):
        oa = (charger(p) or {}).get('oauthAccount') or {}
        if oa.get('accountUuid') and oa.get('emailAddress'):
            m[oa['accountUuid']] = oa['emailAddress']
    return m


def sessions_desktop(H, uuids):
    """cliSessionId -> titre, compte : la barre laterale de l'app desktop."""
    m = {}
    for f in glob.glob(os.path.join(H.app, 'claude-code-sessions', '*', '*', 'local_*.json')):
        d = charger(f) or {}
        acct = f.replace('\\', '/').split('/claude-code-sessions/')[1].split('/')[0]
        if d.get('cliSessionId'):
            m[d['cliSessionId']] = {'titre': d.get('title'), 'compte': uuids.get(acct, acct[:8]), 'archive': bool(d.get('isArchived'))}
    return m


def lire_session(p):
    """Dossiers vus (dans l'ordre), premiere et derniere demande de kil, sans charger un transcript de 90 Mo."""
    cwds, prem, der = [], None, None
    taille = os.path.getsize(p)
    with open(p, 'rb') as f:
        tete = f.read(400_000)
        if taille > 400_000:
            f.seek(max(400_000, taille - 3_000_000))
            f.readline()
        queue = f.read() if taille > 400_000 else b''
    for bloc, premier in ((tete, True), (queue, False)):
        for l in bloc.decode('utf-8', 'replace').splitlines():
            try:
                o = json.loads(l)
            except Exception:
                continue
            if o.get('cwd') and o['cwd'] not in cwds:
                cwds.append(o['cwd'])
            c = (o.get('message') or {}).get('content')
            if isinstance(c, str):
                c = c.replace('Stop hook feedback:\n', '')
                if c.startswith('A session-scoped Stop hook'):
                    continue
            if o.get('type') == 'user' and isinstance(c, str) and c.strip() and not c.lstrip().startswith(('<', '[', '## Context')):
                if premier and prem is None:
                    prem = c
                der = c
    return cwds, prem, der


def slug(chemin):
    """Nom du dossier ~/.claude/projects/<slug> que Claude Code donne a un chemin."""
    return re.sub(r'[^A-Za-z0-9]', '-', chemin)


def git_etat(d):
    def g(*a):
        r = subprocess.run(['git', '-C', d, *a], capture_output=True, text=True, encoding='utf-8', errors='replace')
        return r.stdout.strip() if r.returncode == 0 else None
    # Un depot sans commit (C:/Users/<user>/Downloads en est un) avale tout dossier
    # non versionne en dessous : il ne dit rien du projet.
    if not os.path.isdir(d) or g('rev-parse', '--is-inside-work-tree') != 'true' or g('rev-parse', '--verify', '-q', 'HEAD') is None:
        return None
    st = g('status', '--porcelain=v1', '-b') or ''
    lignes = st.splitlines()
    tete = lignes[0] if lignes else ''
    m = re.search(r'\[(.*)\]', tete)
    return {'depot': os.path.basename(g('rev-parse', '--show-toplevel') or d), 'branche': tete[3:].split('...')[0], 'modifs': len(lignes) - 1, 'ecart': m.group(1) if m else ''}


def contexte(H, jours=None):
    uuids = comptes_connus(H)
    desk = sessions_desktop(H, uuids)
    projets = {}
    limite = time.time() - jours * 86400 if jours else 0
    for p in glob.glob(os.path.join(H.cl, 'projects', '*', '*.jsonl')):
        mt = os.path.getmtime(p)
        if mt < limite:
            continue
        sid = os.path.basename(p)[:-6]
        cwds, prem, der = lire_session(p)
        dossier = os.path.basename(os.path.dirname(p))
        # Claude Code range transcript ET memoire sous le slug du projet, meme
        # quand l'app desktop a lance la session dans un scratch-workspace
        # (mesure : vodloop). `claude --resume` ne la retrouve que lance depuis
        # le dossier de ce slug : c'est lui qui nomme le projet.
        projet = next((c for c in cwds if slug(c) == dossier), None)
        reprise = projet or (cwds[0] if cwds else None)
        cle = projet or (cwds[-1] if cwds and any(b in cwds[0] for b in BROUILLONS) else reprise) or dossier
        meta = desk.get(sid, {})
        titre = meta.get('titre') or ((prem or '').strip().splitlines() or [''])[0][:90]
        pr = projets.setdefault(cle, {'sessions': [], 'memoire_dirs': set()})
        pr['memoire_dirs'].add(os.path.dirname(p))
        pr['sessions'].append({
            'reprise': reprise, 'travail': cwds[-1] if cwds and cwds[-1] != reprise else None, 'id': sid, 'maj': mt, 'mo': round(os.path.getsize(p) / 1e6, 1),
            'titre': titre, 'compte': meta.get('compte'), 'derniere_demande': (der or '').strip()[:200],
        })
    for cwd, pr in projets.items():
        pr['sessions'].sort(key=lambda s: s['maj'], reverse=True)
        memo = [f for d in sorted(pr.pop('memoire_dirs')) for f in glob.glob(os.path.join(d, 'memory', '*.md'))
                if os.path.basename(f) != 'MEMORY.md']
        pr['memoires'] = len(memo)
        pr['drapeaux'] = []
        for f in memo:
            try:
                txt = open(f, encoding='utf-8', errors='replace').read()
            except OSError:
                continue
            for l in txt.splitlines():
                if DRAPEAUX.search(l) and not l.startswith(('name:', 'description:')):
                    pr['drapeaux'].append(f'{os.path.basename(f)}: {l.strip()[:220]}')
        pr['git'] = git_etat(cwd) if os.path.isabs(cwd) else None
    cowork = []
    for f in glob.glob(os.path.join(H.app, 'local-agent-mode-sessions', '*', '*', 'local_*.json')) + glob.glob(os.path.join(H.app, 'local-agent-mode-sessions', '*', '*', 'local_*', '*.json')):
        d = charger(f) or {}
        if d.get('title') or d.get('initialMessage'):
            cowork.append({'titre': (d.get('title') or d.get('initialMessage') or '')[:90], 'maj': os.path.getmtime(f)})
    vus = {s['id'] for p in projets.values() for s in p['sessions']}
    # Entrees de la barre laterale desktop sans transcript local (supprime, ou
    # session cloud) : rien a reprendre, mais le trou doit se voir.
    sans = [] if jours else sorted((v['titre'] or '?') for k, v in desk.items() if k not in vus and not v['archive'])
    return {'projets': projets, 'desktop_indexees': len(desk), 'desktop_sans_transcript': sans,
            'cowork': sorted(cowork, key=lambda c: c['maj'], reverse=True)}


def court(chemin):
    """scratch-workspaces/<compte>/<org>/scratch-xxx -> scratch:xxx, le reste tel quel."""
    m = re.search(r'scratch-workspaces[\\/][^\\/]+[\\/][^\\/]+[\\/](.+)$', chemin or '')
    return f'scratch:{m.group(1)}' if m else chemin


def afficher_contexte(ctx, n_sessions=3):
    pr = sorted(ctx['projets'].items(), key=lambda kv: kv[1]['sessions'][0]['maj'], reverse=True)
    for cwd, p in pr:
        s0 = p['sessions'][0]
        g = p['git']
        gtxt = f" | git {g['depot']}@{g['branche']} {g['modifs']} modif {g['ecart']}".rstrip() if g else ''
        print(f"\n## {court(cwd)}  ({len(p['sessions'])} sess, derniere {quand(s0['maj'])}, {p['memoires']} memoires{gtxt})")
        for d in p['drapeaux'][:6]:
            print(f'   ! {d}')
        for s in p['sessions'][:n_sessions]:
            print(f"   {quand(s['maj'])} {s['id'][:8]} {s['mo']}Mo {('[' + s['compte'] + '] ') if s['compte'] else ''}{s['titre']!r}"
                  + (f"  -> travaillait dans {court(s['travail'])}" if s['travail'] else ''))
            if s['derniere_demande']:
                print(f"      fin : {s['derniere_demande'][:160]!r}")
        print(f'   reprendre : cd "{s0["reprise"]}" ; claude --resume {s0["id"]}')
    if ctx['desktop_sans_transcript']:
        print(f"\n## Barre laterale desktop sans transcript local : {len(ctx['desktop_sans_transcript'])} (non reprenables)")
        print('   ' + ' | '.join(t[:40] for t in ctx['desktop_sans_transcript'][:15]))
    if ctx['cowork']:
        print(f"\n## Cowork (app desktop) : {len(ctx['cowork'])} sessions, la plus recente {quand(ctx['cowork'][0]['maj'])} : {ctx['cowork'][0]['titre']!r}")


# ---- 3. selftest ---------------------------------------------------------------

def selftest():
    t = tempfile.mkdtemp(prefix='compte-selftest-')
    try:
        H = Home(t)
        proj = os.path.join(t, 'proj')                      # un projet git
        scr = os.path.join(t, 'scratch-workspaces', 'x')    # un scratch de l'app desktop
        P, S = (os.path.join(H.cl, 'projects', slug(d)) for d in (proj, scr))
        os.makedirs(os.path.join(H.cl, 'memory-global'))
        os.makedirs(os.path.join(P, 'memory'))
        os.makedirs(S)
        for f, c in (('CLAUDE.md', 'x'), ('memory-global/MEMORY.md', 'x'), ('settings.json', '{"enabledPlugins":{"a":true}}')):
            open(os.path.join(H.cl, *f.split('/')), 'w').write(c)
        new = {'oauthAccount': {'emailAddress': 'new@x', 'accountUuid': 'N'}, 'mcpServers': {'pw': {}},
               'claudeAiMcpEverConnected': ['claude.ai Gmail', 'claude.ai Claude Docs'], 'githubWebConnectionStatusCache': {'status': 'not_connected'}}
        old = {'oauthAccount': {'emailAddress': 'old@x', 'accountUuid': 'O'}, 'mcpServers': {'pw': {}, 'ghidra': {}},
               'claudeAiMcpEverConnected': ['claude.ai Spotify'], 'githubWebConnectionStatusCache': {'status': 'connected'}}
        json.dump(new, open(H.cfg, 'w')); json.dump(old, open(H.cfg + '.backup', 'w'))
        open(os.path.join(P, 'memory', 'm.md'), 'w').write('---\nname: m\n---\nRELEASE EN PAUSE : reste le tag\n')

        def transcript(dossier, sid, lignes):
            with open(os.path.join(dossier, sid + '.jsonl'), 'w', encoding='utf-8') as f:
                for cwd, txt in lignes:
                    f.write(json.dumps({'type': 'user', 'cwd': cwd, 'message': {'content': txt}}) + '\n')
        transcript(P, 'abc', [(proj, '<cmd>'), (proj, 'publie la 3.3.0'), (proj, 'en anglais seulement')])
        # Desktop : lancee dans le scratch, rangee par Claude Code sous le projet (mesure : vodloop).
        transcript(P, 'def', [(scr, 'va dans le projet'), (proj, 'Stop hook feedback:\nfais les tests')])
        # Scratch pur : reste a part, reprise depuis le scratch.
        transcript(S, 'ghi', [(scr, 'une recette')])
        dsk = os.path.join(H.app, 'claude-code-sessions', 'O', 'org')
        os.makedirs(dsk)
        json.dump({'cliSessionId': 'abc', 'title': 'Release KCT'}, open(os.path.join(dsk, 'local_1.json'), 'w'))

        out, todo = diagnostic(H)
        assert out['compte'] == 'new@x' and out['reference'] == 'old@x', out
        assert out['connecteurs_voulus'] == ['claude.ai Claude Docs'], out  # Gmail/Spotify refuses
        assert {k for k, _ in todo} == {'github', 'mcp'}, todo
        os.utime(os.path.join(P, 'def.jsonl'), (1, 1))
        ctx = contexte(H)
        assert set(ctx['projets']) == {proj, scr}, list(ctx['projets'])
        pr = ctx['projets'][proj]
        d = [x for x in pr['sessions'] if x['id'] == 'def'][0]
        assert d['reprise'] == proj and d['derniere_demande'] == 'fais les tests', d  # resume depuis le slug, pas le scratch
        assert ctx['projets'][scr]['sessions'][0]['reprise'] == scr
        s = pr['sessions'][0]
        assert s['titre'] == 'Release KCT' and s['compte'] == 'old@x', s
        assert s['derniere_demande'] == 'en anglais seulement', s
        assert pr['memoires'] == 1 and any('EN PAUSE' in x for x in pr['drapeaux']), pr
        os.remove(H.cfg + '.backup')
        assert {k for k, _ in diagnostic(H)[1]} == {'github', 'snapshot'}
        print('selftest ok (11 assertions)')
    finally:
        shutil.rmtree(t, ignore_errors=True)


# ---- main ----------------------------------------------------------------------

if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if '--selftest' in ARGS:
        selftest()
        sys.exit(0)
    H = Home(os.path.expanduser('~'))
    if '--snapshot' in ARGS:
        e = email(charger(H.cfg))
        if not e:
            sys.exit('pas de compte connecte dans ~/.claude.json')
        dst = f'{H.cfg}.acct-{e}.bak'
        shutil.copy2(H.cfg, dst)
        print(f'instantane : {dst}')
        sys.exit(0)

    out, todo = diagnostic(H)
    if out:
        print(f"compte : {out['compte']}   reference : {out['reference']} ({os.path.basename(out['reference_fichier'] or '-')})")
        print(f"socle : {out['socle']} | skills {out['skills']} | plugins {len(out['plugins'])} | mcp {out['mcp']} | github {out['github']}")
        print(f"connecteurs a garder : {out['connecteurs_voulus']} | refuses par kil : {out['connecteurs_refuses']}")
    complet = '--contexte' in ARGS
    ctx = contexte(H, None if complet else JOURS)
    print(f"\n# Reprise ({'tout' if complet else f'{JOURS} derniers jours'}) : {sum(len(p['sessions']) for p in ctx['projets'].values())} sessions, "
          f"{len(ctx['projets'])} dossiers, {ctx['desktop_indexees']} titres desktop")
    afficher_contexte(ctx, 5 if complet else 3)
    if complet:
        dst = os.path.join(H.cl, 'state', 'contexte-comptes.json')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        json.dump(ctx, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'\nindex : {dst}')
    print('\n# A faire par kil')
    for i, (_, t) in enumerate(todo, 1):
        print(f'  {i}. {t}')
    if not todo:
        print('  rien')
