# Story visit das cinco lojas modeladas: uma tela de abertura e uma tela por loja, com o topview,
# os pontos da campanha (setas clicáveis) e o passeio 3D. Insere as telas depois de "desdobramento".
#   python3 fonte/lojas.py   (refaz as telas se já existirem)
import re, json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
p = RAIZ / 'index.html'
s = p.read_text(encoding='utf-8')
s = re.sub(r'\n  <!-- =+ story visit:.*?<!-- fim story visit -->\n', '\n', s, flags=re.S)

# pontos: (título, x%, y% no topview, renders da loja, texto, peças do catálogo para o ponto)
LOJAS = [
  ('loja-shopping', 'Loja de shopping', '18_Planta_humanizada', '17_Corte_isometrico', '20 renders',
   'Formato premium de shopping: entrada com mesa hero, ilha de pins, mesas, gancheiras, kids e caixa.', [
    ('Fachada e letreiro', 8.6, 49.5, ['01_Fachada_frontal', '03_Letreiro_letra_caixa', '02_Fachada_perspectiva'], 'A vitrine abre a campanha para quem passa no corredor do shopping.', ['p016', 'p015']),
    ('Mesa hero de entrada', 19, 49.5, ['08_Entrada_hero_e_display', '20_PDV_mesa_hero_display_L_e_tags'], 'O ponto de maior leitura: o par São João em destaque, display em L e tags.', ['p002', 'p004']),
    ('Ilha de pins', 35.7, 51, ['09_Ilha_de_pins', '10_Vitrine_de_pins_detalhe'], 'A ilha central organiza a grade por cor e tamanho, com a comunicação da campanha nas pontas.', ['p012']),
    ('Mesas expositoras', 53, 49.5, ['11_Mesas_expositoras'], 'Mesas secundárias com o enxoval de São João e os pares lado a lado.', ['p020', 'p003']),
    ('Gancheiras', 39, 9.5, ['05_Gancheira_feminina', '06_Gancheira_masculina', '07_Detalhe_ganchos'], 'Paredes de gancho com testeira e tag em cada coluna.', ['p014', 'p025']),
    ('Kids e torre', 75, 21.5, ['13_Kids_e_torre'], 'O canto infantil, com a torre de produto na altura das crianças.', ['p018']),
    ('Backwall e banco', 67, 49.5, ['15_Backwall_e_banco', '14_Trilhos_e_ceu'], 'O fundo da loja fecha a perspectiva de quem entra, com banco para provar.', ['p019']),
    ('Caixa', 72, 78, ['12_Caixa_e_fundo', '19_PDV_caixa_orelha_e_testeira'], 'Display de caixa, orelha e testeira: a última compra por impulso.', ['p027', 'p026']),
  ]),
  ('loja-rua', 'Loja de rua', '10_Planta_humanizada', '09_Corte_isometrico', '12 renders',
   'Loja de rua com vitrine para a calçada, mesa de feira, paredão de ganchos e caixa com kids.', [
    ('Fachada e vitrine', 12, 49, ['01_Fachada_dia', '02_Fachada_noite'], 'De dia e de noite, a vitrine chama da calçada.', ['p015', 'p016']),
    ('Mesa hero e display', 24, 50, ['03_Entrada_mesa_hero_e_display'], 'Quem entra encontra a mesa hero com o lettering e o par em destaque.', ['p002', 'p004']),
    ('Ilha de pins', 37.7, 52, ['06_Ilha_de_pins_vitrine'], 'A ilha de pins com a vitrine de produto no centro da loja.', ['p012']),
    ('Mesa de feira e barraca', 54, 50, ['07_Mesa_feira_barraca_e_mesas', '04_Interior_geral'], 'A barraca listrada leva a festa junina para dentro da loja.', ['p020', 'p030']),
    ('Paredão de ganchos', 44, 11, ['05_Paredao_de_ganchos_degrade', '12_Detalhe_ganchos_e_pares'], 'O paredão em degradê de cor, com testeira e tags.', ['p014', 'p025']),
    ('Caixa e kids', 76, 75, ['08_Caixa_kids_e_backwall', '11_Caixa_monitor_e_equipamentos'], 'O caixa com display de impulso e o canto kids ao lado.', ['p027']),
  ]),
  ('quiosque', 'Quiosque', '14_Planta_humanizada', '13_Corte_isometrico', '14 renders',
   'Quiosque de corredor de shopping: cabeceira hero, gancheiras dos dois lados e balcão com caixa.', [
    ('Cabeceira hero', 26, 49.5, ['07_Cabeceira_hero', '01_Quiosque_no_corredor'], 'A cabeceira virada para o fluxo do corredor carrega o KV e os pares em destaque.', ['p009']),
    ('Testeira e adesivo de piso', 45, 27, ['03_Testeira_letra_caixa', '12_Luz_integrada_testeira'], 'Testeira em letra caixa com luz integrada e o convite "Escolha o seu par" no chão.', ['p014']),
    ('Gancheiras', 45, 49.5, ['04_Gancheira_feminina', '05_Gancheira_masculina', '06_Detalhe_ganchos'], 'Feminina de um lado, masculina do outro, com tag em cada coluna.', ['p025', 'p023']),
    ('Pegadas e PDV hero', 43, 82, ['11_PDV_hero_e_pegadas'], 'As pegadas no piso levam do corredor até o produto.', ['p004']),
    ('Balcão e caixa', 76, 49.5, ['09_Balcao_caixa_POS', '02_Quiosque_verso_e_caixa'], 'Balcão com o POS e o display de caixa da campanha.', ['p027']),
    ('Vitrine de pins', 72, 82.5, ['08_Vitrine_de_pins'], 'A vitrine de pins expõe a grade inteira de cores.', ['p010']),
    ('Estoque em gavetões', 68.6, 16, ['10_Estoque_gavetoes'], 'Gavetões numerados: o vendedor acha o tamanho sem sair do quiosque.', []),
  ]),
  ('store-in-store', 'Store in store', '18_Planta_humanizada', '17_Corte_isometrico', '13 renders',
   'Espaço Havaianas dentro do varejo parceiro: corredor de gôndolas, display hero, balcão e piso delimitado.', [
    ('Testeira suspensa e backwall', 50, 12, ['03_Testeira_suspensa_e_logo', '04_Interior_backwall_degrade', '02_Frontal_corredor_principal'], 'A testeira suspensa marca o espaço da marca de longe.', ['p045', 'p041']),
    ('Corredor entre gôndolas', 30.7, 51, ['05_Corredor_entre_gondolas', '06_Detalhe_ganchos_etiquetas'], 'Gôndolas com ganchos e etiquetas de preço da campanha.', ['p053', 'p025']),
    ('Display hero', 63.6, 69, ['07_Display_hero'], 'O display hero sobre a mandala de piso é o centro do espaço.', ['p062', 'p051']),
    ('Balcão de customização', 64, 35.5, ['08_Balcao_de_customizacao'], 'Balcão para personalizar o par, com o enxoval da campanha.', ['p055']),
    ('Gavetões e numeração', 79, 49, ['10_Gavetoes_e_numeracao'], 'Estoque à vista, organizado por numeração.', []),
    ('Piso delimitado', 49, 76, ['11_Vista_alta_piso_delimitado'], 'O adesivo de piso desenha os limites do espaço da marca dentro da loja.', []),
    ('Corredor lateral', 93.6, 68.5, ['12_Corredor_lateral_ReCiclo', '01_Perspectiva_corredor_principal'], 'A lateral do espaço conversa com o corredor do varejo.', ['p039']),
  ]),
  ('corredor', 'Corredor do varejo', '07_Aereo_adesivo_mobile_pegadas', '08_Corte_isometrico', '8 renders',
   'Ambientação de categoria no corredor do varejo: ponta de gôndola, gancheira, displays de chão e clip strips.', [
    ('Ponta de gôndola com display G', 75, 76, ['02_Ponta_display_G_corredor_principal'], 'A ponta no corredor principal recebe o display G e o adesivo "Bem-vindo ao arraiá".', ['p039', 'p044']),
    ('Gancheira Havaianas', 61, 48, ['03_Gancheira_Havaianas_degrade'], 'A parede de categoria em degradê de cor, com testeira e réguas.', ['p045', 'p041']),
    ('Display M no corredor', 36, 53, ['04_Display_M_no_corredor'], 'Display de chão no corredor lateral, para o ponto extra.', ['p053']),
    ('Display P e clip strips', 32.5, 71, ['05_Display_P_e_clip_strips'], 'Display de balcão e clip strips perto de categorias que conversam com o chinelo.', ['p038', 'p054']),
    ('Réguas, wobblers e cesto', 54, 60, ['06_Detalhe_reguas_wobblers_cesto'], 'A comunicação de gôndola que chama o olhar na prateleira.', ['p058']),
    ('Móbile e adesivo de piso', 49, 30, ['07_Aereo_adesivo_mobile_pegadas', '01_Corredor_Havaianas_geral'], 'O móbile suspenso e o adesivo no piso sinalizam o corredor de longe.', ['p057']),
  ]),
]

