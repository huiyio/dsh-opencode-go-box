// Hand-written Typert host manifest for the opencodeUsage Remote.
// The typert-loader imports this via package.json exports["./typert"] and
// registers it into ctx.typert.local, which the Host gateway uses to claim
// and dispatch the "opencodeUsage/usage" endpoint in strict mode.
import { z } from "zod";

const windowSchema = z.object({
  status: z.string().nullable(),
  percent: z.number().nullable(),
  resetsAt: z.string().nullable(),
});

const resultSchema = z.object({
  configured: z.boolean(),
  reason: z.string().nullable(),
  error: z.string().nullable(),
  usage: z.object({
    rolling: windowSchema.nullable(),
    weekly: windowSchema.nullable(),
    monthly: windowSchema.nullable(),
  }).nullable(),
});

export const TYPERT = {
  package: "dsh-opencode-go-usage",
  face: "host",
  schemas: [],
  invocations: [
    {
      id: "dsh-opencode-go-usage#opencodeUsage/usage",
      service: "opencodeUsage",
      namespace: "opencodeUsage",
      method: "usage",
      invocation: { kind: "direct" },
      parameters: [],
      result: {
        mode: "strict",
        typeSymbol: "dsh-opencode-go-usage#OpencodeUsageResult",
        schema: resultSchema,
      },
    },
  ],
  model: { services: [], events: [], objects: [] },
};
