/**
 * Nova Poshta API v2.0 — Client
 *
 * Full integration:
 * - City/warehouse/street search (checkout)
 * - Delivery cost calculation
 * - TTN creation (admin)
 * - Shipment tracking
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
} from "./types";

const API_URL = "https://api.novaposhta.ua/v2.0/json/";

// ────── Config (ENV → DB fallback) ──────

let _cachedConfig: NPConfig | null = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function getConfig(): Promise<NPConfig> {
  if (_cachedConfig && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedConfig;
  }

  // 1. ENV vars
  const envKey = process.env.NOVAPOSHTA_API_KEY;
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
    "Nova Poshta API key not configured. Add it in Admin → Integrations → Nova Poshta",
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

// ────── Core API Call ──────

async function callNP<T = unknown>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown>,
): Promise<NPResponse<T>> {
  const { apiKey } = await getConfig();

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      modelName,
      calledMethod,
      methodProperties,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Nova Poshta API HTTP ${res.status}`);
  }

  const data: NPResponse<T> = await res.json();

  if (!data.success && data.errors.length > 0) {
    console.error("[NovaPoshta] API error:", data.errors);
  }

  return data;
}

// ────── 1. City Search ──────

/**
 * Search cities by name (autocomplete).
 * Used in checkout for city selection.
 */
export async function searchCities(query: string, limit = 20): Promise<NPCity[]> {
  const res = await callNP<NPCity>("Address", "searchSettlements", {
    CityName: query,
    Limit: String(limit),
    Page: "1",
  });

  // searchSettlements returns data in nested format
  const rawData = res.data as unknown as Array<{
    Addresses: NPCity[];
    TotalCount: string;
  }>;

  if (rawData?.[0]?.Addresses) {
    return rawData[0].Addresses;
  }

  return [];
}

/**
 * Get city by Ref (for displaying saved data).
 */
export async function getCityByRef(ref: string): Promise<NPCity | null> {
  const res = await callNP<NPCity>("Address", "getCities", {
    Ref: ref,
  });
  return res.data?.[0] || null;
}

// ────── 2. Warehouse Search ──────

/**
 * Get warehouses for a city.
 * TypeOfWarehouse filters:
 * - "" = all
 * - "841339c7-591a-42e2-8571-2c4a0d683ecf" = regular warehouse (відділення)
 * - "9a68df70-0267-42a8-bb5c-37f427e36ee4" = parcel terminal (поштомат)
 * - "f9316480-5f2d-425d-bc2c-ac7cd29decf0" = cargo warehouse (вантажне)
 */
export async function getWarehouses(
  cityRef: string,
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
    CityRef: cityRef,
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

  const res = await callNP<NPWarehouse>("Address", "getWarehouses", properties);

  return {
    warehouses: res.data || [],
    total: res.info?.totalCount || 0,
  };
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

  // Same nested format as cities
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
 */
export async function calculateDelivery(params: {
  citySenderRef: string;
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
      CitySender: params.citySenderRef,
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
 * Track multiple shipments at once (batch).
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
  recipientAddressRef: string; // Warehouse Ref or address Ref
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
    redeliveryString: string; // amount
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
    // Sender
    Sender: config.senderRef,
    CitySender: "", // auto from senderAddress
    SenderAddress: config.senderAddress,
    ContactSender: config.senderContact,
    SendersPhone: config.senderPhone || "",
    // Recipient
    RecipientCityName: "",
    RecipientAddressName: "",
    RecipientName: params.recipientName,
    RecipientType: "PrivatePerson",
    RecipientsPhone: params.recipientPhone,
    RecipientAddress: params.recipientAddressRef,
    // Shipment
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

  // Add backward delivery (наложений платіж)
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

// ────── 7. Get Sender Info (for admin setup) ──────

/**
 * Get sender counterparties (to pick senderRef).
 */
export async function getSenderCounterparties(): Promise<NPCounterparty[]> {
  const res = await callNP<NPCounterparty>(
    "Counterparty",
    "getCounterparties",
    {
      CounterpartyProperty: "Sender",
      Page: "1",
    },
  );
  return res.data || [];
}

/**
 * Get contact persons for a counterparty.
 */
export async function getContactPersons(
  counterpartyRef: string,
): Promise<NPContactPerson[]> {
  const res = await callNP<NPContactPerson>(
    "Counterparty",
    "getCounterpartyContactPersons",
    {
      Ref: counterpartyRef,
      Page: "1",
    },
  );
  return res.data || [];
}

/**
 * Get sender addresses (warehouses registered to sender).
 */
export async function getSenderAddresses(
  counterpartyRef: string,
): Promise<NPWarehouse[]> {
  const res = await callNP<NPWarehouse>(
    "Counterparty",
    "getCounterpartyAddresses",
    {
      Ref: counterpartyRef,
      CounterpartyProperty: "Sender",
    },
  );
  return res.data || [];
}

// ────── Status Code Mapping ──────

/**
 * Map NP status codes to human-readable Ukrainian labels.
 */
export function getStatusLabel(statusCode: string): {
  label: string;
  emoji: string;
  stage: "created" | "in_transit" | "arrived" | "delivered" | "returned" | "problem";
} {
  const code = Number(statusCode);

  if (code === 1) return { label: "Створено", emoji: "📝", stage: "created" };
  if (code === 2) return { label: "Видалено", emoji: "🗑️", stage: "problem" };
  if (code === 3) return { label: "Не знайдено", emoji: "❓", stage: "problem" };
  if (code >= 4 && code <= 6)
    return { label: "В дорозі до міста", emoji: "🚚", stage: "in_transit" };
  if (code === 7 || code === 8)
    return { label: "Прибула у відділення", emoji: "📦", stage: "arrived" };
  if (code === 9) return { label: "Отримано", emoji: "✅", stage: "delivered" };
  if (code === 10) return { label: "Відмова", emoji: "❌", stage: "returned" };
  if (code === 11) return { label: "Відмова (в дорозі назад)", emoji: "↩️", stage: "returned" };
  if (code === 12) return { label: "Повернено відправнику", emoji: "📤", stage: "returned" };
  if (code === 14) return { label: "Змінено адресу", emoji: "📍", stage: "in_transit" };
  if (code === 101) return { label: "На шляху до одержувача", emoji: "🚚", stage: "in_transit" };
  if (code === 102) return { label: "Відмова одержувача", emoji: "❌", stage: "returned" };
  if (code === 103) return { label: "Відмова (оплачено)", emoji: "💸", stage: "returned" };
  if (code === 104) return { label: "Змінено адресу", emoji: "📍", stage: "in_transit" };
  if (code === 106)
    return { label: "Очікує відправлення", emoji: "⏳", stage: "created" };
  if (code === 111)
    return { label: "Зберігається у відділенні", emoji: "📦", stage: "arrived" };

  return { label: `Статус ${statusCode}`, emoji: "📋", stage: "in_transit" };
}

// ────── Helpers ──────

function formatNPDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}
