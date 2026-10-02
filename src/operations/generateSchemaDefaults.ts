import { Ajv } from 'ajv';

// Only defaults are needed, not validation: JSON Forms schemas commonly carry
// UI keywords and custom formats that strict mode would reject.
const ajv = new Ajv({
  useDefaults: true,
  strict: false,
  validateFormats: false,
});

export function createDefaultDataFromDataSchema(
  dataSchema: Record<string, unknown>
): Record<string, unknown> {
  const defaultData: Record<string, unknown> = {};
  try {
    ajv.compile(dataSchema)(defaultData);
  } finally {
    // Prevent Ajv from retaining the schema in its cache so it doesn't bloat memory.
    ajv.removeSchema(dataSchema);
  }
  return defaultData;
}
