"""Build Outperf.

native -> app/www, packaged into the iOS app by Capacitor (what App Review and users get)
web    -> repository root, served by GitHub Pages (web version + legal pages)
test   -> app/test/build/{web,native}, same files plus the window.__op hook used by the test scripts

The test hook only exists in app/test/build: the shipped files never contain it.
"""
import hashlib, pathlib, re, shutil

APP = pathlib.Path(__file__).resolve().parent
SRC = APP / 'src'
REPO = APP.parent
WWW = APP / 'www'
TEST = APP / 'test' / 'build'

css = (SRC / 'app.css').read_text()
js_test = (SRC / 'app.js').read_text()
js = re.sub(r'/\*TEST-HOOK\*/.*?/\*END-TEST-HOOK\*/\n?', '', js_test, flags=re.S)
assert '__op' not in js
js_test = js_test.replace('/*TEST-HOOK*/', '').replace('/*END-TEST-HOOK*/', '')
config = (SRC / 'config.js').read_text()
tpl = (SRC / 'index.html').read_text()
WEBHEAD = ('<link rel="manifest" href="manifest.webmanifest">\n'
           '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
           '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">')
page = lambda head, code: tpl.replace('<!--WEBHEAD-->', head).replace('/*CSS*/', css).replace('/*JS*/', code)

m = re.search(r"contactEmail:\s*'([^']*)'", config)
contact = m.group(1) if m and m.group(1) else ''
assert contact, 'contactEmail manquant dans app/src/config.js'
contact_html = f'<a href="mailto:{contact}">{contact}</a>'

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)

def native(out, code):
    if out.exists(): shutil.rmtree(out)
    write(out / 'index.html', page('', code))
    write(out / 'config.js', config)

def web(out, code):
    html = page(WEBHEAD, code)
    write(out / 'index.html', html)
    write(out / 'config.js', config)
    ver = hashlib.sha1((html + config).encode()).hexdigest()[:8]
    write(out / 'sw.js', (SRC / 'sw.js').read_text().replace('__VERSION__', ver))
    shutil.copy(SRC / 'manifest.webmanifest', out / 'manifest.webmanifest')
    (out / 'icons').mkdir(parents=True, exist_ok=True)
    for p in (SRC / 'icons').glob('*.png'): shutil.copy(p, out / 'icons' / p.name)
    for p in (SRC / 'site').glob('*.html'):
        write(out / p.name, p.read_text().replace('{{CONTACT}}', contact_html))
    return ver

native(WWW, js)
ver = web(REPO, js)
write(REPO / '.nojekyll', '')
if TEST.exists(): shutil.rmtree(TEST)
native(TEST / 'native', js_test)
web(TEST / 'web', js_test)
print('built', ver, 'contact', contact)
