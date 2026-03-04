import express from "express";
import { z } from "zod";
import { createSession, startSession, submitEngagement, endSessionAndIssueReward } from "../services/sessionService.js";
import { listActiveOffers } from "../services/offerService.js";
import { redeemToken } from "../services/redemptionService.js";

export const v1 = express.Router();

const CreateSessionSchema = z.object({
  riderId: z.string().min(2),
  deviceId: z.string().min(2).optional(),
  city: z.string().min(2)
});

v1.post("/sessions", async (req, res, next) => {
  try {
    const body = CreateSessionSchema.parse(req.body);
    const session = await createSession({ tenantId: req.tenantId, ...body });
    res.status(201).json({ session });
  } catch (e) { next(e); }
});

v1.post("/sessions/:id/start", async (req, res, next) => {
  try {
    const session = await startSession({ tenantId: req.tenantId, sessionId: req.params.id });
    res.json({ session });
  } catch (e) { next(e); }
});

const EngagementSchema = z.object({
  engagementScore: z.number().int().min(0).max(100),
  details: z.any().optional()
});

v1.post("/sessions/:id/engagement", async (req, res, next) => {
  try {
    const body = EngagementSchema.parse(req.body);
    const session = await submitEngagement({ tenantId: req.tenantId, sessionId: req.params.id, ...body });
    res.json({ session });
  } catch (e) { next(e); }
});

v1.post("/sessions/:id/end", async (req, res, next) => {
  try {
    const result = await endSessionAndIssueReward({ tenantId: req.tenantId, sessionId: req.params.id });
    res.json({ result });
  } catch (e) { next(e); }
});

v1.get("/offers", async (req, res, next) => {
  try {
    const city = String(req.query.city || "");
    if (!city) return res.status(400).json({ error: "city query param required" });
    const offers = await listActiveOffers({ tenantId: req.tenantId, city });
    res.json({ offers });
  } catch (e) { next(e); }
});

const RedeemSchema = z.object({
  token: z.string().min(6),
  offerId: z.string().min(6)
});

v1.post("/redemptions", async (req, res, next) => {
  try {
    const body = RedeemSchema.parse(req.body);
    const out = await redeemToken({ tenantId: req.tenantId, ...body });
    res.status(201).json(out);
  } catch (e) { next(e); }
});