def todas(loja):
    d = RAIZ / 'assets' / 'lojas' / loja
    return sorted(f.stem for f in d.glob('*.webp') if not f.stem.endswith('-t') and 'Planta' not in f.stem and 'Aereo' not in f.stem)

secoes = []
cards = []
for i, (lid, nome, planta, iso, nren, sub, pontos) in enumerate(LOJAS):
    base = f'assets/lojas/{lid}'
    cards.append(f'<button class="cl" data-ir="loja-{lid}" data-cursor="Visitar"><img src="{base}/{iso}.webp" alt="" loading="lazy"><b>{nome}</b><span>{len(pontos)} pontos · {nren}</span></button>')
    pins = ''.join(f'<button class="pin" style="left:{x}%;top:{y}%" data-k="{k}" data-cursor="Ver"><i><b>{k+1}</b></i></button>' for k, (t, x, y, *_ ) in enumerate(pontos))
    dados = [{'t': t, 'r': [f'{base}/{r}.webp' for r in rs], 'd': d, 'p': ps} for (t, x, y, rs, d, ps) in pontos]
    legenda = ''.join(f'<li><i>{k+1}</i>{t}</li>' for k, (t, *_ ) in enumerate(pontos))
    passeio = ''.join(f'<button class="th amplia" data-amplia="{base}/{r}.webp" data-legenda="{nome} · {r[3:].replace("_", " ")}" style="background-image:url({base}/{r}-t.webp)" data-cursor="Ampliar"></button>' for r in todas(lid))
    secoes.append(f'''  <section id="loja-{lid}" class="tela s-loja" data-tema="papel" data-titulo="Story visit · {nome}" data-cap="Story visit · {nome}">
    <div class="cab-l"><span class="rotulo anima">Story visit {i+1:02d} de 05 · {nome}</span><h2 class="anima d1">{sub}</h2></div>
    <div class="topo-l anima d1"><img src="{base}/{planta}.webp" alt="Topview da {nome}">{pins}<span class="tag-l">Topview · planta humanizada</span></div>
    <span class="cta-l so-tela">Clique nas setas para ver cada ponto</span>
    <div class="ponto anima d2">
      <span class="num-p"></span><h3></h3>
      <div class="foto-p"><img alt=""></div>
      <p></p>
      <div class="pecas-p"></div>
    </div>
    <ol class="legenda-l" aria-hidden="true">{legenda}</ol>
    <div class="passeio anima d3"><span>Passeio 3D · {nren}</span><div class="fila-th">{passeio}</div></div>
    <script type="application/json" class="dados-l">{json.dumps(dados, ensure_ascii=False)}</script>
  </section>
''')

