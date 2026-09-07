import { randomBytes } from "node:crypto";

export const SAXO_SIM_AUTHORIZATION_URL =
	"https://sim.logonvalidation.net/authorize";
export const SAXO_SIM_TOKEN_URL = "https://sim.logonvalidation.net/token";
export const SAXO_SIM_API_BASE_URL = "https://gateway.saxobank.com/sim/openapi";

export type SaxoSimConfiguration = {
	provider: "saxo-sim";
	clientId: string;
	clientSecret: string;
	redirectUri: string;
};

export type InvestmentAccountProviderConfiguration =
	| { provider: "mock" }
	| SaxoSimConfiguration;

export type SaxoAccessToken = {
	value: string;
	expiresAt: Date;
};

export interface SaxoAccessTokenProvider {
	getAccessToken(): Promise<SaxoAccessToken>;
}

type SaxoFetch = (
	input: string | URL,
	init?: RequestInit,
) => Promise<Response>;

type SaxoTokenState = {
	accessToken: string;
	accessTokenExpiresAt: number;
	refreshToken?: string;
	refreshTokenExpiresAt?: number;
};

const tokenExchangeError = (): Error => new Error("Saxo SIM token exchange failed");

export class SaxoSimAccessTokenProvider
	implements SaxoAccessTokenProvider, SaxoAuthorizationCodeReceiver
{
	private tokenState: SaxoTokenState | undefined;

	constructor(
		private readonly configuration: SaxoSimConfiguration,
		private readonly fetchRequest: SaxoFetch = globalThis.fetch,
		private readonly now: () => number = Date.now,
	) {}

	async receive(code: string): Promise<void> {
		if (!code.trim()) {
			throw tokenExchangeError();
		}

		try {
			const response = await this.fetchRequest(SAXO_SIM_TOKEN_URL, {
				method: "POST",
				headers: {
					Authorization: `Basic ${Buffer.from(
						`${this.configuration.clientId}:${this.configuration.clientSecret}`,
						"utf8",
					).toString("base64")}`,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					grant_type: "authorization_code",
					code,
					redirect_uri: this.configuration.redirectUri,
				}),
			});

			if (!response.ok) {
				throw tokenExchangeError();
			}

			const tokenResponse: unknown = await response.json();
			this.tokenState = this.parseTokenResponse(tokenResponse);
		} catch {
			throw tokenExchangeError();
		}
	}

	async getAccessToken(): Promise<SaxoAccessToken> {
		if (!this.tokenState || this.tokenState.accessTokenExpiresAt <= this.now()) {
			throw new Error("Saxo access token is unavailable");
		}

		return {
			value: this.tokenState.accessToken,
			expiresAt: new Date(this.tokenState.accessTokenExpiresAt),
		};
	}

	private parseTokenResponse(value: unknown): SaxoTokenState {
		if (typeof value !== "object" || value === null) {
			throw tokenExchangeError();
		}

		const response = value as Record<string, unknown>;
		const accessToken = response.access_token;
		const tokenType = response.token_type;
		const expiresIn = response.expires_in;
		const refreshToken = response.refresh_token;
		const refreshTokenExpiresIn = response.refresh_token_expires_in;

		if (
			typeof accessToken !== "string" ||
			!accessToken.trim() ||
			typeof tokenType !== "string" ||
			tokenType.trim().toLowerCase() !== "bearer" ||
			typeof expiresIn !== "number" ||
			!Number.isFinite(expiresIn) ||
			expiresIn <= 0
		) {
			throw tokenExchangeError();
		}

		if (
			refreshToken !== undefined &&
			(typeof refreshToken !== "string" || !refreshToken.trim())
		) {
			throw tokenExchangeError();
		}

		if (
			refreshTokenExpiresIn !== undefined &&
			(typeof refreshTokenExpiresIn !== "number" ||
				!Number.isFinite(refreshTokenExpiresIn) ||
				refreshTokenExpiresIn <= 0)
		) {
			throw tokenExchangeError();
		}

		if (refreshTokenExpiresIn !== undefined && refreshToken === undefined) {
			throw tokenExchangeError();
		}

		const now = this.now();
		return {
			accessToken,
			accessTokenExpiresAt: now + expiresIn * 1000,
			...(refreshToken === undefined ? {} : { refreshToken }),
			...(refreshTokenExpiresIn === undefined
				? {}
				: { refreshTokenExpiresAt: now + refreshTokenExpiresIn * 1000 }),
		};
	}
}

