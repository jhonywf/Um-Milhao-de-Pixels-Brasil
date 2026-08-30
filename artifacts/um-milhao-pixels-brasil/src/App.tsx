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
  MousePointer2,
  Plus,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { getPixelBlocks } from '@/data/pixel-block-service';
import type { PixelBlock, PixelSelection, WallSelection } from '@/data/pixel-blocks';
import { AuthProvider, useAuth } from '@/auth/auth-context';
import { AuthDialogs } from '@/auth/auth-dialogs';

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
          <span className="header-account-avatar">{profile?.avatar_emoji ?? <UserRound size={14} />}</span>
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

function WallCanvas({ blocks }: { blocks: PixelBlock[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [selected, setSelected] = useState<WallSelection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cameraRef = useRef(camera);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0, moved: false });
  const gestureRef = useRef({ multiTouch: false });
  const selectionDragRef = useRef<{ pointerId: number; anchorX: number; anchorY: number; moved: boolean } | null>(null);
  const pinchRef = useRef<{
    distance: number;
    midpoint: { x: number; y: number };
    worldAtMidpoint: { x: number; y: number };
    camera: { x: number; y: number; scale: number };
  } | null>(null);
  const deviceScaleRef = useRef(1);
  const minZoom = 0.24;
  const maxZoom = 8;
  const hasFittedInitialViewRef = useRef(false);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

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
    const wallSize = 1000 * camera.scale;
    ctx.fillStyle = '#fff4d9';
    ctx.fillRect(originX, originY, wallSize, wallSize);
    const gridStep = camera.scale >= 2.5 ? camera.scale : camera.scale > 0.72 ? 10 * camera.scale : camera.scale > 0.38 ? 20 * camera.scale : 50 * camera.scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, wallSize, wallSize);
    ctx.clip();
    ctx.strokeStyle = 'rgba(115, 112, 104, 0.28)';
    ctx.lineWidth = camera.scale >= 2.5 ? 0.75 : 1;
    for (let x = originX; x <= originX + wallSize; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, originY); ctx.lineTo(x, originY + wallSize); ctx.stroke(); }
    for (let y = originY; y <= originY + wallSize; y += gridStep) { ctx.beginPath(); ctx.moveTo(originX, y); ctx.lineTo(originX + wallSize, y); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,207,51,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(originX, originY, wallSize, wallSize);
    blocks.forEach((block) => {
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
      if ('free' in selected) {
        ctx.fillStyle = 'rgba(255, 207, 51, 0.22)';
        ctx.fillRect(sx, sy, sw, sh);
      }
      ctx.strokeStyle = '#fff4c9';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(sx - 3, sy - 3, sw + 6, sh + 6);
      ctx.restore();
    }
  }, [blocks, camera, selected]);

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
  }, [maxZoom, minZoom]);

  useLayoutEffect(() => {
    fitInitialView();
  }, [fitInitialView]);

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

  const makePixelSelection = (anchorX: number, anchorY: number, currentX = anchorX, currentY = anchorY): PixelSelection => {
    const startX = Math.min(anchorX, currentX);
    const startY = Math.min(anchorY, currentY);
    const endX = Math.max(anchorX, currentX);
    const endY = Math.max(anchorY, currentY);
    const width = endX - startX + 1;
    const height = endY - startY + 1;
    return { x: startX, y: startY, width, height, pixelCount: width * height, free: true, status: 'available' };
  };

  const overlapsOccupiedBlock = (selection: PixelSelection) => blocks.some((block) => (
    block.status !== 'available'
    && selection.x < block.x + block.width
    && selection.x + selection.width > block.x
    && selection.y < block.y + block.height
    && selection.y + selection.height > block.y
  ));

  const selectAt = (clientX: number, clientY: number) => {
    const world = screenToWorld(clientX, clientY);
    const block = blocks.find((item) => (
      item.status !== 'available'
      && world.x >= item.x
      && world.x < item.x + item.width
      && world.y >= item.y
      && world.y < item.y + item.height
    ));
    if (block) {
      setSelected(block);
      return;
    }
    if (world.x >= 0 && world.x < 1000 && world.y >= 0 && world.y < 1000) {
      setSelected(makePixelSelection(Math.floor(world.x), Math.floor(world.y)));
    } else {
      setSelected(null);
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
      if (!stage) {
        const nextCamera = { ...current, scale: bounded };
        cameraRef.current = nextCamera;
        return nextCamera;
      }
      const rect = stage.getBoundingClientRect();
      const nextX = clientX - rect.left - rect.width / 2 - (before.x - 500) * bounded;
      const nextY = clientY - rect.top - rect.height / 2 - (before.y - 500) * bounded;
      const nextCamera = { x: nextX, y: nextY, scale: bounded };
      cameraRef.current = nextCamera;
      return nextCamera;
    });
  };

  const getPinchGeometry = () => {
    const points = Array.from(pointersRef.current.values()).slice(0, 2);
    if (points.length < 2) return null;
    const [first, second] = points;
    return {
      distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
      midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
    };
  };

  const startPinch = () => {
    const geometry = getPinchGeometry();
    const stage = stageRef.current;
    if (!geometry || !stage) return;
    const currentCamera = cameraRef.current;
    const rect = stage.getBoundingClientRect();
    pinchRef.current = {
      ...geometry,
      worldAtMidpoint: {
        x: (geometry.midpoint.x - rect.left - rect.width / 2 - currentCamera.x) / currentCamera.scale + 500,
        y: (geometry.midpoint.y - rect.top - rect.height / 2 - currentCamera.y) / currentCamera.scale + 500,
      },
      camera: currentCamera,
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
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) {
      const currentCamera = cameraRef.current;
      const world = screenToWorld(event.clientX, event.clientY);
      const canExpandSelection = !!selected
        && 'free' in selected
        && world.x >= selected.x
        && world.x < selected.x + selected.width
        && world.y >= selected.y
        && world.y < selected.y + selected.height;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: currentCamera.x,
        originY: currentCamera.y,
        moved: false,
      };
      selectionDragRef.current = canExpandSelection
        ? { pointerId: event.pointerId, anchorX: selected.x, anchorY: selected.y, moved: false }
        : null;
      gestureRef.current.multiTouch = false;
    } else if (pointersRef.current.size === 2) {
      gestureRef.current.multiTouch = true;
      selectionDragRef.current = null;
      startPinch();
    }
    setIsDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2) {
      gestureRef.current.multiTouch = true;
      applyPinch();
      return;
    }
    if (dragRef.current.pointerId !== event.pointerId) return;
    if (selectionDragRef.current?.pointerId === event.pointerId) {
      const deltaX = event.clientX - dragRef.current.startX;
      const deltaY = event.clientY - dragRef.current.startY;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 4) selectionDragRef.current.moved = true;
      const world = screenToWorld(event.clientX, event.clientY);
      const currentX = Math.min(999, Math.max(0, Math.floor(world.x)));
      const currentY = Math.min(999, Math.max(0, Math.floor(world.y)));
      const nextSelection = makePixelSelection(selectionDragRef.current.anchorX, selectionDragRef.current.anchorY, currentX, currentY);
      if (!overlapsOccupiedBlock(nextSelection)) setSelected(nextSelection);
      return;
    }
    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) dragRef.current.moved = true;
    const nextCamera = { ...cameraRef.current, x: dragRef.current.originX + deltaX, y: dragRef.current.originY + deltaY };
    cameraRef.current = nextCamera;
    setCamera(nextCamera);
  };

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const wasActive = pointersRef.current.has(event.pointerId);
    if (!wasActive) return;
    const pointersBeforeRelease = pointersRef.current.size;
    const wasSelectionDrag = selectionDragRef.current?.pointerId === event.pointerId;
    const selectionWasMoved = selectionDragRef.current?.moved ?? false;
    pointersRef.current.delete(event.pointerId);
    if (pointersBeforeRelease >= 2) {
      selectionDragRef.current = null;
      if (pointersRef.current.size >= 2) {
        startPinch();
      } else if (pointersRef.current.size === 1) {
        const [remainingId, remainingPoint] = Array.from(pointersRef.current.entries())[0];
        const currentCamera = cameraRef.current;
        dragRef.current = {
          pointerId: remainingId,
          startX: remainingPoint.x,
          startY: remainingPoint.y,
          originX: currentCamera.x,
          originY: currentCamera.y,
          moved: true,
        };
        pinchRef.current = null;
      } else {
        pinchRef.current = null;
      }
    } else if (pointersRef.current.size === 0) {
      if (!gestureRef.current.multiTouch && !dragRef.current.moved && (!wasSelectionDrag || !selectionWasMoved)) {
        selectAt(event.clientX, event.clientY);
      }
      selectionDragRef.current = null;
      gestureRef.current.multiTouch = false;
    }
    if (pointersRef.current.size === 0) pinchRef.current = null;
    setIsDragging(false);
  };

  const onPointerCancel = (event: PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    selectionDragRef.current = null;
    if (pointersRef.current.size === 1) {
      const [remainingId, remainingPoint] = Array.from(pointersRef.current.entries())[0];
      const currentCamera = cameraRef.current;
      dragRef.current = {
        pointerId: remainingId,
        startX: remainingPoint.x,
        startY: remainingPoint.y,
        originX: currentCamera.x,
        originY: currentCamera.y,
        moved: true,
      };
    }
    if (pointersRef.current.size === 0) gestureRef.current.multiTouch = false;
    setIsDragging(false);
  };

  const resetView = () => {
    const nextCamera = { x: 0, y: 0, scale: 1 };
    cameraRef.current = nextCamera;
    setCamera(nextCamera);
    setSelected(null);
  };

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
                onPointerCancel={onPointerCancel}
                onWheel={(event) => { event.preventDefault(); zoomAt(camera.scale + (event.deltaY > 0 ? -0.1 : 0.1), event.clientX, event.clientY); }}
                data-testid="canvas-pixel-wall"
                aria-label="Parede interativa de um milhão de pixels"
              />
              <div className="canvas-hint"><MousePointer2 size={14} /> toque: 1 pixel <span>·</span> arraste a seleção para expandir</div>
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

function SelectionPanel({ selected, label, coordinateText }: { selected: WallSelection | null; label: string; coordinateText: string }) {
  const [notice, setNotice] = useState(false);
  const { user, profile, openAuth, openProfile } = useAuth();
  const isFree = !!selected && 'free' in selected;
  const handleInterest = () => {
    setNotice(false);
    if (!user) {
      openAuth();
      return;
    }
    if (!profile) {
      openProfile();
      return;
    }
    setNotice(true);
  };
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
          <div className="selection-detail"><span>pixels selecionados</span><b>{(selected as PixelSelection).pixelCount}</b></div>
          <div className="selection-detail"><span>tamanho</span><b>{(selected as PixelSelection).width} × {(selected as PixelSelection).height} px</b></div>
          <div className="selection-detail"><span>coordenada inicial</span><b>{coordinateText}</b></div>
          <button className="selection-button" onClick={handleInterest} data-testid="button-register-interest">Quero marcar interesse <ArrowRight size={17} /></button>
          {notice && <div className="demo-notice" role="status"><Check size={15} /> Perfil pronto. A reserva será liberada na próxima fase.</div>}
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