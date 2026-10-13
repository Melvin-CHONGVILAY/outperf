"""Build Outperf for its three targets.

web     -> repository root, served by GitHub Pages (installable web app + legal pages)
native  -> app/www, packaged into the iOS app by Capacitor
preview -> app/artifact/outperf.html, a single file preview with example data
"""
import hashlib, pathlib, re, shutil

APP = pathlib.Path(__file__).resolve().parent
SRC = APP / 'src'
REPO = APP.parent
WWW = APP / 'www'
VENDOR = APP / 'node_modules' / '@supabase' / 'supabase-js' / 'dist' / 'umd' / 'supabase.js'

css = (SRC / 'app.css').read_text()
js = (SRC / 'app.js').read_text()
config = (SRC / 'config.js').read_text()
tpl = (SRC / 'index.html').read_text()
WEBHEAD = ('<link rel="manifest" href="manifest.webmanifest">\n'
           '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
           '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">')
page = lambda head: tpl.replace('<!--WEBHEAD-->', head).replace('/*CSS*/', css).replace('/*JS*/', js)

# contact address shown on the legal pages
m = re.search(r"contactEmail:\s*'([^']*)'", config)
contact = m.group(1) if m and m.group(1) else ''
contact_html = f'<a href="mailto:{contact}">{contact}</a>' if contact else '<strong>[adresse de contact à renseigner dans app/src/config.js]</strong>'

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)

# ---- native
if WWW.exists(): shutil.rmtree(WWW)
write(WWW / 'index.html', page(''))
write(WWW / 'config.js', config)
(WWW / 'vendor').mkdir(parents=True, exist_ok=True)
shutil.copy(VENDOR, WWW / 'vendor' / 'supabase.js')

# ---- web (GitHub Pages at the repository root)
html = page(WEBHEAD)
write(REPO / 'index.html', html)
write(REPO / 'config.js', config)
(REPO / 'vendor').mkdir(exist_ok=True)
shutil.copy(VENDOR, REPO / 'vendor' / 'supabase.js')
ver = hashlib.sha1((html + config).encode()).hexdigest()[:8]
write(REPO / 'sw.js', (SRC / 'sw.js').read_text().replace('__VERSION__', ver))
shutil.copy(SRC / 'manifest.webmanifest', REPO / 'manifest.webmanifest')
(REPO / 'icons').mkdir(exist_ok=True)
for p in (SRC / 'icons').glob('*.png'): shutil.copy(p, REPO / 'icons' / p.name)
for p in (SRC / 'site').glob('*.html'):
    write(REPO / p.name, p.read_text().replace('{{CONTACT}}', contact_html))
write(REPO / '.nojekyll', '')

# ---- single file preview
art = APP / 'artifact'; art.mkdir(exist_ok=True)
override = 'body{position:relative;inset:auto}.topsafe{display:none}'
write(art / 'outperf.html', '<title>Outperf</title>\n<style>\n' + css + '\n' + override + '\n</style>\n'
      '<div class="shell">\n<main id="app" class="app"></main>\n<nav id="tabs" class="tabbar" aria-label="Navigation"></nav>\n</div>\n'
      '<script>window.__OUTPERF_PREVIEW = true;</script>\n<script>\n' + js + '\n</script>\n')
print('built', ver, 'web', len(html), 'bytes, contact', contact or 'MISSING')
