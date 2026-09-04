export type MyPurchaseBounds = {
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
};

export type MyPurchase = {
  order_id: string;
  reservation_id: string;
  pixel_count: number;
  amount_cents: number;
  currency: string;
  provider: string | null;
  paid_at: string | null;
  created_at: string;
  bounds: MyPurchaseBounds | null;
};

export type MyPurchasesResponse = {
  total_pixels: number;
  total_amount_cents: number;
  purchase_count: number;
  purchases: MyPurchase[];
};

export async function getMyPurchases(
  accessToken: string,
): Promise<MyPurchasesResponse> {
  const response = await fetch(
    '/api/payments/mercado-pago/my-purchases',
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    },
  );

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload &&
      'message' in payload
        ? String(payload.message)
        : 'Não foi possível carregar seus pixels agora.';

    throw new Error(message);
  }

  return payload as MyPurchasesResponse;
}
