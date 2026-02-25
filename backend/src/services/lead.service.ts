import mongoose from "mongoose";
import { Lead } from "../models/Lead.js";

export async function upsertLeadByPhone(params: {
companyId: mongoose.Types.ObjectId;
telefono: string;
source: string;
nombre?: string;
interes?: string;
presupuesto?: string;
ubicacion?: string;
tiempoCompra?: string;
}) {
const { companyId, telefono, source } = params;

const update: any = {
  source,
  lastMessageAt: new Date()
};
if (params.nombre !== undefined) update.nombre = params.nombre;
if (params.interes !== undefined) update.interes = params.interes;
if (params.presupuesto !== undefined) update.presupuesto = params.presupuesto;
if (params.ubicacion !== undefined) update.ubicacion = params.ubicacion;
if (params.tiempoCompra !== undefined) update.tiempoCompra = params.tiempoCompra;

const lead = await Lead.findOneAndUpdate(
  { companyId, telefono },
  { $set: update, $setOnInsert: { fecha: new Date(), estado: "nuevo" } },
  { new: true, upsert: true }
);

return lead;
}