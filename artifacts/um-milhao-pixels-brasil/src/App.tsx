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
import { Link, Route, Switch, Router as WouterRouter, useLocation, useRoute } from 'wouter';
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

type AdminOrder = {
  id: string;
  user_id: string;
  reservation_id: string;
  status: string;
  pixel_count: number;
  amount_cents: number;
  currency: string;
  provider: string | null;
  provider_reference: string | null;
  paid_at: string | null;
  created_at: string;
};

type AdminOverview = {
  admin_user_id: string;
  metrics: {
    revenue_cents: number;
    sold_pixels: number;
    available_pixels: number;
    occupied_percent: number;
    buyer_count: number;
    purchase_count: number;
    average_ticket_cents: number;
  };
  status_counts: Record<string, number>;
  largest_purchase: {
    id: string;
    user_id: string;
    pixel_count: number;
    amount_cents: number;
    paid_at: string;
  } | null;
  recent_orders: AdminOrder[];
};

function formatAdminMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatAdminDate(value: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}


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
                background: '#111111',
                  color: '#f5f4ef',
                border: '1px solid #343434',
                boxShadow: '5px 5px 0 rgba(255, 104, 29, 0.18)',
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
                  color: '#343434',
                  fontWeight: 700,
                }}
              ><span style={{ color: '#f5f4ef' }}>Meus pixels</span></Link>

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
                  color: '#343434',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              ><span style={{ color: '#f5f4ef' }}>Editar perfil</span></button>

              <div
                style={{
                  height: 1,
                  background: '#343434',
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
                  color: '#ff681d',
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

function RealWallMiniMap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pixels, setPixels] = useState<PublicWallPixel[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await loadPublicWallPixels();

        if (!cancelled) {
          setPixels(
            result.filter(
              (pixel) =>
                pixel.status === 'purchased' &&
                typeof pixel.color === 'string',
            ),
          );
          setLoadFailed(false);
        }
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
        }
      }
    };

    void load();

    const interval = window.setInterval(
      () => void load(),
      60000,
    );

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };

    const refreshOnPageShow = () => {
      void load();
    };

    document.addEventListener(
      'visibilitychange',
      refreshWhenVisible,
    );

    window.addEventListener(
      'pageshow',
      refreshOnPageShow,
    );

    return () => {
      cancelled = true;

      window.clearInterval(interval);

      document.removeEventListener(
        'visibilitychange',
        refreshWhenVisible,
      );

      window.removeEventListener(
        'pageshow',
        refreshOnPageShow,
      );
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, 1000, 1000);

    /* fundo exatamente branco */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1000, 1000);

    /*
     * PIXELS REAIS
     * Mesma fonte de dados da parede oficial.
     */
    for (const pixel of pixels) {
      if (!pixel.color) continue;

      ctx.fillStyle = pixel.color;
      ctx.fillRect(pixel.x, pixel.y, 1, 1);
    }

    /*
     * GRADE DA VISÃO GERAL
     *
     * 10 x 10 pixels = divisão fina
     * 100 x 100 pixels = divisão principal
     *
     * A grade é desenhada DEPOIS dos pixels para continuar
     * visível mesmo quando existirem desenhos grandes.
     */

    ctx.save();

    /* blocos de 10 pixels */
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(176, 181, 188, 0.42)';
    ctx.lineWidth = 0.65;

    for (let position = 10; position < 1000; position += 10) {
      const p = position + 0.5;

      ctx.moveTo(p, 0);
      ctx.lineTo(p, 1000);

      ctx.moveTo(0, p);
      ctx.lineTo(1000, p);
    }

    ctx.stroke();

    /* blocos principais de 100 pixels */
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(125, 131, 140, 0.52)';
    ctx.lineWidth = 1;

    for (let position = 100; position < 1000; position += 100) {
      const p = position + 0.5;

      ctx.moveTo(p, 0);
      ctx.lineTo(p, 1000);

      ctx.moveTo(0, p);
      ctx.lineTo(1000, p);
    }

    ctx.stroke();

    ctx.restore();

  }, [pixels]);

  return (
    <Link
      href="/parede"
      className="pixel-mosaic compact"
      data-testid="visual-real-wall-hero"
      aria-label="Abrir parede real"
      style={{
        display: 'block',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <canvas
        ref={canvasRef}
        width={1000}
        height={1000}
        aria-label="Miniatura atual da parede"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          imageRendering: 'pixelated',
        }}
      />

      <div className="mosaic-coordinate coord-a">
        000,000
      </div>

      <div className="mosaic-coordinate coord-b">
        999,999
      </div>

      {loadFailed && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            padding: '6px 8px',
            background: '#ffffff',
            border: '1px solid #211d42',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          atualizando parede...
        </div>
      )}
    </Link>
  );
}

type PublicWallStats = {
  total_pixels: number;
  available_pixels: number;
  occupied_percent: number;
  total_amount_cents: number;
  buyer_count: number;
  purchase_count: number;
  ranking: Array<{
    name: string;
    username: string | null;
    avatar_emoji: string | null;
    avatar_path: string | null;
    pixels: number;
    purchases: number;
  }>;
  rankings?: {
    general: Array<{
      name: string;
      username: string | null;
      avatar_emoji: string | null;
      avatar_path: string | null;
      pixels: number;
      purchases: number;
    }>;
    weekly: Array<{
      name: string;
      username: string | null;
      avatar_emoji: string | null;
      avatar_path: string | null;
      pixels: number;
      purchases: number;
    }>;
    daily: Array<{
      name: string;
      username: string | null;
      avatar_emoji: string | null;
      avatar_path: string | null;
      pixels: number;
      purchases: number;
    }>;
  };
  recent_purchases: Array<{
    name: string;
    username: string | null;
    pixel_count: number;
    paid_at: string;
  }>;
  records: {
    first_purchase: {
      order_id: string;
      pixel_count: number;
      paid_at: string;
      name: string;
      username: string | null;
      bounds: {
        min_x: number;
        min_y: number;
        max_x: number;
        max_y: number;
      } | null;
    } | null;

    latest_purchase: {
      order_id: string;
      pixel_count: number;
      paid_at: string;
      name: string;
      username: string | null;
      bounds: {
        min_x: number;
        min_y: number;
        max_x: number;
        max_y: number;
      } | null;
    } | null;

    largest_purchase: {
      order_id: string;
      pixel_count: number;
      paid_at: string;
      name: string;
      username: string | null;
      bounds: {
        min_x: number;
        min_y: number;
        max_x: number;
        max_y: number;
      } | null;
    } | null;

    largest_buyer: {
      name: string;
      username: string | null;
      pixels: number;
      purchases: number;
    } | null;
  };
};

async function loadPublicWallStats(): Promise<PublicWallStats> {
  const response = await fetch(
    '/api/payments/mercado-pago/public-stats',
    {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error('Não foi possível carregar as estatísticas.');
  }

  return await response.json() as PublicWallStats;
}

function usePublicWallStats() {
  const [stats, setStats] = useState<PublicWallStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await loadPublicWallStats();

        if (!cancelled) {
          setStats(result);
        }
      } catch {
        // A home continua utilizável mesmo se as estatísticas
        // estiverem temporariamente indisponíveis.
      }
    };

    void load();

    const interval = window.setInterval(
      () => void load(),
      30000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return stats;
}

