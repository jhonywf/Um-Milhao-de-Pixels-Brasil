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
import { loadPublicWallPixels, reserveWallPixels, type PublicWallPixel, type WallReservationSuccess } from '@/data/wall-reservation-service';
import { createMercadoPagoCheckout, getMercadoPagoPaymentStatus } from '@/data/payment-service';
import { getMyPurchases, type MyPurchasesResponse } from '@/data/my-purchases-service';

const queryClient = new QueryClient();

const previewBlocks = [
  [0, 2, 3, 2, '#ffcf33'], [4, 0, 2, 4, '#ef6b50'], [7, 1, 4, 2, '#5ac8b0'],
  [12, 0, 3, 4, '#9367d8'], [1, 6, 4, 3, '#f18b42'], [6, 5, 2, 5, '#a7d84c'],
  [9, 6, 4, 3, '#58a7e8'], [14, 7, 2, 3, '#ef5669'], [4, 12, 4, 2, '#d9b7f0'],
  [9, 12, 3, 3, '#36b86d'], [13, 13, 4, 2, '#f4a8c7'],
] as const;

function Header() {
  const [location, setLocation] = useLocation();
  const isWall = location === '/parede';
  const { user, profile, openAuth, openProfile, logout } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        accountMenuRef.current &&
        !accountMenuRef.current.contains(target)
      ) {
        setAccountMenuOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountMenuOpen]);

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    await logout();
    setLocation('/');
  };

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
        <div
          ref={accountMenuRef}
          style={{ position: 'relative' }}
        >
          <button
            className="header-account"
            type="button"
            onClick={() => setAccountMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            data-testid="button-account"
          >
            <span className="header-account-avatar">
              {profile?.avatar_path ? <img src={supabasePublicStorageUrl(profile.avatar_path)} alt="" /> : profile?.avatar_emoji ?? <UserRound size={14} />}
            </span>
            <span className="header-account-name">
              {profile?.username ? `@${profile.username}` : 'minha conta'}
            </span>
            <ChevronDown size={14} />
          </button>

          {accountMenuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 10px)',
                width: 210,
                background: '#fffaf0',
                border: '2px solid #211d42',
                boxShadow: '6px 6px 0 #211d42',
                zIndex: 1000,
                padding: 8,
              }}
            >
              <Link
                href="/meus-pixels"
                role="menuitem"
                onClick={() => setAccountMenuOpen(false)}
                style={{
                  display: 'block',
                  padding: '12px 14px',
                  textDecoration: 'none',
                  color: '#211d42',
                  fontWeight: 700,
                }}
              >
                Meus pixels
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAccountMenuOpen(false);
                  openProfile();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 14px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 0,
                  color: '#211d42',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Editar perfil
              </button>

              <div
                style={{
                  height: 1,
                  background: '#211d42',
                  opacity: 0.2,
                  margin: '4px 0',
                }}
              />

              <button
                type="button"
                role="menuitem"
                onClick={() => void handleLogout()}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 14px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 0,
                  color: '#ef6b50',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Sair
              </button>
            </div>
          )}
        </div>
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

