import { Ajv } from "ajv";

export function createDefaultDataFromDataSchema(dataSchema: Record<string, unknown>): Record<string, unknown> {
  const defaultData: Record<string, unknown> = {};
  const ajv = new Ajv({ useDefaults: true });
  const validate = ajv.compile(dataSchema);
  validate(defaultData);
  return defaultData;
}
