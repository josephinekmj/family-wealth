export const SAXO_SIM_AUTHORIZATION_URL =
	"https://sim.logonvalidation.net/authorize";
export const SAXO_SIM_TOKEN_URL = "https://sim.logonvalidation.net/token";
export const SAXO_SIM_API_BASE_URL = "https://gateway.saxobank.com/sim/openapi";

export type InvestmentAccountProviderConfiguration =
	| { provider: "mock" }
	| {
			provider: "saxo-sim";
			clientId: string;
			clientSecret: string;
			redirectUri: string;
		};

export type SaxoAccessToken = {
	value: string;
	expiresAt: Date;
};

export interface SaxoAccessTokenProvider {
	getAccessToken(): Promise<SaxoAccessToken>;
}

const requiredEnvironmentValue = (
	environment: NodeJS.ProcessEnv,
	name: "SAXO_APP_KEY" | "SAXO_APP_SECRET" | "SAXO_REDIRECT_URI",
): string => {
	const value = environment[name]?.trim();

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
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
		clientId: requiredEnvironmentValue(environment, "SAXO_APP_KEY"),
		clientSecret: requiredEnvironmentValue(environment, "SAXO_APP_SECRET"),
		redirectUri: requiredEnvironmentValue(environment, "SAXO_REDIRECT_URI"),
	};
};