import * as vscode from "vscode";
import { createDefaultDataFromDataSchema } from "./helpers";
import type { JsonWriter } from "./jsonWriter";

export async function generateDataFromSchema(dirName: string, writer: JsonWriter): Promise<void> {
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
  await writer.write(vscode.Uri.joinPath(dirUri, "data.json"), data);
}
