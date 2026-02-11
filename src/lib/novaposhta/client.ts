/**
 * Nova Poshta — Hybrid API Client
 *
 * Server-only module. NEVER import on client side.
 *
 * TWO APIs in one file:
 * - v2.0 (POST api.novaposhta.ua/v2.0/json/) — cities, cost, tracking, TTN
 * - v1.0 (GET api.novaposhta.ua/v.1.0/...)   — divisions (warehouses/poshtomats)
 *
 * IMPORTANT: Address.getWarehouses on v2.0 is DEAD — returns 0 results.
 * Use v1.0 /divisions for warehouses instead.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  NPConfig,
  NPResponse,
  NPCity,
  NPStreet,
  NPDeliveryPrice,
  NPTrackingDocument,
  NPInternetDocument,
  NPCounterparty,
  NPContactPerson,
} from "./types";

// ════════════════════════════════════════
//  Config
// ════════════════════════════════════════

const API_V2_URL = "https://api.novaposhta.ua/v2.0/json/";
const API_V1_URL = "https://api.novaposhta.ua/v.1.0";

/** Odesa city ref — our sender city */
export const SENDER_CITY_REF = "8d5a980d-391c-11dd-90d9-001a92567626";

let _cachedConfig: NPConfig | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getConfig(): Promise<NPConfig> {
  if (_cachedConfig && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedConfig;
  }

  const envKey = process.env.NOVA_POSHTA_API_KEY || process.env.NOVAPOSHTA_API_KEY;
  if (envKey) {
    _cachedConfig = {
      apiKey: envKey,
      senderRef: process.env.NOVAPOSHTA_SENDER_REF,
      senderAddress: process.env.NOVAPOSHTA_SENDER_ADDRESS,
      senderContact: process.env.NOVAPOSHTA_SENDER_CONTACT,
      senderPhone: process.env.NOVAPOSHTA_SENDER_PHONE,
    };
    _cacheTime = Date.now();
    return _cachedConfig;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("integration_keys")
      .select("config")
      .eq("slug", "nova-poshta")
      .eq("is_active", true)
      .single();

    if (data?.config) {
      const cfg = typeof data.config === "string" ? JSON.parse(data.config) : data.config;
      if (cfg.api_key) {
        _cachedConfig = {
          apiKey: cfg.api_key,
          senderRef: cfg.sender_ref,
          senderAddress: cfg.sender_address,
          senderContact: cfg.sender_contact,
          senderPhone: cfg.sender_phone,
        };
        _cacheTime = Date.now();
        return _cachedConfig;
      }
    }
  } catch {
    // silent
  }

  throw new Error("Nova Poshta API key not configured. Set NOVA_POSHTA_API_KEY env.");
}

export async function isNPConfigured(): Promise<boolean> {
  try { await getConfig(); return true; } catch { return false; }
}

// ════════════════════════════════════════
//  v2.0 Core Call (JSON-RPC style)
// ════════════════════════════════════════

const RETRY_DELAYS = [500, 1500];

async function callNP<T = unknown>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown>,
  retries = 2,
): Promise<NPResponse<T>> {
  const { apiKey } = await getConfig();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_V2_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`NP v2 HTTP ${res.status}`);
      const data: NPResponse<T> = await res.json();
      if (!data.success && data.errors.length > 0) {
        console.error("[NP v2]", calledMethod, data.errors);
      }
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt] || 2000));
      }
    }
  }
  throw lastError || new Error("NP v2 call failed");
}

// ════════════════════════════════════════
//  v1.0 Core Call (REST style)
// ════════════════════════════════════════

async function callNPv1<T = unknown>(
  path: string,
  params: Record<string, string | string[]> = {},
  retries = 2,
): Promise<T> {
  const { apiKey } = await getConfig();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = new URL(`${API_V1_URL}${path}`);
      for (const [key, val] of Object.entries(params)) {
        if (Array.isArray(val)) {
          val.forEach((v) => url.searchParams.append(key, v));
        } else {
          url.searchParams.set(key, val);
        }
      }

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Accept-Language": "uk",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error(`NP v1 HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt] || 2000));
      }
    }
  }
  throw lastError || new Error("NP v1 call failed");
}

