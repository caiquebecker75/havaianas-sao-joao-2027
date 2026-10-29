# Monta as imagens e os dados das 51 peças da campanha a partir da pasta PEÇAS do Drive (já no HD).
#   python3 fonte/montar.py
# Saída: assets/pecas/<id>/*.webp e assets/pecas.js (window.PECAS)
import json, re, os, sys
from pathlib import Path
from PIL import Image
import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
DRIVE = Path('/Volumes/hd caique becker/Mac Caique/Downloads/alpargatas-bid/sao-joao/drive')
STATUS = Path('/Volumes/hd caique becker/Mac Caique/Downloads/alpargatas-bid/sao-joao/pecas/STATUS_3D_PECAS_2027_atualizada.xlsx')
SAIDA = RAIZ / 'assets' / 'pecas'

# grupo de cada peça pelo tipo de objeto (o nome da peça diz o que ela é)
GRUPO = {
  'P002': 'Mesas e cubos', 'P003': 'Mesas e cubos', 'P004': 'Mesas e cubos', 'P005': 'Mesas e cubos', 'P006': 'Mesas e cubos', 'P007': 'Mesas e cubos',
  'P008': 'Displays', 'P009': 'Displays', 'P010': 'Displays', 'P022': 'Displays', 'P027': 'Displays',
  'P011': 'Bandejas', 'P012': 'Bandejas', 'P013': 'Bandejas',
  'P015': 'Vitrine e parede', 'P016': 'Vitrine e parede', 'P019': 'Vitrine e parede', 'P030': 'Vitrine e parede',
  'P018': 'Enxovais', 'P020': 'Enxovais',
  'P014': 'Gôndola e gancheira', 'P023': 'Gôndola e gancheira', 'P024': 'Gôndola e gancheira', 'P025': 'Gôndola e gancheira', 'P026': 'Gôndola e gancheira',
}
CANAL = {'DTC': 'DTC', 'B2B Alimentar': 'B2B Alimentar', 'B2B Especializado': 'B2B Especializado', 'B2B Compartilhado': 'B2B Compartilhado'}

def pasta_da_peca(cod):
    # há pastas antigas com o mesmo código (R1.png, R2.png): vale a que tem o render herói
    for d in sorted(DRIVE.glob(cod + '_*')):
        r = d / 'APLICADO' / 'RENDER'
        if r.is_dir() and any('01_heroi' in f.name for f in r.iterdir()):
            return d / 'APLICADO'
    return None

def ordem(nome):
    n = nome.lower()
    for k, (rot, tipo) in enumerate([('01_heroi', 'heroi'), ('02_frontal', 'frontal'), ('03_detalhe', 'detalhe'), ('05_detalhe', 'detalhe'),
                                     ('04_detalhe', 'detalhe'), ('04_testeira', 'frontal'), ('04_aplicado', 'aplicado')]):
        if rot in n:
            return k, tipo
    return None

def salva(src, dst, largura, q=80):
    if dst.exists() and dst.stat().st_mtime > src.stat().st_mtime:
        return Image.open(dst).size
    im = Image.open(src).convert('RGB')
    if im.width > largura:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, 'WEBP', quality=q, method=6)
    return im.size

wb = openpyxl.load_workbook(STATUS)
ws = wb['Status 3D']
pecas = []
for lin in ws.iter_rows(min_row=2, values_only=True):
    cod, canal, nome, resp, _, _, cena, _, _, status, obs = lin[:11]
    if not cod or status != 'Feito' or cena != 'sim':
        continue
    ap = pasta_da_peca(cod)
    if not ap:
        print('sem pasta', cod); continue
    pid = cod.lower()
    imgs = []
    for f in sorted((ap / 'RENDER').iterdir()):
        if f.suffix.lower() not in ('.png', '.jpg'):
            continue
        o = ordem(f.name)
        if not o:
            continue
        k, tipo = o
        imgs.append((k, f.name, tipo, f))
    imgs.sort()
    vistas = []
    for i, (k, nomeArq, tipo, f) in enumerate(imgs):
        arq = f'{i+1:02d}-{tipo}.webp'
        w, h = salva(f, SAIDA / pid / arq, 1600)
        vistas.append({'src': f'assets/pecas/{pid}/{arq}', 'tipo': tipo, 'w': w, 'h': h})
    # conceito do ChatGPT com os KVs novos (a versão mais nova)
    conc = sorted((ap / 'CONCEITO').glob('*_conceito_kv27_v*.png'))
    conceito = None
    if conc:
        w, h = salva(conc[-1], SAIDA / pid / 'conceito.webp', 1100)
        conceito = {'src': f'assets/pecas/{pid}/conceito.webp', 'w': w, 'h': h}
    fonte_heroi = next((f for _, _, tipo, f in imgs if tipo == 'heroi'), imgs[0][3])
    salva(fonte_heroi, SAIDA / pid / 'mini.webp', 560, 78)
    pecas.append({
        'id': pid, 'codigo': cod, 'nome': nome, 'canal': CANAL.get(canal, canal),
        'grupo': GRUPO.get(cod, canal.replace('B2B ', '')),
        'mini': f'assets/pecas/{pid}/mini.webp', 'vistas': vistas, 'conceito': conceito,
    })
    print(cod, nome, len(vistas), 'vistas', 'conceito' if conceito else 'sem conceito')

(RAIZ / 'assets' / 'pecas.js').write_text('window.PECAS=' + json.dumps(pecas, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(len(pecas), 'peças')