function LiveWallTicker() {
  const stats = usePublicWallStats();

  if (!stats || stats.purchase_count === 0) {
    return (
      <div
        className="live-wall-ticker"
        data-testid="live-wall-ticker"
      >
        <div className="live-wall-ticker-static">
          A PAREDE ESTÁ AO VIVO
          <span>•</span>
          O PRÓXIMO PIXEL PODE SER O SEU
        </div>
      </div>
    );
  }

  const messages: string[] = [];

  const leader = stats.ranking[0];

  if (leader) {
    messages.push(
      `RANKING: ${leader.name} LIDERA COM ${leader.pixels.toLocaleString('pt-BR')} ${leader.pixels === 1 ? 'PIXEL' : 'PIXELS'}`
    );
  }

  if (stats.records.largest_purchase) {
    const pixels = stats.records.largest_purchase.pixel_count;

    messages.push(
      `RECORDE: MAIOR COMPRA FOI DE ${pixels.toLocaleString('pt-BR')} ${pixels === 1 ? 'PIXEL' : 'PIXELS'}`
    );
  }

  if (stats.records.first_purchase) {
    const pixels = stats.records.first_purchase.pixel_count;

    messages.push(
      `HALL DA FAMA: PRIMEIRA COMPRA — ${pixels.toLocaleString('pt-BR')} ${pixels === 1 ? 'PIXEL' : 'PIXELS'}`
    );
  }

  (stats.recent_purchases ?? []).slice(0, 8).forEach((purchase) => {
    messages.push(
      `AGORA: ${purchase.name} COMPROU ${purchase.pixel_count.toLocaleString('pt-BR')} ${purchase.pixel_count === 1 ? 'PIXEL' : 'PIXELS'}`
    );
  });

  const renderMessages = (prefix: string) =>
    messages.map((message, index) => (
      <span
        className="live-wall-ticker-item"
        key={`${prefix}-${index}`}
      >
        {message}
        <i aria-hidden="true">•</i>
      </span>
    ));

  return (
    <div
      className="live-wall-ticker"
      data-testid="live-wall-ticker"
      aria-label="Atividade ao vivo da parede"
    >
      <div className="live-wall-ticker-track">
        <div className="live-wall-ticker-group">
          {renderMessages('a')}
        </div>

        <div
          className="live-wall-ticker-group"
          aria-hidden="true"
        >
          {renderMessages('b')}
        </div>
      </div>
    </div>
  );
}

function StatStrip() {
  const stats = usePublicWallStats();

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const items = [
    [
      stats ? stats.total_pixels.toLocaleString('pt-BR') : '—',
      '/ 1.000.000',
      'pixels ocupados',
    ],
    [
      stats
        ? `${stats.occupied_percent.toLocaleString('pt-BR', {
            maximumFractionDigits: 4,
          })}%`
        : '—',
      '',
      'completo',
    ],
    [
      stats ? formatMoney(stats.total_amount_cents) : '—',
      '',
      'arrecadados',
    ],
    [
      stats ? stats.buyer_count.toLocaleString('pt-BR') : '—',
      '',
      'compradores',
    ],
  ];

  return (
    <section className="stat-strip" data-testid="section-stats">
      {items.map(([value, suffix, label], index) => (
        <div
          className="stat-item"
          key={label}
          data-testid={`stat-${index}`}
        >
          <div>
            <strong>{value}</strong>
            <span>{suffix}</span>
          </div>
          <small>{label}</small>
        </div>
      ))}
    </section>
  );
}

