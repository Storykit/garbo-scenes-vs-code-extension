import * as vscode from "vscode";
import type { StorykitApi } from "../api/storykitApi";
import { ENVIRONMENTS, ENVIRONMENT_LABELS, type Environment } from "../environment";
import { loadComponentHtml } from "./htmlLoader";
import { exportDefinitionByTypeName } from "./exportDefinition";
import { generateDataFromSchema } from "./generateDataFromSchema";
import { inferNameFromActiveFile } from "./inferNameFromActiveFile";

type WebviewMessage =
  | { type: "login" }
  | { type: "logout" }
  | { type: "exportDefinition"; name: string }
  | { type: "generateData"; name: string }
  | { type: "switchEnvironment"; environment: Environment };

export class AccountViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "definitionExtension.loginView";

  private view?: vscode.WebviewView;
  private activeEnvironment: Environment = "stage";

  constructor(
    private readonly apis: Record<Environment, StorykitApi>,
    private readonly extensionUri: vscode.Uri,
  ) {
    for (const environment of ENVIRONMENTS) {
      apis[environment].onDidChangeSession(() => this.render());
    }
  }

  private get activeApi(): StorykitApi {
    return this.apis[this.activeEnvironment];
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media", "webview")],
    };

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      switch (message.type) {
        case "switchEnvironment":
          this.activeEnvironment = message.environment;
          void this.render();
          break;
        case "login":
          try {
            await this.activeApi.login();
          } catch (err) {
            this.view?.webview.postMessage({ type: "error", message: (err as Error).message });
          }
          break;
        case "logout":
          await this.activeApi.logout();
          break;
        case "exportDefinition": {
          const name = message.name.trim() || inferNameFromActiveFile();
          if (!name) {
            this.view?.webview.postMessage({
              type: "error",
              message: "No name given, and no active file to infer one from.",
            });
            break;
          }
          try {
            const path = await exportDefinitionByTypeName(this.activeApi, name);
            this.view?.webview.postMessage({ type: "exportDefinitionResult", path });
          } catch (err) {
            this.view?.webview.postMessage({ type: "error", message: (err as Error).message });
          }
          break;
        }
        case "generateData": {
          const name = message.name.trim() || inferNameFromActiveFile();
          if (!name) {
            this.view?.webview.postMessage({
              type: "error",
              message: "No name given, and no active file to infer one from.",
            });
            break;
          }
          try {
            const path = await generateDataFromSchema(name);
            this.view?.webview.postMessage({ type: "generateDataResult", path });
          } catch (err) {
            this.view?.webview.postMessage({ type: "error", message: (err as Error).message });
          }
          break;
        }
      }
    });

    void this.render();
  }

  private buildTabsHtml(): string {
    return ENVIRONMENTS.map((environment) => {
      const active = environment === this.activeEnvironment ? " active" : "";
      return `<button class="env-tab${active}" data-env="${environment}">${ENVIRONMENT_LABELS[environment]}</button>`;
    }).join("");
  }

  private async render(): Promise<void> {
    if (!this.view) {
      return;
    }
    const signedIn = await this.activeApi.isSignedIn();
    this.view.webview.html = await loadComponentHtml(
      this.view.webview,
      this.extensionUri,
      signedIn ? "signedIn" : "loginForm",
      { tabsHtml: this.buildTabsHtml() },
    );
  }
}