function PaymentReturnExperience() {
  const { session, openAuth } = useAuth();
  const [mode, setMode] = useState<'hidden' | 'checking' | 'paid' | 'pending' | 'failure' | 'error'>('hidden');
  const [pixelCount, setPixelCount] = useState(0);
  const [message, setMessage] = useState('');

  const cleanReturnUrl = () => {
    window.history.replaceState({}, '', '/parede');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentReturn = params.get('payment');
    if (!paymentReturn) return;

    if (paymentReturn === 'failure') {
      setMode('failure');
      return;
    }

    const reservationId =
      window.localStorage.getItem('pixel-wall-checkout-reservation') ||
      params.get('external_reference') ||
      '';

    if (!reservationId) {
      setMode('error');
      setMessage('Não encontramos a reserva desta compra. Entre na sua conta e atualize a parede.');
      return;
    }

    if (!session) {
      setMode('pending');
      setMessage('Entre na mesma conta usada na compra para confirmar seus pixels.');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    setMode('checking');

    const check = async () => {
      try {
        const status = await getMercadoPagoPaymentStatus(reservationId, session.access_token);
        if (cancelled) return;

        setPixelCount(status.pixel_count);

        if (status.paid) {
          window.localStorage.removeItem('pixel-wall-checkout-reservation');
          setMode('paid');
          return;
        }

        attempts += 1;
        if (attempts >= 24) {
          setMode('pending');
          setMessage('O pagamento ainda está sendo confirmado. Seus pixels serão atualizados automaticamente após a confirmação segura.');
          return;
        }

        window.setTimeout(check, 1500);
      } catch (caught) {
        if (cancelled) return;

        attempts += 1;
        if (attempts >= 6) {
          setMode('error');
          setMessage(caught instanceof Error ? caught.message : 'Não foi possível confirmar o pagamento agora.');
          return;
        }

        window.setTimeout(check, 1500);
      }
    };

    void check();
    return () => { cancelled = true; };
  }, [session]);

  if (mode === 'hidden') return null;

  const close = () => {
    cleanReturnUrl();
    setMode('hidden');
  };

  const share = async () => {
    const text = `Agora eu possuo ${pixelCount} pixels no Um Milhão de Pixels Brasil!`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Um Milhão de Pixels Brasil',
          text,
          url: window.location.origin,
        });
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
        setMessage('Link copiado para compartilhar!');
      }
    } catch {
      // O usuário pode cancelar o compartilhamento sem alterar a compra.
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Status do pagamento"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(20,18,14,.62)',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
      }}
    >
      <div style={{
        width: 'min(520px, 100%)',
        background: '#fffdf7',
        border: '2px solid #111',
        boxShadow: '8px 8px 0 #111',
        padding: 24,
      }}>
        {mode === 'checking' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>Mercado Pago</div>
            <h2 style={{ fontSize: 32, lineHeight: 1, margin: '12px 0' }}>Confirmando seu pagamento...</h2>
            <p style={{ margin: 0, lineHeight: 1.55 }}>Estamos esperando a confirmação segura do servidor. Não feche esta página.</p>
            <div style={{ height: 8, background: '#e8e2d4', marginTop: 22, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '58%', background: '#215DB0' }} />
            </div>
          </>
        )}

        {mode === 'paid' && (
          <>
            <div style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', background: '#facc15', border: '2px solid #111' }}>
              <Check size={30} />
            </div>
            <h2 style={{ fontSize: 34, lineHeight: 1, margin: '16px 0 10px' }}>VOCÊ AGORA POSSUI UM PEDAÇO DA INTERNET!</h2>
            <p style={{ lineHeight: 1.55, margin: 0 }}>Pagamento confirmado. <b>{pixelCount} pixels</b> agora fazem parte permanentemente da parede.</p>
            {message && <p style={{ marginTop: 12, fontWeight: 700 }}>{message}</p>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
              <button className="selection-button" type="button" onClick={close}>Ver meus pixels <ArrowRight size={17} /></button>
              <button className="editor-customize" type="button" onClick={share}><Share2 size={16} /> Compartilhar</button>
            </div>
          </>
        )}

        {mode === 'pending' && (
          <>
            <h2 style={{ fontSize: 30, lineHeight: 1, margin: '0 0 12px' }}>Pagamento em confirmação</h2>
            <p style={{ lineHeight: 1.55 }}>{message || 'Estamos aguardando a confirmação do Mercado Pago.'}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              {!session && <button className="selection-button" type="button" onClick={openAuth}>Entrar na minha conta</button>}
              <button className="editor-customize" type="button" onClick={close}>Voltar para a parede</button>
            </div>
          </>
        )}

        {mode === 'failure' && (
          <>
            <div style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', background: '#ef4444', border: '2px solid #111', color: '#fff' }}>
              <X size={28} />
            </div>
            <h2 style={{ fontSize: 30, lineHeight: 1, margin: '16px 0 10px' }}>Pagamento não concluído</h2>
            <p style={{ lineHeight: 1.55 }}>Nenhum pixel foi marcado como comprado. Você pode voltar à parede e tentar novamente enquanto sua reserva estiver disponível.</p>
            <button className="selection-button" type="button" onClick={close} style={{ marginTop: 18 }}>Voltar para a parede</button>
          </>
        )}

        {mode === 'error' && (
          <>
            <h2 style={{ fontSize: 30, lineHeight: 1, margin: '0 0 12px' }}>Não conseguimos confirmar agora</h2>
            <p style={{ lineHeight: 1.55 }}>{message}</p>
            <button className="selection-button" type="button" onClick={close} style={{ marginTop: 18 }}>Voltar para a parede</button>
          </>
        )}
      </div>
    </div>
  );
}

function WallPage() {
  return (
    <>
      <PaymentReturnExperience />
      <WallCanvas blocks={getPixelBlocks()} />
    </>
  );
}

type SelectedPixel = { x: number; y: number; color: string };

