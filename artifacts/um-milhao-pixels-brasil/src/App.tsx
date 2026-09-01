import { type PointerEvent, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  Paintbrush,
  Eraser,
  Plus,
  Search,
  Share2,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { getPixelBlocks } from '@/data/pixel-block-service';
import type { PixelBlock } from '@/data/pixel-blocks';
import { AuthProvider, useAuth } from '@/auth/auth-context';
import { AuthDialogs } from '@/auth/auth-dialogs';
import { supabasePublicStorageUrl } from '@/auth/auth-service';

const queryClient = new QueryClient();

const previewBlocks = [
  [0, 2, 3, 2, '#ffcf33'], [4, 0, 2, 4, '#ef6b50'], [7, 1, 4, 2, '#5ac8b0'],
  [12, 0, 3, 4, '#9367d8'], [1, 6, 4, 3, '#f18b42'], [6, 5, 2, 5, '#a7d84c'],
  [9, 6, 4, 3, '#58a7e8'], [14, 7, 2, 3, '#ef5669'], [4, 12, 4, 2, '#d9b7f0'],
  [9, 12, 3, 3, '#36b86d'], [13, 13, 4, 2, '#f4a8c7'],
] as const;

function Header() {
  const [location] = useLocation();
  const isWall = location === '/parede';
  const { user, profile, openAuth, openProfile } = useAuth();
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
      {user ? (
        <button className="header-account" type="button" onClick={openProfile} data-testid="button-account">
          <span className="header-account-avatar">
            {profile?.avatar_path ? <img src={supabasePublicStorageUrl(profile.avatar_path)} alt="" /> : profile?.avatar_emoji ?? <UserRound size={14} />}
          </span>
          <span className="header-account-name">{profile?.username ? `@${profile.username}` : 'seu perfil'}</span>
        </button>
      ) : (
        <button className="header-login" type="button" onClick={openAuth} data-testid="button-login">
          entrar
        </button>
      )}
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

function WallPage() {
  return <WallCanvas blocks={getPixelBlocks()} />;
}

type SelectedPixel = { x: number; y: number; color: string };
type PixelTool = 'select' | 'erase' | 'pan';

const PIXEL_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#facc15', '#a3e635', '#22c55e', '#15803d',
  '#14b8a6', '#06b6d4', '#38bdf8', '#3b82f6', '#1d4ed8', '#9333ea', '#db2777',
  '#7c5c4f', '#ffffff', '#8b8b8b', '#3f3f46', '#111111',
];

function WallCanvas({ blocks }: { blocks: PixelBlock[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [tool, setTool] = useState<PixelTool>('select');
  const [selectedPixels, setSelectedPixels] = useState<Map<string, SelectedPixel>>(() => new Map());
  const [selectedBlock, setSelectedBlock] = useState<PixelBlock | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [activeColor, setActiveColor] = useState('#ef4444');
  const cameraRef = useRef(camera);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0, moved: false });
  const paintRef = useRef<{ pointerId: number; lastX: number; lastY: number; action: 'add' | 'erase' | 'recolor' } | null>(null);
  const firstTapRef = useRef<{ at: number; x: number; y: number; clientX: number; clientY: number } | null>(null);
  const [recolorMode, setRecolorMode] = useState(false);
  const gestureRef = useRef({ multiTouch: false });
  const pinchRef = useRef<{
    distance: number;
    midpoint: { x: number; y: number };
    worldAtMidpoint: { x: number; y: number };
    camera: { x: number; y: number; scale: number };
  } | null>(null);
  const minZoom = 0.24;
  const maxZoom = 30;
  const hasFittedInitialViewRef = useRef(false);

  useEffect(() => { cameraRef.current = camera; }, [camera]);

  const selectedList = Array.from(selectedPixels.values());
  const selectedCount = selectedPixels.size;
  const firstSelected = selectedList[0] ?? null;
  const coordinateText = firstSelected ? `${String(firstSelected.x).padStart(3, '0')}, ${String(firstSelected.y).padStart(3, '0')}` : selectedBlock ? `${String(selectedBlock.x).padStart(3, '0')}, ${String(selectedBlock.y).padStart(3, '0')}` : '—';

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    const wallSize = 1000 * camera.scale;
    ctx.fillStyle = '#fbfbfa';
    ctx.fillRect(originX, originY, wallSize, wallSize);
    const logicalGridStep = camera.scale >= 4 ? 1 : camera.scale >= 1.5 ? 5 : camera.scale >= 0.55 ? 10 : camera.scale >= 0.3 ? 40 : 50;
    const gridStep = logicalGridStep * camera.scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, wallSize, wallSize);
    ctx.clip();
    ctx.strokeStyle = 'rgba(148, 155, 166, 0.34)';
    ctx.lineWidth = camera.scale >= 4 ? 0.8 : 1;
    for (let x = originX; x <= originX + wallSize; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, originY); ctx.lineTo(x, originY + wallSize); ctx.stroke(); }
    for (let y = originY; y <= originY + wallSize; y += gridStep) { ctx.beginPath(); ctx.moveTo(originX, y); ctx.lineTo(originX + wallSize, y); ctx.stroke(); }
    const majorStep = Math.max(100 * camera.scale, gridStep * 5);
    ctx.strokeStyle = 'rgba(115, 123, 136, 0.48)';
    ctx.lineWidth = 1;
    for (let x = originX; x <= originX + wallSize; x += majorStep) { ctx.beginPath(); ctx.moveTo(x, originY); ctx.lineTo(x, originY + wallSize); ctx.stroke(); }
    for (let y = originY; y <= originY + wallSize; y += majorStep) { ctx.beginPath(); ctx.moveTo(originX, y); ctx.lineTo(originX + wallSize, y); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(148, 155, 166, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(originX, originY, wallSize, wallSize);

    blocks.forEach((block) => {
      if (block.status === 'available') return;
      const x = originX + block.x * camera.scale;
      const y = originY + block.y * camera.scale;
      const w = block.width * camera.scale;
      const h = block.height * camera.scale;
      ctx.fillStyle = block.color;
      ctx.fillRect(x, y, w, h);
      if (camera.scale > 0.52) {
        ctx.fillStyle = '#24203b';
        ctx.font = `600 ${Math.max(10, 13 * camera.scale)}px "DM Mono", monospace`;
        ctx.fillText(block.initials, x + 8 * camera.scale, y + 20 * camera.scale);
      }
    });

    selectedPixels.forEach((pixel) => {
      const x = originX + pixel.x * camera.scale;
      const y = originY + pixel.y * camera.scale;
      const size = Math.max(1, camera.scale);
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, size, size);
      if (camera.scale >= 4) {
        ctx.strokeStyle = '#1687ff';
        ctx.lineWidth = Math.max(1.5, camera.scale * 0.13);
        ctx.strokeRect(x + 0.6, y + 0.6, Math.max(1, size - 1.2), Math.max(1, size - 1.2));
      }
    });

    if (selectedBlock) {
      const x = originX + selectedBlock.x * camera.scale;
      const y = originY + selectedBlock.y * camera.scale;
      ctx.save();
      ctx.strokeStyle = '#fff4c9';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(x - 3, y - 3, selectedBlock.width * camera.scale + 6, selectedBlock.height * camera.scale + 6);
      ctx.restore();
    }
  }, [blocks, camera, selectedBlock, selectedPixels]);

  const fitInitialView = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || hasFittedInitialViewRef.current) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const fittedScale = Math.min(maxZoom, Math.max(minZoom, Math.min(rect.width, rect.height) / 1000 * 0.92));
    const nextCamera = { x: 0, y: 0, scale: fittedScale };
    hasFittedInitialViewRef.current = true;
    cameraRef.current = nextCamera;
    setCamera(nextCamera);
  }, []);

  useLayoutEffect(() => { fitInitialView(); }, [fitInitialView]);
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
    const current = cameraRef.current;
    return {
      x: (clientX - rect.left - rect.width / 2 - current.x) / current.scale + 500,
      y: (clientY - rect.top - rect.height / 2 - current.y) / current.scale + 500,
    };
  };

  const occupiedAt = (x: number, y: number) => blocks.find((block) => (
    block.status !== 'available' && x >= block.x && x < block.x + block.width && y >= block.y && y < block.y + block.height
  ));

  const updatePixel = (x: number, y: number, action: 'add' | 'erase' | 'recolor') => {
    if (x < 0 || y < 0 || x >= 1000 || y >= 1000) return;
    if (occupiedAt(x + 0.5, y + 0.5)) return;
    const key = `${x}:${y}`;
    setSelectedBlock(null);
    setSelectedPixels((current) => {
      const next = new Map(current);
      if (action === 'erase') next.delete(key);
      else if (action === 'recolor') {
        const pixel = next.get(key);
        if (pixel) next.set(key, { ...pixel, color: activeColor });
      } else if (!next.has(key)) next.set(key, { x, y, color: activeColor });
      return next;
    });
  };

  const paintLine = (fromX: number, fromY: number, toX: number, toY: number, action: 'add' | 'erase' | 'recolor') => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let i = 0; i <= steps; i += 1) {
      updatePixel(Math.round(fromX + dx * i / steps), Math.round(fromY + dy * i / steps), action);
    }
  };

  const zoomAt = (nextScale: number, clientX?: number, clientY?: number) => {
    const bounded = Math.min(maxZoom, Math.max(minZoom, nextScale));
    if (clientX === undefined || clientY === undefined) {
      const nextCamera = { ...cameraRef.current, scale: bounded };
      cameraRef.current = nextCamera;
      setCamera(nextCamera);
      return;
    }
    const before = screenToWorld(clientX, clientY);
    setCamera((current) => {
      const stage = stageRef.current;
      if (!stage) return { ...current, scale: bounded };
      const rect = stage.getBoundingClientRect();
      const nextCamera = {
        x: clientX - rect.left - rect.width / 2 - (before.x - 500) * bounded,
        y: clientY - rect.top - rect.height / 2 - (before.y - 500) * bounded,
        scale: bounded,
      };
      cameraRef.current = nextCamera;
      return nextCamera;
    });
  };

  const getPinchGeometry = () => {
    const points = Array.from(pointersRef.current.values()).slice(0, 2);
    if (points.length < 2) return null;
    const [first, second] = points;
    return { distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)), midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 } };
  };

  const startPinch = () => {
    const geometry = getPinchGeometry();
    const stage = stageRef.current;
    if (!geometry || !stage) return;
    const current = cameraRef.current;
    const rect = stage.getBoundingClientRect();
    pinchRef.current = {
      ...geometry,
      worldAtMidpoint: {
        x: (geometry.midpoint.x - rect.left - rect.width / 2 - current.x) / current.scale + 500,
        y: (geometry.midpoint.y - rect.top - rect.height / 2 - current.y) / current.scale + 500,
      },
      camera: current,
    };
  };

  const applyPinch = () => {
    const pinch = pinchRef.current;
    const geometry = getPinchGeometry();
    const stage = stageRef.current;
    if (!pinch || !geometry || !stage) return;
    const rect = stage.getBoundingClientRect();
    const nextScale = Math.min(maxZoom, Math.max(minZoom, pinch.camera.scale * geometry.distance / pinch.distance));
    const nextCamera = {
      x: geometry.midpoint.x - rect.left - rect.width / 2 - (pinch.worldAtMidpoint.x - 500) * nextScale,
      y: geometry.midpoint.y - rect.top - rect.height / 2 - (pinch.worldAtMidpoint.y - 500) * nextScale,
      scale: nextScale,
    };
    cameraRef.current = nextCamera;
    setCamera(nextCamera);
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2) {
      gestureRef.current.multiTouch = true;
      paintRef.current = null;
      firstTapRef.current = null;
      startPinch();
      return;
    }
    const current = cameraRef.current;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: current.x, originY: current.y, moved: false };
    const world = screenToWorld(event.clientX, event.clientY);
    const x = Math.floor(world.x);
    const y = Math.floor(world.y);
    if (tool === 'pan') return;
    const occupied = occupiedAt(world.x, world.y);
    if (occupied) {
      setSelectedBlock(occupied);
      return;
    }
    if (world.x < 0 || world.x >= 1000 || world.y < 0 || world.y >= 1000) return;

    const action: 'add' | 'erase' | 'recolor' = recolorMode ? 'recolor' : tool === 'erase' ? 'erase' : 'add';
    const needsFirstDoubleTap = event.pointerType === 'touch' && action === 'add' && selectedPixels.size === 0;

    if (needsFirstDoubleTap) {
      const now = performance.now();
      const previous = firstTapRef.current;
      const isSecondTap = !!previous && now - previous.at <= 420 && Math.hypot(event.clientX - previous.clientX, event.clientY - previous.clientY) <= 34;
      if (!isSecondTap) {
        firstTapRef.current = { at: now, x, y, clientX: event.clientX, clientY: event.clientY };
        return;
      }
      firstTapRef.current = null;
      updatePixel(x, y, 'add');
      paintRef.current = { pointerId: event.pointerId, lastX: x, lastY: y, action: 'add' };
      return;
    }

    updatePixel(x, y, action);
    paintRef.current = { pointerId: event.pointerId, lastX: x, lastY: y, action };
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2) {
      setIsDragging(true);
      applyPinch();
      return;
    }
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 3) dragRef.current.moved = true;

    if (tool === 'pan') {
      const nextCamera = { ...cameraRef.current, x: dragRef.current.originX + dx, y: dragRef.current.originY + dy };
      cameraRef.current = nextCamera;
      setCamera(nextCamera);
      setIsDragging(true);
      return;
    }
    const paint = paintRef.current;
    if (!paint || paint.pointerId !== event.pointerId) return;
    const world = screenToWorld(event.clientX, event.clientY);
    const x = Math.floor(world.x);
    const y = Math.floor(world.y);
    if (x === paint.lastX && y === paint.lastY) return;
    paintLine(paint.lastX, paint.lastY, x, y, paint.action);
    paintRef.current = { ...paint, lastX: x, lastY: y };
    setIsDragging(true);
  };

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size >= 2) startPinch();
    else pinchRef.current = null;
    if (paintRef.current?.pointerId === event.pointerId) paintRef.current = null;
    if (pointersRef.current.size === 0) gestureRef.current.multiTouch = false;
    setIsDragging(false);
  };

  const onPointerCancel = (event: PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    paintRef.current = null;
    pinchRef.current = null;
    if (pointersRef.current.size === 0) gestureRef.current.multiTouch = false;
    setIsDragging(false);
  };

  const clearSelection = () => {
    setSelectedPixels(new Map());
    setSelectedBlock(null);
    setCustomizeOpen(false);
    setRecolorMode(false);
  };

  const fillAll = (color: string) => {
    setActiveColor(color);
    setSelectedPixels((current) => {
      const next = new Map<string, SelectedPixel>();
      current.forEach((pixel, key) => next.set(key, { ...pixel, color }));
      return next;
    });
  };


  return (
    <div className="wall-page">
      <Header />
      <main className="wall-main">
        <div className="wall-heading wall-heading-clean">
          <h1>A PAREDE <em>ESTÁ ABERTA.</em></h1>
        </div>
        <div className="wall-layout">
          <section className="canvas-card pixel-editor-card" data-testid="interactive-wall">
            <div className={`canvas-stage ${isDragging ? 'dragging' : ''}`} ref={stageRef}>
              <div className="floating-zoom" aria-label="Controles de zoom">
                <Search size={16} aria-hidden="true" />
                <button onClick={() => zoomAt(cameraRef.current.scale * 1.25)} aria-label="Aumentar zoom"><Plus size={20} /></button>
                <span className="floating-zoom-divider" />
                <button onClick={() => zoomAt(cameraRef.current.scale / 1.25)} aria-label="Diminuir zoom"><Minus size={20} /></button>
              </div>
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onWheel={(event) => { event.preventDefault(); zoomAt(cameraRef.current.scale + (event.deltaY > 0 ? -0.1 : 0.1), event.clientX, event.clientY); }}
                data-testid="canvas-pixel-wall"
                aria-label="Parede interativa de um milhão de pixels"
              />
            </div>

            <div className="pixel-editor-bar" data-testid="pixel-editor-bar">
              <div className="pixel-editor-tools">
                <button className={tool === 'select' && !recolorMode ? 'active' : ''} onClick={() => { setTool('select'); setRecolorMode(false); }}><Paintbrush size={17} /> Selecionar</button>
                <button className={tool === 'erase' ? 'active' : ''} onClick={() => { setTool('erase'); setRecolorMode(false); }}><Eraser size={17} /> Apagar</button>
                <button className={tool === 'pan' ? 'active' : ''} onClick={() => { setTool('pan'); setRecolorMode(false); }}><Hand size={17} /> Mover</button>
              </div>
              <div className="pixel-editor-total"><strong>{selectedCount}</strong><span>pixels</span><strong>R${selectedCount.toFixed(2).replace('.', ',')}</strong></div>
              <div className="pixel-editor-actions">
                <button className="editor-clear" onClick={clearSelection} disabled={!selectedCount}>Limpar</button>
                <button className="editor-customize" onClick={() => setCustomizeOpen(true)} disabled={!selectedCount}><Paintbrush size={16} /> Personalizar</button>
              </div>
            </div>

            {customizeOpen && (
              <div className="pixel-customizer" role="dialog" aria-label="Personalizar pixels">
                <div className="pixel-customizer-head"><strong>Personalizar {selectedCount} pixels</strong><button onClick={() => setCustomizeOpen(false)} aria-label="Fechar"><X size={20} /></button></div>
                <div className="pixel-customizer-body">
                  <p>Escolha uma cor. Você pode aplicar em todos ou pintar somente os pixels que quiser.</p>
                  <div className="pixel-palette">
                    {PIXEL_PALETTE.map((color) => <button key={color} className={activeColor === color ? 'active' : ''} style={{ backgroundColor: color }} onClick={() => setActiveColor(color)} aria-label={`Cor ${color}`} />)}
                  </div>
                  <div className="customizer-actions">
                    <button className="customizer-primary" onClick={() => fillAll(activeColor)}>Aplicar aos {selectedCount} pixels</button>
                    <button className="customizer-secondary" onClick={() => { setRecolorMode(true); setTool('select'); setCustomizeOpen(false); }}>Pintar pixel por pixel</button>
                  </div>
                </div>
              </div>
            )}
            {recolorMode && (
              <div className="recolor-banner"><span><Paintbrush size={14} /> Pintando pixels individualmente</span><button onClick={() => setRecolorMode(false)}>Concluir</button></div>
            )}
          </section>
          <SelectionPanel selectedCount={selectedCount} selectedBlock={selectedBlock} coordinateText={coordinateText} />
        </div>
        <div className="wall-bottom-note"><Grid2X2 size={17} /> Selecione pixels independentes para criar letras, símbolos e desenhos. A compra e a reserva entram na próxima etapa.</div>
      </main>
    </div>
  );
}

