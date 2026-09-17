import * as vscode from "vscode";
import { AuthService } from "./auth/authService";
import { createApiClient } from "./api/client";
import { StorykitApi } from "./api/storykitApi";
import { AccountViewProvider } from "./webview/accountViewProvider";
import { ENVIRONMENTS, type Environment } from "./environment";
import { outputChannel } from "./logging";

export function activate(context: vscode.ExtensionContext): void {
  const apis = Object.fromEntries(
    ENVIRONMENTS.map((environment) => {
      const authService = new AuthService(context.secrets, environment);
      const apiClient = createApiClient(authService, environment);
      return [environment, new StorykitApi(authService, apiClient)];
    }),
  ) as Record<Environment, StorykitApi>;

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerWebviewViewProvider(
      AccountViewProvider.viewType,
      new AccountViewProvider(apis, context.extensionUri),
    ),
    vscode.commands.registerCommand("definitionExtension.showLogs", () => outputChannel.show()),
  );
}
