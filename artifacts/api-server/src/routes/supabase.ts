import { ReplitConnectors } from "@replit/connectors-sdk";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const connectors = new ReplitConnectors();

const forwardedRequestHeaders = [
  "accept",
  "authorization",
  "content-type",
  "prefer",
  "range",
  "range-unit",
  "x-upsert",
];

function getSupabasePath(req: Request) {
  const path = req.originalUrl.replace(/^\/api\/supabase/, "");
  return path || "/";
}

router.use(async (req: Request, res: Response) => {
  try {
    const headers: Record<string, string> = {};
    for (const header of forwardedRequestHeaders) {
      const value = req.header(header);
      if (value) headers[header] = value;
    }

    const response = await connectors.proxy("supabase", getSupabasePath(req), {
      method: req.method,
      headers,
      ...(req.body === undefined || ["GET", "HEAD"].includes(req.method) ? {} : { body: req.body }),
    });

    for (const header of ["content-type", "content-range", "cache-control", "location"]) {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    }

    if (getSupabasePath(req).startsWith("/auth/")) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");
    }

    const body = Buffer.from(await response.arrayBuffer());
    res.status(response.status).send(body);
  } catch (error) {
    req.log?.error({ err: error }, "Supabase proxy request failed");
    res.status(502).json({
      message: "Não foi possível acessar o serviço de conta agora.",
    });
  }
});

export default router;