import * as vscode from "vscode";
import type { StorykitApi } from "../api/storykitApi";
import type { IVideoSlideDefinition, SlideDefinitionType } from "../api/types";
import { logMessage } from "../logging";
import type { JsonWriter } from "./jsonWriter";

/** Everything fetched from cws that a definition lookup needs. Fetch once, reuse across type names. */
export interface DefinitionCatalog {
  definitionTypes: SlideDefinitionType[];
  definitions: IVideoSlideDefinition[];
}

export async function fetchDefinitionCatalog(storykitApi: StorykitApi): Promise<DefinitionCatalog> {
  const [definitionTypes, { definitions }] = await Promise.all([
    storykitApi.getSlideDefinitionTypes(),
    storykitApi.getDefinitionGroup(),
  ]);
  return { definitionTypes, definitions };
}

function findDefinitionByTypeName(
  { definitionTypes, definitions }: DefinitionCatalog,
  typeName: string,
): { dirUri: vscode.Uri; definition: IVideoSlideDefinition } {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) {
    throw new Error("No workspace folder open.");
  }

  const definitionType = definitionTypes.find((type) => type.name === typeName);
  logMessage(`Looking for definition type named "${typeName}" out of ${definitionTypes.length} available types.`);
  if (!definitionType) {
    throw new Error(`No definition type named "${typeName}".`);
  }
  logMessage(`Found definition type: ${JSON.stringify(definitionType, null, 2)}`);

  const definition = definitions.find((d) => d.definitionType === definitionType._id);
  logMessage(
    `Looking for definition for type ID "${definitionType._id}" out of ${definitions.length} available definitions.`,
  );
  if (!definition) {
    throw new Error(`No definition found for type "${typeName}".`);
  }
  logMessage(`Found definition: ${JSON.stringify({ id: definition._id }, null, 2)}`);

  return { dirUri: vscode.Uri.joinPath(root.uri, typeName), definition };
}

export async function exportDefinitionByTypeName(
  catalog: DefinitionCatalog,
  typeName: string,
  writer: JsonWriter,
): Promise<void> {
  const { dirUri, definition } = findDefinitionByTypeName(catalog, typeName);

  await writer.write(vscode.Uri.joinPath(dirUri, "dataSchema.json"), definition.dataSchema);
  await writer.write(vscode.Uri.joinPath(dirUri, "uiSchema.json"), definition.uiSchema);
}

export async function exportDefinitionVariablesByTypeName(
  catalog: DefinitionCatalog,
  typeName: string,
  writer: JsonWriter,
): Promise<void> {
  const { dirUri, definition } = findDefinitionByTypeName(catalog, typeName);
  if (definition.variables === undefined) {
    throw new Error(`Definition for type "${typeName}" has no variables.`);
  }
  await writer.write(vscode.Uri.joinPath(dirUri, "definition_values.json"), definition.variables);
}
