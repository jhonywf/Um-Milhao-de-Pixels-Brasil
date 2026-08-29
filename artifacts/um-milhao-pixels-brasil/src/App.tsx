import { type PointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Crosshair,
  Grid2X2,
  Hand,
  Instagram,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

type PixelBlock = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  name: string;
  detail: string;
  initials: string;
};

const mockBlocks: PixelBlock[] = [
  { id: 'banco-amarelo', x: 82, y: 112, width: 168, height: 98, color: '#ffcf33', name: 'Banco Amarelo', detail: 'A primeira ideia também conta.', initials: 'BA' },
  { id: 'casa-nuvem', x: 328, y: 62, width: 112, height: 160, color: '#ef6b50', name: 'Casa Nuvem', detail: 'Um pedacinho de céu.', initials: 'CN' },
  { id: 'radio-livre', x: 522, y: 124, width: 214, height: 88, color: '#5ac8b0', name: 'Rádio Livre', detail: 'Som para atravessar a tela.', initials: 'RL' },
  { id: 'clube-1999', x: 800, y: 72, width: 128, height: 182, color: '#9367d8', name: 'Clube 1999', detail: 'Nostalgia em baixa resolução.', initials: 'C9' },
  { id: 'salgadinho', x: 120, y: 342, width: 216, height: 120, color: '#f18b42', name: 'Salgadinho Cósmico', detail: 'Demo de bloco ocupado.', initials: 'SC' },
  { id: 'meu-quarto', x: 398, y: 302, width: 106, height: 190, color: '#a7d84c', name: 'Meu Quarto', detail: 'Plantas, pôsteres e pixels.', initials: 'MQ' },
  { id: 'onda-curta', x: 586, y: 342, width: 182, height: 124, color: '#58a7e8', name: 'Onda Curta', detail: 'Sinal encontrado.', initials: 'OC' },
  { id: 'ponto-final', x: 826, y: 382, width: 108, height: 112, color: '#ef5669', name: 'Ponto Final', detail: 'Ainda não é o fim.', initials: 'PF' },
  { id: 'janela-aberta', x: 248, y: 610, width: 198, height: 102, color: '#d9b7f0', name: 'Janela Aberta', detail: 'A internet é feita de frestas.', initials: 'JA' },
  { id: 'sinal-verde', x: 512, y: 594, width: 142, height: 146, color: '#36b86d', name: 'Sinal Verde', detail: 'Pode chegar.', initials: 'SV' },
  { id: 'pixel-pipoca', x: 742, y: 638, width: 190, height: 80, color: '#f4a8c7', name: 'Pixel Pipoca', detail: 'Demo de bloco ocupado.', initials: 'PP' },
];

const previewBlocks = [
  [0, 2, 3, 2, '#ffcf33'], [4, 0, 2, 4, '#ef6b50'], [7, 1, 4, 2, '#5ac8b0'],
  [12, 0, 3, 4, '#9367d8'], [1, 6, 4, 3, '#f18b42'], [6, 5, 2, 5, '#a7d84c'],
  [9, 6, 4, 3, '#58a7e8'], [14, 7, 2, 3, '#ef5669'], [4, 12, 4, 2, '#d9b7f0'],
  [9, 12, 3, 3, '#36b86d'], [13, 13, 4, 2, '#f4a8c7'],
] as const;

function Header() {
  const [location] = useLocation();
  const isWall = location === '/parede';
  return (
    <header className="site-header" data-testid="header-site">
      <Link href="/" className="brand-lockup" data-testid="link-home">
        <span className="brand-pixel" aria-hidden="true"><i /><i /><i /><i /></span>
        <span>UM MILHÃO<br /><b>DE PIXELS</b></span>
      </Link>
      <nav className="desktop-nav" aria-label="Navegação principal">
        <a href="/#como-funciona" data-testid="link-como-funciona">Como funciona</a>
        <Link href="/parede" className={isWall ? 'active' : ''} data-testid="link-parede">Ver a parede <ArrowDownRight size={15} /></Link>
        <a href="/#ranking" data-testid="link-ranking">Ranking</a>
        <a href="/#empresas" data-testid="link-empresas">Empresas</a>
      </nav>
      <Link href="/parede" className="header-cta" data-testid="link-header-cta">
        <span>Comprar pixels</span><ArrowRight size={17} />
      </Link>
    </header>
  );
}

