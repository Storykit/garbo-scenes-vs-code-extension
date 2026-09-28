import * as vscode from "vscode";

/**
 * Returns the names of the directories directly under the workspace root,
 * skipping hidden directories (.git, .vscode, ...) and node_modules.
 */
export async function listTopLevelDirectories(): Promise<string[]> {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) {
    throw new Error("No workspace folder open.");
  }
  const entries = await vscode.workspace.fs.readDirectory(root.uri);
  return entries
    .filter(
      ([name, type]) =>
        type === vscode.FileType.Directory &&
        !name.startsWith(".") &&
        name !== "node_modules" &&
        name !== "00_TEMPLATE",
    )
    .map(([name]) => name)
    .sort();
}
