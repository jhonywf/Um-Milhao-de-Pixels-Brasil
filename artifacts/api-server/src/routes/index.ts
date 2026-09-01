import { Router, type IRouter } from "express";
import healthRouter from "./health";
import supabaseRouter from "./supabase";
import mercadoPagoRouter from "./mercado-pago";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/supabase", supabaseRouter);
router.use("/payments", mercadoPagoRouter);

export default router;