function PixelMosaic({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'pixel-mosaic compact' : 'pixel-mosaic'} data-testid={compact ? 'visual-mosaic-hero' : 'visual-mosaic-preview'}>
      {previewBlocks.map(([x, y, w, h, color], index) => (
        <div
          key={`${x}-${y}`}
          className="mosaic-block"
          style={{ left: `${(x / 18) * 100}%`, top: `${(y / 15) * 100}%`, width: `${(w / 18) * 100}%`, height: `${(h / 15) * 100}%`, backgroundColor: color }}
          data-testid={`mosaic-block-${index}`}
        >
          {!compact && index === 2 && <span>VOCÊ<br />PODE ESTAR AQUI</span>}
        </div>
      ))}
      <div className="mosaic-coordinate coord-a">000,000</div>
      <div className="mosaic-coordinate coord-b">999,999</div>
      <span className="mosaic-scanline" aria-hidden="true" />
    </div>
  );
}

function StatStrip() {
  const stats = [
    ['0', '/ 1.000.000', 'pixels ocupados'],
    ['0%', '', 'completo'],
    ['R$0', '', 'arrecadados'],
    ['0', '', 'compradores'],
  ];
  return (
    <section className="stat-strip" data-testid="section-stats">
      {stats.map(([value, suffix, label], index) => (
        <div className="stat-item" key={label} data-testid={`stat-${index}`}>
          <div><strong>{value}</strong><span>{suffix}</span></div>
          <small>{label}</small>
        </div>
      ))}
    </section>
  );
}

