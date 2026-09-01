import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const supabaseUrl = process.env.SUPABASE_URL || "https://cnyjodkusuikivdwbwcg.supabase.co";
const supabasePublishableKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
const appPublicUrl = (process.env.APP_PUBLIC_URL || "https://um-milhao-de-pixels-brasil--jhonymec2.replit.app").replace(/\/$/, "");

type ReservationRow = {
  id: string;
  user_id: string;
  status: "active" | "converted" | "expired" | "cancelled";
  pixel_count: number;
  amount_cents: number;
  expires_at: string;
};

type MercadoPagoPreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
  error?: string;
};

function getBearerToken(req: Request) {
  const authorization = req.header("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

async function loadOwnActiveReservation(reservationId: string, accessToken: string) {
  if (!supabasePublishableKey) {
    throw new Error("SUPABASE_PUBLIC_KEY_MISSING");
  }

  const query = new URLSearchParams({
    select: "id,user_id,status,pixel_count,amount_cents,expires_at",
    id: `eq.${reservationId}`,
    limit: "1",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/wall_reservations?${query.toString()}`, {
    headers: {
      Accept: "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const rows = await response.json() as ReservationRow[];
  const reservation = rows[0] ?? null;

  if (!reservation) return null;
  if (reservation.status !== "active") return null;
  if (new Date(reservation.expires_at).getTime() <= Date.now()) return null;
  if (!Number.isInteger(reservation.pixel_count) || reservation.pixel_count < 1) return null;
  if (!Number.isInteger(reservation.amount_cents) || reservation.amount_cents < 1) return null;

  return reservation;
}

router.post("/mercado-pago/preference", async (req: Request, res: Response) => {
  const accessToken = getBearerToken(req);
  const reservationId = typeof req.body?.reservation_id === "string" ? req.body.reservation_id.trim() : "";

  if (!accessToken) {
    res.status(401).json({ message: "Entre na sua conta para continuar com o pagamento." });
    return;
  }

  if (!reservationId) {
    res.status(400).json({ message: "Reserva inválida." });
    return;
  }

  if (!mercadoPagoAccessToken) {
    req.log?.error("MERCADO_PAGO_ACCESS_TOKEN is not configured");
    res.status(503).json({ message: "O pagamento ainda não está configurado no servidor." });
    return;
  }

  try {
    const reservation = await loadOwnActiveReservation(reservationId, accessToken);

    if (!reservation) {
      res.status(409).json({
        message: "Essa reserva não está mais disponível. Volte à parede e faça uma nova seleção.",
      });
      return;
    }

    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            id: `pixels-${reservation.id}`,
            title: `${reservation.pixel_count} pixels — Um Milhão de Pixels Brasil`,
            description: "Reserva de pixels na parede digital Um Milhão de Pixels Brasil",
            quantity: 1,
            currency_id: "BRL",
            unit_price: reservation.amount_cents / 100,
          },
        ],
        external_reference: reservation.id,
        metadata: {
          reservation_id: reservation.id,
          pixel_count: reservation.pixel_count,
        },
        back_urls: {
          success: `${appPublicUrl}/parede?payment=success`,
          pending: `${appPublicUrl}/parede?payment=pending`,
          failure: `${appPublicUrl}/parede?payment=failure`,
        },
        auto_return: "approved",
      }),
    });

    const payload = await preferenceResponse.json() as MercadoPagoPreferenceResponse;

    if (!preferenceResponse.ok || !payload.id) {
      req.log?.error(
        { status: preferenceResponse.status, mpError: payload.error, mpMessage: payload.message },
        "Mercado Pago preference creation failed",
      );
      res.status(502).json({ message: "Não foi possível abrir o Mercado Pago agora. Tente novamente." });
      return;
    }

    const checkoutUrl = payload.sandbox_init_point || payload.init_point;

    if (!checkoutUrl) {
      req.log?.error({ preferenceId: payload.id }, "Mercado Pago preference returned no checkout URL");
      res.status(502).json({ message: "O Mercado Pago não retornou o link de pagamento." });
      return;
    }

    res.status(201).json({
      preference_id: payload.id,
      checkout_url: checkoutUrl,
      reservation_id: reservation.id,
      pixel_count: reservation.pixel_count,
      amount_cents: reservation.amount_cents,
      expires_at: reservation.expires_at,
    });
  } catch (error) {
    req.log?.error({ err: error }, "Could not create Mercado Pago preference");
    res.status(500).json({ message: "Não foi possível iniciar o pagamento agora." });
  }
});

export default router;
