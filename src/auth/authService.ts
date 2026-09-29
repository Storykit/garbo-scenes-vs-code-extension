import * as vscode from "vscode";
import { waitForCallback } from "./loopbackServer";
import { createPkcePair, createState } from "./pkce";
import { outputChannel, logRequest, logResponse } from "../logging";
import type { Environment } from "../environment";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface Auth0Config {
  origin: string;
  clientId: string;
  audience?: string;
  scope: string;
  redirectUri: string;
}

function redact(value: string): string {
  return value.length <= 8 ? "***" : `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export class AuthService {
  private readonly _onDidChangeSession = new vscode.EventEmitter<void>();
  readonly onDidChangeSession = this._onDidChangeSession.event;

  private readonly accessTokenKey: string;
  private readonly refreshTokenKey: string;

  constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly environment: Environment,
  ) {
    this.accessTokenKey = `definitionExtension.accessToken.${environment}`;
    this.refreshTokenKey = `definitionExtension.refreshToken.${environment}`;
  }

  async getAccessToken(): Promise<string | undefined> {
    return this.secrets.get(this.accessTokenKey);
  }

  async isSignedIn(): Promise<boolean> {
    return (await this.getAccessToken()) !== undefined;
  }

  private getAuth0Config(): Auth0Config {
    const config = vscode.workspace.getConfiguration(`definitionExtension.${this.environment}`);
    const rawDomain = config.get<string>("auth0Domain");
    const clientId = config.get<string>("auth0ClientId");
    const redirectUri = config.get<string>("redirectUri");
    if (!rawDomain || !clientId || !redirectUri) {
      throw new Error(
        `definitionExtension.${this.environment}.auth0Domain, auth0ClientId and redirectUri must be configured.`,
      );
    }
    return {
      // Bare domain (production Auth0) defaults to https; an explicit
      // http://... override is honored as-is (local mock server testing).
      origin: rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`,
      clientId,
      audience: config.get<string>("auth0Audience") ?? undefined,
      scope: config.get<string>("auth0Scope") ?? "openid profile email offline_access",
      redirectUri,
    };
  }

  /**
   * Runs the Auth0 Authorization Code + PKCE flow: opens /authorize in the
   * user's browser, catches the ?code=&state= redirect on a loopback server,
   * then exchanges the code for tokens at /oauth/token.
   */
  async login(): Promise<void> {
    const auth0 = this.getAuth0Config();
    const { verifier, challenge } = createPkcePair();
    const state = createState();

    const config = vscode.workspace.getConfiguration("definitionExtension");
    const port = config.get<number>("callbackPort") ?? 42813;
    const { result } = await waitForCallback(port);
    const redirectUri = auth0.redirectUri;

    const authorizeUrl = new URL(`${auth0.origin}/authorize`);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", auth0.clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", auth0.scope);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("state", state);
    if (auth0.audience) {
      authorizeUrl.searchParams.set("audience", auth0.audience);
    }
    outputChannel.appendLine(
      `--> opening browser: ${authorizeUrl.origin}${authorizeUrl.pathname} (client_id=${auth0.clientId}, audience=${auth0.audience ?? "(none)"})`,
    );
    await vscode.env.openExternal(vscode.Uri.parse(authorizeUrl.toString()));

    const { code, state: returnedState } = await result;
    outputChannel.appendLine(
      `<-- callback received: code=${redact(code)} state ${returnedState === state ? "ok" : "MISMATCH"}`,
    );
    if (returnedState !== state) {
      throw new Error("State mismatch — possible CSRF, aborting sign-in.");
    }

    const tokenUrl = `${auth0.origin}/oauth/token`;
    const startedAt = logRequest("POST", `${tokenUrl} (grant_type=authorization_code)`);
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: auth0.clientId,
        code_verifier: verifier,
        code,
        redirect_uri: redirectUri,
      }),
    });
    logResponse("POST", tokenUrl, tokenResponse.status, startedAt);

    if (!tokenResponse.ok) {
      outputChannel.appendLine(`    error body: ${await tokenResponse.text()}`);
      throw new Error(`Token exchange failed with status ${tokenResponse.status}.`);
    }

    const tokens = (await tokenResponse.json()) as TokenResponse;
    await this.storeTokens(tokens);
  }

  /**
   * Exchanges the stored refresh token for a new access token. Throws if
   * there is no refresh token or the exchange fails, so callers can fall
   * back to prompting the user to sign in again.
   */
  async refresh(): Promise<string> {
    const refreshToken = await this.secrets.get(this.refreshTokenKey);
    if (!refreshToken) {
      throw new Error("No refresh token available.");
    }

    const auth0 = this.getAuth0Config();
    const tokenUrl = `${auth0.origin}/oauth/token`;
    const startedAt = logRequest("POST", `${tokenUrl} (grant_type=refresh_token)`);
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: auth0.clientId,
        refresh_token: refreshToken,
      }),
    });
    logResponse("POST", tokenUrl, response.status, startedAt);

    if (!response.ok) {
      outputChannel.appendLine(`    error body: ${await response.text()}`);
      await this.logout();
      throw new Error(`Token refresh failed with status ${response.status}.`);
    }

    const tokens = (await response.json()) as TokenResponse;
    await this.storeTokens(tokens);
    return tokens.access_token;
  }

  async logout(): Promise<void> {
    await this.secrets.delete(this.accessTokenKey);
    await this.secrets.delete(this.refreshTokenKey);
    this._onDidChangeSession.fire();
  }

  private async storeTokens(tokens: TokenResponse): Promise<void> {
    await this.secrets.store(this.accessTokenKey, tokens.access_token);
    if (tokens.refresh_token) {
      await this.secrets.store(this.refreshTokenKey, tokens.refresh_token);
    }
    this._onDidChangeSession.fire();
  }
}
