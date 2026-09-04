import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

/*
 * O app roda atrás do proxy HTTPS do Replit.
 * Isso permite usar req.ip corretamente nas
 * proteções contra abuso.
 */
app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader(
    "X-Content-Type-Options",
    "nosniff",
  );

  res.setHeader(
    "X-Frame-Options",
    "SAMEORIGIN",
  );

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );

  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  res.setHeader(
    "Cross-Origin-Opener-Policy",
    "same-origin-allow-popups",
  );

  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
type RateEntry = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateEntry>();

const API_WINDOW_MS = 60 * 1000;
const API_MAX_REQUESTS = 180;

app.use("/api", (req, res, next) => {
  /*
   * O webhook do Mercado Pago não passa por esse limite.
   * Ele possui autenticação própria por assinatura HMAC
   * e pode fazer retries legítimos.
   */
  if (
    req.path ===
      "/payments/mercado-pago/webhook"
  ) {
    next();
    return;
  }

  const now = Date.now();

  const key =
    req.ip ||
    req.socket.remoteAddress ||
    "unknown";

  const current =
    rateBuckets.get(key);

  if (
    !current ||
    current.resetAt <= now
  ) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + API_WINDOW_MS,
    });

    next();
    return;
  }

  current.count += 1;

  if (
    current.count >
      API_MAX_REQUESTS
  ) {
    res.setHeader(
      "Retry-After",
      Math.max(
        1,
        Math.ceil(
          (
            current.resetAt -
            now
          ) / 1000,
        ),
      ).toString(),
    );

    res.status(429).json({
      message:
        "Muitas solicitações. Aguarde alguns instantes e tente novamente.",
    });

    return;
  }

  next();
});

/*
 * Limpeza periódica para o Map não crescer
 * indefinidamente em processos longos.
 */
const rateCleanupTimer = setInterval(
  () => {
    const now = Date.now();

    for (
      const [key, value]
      of rateBuckets
    ) {
      if (
        value.resetAt <= now
      ) {
        rateBuckets.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

rateCleanupTimer.unref();


app.use(express.raw({
  type: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  limit: "5mb",
}));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "100kb",
}));

app.use("/api", router);

export default app;
