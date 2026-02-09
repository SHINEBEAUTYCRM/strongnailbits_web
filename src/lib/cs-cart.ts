import type {
  CSCartProduct,
  CSCartCategory,
  CSCartOrder,
  CSCartUser,
  CSCartFeature,
  CSCartFeatureVariant,
  CSCartApiResponse,
} from "@/types/cs-cart";

/* ------------------------------------------------------------------ */
/*  CS-Cart REST API Client                                            */
/* ------------------------------------------------------------------ */

class CSCartClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor() {
    const apiUrl = process.env.CS_CART_API_URL;
    const email = process.env.CS_CART_API_EMAIL;
    const apiKey = process.env.CS_CART_API_KEY;

    if (!apiUrl || !email || !apiKey) {
      throw new Error(
        "Missing CS_CART_API_URL, CS_CART_API_EMAIL, or CS_CART_API_KEY env variables",
      );
    }

    this.baseUrl = apiUrl.replace(/\/+$/, "");
    this.authHeader = `Basic ${Buffer.from(`${email}:${apiKey}`).toString("base64")}`;
  }

  /* ---- Приватний fetch з Basic Auth ---- */

  private async fetch<T>(
    endpoint: string,
    params?: Record<string, string | number>,
    options?: RequestInit,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\/+/, "")}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `CS-Cart API error [${response.status}]: ${response.statusText} — ${errorText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  /* ---- Products ---- */

  async getProducts(
    page = 1,
    itemsPerPage = 50,
    extraParams?: Record<string, string | number>,
  ): Promise<CSCartApiResponse<CSCartProduct>> {
    return this.fetch<CSCartApiResponse<CSCartProduct>>("products", {
      page,
      items_per_page: itemsPerPage,
      ...extraParams,
    });
  }

  async getProduct(id: number): Promise<CSCartProduct> {
    return this.fetch<CSCartProduct>(`products/${id}`);
  }

  /* ---- Categories ---- */

  async getCategories(
    page = 1,
    itemsPerPage = 50,
    extraParams?: Record<string, string | number>,
  ): Promise<CSCartApiResponse<CSCartCategory>> {
    return this.fetch<CSCartApiResponse<CSCartCategory>>("categories", {
      page,
      items_per_page: itemsPerPage,
      ...extraParams,
    });
  }

  async getCategory(id: number): Promise<CSCartCategory> {
    return this.fetch<CSCartCategory>(`categories/${id}`);
  }

  /* ---- Orders ---- */

  async getOrders(
    page = 1,
    itemsPerPage = 50,
  ): Promise<CSCartApiResponse<CSCartOrder>> {
    return this.fetch<CSCartApiResponse<CSCartOrder>>("orders", {
      page,
      items_per_page: itemsPerPage,
    });
  }

  async getOrder(id: number): Promise<CSCartOrder> {
    return this.fetch<CSCartOrder>(`orders/${id}`);
  }

  /* ---- Users ---- */

  async getUsers(
    page = 1,
    itemsPerPage = 50,
  ): Promise<CSCartApiResponse<CSCartUser>> {
    return this.fetch<CSCartApiResponse<CSCartUser>>("users", {
      page,
      items_per_page: itemsPerPage,
    });
  }

  async getUser(id: number): Promise<CSCartUser> {
    return this.fetch<CSCartUser>(`users/${id}`);
  }

  /* ---- Features (характеристики / бренди) ---- */

  async getFeatures(
    page = 1,
    itemsPerPage = 50,
    extraParams?: Record<string, string | number>,
  ): Promise<CSCartApiResponse<CSCartFeature>> {
    return this.fetch<CSCartApiResponse<CSCartFeature>>("features", {
      page,
      items_per_page: itemsPerPage,
      ...extraParams,
    });
  }

  async getFeature(id: number): Promise<CSCartFeature> {
    return this.fetch<CSCartFeature>(`features/${id}`);
  }

  async getFeatureVariants(
    featureId: number,
    page = 1,
    itemsPerPage = 50,
  ): Promise<CSCartApiResponse<CSCartFeatureVariant>> {
    return this.fetch<CSCartApiResponse<CSCartFeatureVariant>>(
      `features/${featureId}/variants`,
      { page, items_per_page: itemsPerPage },
    );
  }

  /* ---- Order Status Update ---- */

  async updateOrderStatus(
    id: number,
    status: string,
  ): Promise<CSCartOrder> {
    return this.fetch<CSCartOrder>(`orders/${id}`, undefined, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }
}

/* ---- Singleton ---- */

export const csCart = new CSCartClient();
