const supabasePublicUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cnyjodkusuikivdwbwcg.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export type WallPixelInput = {
  x: number;
  y: number;
  color: string;
};

export type WallReservationSuccess = {
  ok: true;
  reservation_id: string;
  pixel_count: number;
  amount_cents: number;
  currency: 'BRL';
  expires_at: string;
};

export type WallReservationUnavailable = {
  ok: false;
  code: 'PIXELS_UNAVAILABLE';
  requested: number;
  reserved: 0;
};

export type WallReservationResult = WallReservationSuccess | WallReservationUnavailable;

export type PublicWallPixel = {
  x: number;
  y: number;
  color: string | null;
  status: 'reserved' | 'purchased';
};

export async function loadPublicWallPixels(): Promise<PublicWallPixel[]> {
  if (!supabasePublishableKey) {
    throw new Error('A chave pública do Supabase não está configurada.');
  }

  const pageSize = 1000;
  const pixels: PublicWallPixel[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(
      `${supabasePublicUrl}/rest/v1/public_wall_pixels?select=x,y,color,status&order=y.asc,x.asc`,
      {
        headers: {
          Accept: 'application/json',
          apikey: supabasePublishableKey,
          Range: `${offset}-${offset + pageSize - 1}`,
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new Error('Não foi possível atualizar a disponibilidade da parede.');
    }

    const page = await response.json() as PublicWallPixel[];
    pixels.push(...page);

    if (page.length < pageSize) break;
  }

  return pixels;
}

function readableReservationError(payload: unknown) {
  const message = typeof payload === 'object' && payload && 'message' in payload
    ? String(payload.message)
    : '';

  if (message.includes('AUTH_REQUIRED')) return 'Entre na sua conta para reservar pixels.';
  if (message.includes('PROFILE_REQUIRED')) return 'Complete seu perfil antes de continuar.';
  if (message.includes('MINIMUM_PIXELS')) return 'Selecione pelo menos 5 pixels para continuar.';
  if (message.includes('MAXIMUM_PIXELS')) return 'Essa seleção ultrapassa o limite máximo permitido por reserva.';
  if (message.includes('DUPLICATE_PIXELS')) return 'A seleção contém pixels duplicados. Limpe a seleção e tente novamente.';
  if (message.includes('INVALID_PIXEL')) return 'Encontramos um pixel inválido na seleção. Limpe e tente novamente.';

  return 'Não foi possível reservar os pixels agora. Tente novamente.';
}

export async function reserveWallPixels(
  pixels: WallPixelInput[],
  accessToken: string,
): Promise<WallReservationResult> {
  if (!supabasePublishableKey) {
    throw new Error('A chave pública do Supabase não está configurada.');
  }

  const response = await fetch(`${supabasePublicUrl}/rest/v1/rpc/reserve_wall_pixels`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ p_pixels: pixels }),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(readableReservationError(payload));
  }

  return payload as WallReservationResult;
}