function Home() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <section className="hero" data-testid="section-hero">
          <div className="hero-copy reveal">
            <div className="eyebrow"><span className="eyebrow-dot" /> a maior parede digital do brasil <span className="demo-chip">fase demo</span></div>
            <h1>COMPRE UM<br /><em>PIXEL.</em><br />DEIXE SUA<br /><em>MARCA.</em></h1>
            <p className="hero-deck">Um milhão de pequenos espaços para criar uma memória coletiva na internet.</p>
            <div className="hero-actions">
              <Link href="/parede" className="button button-yellow" data-testid="button-buy-hero">Comprar pixels <ArrowRight size={18} /></Link>
              <Link href="/parede" className="button button-outline" data-testid="button-explore-hero">Explorar a parede</Link>
              <a className="text-link" href="#como-funciona" data-testid="link-scroll-how">Entenda a ideia <ChevronDown size={16} /></a>
            </div>
          </div>
          <div className="hero-visual reveal reveal-delay">
            <div className="visual-caption"><span>O MAPA ESTÁ ABERTO</span><span>001 / 001</span></div>
            <PixelMosaic compact />
            <div className="hero-sticker"><Sparkles size={15} /> feito por todo mundo</div>
          </div>
          <div className="hero-bottom-note">rolar para descobrir <ArrowDownRight size={17} /></div>
        </section>

        <StatStrip />

        <section className="manifesto-section" data-testid="section-manifesto">
          <div className="section-label">01 — o começo</div>
          <div className="manifesto-grid">
            <div>
              <p className="section-kicker">UM ESPAÇO PEQUENO.<br /><span>UMA IDEIA GIGANTE.</span></p>
            </div>
            <div className="manifesto-text">
              <h2>1 milhão de pixels.<br /><span>R$1 cada.</span></h2>
              <p>O que você vai criar?</p>
              <p className="body-copy">Uma frase. Um desenho. O nome da sua cidade. Um recado para alguém do outro lado do país. A parede começa vazia e vai ganhando história, pixel por pixel.</p>
              <Link href="/parede" className="inline-arrow-link" data-testid="link-manifesto-wall">Ver a parede de perto <ArrowRight size={17} /></Link>
            </div>
          </div>
          <div className="marquee" aria-hidden="true"><span>UMA PAREDE FEITA DE IDEIAS</span><span>UMA PAREDE FEITA DE IDEIAS</span></div>
        </section>

        <section className="how-section" id="como-funciona" data-testid="section-how">
          <div className="section-label">02 — como funciona?</div>
          <div className="how-heading">
            <h2>É simples assim<span>.</span></h2>
            <p>Sem complicar. Escolha um lugar, imagine algo e deixe um sinal seu.</p>
          </div>
          <div className="steps-list">
            {[
              ['01', 'Encontre um espaço', 'Navegue pela parede e escolha suas coordenadas favoritas.'],
              ['02', 'Imagine o que cabe', 'Cada pixel pode carregar uma ideia, uma marca ou uma lembrança.'],
              ['03', 'Deixe sua marca', 'Em breve, você poderá transformar seu quadrado em parte da história.'],
            ].map(([number, title, text]) => (
              <article className="step" key={number} data-testid={`step-${number}`}>
                <span className="step-number">{number}</span>
                <div className="step-icon">{number === '01' ? <Crosshair size={22} /> : number === '02' ? <Sparkles size={22} /> : <Star size={22} />}</div>
                <h3>{title}</h3>
                <p>{text}</p>
                <ArrowDownRight className="step-arrow" size={21} />
              </article>
            ))}
          </div>
        </section>

        <section className="preview-section" data-testid="section-wall-preview">
          <div className="preview-copy">
            <div className="section-label light">03 — a parede</div>
            <h2>O primeiro<br /><span>quadradinho</span><br />é seu.</h2>
            <p>Use dois dedos para passear. Clique numa área ocupada ou encontre um espaço livre. A parede inteira cabe aqui.</p>
            <Link href="/parede" className="button button-coral" data-testid="button-open-wall">Abrir parede interativa <ArrowRight size={18} /></Link>
          </div>
          <div className="preview-art">
            <div className="preview-art-label">VISÃO DE DEMONSTRAÇÃO <span>11 ÁREAS MARCADAS</span></div>
            <PixelMosaic />
            <div className="preview-legend"><span><i className="legend-free" /> espaço livre</span><span><i className="legend-used" /> demo ocupado</span></div>
          </div>
        </section>

        <DemoActivity />

        <section className="company-section" id="empresas" data-testid="section-company">
          <div className="company-stamp">PARA<br />EMPRESAS</div>
          <div className="company-copy">
            <div className="section-label">05 — um convite</div>
            <h2>SUA MARCA<br /><em>PODE ESTAR AQUI.</em></h2>
            <p>Um lugar minúsculo na parede. Uma presença enorme na memória de quem visitar.</p>
            <button className="button button-ink" onClick={() => window.alert('Em breve: o espaço para marcas será aberto.')} data-testid="button-company-interest">Quero saber quando abrir <ArrowRight size={18} /></button>
          </div>
          <div className="company-pattern" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ backgroundColor: i % 5 === 0 ? '#ffcf33' : i % 3 === 0 ? '#5ac8b0' : '#ef6b50' }} />)}</div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function DemoActivity() {
  const ranking = [
    ['01', 'Banco Amarelo', '168 × 98 px', '#ffcf33'],
    ['02', 'Clube 1999', '128 × 182 px', '#9367d8'],
    ['03', 'Rádio Livre', '214 × 88 px', '#5ac8b0'],
  ];
  return (
    <section className="activity-section" id="ranking" data-testid="section-activity">
      <div className="section-label">04 — primeiros sinais</div>
      <div className="activity-grid">
        <div className="ranking-card">
          <div className="card-topline"><span><Trophy size={16} /> ranking</span><span className="demo-chip dark-chip">somente demonstração</span></div>
          <h2>Quem chegou<br /><span>primeiro?</span></h2>
          <div className="rank-list">
            {ranking.map(([position, name, size, color]) => (
              <div className="rank-row" key={position} data-testid={`rank-row-${position}`}>
                <strong>{position}</strong><i style={{ backgroundColor: color }} /><div><b>{name}</b><small>{size}</small></div><ArrowRight size={16} />
              </div>
            ))}
          </div>
        </div>
        <div className="records-card">
          <div className="card-topline"><span><Zap size={16} /> recordes da parede</span><span>demo</span></div>
          <div className="record-big"><span>maior bloco</span><strong>214 <small>× 88</small></strong><em>Rádio Livre</em></div>
          <div className="record-divider" />
          <div className="record-small"><span>primeiro pixel marcado</span><b>coordenada 082,112</b></div>
          <div className="record-small"><span>última visita</span><b>agora mesmo <span className="live-dot" /></b></div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer" data-testid="footer-site">
      <div className="footer-brand"><span className="brand-pixel" aria-hidden="true"><i /><i /><i /><i /></span><span>UM MILHÃO<br /><b>DE PIXELS</b></span></div>
      <p>Uma parede. Um milhão de histórias.</p>
      <div className="footer-links"><a href="#como-funciona" data-testid="link-footer-how">Como funciona</a><Link href="/parede" data-testid="link-footer-wall">A parede</Link><a href="#ranking" data-testid="link-footer-ranking">Ranking</a><a href="#empresas" data-testid="link-footer-company">Empresas</a><button onClick={() => window.alert('Contato em breve.')} data-testid="button-footer-contact">Contato</button><a href="#termos" data-testid="link-footer-terms">Termos de uso</a><a href="#privacidade" data-testid="link-footer-privacy">Privacidade</a></div>
      <div className="footer-bottom"><span>© 2024 Um Milhão de Pixels Brasil <span className="footer-demo">/ projeto em demonstração</span></span><a href="https://instagram.com" target="_blank" rel="noreferrer" data-testid="link-instagram"><Instagram size={17} /> Instagram</a></div>
    </footer>
  );
}

function WallCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [selected, setSelected] = useState<PixelBlock | { x: number; y: number; width: number; height: number; free: true } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, originX: 0, originY: 0, moved: false });
  const deviceScaleRef = useRef(1);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    deviceScaleRef.current = dpr;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#24203b';
    ctx.fillRect(0, 0, rect.width, rect.height);
    const originX = rect.width / 2 - 500 * camera.scale + camera.x;
    const originY = rect.height / 2 - 500 * camera.scale + camera.y;
    const gridStep = camera.scale > 0.72 ? 10 * camera.scale : camera.scale > 0.38 ? 20 * camera.scale : 50 * camera.scale;
    ctx.strokeStyle = 'rgba(255,244,201,0.09)';
    ctx.lineWidth = 1;
    for (let x = originX % gridStep; x < rect.width; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke(); }
    for (let y = originY % gridStep; y < rect.height; y += gridStep) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,207,51,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(originX, originY, 1000 * camera.scale, 1000 * camera.scale);
    mockBlocks.forEach((block) => {
      const x = originX + block.x * camera.scale;
      const y = originY + block.y * camera.scale;
      const w = block.width * camera.scale;
      const h = block.height * camera.scale;
      ctx.fillStyle = block.color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(36,32,59,0.18)';
      ctx.fillRect(x, y, w, Math.max(3, 5 * camera.scale));
      if (camera.scale > 0.52) {
        ctx.fillStyle = '#24203b';
        ctx.font = `600 ${Math.max(10, 13 * camera.scale)}px "DM Mono", monospace`;
        ctx.fillText(block.initials, x + 8 * camera.scale, y + 20 * camera.scale);
      }
    });
    if (selected) {
      const sx = originX + selected.x * camera.scale;
      const sy = originY + selected.y * camera.scale;
      const sw = selected.width * camera.scale;
      const sh = selected.height * camera.scale;
      ctx.save();
      ctx.strokeStyle = '#fff4c9';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(sx - 3, sy - 3, sw + 6, sh + 6);
      ctx.restore();
    }
  }, [camera, selected]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  const screenToWorld = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    return {
      x: (clientX - rect.left - rect.width / 2 - camera.x) / camera.scale + 500,
      y: (clientY - rect.top - rect.height / 2 - camera.y) / camera.scale + 500,
    };
  };

  const selectAt = (clientX: number, clientY: number) => {
    const world = screenToWorld(clientX, clientY);
    const block = mockBlocks.find((item) => world.x >= item.x && world.x <= item.x + item.width && world.y >= item.y && world.y <= item.y + item.height);
    if (block) {
      setSelected(block);
      return;
    }
    if (world.x >= 0 && world.x <= 1000 && world.y >= 0 && world.y <= 1000) {
      setSelected({ x: Math.max(0, Math.floor(world.x / 10) * 10), y: Math.max(0, Math.floor(world.y / 10) * 10), width: 40, height: 40, free: true });
    } else {
      setSelected(null);
    }
  };

  const zoomAt = (nextScale: number, clientX?: number, clientY?: number) => {
    const bounded = Math.min(2.4, Math.max(0.36, nextScale));
    if (clientX === undefined || clientY === undefined) { setCamera((current) => ({ ...current, scale: bounded })); return; }
    const before = screenToWorld(clientX, clientY);
    setCamera((current) => {
      const stage = stageRef.current;
      if (!stage) return { ...current, scale: bounded };
      const rect = stage.getBoundingClientRect();
      const nextX = clientX - rect.left - rect.width / 2 - (before.x - 500) * bounded;
      const nextY = clientY - rect.top - rect.height / 2 - (before.y - 500) * bounded;
      return { x: nextX, y: nextY, scale: bounded };
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: camera.x, originY: camera.y, moved: false };
    setIsDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) dragRef.current.moved = true;
    setCamera((current) => ({ ...current, x: dragRef.current.originX + deltaX, y: dragRef.current.originY + deltaY }));
  };
  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.moved) selectAt(event.clientX, event.clientY);
    setIsDragging(false);
  };
  const resetView = () => { setCamera({ x: 0, y: 0, scale: 1 }); setSelected(null); };

  const selectionLabel = selected && 'free' in selected ? 'área livre' : selected ? 'área ocupada · demo' : 'nada selecionado';
  const coordinateText = selected ? `${String(Math.round(selected.x)).padStart(3, '0')}, ${String(Math.round(selected.y)).padStart(3, '0')}` : '—';

  return (
    <div className="wall-page">
      <Header />
      <main className="wall-main">
        <div className="wall-heading">
          <div>
            <div className="eyebrow light-eyebrow"><span className="eyebrow-dot" /> parede interativa <span className="demo-chip dark-chip">fase demo</span></div>
            <h1>A PAREDE<br /><em>ESTÁ ABERTA.</em></h1>
          </div>
          <div className="wall-intro"><p>1.000 × 1.000 coordenadas.<br />Um mapa para suas ideias.</p><span><Hand size={16} /> arraste para navegar</span></div>
        </div>
        <div className="wall-layout">
          <section className="canvas-card" data-testid="interactive-wall">
            <div className="canvas-toolbar">
              <span className="canvas-status"><i /> ao vivo <b>·</b> demonstração</span>
              <span className="canvas-coords">{selected ? `coordenada ${coordinateText}` : 'clique em qualquer ponto'}</span>
              <div className="zoom-controls">
                <button onClick={() => zoomAt(camera.scale - 0.18)} aria-label="Diminuir zoom" data-testid="button-zoom-out"><Minus size={16} /></button>
                <span>{Math.round(camera.scale * 100)}%</span>
                <button onClick={() => zoomAt(camera.scale + 0.18)} aria-label="Aumentar zoom" data-testid="button-zoom-in"><Plus size={16} /></button>
                <button onClick={resetView} aria-label="Recentrar parede" data-testid="button-reset-view"><RotateCcw size={15} /></button>
              </div>
            </div>
            <div className={`canvas-stage ${isDragging ? 'dragging' : ''}`} ref={stageRef}>
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => setIsDragging(false)}
                onWheel={(event) => { event.preventDefault(); zoomAt(camera.scale + (event.deltaY > 0 ? -0.1 : 0.1), event.clientX, event.clientY); }}
                data-testid="canvas-pixel-wall"
                aria-label="Parede interativa de um milhão de pixels"
              />
              <div className="canvas-hint"><MousePointer2 size={14} /> clique para selecionar <span>·</span> arraste para mover</div>
            </div>
            <div className="canvas-footer"><span><i className="legend-free" /> espaço livre</span><span><i className="legend-used" /> área ocupada (demo)</span><span className="canvas-foot-note">escala: 1 px = 1 unidade</span></div>
          </section>
          <SelectionPanel selected={selected} label={selectionLabel} coordinateText={coordinateText} />
        </div>
        <div className="wall-bottom-note"><Grid2X2 size={17} /> A parede usa uma área real de 1.000 × 1.000 pixels. Aqui você vê uma amostra interativa — ainda não há compra ou reserva.</div>
      </main>
    </div>
  );
}

