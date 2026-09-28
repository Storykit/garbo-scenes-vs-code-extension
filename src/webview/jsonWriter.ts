import * as vscode from "vscode";

async function isMissingOrEmpty(fileUri: vscode.Uri): Promise<boolean> {
  try {
    return (await vscode.workspace.fs.stat(fileUri)).size === 0;
  } catch (err) {
    if (err instanceof vscode.FileSystemError && err.code === "FileNotFound") {
      return true;
    }
    throw err;
  }
}

/**
 * Writes pretty-printed JSON files and records which were written and which
 * were skipped. With onlyIfEmpty, a file that already exists with content is
 * left untouched.
 */
export class JsonWriter {
  readonly written: string[] = [];
  readonly skipped: string[] = [];

  constructor(private readonly onlyIfEmpty: boolean) {}

  async write(fileUri: vscode.Uri, data: unknown): Promise<void> {
    if (this.onlyIfEmpty && !(await isMissingOrEmpty(fileUri))) {
      this.skipped.push(fileUri.fsPath);
      return;
    }
    await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(JSON.stringify(data, null, 2)));
    this.written.push(fileUri.fsPath);
  }
}
