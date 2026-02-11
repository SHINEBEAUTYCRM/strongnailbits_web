/**
 * Nova Poshta API v2.0 — Client
 *
 * Server-only module. NEVER import on client side.
 *
 * Features:
 * - City/warehouse/street search (checkout)
 * - Full data download for Supabase sync (getAllCities, getAllWarehouses)
 * - Delivery cost calculation
 * - TTN creation (admin)
 * - Shipment tracking
 * - Retry with exponential backoff
 *
 * Docs: https://developers.novaposhta.ua/documentation
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  NPConfig,
  NPResponse,
  NPCity,
  NPWarehouse,
  NPStreet,
  NPDeliveryPrice,
  NPTrackingDocument,
  NPInternetDocument,
  NPCounterparty,
  NPContactPerson,
  NPWarehouseType,
} from "./types";

const API_URL = "https://api.novaposhta.ua/v2.0/json/";

/** Odesa city ref — our sender city (static) */
export const SENDER_CITY_REF = "db5c88e0-391a-11dd-90d9-001a92567626";

// ────── Config (ENV → DB fallback) ──────

let _cachedConfig: NPConfig | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function getConfig(): Promise<NPConfig> {
  if (_cachedConfig && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedConfig;
  }

  // 1. ENV vars (support both naming conventions)
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

  // 2. DB fallback (integration_keys)
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("integration_keys")
      .select("config")
      .eq("slug", "nova-poshta")
      .eq("is_active", true)
      .single();

    if (data?.config) {
      const cfg =
        typeof data.config === "string" ? JSON.parse(data.config) : data.config;
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

  throw new Error(
    "Nova Poshta API key not configured. Set NOVA_POSHTA_API_KEY env or add in Admin → Integrations.",
  );
}

/** Check if NP is configured (non-throwing) */
export async function isNPConfigured(): Promise<boolean> {
  try {
    await getConfig();
    return true;
  } catch {
    return false;
  }
}

// ────── Core API Call with Retry ──────

const RETRY_DELAYS = [500, 1500]; // exponential backoff

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
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          modelName,
          calledMethod,
          methodProperties,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`Nova Poshta API HTTP ${res.status}`);
      }

      const data: NPResponse<T> = await res.json();

      if (!data.success && data.errors.length > 0) {
        console.error("[NovaPoshta] API error:", data.errors);
      }

      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on last attempt
      if (attempt < retries) {
        const delay = RETRY_DELAYS[attempt] || 2000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error("Nova Poshta API call failed");
}

// ────── 1. Settlement Search (for checkout) ──────

/**
 * Settlement address returned by searchSettlements API.
 * The Ref here is a SETTLEMENT ref (needed for getWarehouses).
 * DeliveryCity is the CITY ref from getCities (used for delivery calculations).
 */
export interface NPSettlementAddress {
  Ref: string;              // Settlement ref (use as SettlementRef in getWarehouses!)
  MainDescription: string;  // City/settlement name in current language
  Area: string;             // Oblast name
  Region: string;           // Raion name
  SettlementTypeCode: string; // "м.", "смт.", "с." etc.
  DeliveryCity: string;     // City ref from getCities (for calculateDelivery)
  Warehouses: string;       // Number of warehouses in this settlement
  Present: number;          // 1 = has delivery
  AddressDeliveryAllowed: boolean;
  StreetsAvailability: boolean;
}

/**
 * Search settlements by name. Returns SETTLEMENT refs (not city refs!).
 * Use settlement Ref for getWarehouses (SettlementRef parameter).
 * Use DeliveryCity ref for calculateDelivery (CitySender/CityRecipient).
 */
export async function searchSettlements(query: string, limit = 20): Promise<NPSettlementAddress[]> {
  const res = await callNP<{ Addresses: NPSettlementAddress[]; TotalCount: string }>(
    "Address",
    "searchSettlements",
    {
      CityName: query,
      Limit: String(limit),
      Page: "1",
    },
  );

  // searchSettlements wraps results in Addresses array
  const rawData = res.data;
  if (rawData?.[0]?.Addresses) {
    return rawData[0].Addresses;
  }
  return [];
}

