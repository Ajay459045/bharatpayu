import { ChangePasswordPanel } from "@/components/change-password-panel";

export default function Page() {
  return (
    <ChangePasswordPanel
      backHref="/dashboard/retailer/security"
      title="Retailer password"
    />
  );
}
