import { createHash } from "node:crypto";
import type {
  InvestmentPositionGateway,
  InvestmentPositionSummary,
} from "../application/investment-position-contracts.js";
import { SAXO_SIM_API_BASE_URL, type SaxoAccessTokenProvider } from "./index.js";

type SaxoFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

type SaxoPositionBase = {
  Amount?: unknown;
  AssetType?: unknown;
  Uic?: unknown;
};

type SaxoPositionView = {
  CurrentPrice?: unknown;
  Exposure?: unknown;
  ExposureCurrency?: unknown;
};

type SaxoPositionResponse = {
  PositionId?: unknown;
  NetPositionId?: unknown;
  PositionBase?: unknown;
  PositionView?: unknown;
};

type SaxoPositionsPage = {
  Data?: unknown;
  __next?: unknown;
};

type SaxoInstrumentDetails = {
  Uic?: unknown;
  AssetType?: unknown;
  Description?: unknown;
  Symbol?: unknown;
};

type SaxoInstrumentReference = {
  instrumentName: string;
  symbol: string;
};

type MappedSaxoPosition = {
  summary: InvestmentPositionSummary;
  instrumentKey: { uic: number; assetType: string } | null;
};

const SAXO_SIM_POSITIONS_URL = new URL(
  "port/v1/positions/me",
  `${SAXO_SIM_API_BASE_URL}/`,
);
const MAX_POSITION_PAGES = 20;
const positionLoadError = (): Error => new Error("Could not load Saxo investment positions");

const nonblankString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const finiteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const mapSaxoPosition = (value: unknown): MappedSaxoPosition => {
  if (typeof value !== "object" || value === null) {
    throw positionLoadError();
  }

  const position = value as SaxoPositionResponse;
  if (
    typeof position.PositionBase !== "object" ||
    position.PositionBase === null ||
    typeof position.PositionView !== "object" ||
    position.PositionView === null
  ) {
    throw positionLoadError();
  }

  const positionId = nonblankString(position.PositionId);
  const positionBase = position.PositionBase as SaxoPositionBase;
  const positionView = position.PositionView as SaxoPositionView;
  const assetType = nonblankString(positionBase.AssetType);
  const exposureCurrency = nonblankString(positionView.ExposureCurrency);

  if (
    !positionId ||
    !assetType ||
    !finiteNumber(positionBase.Amount) ||
    !finiteNumber(positionView.CurrentPrice) ||
    !finiteNumber(positionView.Exposure) ||
    !exposureCurrency
  ) {
    throw positionLoadError();
  }

  const uic = positionBase.Uic;
  return {
    summary: {
      id: `saxo-${createHash("sha256").update(positionId).digest("hex")}`,
      instrumentName: null,
      symbol: null,
      assetType,
      amount: positionBase.Amount,
      currentPrice: positionView.CurrentPrice,
      exposure: positionView.Exposure,
      exposureCurrency,
    },
    instrumentKey:
      typeof uic === "number" && Number.isFinite(uic) && Number.isInteger(uic) && uic > 0
        ? { uic, assetType }
        : null,
  };
};

const buildInstrumentDetailsUrl = (uic: number, assetType: string): string =>
  new URL(
    `ref/v1/instruments/details/${uic}/${encodeURIComponent(assetType)}`,
    `${SAXO_SIM_API_BASE_URL}/`,
  ).toString();

const lookupInstrumentReference = async (
  fetchRequest: SaxoFetch,
  accessToken: string,
  uic: number,
  assetType: string,
): Promise<SaxoInstrumentReference | null> => {
  try {
    const response = await fetchRequest(buildInstrumentDetailsUrl(uic, assetType), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      return null;
    }

    const details = payload as SaxoInstrumentDetails;
    const instrumentName = nonblankString(details.Description);
    const symbol = nonblankString(details.Symbol);
    if (
      !instrumentName ||
      !symbol ||
      (details.Uic !== undefined && details.Uic !== uic) ||
      (details.AssetType !== undefined && details.AssetType !== assetType)
    ) {
      return null;
    }

    return { instrumentName, symbol };
  } catch {
    return null;
  }
};

const validateNextUrl = (value: unknown, currentUrl: URL): URL | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw positionLoadError();
  }

  let nextUrl: URL;
  try {
    nextUrl = new URL(value, currentUrl);
  } catch {
    throw positionLoadError();
  }

  if (
    nextUrl.protocol !== "https:" ||
    nextUrl.origin !== SAXO_SIM_POSITIONS_URL.origin ||
    nextUrl.pathname !== SAXO_SIM_POSITIONS_URL.pathname ||
    nextUrl.username ||
    nextUrl.password ||
    nextUrl.hash ||
    [...nextUrl.searchParams.keys()].some((key) => key !== "$skip" && key !== "$top")
  ) {
    throw positionLoadError();
  }

  return nextUrl;
};

export class SaxoInvestmentPositionGateway implements InvestmentPositionGateway {
  constructor(
    private readonly accessTokenProvider: SaxoAccessTokenProvider,
    private readonly fetchRequest: SaxoFetch = globalThis.fetch,
  ) {}

  async listPositions(): Promise<InvestmentPositionSummary[]> {
    try {
      const accessToken = await this.accessTokenProvider.getAccessToken();
      const positions: MappedSaxoPosition[] = [];
      const visitedUrls = new Set<string>();
      let pageUrl: URL | null = new URL(SAXO_SIM_POSITIONS_URL);

      for (let pageNumber = 0; pageUrl && pageNumber < MAX_POSITION_PAGES; pageNumber += 1) {
        const pageUrlString = pageUrl.toString();
        if (visitedUrls.has(pageUrlString)) {
          throw positionLoadError();
        }
        visitedUrls.add(pageUrlString);

        const response = await this.fetchRequest(pageUrlString, {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken.value}` },
        });
        if (!response.ok) {
          throw positionLoadError();
        }

        const payload: unknown = await response.json();
        if (typeof payload !== "object" || payload === null) {
          throw positionLoadError();
        }

        const page = payload as SaxoPositionsPage;
        if (!Array.isArray(page.Data)) {
          throw positionLoadError();
        }

        positions.push(...page.Data.map(mapSaxoPosition));
        pageUrl = validateNextUrl(page.__next, pageUrl);
      }

      if (pageUrl !== null) {
        throw positionLoadError();
      }

      const references = new Map<string, SaxoInstrumentReference | null>();
      for (const { instrumentKey } of positions) {
        if (!instrumentKey) {
          continue;
        }

        const key = `${instrumentKey.uic}:${instrumentKey.assetType}`;
        if (!references.has(key)) {
          references.set(
            key,
            await lookupInstrumentReference(
              this.fetchRequest,
              accessToken.value,
              instrumentKey.uic,
              instrumentKey.assetType,
            ),
          );
        }
      }

      return positions.map(({ summary, instrumentKey }) => {
        if (!instrumentKey) {
          return summary;
        }

        const reference = references.get(`${instrumentKey.uic}:${instrumentKey.assetType}`);
        return reference ? { ...summary, ...reference } : summary;
      });
    } catch {
      throw positionLoadError();
    }
  }
}