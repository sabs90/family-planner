# Adding a new app

Step-by-step playbook for adding a new app to this deployment. Read `CLAUDE.md` and `ARCHITECTURE.md` first if you haven't.

## Decide up front

1. **Runtime?** Static files, Flask/Python, Next.js/Node, something else.
2. **Can it serve under a sub-path** (e.g. `/<name>/`)? If yes → gets both the tailnet path route AND a `.local` shortcut. If no (like photo-coach with broken basePath) → `.local` only; flag as LAN-only in `CLAUDE.md`.
3. **Name, port, env file location.**

## The eight edits

Every new app needs edits in these places. Do all eight or the app won't fully wire up.

### 1. `local-net/<name>/Dockerfile`

Copy an existing one that matches the runtime:
- Static site: don't write a Dockerfile — mount the folder into Caddy (see step 2).
- Flask/gunicorn: copy `local-net/readwise-to-kindle/Dockerfile`.
- Next.js: copy `local-net/photo-coach/Dockerfile`.

If Flask serving under a sub-path, the app must use `ProxyFix(x_prefix=1)` (see section below).

### 2. `local-net/docker-compose.yml` — new service

Add under `services:`. Template for a Flask app:

```yaml
  <name>:
    build:
      context: ../<name>
      dockerfile: ../local-net/<name>/Dockerfile
    restart: unless-stopped
    env_file:
      - ../<name>/.env
```

For a static site — no service; just add a volume mount to the `caddy:` service:

```yaml
  caddy:
    volumes:
      - ../<name>:/srv/<name>:ro    # add this line
```

### 3. `local-net/Caddyfile` — two routes

In the combined site block (matches `home.local`, `woodhouse.tail714834.ts.net`, `localhost`), add path routing. Put it **above** the final `handle { reverse_proxy homepage:3000 }` fallback.

Flask app under sub-path:
```caddy
handle_path /<name> {
    redir * /<name>/ 302
}
handle_path /<name>/* {
    reverse_proxy <name>:<port> {
        header_up X-Forwarded-Prefix /<name>
    }
}
```

Static site under sub-path:
```caddy
handle_path /<name> {
    redir * /<name>/ 302
}
handle_path /<name>/* {
    root * /srv/<name>
    file_server
}
```