// ════════════════════════════════════════
//  1. Cities (v2.0 — still works)
// ════════════════════════════════════════

export interface NPSettlementAddress {
  Ref: string;
  MainDescription: string;
  Area: string;
  Region: string;
  SettlementTypeCode: string;
  DeliveryCity: string;
  Warehouses: string;
  Present: number;
  AddressDeliveryAllowed: boolean;
  StreetsAvailability: boolean;
}

/** Search settlements by name (v2.0). Returns settlement refs + delivery city refs. */
export async function searchSettlements(query: string, limit = 20): Promise<NPSettlementAddress[]> {
  const res = await callNP<{ Addresses: NPSettlementAddress[]; TotalCount: string }>(
    "Address", "searchSettlements",
    { CityName: query, Limit: String(limit), Page: "1" },
  );
  return res.data?.[0]?.Addresses || [];
}

/** Search cities by name (v2.0 getCities). Used for sync. */
export async function searchCities(query: string, limit = 20): Promise<NPCity[]> {
  const res = await callNP<NPCity>("Address", "getCities", {
    FindByString: query, Limit: String(limit), Page: "1",
  });
  return res.data || [];
}

/** Get city by Ref. */
export async function getCityByRef(ref: string): Promise<NPCity | null> {
  const res = await callNP<NPCity>("Address", "getCities", { Ref: ref });
  return res.data?.[0] || null;
}

/** Download ALL cities (v2.0, paginated). For sync. */
export async function getAllCities(): Promise<NPCity[]> {
  const all: NPCity[] = [];
  let page = 1;
  while (true) {
    const res = await callNP<NPCity>("Address", "getCities", { Page: String(page), Limit: "500" });
    if (!res.data || res.data.length === 0) break;
    all.push(...res.data);
    if (res.data.length < 500) break;
    page++;
    if (page > 20) break;
  }
  return all;
}

// ════════════════════════════════════════
//  2. Divisions / Warehouses (v1.0 — new API!)
// ════════════════════════════════════════

/** Division from v1.0 /divisions endpoint */
export interface NPDivision {
  id: number;
  name: string;
  shortName: string;
  number: string;
  countryCode: string;
  settlement: {
    id: number;
    name: string;
    region: {
      id: number;
      name: string;
      parent?: { id: number; name: string };
    };
  };
  address: string;
  status: string;
  divisionCategory: "PostBranch" | "Postomat" | "CargoBranch" | "PUDO";
  latitude: number;
  longitude: number;
  workSchedule: Array<{ day: string; from: string; to: string }>;
}

const CATEGORY_MAP: Record<string, string> = {
  PostBranch: "branch",
  Postomat: "postomat",
  CargoBranch: "cargo",
  PUDO: "pudo",
};

/**
 * Get divisions (warehouses/poshtomats) for a city via v1.0 API.
 * @param cityName — city name in Ukrainian (e.g. "Одеса")
 * @param category — "PostBranch" | "Postomat" | "CargoBranch" | null for all
 * @param limit — max results per page
 * @param page — page number
 */
export async function getDivisionsByCity(
  cityName: string,
  category?: string | null,
  limit = 200,
  page = 1,
): Promise<NPDivision[]> {
  const params: Record<string, string | string[]> = {
    "countryCodes[]": "UA",
    name: cityName,
    limit: String(limit),
    page: String(page),
  };

  if (category) {
    params["divisionCategories[]"] = category;
  }

  return callNPv1<NPDivision[]>("/divisions", params);
}

/**
 * Get ALL divisions archive URL (no auth needed).
 * Returns the URL of the base.json.gz file.
 */