const pendingPixelSelectionKey = 'um-milhao-pixels.pending-selection';
const pendingPixelSelectionMaxAgeMs = 30 * 60 * 1000;

function savePendingPixelSelection(pixels: SelectedPixel[]) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    pendingPixelSelectionKey,
    JSON.stringify({
      savedAt: Date.now(),
      pixels,
    }),
  );
}

function loadPendingPixelSelection(): Map<string, SelectedPixel> {
  const result = new Map<string, SelectedPixel>();
  if (typeof window === 'undefined') return result;

  try {
    const raw = window.localStorage.getItem(pendingPixelSelectionKey);
    if (!raw) return result;

    const parsed = JSON.parse(raw) as {
      savedAt?: unknown;
      pixels?: unknown;
    };

    if (
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > pendingPixelSelectionMaxAgeMs ||
      !Array.isArray(parsed.pixels)
    ) {
      window.localStorage.removeItem(pendingPixelSelectionKey);
      return result;
    }

    for (const value of parsed.pixels.slice(0, 100000)) {
      if (
        !value ||
        typeof value !== 'object' ||
        !Number.isInteger(value.x) ||
        !Number.isInteger(value.y) ||
        value.x < 0 ||
        value.x >= 1000 ||
        value.y < 0 ||
        value.y >= 1000 ||
        typeof value.color !== 'string' ||
        !/^#[0-9a-f]{6}$/i.test(value.color)
      ) {
        continue;
      }

      const pixel = value as SelectedPixel;
      result.set(`${pixel.x}:${pixel.y}`, pixel);
    }

    return result;
  } catch {
    window.localStorage.removeItem(pendingPixelSelectionKey);
    return result;
  }
}

function clearPendingPixelSelection() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(pendingPixelSelectionKey);
}

const pendingCheckoutIntentKey = 'um-milhao-pixels.pending-checkout';

function markPendingCheckoutIntent() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(pendingCheckoutIntentKey, '1');
}

function hasPendingCheckoutIntent() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(pendingCheckoutIntentKey) === '1';
}

function clearPendingCheckoutIntent() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(pendingCheckoutIntentKey);
}

type WallFocusBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function readWallFocusBounds(): WallFocusBounds | null {
  if (typeof window === 'undefined') return null;

  const raw = new URLSearchParams(window.location.search).get('focus');
  if (!raw) return null;

  const values = raw.split(',').map((value) => Number(value));

  if (
    values.length !== 4 ||
    values.some((value) => !Number.isInteger(value))
  ) {
    return null;
  }

  const [minX, minY, maxX, maxY] = values;

  if (
    minX < 0 ||
    minY < 0 ||
    maxX >= 1000 ||
    maxY >= 1000 ||
    minX > maxX ||
    minY > maxY
  ) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

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
  const [selectedPixels, setSelectedPixels] = useState<Map<string, SelectedPixel>>(() => loadPendingPixelSelection());
  const [selectedBlock, setSelectedBlock] = useState<PixelBlock | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [activeColor, setActiveColor] = useState('#ef4444');
  const [lastReservation, setLastReservation] = useState<WallReservationSuccess | null>(null);
  const [publicPixels, setPublicPixels] = useState<Map<string, PublicWallPixel>>(() => new Map());
  const [wallSyncError, setWallSyncError] = useState<string | null>(null);
  const cameraRef = useRef(camera);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0, moved: false });
  const paintRef = useRef<{ pointerId: number; lastX: number; lastY: number; action: 'add' | 'erase' | 'recolor' } | null>(null);
  const pendingTouchRef = useRef<{
    pointerId: number;
    startedAt: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    action: 'add' | 'erase' | 'recolor';
    occupied: PixelBlock | null;
    moved: boolean;
  } | null>(null);
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

  const refreshPublicPixels = useCallback(async () => {
    try {
      const pixels = await loadPublicWallPixels();
      const next = new Map<string, PublicWallPixel>();
      pixels.forEach((pixel) => next.set(`${pixel.x}:${pixel.y}`, pixel));
      setPublicPixels(next);
      setWallSyncError(null);

      if (!lastReservation) {
        setSelectedPixels((current) => {
          let changed = false;
          const filtered = new Map(current);
          current.forEach((_pixel, key) => {
            if (next.has(key)) {
              filtered.delete(key);
              changed = true;
            }
          });
          return changed ? filtered : current;
        });
      }
    } catch (caught) {
      setWallSyncError(caught instanceof Error ? caught.message : 'Não foi possível atualizar a parede.');
    }
  }, [lastReservation]);

  useEffect(() => {
    void refreshPublicPixels();
    const interval = window.setInterval(() => { void refreshPublicPixels(); }, 10000);
    return () => window.clearInterval(interval);
  }, [refreshPublicPixels]);

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
    ctx.fillStyle = '#fff4c9';
    ctx.fillRect(0, 0, rect.width, rect.height);
    const originX = rect.width / 2 - 500 * camera.scale + camera.x;
    const originY = rect.height / 2 - 500 * camera.scale + camera.y;
    const wallSize = 1000 * camera.scale;
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(originX, originY, wallSize, wallSize);
    const logicalGridStep = camera.scale >= 4 ? 1 : camera.scale >= 1.5 ? 5 : camera.scale >= 0.55 ? 10 : camera.scale >= 0.3 ? 40 : 50;
    const gridStep = logicalGridStep * camera.scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, wallSize, wallSize);
    ctx.clip();
    ctx.strokeStyle = 'rgba(132, 126, 112, 0.28)';
    ctx.lineWidth = camera.scale >= 4 ? 0.8 : 1;
    for (let x = originX; x <= originX + wallSize; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, originY); ctx.lineTo(x, originY + wallSize); ctx.stroke(); }
    for (let y = originY; y <= originY + wallSize; y += gridStep) { ctx.beginPath(); ctx.moveTo(originX, y); ctx.lineTo(originX + wallSize, y); ctx.stroke(); }
    const majorStep = Math.max(100 * camera.scale, gridStep * 5);
    ctx.strokeStyle = 'rgba(110, 103, 88, 0.40)';
    ctx.lineWidth = 1;
    for (let x = originX; x <= originX + wallSize; x += majorStep) { ctx.beginPath(); ctx.moveTo(x, originY); ctx.lineTo(x, originY + wallSize); ctx.stroke(); }
    for (let y = originY; y <= originY + wallSize; y += majorStep) { ctx.beginPath(); ctx.moveTo(originX, y); ctx.lineTo(originX + wallSize, y); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(120, 113, 98, 0.55)';
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

    publicPixels.forEach((pixel) => {
      const x = originX + pixel.x * camera.scale;
      const y = originY + pixel.y * camera.scale;
      const size = Math.max(1, camera.scale);
      ctx.fillStyle = pixel.status === 'purchased' ? (pixel.color ?? '#111111') : '#b9b4aa';
      ctx.fillRect(x, y, size, size);

      if (pixel.status === 'reserved' && camera.scale >= 6) {
        ctx.strokeStyle = 'rgba(70, 66, 58, 0.72)';
        ctx.lineWidth = Math.max(1, camera.scale * 0.10);
        ctx.beginPath();
        ctx.moveTo(x + size * 0.18, y + size * 0.18);
        ctx.lineTo(x + size * 0.82, y + size * 0.82);
        ctx.moveTo(x + size * 0.82, y + size * 0.18);
        ctx.lineTo(x + size * 0.18, y + size * 0.82);
        ctx.stroke();
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
  }, [blocks, camera, publicPixels, selectedBlock, selectedPixels]);

  const fitInitialView = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || hasFittedInitialViewRef.current) return;

    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const focus = readWallFocusBounds();

    if (focus) {
      const width = focus.maxX - focus.minX + 1;
      const height = focus.maxY - focus.minY + 1;

      const paddingPixels = Math.max(
        6,
        Math.min(40, Math.max(width, height) * 0.35),
      );

      const visibleWidth = width + paddingPixels * 2;
      const visibleHeight = height + paddingPixels * 2;

      const fittedScale = Math.min(
        maxZoom,
        Math.max(
          minZoom,
          Math.min(
            rect.width / visibleWidth,
            rect.height / visibleHeight,
          ) * 0.82,
        ),
      );

      const centerX = (focus.minX + focus.maxX + 1) / 2;
      const centerY = (focus.minY + focus.maxY + 1) / 2;

      const nextCamera = {
        x: -(centerX - 500) * fittedScale,
        y: -(centerY - 500) * fittedScale,
        scale: fittedScale,
      };

      hasFittedInitialViewRef.current = true;
      cameraRef.current = nextCamera;
      setCamera(nextCamera);
      return;
    }

    const fittedScale = Math.min(
      maxZoom,
      Math.max(
        minZoom,
        Math.min(rect.width, rect.height) / 1000 * 0.92,
      ),
    );

    const nextCamera = {
      x: 0,
      y: 0,
      scale: fittedScale,
    };

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

  const claimedAt = (x: number, y: number) => publicPixels.get(`${Math.floor(x)}:${Math.floor(y)}`) ?? null;

  const updatePixel = (x: number, y: number, action: 'add' | 'erase' | 'recolor') => {
    if (lastReservation) return;
    if (x < 0 || y < 0 || x >= 1000 || y >= 1000) return;
    if (occupiedAt(x + 0.5, y + 0.5) || claimedAt(x, y)) return;
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
      pendingTouchRef.current = null;
      firstTapRef.current = null;
      startPinch();
      return;
    }

    const current = cameraRef.current;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: current.x, originY: current.y, moved: false };
    if (tool === 'pan') return;

    const world = screenToWorld(event.clientX, event.clientY);
    const x = Math.floor(world.x);
    const y = Math.floor(world.y);
    const occupied = occupiedAt(world.x, world.y) ?? null;
    if (!occupied && (world.x < 0 || world.x >= 1000 || world.y < 0 || world.y >= 1000)) return;

    const action: 'add' | 'erase' | 'recolor' = recolorMode ? 'recolor' : tool === 'erase' ? 'erase' : 'add';
    if (action === 'add' && claimedAt(x, y)) return;

    if (event.pointerType === 'touch') {
      pendingTouchRef.current = {
        pointerId: event.pointerId,
        startedAt: performance.now(),
        startX: event.clientX,
        startY: event.clientY,
        x,
        y,
        action,
        occupied,
        moved: false,
      };
      return;
    }

    if (occupied) {
      setSelectedBlock(occupied);
      return;
    }

    updatePixel(x, y, action);
    paintRef.current = { pointerId: event.pointerId, lastX: x, lastY: y, action };
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2) {
      gestureRef.current.multiTouch = true;
      pendingTouchRef.current = null;
      paintRef.current = null;
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

    const pending = pendingTouchRef.current;
    if (pending && pending.pointerId === event.pointerId) {
      const movedDistance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
      if (movedDistance > 4) pending.moved = true;

      if (pending.action === 'add' && selectedPixels.size === 0) return;

      if (pending.moved && performance.now() - pending.startedAt >= 90 && !pending.occupied) {
        updatePixel(pending.x, pending.y, pending.action);
        paintRef.current = { pointerId: event.pointerId, lastX: pending.x, lastY: pending.y, action: pending.action };
        pendingTouchRef.current = null;
      } else {
        return;
      }
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
    const wasMultiTouch = gestureRef.current.multiTouch;
    const pending = pendingTouchRef.current?.pointerId === event.pointerId ? pendingTouchRef.current : null;

    pointersRef.current.delete(event.pointerId);

    if (pending && !wasMultiTouch) {
      pendingTouchRef.current = null;

      if (pending.occupied) {
        setSelectedBlock(pending.occupied);
      } else if (pending.action === 'add' && selectedPixels.size === 0) {
        const now = performance.now();
        const previous = firstTapRef.current;
        const isSecondTap = !!previous
          && now - previous.at <= 420
          && Math.hypot(pending.startX - previous.clientX, pending.startY - previous.clientY) <= 34;

        if (isSecondTap) {
          firstTapRef.current = null;
          updatePixel(pending.x, pending.y, 'add');
        } else {
          firstTapRef.current = {
            at: now,
            x: pending.x,
            y: pending.y,
            clientX: pending.startX,
            clientY: pending.startY,
          };
        }
      } else if (!pending.moved) {
        updatePixel(pending.x, pending.y, pending.action);
      }
    }

    if (pointersRef.current.size >= 2) startPinch();
    else pinchRef.current = null;
    if (paintRef.current?.pointerId === event.pointerId) paintRef.current = null;
    if (pointersRef.current.size === 0) gestureRef.current.multiTouch = false;
    setIsDragging(false);
  };

  const onPointerCancel = (event: PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pendingTouchRef.current?.pointerId === event.pointerId) pendingTouchRef.current = null;
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
    setLastReservation(null);
  };

  const fillAll = (color: string) => {
    if (lastReservation) return;
    setActiveColor(color);
    setSelectedPixels((current) => {
      const next = new Map<string, SelectedPixel>();
      current.forEach((pixel, key) => next.set(key, { ...pixel, color }));
      return next;
    });
  };

  const handleReserved = (reservation: WallReservationSuccess) => {
    clearPendingPixelSelection();
    setLastReservation(reservation);
    setCustomizeOpen(false);
    setRecolorMode(false);
  };


  return (
    <div className="wall-page">
      <Header />
      <main className="wall-main">
        <div className="wall-layout">
          <section className="canvas-card pixel-editor-card" data-testid="interactive-wall">
            <div className={`canvas-stage ${isDragging ? 'dragging' : ''}`} ref={stageRef}>
              <div className="floating-zoom" aria-label="Controles de zoom">
                <Search size={16} aria-hidden="true" />
                <button onClick={() => zoomAt(cameraRef.current.scale * 1.25)} aria-label="Aumentar zoom"><Plus size={20} /></button>
                <span className="floating-zoom-divider" />
                <button onClick={() => zoomAt(cameraRef.current.scale / 1.25)} aria-label="Diminuir zoom"><Minus size={20} /></button>
              </div>
              {selectedCount === 0 && (
                <div className="first-pixel-hint">Toque 2× no primeiro pixel para começar</div>
              )}
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
                <button className={tool === 'select' && !recolorMode ? 'active' : ''} onClick={() => { setTool('select'); setRecolorMode(false); }} disabled={!!lastReservation}><Paintbrush size={17} /> Selecionar</button>
                <button className={tool === 'erase' ? 'active' : ''} onClick={() => { setTool('erase'); setRecolorMode(false); }} disabled={!!lastReservation}><Eraser size={17} /> Apagar</button>
                <button className={tool === 'pan' ? 'active' : ''} onClick={() => { setTool('pan'); setRecolorMode(false); }}><Hand size={17} /> Mover</button>
              </div>
              <div className="pixel-editor-total"><strong>{selectedCount}</strong><span>pixels</span><strong>R${selectedCount.toFixed(2).replace('.', ',')}</strong></div>
              <div className="pixel-editor-actions">
                <button className="editor-clear" onClick={clearSelection} disabled={!selectedCount || !!lastReservation}>Limpar</button>
                <button className="editor-customize" onClick={() => setCustomizeOpen(true)} disabled={!selectedCount || !!lastReservation}><Paintbrush size={16} /> Personalizar</button>
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
          <SelectionPanel
            selectedPixels={selectedList}
            selectedBlock={selectedBlock}
            coordinateText={coordinateText}
            lastReservation={lastReservation}
            onReserved={handleReserved}
            onAvailabilityConflict={refreshPublicPixels}
          />
        </div>
        {wallSyncError && <div className="demo-notice" role="status">{wallSyncError} A proteção do banco continua ativa; tente atualizar a página.</div>}
        <div className="wall-bottom-note"><Grid2X2 size={17} /> Selecione pixels independentes para criar letras, símbolos e desenhos. Ao continuar, sua seleção fica reservada por 15 minutos.</div>
      </main>
    </div>
  );
}

