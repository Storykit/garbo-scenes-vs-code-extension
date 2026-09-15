import * as vscode from "vscode";
import type { StorykitApi } from "../api/storykitApi";
import { logMessage } from "../logging";

async function writeJson(dirUri: vscode.Uri, fileName: string, data: unknown): Promise<void> {
  const fileUri = vscode.Uri.joinPath(dirUri, fileName);
  await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(JSON.stringify(data, null, 2)));
}

export async function exportDefinitionByTypeName(storykitApi: StorykitApi, typeName: string): Promise<string> {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) {
    throw new Error("No workspace folder open.");
  }

  const dirUri = vscode.Uri.joinPath(root.uri, typeName);
  await vscode.workspace.fs.createDirectory(dirUri);

  const definitionTypes = await storykitApi.getSlideDefinitionTypes();
  const definitionType = definitionTypes.find((type) => type.name === typeName);
  logMessage(`Looking for definition type named "${typeName}" out of ${definitionTypes.length} available types.`);
  if (!definitionType) {
    throw new Error(`No definition type named "${typeName}".`);
  }
  logMessage(`Found definition type: ${JSON.stringify(definitionType, null, 2)}`);

  const { definitions } = await storykitApi.getDefinitionGroup();
  const definition = definitions.find((d) => d.definitionType === definitionType._id);
  logMessage(
    `Looking for definition for type ID "${definitionType._id}" out of ${definitions.length} available definitions.`,
  );
  if (!definition) {
    await writeJson(dirUri, "all-definitions.json", definitions);
    throw new Error(`No definition found for type "${typeName}".`);
  }
  logMessage(`Found definition: ${JSON.stringify({ id: definition._id }, null, 2)}`);

  await writeJson(dirUri, "dataSchema.json", definition.dataSchema);
  await writeJson(dirUri, "uiSchema.json", definition.uiSchema);

  return dirUri.fsPath;
}