function SelectionPanel({ selected, label, coordinateText }: { selected: WallCanvasProps['selected']; label: string; coordinateText: string }) {
  const [notice, setNotice] = useState(false);
  const isFree = !!selected && 'free' in selected;
  return (
    <aside className={`selection-panel ${selected ? 'has-selection' : ''}`} data-testid="selection-panel">
      <div className="selection-head"><span>SELEÇÃO</span>{selected && <span className="selected-mark"><Check size={13} /> selecionado</span>}</div>
      {!selected ? (
        <div className="selection-empty"><div className="empty-cross"><Crosshair size={27} /></div><h2>Escolha um ponto<br />na parede.</h2><p>Clique em uma área colorida para ver seus detalhes ou encontre um espaço livre.</p></div>
      ) : isFree ? (
        <div className="selection-content">
          <div className="selection-color free-color"><Plus size={28} /></div>
          <span className="selection-type">área livre</span>
          <h2>Este espaço<br />pode ser seu.</h2>
          <p>Coordenadas prontas para receber uma ideia. O valor de cada pixel será R$1 quando a parede abrir.</p>
          <div className="selection-detail"><span>coordenada inicial</span><b>{coordinateText}</b></div>
          <button className="selection-button" onClick={() => setNotice(true)} data-testid="button-register-interest">Quero marcar interesse <ArrowRight size={17} /></button>
          {notice && <div className="demo-notice" role="status"><Check size={15} /> Demo: o interesse foi anotado apenas nesta tela.</div>}
        </div>
      ) : (
        <div className="selection-content">
          <div className="selection-color" style={{ backgroundColor: (selected as PixelBlock).color }}><span>{(selected as PixelBlock).initials}</span></div>
          <span className="selection-type">área ocupada · demo</span>
          <h2>{(selected as PixelBlock).name}</h2>
          <p>{(selected as PixelBlock).detail}</p>
          <div className="selection-detail"><span>tamanho</span><b>{(selected as PixelBlock).width} × {(selected as PixelBlock).height} px</b></div>
          <div className="selection-detail"><span>coordenada inicial</span><b>{coordinateText}</b></div>
          <button className="selection-button ghost-button" onClick={() => setNotice(true)} data-testid="button-share-demo"><Share2 size={16} /> Compartilhar seleção</button>
          {notice && <div className="demo-notice" role="status"><Check size={15} /> Demo: link de compartilhamento copiado.</div>}
        </div>
      )}
      <div className="panel-foot"><span><span className="pulse-dot" /> dados de demonstração</span><Link href="/" data-testid="link-back-home"><ArrowLeft size={14} /> voltar ao início</Link></div>
    </aside>
  );
}

type WallCanvasProps = {
  selected: PixelBlock | { x: number; y: number; width: number; height: number; free: true } | null;
};

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/parede" component={WallCanvas} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;