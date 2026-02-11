/**
 * Nova Poshta — Barrel export
 *
 * Server-only modules. Do NOT import in client components.
 */

// v2.0 — cities, cost, tracking, TTN
export { searchCities, searchSettlements, getCityByRef, getAllCities } from "./client";
export { calculateDelivery, getDeliveryDate, SENDER_CITY_REF } from "./client";
export { trackShipment, trackShipments } from "./client";
export { createShipment } from "./client";
export { getSenderCounterparties, getContactPersons } from "./client";
export { getStatusLabel, getConfig, isNPConfigured } from "./client";
export type { NPStage, NPSettlementAddress, NPDivision } from "./client";

// v1.0 — divisions (warehouses/poshtomats)
export { getDivisionsByCity, getDivisionsArchiveUrl, mapDivisionCategory } from "./client";

// Sync
export { syncAll, syncCities, syncWarehouses } from "./sync";
export type { SyncAllResult } from "./sync";

// Tracking cron
export { updateShipmentStatuses } from "./tracking-cron";

// Types
export type * from "./types";
