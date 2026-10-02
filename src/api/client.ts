import * as vscode from "vscode";
import axios, { type AxiosInstance } from "axios";
import type { AuthService } from "../auth/authService";
import type { Environment } from "../environment";
import { logRequest, logResponse, logError, logErrorBody } from "../logging";

// Bookkeeping fields the interceptors attach to each request config.
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _loggedAt?: number;
    _retried?: boolean;
  }
}

/**
 * Axios instance that attaches the stored JWT to every request and retries
 * once via refresh() on a 401 before giving up.
 */
export function createApiClient(authService: AuthService, environment: Environment): AxiosInstance {
  const client = axios.create();

  client.interceptors.request.use(async (req) => {
    // Read per request so a changed setting applies without reloading the window.
    req.baseURL = vscode.workspace.getConfiguration(`definitionExtension.${environment}`).get<string>("apiBaseUrl");
    const token = await authService.getAccessToken();
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }

    req._loggedAt = logRequest(req.method?.toUpperCase() ?? "GET", `${req.baseURL ?? ""}${req.url}`);
    return req;
  });

  client.interceptors.response.use(
    (res) => {
      logResponse(
        res.config.method?.toUpperCase() ?? "GET",
        `${res.config.baseURL ?? ""}${res.config.url}`,
        res.status,
        res.config._loggedAt ?? Date.now(),
      );
      return res;
    },
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        throw error;
      }
      const original = error.config;
      const method = original?.method?.toUpperCase() ?? "GET";
      const url = `${original?.baseURL ?? ""}${original?.url ?? ""}`;
      const startedAt = original?._loggedAt ?? Date.now();

      if (error.response) {
        logResponse(method, url, error.response.status, startedAt);
        logErrorBody(error.response.data);
      } else {
        logError(method, url, error, startedAt);
      }

      if (error.response?.status === 401 && original && !original._retried) {
        original._retried = true;
        const token = await authService.refresh();
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      }
      throw error;
    },
  );

  return client;
}
