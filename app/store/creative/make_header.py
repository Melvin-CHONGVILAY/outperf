"""Header / search result artwork for the App Store product page (Outperf)."""
import pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = pathlib.Path(__file__).resolve().parent
STORE = HERE.parent
BG = (10, 14, 22)
AMBER = (255, 176, 32)
F = '/usr/share/fonts/opentype/inter/'
SHOTS = ['02-chrono', '01-aujourdhui', '03-stats', '04-regularite', '05-journal']

def phone(name):
    """The phone frame only (caption and background cut away), with its rounded top corners."""
    im = Image.open(STORE / 'screenshots-6.3' / f'{name}.png').convert('RGB')
    top = next(y for y in range(440, 900) if sum(im.getpixel((300, y))) > 80) - 4
    im = im.crop((94, top, 1114, im.height))
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height + 400), radius=150, fill=255)
    im.putalpha(m)
    return im

def make(W, H, out):
    s = H / 1646
    c = Image.new('RGB', (W, H), BG)
    # soft amber glow behind the phones
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((W * .5 - 1500 * s, H - 700 * s, W * .5 + 1500 * s, H + 900 * s), fill=120)
    glow = glow.filter(ImageFilter.GaussianBlur(260 * s))
    c.paste(Image.new('RGB', (W, H), (90, 60, 10)), (0, 0), glow)
    d = ImageDraw.Draw(c)
    # title block, centred
    icon = Image.open(STORE / 'icon-1024.png').convert('RGBA').resize((int(170 * s),) * 2, Image.LANCZOS)
    m = Image.new('L', icon.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, *icon.size), radius=int(38 * s), fill=255)
    tf = ImageFont.truetype(F + 'InterDisplay-ExtraBold.otf', int(150 * s))
    tw = d.textlength('Outperf', font=tf)
    gap = 44 * s; x0 = (W - (icon.size[0] + gap + tw)) / 2; y0 = 110 * s
    c.paste(icon, (int(x0), int(y0)), m)
    d.text((x0 + icon.size[0] + gap, y0 + icon.size[1] / 2), 'Outperf', font=tf, fill='white', anchor='lm')
    sf = ImageFont.truetype(F + 'InterDisplay-Bold.otf', int(92 * s))
    line = 'Bats ton toi d\'hier.'
    d.text((W / 2, y0 + icon.size[1] + 120 * s), line, font=sf, fill=AMBER, anchor='mm')
    nf = ImageFont.truetype(F + 'Inter-Medium.otf', int(50 * s))
    d.text((W / 2, y0 + icon.size[1] + 225 * s), 'Chrono, stats et note du jour pour tes heures de travail', font=nf, fill=(170, 178, 196), anchor='mm')
    # five phones rising from the bottom edge, centre one higher
    top = y0 + icon.size[1] + 330 * s
    k = W / 3840
    pw = 600 * k; pgap = 70 * k
    total = 5 * pw + 4 * pgap
    for i, n in enumerate(SHOTS):
        p = phone(n); ph = p.height * pw / p.width
        p = p.resize((int(pw), int(ph)), Image.LANCZOS)
        lift = [70, 30, 0, 30, 70][i] * k
        px = (W - total) / 2 + i * (pw + pgap); py = top + lift
        c.paste(p, (int(px), int(py)), p)
    c.save(out, optimize=True)
    print(out, c.size)

make(3840, 1646, HERE / 'outperf-header-3840x1646.png')
make(5244, 2950, HERE / 'outperf-header-5244x2950.png')
