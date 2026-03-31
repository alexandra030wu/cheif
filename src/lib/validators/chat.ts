import { z } from "zod";

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  ingredients: z.array(z.string()),
  timeOfDay: z.enum(["morning", "noon", "evening", "latenight"]),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