export interface SaxoOAuthStateStore {
	save(state: string): void;
	consume(state: string): boolean;
}

export class InMemorySaxoOAuthStateStore implements SaxoOAuthStateStore {
	private readonly expiresAtByState = new Map<string, number>();

	constructor(
		private readonly expirationMs = 10 * 60 * 1000,
		private readonly now: () => number = Date.now,
	) {}

	save(state: string): void {
		const now = this.now();
		this.removeExpiredStates(now);
		this.expiresAtByState.set(state, now + this.expirationMs);
	}

	consume(state: string): boolean {
		const now = this.now();
		this.removeExpiredStates(now);
		const expiresAt = this.expiresAtByState.get(state);

		if (expiresAt === undefined) {
			return false;
		}

		this.expiresAtByState.delete(state);
		return true;
	}

	private removeExpiredStates(now: number): void {
		for (const [state, expiresAt] of this.expiresAtByState) {
			if (expiresAt <= now) {
				this.expiresAtByState.delete(state);
			}
		}
	}
}

export interface SaxoAuthorizationCodeReceiver {
	receive(code: string): Promise<void>;
}

export class InMemorySaxoAuthorizationCodeReceiver
	implements SaxoAuthorizationCodeReceiver
{
	private authorizationCode: string | undefined;

	async receive(code: string): Promise<void> {
		this.authorizationCode = code;
	}

	take(): string | undefined {
		const code = this.authorizationCode;
		this.authorizationCode = undefined;
		return code;
	}
}

const requiredEnvironmentValue = (
	environment: NodeJS.ProcessEnv,
	name: "SAXO_SIM_APP_KEY" | "SAXO_SIM_APP_SECRET" | "SAXO_SIM_REDIRECT_URI",
): string => {
	const value = environment[name]?.trim();

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
};

const validatedRedirectUri = (value: string): string => {
	let redirectUrl: URL;

	try {
		redirectUrl = new URL(value);
	} catch {
		throw new Error("SAXO_SIM_REDIRECT_URI must be a valid HTTP or HTTPS URL");
	}

	if (redirectUrl.protocol !== "http:" && redirectUrl.protocol !== "https:") {
		throw new Error("SAXO_SIM_REDIRECT_URI must use HTTP or HTTPS");
	}

	return redirectUrl.toString();
};

export const loadInvestmentAccountProviderConfiguration = (
	environment: NodeJS.ProcessEnv,
): InvestmentAccountProviderConfiguration => {
	const provider = environment.SAXO_MODE?.trim() || "mock";

	if (provider === "mock") {
		return { provider: "mock" };
	}

	if (provider !== "saxo-sim") {
		throw new Error("SAXO_MODE must be either mock or saxo-sim; LIVE is not supported");
	}

	return {
		provider: "saxo-sim",
		clientId: requiredEnvironmentValue(environment, "SAXO_SIM_APP_KEY"),
		clientSecret: requiredEnvironmentValue(environment, "SAXO_SIM_APP_SECRET"),
		redirectUri: validatedRedirectUri(
			requiredEnvironmentValue(environment, "SAXO_SIM_REDIRECT_URI"),
		),
	};
};

export const buildSaxoSimAuthorizationUrl = (
	configuration: SaxoSimConfiguration,
	state: string,
): string => {
	if (!state.trim()) {
		throw new Error("OAuth state must not be blank");
	}

	const authorizationUrl = new URL(SAXO_SIM_AUTHORIZATION_URL);
	authorizationUrl.search = new URLSearchParams({
		response_type: "code",
		client_id: configuration.clientId,
		state,
		redirect_uri: configuration.redirectUri,
	}).toString();

	return authorizationUrl.toString();
};

export const generateSaxoOAuthState = (): string => randomBytes(32).toString("base64url");