import * as vscode from 'vscode';

/**
 * Loads webview-ui/<componentDir>/index.html and fills its {{key}}
 * placeholders: {{styleUri}} / {{scriptUri}} point at the sibling
 * style.css / script.js via the webview's asWebviewUri, {{cspSource}} is the
 * webview's CSP source, and any other key comes from extraReplacements.
 */
export async function loadComponentHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  componentDir: string,
  extraReplacements: Record<string, string> = {}
): Promise<string> {
  const dirUri = vscode.Uri.joinPath(extensionUri, 'webview-ui', componentDir);
  const bytes = await vscode.workspace.fs.readFile(
    vscode.Uri.joinPath(dirUri, 'index.html')
  );
  const replacements: Record<string, string> = {
    styleUri: webview
      .asWebviewUri(vscode.Uri.joinPath(dirUri, 'style.css'))
      .toString(),
    scriptUri: webview
      .asWebviewUri(vscode.Uri.joinPath(dirUri, 'script.js'))
      .toString(),
    cspSource: webview.cspSource,
    ...extraReplacements,
  };

  // A replacer function replaces every occurrence and keeps `$` in values
  // literal; an unknown key is a template bug, so fail loudly.
  return new TextDecoder()
    .decode(bytes)
    .replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      if (!Object.hasOwn(replacements, key)) {
        throw new Error(
          `Unknown placeholder {{${key}}} in ${componentDir}/index.html.`
        );
      }
      return replacements[key];
    });
}
