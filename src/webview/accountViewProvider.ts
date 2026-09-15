import * as vscode from 'vscode';
import type { StorykitApi } from '../api/storykitApi';
import { loadComponentHtml } from './htmlLoader';
import { writeUsernameFile } from './writeUsernameFile';
import { exportDefinitionByTypeName } from './exportDefinition';
import { inferNameFromActiveFile } from './inferNameFromActiveFile';

type WebviewMessage =
  | { type: 'login' }
  | { type: 'logout' }
  | { type: 'fetchUser' }
  | { type: 'exportDefinition'; name: string };

export class AccountViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'definitionExtension.loginView';

  private view?: vscode.WebviewView;

  constructor(
    private readonly storykitApi: StorykitApi,
    private readonly extensionUri: vscode.Uri,
  ) {
    storykitApi.onDidChangeSession(() => this.render());
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media', 'webview')],
    };

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      switch (message.type) {
        case 'login':
          try {
            await this.storykitApi.login();
          } catch (err) {
            this.view?.webview.postMessage({ type: 'error', message: (err as Error).message });
          }
          break;
        case 'logout':
          await this.storykitApi.logout();
          break;
        case 'fetchUser':
          try {
            const user = await this.storykitApi.getCurrentUser();
            await writeUsernameFile(user);
            this.view?.webview.postMessage({ type: 'user', data: user });
          } catch (err) {
            this.view?.webview.postMessage({ type: 'error', message: (err as Error).message });
          }
          break;
        case 'exportDefinition': {
          const name = message.name.trim() || inferNameFromActiveFile();
          if (!name) {
            this.view?.webview.postMessage({
              type: 'error',
              message: 'No name given, and no active file to infer one from.',
            });
            break;
          }
          try {
            const path = await exportDefinitionByTypeName(this.storykitApi, name);
            this.view?.webview.postMessage({ type: 'exportDefinitionResult', path });
          } catch (err) {
            this.view?.webview.postMessage({ type: 'error', message: (err as Error).message });
          }
          break;
        }
      }
    });

    void this.render();
  }

  private async render(): Promise<void> {
    if (!this.view) {
      return;
    }
    const signedIn = await this.storykitApi.isSignedIn();
    this.view.webview.html = await loadComponentHtml(
      this.view.webview,
      this.extensionUri,
      signedIn ? 'signedIn' : 'loginForm',
    );
  }
}
