/** JSON schemas Fastify validates request bodies and parameters against (400 on mismatch). */

export const credentialsSchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', minLength: 3, maxLength: 254, pattern: '^\\s*[^\\s@]+@[^\\s@]+\\.[^\\s@]+\\s*$' },
    // Upper bound keeps scrypt work per request bounded.
    password: { type: 'string', minLength: 8, maxLength: 256 },
    turnstileToken: { type: 'string', maxLength: 2048 },
  },
} as const

/** Saved calculator state: any JSON object (the frontend validates its fields when loading). */
export const dataSchema = { type: 'object' } as const

export const projectNameSchema = { type: 'string', minLength: 1, maxLength: 100 } as const

export const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
} as const

export const createProjectSchema = {
  type: 'object',
  required: ['name', 'data'],
  additionalProperties: false,
  properties: { name: projectNameSchema, data: dataSchema },
} as const

/** A rename, new data, or both — but not nothing. */
export const updateProjectSchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: { name: projectNameSchema, data: dataSchema },
} as const

export const autosaveSchema = {
  type: 'object',
  required: ['data'],
  additionalProperties: false,
  properties: { data: dataSchema },
} as const
