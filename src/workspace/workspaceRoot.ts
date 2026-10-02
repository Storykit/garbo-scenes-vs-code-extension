import * as vscode from 'vscode';

/** The extension works on the first workspace folder; every operation resolves paths against it. */
export function getWorkspaceRoot(): vscode.Uri {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) {
    throw new Error('No workspace folder open.');
  }
  return root.uri;
}