function SelectionPanel({
  selectedPixels,
  selectedBlock,
  coordinateText,
  lastReservation,
  onReserved,
  onAvailabilityConflict,
}: {
  selectedPixels: SelectedPixel[];
  selectedBlock: PixelBlock | null;
  coordinateText: string;
  lastReservation: WallReservationSuccess | null;
  onReserved: (reservation: WallReservationSuccess) => void;
  onAvailabilityConflict: () => Promise<void>;
}) {
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { user, session, openAuth } = useAuth();
  const selectedCount = selectedPixels.length;
  const autoCheckoutStartedRef = useRef(false);

  const openMercadoPagoCheckout = async (
    reservation: WallReservationSuccess,
    accessToken: string,
  ) => {
    setPaymentError(null);
    setOpeningCheckout(true);

    try {
      const checkout = await createMercadoPagoCheckout(
        reservation.reservation_id,
        accessToken,
      );

      window.localStorage.setItem(
        'pixel-wall-checkout-reservation',
        reservation.reservation_id,
      );

      clearPendingCheckoutIntent();
      clearPendingPixelSelection();

      window.location.assign(checkout.checkout_url);
    } catch (caught) {
      clearPendingCheckoutIntent();
      setPaymentError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível iniciar o pagamento agora.',
      );
      setOpeningCheckout(false);
    }
  };

  const reserveAndOpenCheckout = async () => {
    setReservationError(null);
    setPaymentError(null);

    if (!session) return;

    if (selectedCount < 5) {
      clearPendingCheckoutIntent();
      autoCheckoutStartedRef.current = false;
      setReservationError('Selecione pelo menos 5 pixels para continuar.');
      return;
    }

    setReserving(true);

    try {
      const result = await reserveWallPixels(
        selectedPixels,
        session.access_token,
      );

      if (!result.ok) {
        clearPendingCheckoutIntent();
        autoCheckoutStartedRef.current = false;

        setReservationError(
          'Um ou mais pixels foram reservados por outra pessoa enquanto você fazia login. A parede foi atualizada; ajuste sua seleção e tente novamente.',
        );

        await onAvailabilityConflict();
        return;
      }

      onReserved(result);
      setReserving(false);

      await openMercadoPagoCheckout(
        result,
        session.access_token,
      );
    } catch (caught) {
      clearPendingCheckoutIntent();
      autoCheckoutStartedRef.current = false;

      setReservationError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível reservar os pixels agora.',
      );

      setReserving(false);
    }
  };

  const handleReserve = async () => {
    setReservationError(null);

    if (!user || !session) {
      if (selectedCount < 5) {
        setReservationError('Selecione pelo menos 5 pixels para continuar.');
        return;
      }

      savePendingPixelSelection(selectedPixels);
      markPendingCheckoutIntent();
      openAuth();
      return;
    }

    if (reserving || openingCheckout || lastReservation) return;

    autoCheckoutStartedRef.current = true;
    await reserveAndOpenCheckout();
  };

  const handlePayment = async () => {
    if (!session || !lastReservation || openingCheckout) return;

    await openMercadoPagoCheckout(
      lastReservation,
      session.access_token,
    );
  };

  useEffect(() => {
    if (
      !user ||
      !session ||
      lastReservation ||
      selectedCount < 5 ||
      !hasPendingCheckoutIntent() ||
      autoCheckoutStartedRef.current
    ) {
      return;
    }

    autoCheckoutStartedRef.current = true;
    void reserveAndOpenCheckout();
  }, [user, session, lastReservation, selectedCount]);

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
          <button className="selection-button" onClick={handleReserve} disabled={reserving || !!lastReservation}>
            {reserving ? 'Reservando...' : lastReservation ? 'Seleção reservada' : 'Continuar com esta seleção'}
            {!reserving && !lastReservation && <ArrowRight size={17} />}
            {lastReservation && <Check size={17} />}
          </button>
          {selectedCount < 5 && !lastReservation && (
            <div className="demo-notice" role="status">Selecione mais {5 - selectedCount} {5 - selectedCount === 1 ? 'pixel' : 'pixels'} para atingir o mínimo de R$ 5,00.</div>
          )}
          {reservationError && <div className="demo-notice" role="alert">{reservationError}</div>}
          {lastReservation && (
            <>
              <div className="demo-notice" role="status">
                <Check size={15} /> {lastReservation.pixel_count} pixels reservados até {new Date(lastReservation.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Valor confirmado pelo banco: R$ {(lastReservation.amount_cents / 100).toFixed(2).replace('.', ',')}.
              </div>
              <button className="selection-button" type="button" onClick={handlePayment} disabled={openingCheckout}>
                {openingCheckout ? 'Abrindo Mercado Pago...' : 'Pagar com Mercado Pago'}
                {!openingCheckout && <ArrowRight size={17} />}
              </button>
              {paymentError && <div className="demo-notice" role="alert">{paymentError}</div>}
            </>
          )}
        </div>
      ) : (
        <div className="selection-empty compact-empty"><div className="empty-cross"><Crosshair size={24} /></div><div><h2>Monte seu desenho.</h2><p>No celular, toque duas vezes no primeiro pixel. Depois toque onde quiser ou arraste para desenhar.</p></div></div>
      )}
      <div className="panel-foot"><span><span className="pulse-dot" /> seleção livre</span><Link href="/"><ArrowLeft size={14} /> voltar ao início</Link></div>
    </aside>
  );
}