abertura = f'''  <section id="story-visit" class="tela s-sv" data-tema="tinta" data-titulo="Story visit: cinco lojas" data-cap="Story visit">
    <span class="rotulo anima">Story visit</span>
    <h2 class="anima d1">Entramos em cinco lojas <em>e mostramos onde cada peça entra.</em></h2>
    <p class="lead anima d2">Para cada formato: o topview da loja, os pontos da campanha marcados na planta e o passeio 3D. Cada seta abre o ponto, e cada peça abre a ficha com os renders, o conceito e as artes na medida de produção.</p>
    <div class="cards-l anima d3">{''.join(cards)}</div>
    <p class="fonte">Lojas modeladas pela 75 LAB com base em visitas e referências visuais, sem planta nem manual de marca da Havaianas.</p>
  </section>
'''
bloco = '\n  <!-- ===================================================== story visit: abertura e cinco lojas -->\n' + abertura + '\n' + '\n'.join(secoes) + '  <!-- fim story visit -->\n'
i = s.index('id="desdobramento"'); i = s.rindex('<section', 0, i)
k = s.index('</section>', i) + len('</section>\n')
s = s[:k] + bloco + s[k:]
p.write_text(s, encoding='utf-8')
print('telas', len(re.findall(r'<section\b[^>]*class="tela', s)))
