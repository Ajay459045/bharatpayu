import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

@Injectable()
export class DigiSevaClient {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async categories() {
    if (this.config.get("NODE_ENV") !== "production") {
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
    const response = await firstValueFrom(
      this.http.get(`${this.baseUrl()}/InstantPay/BillerCategory`, {
        headers: this.headers(),
      }),
    );
    return response.data;
  }

  async billers(categoryKey: string) {
    if (this.config.get("NODE_ENV") !== "production") {
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
    const response = await firstValueFrom(
      this.http.get(`${this.baseUrl()}/InstantPay/BillerList`, {
        params: { categoryKey },
        headers: this.headers(),
      }),
    );
    return response.data;
  }

  async billerDetails(billerId: string) {
    if (this.config.get("NODE_ENV") !== "production") {
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
    const response = await firstValueFrom(
      this.http.get(`${this.baseUrl()}/InstantPay/BillerDetails`, {
        params: { billerId },
        headers: this.headers(),
      }),
    );
    return response.data;
  }

  async fetchBill(payload: Record<string, unknown>) {
    if (this.config.get("NODE_ENV") !== "production") {
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
    const response = await firstValueFrom(
      this.http.post(`${this.baseUrl()}/InstantPay/FetchBillDetails`, payload, {
        headers: this.headers(),
      }),
    );
    return response.data;
  }

  private baseUrl() {
    return this.config.get<string>(
      "DIGISEVA_BASE_URL",
      "https://api.viabledigiseva.com/v3",
    );
  }

  private headers() {
    return {
      "x-api-key":
        this.config.get<string>("DIGISEVA_API_KEY") ??
        this.config.get<string>("DIGISEVA_CLIENT_ID") ??
        "",
      usercode:
        this.config.get<string>("DIGISEVA_USERCODE") ??
        this.config.get<string>("DIGISEVA_CLIENT_SECRET") ??
        "",
      "access-mode": this.config.get<string>("DIGISEVA_ACCESS_MODE", "web"),
      "Content-Type": "application/json-patch+json",
    };
  }
}
