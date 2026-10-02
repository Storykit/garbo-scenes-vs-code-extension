import * as vscode from "vscode";

const EXCLUDED_DIRECTORIES = new Set([
  "node_modules",
  "00_TEMPLATE",
  "01_LOCAL_BACKGROUND",
  "background",
  "shared_modules",
]);

/**
 * Returns the names of the directories directly under the workspace root,
 * skipping hidden directories (.git, .vscode, ...) and EXCLUDED_DIRECTORIES.
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
        type === vscode.FileType.Directory && !name.startsWith(".") && !EXCLUDED_DIRECTORIES.has(name),
    )
    .map(([name]) => name)
    .sort();
}
