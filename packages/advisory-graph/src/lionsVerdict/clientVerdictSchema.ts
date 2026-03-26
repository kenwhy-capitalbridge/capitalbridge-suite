import schema from './lionVerdictClient.schema.json';

export const LION_VERDICT_CLIENT_SCHEMA_VERSION = 4 as const;

export const LION_VERDICT_CLIENT_SCHEMA = schema as Record<string, unknown>;
