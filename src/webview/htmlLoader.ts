import * as vscode from 'vscode';

/**
 * Loads media/webview/<componentDir>/index.html and resolves its
 * {{styleUri}} / {{scriptUri}} placeholders against the sibling
 * style.css / script.js via the webview's asWebviewUri, plus any
 * caller-supplied {{key}} placeholders.
 */
export async function loadComponentHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  componentDir: string,
  extraReplacements: Record<string, string> = {}
): Promise<string> {
  const dirUri = vscode.Uri.joinPath(
    extensionUri,
    'media',
    'webview',
    componentDir
  );
  const bytes = await vscode.workspace.fs.readFile(
    vscode.Uri.joinPath(dirUri, 'index.html')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(dirUri, 'style.css')
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(dirUri, 'script.js')
  );

  let html = new TextDecoder()
    .decode(bytes)
    .replace('{{styleUri}}', styleUri.toString())
    .replace('{{scriptUri}}', scriptUri.toString());
  for (const [key, value] of Object.entries(extraReplacements)) {
    html = html.replace(`{{${key}}}`, value);
  }
  return html;
}