/**
 * Legacy: Search cities by name (getCities). Used for sync.
 */
export async function searchCities(query: string, limit = 20): Promise<NPCity[]> {
  const res = await callNP<NPCity>("Address", "getCities", {
    FindByString: query,
    Limit: String(limit),
    Page: "1",
  });
  return res.data || [];
}

/**
 * Get city by Ref (for displaying saved data).
 */
export async function getCityByRef(ref: string): Promise<NPCity | null> {
  const res = await callNP<NPCity>("Address", "getCities", { Ref: ref });
  return res.data?.[0] || null;
}

// ────── 1b. ALL Cities (for sync) ──────

/**
 * Download ALL cities from NP API. Paginated by 500.
 * Used by sync engine to populate np_cities table.
 * Returns ~1 100 cities.
 */
export async function getAllCities(): Promise<NPCity[]> {
  const allCities: NPCity[] = [];
  let page = 1;

  while (true) {
    const res = await callNP<NPCity>("Address", "getCities", {
      Page: String(page),
      Limit: "500",
    });

    if (!res.data || res.data.length === 0) break;

    allCities.push(...res.data);

    // If we got less than 500, that's the last page
    if (res.data.length < 500) break;

    page++;

    // Safety limit
    if (page > 20) break;
  }

  return allCities;
}

// ────── 2. Warehouse Search (single city) ──────

/**
 * Get warehouses for a settlement. Used as fallback if Supabase has no data.
 *
 * IMPORTANT: `settlementRef` must be from searchSettlements (not getCities!).
 * The NP API getWarehouses uses SettlementRef, not CityRef.
 */
export async function getWarehouses(
  settlementRef: string,
  opts?: {
    search?: string;
    type?: "warehouse" | "parcel" | "cargo" | "";
    limit?: number;
    page?: number;
  },
): Promise<{ warehouses: NPWarehouse[]; total: number }> {
  const typeMap: Record<string, string> = {
    warehouse: "841339c7-591a-42e2-8571-2c4a0d683ecf",
    parcel: "9a68df70-0267-42a8-bb5c-37f427e36ee4",
    cargo: "f9316480-5f2d-425d-bc2c-ac7cd29decf0",
    "": "",
  };

  const properties: Record<string, unknown> = {
    SettlementRef: settlementRef,
    Page: String(opts?.page || 1),
    Limit: String(opts?.limit || 50),
    Language: "UA",
  };

  if (opts?.search) {
    properties.FindByString = opts.search;
  }

  if (opts?.type && typeMap[opts.type]) {
    properties.TypeOfWarehouseRef = typeMap[opts.type];
  }

  // Try AddressGeneral first (used by NP widgets), fallback to Address
  let res = await callNP<NPWarehouse>("AddressGeneral", "getWarehouses", properties);

  if ((!res.data || res.data.length === 0) && res.success) {
    // Try with CityRef instead of SettlementRef
    const props2 = { ...properties };
    delete props2.SettlementRef;
    props2.CityRef = settlementRef;
    res = await callNP<NPWarehouse>("AddressGeneral", "getWarehouses", props2);
  }

  if ((!res.data || res.data.length === 0) && res.success) {
    // Last fallback: Address model
    res = await callNP<NPWarehouse>("Address", "getWarehouses", properties);
  }

  return {
    warehouses: res.data || [],
    total: res.info?.totalCount || 0,
  };
}

// ────── 2b. ALL Warehouses (for sync) ──────

/**
 * Download ALL warehouses from NP API. Paginated by 500.
 * Used by sync engine. Returns ~25 000 records.
 * Can take 30-60 seconds.
 */
export async function getAllWarehouses(): Promise<NPWarehouse[]> {
  const allWarehouses: NPWarehouse[] = [];
  let page = 1;

  while (true) {
    const res = await callNP<NPWarehouse>("Address", "getWarehouses", {
      Page: String(page),
      Limit: "500",
      Language: "UA",
    });

    if (!res.data || res.data.length === 0) break;

    allWarehouses.push(...res.data);

    if (res.data.length < 500) break;

    page++;

    // Safety: NP has ~25k warehouses = ~50 pages max
    if (page > 200) break;
  }

  return allWarehouses;
}

