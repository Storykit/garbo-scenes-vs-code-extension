import * as vscode from "vscode";

/**
 * Returns the name of the directory directly under the workspace root that
 * contains the currently active file, or undefined if there is no active
 * editor or the active file sits at the root itself.
 */
export function inferNameFromActiveFile(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!editor || !root) {
    return undefined;
  }
  const relative = vscode.workspace.asRelativePath(editor.document.uri, false);
  const [firstSegment, ...rest] = relative.split("/");
  return rest.length > 0 ? firstSegment : undefined;
}
