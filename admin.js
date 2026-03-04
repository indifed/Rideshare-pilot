import express from "express";
import { z } from "zod";
import { summaryMetrics, exportSessionsCsv } from "../services/adminService.js";
import { createOffer, toggleOffer } from "../services/offerService.js";

export const admin = express.Router();

admin.get("/metrics/summary", async (req, res, next) => {
  try {
    const sinceDays = req.query.sinceDays ? Number(req.query.sinceDays) : 30;
    const out = await summaryMetrics({ tenantId: req.tenantId, sinceDays });
    res.json(out);
  } catch (e) { next(e); }
});

admin.get("/exports/sessions.csv", async (req, res, next) => {
  try {
    const csv = await exportSessionsCsv({
      tenantId: req.tenantId,
      from: req.query.from ? String(req.query.from) : null,
      to: req.query.to ? String(req.query.to) : null
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=sessions.csv");
    res.send(csv);
  } catch (e) { next(e); }
});

const CreateOfferSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(1),
  city: z.string().min(2),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  maxRedemptions: z.number().int().min(1).nullable().optional()
});

admin.post("/offers", async (req, res, next) => {
  try {
    const body = CreateOfferSchema.parse(req.body);
    const offer = await createOffer({ tenantId: req.tenantId, ...body });
    res.status(201).json({ offer });
  } catch (e) { next(e); }
});

admin.post("/offers/:id/toggle", async (req, res, next) => {
  try {
    const body = z.object({ isActive: z.boolean() }).parse(req.body);
    const offer = await toggleOffer({ tenantId: req.tenantId, offerId: req.params.id, isActive: body.isActive });
    res.json({ offer });
  } catch (e) { next(e); }
});
