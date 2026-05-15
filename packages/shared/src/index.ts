export const SERVICE_CATEGORIES = ["electricity", "water", "insurance", "lpg", "gas"] as const;
export const USER_ROLES = ["super_admin", "admin", "distributor", "retailer"] as const;
export const TRANSACTION_STATUSES = ["pending", "success", "failed", "refunded"] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export interface MoneyBreakup {
  grossCommission: number;
  tdsAmount: number;
  netCommission: number;
}
