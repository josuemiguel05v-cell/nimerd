"""Comprobaciones locales de integridad del paquete. No necesario para publicar."""
import json, pathlib, re, subprocess, sys
from html.parser import HTMLParser
root=pathlib.Path(__file__).resolve().parents[1]
class CollectLinks(HTMLParser):
 def __init__(self): super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ('script','link','img','a'):
   for key in ('src','href'):
    if a.get(key):self.links.append(a[key])
errors=[]
for doc in ['index.html','privacidad.html','editor-episodios.html','404.html']:
 parser=CollectLinks();parser.feed((root/doc).read_text(encoding='utf-8'))
 for u in parser.links:
  if u.startswith(('https:','http:','mailto:','tel:','#','data:')):continue
  path=u.split('#')[0].split('?')[0]
  if path and not (root/path).is_file():errors.append(f'{doc}: enlace ausente {u}')
for js in [*root.glob('assets/js/*.js'),root/'sw.js']:
 r=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
 if r.returncode: errors.append(f'{js.name}: {r.stderr.strip()}')
for f in (root/'data').glob('*.json'):
 try: json.loads(f.read_text(encoding='utf-8'))
 except Exception as e:errors.append(f'{f.name}: {e}')
try:json.loads((root/'manifest.webmanifest').read_text())
except Exception as e:errors.append(f'Manifest: {e}')
try:
 video=root/'assets/media/prueba-reproductor.mp4'
 p=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(video)],capture_output=True,text=True)
 if p.returncode or float(p.stdout)<=2:errors.append('MP4 no verificable')
except Exception as e:errors.append(str(e))
for icon in [192,512]:
 if not (root/f'assets/icon-{icon}.png').is_file():errors.append(f'Falta icono {icon}')
if errors:
 for e in errors:print('ERROR:',e)
 sys.exit(1)
print('OK: enlaces internos, JS, JSON, iconos y vídeo de prueba.')