export async function getDivisionsArchiveUrl(): Promise<string> {
  const res = await fetch("https://api.novapost.com/divisions/versions", {
    headers: { "Accept-Language": "uk" },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Divisions archive HTTP ${res.status}`);
  const data = await res.json();
  return data.base_version?.url;
}

/** Map divisionCategory to our category string */
export function mapDivisionCategory(divCat: string): string {
  return CATEGORY_MAP[divCat] || "branch";
}

// ════════════════════════════════════════
//  3. Street Search (v2.0)
// ════════════════════════════════════════

export async function searchStreets(cityRef: string, query: string, limit = 20): Promise<NPStreet[]> {
  const res = await callNP<NPStreet>("Address", "searchSettlementStreets", {
    StreetName: query, SettlementRef: cityRef, Limit: String(limit),
  });
  const rawData = res.data as unknown as Array<{ Addresses: NPStreet[]; TotalCount: string }>;
  return rawData?.[0]?.Addresses || [];
}

// ════════════════════════════════════════
//  4. Delivery Cost (v2.0)
// ════════════════════════════════════════

export async function calculateDelivery(params: {
  citySenderRef?: string;
  cityRecipientRef: string;
  weight: number;
  cost: number;
  serviceType: "WarehouseWarehouse" | "WarehouseDoors" | "DoorsWarehouse" | "DoorsDoors";
  seatsAmount?: number;
  cargoType?: "Cargo" | "Documents" | "TiresWheels" | "Pallet";
}): Promise<NPDeliveryPrice | null> {
  const res = await callNP<NPDeliveryPrice>("InternetDocument", "getDocumentPrice", {
    CitySender: params.citySenderRef || SENDER_CITY_REF,
    CityRecipient: params.cityRecipientRef,
    Weight: String(params.weight),
    ServiceType: params.serviceType,
    Cost: String(params.cost),
    CargoType: params.cargoType || "Cargo",
    SeatsAmount: String(params.seatsAmount || 1),
  });
  return res.data?.[0] || null;
}

export async function getDeliveryDate(
  citySenderRef: string,
  cityRecipientRef: string,
  serviceType = "WarehouseWarehouse",
): Promise<string | null> {
  const res = await callNP<{ DeliveryDate: { date: string } }>(
    "InternetDocument", "getDocumentDeliveryDate",
    {
      CitySender: citySenderRef || SENDER_CITY_REF,
      CityRecipient: cityRecipientRef,
      ServiceType: serviceType,
      DateTime: formatNPDate(new Date()),
    },
  );
  const item = res.data?.[0];
  return item?.DeliveryDate?.date?.slice(0, 10) || null;
}

// ════════════════════════════════════════
//  5. Tracking (v2.0)
// ════════════════════════════════════════

export async function trackShipment(ttn: string): Promise<NPTrackingDocument | null> {
  const res = await callNP<NPTrackingDocument>("TrackingDocument", "getStatusDocuments", {
    Documents: [{ DocumentNumber: ttn, Phone: "" }],
  });
  return res.data?.[0] || null;
}

export async function trackShipments(ttns: string[]): Promise<NPTrackingDocument[]> {
  const res = await callNP<NPTrackingDocument>("TrackingDocument", "getStatusDocuments", {
    Documents: ttns.map((ttn) => ({ DocumentNumber: ttn, Phone: "" })),
  });
  return res.data || [];
}

// ════════════════════════════════════════
//  6. Create TTN (v2.0)
// ════════════════════════════════════════

export async function createShipment(params: {
  recipientName: string;
  recipientPhone: string;
  recipientCityRef: string;
  recipientAddressRef: string;
  serviceType: "WarehouseWarehouse" | "WarehouseDoors";
  weight: number;
  cost: number;
  description: string;
  seatsAmount?: number;
  payerType?: "Sender" | "Recipient" | "ThirdPerson";
  paymentMethod?: "Cash" | "NonCash";
  cargoType?: "Cargo" | "Documents" | "TiresWheels" | "Pallet";
  backwardDelivery?: { payerType: "Sender" | "Recipient"; cargoType: "Money"; redeliveryString: string };
  volumeWeight?: number;
}): Promise<NPInternetDocument | null> {
  const config = await getConfig();
  if (!config.senderRef || !config.senderAddress || !config.senderContact) {
    throw new Error("Nova Poshta sender not configured.");
  }

  const properties: Record<string, unknown> = {
    Sender: config.senderRef,
    CitySender: "",
    SenderAddress: config.senderAddress,
    ContactSender: config.senderContact,
    SendersPhone: config.senderPhone || "",
    RecipientName: params.recipientName,
    RecipientType: "PrivatePerson",
    RecipientsPhone: params.recipientPhone,
    RecipientAddress: params.recipientAddressRef,
    ServiceType: params.serviceType,
    Weight: String(params.weight),
    Cost: String(params.cost),
    Description: params.description,
    CargoType: params.cargoType || "Cargo",
    SeatsAmount: String(params.seatsAmount || 1),
    PayerType: params.payerType || "Recipient",
    PaymentMethod: params.paymentMethod || "Cash",
    DateTime: formatNPDate(new Date()),
  };
  if (params.backwardDelivery) {
    properties.BackwardDeliveryData = [{
      PayerType: params.backwardDelivery.payerType,
      CargoType: params.backwardDelivery.cargoType,
      RedeliveryString: params.backwardDelivery.redeliveryString,
    }];
  }
  if (params.volumeWeight) properties.VolumeGeneral = String(params.volumeWeight);

  const res = await callNP<NPInternetDocument>("InternetDocument", "save", properties);
  return res.data?.[0] || null;
}

// ════════════════════════════════════════
//  7. Sender Info (admin)
// ════════════════════════════════════════

export async function getSenderCounterparties(): Promise<NPCounterparty[]> {
  const res = await callNP<NPCounterparty>("Counterparty", "getCounterparties", { CounterpartyProperty: "Sender", Page: "1" });
  return res.data || [];
}

export async function getContactPersons(counterpartyRef: string): Promise<NPContactPerson[]> {
  const res = await callNP<NPContactPerson>("Counterparty", "getCounterpartyContactPersons", { Ref: counterpartyRef, Page: "1" });
  return res.data || [];
}

// ════════════════════════════════════════
//  Status Code Mapping
// ════════════════════════════════════════

export type NPStage = "created" | "in_transit" | "arrived" | "delivered" | "returned" | "problem";

export function getStatusLabel(statusCode: string): { label: string; emoji: string; stage: NPStage; isFinal: boolean } {
  const code = Number(statusCode);
  if (code === 1) return { label: "Створено", emoji: "📝", stage: "created", isFinal: false };
  if (code === 2) return { label: "Видалено", emoji: "🗑️", stage: "problem", isFinal: true };
  if (code === 3) return { label: "Не знайдено", emoji: "❓", stage: "problem", isFinal: false };
  if (code === 4) return { label: "В місті відправника", emoji: "📦", stage: "in_transit", isFinal: false };
  if (code === 5) return { label: "В дорозі", emoji: "🚚", stage: "in_transit", isFinal: false };
  if (code === 6) return { label: "В місті отримувача", emoji: "🏙️", stage: "in_transit", isFinal: false };
  if (code === 7 || code === 101) return { label: "На відділенні", emoji: "📦", stage: "arrived", isFinal: false };
  if (code === 9) return { label: "Отримано", emoji: "✅", stage: "delivered", isFinal: true };
  if (code === 10 || code === 11) return { label: "Повертається", emoji: "↩️", stage: "returned", isFinal: false };
  if (code === 12 || code === 102 || code === 108) return { label: "Повернено", emoji: "📤", stage: "returned", isFinal: true };
  if (code === 103) return { label: "Відмова", emoji: "❌", stage: "returned", isFinal: true };
  return { label: `Статус ${statusCode}`, emoji: "📋", stage: "in_transit", isFinal: false };
}

// ════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════

function formatNPDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}.${m}.${date.getFullYear()}`;
}