Next.js (or any app that can't run under a sub-path): skip the path route entirely, just add the `.local` block below. Flag it as LAN-only in `CLAUDE.md`.

Then below, a per-app `.local` shortcut:

```caddy
http://<name>.local {
    reverse_proxy <name>:<port>
}
```
(For static: `root` + `file_server` instead of `reverse_proxy`.)

### 4. `local-net/homepage/services.yaml` — dashboard tile

Add under `My Apps:` (or wherever suits). `href` should be a **relative path** so the tile works under `home.local`, `localhost`, and the tailnet URL:

```yaml
    - <Display Name>:
        href: /<name>/
        description: <short description>
        icon: mdi-<pick-one>   # browse https://pictogrammers.com/library/mdi/
        widget:
          type: customapi
          url: http://deployer:5000/status/<name>
          refreshInterval: 60000
          mappings:
            - field: behind
              label: behind
            - field: local
              label: commit
```

For a LAN-only app, use an absolute URL: `href: http://<name>.local` and note "(LAN only)" in the description.

### 5. `local-net/deployer/app.py` — APPS dict entry

Add to the `APPS` dict:

```python
"<name>": {
    "repo": f"{PROJECTS_DIR}/<name>",    # absolute path on host; adjust subdir if git repo is nested
    "service": "<name>",                  # compose service name, or None for static
},
```

Point `repo` at wherever the `.git` folder actually lives (may be a subdirectory — photo-coach's real repo is in `photocrit/`, not the parent).

### 6. Project folder: `.dockerignore` (unless static)

To keep Docker builds fast, add a `.dockerignore` to the app's project folder excluding `node_modules`, `.next`, `venv`, `__pycache__`, `.git`, large binaries. Only needed for apps with a Dockerfile.

### 7. `/etc/hosts` — new `.local` hostname

On the Mac (and later on each LAN client that should use the shortcut):

```sh
sudo sh -c 'echo "127.0.0.1 <name>.local" >> /etc/hosts'
```

On the NAS later: same on that machine, or add via router-level DNS if the router supports it.

**Note:** `.local` shortcuts only resolve via mDNS on devices that know about them. The NAS advertises `woodhouse.local` natively, but not per-app names. On the NAS, Caddy listens on **port 81** (not 80), so `.local` shortcuts need `:81` appended (e.g. `http://photo-coach.local:81`). Alternatively, use the `hussaingroup.net` subdomain via DSM reverse proxy (step 8) which works on port 80.

### 8. DSM reverse proxy — new subdomain entry (NAS only)

On the NAS, DSM's built-in nginx listens on port 80 and forwards to Caddy on port 81. Each `hussaingroup.net` subdomain needs its own rule.

In DSM → Control Panel → Login Portal → Advanced → Reverse Proxy, click **Create**:

- **Source Protocol:** HTTP
- **Source Hostname:** `<name>.hussaingroup.net`
- **Source Port:** `80`
- **Destination Protocol:** HTTP
- **Destination Hostname:** `localhost`
- **Destination Port:** `81`

After saving, restart nginx to make sure it's active:

```sh
sudo synoservice --restart nginx
```

DSM does **not** support wildcard hostnames in reverse proxy rules — add one entry per subdomain.

## Flask sub-path convention

If the app serves under `/<name>/` via Caddy's `handle_path` (prefix stripped), Caddy sends `X-Forwarded-Prefix: /<name>`. The Flask app must respect that header so `url_for()` generates correctly-prefixed URLs. Add after `app = Flask(__name__)`:

```python
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_prefix=1, x_proto=1, x_host=1)
```

This is already done in `readwise-to-kindle/app.py` and `local-net/deployer/app.py` — copy from there.

### Static assets in templates

Replace hardcoded `/static/...` paths with Flask's `url_for` so they pick up the prefix:

```html
<!-- Wrong: breaks under sub-path -->
<link rel="stylesheet" href="/static/style.css">
<script src="/static/script.js"></script>

<!-- Right -->
<link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
<script src="{{ url_for('static', filename='script.js') }}"></script>
```

### JavaScript fetch calls

If the app makes `fetch('/api/...')` calls from the browser, those paths also need the sub-path prefix. Expose the prefix from the template, then use it in JS:

In `templates/index.html` (just before your `<script src=...>`):
```html
<script>window.APP_PREFIX = "{{ request.script_root }}";</script>
```

In your JS file, at the top:
```js
const API_BASE = window.APP_PREFIX || '';
```

Then prefix every fetch:
```js
// Wrong
fetch('/api/articles')

// Right
fetch(`${API_BASE}/api/articles`)
```

`request.script_root` is empty when running locally (no prefix), so local dev still works without changes.

## Build, test, verify

```sh
cd ~/projects/local-net
docker compose up -d --build <name>
docker compose restart caddy homepage   # caddy to pick up the new route, homepage for the new tile
```

Check all three entry points:

```sh
curl -sI http://localhost/<name>/          # path-routing
curl -sI http://<name>.local/              # LAN shortcut
curl -sS http://deploy.local/status/<name> # deployer knows about it
```

If any return 404, 502, or a JSON error, check `docker logs local-net-<name>-1`.

## Afterwards

- Update the **app table in `CLAUDE.md`** — add the new row.
- Update the **app table in `README.md`** — add the new row.
- Commit changes in `local-net/` (this repo tracks deployment config, not app code).
- Announce in the next chat turn if anything surprising came up.

## Common pitfalls

- **Caddy doesn't pick up config:** site blocks default to HTTPS unless prefixed with `http://` or `auto_https off` is set globally. Ours is set globally, but double-check site addresses start with `http://`.
- **Flask app generates wrong URLs under sub-path:** forgot `ProxyFix(x_prefix=1)` or `header_up X-Forwarded-Prefix`.
- **Next.js with basePath broken:** see `CLAUDE.md` "Known issues" — Next.js 16 regression; don't try to make it work under a sub-path, just use `.local`.
- **Build context paths resolve wrong inside the deployer container:** projects must be mounted at the same absolute path inside the deployer container as on the host. Already configured; don't change unless you know why.
- **Static site with absolute asset paths:** if the HTML uses `<link href="/style.css">`, it breaks under a sub-path (becomes `/<name>/style.css` after `handle_path` strips, which Caddy then can't find). Use relative paths (`href="style.css"`) in the HTML.
- **JS fetch calls with hardcoded `/api/...` paths:** break under sub-path for the same reason. Use `APP_PREFIX` (see Flask sub-path convention above).
- **Copying repos to NAS via Finder creates `@eaDir` folders inside `.git`:** Synology's media indexer injects `@eaDir` metadata folders everywhere, including inside `.git/refs/`. This causes `fatal: bad object refs/@eaDir/heads/SynoEAStream` errors in the deployer. Fix by running `sudo find /volume1/homes/Sabeeh/huss-net -type d -name @eaDir -exec rm -rf {} +` on the NAS. To prevent recurrence, use `git clone` directly on the NAS rather than copying via Finder.
- **Deployer shows "not a git repo" despite `.git` existing:** likely a git `safe.directory` ownership mismatch (container runs as root, files owned by Sabeeh). Fixed in the deployer Dockerfile with `RUN git config --system --add safe.directory '*'` — already applied; new apps get this automatically.
- **DSM reverse proxy rule saved but subdomain still unreachable:** run `sudo synoservice --restart nginx` on the NAS after saving the rule. DSM doesn't always reload nginx automatically.
