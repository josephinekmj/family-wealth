import type { InvestmentConnectionStatus } from "./client/investment-accounts.js";

export function InvestmentConnectionLabel({
  connectionStatus,
}: {
  connectionStatus: InvestmentConnectionStatus;
}) {
  return (
    <p className="connection-label">
      {connectionStatus.source === "mock"
        ? "Demo data"
        : connectionStatus.status === "connected"
          ? "Saxo SIM"
          : "Saxo SIM not connected"}
    </p>
  );
}