function SelectionPanel({ selectedCount, selectedBlock, coordinateText }: { selectedCount: number; selectedBlock: PixelBlock | null; coordinateText: string }) {
  const [notice, setNotice] = useState(false);
  const { user, profile, openAuth, openProfile } = useAuth();
  const handleInterest = () => {
    setNotice(false);
    if (!user) { openAuth(); return; }
    if (!profile) { openProfile(); return; }
    setNotice(true);
  };
  return (
    <aside className={`selection-panel ${(selectedCount || selectedBlock) ? 'has-selection' : ''}`}>
      {selectedBlock ? (
        <div className="selection-content compact-selection">
          <span className="selection-type">área ocupada</span><h2>{selectedBlock.name}</h2><p>{selectedBlock.detail}</p>
          <div className="selection-detail"><span>coordenada</span><b>{coordinateText}</b></div>
        </div>
      ) : selectedCount > 0 ? (
        <div className="selection-content selection-summary">
          <div className="selection-summary-title"><span>Resumo da seleção</span><strong>{selectedCount} pixels</strong></div>
          <div className="selection-summary-grid">
            <div><span>valor atual</span><b>R$ {selectedCount.toFixed(2).replace('.', ',')}</b></div>
            <div><span>primeiro pixel</span><b>{coordinateText}</b></div>
          </div>
          <button className="selection-button" onClick={handleInterest}>Continuar com esta seleção <ArrowRight size={17} /></button>
          {notice && <div className="demo-notice" role="status"><Check size={15} /> Seleção pronta. Reserva e pagamento entram na próxima fase.</div>}
        </div>
      ) : (
        <div className="selection-empty compact-empty"><div className="empty-cross"><Crosshair size={24} /></div><div><h2>Monte seu desenho.</h2><p>No celular, toque duas vezes no primeiro pixel. Depois toque onde quiser ou arraste para desenhar.</p></div></div>
      )}
      <div className="panel-foot"><span><span className="pulse-dot" /> seleção livre</span><Link href="/"><ArrowLeft size={14} /> voltar ao início</Link></div>
    </aside>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/parede" component={WallPage} />
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
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
          <AuthDialogs />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;