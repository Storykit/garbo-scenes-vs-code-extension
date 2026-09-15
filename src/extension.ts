import * as vscode from "vscode";
import { AuthService } from "./auth/authService";
import { createApiClient } from "./api/client";
import { StorykitApi } from "./api/storykitApi";
import { AccountViewProvider } from "./webview/accountViewProvider";
import { outputChannel } from "./logging";

export function activate(context: vscode.ExtensionContext): void {
  const authService = new AuthService(context.secrets);
  const apiClient = createApiClient(authService);
  const storykitApi = new StorykitApi(authService, apiClient);

  context.subscriptions.push(
    outputChannel,
    vscode.window.registerWebviewViewProvider(
      AccountViewProvider.viewType,
      new AccountViewProvider(storykitApi, context.extensionUri),
    ),
    vscode.commands.registerCommand("definitionExtension.showLogs", () => outputChannel.show()),
  );
}
