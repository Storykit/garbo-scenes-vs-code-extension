import * as vscode from "vscode";
import { createDefaultDataFromDataSchema } from "./helpers";

export async function generateDataFromSchema(dirName: string): Promise<string> {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) {
    throw new Error("No workspace folder open.");
  }

  const dirUri = vscode.Uri.joinPath(root.uri, dirName);
  const schemaUri = vscode.Uri.joinPath(dirUri, "dataSchema.json");

  let dataSchema: Record<string, unknown>;
  try {
    const bytes = await vscode.workspace.fs.readFile(schemaUri);
    dataSchema = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    throw new Error(`No dataSchema.json found in "${dirName}". Export a definition there first.`);
  }

  const data = createDefaultDataFromDataSchema(dataSchema);
  const dataUri = vscode.Uri.joinPath(dirUri, "data.json");
  await vscode.workspace.fs.writeFile(dataUri, new TextEncoder().encode(JSON.stringify(data, null, 2)));
  return dataUri.fsPath;
}