function MyPixelsPage() {
  const { user, session, loading, openAuth, openProfile } = useAuth();

  const [data, setData] = useState<MyPurchasesResponse | null>(null);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setData(null);
      return;
    }

    let cancelled = false;

    setLoadingPurchases(true);
    setError(null);

    void getMyPurchases(session.access_token)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Não foi possível carregar seus pixels agora.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPurchases(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const money = (cents: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);

  const date = (value: string | null) => {
    if (!value) return 'Data não disponível';

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  };

  return (
    <div className="app-shell">
      <Header />

      <main
        style={{
          minHeight: '70vh',
          padding: 'clamp(32px, 6vw, 90px) clamp(20px, 7vw, 110px)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
          }}
        >
          <div className="section-label">
            MINHA CONTA — MINHAS COMPRAS
          </div>

          <div
            style={{
              display: 'flex',
              gap: 24,
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              marginTop: 22,
              marginBottom: 38,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(42px, 7vw, 82px)',
                  lineHeight: 0.9,
                  letterSpacing: '-0.05em',
                }}
              >
                MEUS<br />
                <span style={{ color: '#ef6b50' }}>PIXELS.</span>
              </h1>

              <p
                style={{
                  maxWidth: 540,
                  fontSize: 18,
                  marginTop: 24,
                }}
              >
                Tudo o que você já deixou na parede fica guardado aqui.
              </p>
            </div>

            {user && (
              <button
                type="button"
                className="button button-outline"
                onClick={openProfile}
              >
                Editar perfil
              </button>
            )}
          </div>

          {loading ? (
            <div className="demo-notice">
              Carregando sua conta...
            </div>
          ) : !user || !session ? (
            <div
              style={{
                border: '2px solid #211d42',
                padding: '32px',
                maxWidth: 620,
                background: '#fffaf0',
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                Entre para ver seus pixels.
              </h2>

              <p>
                Suas compras ficam vinculadas à conta usada no pagamento.
              </p>

              <button
                type="button"
                className="button button-coral"
                onClick={openAuth}
              >
                Entrar na minha conta
                <ArrowRight size={18} />
              </button>
            </div>
          ) : loadingPurchases ? (
            <div className="demo-notice">
              Carregando suas compras...
            </div>
          ) : error ? (
            <div className="demo-notice" role="alert">
              {error}
            </div>
          ) : data ? (
            <>
              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(180px, 1fr))',
                  border: '2px solid #211d42',
                  marginBottom: 36,
                  background: '#fffaf0',
                }}
              >
                <div style={{ padding: 24 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    pixels que são seus
                  </span>

                  <strong style={{ fontSize: 38 }}>
                    {data.total_pixels}
                  </strong>
                </div>

                <div
                  style={{
                    padding: 24,
                    borderLeft: '1px solid #211d42',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    compras realizadas
                  </span>

                  <strong style={{ fontSize: 38 }}>
                    {data.purchase_count}
                  </strong>
                </div>

                <div
                  style={{
                    padding: 24,
                    borderLeft: '1px solid #211d42',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    valor total
                  </span>

                  <strong style={{ fontSize: 28 }}>
                    {money(data.total_amount_cents)}
                  </strong>
                </div>
              </section>

              {data.purchases.length === 0 ? (
                <div
                  style={{
                    border: '2px dashed #211d42',
                    padding: 32,
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>
                    Você ainda não possui pixels.
                  </h2>

                  <p>
                    Escolha um espaço na parede e deixe sua primeira marca.
                  </p>

                  <Link
                    href="/parede"
                    className="button button-yellow"
                  >
                    Comprar meus primeiros pixels
                    <ArrowRight size={18} />
                  </Link>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gap: 18,
                  }}
                >
                  {data.purchases.map((purchase, index) => (
                    <article
                      key={purchase.order_id}
                      style={{
                        border: '2px solid #211d42',
                        background: '#fffaf0',
                        padding: 26,
                        display: 'grid',
                        gap: 22,
                        gridTemplateColumns:
                          'minmax(0, 1fr) auto',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: 12,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          Compra #{data.purchase_count - index}
                        </span>

                        <div
                          style={{
                            display: 'flex',
                            gap: 20,
                            flexWrap: 'wrap',
                            alignItems: 'baseline',
                            marginTop: 10,
                          }}
                        >
                          <strong style={{ fontSize: 30 }}>
                            {purchase.pixel_count} pixels
                          </strong>

                          <strong
                            style={{
                              fontSize: 20,
                              color: '#ef6b50',
                            }}
                          >
                            {money(purchase.amount_cents)}
                          </strong>
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 14,
                            opacity: 0.75,
                          }}
                        >
                          {date(
                            purchase.paid_at ??
                              purchase.created_at,
                          )}
                        </div>

                        {purchase.bounds && (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 13,
                            }}
                          >
                            Área: {purchase.bounds.min_x},
                            {purchase.bounds.min_y}
                            {' → '}
                            {purchase.bounds.max_x},
                            {purchase.bounds.max_y}
                          </div>
                        )}
                      </div>

                      <Link
                        href={
                          purchase.bounds
                            ? `/parede?focus=${purchase.bounds.min_x},${purchase.bounds.min_y},${purchase.bounds.max_x},${purchase.bounds.max_y}`
                            : '/parede'
                        }
                        className="button button-outline"
                      >
                        Ver na parede
                        <ArrowRight size={17} />
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/parede" component={WallPage} />
        <Route path="/meus-pixels" component={MyPixelsPage} />
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