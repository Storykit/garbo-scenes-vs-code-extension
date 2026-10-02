import * as vscode from "vscode";
import type { StorykitApi } from "../api/storykitApi";
import { ENVIRONMENTS, ENVIRONMENT_LABELS, type Environment } from "../environment";
import { logMessage } from "../logging";
import { loadComponentHtml } from "./htmlLoader";
import {
  exportDefinitionByTypeName,
  exportDefinitionVariablesByTypeName,
  fetchDefinitionCatalog,
} from "../operations/exportDefinition";
import { generateDataFromSchema } from "../operations/generateDataFromSchema";
import { inferNameFromActiveFile } from "../workspace/inferNameFromActiveFile";
import { JsonWriter } from "../workspace/jsonWriter";
import { listTopLevelDirectories } from "../workspace/listTopLevelDirectories";

type Operation = "exportDefinition" | "exportVariables" | "generateData";

type WebviewMessage =
  | { type: "login" }
  | { type: "logout" }
  | { type: "runOperation"; operation: Operation; name: string; allDirectories: boolean; onlyIfEmpty: boolean }
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
            this.postError((err as Error).message);
          }
          break;
        case "logout":
          await this.activeApi.logout();
          break;
        case "runOperation":
          try {
            await this.runOperation(message);
          } catch (err) {
            this.postError((err as Error).message);
          }
          break;
      }
    });

    void this.render();
  }

  /**
   * Runs the operation on one directory (the given name, or the one inferred
   * from the active file) or on every top-level directory. cws data is
   * fetched once up front and shared; a failing directory is recorded and
   * the rest still run. With onlyIfEmpty, files that already have content
   * are skipped rather than overwritten.
   */
  private async runOperation({
    operation,
    name,
    allDirectories,
    onlyIfEmpty,
  }: Extract<WebviewMessage, { type: "runOperation" }>): Promise<void> {
    let names: string[];
    if (allDirectories) {
      names = await listTopLevelDirectories();
    } else {
      const single = name.trim() || inferNameFromActiveFile();
      if (!single) {
        throw new Error("No name given, and no active file to infer one from.");
      }
      names = [single];
    }

    const run = await this.prepareOperation(operation);
    const writer = new JsonWriter(onlyIfEmpty);
    const failed: { name: string; message: string }[] = [];
    for (const dirName of names) {
      try {
        await run(dirName, writer);
      } catch (err) {
        const message = (err as Error).message;
        logMessage(`${operation} failed for "${dirName}": ${message}`);
        failed.push({ name: dirName, message });
      }
    }

    this.view?.webview.postMessage({
      type: "operationResult",
      written: writer.written,
      skipped: writer.skipped,
      failed,
    });
  }

  private async prepareOperation(operation: Operation): Promise<(name: string, writer: JsonWriter) => Promise<void>> {
    if (operation === "generateData") {
      return generateDataFromSchema;
    }
    const catalog = await fetchDefinitionCatalog(this.activeApi);
    return operation === "exportDefinition"
      ? (name, writer) => exportDefinitionByTypeName(catalog, name, writer)
      : (name, writer) => exportDefinitionVariablesByTypeName(catalog, name, writer);
  }

  private postError(message: string): void {
    this.view?.webview.postMessage({ type: "error", message });
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
