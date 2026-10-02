import * as vscode from "vscode";
import { createDefaultDataFromDataSchema } from "./generateSchemaDefaults";
import type { JsonWriter } from "../workspace/jsonWriter";
import { getWorkspaceRoot } from "../workspace/workspaceRoot";

export async function generateDataFromSchema(dirName: string, writer: JsonWriter): Promise<void> {
  const root = getWorkspaceRoot();

  const dirUri = vscode.Uri.joinPath(root, dirName);
  const schemaUri = vscode.Uri.joinPath(dirUri, "dataSchema.json");

  let bytes: Uint8Array;
  try {
    bytes = await vscode.workspace.fs.readFile(schemaUri);
  } catch (err) {
    if (err instanceof vscode.FileSystemError && err.code === "FileNotFound") {
      throw new Error(`No dataSchema.json found in "${dirName}". Export a definition there first.`, {
        cause: err,
      });
    }
    throw err;
  }

  let dataSchema: unknown;
  try {
    dataSchema = JSON.parse(new TextDecoder().decode(bytes));
  } catch (err) {
    throw new Error(`dataSchema.json in "${dirName}" is not valid JSON: ${(err as Error).message}`, { cause: err });
  }
  if (typeof dataSchema !== "object" || dataSchema === null || Array.isArray(dataSchema)) {
    throw new Error(`dataSchema.json in "${dirName}" must contain a JSON object.`);
  }

  const data = createDefaultDataFromDataSchema(dataSchema as Record<string, unknown>);
  await writer.write(vscode.Uri.joinPath(dirUri, "data.json"), data);
}