// ────── 2c. Warehouse Types ──────

/**
 * Get warehouse type definitions (branch, postomat, cargo).
 */
export async function getWarehouseTypes(): Promise<NPWarehouseType[]> {
  const res = await callNP<NPWarehouseType>(
    "Address",
    "getWarehouseTypes",
    {},
  );
  return res.data || [];
}

// ────── 3. Street Search ──────

/**
 * Search streets in a city (for address delivery).
 */
export async function searchStreets(
  cityRef: string,
  query: string,
  limit = 20,
): Promise<NPStreet[]> {
  const res = await callNP<NPStreet>("Address", "searchSettlementStreets", {
    StreetName: query,
    SettlementRef: cityRef,
    Limit: String(limit),
  });

  const rawData = res.data as unknown as Array<{
    Addresses: NPStreet[];
    TotalCount: string;
  }>;

  if (rawData?.[0]?.Addresses) {
    return rawData[0].Addresses;
  }

  return [];
}

// ────── 4. Delivery Price Calculation ──────

/**
 * Calculate delivery cost and estimated date.
 * citySenderRef defaults to Odesa.
 */
export async function calculateDelivery(params: {
  citySenderRef?: string;
  cityRecipientRef: string;
  weight: number;
  cost: number;
  serviceType: "WarehouseWarehouse" | "WarehouseDoors" | "DoorsWarehouse" | "DoorsDoors";
  seatsAmount?: number;
  cargoType?: "Cargo" | "Documents" | "TiresWheels" | "Pallet";
}): Promise<NPDeliveryPrice | null> {
  const res = await callNP<NPDeliveryPrice>(
    "InternetDocument",
    "getDocumentPrice",
    {
      CitySender: params.citySenderRef || SENDER_CITY_REF,
      CityRecipient: params.cityRecipientRef,
      Weight: String(params.weight),
      ServiceType: params.serviceType,
      Cost: String(params.cost),
      CargoType: params.cargoType || "Cargo",
      SeatsAmount: String(params.seatsAmount || 1),
    },
  );

  return res.data?.[0] || null;
}

/**
 * Get estimated delivery date.
 */
export async function getDeliveryDate(
  citySenderRef: string,
  cityRecipientRef: string,
  serviceType = "WarehouseWarehouse",
): Promise<string | null> {
  const res = await callNP<{ DeliveryDate: { date: string } }>(
    "InternetDocument",
    "getDocumentDeliveryDate",
    {
      CitySender: citySenderRef || SENDER_CITY_REF,
      CityRecipient: cityRecipientRef,
      ServiceType: serviceType,
      DateTime: formatNPDate(new Date()),
    },
  );

  const item = res.data?.[0];
  if (item?.DeliveryDate?.date) {
    return item.DeliveryDate.date.slice(0, 10); // "2026-02-14"
  }
  return null;
}

// ────── 5. Tracking ──────

/**
 * Track a shipment by TTN number.
 */
export async function trackShipment(
  ttn: string,
): Promise<NPTrackingDocument | null> {
  const res = await callNP<NPTrackingDocument>(
    "TrackingDocument",
    "getStatusDocuments",
    {
      Documents: [{ DocumentNumber: ttn, Phone: "" }],
    },
  );
  return res.data?.[0] || null;
}

/**
 * Track multiple shipments at once (batch, up to 100).
 */
export async function trackShipments(
  ttns: string[],
): Promise<NPTrackingDocument[]> {
  const res = await callNP<NPTrackingDocument>(
    "TrackingDocument",
    "getStatusDocuments",
    {
      Documents: ttns.map((ttn) => ({ DocumentNumber: ttn, Phone: "" })),
    },
  );
  return res.data || [];
}

// ────── 6. Create TTN (Internet Document) ──────