function Home() {
  const stats = usePublicWallStats();

  return (
    <div className="app-shell">
      <Header />
      <main>
        <section className="hero" data-testid="section-hero">
          <div className="hero-copy reveal">
            <div className="eyebrow"><span className="eyebrow-dot" /> a maior parede digital do brasil</div>
            <h1>COMPRE UM<br /><em>PIXEL.</em><br />DEIXE SUA<br /><em>MARCA.</em></h1>
            <p className="hero-deck">Um milhão de pequenos espaços para criar uma memória coletiva na internet.</p>
            <div className="hero-actions">
              <Link href="/parede" className="button button-yellow" data-testid="button-buy-hero">Comprar pixels <ArrowRight size={18} /></Link>
              <Link href="/parede" className="button button-outline" data-testid="button-explore-hero">Explorar a parede</Link>
              <a className="text-link" href="#como-funciona" data-testid="link-scroll-how">Entenda a ideia <ChevronDown size={16} /></a>
            </div>
          </div>
          <div className="hero-visual reveal reveal-delay">
            <div className="visual-caption">
              <span>A PAREDE ESTÁ AO VIVO</span>
              <span>
                {stats
                  ? `${stats.total_pixels.toLocaleString('pt-BR')} / 1.000.000`
                  : 'CARREGANDO...'}
              </span>
            </div>

            <RealWallMiniMap />

            <div className="hero-sticker">
              <Sparkles size={15} /> feito por todo mundo
            </div>
          </div>
          <div className="hero-bottom-note">rolar para descobrir <ArrowDownRight size={17} /></div>
        </section>

        <StatStrip />

        <DemoActivity />

        <section className="manifesto-section" data-testid="section-manifesto">
          <div className="section-label">02 — o começo</div>
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
          <div className="section-label">03 — como funciona?</div>
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

        <section
          className="preview-section"
          data-testid="section-wall-preview"
          style={{
            gridTemplateColumns: '1fr',
          }}
        >
          <div
            className="preview-copy"
            style={{
              maxWidth: 760,
            }}
          >
            <div className="section-label light">
              04 — a parede
            </div>

            <h2>
              O primeiro
              <br />
              <span>quadradinho</span>
              <br />
              é seu.
            </h2>

            <p>
              Explore a parede real, encontre um espaço livre
              e deixe sua marca entre um milhão de pixels.
            </p>

            <Link
              href="/parede"
              className="button button-coral"
              data-testid="button-open-wall"
            >
              Abrir parede interativa
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

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
  const stats = usePublicWallStats();
  const [rankingMode, setRankingMode] =
    useState<'general' | 'weekly' | 'daily' | 'recent'>(
      'general',
    );

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));

  const generalRanking =
    stats?.rankings?.general ??
    stats?.ranking ??
    [];

  const weeklyRanking =
    stats?.rankings?.weekly ?? [];

  const dailyRanking =
    stats?.rankings?.daily ?? [];

  const recentRanking =
    (stats?.recent_purchases ?? []).map(
      (purchase) => ({
        name: purchase.name,
        username: purchase.username,
        avatar_emoji: null,
        avatar_path: null,
        pixels: purchase.pixel_count,
        purchases: 1,
      }),
    );

  const ranking =
    rankingMode === 'weekly'
      ? weeklyRanking
      : rankingMode === 'daily'
        ? dailyRanking
        : rankingMode === 'recent'
          ? recentRanking
          : generalRanking;

  const emptyMessage =
    rankingMode === 'weekly'
      ? 'Ainda não houve compras nos últimos 7 dias.'
      : rankingMode === 'daily'
        ? 'Ainda não houve compras nas últimas 24 horas.'
        : rankingMode === 'recent'
          ? 'A primeira compra aparecerá aqui.'
          : 'O ranking começa com a primeira compra.';

  const tabs = [
    ['general', 'Geral'],
    ['weekly', 'Semanal'],
    ['daily', 'Diário'],
    ['recent', 'Recentes'],
  ] as const;

  return (
    <section
      className="activity-section"
      id="ranking"
      data-testid="section-activity"
    >
      <div className="section-label">
        01 — ranking e recordes
      </div>

      <div className="activity-grid">
        <div className="ranking-card">
          <div className="card-topline">
            <span>
              <Trophy size={16} /> ranking
            </span>
            <span>ao vivo</span>
          </div>

          <h2>
            Quem deixou
            <br />
            <span>mais marca?</span>
          </h2>

          <div
            className="ranking-tabs"
            role="tablist"
            aria-label="Período do ranking"
          >
            {tabs.map(([value, label]) => (
              <button
                type="button"
                role="tab"
                aria-selected={rankingMode === value}
                className={
                  rankingMode === value ? 'active' : ''
                }
                onClick={() => setRankingMode(value)}
                key={value}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rank-list">
            {!stats ? (
              <div className="demo-notice">
                Carregando ranking...
              </div>
            ) : ranking.length === 0 ? (
              <div className="demo-notice">
                {emptyMessage}
              </div>
            ) : (
              ranking.slice(0, 10).map((entry, index) => (
                <div
                  className="rank-row"
                  key={`${rankingMode}-${entry.username ?? entry.name}-${index}`}
                  data-testid={`rank-row-${index + 1}`}
                >
                  <strong>
                    {String(index + 1).padStart(2, '0')}
                  </strong>

                  <i
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      fontStyle: 'normal',
                    }}
                  >
                    {entry.avatar_emoji ?? ''}
                  </i>

                  <div>
                    <b>{entry.name}</b>
                    <small>
                      {entry.pixels.toLocaleString('pt-BR')}{' '}
                      {entry.pixels === 1
                        ? 'pixel'
                        : 'pixels'}
                    </small>
                  </div>

                  <ArrowRight size={16} />
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className="records-card hall-card"
          data-testid="hall-da-fama"
        >
          <div className="card-topline">
            <span>
              <Star size={16} /> hall da fama
            </span>
            <span>real</span>
          </div>

          <div className="hall-heading">
            <h2>
              Marcas que
              <br />
              <span>já viraram história.</span>
            </h2>

            <p>
              Só entram aqui conquistas comprovadas pelas
              compras reais da parede.
            </p>
          </div>

          {!stats || stats.purchase_count === 0 ? (
            <div className="demo-notice">
              O Hall da Fama começa com a primeira compra.
            </div>
          ) : (
            <div className="hall-grid">
              {stats.records.first_purchase && (
                <article className="hall-item">
                  <div className="hall-icon">01</div>

                  <div className="hall-copy">
                    <small>primeiro comprador</small>
                    <strong>
                      {stats.records.first_purchase.name}
                    </strong>
                    <span>
                      {stats.records.first_purchase.pixel_count.toLocaleString(
                        'pt-BR',
                      )}{' '}
                      pixels ·{' '}
                      {formatDate(
                        stats.records.first_purchase.paid_at,
                      )}
                    </span>
                  </div>

                  {stats.records.first_purchase.bounds && (
                    <Link
                      className="hall-link"
                      href={`/parede?focus=${stats.records.first_purchase.bounds.min_x},${stats.records.first_purchase.bounds.min_y},${stats.records.first_purchase.bounds.max_x},${stats.records.first_purchase.bounds.max_y}`}
                    >
                      Ver na parede
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </article>
              )}

              {stats.records.largest_buyer && (
                <article className="hall-item">
                  <div className="hall-icon">★</div>

                  <div className="hall-copy">
                    <small>maior comprador</small>
                    <strong>
                      {stats.records.largest_buyer.name}
                    </strong>
                    <span>
                      {stats.records.largest_buyer.pixels.toLocaleString(
                        'pt-BR',
                      )}{' '}
                      pixels em{' '}
                      {stats.records.largest_buyer.purchases.toLocaleString(
                        'pt-BR',
                      )}{' '}
                      {stats.records.largest_buyer.purchases === 1
                        ? 'compra'
                        : 'compras'}
                    </span>
                  </div>

                  {stats.records.largest_buyer.username && (
                    <Link
                      className="hall-link"
                      href={`/usuario/${stats.records.largest_buyer.username}`}
                    >
                      Ver perfil
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </article>
              )}

              {stats.records.largest_purchase && (
                <article className="hall-item">
                  <div className="hall-icon">↑</div>

                  <div className="hall-copy">
                    <small>maior compra</small>
                    <strong>
                      {stats.records.largest_purchase.pixel_count.toLocaleString(
                        'pt-BR',
                      )}{' '}
                      pixels
                    </strong>
                    <span>
                      {stats.records.largest_purchase.name} ·{' '}
                      {formatDate(
                        stats.records.largest_purchase.paid_at,
                      )}
                    </span>
                  </div>

                  {stats.records.largest_purchase.bounds && (
                    <Link
                      className="hall-link"
                      href={`/parede?focus=${stats.records.largest_purchase.bounds.min_x},${stats.records.largest_purchase.bounds.min_y},${stats.records.largest_purchase.bounds.max_x},${stats.records.largest_purchase.bounds.max_y}`}
                    >
                      Ver na parede
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </article>
              )}

              {stats.records.latest_purchase && (
                <article className="hall-item hall-item-live">
                  <div className="hall-icon">●</div>

                  <div className="hall-copy">
                    <small>compra mais recente</small>
                    <strong>
                      {stats.records.latest_purchase.name}
                    </strong>
                    <span>
                      {stats.records.latest_purchase.pixel_count.toLocaleString(
                        'pt-BR',
                      )}{' '}
                      pixels ·{' '}
                      {formatDate(
                        stats.records.latest_purchase.paid_at,
                      )}
                    </span>
                  </div>

                  {stats.records.latest_purchase.bounds && (
                    <Link
                      className="hall-link"
                      href={`/parede?focus=${stats.records.latest_purchase.bounds.min_x},${stats.records.latest_purchase.bounds.min_y},${stats.records.latest_purchase.bounds.max_x},${stats.records.latest_purchase.bounds.max_y}`}
                    >
                      Ver na parede
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </article>
              )}
            </div>
          )}

          <div className="hall-future">
            <span>próximas conquistas</span>
            <p>
              Maior desenho e primeira empresa serão liberados
              quando pudermos comprová-los com dados reais.
            </p>
          </div>
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
  const [amountCents, setAmountCents] = useState(0);
  const [focusHref, setFocusHref] = useState('/parede');
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
        setAmountCents(status.amount_cents);

        if (status.paid) {
          window.localStorage.removeItem('pixel-wall-checkout-reservation');
          setMode('paid');

          try {
            const purchases = await getMyPurchases(session.access_token);
            const purchase = purchases.purchases.find(
              (item) => item.reservation_id === reservationId,
            );

            if (purchase?.bounds) {
              setFocusHref(
                `/parede?focus=${purchase.bounds.min_x},${purchase.bounds.min_y},${purchase.bounds.max_x},${purchase.bounds.max_y}`,
              );
            }
          } catch {
            // A compra já foi confirmada. Se a localização não carregar,
            // mantemos o acesso normal à parede.
          }

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
    const shareUrl = `${window.location.origin}${focusHref}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Um Milhão de Pixels Brasil',
          text,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
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
        background: 'rgba(0,0,0,.82)',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
      }}
    >
      <div style={{
        width: 'min(520px, 100%)',
        background: '#111111',
        color: '#f5f4ef',
        border: '2px solid #3a3a3a',
        boxShadow: '8px 8px 0 #000000',
        padding: 24,
      }}>
        {mode === 'checking' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>Mercado Pago</div>
            <h2 style={{ fontSize: 32, lineHeight: 1, margin: '12px 0' }}>Confirmando seu pagamento...</h2>
            <p style={{ margin: 0, lineHeight: 1.55 }}>Estamos esperando a confirmação segura do servidor. Não feche esta página.</p>
            <div style={{ height: 8, background: '#2b2b2b', marginTop: 22, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '58%', background: '#ff681d' }} />
            </div>
          </>
        )}

        {mode === 'paid' && (
          <>
            <div style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', background: '#ff681d', border: '2px solid #3a3a3a' }}>
              <Check size={30} />
            </div>

            <div
              style={{
                marginTop: 16,
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                color: '#ff681d',
              }}
            >
              compra confirmada
            </div>

            <h2
              style={{
                fontSize: 34,
                lineHeight: 1,
                margin: '10px 0 12px',
              }}
            >
              VOCÊ AGORA POSSUI UM PEDAÇO DA INTERNET!
            </h2>

            <p style={{ lineHeight: 1.55, margin: 0 }}>
              Sua marca agora faz parte oficialmente do
              Um Milhão de Pixels Brasil.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                border: '1px solid #3a3a3a',
                background: '#171717',
                marginTop: 22,
              }}
            >
              <div style={{ padding: 16 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    opacity: 0.65,
                    marginBottom: 5,
                  }}
                >
                  pixels adquiridos
                </span>
                <strong style={{ fontSize: 25 }}>
                  {pixelCount}
                </strong>
              </div>

              <div
                style={{
                  padding: 16,
                  borderLeft: '1px solid #3a3a3a',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    opacity: 0.65,
                    marginBottom: 5,
                  }}
                >
                  valor confirmado
                </span>
                <strong style={{ fontSize: 25 }}>
                  {(amountCents / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </strong>
              </div>
            </div>

            {message && (
              <p style={{ marginTop: 12, fontWeight: 700 }}>
                {message}
              </p>
            )}

            <div
              style={{
                display: 'grid',
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                className="selection-button"
                type="button"
                onClick={() => window.location.assign('/meus-pixels')}
              >
                Ver meus pixels
                <ArrowRight size={17} />
              </button>

              <button
                className="editor-customize"
                type="button"
                onClick={() => window.location.assign(focusHref)}
              >
                <Crosshair size={16} />
                Ver na parede
              </button>

              <button
                className="editor-customize"
                type="button"
                onClick={share}
              >
                <Share2 size={16} />
                Compartilhar minha marca
              </button>
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
            <div style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', background: '#ff681d', border: '2px solid #f5f4ef', color: '#111111' }}>
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
  const publicPixelBucketsRef = useRef(
    new Map<string, PublicWallPixel[]>(),
  );
  const publicPixelBucketSize = 50;
  const [wallSyncError, setWallSyncError] = useState<string | null>(null);

  const wallSyncInFlightRef = useRef(false);
  const wallLastSyncAtRef = useRef(0);

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
    if (wallSyncInFlightRef.current) {
      return;
    }

    wallSyncInFlightRef.current = true;

    try {
      const pixels = await loadPublicWallPixels();
      const next = new Map<string, PublicWallPixel>();
      const nextBuckets =
        new Map<string, PublicWallPixel[]>();

      pixels.forEach((pixel) => {
        next.set(`${pixel.x}:${pixel.y}`, pixel);

        const bucketX = Math.floor(
          pixel.x / publicPixelBucketSize,
        );

        const bucketY = Math.floor(
          pixel.y / publicPixelBucketSize,
        );

        const bucketKey =
          `${bucketX}:${bucketY}`;

        const bucket =
          nextBuckets.get(bucketKey) ?? [];

        bucket.push(pixel);

        nextBuckets.set(
          bucketKey,
          bucket,
        );
      });

      publicPixelBucketsRef.current =
        nextBuckets;

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
      setWallSyncError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível atualizar a parede.',
      );
    } finally {
      wallLastSyncAtRef.current = Date.now();
      wallSyncInFlightRef.current = false;
    }
  }, [lastReservation]);

  useEffect(() => {
    void refreshPublicPixels();

    const interval = window.setInterval(
      () => {
        void refreshPublicPixels();
      },
      60000,
    );

    const refreshIfStale = () => {
      const staleFor =
        Date.now() -
        wallLastSyncAtRef.current;

      if (
        document.visibilityState === 'visible' &&
        staleFor >= 10000
      ) {
        void refreshPublicPixels();
      }
    };

    const handlePageShow = () => {
      refreshIfStale();
    };

    const handleFocus = () => {
      refreshIfStale();
    };

    document.addEventListener(
      'visibilitychange',
      refreshIfStale,
    );

    window.addEventListener(
      'pageshow',
      handlePageShow,
    );

    window.addEventListener(
      'focus',
      handleFocus,
    );

    return () => {
      window.clearInterval(interval);

      document.removeEventListener(
        'visibilitychange',
        refreshIfStale,
      );

      window.removeEventListener(
        'pageshow',
        handlePageShow,
      );

      window.removeEventListener(
        'focus',
        handleFocus,
      );
    };
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
    ctx.fillStyle = '#090909';
    ctx.fillRect(0, 0, rect.width, rect.height);
    const originX = rect.width / 2 - 500 * camera.scale + camera.x;
    const originY = rect.height / 2 - 500 * camera.scale + camera.y;
    const wallSize = 1000 * camera.scale;
    ctx.fillStyle = '#f7f7f4';
    ctx.fillRect(originX, originY, wallSize, wallSize);
    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, wallSize, wallSize);
    ctx.clip();

    const drawGrid = (
      logicalStep: number,
      strokeStyle: string,
      lineWidth: number,
    ) => {
      const step = logicalStep * camera.scale;

      if (step < 3.5) return;

      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;

      const firstVertical =
        originX + Math.ceil((0 - 0) / logicalStep) * step;

      for (
        let x = firstVertical;
        x <= originX + wallSize;
        x += step
      ) {
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, originY);
        ctx.lineTo(
          Math.round(x) + 0.5,
          originY + wallSize,
        );
        ctx.stroke();
      }

      const firstHorizontal =
        originY + Math.ceil((0 - 0) / logicalStep) * step;

      for (
        let y = firstHorizontal;
        y <= originY + wallSize;
        y += step
      ) {
        ctx.beginPath();
        ctx.moveTo(originX, Math.round(y) + 0.5);
        ctx.lineTo(
          originX + wallSize,
          Math.round(y) + 0.5,
        );
        ctx.stroke();
      }
    };

    // OVERVIEW
    // Cerca de 50 células por eixo, como na referência.
    if (camera.scale < 0.8) {
      drawGrid(
        20,
        'rgba(184, 190, 196, 0.52)',
        0.45,
      );
    }

    // Em zoom médio aparecem divisões de 10 pixels.
    if (camera.scale >= 0.8) {
      drawGrid(
        10,
        'rgba(184, 190, 196, 0.48)',
        0.45,
      );
    }

    // Estrutura de 100 pixels, apenas um pouco mais marcada.
    drawGrid(
      100,
      'rgba(145, 151, 157, 0.48)',
      0.6,
    );

    // Aproximando mais, aparecem divisões de 5 pixels.
    if (camera.scale >= 1.6) {
      drawGrid(
        5,
        'rgba(190, 195, 200, 0.42)',
        0.4,
      );
    }

    // Só no zoom alto mostramos pixel por pixel.
    if (camera.scale >= 4.5) {
      drawGrid(
        1,
        'rgba(195, 200, 205, 0.38)',
        0.35,
      );
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 104, 29, 0.75)';
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

    /*
     * PERFORMANCE:
     * só percorremos os buckets que cruzam
     * a área visível do Canvas.
     *
     * O Map completo continua disponível para
     * claimedAt(), portanto a segurança da seleção
     * não muda.
     */

    const visibleMinX = Math.max(
      0,
      Math.floor(
        (-originX) / camera.scale,
      ),
    );

    const visibleMinY = Math.max(
      0,
      Math.floor(
        (-originY) / camera.scale,
      ),
    );

    const visibleMaxX = Math.min(
      999,
      Math.ceil(
        (rect.width - originX) /
          camera.scale,
      ),
    );

    const visibleMaxY = Math.min(
      999,
      Math.ceil(
        (rect.height - originY) /
          camera.scale,
      ),
    );

    if (
      visibleMinX <= visibleMaxX &&
      visibleMinY <= visibleMaxY
    ) {
      const firstBucketX = Math.floor(
        visibleMinX /
          publicPixelBucketSize,
      );

      const lastBucketX = Math.floor(
        visibleMaxX /
          publicPixelBucketSize,
      );

      const firstBucketY = Math.floor(
        visibleMinY /
          publicPixelBucketSize,
      );

      const lastBucketY = Math.floor(
        visibleMaxY /
          publicPixelBucketSize,
      );

      for (
        let bucketY = firstBucketY;
        bucketY <= lastBucketY;
        bucketY += 1
      ) {
        for (
          let bucketX = firstBucketX;
          bucketX <= lastBucketX;
          bucketX += 1
        ) {
          const bucket =
            publicPixelBucketsRef.current.get(
              `${bucketX}:${bucketY}`,
            );

          if (!bucket) continue;

          for (const pixel of bucket) {
            if (
              pixel.x < visibleMinX ||
              pixel.x > visibleMaxX ||
              pixel.y < visibleMinY ||
              pixel.y > visibleMaxY
            ) {
              continue;
            }

            const x =
              originX +
              pixel.x *
                camera.scale;

            const y =
              originY +
              pixel.y *
                camera.scale;

            const size =
              Math.max(
                1,
                camera.scale,
              );

            ctx.fillStyle =
              pixel.status === 'purchased'
                ? (
                    pixel.color ??
                    '#111111'
                  )
                : '#b9b4aa';

            ctx.fillRect(
              x,
              y,
              size,
              size,
            );

            if (
              pixel.status ===
                'reserved' &&
              camera.scale >= 6
            ) {
              ctx.strokeStyle =
                'rgba(70, 66, 58, 0.72)';

              ctx.lineWidth =
                Math.max(
                  1,
                  camera.scale *
                    0.10,
                );

              ctx.beginPath();

              ctx.moveTo(
                x + size * 0.18,
                y + size * 0.18,
              );

              ctx.lineTo(
                x + size * 0.82,
                y + size * 0.82,
              );

              ctx.moveTo(
                x + size * 0.82,
                y + size * 0.18,
              );

              ctx.lineTo(
                x + size * 0.18,
                y + size * 0.82,
              );

              ctx.stroke();
            }
          }
        }
      }
    }

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
        Math.min(rect.width, rect.height) / 1000 * 0.985,
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
      const movedDistance = Math.hypot(
        event.clientX - pending.startX,
        event.clientY - pending.startY,
      );

      if (movedDistance > 4) {
        pending.moved = true;

        const nextCamera = {
          ...cameraRef.current,
          x: dragRef.current.originX + dx,
          y: dragRef.current.originY + dy,
        };

        cameraRef.current = nextCamera;
        setCamera(nextCamera);
        setIsDragging(true);
      }

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
    const wasMultiTouch = gestureRef.current.multiTouch;
    const pending = pendingTouchRef.current?.pointerId === event.pointerId ? pendingTouchRef.current : null;

    pointersRef.current.delete(event.pointerId);

    if (pending && !wasMultiTouch) {
      pendingTouchRef.current = null;

      // Se houve arraste, foi apenas navegação.
      // Nunca selecionamos/pintamos pixels durante o movimento.
      if (!pending.moved) {
        if (pending.occupied) {
          setSelectedBlock(pending.occupied);
        } else {
          updatePixel(
            pending.x,
            pending.y,
            pending.action,
          );
        }
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


  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialPosition, setTutorialPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const wallTutorialSteps = [
    {
      title: 'Bem-vindo à parede',
      text: 'Esta é uma parede compartilhada de 1 milhão de pixels. Cada espaço comprado passa a fazer parte dela permanentemente.',
      target: '[data-testid="canvas-pixel-wall"]',
      placement: 'bottom-right',
    },
    {
      title: 'Mova a parede',
      text: 'No celular ou tablet, arraste com um dedo para navegar. Arrastar nunca seleciona pixels. No computador, use a ferramenta Mover quando quiser navegar.',
      target: '[data-testid="canvas-pixel-wall"]',
      placement: 'bottom-right',
    },
    {
      title: 'Aproxime onde quiser',
      text: 'Use dois dedos para ampliar ou reduzir no celular. Você também pode usar os controles + e − ao lado da parede.',
      target: '.floating-zoom',
      placement: 'top-right',
    },
    {
      title: 'Selecione seus pixels',
      text: 'Toque em um pixel livre para selecioná-lo. Continue tocando em outros espaços para montar letras, desenhos, símbolos ou qualquer composição.',
      target: '[data-testid="pixel-editor-bar"]',
      placement: 'top-right',
    },
    {
      title: 'Edite sua seleção',
      text: 'Use Selecionar, Apagar e Mover. Depois toque em Personalizar para escolher as cores dos pixels selecionados.',
      target: '[data-testid="pixel-editor-bar"]',
      placement: 'top-right',
    },
    {
      title: 'Confira e continue',
      text: 'O resumo mostra a quantidade de pixels e o valor da compra. O mínimo atual é de 5 pixels. Quando estiver satisfeito, toque em Continuar com esta seleção.',
      target: '.selection-panel',
      placement: 'top-left',
    },
    {
      title: 'Reserva e pagamento',
      text: 'Se ainda não estiver conectado, você fará login. Seus pixels são reservados por 15 minutos e o Mercado Pago é aberto para concluir o pagamento. O tutorial termina aqui.',
      target: '.selection-panel',
      placement: 'auto',
    },
  ] as const;

  const closeWallTutorial = () => {
    setTutorialOpen(false);
    setTutorialStep(0);
  };

  useEffect(() => {
    document
      .querySelectorAll('.wall-tutorial-highlight')
      .forEach((element) =>
        element.classList.remove('wall-tutorial-highlight')
      );

    if (!tutorialOpen) {
      setTutorialPosition(null);
      return;
    }

    const step = wallTutorialSteps[tutorialStep];
    const target = step?.target
      ? document.querySelector(step.target)
      : null;

    if (target instanceof HTMLElement) {
      target.classList.add('wall-tutorial-highlight');

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }

    const calculatePosition = () => {
      const dialog = document.querySelector(
        '.wall-tutorial-dialog'
      );

      if (!(dialog instanceof HTMLElement)) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const margin = 18;
      const gap = 18;

      const dialogRect = dialog.getBoundingClientRect();
      const dialogWidth = dialogRect.width;
      const dialogHeight = dialogRect.height;

      if (!(target instanceof HTMLElement)) {
        setTutorialPosition({
          top: margin,
          left: Math.max(
            margin,
            viewportWidth - dialogWidth - margin,
          ),
        });
        return;
      }

      const targetRect = target.getBoundingClientRect();


      /*
       * Etapas críticas:
       * 4 e 5 precisam deixar o editor completamente visível.
       * 6 precisa deixar o resumo/CTA completamente visível.
       *
       * tutorialStep é zero-based:
       * passo 4 = 3
       * passo 5 = 4
       * passo 6 = 5
       */
      const criticalStep =
        tutorialStep === 3 ||
        tutorialStep === 4 ||
        tutorialStep === 5;

      if (criticalStep) {
        const safeGap = 24;

        const clampCritical = (
          value: number,
          min: number,
          max: number,
        ) => Math.min(Math.max(value, min), max);

        let preferredTop: number;

        if (tutorialStep === 5) {
          /*
           * PASSO 6:
           * caixa acima do resumo/CTA.
           */
          preferredTop =
            targetRect.top -
            dialogHeight -
            safeGap;
        } else {
          /*
           * PASSOS 4 e 5:
           * caixa abaixo do painel de ferramentas.
           */
          preferredTop =
            targetRect.bottom +
            safeGap;
        }

        let preferredLeft =
          targetRect.left +
          targetRect.width / 2 -
          dialogWidth / 2;

        preferredLeft = clampCritical(
          preferredLeft,
          margin,
          Math.max(
            margin,
            viewportWidth - dialogWidth - margin,
          ),
        );

        preferredTop = clampCritical(
          preferredTop,
          margin,
          Math.max(
            margin,
            viewportHeight - dialogHeight - margin,
          ),
        );

        /*
         * Segurança extra:
         * se a posição preferida ainda cruzar o alvo por falta
         * de espaço vertical, move para o lado com mais espaço.
         */
        const proposedBottom =
          preferredTop + dialogHeight;

        const overlapsVertically =
          proposedBottom > targetRect.top &&
          preferredTop < targetRect.bottom;

        const proposedRight =
          preferredLeft + dialogWidth;

        const overlapsHorizontally =
          proposedRight > targetRect.left &&
          preferredLeft < targetRect.right;

        if (
          overlapsVertically &&
          overlapsHorizontally
        ) {
          const spaceRight =
            viewportWidth -
            targetRect.right -
            safeGap;

          const spaceLeft =
            targetRect.left -
            safeGap;

          if (
            spaceRight >= dialogWidth ||
            spaceRight >= spaceLeft
          ) {
            preferredLeft =
              targetRect.right + safeGap;
          } else {
            preferredLeft =
              targetRect.left -
              dialogWidth -
              safeGap;
          }

          preferredLeft = clampCritical(
            preferredLeft,
            margin,
            Math.max(
              margin,
              viewportWidth -
                dialogWidth -
                margin,
            ),
          );
        }

        setTutorialPosition({
          top: preferredTop,
          left: preferredLeft,
        });

        return;
      }

      const candidates = [
        {
          name: 'right',
          top:
            targetRect.top +
            targetRect.height / 2 -
            dialogHeight / 2,
          left: targetRect.right + gap,
        },
        {
          name: 'left',
          top:
            targetRect.top +
            targetRect.height / 2 -
            dialogHeight / 2,
          left: targetRect.left - dialogWidth - gap,
        },
        {
          name: 'bottom',
          top: targetRect.bottom + gap,
          left:
            targetRect.left +
            targetRect.width / 2 -
            dialogWidth / 2,
        },
        {
          name: 'top',
          top: targetRect.top - dialogHeight - gap,
          left:
            targetRect.left +
            targetRect.width / 2 -
            dialogWidth / 2,
        },
      ];

      const clamp = (
        value: number,
        min: number,
        max: number,
      ) =>
        Math.min(Math.max(value, min), max);

      const overlapArea = (
        a: {
          left: number;
          top: number;
          right: number;
          bottom: number;
        },
        b: {
          left: number;
          top: number;
          right: number;
          bottom: number;
        },
      ) => {
        const width = Math.max(
          0,
          Math.min(a.right, b.right) -
            Math.max(a.left, b.left),
        );

        const height = Math.max(
          0,
          Math.min(a.bottom, b.bottom) -
            Math.max(a.top, b.top),
        );

        return width * height;
      };

      const scored = candidates.map((candidate) => {
        const left = clamp(
          candidate.left,
          margin,
          Math.max(
            margin,
            viewportWidth - dialogWidth - margin,
          ),
        );

        const top = clamp(
          candidate.top,
          margin,
          Math.max(
            margin,
            viewportHeight - dialogHeight - margin,
          ),
        );

        const rect = {
          left,
          top,
          right: left + dialogWidth,
          bottom: top + dialogHeight,
        };

        const overlap = overlapArea(rect, targetRect);

        const overflow =
          Math.max(0, margin - left) +
          Math.max(0, margin - top) +
          Math.max(
            0,
            rect.right - (viewportWidth - margin),
          ) +
          Math.max(
            0,
            rect.bottom - (viewportHeight - margin),
          );

        return {
          ...candidate,
          left,
          top,
          overlap,
          overflow,
        };
      });

      scored.sort((a, b) => {
        if (a.overlap !== b.overlap) {
          return a.overlap - b.overlap;
        }

        return a.overflow - b.overflow;
      });

      const best = scored[0];

      setTutorialPosition({
        top: best.top,
        left: best.left,
      });
    };

    const firstTimer = window.setTimeout(
      calculatePosition,
      360,
    );

    const secondTimer = window.setTimeout(
      calculatePosition,
      700,
    );

    window.addEventListener(
      'resize',
      calculatePosition,
    );

    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
      window.removeEventListener(
        'resize',
        calculatePosition,
      );

      if (target instanceof HTMLElement) {
        target.classList.remove(
          'wall-tutorial-highlight'
        );
      }
    };
  }, [tutorialOpen, tutorialStep]);

  return (
    <div className="wall-page">
      <Header />
      <LiveWallTicker />

      <div className="wall-tutorial-bar">
        <button
          type="button"
          className="wall-tutorial-launch"
          onClick={() => {
            setTutorialStep(0);
            setTutorialOpen(true);
          }}
          data-testid="button-wall-tutorial"
        >
          <span className="wall-tutorial-question">?</span>
          Tutorial da parede
        </button>

        <span>
          primeira vez aqui? veja como funciona em menos de 1 minuto
        </span>
      </div>

      {tutorialOpen && (
        <div
          className="wall-tutorial-overlay"
          role="presentation"
        >
          <div
            className="wall-tutorial-dialog"
            style={
              tutorialPosition
                ? {
                    top: tutorialPosition.top,
                    left: tutorialPosition.left,
                    right: 'auto',
                    bottom: 'auto',
                  }
                : undefined
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="wall-tutorial-title"
          >
            <div className="wall-tutorial-topline">
              <span>
                Tutorial da parede
              </span>

              <button
                type="button"
                onClick={closeWallTutorial}
                aria-label="Fechar tutorial"
              >
                ×
              </button>
            </div>

            <div className="wall-tutorial-progress">
              <strong>
                {tutorialStep + 1}
              </strong>
              <span>
                de {wallTutorialSteps.length}
              </span>

              <div>
                {wallTutorialSteps.map((_, index) => (
                  <i
                    key={index}
                    className={
                      index <= tutorialStep
                        ? 'complete'
                        : ''
                    }
                  />
                ))}
              </div>
            </div>

            <h2 id="wall-tutorial-title">
              {wallTutorialSteps[tutorialStep].title}
            </h2>

            <p>
              {wallTutorialSteps[tutorialStep].text}
            </p>

            <div className="wall-tutorial-actions">
              <button
                type="button"
                className="wall-tutorial-secondary"
                onClick={() =>
                  setTutorialStep((current) =>
                    Math.max(0, current - 1)
                  )
                }
                disabled={tutorialStep === 0}
              >
                Voltar
              </button>

              {tutorialStep <
              wallTutorialSteps.length - 1 ? (
                <button
                  type="button"
                  className="wall-tutorial-primary"
                  onClick={() =>
                    setTutorialStep((current) =>
                      Math.min(
                        wallTutorialSteps.length - 1,
                        current + 1,
                      )
                    )
                  }
                >
                  Próximo →
                </button>
              ) : (
                <button
                  type="button"
                  className="wall-tutorial-primary"
                  onClick={closeWallTutorial}
                >
                  Entendi, quero explorar
                </button>
              )}
            </div>

            <button
              type="button"
              className="wall-tutorial-skip"
              onClick={closeWallTutorial}
            >
              Pular tutorial
            </button>
          </div>
        </div>
      )}

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
                <div className="first-pixel-hint">Toque em um pixel para começar</div>
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
            onResetExpired={clearSelection}
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
  onResetExpired,
}: {
  selectedPixels: SelectedPixel[];
  selectedBlock: PixelBlock | null;
  coordinateText: string;
  lastReservation: WallReservationSuccess | null;
  onReserved: (reservation: WallReservationSuccess) => void;
  onAvailabilityConflict: () => Promise<void>;
  onResetExpired: () => void;
}) {
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [reservationSecondsLeft, setReservationSecondsLeft] = useState<number | null>(null);
  const { user, session, openAuth } = useAuth();
  const selectedCount = selectedPixels.length;
  const autoCheckoutStartedRef = useRef(false);

  useEffect(() => {
    if (!lastReservation) {
      setReservationSecondsLeft(null);
      return;
    }

    const updateReservationClock = () => {
      const expiresAt = new Date(lastReservation.expires_at).getTime();
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setReservationSecondsLeft(remaining);
    };

    updateReservationClock();

    const interval = window.setInterval(updateReservationClock, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [lastReservation]);

  const reservationExpired =
    lastReservation !== null &&
    reservationSecondsLeft !== null &&
    reservationSecondsLeft <= 0;

  const reservationClock =
    reservationSecondsLeft === null
      ? null
      : `${String(Math.floor(reservationSecondsLeft / 60)).padStart(2, '0')}:${String(
          reservationSecondsLeft % 60,
        ).padStart(2, '0')}`;

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

      window.sessionStorage.setItem(
        'pixel-wall-checkout-url',
        checkout.checkout_url,
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

  useEffect(() => {
    const restoreCheckoutState = () => {
      setOpeningCheckout(false);
    };

    window.addEventListener('pageshow', restoreCheckoutState);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOpeningCheckout(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', restoreCheckoutState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleExpiredReservationReset = async () => {
    if (!reservationExpired) return;

    window.localStorage.removeItem(
      'pixel-wall-checkout-reservation',
    );

    window.sessionStorage.removeItem(
      'pixel-wall-checkout-url',
    );

    clearPendingCheckoutIntent();
    clearPendingPixelSelection();

    setOpeningCheckout(false);
    setPaymentError(null);
    setReservationError(null);
    setReservationSecondsLeft(null);

    autoCheckoutStartedRef.current = false;

    onResetExpired();

    await onAvailabilityConflict();
  };

  const handlePayment = async () => {
    if (!session || !lastReservation || openingCheckout) return;

    if (reservationExpired) {
      setPaymentError('Sua reserva expirou. Selecione novamente os pixels para continuar.');
      return;
    }

    const savedReservationId = window.localStorage.getItem(
      'pixel-wall-checkout-reservation',
    );

    const savedCheckoutUrl = window.sessionStorage.getItem(
      'pixel-wall-checkout-url',
    );

    if (
      savedReservationId === lastReservation.reservation_id &&
      savedCheckoutUrl
    ) {
      setOpeningCheckout(true);
      window.location.assign(savedCheckoutUrl);
      return;
    }

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
              <div
                className={`demo-notice reservation-countdown ${
                  reservationExpired
                    ? 'reservation-expired'
                    : reservationSecondsLeft !== null && reservationSecondsLeft <= 180
                      ? 'reservation-warning'
                      : ''
                }`}
                role="status"
              >
                {reservationExpired ? (
                  <>
                    <span>Reserva expirada.</span>
                    <strong>Selecione novamente os pixels para continuar.</strong>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>{lastReservation.pixel_count} pixels reservados</span>
                    {reservationClock && (
                      <strong className="reservation-clock">{reservationClock}</strong>
                    )}
                    <span>
                      Valor: R$ {(lastReservation.amount_cents / 100).toFixed(2).replace('.', ',')}
                    </span>
                  </>
                )}
              </div>
              <button
                className="selection-button"
                type="button"
                onClick={
                  reservationExpired
                    ? handleExpiredReservationReset
                    : handlePayment
                }
                disabled={openingCheckout}
              >
                {reservationExpired
                  ? 'Selecionar novamente'
                  : openingCheckout
                    ? 'Abrindo Mercado Pago...'
                    : 'Voltar ao checkout'}
                {!openingCheckout && <ArrowRight size={17} />}
              </button>
              {paymentError && <div className="demo-notice" role="alert">{paymentError}</div>}
            </>
          )}
        </div>
      ) : (
        <div className="selection-empty compact-empty"><div className="empty-cross"><Crosshair size={24} /></div><div><h2>Monte seu desenho.</h2><p>Arraste com um dedo para navegar. Toque em um pixel livre para selecioná-lo. Use dois dedos para ampliar ou reduzir.</p></div></div>
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
                <span style={{ color: '#ff681d' }}>PIXELS.</span>
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
                border: '1px solid #343434',
                padding: '32px',
                maxWidth: 620,
                background: '#111111',
                  color: '#f5f4ef',
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
                  border: '1px solid #343434',
                  marginBottom: 36,
                  background: '#111111',
                  color: '#f5f4ef',
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
                    borderLeft: '1px solid #343434',
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
                    borderLeft: '1px solid #343434',
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
                    border: '1px dashed #343434',
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
                        border: '1px solid #343434',
                        background: '#111111',
                  color: '#f5f4ef',
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
                              color: '#ff681d',
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

                      <div
                        style={{
                          display: 'flex',
                          gap: 10,
                          flexWrap: 'wrap',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <Link
                          href={`/obra/${purchase.order_id}`}
                          className="button button-coral"
                        >
                          Página pública
                          <Share2 size={17} />
                        </Link>

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
                      </div>
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


type PublicPurchase = {
  order_id: string;
  pixel_count: number;
  paid_at: string;
  owner: {
    name: string;
    username: string | null;
    avatar_emoji: string | null;
    avatar_path: string | null;
  };
  bounds: {
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
  };
  pixels: Array<{
    x: number;
    y: number;
    color: string;
  }>;
};

function PublicPurchaseCanvas({
  purchase,
}: {
  purchase: PublicPurchase;
}) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      min_x,
      min_y,
      max_x,
      max_y,
    } = purchase.bounds;

    const width = max_x - min_x + 1;
    const height = max_y - min_y + 1;

    const padding = Math.max(
      2,
      Math.ceil(Math.max(width, height) * 0.12),
    );

    const visibleWidth = width + padding * 2;
    const visibleHeight = height + padding * 2;

    canvas.width = Math.max(1, visibleWidth);
    canvas.height = Math.max(1, visibleHeight);

    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    for (const pixel of purchase.pixels) {
      ctx.fillStyle = pixel.color;

      ctx.fillRect(
        pixel.x - min_x + padding,
        pixel.y - min_y + padding,
        1,
        1,
      );
    }
  }, [purchase]);

  return (
    <canvas
      ref={canvasRef}
      className="public-art-canvas"
      aria-label="Pixels desta obra"
    />
  );
}

function PublicPurchasePage() {
  const [, params] =
    useRoute('/obra/:orderId');

  const orderId = params?.orderId ?? '';

  const [purchase, setPurchase] =
    useState<PublicPurchase | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Obra inválida.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    void fetch(
      `/api/payments/mercado-pago/public-purchase/${encodeURIComponent(orderId)}`,
      {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    )
      .then(async (response) => {
        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.message ||
              'Não foi possível carregar essa obra.',
          );
        }

        return payload as PublicPurchase;
      })
      .then((result) => {
        if (!cancelled) {
          setPurchase(result);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Não foi possível carregar essa obra.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const shareCurrentPage = async () => {
    const url = window.location.href;

    const title =
      purchase
        ? `${purchase.pixel_count} pixels no Um Milhão de Pixels Brasil`
        : 'Um Milhão de Pixels Brasil';

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text:
            'Olha a marca que ficou registrada na parede.',
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(url);

      window.alert(
        'Link copiado para a área de transferência.',
      );
    } catch {
      // Usuário pode cancelar o compartilhamento.
    }
  };

  const date = (value: string) =>
    new Intl.DateTimeFormat(
      'pt-BR',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      },
    ).format(new Date(value));

  return (
    <div className="app-shell public-art-page">
      <Header />

      <main className="public-art-main">
        {loading ? (
          <div className="demo-notice">
            Carregando obra...
          </div>
        ) : error || !purchase ? (
          <div className="public-art-error">
            <span className="section-label">
              OBRA
            </span>

            <h1>
              NÃO FOI
              <br />
              <em>ENCONTRADA.</em>
            </h1>

            <p>
              {error ||
                'Essa obra não está disponível.'}
            </p>

            <Link
              href="/parede"
              className="button button-coral"
            >
              Explorar a parede
              <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="public-art-layout">
            <section className="public-art-copy">
              <div className="section-label">
                OBRA NA PAREDE — PERMANENTE
              </div>

              <h1>
                UM PEDAÇO
                <br />
                DA <em>INTERNET.</em>
              </h1>

              <p className="public-art-owner">
                por{' '}
                <strong>
                  {purchase.owner.name}
                </strong>
              </p>

              <div className="public-art-meta">
                <div>
                  <span>pixels</span>
                  <strong>
                    {purchase.pixel_count.toLocaleString(
                      'pt-BR',
                    )}
                  </strong>
                </div>

                <div>
                  <span>registrado em</span>
                  <strong>
                    {date(purchase.paid_at)}
                  </strong>
                </div>

                <div>
                  <span>coordenadas</span>
                  <strong>
                    {purchase.bounds.min_x},
                    {purchase.bounds.min_y}
                    {' → '}
                    {purchase.bounds.max_x},
                    {purchase.bounds.max_y}
                  </strong>
                </div>
              </div>

              <div className="public-art-actions">
                <Link
                  href={`/parede?focus=${purchase.bounds.min_x},${purchase.bounds.min_y},${purchase.bounds.max_x},${purchase.bounds.max_y}`}
                  className="button button-coral"
                >
                  Ver na parede
                  <Crosshair size={17} />
                </Link>

                <button
                  type="button"
                  className="button button-outline"
                  onClick={shareCurrentPage}
                >
                  Compartilhar
                  <Share2 size={17} />
                </button>
              </div>
            </section>

            <section className="public-art-frame">
              <div className="public-art-frame-top">
                <span>
                  OBRA #{purchase.order_id
                    .slice(0, 8)
                    .toUpperCase()}
                </span>

                <span>
                  {purchase.pixel_count.toLocaleString(
                    'pt-BR',
                  )}{' '}
                  PIXELS
                </span>
              </div>

              <div className="public-art-canvas-wrap">
                <PublicPurchaseCanvas
                  purchase={purchase}
                />
              </div>

              <div className="public-art-frame-bottom">
                UM MILHÃO DE PIXELS BRASIL
              </div>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}


function AdminPage() {
  const { user, session, loading, openAuth } = useAuth();
  const [, setLocation] = useLocation();

  const [overview, setOverview] =
    useState<AdminOverview | null>(null);

  const [adminLoading, setAdminLoading] =
    useState(true);

  const [adminError, setAdminError] =
    useState<string | null>(null);

  const [forbidden, setForbidden] =
    useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user || !session?.access_token) {
      setAdminLoading(false);
      return;
    }

    let cancelled = false;

    const loadAdmin = async () => {
      setAdminLoading(true);
      setAdminError(null);
      setForbidden(false);

      try {
        const response = await fetch(
          '/api/payments/mercado-pago/admin/overview',
          {
            headers: {
              Accept: 'application/json',
              Authorization:
                `Bearer ${session.access_token}`,
            },
            cache: 'no-store',
          },
        );

        const payload =
          await response.json().catch(() => null);

        if (cancelled) return;

        if (response.status === 403) {
          setForbidden(true);
          setOverview(null);
          return;
        }

        if (response.status === 401) {
          setAdminError(
            'Sua sessão expirou. Entre novamente.',
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            payload?.message ||
              'Não foi possível carregar o painel.',
          );
        }

        setOverview(payload as AdminOverview);
      } catch (error) {
        if (!cancelled) {
          setAdminError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar o painel.',
          );
        }
      } finally {
        if (!cancelled) {
          setAdminLoading(false);
        }
      }
    };

    void loadAdmin();

    return () => {
      cancelled = true;
    };
  }, [loading, user, session?.access_token]);

  if (loading || adminLoading) {
    return (
      <main className="admin-page">
        <div className="admin-state">
          <span className="admin-eyebrow">
            PAINEL ADMINISTRATIVO
          </span>
          <h1>Carregando painel...</h1>
          <p>Verificando sua sessão e permissões.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="admin-page">
        <div className="admin-state">
          <span className="admin-eyebrow">
            ACESSO RESTRITO
          </span>
          <h1>Entre na sua conta.</h1>
          <p>
            O painel só pode ser acessado pela
            conta administradora.
          </p>

          <button
            className="admin-primary-button"
            type="button"
            onClick={openAuth}
          >
            ENTRAR
            <ArrowRight size={18} />
          </button>
        </div>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="admin-page">
        <div className="admin-state">
          <span className="admin-eyebrow">
            ACESSO NEGADO
          </span>
          <h1>Conta não autorizada.</h1>
          <p>
            Esta conta não possui permissão administrativa.
          </p>

          <button
            className="admin-secondary-button"
            type="button"
            onClick={() => setLocation('/')}
          >
            VOLTAR AO SITE
          </button>
        </div>
      </main>
    );
  }

  if (adminError || !overview) {
    return (
      <main className="admin-page">
        <div className="admin-state">
          <span className="admin-eyebrow">
            ERRO
          </span>
          <h1>Não foi possível abrir o painel.</h1>
          <p>
            {adminError ??
              'Tente novamente em alguns instantes.'}
          </p>
        </div>
      </main>
    );
  }

  const metrics = overview.metrics;

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-topbar">
          <div>
            <span className="admin-eyebrow">
              UM MILHÃO DE PIXELS BRASIL
            </span>
            <h1>PAINEL ADMINISTRATIVO</h1>
            <p>
              Visão geral das vendas e ocupação da parede.
            </p>
          </div>

          <button
            className="admin-secondary-button"
            type="button"
            onClick={() => setLocation('/')}
          >
            VER SITE
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="admin-metrics">
          <article className="admin-metric admin-metric-featured">
            <span>FATURAMENTO</span>
            <strong>
              {formatAdminMoney(
                metrics.revenue_cents,
              )}
            </strong>
            <small>Pagamentos confirmados</small>
          </article>

          <article className="admin-metric">
            <span>PIXELS VENDIDOS</span>
            <strong>
              {metrics.sold_pixels.toLocaleString('pt-BR')}
            </strong>
            <small>
              {metrics.occupied_percent
                .toLocaleString('pt-BR')}% ocupado
            </small>
          </article>

          <article className="admin-metric">
            <span>PIXELS DISPONÍVEIS</span>
            <strong>
              {metrics.available_pixels
                .toLocaleString('pt-BR')}
            </strong>
            <small>de 1.000.000</small>
          </article>

          <article className="admin-metric">
            <span>COMPRADORES</span>
            <strong>
              {metrics.buyer_count
                .toLocaleString('pt-BR')}
            </strong>
            <small>Compradores únicos</small>
          </article>

          <article className="admin-metric">
            <span>COMPRAS</span>
            <strong>
              {metrics.purchase_count
                .toLocaleString('pt-BR')}
            </strong>
            <small>Pedidos pagos</small>
          </article>

          <article className="admin-metric">
            <span>TICKET MÉDIO</span>
            <strong>
              {formatAdminMoney(
                metrics.average_ticket_cents,
              )}
            </strong>
            <small>Média por compra</small>
          </article>
        </div>

        <div className="admin-grid">
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-eyebrow">
                  PEDIDOS
                </span>
                <h2>ÚLTIMAS TRANSAÇÕES</h2>
              </div>

              <span className="admin-count">
                {overview.recent_orders.length}
              </span>
            </div>

            {overview.recent_orders.length === 0 ? (
              <div className="admin-empty">
                <strong>
                  NENHUMA COMPRA AINDA
                </strong>
                <p>
                  As transações aparecerão aqui
                  quando os primeiros pixels forem vendidos.
                </p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>STATUS</th>
                      <th>PIXELS</th>
                      <th>VALOR</th>
                      <th>DATA</th>
                      <th>MERCADO PAGO</th>
                    </tr>
                  </thead>

                  <tbody>
                    {overview.recent_orders.map(
                      (order) => (
                        <tr key={order.id}>
                          <td>
                            <span
                              className={
                                'admin-status admin-status-' +
                                order.status
                              }
                            >
                              {order.status}
                            </span>
                          </td>

                          <td>
                            {order.pixel_count
                              .toLocaleString('pt-BR')}
                          </td>

                          <td>
                            {formatAdminMoney(
                              order.amount_cents,
                            )}
                          </td>

                          <td>
                            {formatAdminDate(
                              order.paid_at ??
                                order.created_at,
                            )}
                          </td>

                          <td className="admin-reference">
                            {order.provider_reference ??
                              '—'}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="admin-panel admin-summary">
            <span className="admin-eyebrow">
              RESUMO
            </span>

            <h2>STATUS DOS PEDIDOS</h2>

            <div className="admin-status-list">
              <div>
                <span>Pagos</span>
                <strong>
                  {overview.status_counts.paid ?? 0}
                </strong>
              </div>

              <div>
                <span>Pendentes</span>
                <strong>
                  {overview.status_counts.pending ?? 0}
                </strong>
              </div>

              <div>
                <span>Cancelados</span>
                <strong>
                  {overview.status_counts.cancelled ?? 0}
                </strong>
              </div>

              <div>
                <span>Reembolsados</span>
                <strong>
                  {overview.status_counts.refunded ?? 0}
                </strong>
              </div>
            </div>

            <div className="admin-largest">
              <span>MAIOR COMPRA</span>

              {overview.largest_purchase ? (
                <>
                  <strong>
                    {formatAdminMoney(
                      overview
                        .largest_purchase
                        .amount_cents,
                    )}
                  </strong>

                  <small>
                    {overview
                      .largest_purchase
                      .pixel_count
                      .toLocaleString('pt-BR')}{' '}
                    pixels
                  </small>
                </>
              ) : (
                <strong>—</strong>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/parede" component={WallPage} />
        <Route path="/meus-pixels" component={MyPixelsPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/obra/:orderId" component={PublicPurchasePage} />
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