(function(){
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const stage=$('#stage'), telas=$$('.tela'), wipe=$('#wipe'), prog=$('#prog i'), cont=$('#cont'), capTxt=$('#capTxt');
  const SVGNS='http://www.w3.org/2000/svg';
  const PECAS=window.PECAS||[], porId=Object.fromEntries(PECAS.map(p=>[p.id,p]));
  // ?pdf=1: cada tela já no estado final, sem transição nem temporizador (usado para gerar o PDF)
  const modoPdf=new URLSearchParams(location.search).has('pdf');
  if(modoPdf)document.documentElement.classList.add('pdf');
  const reduz=matchMedia('(prefers-reduced-motion: reduce)').matches||modoPdf;
  let atual=0, escalaAtual=1, emTransicao=false, pendente=null;
  const total=telas.length, dd=n=>String(n).padStart(2,'0');
  const autos={};let autoAtivos=[];
  const el=(tag,at={},pai)=>{const e=document.createElementNS(SVGNS,tag);for(const k in at)e.setAttribute(k,at[k]);if(pai)pai.appendChild(e);return e;};
  const COR={verm:'#F9250F',lar:'#FC6F05',amar:'#FDB813',roxo:'#8F2980',azul:'#0096FE',papel:'#F4E7CE',tinta:'#1A1512'};

  /* ---------------------------------------------------------- peças montadas a partir dos dados (antes do miolo) */
  // AR: a página de AR publica pecas.json com as peças já prontas; só elas ganham botão e QR
  const AR_BASE='https://projetos.75lab.com.br/ar/havaianas-sao-joao-2027/';
  let comAR={};
  function cartao(p){
    const b=document.createElement('button');b.className='peca';b.dataset.ficha=p.id;b.dataset.cursor='Abrir';
    b.style.backgroundImage='url('+p.mini+')';
    b.innerHTML='<span><b></b></span>';b.querySelector('b').textContent=p.codigo;b.querySelector('span').append(p.nome);
    return b;
  }
  // DTC: uma prateleira por tipo de peça
  (function(){
    const g=$('#gDTC'),grupos={};
    PECAS.filter(p=>p.canal==='DTC').forEach(p=>(grupos[p.grupo]=grupos[p.grupo]||[]).push(p));
    ['Mesas e cubos','Vitrine e parede','Displays','Bandejas','Gôndola e gancheira','Enxovais'].forEach(n=>{
      const ps=grupos[n]||[];if(!ps.length)return;
      const pr=document.createElement('div');pr.className='prat';
      pr.innerHTML='<h4><b>'+ps.length+'</b></h4><div class="linha-p"></div>';pr.querySelector('h4').append(n);
      ps.forEach(p=>pr.querySelector('.linha-p').appendChild(cartao(p)));g.appendChild(pr);
    });
  })();
  // desdobramento: os quatro canais
  const CANAIS=[['DTC','Lojas próprias, franquias e quiosques: mesas big hello, cubos, vitrines, bandejas e gancheira.','dtc'],
    ['B2B Alimentar','Supermercado e atacarejo: ponta de gôndola, ilha, backlight, windbanner e tira cross.','b2b'],
    ['B2B Especializado','Calçados e departamento: ponto extra, parede de categoria, mesa central e vitrine.','b2b'],
    ['B2B Compartilhado','Peças que servem aos dois varejos: totem, torre, móbile, balcão, estande de feira.','b2b']];
  (function(){
    const box=$('.s-des .canais');
    CANAIS.forEach(([c,txt,ir],k)=>{
      const ps=PECAS.filter(p=>p.canal===c);
      const b=document.createElement('button');b.className='canal'+(k===0?' on':'');b.dataset.cursor='Ver';b.dataset.alvo=ir;b.dataset.canal=c;
      b.innerHTML='<b class="n">'+ps.length+'</b><h3></h3><p></p><div class="mins"></div>';
      b.querySelector('h3').textContent=c;b.querySelector('p').textContent=txt;
      ps.slice(0,8).forEach(p=>{const i=document.createElement('i');i.style.backgroundImage='url('+p.mini+')';b.querySelector('.mins').appendChild(i);});
      box.appendChild(b);
    });
  })();
  const nRenders=PECAS.reduce((s,p)=>s+p.vistas.length,0);$('#nRenders').dataset.conta=nRenders;

  /* ---------------------------------------------------------- miolo */
  telas.forEach(t=>{
    const m=document.createElement('div');m.className='miolo';
    [...t.childNodes].forEach(n=>{if(!(n.nodeType===1&&n.classList.contains('sangra')))m.appendChild(n);});
    t.appendChild(m);
  });

  /* ---------------------------------------------------------- palco */
  function escala(){escalaAtual=Math.min(innerWidth/1600,innerHeight/900);stage.style.transform='scale('+escalaAtual+')';}
  addEventListener('resize',escala);escala();

  function contar(e){
    const alvo=parseFloat(e.dataset.conta),t0=performance.now(),dur=1300,fmt=new Intl.NumberFormat('pt-BR');
    if(reduz){e.textContent=fmt.format(alvo);return;}
    (function passo(t){const p=Math.min(1,(t-t0)/dur);e.textContent=fmt.format(Math.round(alvo*(1-Math.pow(1-p,3))));if(p<1)requestAnimationFrame(passo);})(t0);
  }

  /* ---------------------------------------------------------- navegação */
  const aoEntrar={};
  const TEMA={papel:'claro',papel2:'claro',tinta:'escuro',vermelho:'escuro',foto:'foto'};
  function aplicar(n){
    telas[atual].querySelectorAll('video').forEach(v=>{if(!v.closest('.s-capa'))v.pause();});
    pararAutos();
    telas[atual].classList.remove('ativa');
    atual=n;const t=telas[n];
    t.classList.add('ativa');
    stage.className='t-'+(TEMA[t.dataset.tema]||'escuro')+(n===0?' capa':'');
    capTxt.textContent=t.dataset.cap||'';
    prog.style.width=((n+1)/total*100)+'%';
    cont.textContent=dd(n+1)+' / '+dd(total);
    $('#ant').disabled=n===0;$('#prox').disabled=n===total-1;
    t.querySelectorAll('[data-conta]').forEach(contar);
    $$('#sumLista button').forEach((b,i)=>b.classList.toggle('atual',i===n));
    history.replaceState(null,'','#'+(n+1));
    const fn=aoEntrar[t.classList[1]];if(fn)fn(t);
    iniciarAutos(t);
  }
  function ir(n){
    n=Math.max(0,Math.min(total-1,n));
    if(emTransicao){pendente=n;return;}
    if(n===atual)return;
    if(reduz||!wipe.animate){aplicar(n);return;}
    const dir=n>atual?1:-1;
    const de=dir>0?'inset(0 0 0 100%)':'inset(0 100% 0 0)', meio='inset(0 0 0 0)', para=dir>0?'inset(0 100% 0 0)':'inset(0 0 0 100%)';
    emTransicao=true;const ease='cubic-bezier(.7,0,.3,1)';
    wipe.animate([{clipPath:de},{clipPath:meio}],{duration:360,easing:ease,fill:'forwards'}).onfinish=()=>{
      aplicar(n);
      wipe.animate([{clipPath:meio},{clipPath:para}],{duration:420,easing:ease,fill:'forwards'}).onfinish=()=>{emTransicao=false;if(pendente!==null){const p=pendente;pendente=null;ir(p);}};
    };
  }
  addEventListener('hashchange',()=>{const n=parseInt(location.hash.slice(1),10);if(!isNaN(n))ir(n-1);});
  $('#ant').addEventListener('click',e=>{e.stopPropagation();ir(atual-1);});
  $('#prox').addEventListener('click',e=>{e.stopPropagation();ir(atual+1);});
  const indice=v=>/^\d+$/.test(v)?+v-1:telas.findIndex(t=>t.id===v);
  $$('[data-ir]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();ir(indice(b.dataset.ir));}));

  /* sumário */
  const sum=$('#sumario'), lista=$('#sumLista');
  telas.forEach((t,i)=>{
    const li=document.createElement('li'), b=document.createElement('button');
    b.innerHTML='<b>'+dd(i+1)+'</b>';b.append(t.dataset.titulo);b.dataset.cursor='Ir';
    b.addEventListener('click',e=>{e.stopPropagation();fecharSum();setTimeout(()=>ir(i),60);});
    li.appendChild(b);lista.appendChild(li);
  });
  function abrirSum(){sum.classList.add('aberto');}
  function fecharSum(){sum.classList.remove('aberto');}
  $$('[data-sumario]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();abrirSum();}));
  $('.fechar',sum).addEventListener('click',e=>{e.stopPropagation();fecharSum();});

  /* teclado, clique e toque */
  addEventListener('keydown',e=>{
    if(caixa.classList.contains('aberta')){if(e.key==='Escape')fecharCaixa();return;}
    if(ficha.classList.contains('aberta')){if(e.key==='Escape')fecharFicha();else if(e.key==='ArrowRight')vizinha(1);else if(e.key==='ArrowLeft')vizinha(-1);return;}
    if(sum.classList.contains('aberto')){if(e.key==='Escape')fecharSum();return;}
    if(['ArrowRight','PageDown',' ','Enter'].includes(e.key)){e.preventDefault();ir(atual+1);}
    else if(['ArrowLeft','PageUp','Backspace'].includes(e.key)){e.preventDefault();ir(atual-1);}
    else if(e.key==='Home')ir(0);else if(e.key==='End')ir(total-1);
    else if(e.key==='m'||e.key==='M')sum.classList.contains('aberto')?fecharSum():abrirSum();
  });
  const INTERATIVO='a,button,input,.amplia,[data-cursor],#sumario,svg,model-viewer';
  $('#wrap').addEventListener('click',e=>{
    if(e.target.closest(INTERATIVO))return;
    if(sum.classList.contains('aberto'))return;
    ir(e.clientX>innerWidth/2?atual+1:atual-1);
  });
  let x0=null,y0=null;
  addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  addEventListener('touchend',e=>{
    if(x0===null||ficha.classList.contains('aberta')||caixa.classList.contains('aberta'))return;
    const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)&&!e.target.closest('model-viewer'))ir(dx<0?atual+1:atual-1);x0=null;
  });

  /* lightbox */
  const caixa=$('#caixa');
  function fecharCaixa(){caixa.classList.remove('aberta');}
  document.addEventListener('click',e=>{
    const a=e.target.closest('[data-amplia]');if(!a)return;
    e.stopPropagation();$('#cxImg').src=a.dataset.amplia;$('#cxTxt').textContent=a.dataset.legenda||'';caixa.classList.add('aberta');
  });
  caixa.addEventListener('click',e=>{if(e.target===caixa||e.target.closest('.fechar'))fecharCaixa();});

  /* ---------------------------------------------------------- ficha da peça */
  const ficha=$('#ficha');let fichaAtual=null,listaFicha=PECAS;
  const ROT={heroi:'3/4',frontal:'Frontal',detalhe:'Detalhe',aplicado:'No PDV',conceito:'Conceito',arte:'Arte na medida'};
  const TXT={heroi:'Render da cena 3D, com material e produto em tamanho real.',frontal:'Vista frontal da cena 3D.',detalhe:'Detalhe construtivo da cena 3D.',aplicado:'A peça montada no ponto de venda.',conceito:'Conceito gerado a partir dos KVs, antes do 3D.'};
  function mostraVista(v){
    $('#fiImg').src=v.src;
    $$('#fiMini button').forEach(b=>b.classList.toggle('on',b.dataset.src===v.src));
    $('#fiTxt').textContent=v.tipo==='arte'?'Engenharia e arte-final: '+v.rot+', a face que vai para a gráfica.':(TXT[v.tipo]||'');
  }
  function abrirFicha(id){
    const p=porId[id];if(!p)return;fichaAtual=p;
    $('#fiCanal').textContent=p.canal+' · '+p.grupo;$('#fiCod').textContent=p.codigo;$('#fiNome').textContent=p.nome;
    const vistas=[...p.vistas];if(p.conceito)vistas.push({...p.conceito,tipo:'conceito'});(p.artes||[]).forEach(a=>vistas.push(a));
    const m=$('#fiMini');m.innerHTML='';
    vistas.forEach(v=>{const b=document.createElement('button');b.dataset.src=v.src;b.style.backgroundImage='url('+v.src+')';b.dataset.cursor='Ver';
      b.innerHTML='<span></span>';b.firstChild.textContent=ROT[v.tipo]||v.tipo;b.addEventListener('click',e=>{e.stopPropagation();mostraVista(v);});m.appendChild(b);});
    mostraVista(vistas[0]);
    const ar=$('#fiAr');ar.innerHTML='';
    const a=comAR[p.id];
    if(a){
      const url=AR_BASE+'?peca='+p.id;
      ar.innerHTML='<div class="bloco"><img alt="QR do AR"><div><p>Aponte a câmera do celular para ver a peça em tamanho real, no lugar.</p><a class="botao mini" target="_blank" rel="noopener" data-cursor="Abrir">Abrir em AR</a></div></div>';
      ar.querySelector('img').src='assets/qr/'+p.id+'.svg';ar.querySelector('a').href=a.pagina||url;
    }
    ficha.classList.add('aberta');pararAutos();
  }
  function fecharFicha(){ficha.classList.remove('aberta');}
  function vizinha(d){if(!fichaAtual)return;const i=listaFicha.indexOf(fichaAtual);abrirFicha(listaFicha[(i+d+listaFicha.length)%listaFicha.length].id);}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-ficha]');if(!b)return;e.stopPropagation();abrirFicha(b.dataset.ficha);});
  $('.fechar',ficha).addEventListener('click',e=>{e.stopPropagation();fecharFicha();});
  $('#fiAnt').addEventListener('click',e=>{e.stopPropagation();vizinha(-1);});
  $('#fiProx').addEventListener('click',e=>{e.stopPropagation();vizinha(1);});
  $('#fiImg').addEventListener('click',e=>{e.stopPropagation();$('#cxImg').src=$('#fiImg').src;$('#cxTxt').textContent=fichaAtual.codigo+' · '+fichaAtual.nome;caixa.classList.add('aberta');});
  fetch(AR_BASE+'pecas.json',{cache:'no-store'}).then(r=>r.ok?r.json():[]).then(l=>{
    (Array.isArray(l)?l:[]).forEach(a=>{if(a&&a.id)comAR[a.id]=a;});
    $$('.peca').forEach(b=>{if(comAR[b.dataset.ficha]&&!b.querySelector('.ar-tag')){const t=document.createElement('i');t.className='ar-tag';t.textContent='AR';b.appendChild(t);}});
    montaAR();
  }).catch(()=>{});

  /* ---------------------------------------------------------- cursor */
  const cur=$('#cursor'),anel=$('#anel'),anelTxt=$('#anelTxt');
  let mx=innerWidth/2,my=innerHeight/2,ax=mx,ay=my;
  addEventListener('mousemove',e=>{
    document.body.classList.add('tem-mouse');mx=e.clientX;my=e.clientY;
    cur.style.transform='translate('+mx+'px,'+my+'px)';
    const alvo=e.target.closest('[data-cursor],a,button,.amplia');
    anel.classList.toggle('sobre',!!alvo);anelTxt.textContent=alvo?(alvo.dataset.cursor||'Ir'):'';
  },{passive:true});
  (function segue(){ax+=(mx-ax)*.2;ay+=(my-ay)*.2;anel.style.transform='translate('+ax+'px,'+ay+'px)';requestAnimationFrame(segue);})();
  addEventListener('mousedown',()=>document.body.classList.add('clicou'));
  addEventListener('mouseup',()=>document.body.classList.remove('clicou'));
  addEventListener('touchstart',()=>document.body.classList.remove('tem-mouse'),{passive:true});
  $('#verAssim').addEventListener('click',()=>document.body.classList.add('forcar'));

  /* ---------------------------------------------------------- 01 capa: no PDF, o KV parado */
  if(modoPdf){const v=$('.s-capa video');v.removeAttribute('autoplay');v.pause();}

  /* ---------------------------------------------------------- 03 lockup */
  (function(){
    const lk=$('#lockup1'),bs=$$('#lockModos .modo');
    bs.forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();bs.forEach(x=>x.classList.toggle('on',x===b));lk.classList.toggle('ouve',b.dataset.m==='ouve');}));
    aoEntrar['s-lock']=()=>{bs.forEach((x,i)=>x.classList.toggle('on',i===0));lk.classList.remove('ouve');};
    roteiro('s-lock',{itens:()=>bs,ms:k=>k===0?5000:6000});
  })();

  /* ---------------------------------------------------------- 04 a tira é a bandeirinha */
  (function(){
    const g=$('.s-tira .bandeiras'),f=$('#fieira'),cores=[COR.verm,COR.azul,COR.amar,COR.roxo,COR.lar,COR.verm];
    // bandeirinha = triângulo de ponta para baixo; virada 180°, o V vira a tira do chinelo
    cores.forEach((c,i)=>{
      const x=40+i*142,y=60+Math.sin((i+.5)/6*Math.PI)*42;
      const b=el('g',{class:'band',transform:'translate('+x+' '+y+')'},g);
      // o grupo interno recebe a rotação (o externo guarda a posição)
      const gi=el('g',{class:'band'},b);b.setAttribute('class','');
      el('path',{class:'flag',d:'M0 0H110L55 150Z',fill:c},gi);
      // chinelo visto de cima, desenhado de cabeça para baixo (fica certo depois de girar 180°)
      el('path',{class:'sola',d:'M55 196C80 196 94 176 94 146 94 116 85 96 84 70 82 38 74 12 55 12S28 38 26 70C25 96 16 116 16 146 16 176 30 196 55 196Z',fill:c},gi);
      el('path',{class:'tira-v',d:'M24 108L55 150 86 108'},gi);
    });
    const bt=$('#virar');
    bt.addEventListener('click',e=>{e.stopPropagation();f.classList.toggle('virada');});
    aoEntrar['s-tira']=()=>{f.classList.remove('virada');if(modoPdf)f.classList.add('virada');};
    roteiro('s-tira',{itens:()=>[bt],inicio:()=>-1,primeiro:3500,ms:()=>4500});
  })();

  /* ---------------------------------------------------------- 05 manifesto */
  (function(){
    const ps=$$('#estrofes p'),box=$('#manPontos');
    ps.forEach((p,i)=>{const b=document.createElement('button');b.textContent=dd(i+1);b.dataset.cursor='Ler';b.className=i===0?'on':'';
      b.addEventListener('click',e=>{e.stopPropagation();ps.forEach((x,j)=>x.classList.toggle('on',j===i));$$('button',box).forEach((x,j)=>x.classList.toggle('on',j===i));});box.appendChild(b);});
    aoEntrar['s-man']=()=>{$$('button',box)[modoPdf?ps.length-1:0].click();};
    roteiro('s-man',{itens:()=>$$('button',box),texto:k=>ps[k].textContent,extra:800});
  })();

  /* ---------------------------------------------------------- 06 cor */
  (function(){
    const PAL=[['Vermelho festa','#F9250F','fundo do lettering e das peças'],['Laranja fogueira','#FC6F05','blocos de malha e ícones'],['Amarelo milho','#FDB813','"PÉ DE", o friso e o produto herói'],
      ['Roxo chita','#8F2980','"NOSSO JEITO" na variação e a estampa'],['Azul de junho','#0096FE','blocos de malha e a segunda estampa'],['Papel cordel','#F4E7CE','base das peças de papel e do texto'],['Tinta','#1A1512','preto quente, nunca #000']];
    const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.substr(i,2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2];};
    const ctr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    const varal=$('#varal'),w=1456,n=PAL.length;
    PAL.forEach(([nome,hex],i)=>{
      const x=24+i*(w-48-150)/(n-1),y=8+Math.sin((x+75)/w*Math.PI)*42-2;
      const b=document.createElement('button');b.className='flag'+(i===0?' on':'');b.style.left=x+'px';b.style.top=y+'px';b.dataset.cursor='Ver';
      b.innerHTML='<svg viewBox="0 0 150 200"><path d="M0 0H150L75 196Z" fill="'+hex+'"/></svg><span></span>';
      const s=b.querySelector('span');s.textContent=hex;s.style.color=ctr(hex,'#FFFFFF')>ctr(hex,COR.tinta)?'#fff':COR.tinta;
      b.addEventListener('click',e=>{e.stopPropagation();mostra(i);});varal.appendChild(b);
    });
    function mostra(i){
      const [nome,hex,uso]=PAL[i];$$('.s-cor .flag').forEach((f,j)=>f.classList.toggle('on',j===i));
      $('#corNome').textContent=nome;$('#corHex').textContent=hex;$('#corUso').textContent=uso;
      const cb=ctr(hex,'#FFFFFF'),ct=ctr(hex,COR.tinta),f1=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2,minimumFractionDigits:2});
      const tb=$('#corTesteB'),tt=$('#corTesteT');
      // AA: 4,5:1 para texto corrido, 3:1 só para título grande
      const nota=r=>r>=4.5?'texto e título':r>=3?'só título grande':'não usar';
      [[tb,'#FFFFFF',cb,'branco'],[tt,COR.tinta,ct,'tinta']].forEach(([e,c,r,nm])=>{e.style.background=hex;e.style.color=c;e.textContent='Aa '+nm+' · '+f1.format(r)+':1 · '+nota(r);e.classList.toggle('ruim',r<3);});
      const melhor=cb>=ct?'branca':'tinta';
      $('#corRegra').textContent='Tipografia '+melhor+' nesta cor. Contraste conferido por cálculo (WCAG AA), não por impressão.';
      const fi=$('#corFicha');fi.classList.remove('troca');void fi.offsetWidth;fi.classList.add('troca');
    }
    mostra(0);
    aoEntrar['s-cor']=()=>mostra(0);
    roteiro('s-cor',{itens:()=>$$('.s-cor .flag'),ms:()=>4800});
  })();

  /* ---------------------------------------------------------- 07 KVs */
  (function(){
    const bs=$$('#kvLista button'),vs=[...$('#kvQuadro').children];
    bs.forEach((b,k)=>b.addEventListener('click',e=>{e.stopPropagation();bs.forEach(x=>x.classList.toggle('on',x===b));vs.forEach((v,j)=>v.classList.toggle('on',j===k));
      const vid=vs[3];if(k===3&&!modoPdf){vid.preload='auto';vid.play().catch(()=>{});}else vid.pause();}));
    aoEntrar['s-kvs']=()=>bs[0].click();
    roteiro('s-kvs',{itens:()=>bs,ms:k=>k===3?7000:6000});
  })();

  /* ---------------------------------------------------------- 08 roda */
  (function(){
    const g=$('.s-roda .pares'),cores=[COR.verm,COR.azul,COR.amar,COR.roxo,COR.lar,'#0B7236'],pares=[];
    cores.forEach((c,i)=>{
      const a=i*60;const p=el('g',{class:'par',transform:'rotate('+a+') translate(0 -190) rotate(180)'},g);
      // par lado a lado, com o bico para o meio da roda: todos voltados para o centro, como na quadrilha
      [-1,1].forEach(s=>{const u=el('g',{transform:'translate('+(s*20-15)+' -65) rotate('+(s*6)+' 15 65)'},p);
        el('path',{class:'sola',d:'M15 2C24 2 29 9 29 20s-3 19-4 29c-1 12-3 22-10 22S5 61 5 49C4 39 1 31 1 20 1 9 6 2 15 2z',fill:c,transform:'scale(1.6) translate(-6 -10)'},u);
        el('path',{class:'tira',d:'M6 32L15 18l9 14',fill:'none',transform:'scale(1.6) translate(-6 -10)'},u);});
      pares.push(p);
    });
    const bs=$$('#rodaFracao button'),roda=$('#roda6');
    // o desenho da roda sai girando e entra o render 3D da flor de chinelos
    function fr(n){
      roda.classList.toggle('em3d',n==='3d');
      if(n!=='3d')pares.forEach((p,i)=>p.classList.toggle('fora',i>=n));
      bs.forEach(b=>b.classList.toggle('on',b.dataset.n===String(n)));
    }
    bs.forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();fr(b.dataset.n==='3d'?'3d':+b.dataset.n);}));
    aoEntrar['s-roda']=()=>fr(modoPdf?'3d':6);
    roteiro('s-roda',{itens:()=>bs,inicio:()=>2,ms:k=>k===2?2400:k===3?6000:3500});
  })();

  /* ---------------------------------------------------------- 09 desdobramento */
  (function(){
    const cs=$$('.s-des .canal');
    cs.forEach(c=>c.addEventListener('click',e=>{e.stopPropagation();
      if(c.classList.contains('on')&&e.isTrusted){if(c.dataset.alvo==='b2b')b2bCanal(c.dataset.canal);ir(indice(c.dataset.alvo));return;}
      cs.forEach(x=>x.classList.toggle('on',x===c));}));
    aoEntrar['s-des']=()=>cs.forEach((x,i)=>x.classList.toggle('on',i===0));
    roteiro('s-des',{itens:()=>cs,texto:k=>cs[k].textContent});
  })();

  /* ---------------------------------------------------------- 12 B2B */
  let b2bCanal=()=>{};
  (function(){
    const abas=$$('#b2bAbas button'),cards=$('#b2bCards'),dest=$('#b2bDest');
    function destaque(p){const im=$('img',dest);im.src=p.vistas[0].src;dest.dataset.ficha=p.id;$('.leg b',dest).textContent=p.codigo;$('.leg span',dest).textContent=p.nome;
      $$('.peca',cards).forEach(b=>b.classList.toggle('on',b.dataset.ficha===p.id));}
    function canal(c){
      abas.forEach(a=>a.classList.toggle('on',a.dataset.c===c));cards.innerHTML='';
      const ps=PECAS.filter(p=>p.canal===c);
      ps.forEach(p=>{const b=cartao(p);b.addEventListener('mouseenter',()=>destaque(p));cards.appendChild(b);
        const t=comAR[p.id];if(t){const i=document.createElement('i');i.className='ar-tag';i.textContent='AR';b.appendChild(i);}});
      destaque(ps[0]);cards.classList.remove('troca');void cards.offsetWidth;cards.classList.add('troca');
    }
    b2bCanal=canal;
    abas.forEach(a=>a.addEventListener('click',e=>{e.stopPropagation();canal(a.dataset.c);}));
    canal('B2B Alimentar');
    aoEntrar['s-b2b']=()=>{if(!abas.some(a=>a.classList.contains('on')))canal('B2B Alimentar');};
    roteiro('s-b2b',{itens:()=>abas,ms:()=>7000});
  })();

  /* ---------------------------------------------------------- 14 AR: as peças já publicadas na página de AR */
  let carregouMV=false;
  function montaAR(){
    const box=$('#arChips'),ids=Object.keys(comAR);if(!ids.length||box.children.length)return;
    // ordem da campanha (a mesma das galerias)
    const lista=PECAS.filter(p=>comAR[p.id]);
    lista.slice(0,12).forEach(p=>{const b=document.createElement('button');b.textContent=p.codigo+' · '+p.nome;b.dataset.cursor='Ver';b.dataset.id=p.id;
      b.addEventListener('click',e=>{e.stopPropagation();mostraAR(p.id);});box.appendChild(b);});
    $('#arConta').textContent=lista.length===1?'1 peça em AR':lista.length+' peças em AR';
    mostraAR(lista[0].id);
  }
  function mostraAR(id){
    const a=comAR[id],mv=$('#arMv');if(!a)return;
    mv.setAttribute('src',a.glb);mv.setAttribute('ios-src',a.usdz);mv.setAttribute('poster',a.poster);
    if(a.placement==='wall')mv.setAttribute('ar-placement','wall');else mv.removeAttribute('ar-placement');
    const m=a.medidas_cm,f=v=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v);
    $('#arMed').textContent=m?porId[id].codigo+' · '+m.map(f).join(' × ')+' cm':porId[id].codigo;
    $$('#arChips button').forEach(b=>b.classList.toggle('on',b.dataset.id===id));
  }
  aoEntrar['s-ar']=()=>{
    if(!carregouMV){carregouMV=true;const sc=document.createElement('script');sc.type='module';sc.src='assets/vendor/model-viewer.min.js';document.head.appendChild(sc);}
    if(modoPdf)$('#arMv').removeAttribute('auto-rotate');
  };
  roteiro('s-ar',{itens:()=>$$('#arChips button'),ms:()=>7000});


  /* ---------------------------------------------------------- story visit: topview com os pontos de cada loja */
  $$('.s-loja').forEach(t=>{
    const dados=JSON.parse(t.querySelector('.dados-l').textContent),pins=[...t.querySelectorAll('.pin')],box=t.querySelector('.ponto');
    let k=0,r=0;
    function foto(){const d=dados[k];const im=box.querySelector('.foto-p img');im.src=d.r[r];im.dataset.amplia=d.r[r];
      box.querySelector('.foto-p').dataset.n=d.r.length>1?(r+1)+' / '+d.r.length:'';}
    function mostra(i){
      k=i;r=0;const d=dados[i];
      pins.forEach((p,j)=>p.classList.toggle('on',j===i));
      box.querySelector('.num-p').textContent='Ponto '+(i+1)+' de '+dados.length;
      box.querySelector('h3').textContent=d.t;box.querySelector('p').textContent=d.d;foto();
      const pc=box.querySelector('.pecas-p');pc.innerHTML='';
      d.p.forEach(id=>{const q=porId[id];if(!q)return;const b=document.createElement('button');b.className='pc';b.dataset.ficha=id;b.dataset.cursor='Abrir';
        b.innerHTML='<img alt=""><span><b></b></span>';b.querySelector('img').src=q.mini;b.querySelector('b').textContent=q.codigo;b.querySelector('span').append(q.nome);pc.appendChild(b);});
      if(d.p.length){const h=document.createElement('em');h.textContent='Peças da campanha para este ponto · clique para ver renders, conceito e artes na medida';pc.prepend(h);}
      box.classList.remove('troca');void box.offsetWidth;box.classList.add('troca');
    }
    pins.forEach((p,i)=>p.addEventListener('click',e=>{e.stopPropagation();mostra(i);}));
    // a foto do ponto passa pelos renders daquele ponto; com um só, amplia
    box.querySelector('.foto-p').addEventListener('click',e=>{e.stopPropagation();const d=dados[k];
      if(d.r.length>1&&e.isTrusted){r=(r+1)%d.r.length;foto();}else{$('#cxImg').src=d.r[r];$('#cxTxt').textContent=d.t;caixa.classList.add('aberta');}});
    mostra(0);
  });
  aoEntrar['s-loja']=t=>{const p=t.querySelector('.pin');if(p)p.click();};
  roteiro('s-loja',{itens:t=>[...t.querySelectorAll('.pin')],texto:k=>'',ms:()=>5200});

  /* ---------------------------------------------------------- temporizador
     Os botões de cada tela abrem sozinhos, um de cada vez, com tempo para ler.
     O primeiro clique da pessoa dentro da tela para o temporizador até ela sair e voltar. */
  function roteiro(cls,cfg){(autos[cls]=autos[cls]||[]).push(cfg);}
  // PDF: tela com botões vira uma página por botão (fonte/gerar-pdf.mjs chama estas duas)
  const SO_UMA_PAGINA=[];
  const cfgPdf=()=>{const t=$('.tela.ativa');return SO_UMA_PAGINA.includes(t.classList[1])?null:[t,(autos[t.classList[1]]||[])[0]];};
  window.__pdfEstados=()=>{const r=cfgPdf();if(!r||!r[1])return 0;const n=r[1].itens(r[0]).length;return n>1?n:0;};
  window.__pdfEstado=k=>{const [t,c]=cfgPdf();c.itens(t)[k].click();};
  const leitura=txt=>Math.max(4500,Math.min(12000,3000+String(txt||'').replace(/\s+/g,' ').trim().length*45));
  function pararAutos(){autoAtivos.forEach(clearTimeout);autoAtivos=[];$$('.relogio-auto').forEach(r=>r.remove());}
  function iniciarAutos(t){
    if(modoPdf)return;
    (autos[t.classList[1]]||[]).forEach(cfg=>{
      const itens=cfg.itens(t),n=itens.length;if(!n)return;
      const ms=k=>cfg.ms?cfg.ms(k):leitura(cfg.texto?cfg.texto(k):itens[k].textContent)+(cfg.extra||0);
      let i=cfg.inicio?cfg.inicio():Math.max(0,itens.findIndex(x=>x.matches('.on')));
      function relogio(k,dur){
        const alvo=itens[k];
        $$('.relogio-auto',t).forEach(r=>r.remove());
        if(getComputedStyle(alvo).position==='static')alvo.style.position='relative';
        const r=document.createElement('i');r.className='relogio-auto';alvo.appendChild(r);
        r.style.transitionDuration=dur+'ms';void r.offsetWidth;r.classList.add('corre');
      }
      function passo(){
        if(i+1>=n&&cfg.laco===false){$$('.relogio-auto',t).forEach(r=>r.remove());return;}
        i=(i+1)%n;itens[i].click();
        const d=ms(i);relogio(i,d);autoAtivos.push(setTimeout(passo,d));
      }
      if(i<0){autoAtivos.push(setTimeout(passo,cfg.primeiro||2500));return;}
      const d=ms(i);relogio(i,d);autoAtivos.push(setTimeout(passo,d));
    });
  }
  stage.addEventListener('pointerdown',e=>{if(e.isTrusted&&e.target.closest('.tela.ativa'))pararAutos();},true);

  /* ---------------------------------------------------------- início */
  const h=parseInt(location.hash.slice(1),10);
  const n0=isNaN(h)?0:Math.max(0,Math.min(total-1,h-1));
  telas.forEach(t=>t.classList.remove('ativa'));
  atual=n0===0?1:0;aplicar(n0);
  telas.forEach((t,i)=>{if(i!==n0)t.classList.remove('ativa');});
})();
