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
    if (this.shouldUseMock()) {
      return {
        status: true,
        data: [
          { categoryKey: "C01", categoryName: "Electricity", billerList: 2 },
          { categoryKey: "C02", categoryName: "Water", billerList: 1 },
          { categoryKey: "C03", categoryName: "Insurance", billerList: 1 },
          { categoryKey: "C04", categoryName: "Piped Gas", billerList: 1 },
          { categoryKey: "C05", categoryName: "LPG Gas", billerList: 1 },
        ],
      };
    }
    const response = await this.providerRequest(
      this.http.get(`${this.baseUrl()}/InstantPay/BillerCategory`, {
        headers: this.getHeaders(),
      }),
    );
    return response.data;
  }

  async billers(categoryKey: string) {
    if (this.shouldUseMock()) {
      return {
        data: [
          {
            billerId: `${categoryKey}BILLER1`,
            billerName: `${categoryKey} Demo Operator`,
            categoryKey,
            type: "ONUS",
            billerStatus: "ACTIVE",
          },
        ],
      };
    }
    const response = await this.providerRequest(
      this.http.get(`${this.baseUrl()}/InstantPay/BillerList`, {
        params: { categoryKey },
        headers: this.getHeaders(),
      }),
    );
    return response.data;
  }

  async billerDetails(billerId: string) {
    if (this.shouldUseMock()) {
      return {
        parameters: [
          {
            name: "param1",
            desc: "Consumer Number",
            mandatory: 1,
            regex: "^[0-9]{4,20}$",
          },
        ],
      };
    }
    const response = await this.providerRequest(
      this.http.get(`${this.baseUrl()}/InstantPay/BillerDetails`, {
        params: { billerId },
        headers: this.getHeaders(),
      }),
    );
    return response.data;
  }

  async fetchBill(payload: Record<string, unknown>) {
    if (this.shouldUseMock()) {
      return {
        customerName: "Utility Customer",
        billAmount: 1240,
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        billNumber: `BPUBILL${Date.now()}`,
        operator: payload.billerName,
        consumerNumber:
          Object.values(
            (payload.inputParameters as Record<string, unknown>) ?? {},
          )[0] ?? "",
      };
    }
    const response = await this.providerRequest(
      this.http.post(`${this.baseUrl()}/InstantPay/FetchBillDetails`, payload, {
        headers: this.postHeaders(),
      }),
    );
    return response.data;
  }

  isMockMode() {
    return this.shouldUseMock();
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

  private shouldUseMock() {
    const mode = this.config.get<string>("DIGISEVA_MOCK", "").toLowerCase();
    if (["1", "true", "yes"].includes(mode)) return true;
    if (["0", "false", "no"].includes(mode)) return false;
    return (
      !this.configValue("DIGISEVA_API_KEY", "DIGISEVA_CLIENT_ID") ||
      !this.configValue(
        "DIGISEVA_USERCODE",
        "DIGISEVA_POS_ID",
        "DIGISEVA_CLIENT_SECRET",
      )
    );
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
