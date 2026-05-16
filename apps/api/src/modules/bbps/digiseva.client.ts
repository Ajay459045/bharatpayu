import { HttpService } from "@nestjs/axios";
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

@Injectable()
export class DigiSevaClient {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async categories() {
    const response = await this.providerRequest(
      this.http.get(`${this.baseUrl()}/InstantPay/BillerCategory`, {
        headers: this.getHeaders(),
      }),
    );
    return response.data;
  }

  async billers(categoryKey: string) {
    const categoryParam = this.config.get<string>(
      "DIGISEVA_BILLER_LIST_CATEGORY_PARAM",
      "categoryKey",
    );
    const response = await this.providerRequest(
      this.http.get(`${this.baseUrl()}/InstantPay/BillerList`, {
        params: { [categoryParam]: categoryKey },
        headers: this.getHeaders(),
      }),
    );
    return response.data;
  }

  async billerDetails(billerId: string) {
    const response = await this.providerRequest(
      this.http.get(`${this.baseUrl()}/InstantPay/BillerDetails`, {
        params: { billerId },
        headers: this.getHeaders(),
      }),
    );
    return response.data;
  }

  async fetchBill(payload: Record<string, unknown>) {
    const response = await this.providerRequest(
      this.http.post(`${this.baseUrl()}/InstantPay/FetchBillDetails`, payload, {
        headers: this.postHeaders(),
      }),
    );
    return response.data;
  }

  isMockMode() {
    return false;
  }

  private baseUrl() {
    return this.config.get<string>(
      "DIGISEVA_BASE_URL",
      "https://api.viabledigiseva.com/v3",
    );
  }

  private async providerRequest(request: ReturnType<HttpService["get"]>) {
    try {
      return await firstValueFrom(request);
    } catch (error: any) {
      const statusCode = error?.response?.status;
      const providerMessage =
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        error?.message ??
        "Provider request failed";
      throw new BadGatewayException({
        provider: "digiseva",
        statusCode,
        message: providerMessage,
      });
    }
  }

  private getHeaders() {
    return {
      ...this.authHeaders(),
      accept: "*/*",
    };
  }

  private postHeaders() {
    return {
      ...this.authHeaders(),
      "Content-Type": "application/json-patch+json",
      accept: "*/*",
    };
  }

  private authHeaders() {
    const apiKey = this.configValue("DIGISEVA_API_KEY", "DIGISEVA_CLIENT_ID");
    const usercode = this.configValue(
      "DIGISEVA_USERCODE",
      "DIGISEVA_POS_ID",
      "DIGISEVA_CLIENT_SECRET",
    );
    if (!apiKey || !usercode) {
      throw new BadRequestException(
        "DigiSeva API credentials are not configured",
      );
    }
    return {
      "x-api-key": apiKey,
      usercode,
      "access-mode": this.config.get<string>("DIGISEVA_ACCESS_MODE", "web"),
    };
  }

  private configValue(...keys: string[]) {
    for (const key of keys) {
      const value = this.config.get<string>(key)?.trim();
      if (
        value &&
        !["replace", "your_api_key", "your_pos_id"].includes(
          value.toLowerCase(),
        )
      ) {
        return value;
      }
    }
    return "";
  }
}
