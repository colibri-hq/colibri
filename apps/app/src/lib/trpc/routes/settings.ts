import { adminProcedure } from "$lib/trpc/middleware/admin";
import { procedure, t } from "$lib/trpc/t";
import {
  exportSettings,
  getAllSettingsFlat,
  getSetting,
  getSettingDefinition,
  importSettings,
  isValidSettingKey,
  resetSetting,
  setSetting,
  type SettingKey,
} from "@colibri-hq/sdk";
import { z } from "zod";

export const settings = t.router({
  /**
   * Get a single setting value by key.
   * Available to all authenticated users.
   */
  get: procedure()
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!isValidSettingKey(input.key)) {
        throw new Error(`Unknown setting key: ${input.key}`);
      }
      return getSetting(ctx.database, input.key);
    }),

  /**
   * List all settings with their current values and definitions.
   * Admin only.
   */
  list: adminProcedure().query(async ({ ctx }) => {
    return getAllSettingsFlat(ctx.database);
  }),

  /**
   * Set a setting value.
   * Admin only.
   */
  set: adminProcedure()
    .input(z.object({ key: z.string(), value: z.unknown() }))
    .mutation(async ({ ctx, input }) => {
      if (!isValidSettingKey(input.key)) {
        throw new Error(`Unknown setting key: ${input.key}`);
      }

      const definition = getSettingDefinition(input.key);
      const result = definition.validation.safeParse(input.value);

      if (!result.success) {
        throw new Error(`Invalid value: ${result.error.message}`);
      }

      await setSetting(
        ctx.database,
        input.key,
        result.data as (typeof definition)["default"],
        ctx.userId,
      );

      return { success: true };
    }),

  /**
   * Reset a setting to its default value.
   * Admin only.
   */
  reset: adminProcedure()
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isValidSettingKey(input.key)) {
        throw new Error(`Unknown setting key: ${input.key}`);
      }

      await resetSetting(ctx.database, input.key, ctx.userId);

      const definition = getSettingDefinition(input.key);
      return { success: true, defaultValue: definition.default };
    }),

  /**
   * Export all settings as JSON.
   * Admin only.
   */
  export: adminProcedure().query(async ({ ctx }) => {
    return exportSettings(ctx.database);
  }),

  /**
   * Import settings from JSON.
   * Admin only.
   */
  import: adminProcedure()
    .input(z.object({ data: z.record(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      return importSettings(ctx.database, input.data, ctx.userId);
    }),
});
