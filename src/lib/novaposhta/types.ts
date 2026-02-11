/**
 * Nova Poshta API v2.0 — TypeScript types
 */

// ────── API Request / Response ──────

export interface NPRequest {
  apiKey: string;
  modelName: string;
  calledMethod: string;
  methodProperties: Record<string, unknown>;
}

export interface NPResponse<T = unknown> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
  info: {
    totalCount: number;
  };
}

// ────── City ──────

export interface NPCity {
  Ref: string;
  Description: string;
  DescriptionRu: string;
  SettlementType: string;
  SettlementTypeDescription: string;
  Area: string;
  AreaDescription: string;
  Region: string;
  RegionsDescription: string;
}

// ────── Warehouse ──────

export interface NPWarehouse {
  Ref: string;
  SiteKey: string;
  Description: string;
  DescriptionRu: string;
  Number: string;
  CityRef: string;
  CityDescription: string;
  TypeOfWarehouse: string;
  ShortAddress: string;
  ShortAddressRu: string;
  Phone: string;
  Schedule: {
    Monday: string;
    Tuesday: string;
    Wednesday: string;
    Thursday: string;
    Friday: string;
    Saturday: string;
    Sunday: string;
  };
  PlaceMaxWeightAllowed: number;
  TotalMaxWeightAllowed: number;
  WarehouseStatus: string;
  CategoryOfWarehouse: string;
}

// ────── Street ──────

export interface NPStreet {
  Ref: string;
  Description: string;
  StreetsType: string;
  StreetsTypeDescription: string;
}

// ────── Delivery Price ──────

export interface NPDeliveryPrice {
  AssessedCost: number;
  Cost: number;
  CostRedelivery: number;
  EstimatedDeliveryDate: string;
  CostPack: number;
}

// ────── Tracking ──────

export interface NPTrackingDocument {
  Number: string;
  StatusCode: string;
  Status: string;
  WarehouseSender: string;
  WarehouseRecipient: string;
  CityRecipient: string;
  CityRecipientDescription: string;
  RecipientFullName: string;
  ScheduledDeliveryDate: string;
  ActualDeliveryDate: string;
  DateCreated: string;
  DocumentWeight: number;
  DocumentCost: string;
  AnnouncedPrice: string;
  PayerType: string;
  PaymentMethod: string;
  RefusedReason: string;
  ExpressWaybillPaymentStatus: string;
}

// ────── Internet Document (TTN) ──────

export interface NPInternetDocument {
  Ref: string;
  CostOnSite: number;
  EstimatedDeliveryDate: string;
  IntDocNumber: string;
  TypeDocument: string;
}

// ────── Sender / Recipient for TTN ──────

export interface NPCounterparty {
  Ref: string;
  Description: string;
  City: string;
  FirstName: string;
  LastName: string;
  MiddleName: string;
  Phone: string;
}

export interface NPContactPerson {
  Ref: string;
  Description: string;
  FirstName: string;
  LastName: string;
  MiddleName: string;
  Phones: string;
}

// ────── Config ──────

export interface NPConfig {
  apiKey: string;
  senderRef?: string;        // Counterparty Ref відправника
  senderAddress?: string;    // Warehouse Ref адреси відправника
  senderContact?: string;    // ContactPerson Ref
  senderPhone?: string;      // Телефон відправника
}