/**
 * Create a shipment and get TTN number.
 * Requires sender config (senderRef, senderAddress, senderContact).
 */
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
  backwardDelivery?: {
    payerType: "Sender" | "Recipient";
    cargoType: "Money";
    redeliveryString: string;
  };
  volumeWeight?: number;
}): Promise<NPInternetDocument | null> {
  const config = await getConfig();

  if (!config.senderRef || !config.senderAddress || !config.senderContact) {
    throw new Error(
      "Nova Poshta sender not configured. Add senderRef, senderAddress, senderContact in settings.",
    );
  }

  const properties: Record<string, unknown> = {
    Sender: config.senderRef,
    CitySender: "",
    SenderAddress: config.senderAddress,
    ContactSender: config.senderContact,
    SendersPhone: config.senderPhone || "",
    RecipientCityName: "",
    RecipientAddressName: "",
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
    properties.BackwardDeliveryData = [
      {
        PayerType: params.backwardDelivery.payerType,
        CargoType: params.backwardDelivery.cargoType,
        RedeliveryString: params.backwardDelivery.redeliveryString,
      },
    ];
  }

  if (params.volumeWeight) {
    properties.VolumeGeneral = String(params.volumeWeight);
  }

  const res = await callNP<NPInternetDocument>(
    "InternetDocument",
    "save",
    properties,
  );

  return res.data?.[0] || null;
}

// ────── 7. Sender Info (admin setup) ──────

export async function getSenderCounterparties(): Promise<NPCounterparty[]> {
  const res = await callNP<NPCounterparty>("Counterparty", "getCounterparties", {
    CounterpartyProperty: "Sender",
    Page: "1",
  });
  return res.data || [];
}

export async function getContactPersons(counterpartyRef: string): Promise<NPContactPerson[]> {
  const res = await callNP<NPContactPerson>("Counterparty", "getCounterpartyContactPersons", {
    Ref: counterpartyRef,
    Page: "1",
  });
  return res.data || [];
}

export async function getSenderAddresses(counterpartyRef: string): Promise<NPWarehouse[]> {
  const res = await callNP<NPWarehouse>("Counterparty", "getCounterpartyAddresses", {
    Ref: counterpartyRef,
    CounterpartyProperty: "Sender",
  });
  return res.data || [];
}

// ────── Status Code Mapping ──────

export type NPStage = "created" | "in_transit" | "arrived" | "delivered" | "returned" | "problem";

export function getStatusLabel(statusCode: string): {
  label: string;
  emoji: string;
  stage: NPStage;
  isFinal: boolean;
} {
  const code = Number(statusCode);

  if (code === 1) return { label: "Створено", emoji: "📝", stage: "created", isFinal: false };
  if (code === 2) return { label: "Видалено", emoji: "🗑️", stage: "problem", isFinal: true };
  if (code === 3) return { label: "Не знайдено", emoji: "❓", stage: "problem", isFinal: false };
  if (code === 4) return { label: "В місті відправника", emoji: "📦", stage: "in_transit", isFinal: false };
  if (code === 5) return { label: "В дорозі", emoji: "🚚", stage: "in_transit", isFinal: false };
  if (code === 6) return { label: "В місті отримувача", emoji: "🏙️", stage: "in_transit", isFinal: false };
  if (code === 7 || code === 101) return { label: "На відділенні", emoji: "📦", stage: "arrived", isFinal: false };
  if (code === 8) return { label: "Прибула у відділення", emoji: "📦", stage: "arrived", isFinal: false };
  if (code === 9) return { label: "Отримано", emoji: "✅", stage: "delivered", isFinal: true };
  if (code === 10 || code === 11) return { label: "Повертається", emoji: "↩️", stage: "returned", isFinal: false };
  if (code === 12 || code === 102 || code === 108) return { label: "Повернено", emoji: "📤", stage: "returned", isFinal: true };
  if (code === 14 || code === 104) return { label: "Змінено адресу", emoji: "📍", stage: "in_transit", isFinal: false };
  if (code === 103) return { label: "Відмова", emoji: "❌", stage: "returned", isFinal: true };
  if (code === 106) return { label: "Очікує відправлення", emoji: "⏳", stage: "created", isFinal: false };
  if (code === 111) return { label: "Зберігається", emoji: "📦", stage: "arrived", isFinal: false };

  return { label: `Статус ${statusCode}`, emoji: "📋", stage: "in_transit", isFinal: false };
}

// ────── Helpers ──────

function formatNPDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}
