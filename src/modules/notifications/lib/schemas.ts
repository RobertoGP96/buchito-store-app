import { z } from "zod";
import { NOTIFICATION_CATEGORIES } from "./labels";

export const notificationPreferencesSchema = z.object({
  muted: z.array(z.enum(NOTIFICATION_CATEGORIES)).max(NOTIFICATION_CATEGORIES.length),
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
