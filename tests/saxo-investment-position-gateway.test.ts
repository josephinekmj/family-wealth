import { describe, expect, it, vi } from "vitest";
import type { SaxoAccessTokenProvider } from "../src/saxo/index.js";
import { SaxoInvestmentPositionGateway } from "../src/saxo/saxo-investment-position-gateway.js";

const positionsUrl = "https://gateway.saxobank.com/sim/openapi/port/v1/positions/me";

const accessTokenProvider = (value = "test-access-token") => {
  const getAccessToken = vi.fn(async () => ({ value, expiresAt: null }));
  return {
    provider: { getAccessToken } satisfies SaxoAccessTokenProvider,
    getAccessToken,
  };
};

const position = (overrides: Record<string, unknown> = {}) => ({
  PositionId: "position-id-1",
  NetPositionId: "net-position-id-1",
  PositionBase: { Amount: 10, AssetType: "Stock", Uic: 12345 },
  PositionView: { CurrentPrice: 100, Exposure: 1_000, ExposureCurrency: "DKK" },
  ...overrides,
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("SaxoInvestmentPositionGateway", () => {
  it("requests the exact SIM positions endpoint once with one Bearer token", async () => {
    const { provider, getAccessToken } = accessTokenProvider();
    const fetchRequest = vi.fn<
      (input: string | URL, init?: RequestInit) => Promise<Response>
    >(async () => jsonResponse({ Data: [] }));
    const gateway = new SaxoInvestmentPositionGateway(provider, fetchRequest);

    await gateway.listPositions();

    expect(getAccessToken).toHaveBeenCalledOnce();
    expect(fetchRequest).toHaveBeenCalledOnce();
    const [url, init] = fetchRequest.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(url).toBe(positionsUrl);
    expect(new URL(url).search).toBe("");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(headers.get("Authorization")).toBe("Bearer test-access-token");
    expect(headers.get("Authorization")).not.toContain("Basic");
  });

  it("maps multiple positions to exactly the provider-neutral fields", async () => {
    const { provider } = accessTokenProvider();
    const gateway = new SaxoInvestmentPositionGateway(provider, async () =>
      jsonResponse({
        Data: [
          position(),
          position({
            PositionId: "position-id-2",
            PositionBase: { Amount: -2, AssetType: "Bond", Uic: 67890 },
            PositionView: { CurrentPrice: 0, Exposure: -50, ExposureCurrency: "EUR" },
            AccountKey: "must-not-leak",
            ClientKey: "must-not-leak",
          }),
        ],
      }),
    );

    const positions = await gateway.listPositions();

    expect(positions).toEqual([
      {
        id: expect.stringMatching(/^saxo-[a-f0-9]{64}$/),
        assetType: "Stock",
        amount: 10,
        currentPrice: 100,
        exposure: 1_000,
        exposureCurrency: "DKK",
      },
      {
        id: expect.stringMatching(/^saxo-[a-f0-9]{64}$/),
        assetType: "Bond",
        amount: -2,
        currentPrice: 0,
        exposure: -50,
        exposureCurrency: "EUR",
      },
    ]);
    expect(positions[0]!.id).not.toBe(positions[1]!.id);
    expect(JSON.stringify(positions)).not.toMatch(
      /position-id|net-position|Uic|AccountKey|ClientKey|must-not-leak/,
    );
    expect(Object.keys(positions[0]!).sort()).toEqual([
      "amount",
      "assetType",
      "currentPrice",
      "exposure",
      "exposureCurrency",
      "id",
    ]);
  });

  it("returns an empty array for empty Data", async () => {
    const { provider } = accessTokenProvider();
    const gateway = new SaxoInvestmentPositionGateway(provider, async () =>
      jsonResponse({ Data: [] }),
    );

    await expect(gateway.listPositions()).resolves.toEqual([]);
  });

  it("concatenates pages and reuses one token", async () => {
    const { provider, getAccessToken } = accessTokenProvider();
    const fetchRequest = vi
      .fn<(input: string | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        jsonResponse({ Data: [position()], __next: `${positionsUrl}?$skip=1&$top=1` }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ Data: [position({ PositionId: "position-id-2" })] }),
      );
    const gateway = new SaxoInvestmentPositionGateway(provider, fetchRequest);

    const positions = await gateway.listPositions();

    expect(positions).toHaveLength(2);
    expect(fetchRequest).toHaveBeenNthCalledWith(
      2,
      `${positionsUrl}?$skip=1&$top=1`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(getAccessToken).toHaveBeenCalledOnce();
  });

  it.each([
    ["malformed", "not a valid URL"],
    ["cross-origin", "https://example.test/sim/openapi/port/v1/positions/me?$skip=1"],
    ["wrong path", "https://gateway.saxobank.com/sim/openapi/port/v1/orders/me?$skip=1"],
    ["unexpected query", `${positionsUrl}?FieldGroups=PositionDetails`],
  ])("rejects %s pagination URL", async (_name, next) => {
    const { provider } = accessTokenProvider("sensitive-access-token");
    const gateway = new SaxoInvestmentPositionGateway(provider, async () =>
      jsonResponse({ Data: [], __next: next }),
    );

    await expect(gateway.listPositions()).rejects.toThrow(
      "Could not load Saxo investment positions",
    );
    await expect(gateway.listPositions()).rejects.not.toThrow(
      /sensitive-access-token|example\.test|orders|PositionDetails/,
    );
  });

  it("rejects a repeated pagination URL before refetching it", async () => {
    const { provider } = accessTokenProvider();
    const fetchRequest = vi.fn(async () => jsonResponse({ Data: [], __next: positionsUrl }));
    const gateway = new SaxoInvestmentPositionGateway(provider, fetchRequest);

    await expect(gateway.listPositions()).rejects.toThrow(
      "Could not load Saxo investment positions",
    );
    expect(fetchRequest).toHaveBeenCalledOnce();
  });

  it("enforces the 20-page limit", async () => {
    const { provider } = accessTokenProvider();
    let page = 0;
    const fetchRequest = vi.fn(async () => {
      page += 1;
      return jsonResponse({ Data: [], __next: `${positionsUrl}?$skip=${page}` });
    });
    const gateway = new SaxoInvestmentPositionGateway(provider, fetchRequest);

    await expect(gateway.listPositions()).rejects.toThrow(
      "Could not load Saxo investment positions",
    );
    expect(fetchRequest).toHaveBeenCalledTimes(20);
  });

  it("fails generically when the token provider fails", async () => {
    const provider: SaxoAccessTokenProvider = {
      getAccessToken: async () => {
        throw new Error("sensitive-token-detail");
      },
    };
    const fetchRequest = vi.fn(async () => jsonResponse({ Data: [] }));
    const gateway = new SaxoInvestmentPositionGateway(provider, fetchRequest);

    await expect(gateway.listPositions()).rejects.toThrow(
      "Could not load Saxo investment positions",
    );
    await expect(gateway.listPositions()).rejects.not.toThrow("sensitive-token-detail");
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it.each([1, 2])("fails generically for non-success page %i", async (failurePage) => {
    const { provider } = accessTokenProvider("sensitive-access-token");
    let page = 0;
    const fetchRequest = vi.fn(async () => {
      page += 1;
      if (page === failurePage) {
        return jsonResponse({ error: "raw-saxo-error", PositionId: "private-id" }, 500);
      }
      return jsonResponse({ Data: [], __next: `${positionsUrl}?$skip=1` });
    });
    const gateway = new SaxoInvestmentPositionGateway(provider, fetchRequest);

    await expect(gateway.listPositions()).rejects.toThrow(
      "Could not load Saxo investment positions",
    );
    await expect(gateway.listPositions()).rejects.not.toThrow(
      /raw-saxo-error|private-id|sensitive-access-token/,
    );
  });

  it("fails generically for invalid JSON", async () => {
    const { provider } = accessTokenProvider();
    const gateway = new SaxoInvestmentPositionGateway(
      provider,
      async () => new Response("raw-invalid-json", { status: 200 }),
    );

    await expect(gateway.listPositions()).rejects.toThrow(
      "Could not load Saxo investment positions",
    );
    await expect(gateway.listPositions()).rejects.not.toThrow("raw-invalid-json");
  });

  it.each([
    null,
    {},
    { Data: "not-an-array" },
    { Data: [null] },
    { Data: [position({ PositionId: "" })] },
    { Data: [position({ PositionBase: undefined })] },
    { Data: [position({ PositionView: undefined })] },
    { Data: [position({ PositionBase: { Amount: 1, AssetType: " ", Uic: 1 } })] },
    { Data: [position({ PositionBase: { Amount: Number.NaN, AssetType: "Stock", Uic: 1 } })] },
    {
      Data: [
        position({
          PositionView: { CurrentPrice: Number.POSITIVE_INFINITY, Exposure: 1, ExposureCurrency: "DKK" },
        }),
      ],
    },
    {
      Data: [
        position({
          PositionView: { CurrentPrice: 1, Exposure: Number.NaN, ExposureCurrency: "DKK" },
        }),
      ],
    },
    {
      Data: [
        position({ PositionView: { CurrentPrice: 1, Exposure: 1, ExposureCurrency: " " } }),
      ],
    },
  ])("fails closed for malformed response %#", async (body) => {
    const { provider } = accessTokenProvider("sensitive-access-token");
    const gateway = new SaxoInvestmentPositionGateway(provider, async () => jsonResponse(body));

    await expect(gateway.listPositions()).rejects.toThrow(
      "Could not load Saxo investment positions",
    );
    await expect(gateway.listPositions()).rejects.not.toThrow(
      /PositionId|NetPositionId|Uic|sensitive-access-token/,
    );
  });
});