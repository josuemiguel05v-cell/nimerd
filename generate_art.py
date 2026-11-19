from pathlib import Path
from html import escape
from random import Random
p=Path(__file__).parent/'assets/art'
entries=[
 ('eclipse','ECLIPSE','RISING','#39218c','#ec56e8','#ffc2c1','moon'),
 ('neon','NEON','SAMURAI','#080f36','#874ff7','#54eaf6','city'),
 ('sakura','SAKURA','DAYS','#3d174e','#e66bb9','#ffd6f2','blossom'),
 ('starlight','STARLIGHT','ACADEMY','#0c2458','#7159e0','#9ae4fa','stars'),
 ('shadow','SHADOW','LEGACY','#1d1430','#803acd','#ffaf85','mountain'),
 ('astral','ASTRAL','DRIFT','#071f4b','#26a0b2','#d75ff0','planet'),
 ('kitsune','KITSUNE','NO YUME','#45203b','#fe7c93','#ffe3ae','moon'),
 ('reverie','REVERIE','ZERO','#1b1d59','#6558ed','#aaf5f1','city'),
 ('celestial','CELESTIAL','CODE','#1d134a','#b557eb','#f7b75e','planet'),
 ('midnight','MIDNIGHT','BLOOM','#171b3b','#ae42a1','#ffeeb7','blossom')
]
for i,(slug,a,b,c1,c2,c3,scene) in enumerate(entries):
 rng=Random(21+i)
 stars=''.join(f'<circle cx="{rng.randint(5,385)}" cy="{rng.randint(0,420)}" r="{rng.choice([.7,1,1.5,2])}" fill="white" opacity="{rng.uniform(.2,.75):.2f}" />' for _ in range(42))
 moon=f'<circle cx="293" cy="155" r="105" fill="{c3}" opacity=".84"/><circle cx="277" cy="139" r="98" fill="url(#moon)" opacity=".25"/>' if scene in ('moon','planet') else ''
 buildings=''.join(f'<rect x="{x}" y="{rng.randint(285,460)}" width="{rng.randint(33,80)}" height="240" fill="{c1}" opacity=".8"/>' for x in range(-20,430,55)) if scene=='city' else ''
 mountains='<path d="M-20 480 L85 300 L155 410 L233 240 L420 495 Z" fill="#08091e" opacity=".75"/><path d="M-20 550 L145 360 L235 470 L332 330 L440 540 Z" fill="#070719" opacity=".9"/>' if scene=='mountain' else ''
 blossoms=''.join(f'<circle cx="{rng.randint(20,380)}" cy="{rng.randint(50,430)}" r="{rng.randint(3,10)}" fill="{c3}" opacity="{rng.uniform(.15,.6):.2f}"/>' for _ in range(35)) if scene=='blossom' else ''
 # Human-inspired original abstract silhouette, not an existing character
 person=f'<path d="M141 595 Q144 435 169 383 L190 320 L179 302 Q165 283 173 258 Q188 222 211 225 Q252 221 259 268 L245 313 L265 360 Q292 428 311 595 Z" fill="#080918" opacity=".95"/><path d="M160 261 L177 229 L206 244 L245 226 L260 266 L241 251 L218 254 L193 247 L180 277 Z" fill="{c1}" stroke="{c3}" stroke-width="3"/><path d="M190 348 Q235 365 263 345 L302 378 Q257 396 239 385 L203 394 Z" fill="{c2}" opacity=".85"/>'
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="{c1}"/><stop offset=".55" stop-color="{c2}"/><stop offset="1" stop-color="#0c0c23"/></linearGradient><radialGradient id="glow"><stop stop-color="{c3}" stop-opacity=".8"/><stop offset="1" stop-color="{c3}" stop-opacity="0"/></radialGradient><linearGradient id="dark" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#060513" stop-opacity="0"/><stop offset="1" stop-color="#060513" stop-opacity="1"/></linearGradient><linearGradient id="moon"><stop stop-color="#fff"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs><rect width="400" height="600" fill="url(#bg)"/><circle cx="320" cy="165" r="210" fill="url(#glow)" opacity=".65"/>{stars}{moon}{buildings}{mountains}{blossoms}{person}<rect y="380" width="400" height="220" fill="url(#dark)"/><path d="M25 520 L375 520" stroke="{c3}" opacity=".4"/><text x="25" y="485" font-family="Arial,sans-serif" font-size="13" font-weight="bold" letter-spacing="5" fill="{c3}">NIME RD ORIGINAL CONCEPT</text><text x="25" y="559" font-family="Arial,sans-serif" font-size="48" font-weight="900" fill="white" letter-spacing="-1">{escape(a)}</text><text x="27" y="592" font-family="Arial,sans-serif" font-size="30" font-weight="bold" fill="{c3}" letter-spacing="7">{escape(b)}</text></svg>'''
 (p/f'{slug}.svg').write_text(svg,encoding='utf-8')
print('Created',len(entries),'original SVG posters')
