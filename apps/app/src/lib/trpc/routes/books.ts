import { relatorRoles } from "@colibri-hq/sdk/ebooks";
import { indexAsset } from "@colibri-hq/sdk/jobs";
import { downloadUrl, uploadUrl, read } from "$lib/server/storage";
import { emitImportEvent } from "$lib/server/import-events";
import { procedure, t, unguardedProcedure } from "$lib/trpc/t";
import {
  createEdition,
  createWork,
  findAssetByChecksum,
  getSettingValue,
  loadCreatorsForWork,
  loadLanguage,
  loadPublisherForWork,
  loadRatings,
  loadReviews,
  loadWork,
  loadWorks,
  updateRating,
} from "@colibri-hq/sdk";
import {
  ingestWork,
  confirmIngestion,
  type ConfirmAction,
} from "@colibri-hq/sdk/ingestion";
import {
  initializeMetadataProviders,
  globalProviderRegistry,
  MetadataCoordinator,
  PreviewGenerator,
  type MetadataPreview,
} from "@colibri-hq/sdk/metadata";
import { decodeFromBase64, generateRandomUuid } from "@colibri-hq/shared";
import { z } from "zod";

export const books = t.router({
  list: unguardedProcedure()
    .input(
      z.object({
        query: z.string().optional(),
      }),
    )
    .query(({ input, ctx: { database } }) => loadWorks(database, input.query)),

  load: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) => loadWork(database, input)),

  loadCreators: procedure()
    .input(z.object({ workId: z.string(), editionId: z.string().optional() }))
    .query(({ input: { workId, editionId }, ctx: { database } }) =>
      loadCreatorsForWork(database, workId, editionId),
    ),

  loadPublisher: procedure()
    .input(z.object({ workId: z.string(), editionId: z.string().optional() }))
    .query(({ input: { workId, editionId }, ctx: { database } }) =>
      loadPublisherForWork(database, workId, editionId),
    ),

  loadRatings: procedure()
    .input(z.object({ workId: z.string() }))
    .query(async ({ input: { workId }, ctx: { database } }) =>
      loadRatings(database, workId),
    ),

  updateRating: procedure()
    .input(z.object({ workId: z.string(), rating: z.number() }))
    .mutation(
      async ({ input: { workId, rating }, ctx: { database, userId } }) =>
        updateRating(database, workId, userId, rating),
    ),

  loadReviews: procedure()
    .input(z.object({ workId: z.string(), editionId: z.string().optional() }))
    .query(({ input: { workId, editionId }, ctx: { database } }) =>
      loadReviews(database, workId, editionId),
    ),

  save: procedure()
    .input(
      z.object({
        id: z.string().nullable().optional(),
        title: z.string().optional(),
        rating: z.number({ coerce: true }).optional(),
        description: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input: { id }, ctx: { database } }) => {
      if (!id) {
        throw new Error("Works must not be created via the JSON API");
      }
      // TODO: Implement work update via SDK
    }),

  delete: procedure()
    .input(z.string())
    .mutation(async ({ input: id, ctx: { database } }) => {
      // TODO: Implement work deletion via SDK
    }),

  create: procedure()
    .input(
      z.object({
        asset: z.object({
          checksum: z
            .string()
            .base64()
            .transform((value) => decodeFromBase64(value)),
          mimeType: z.string().optional(),
          size: z.number().positive(),
        }),
        title: z.string().optional().default("Untitled Book"),
        sortingKey: z.string().optional(),
        synopsis: z.string().optional(),
        rating: z.number({ coerce: true }).optional(),
        language: z.string().optional(),
        legalInformation: z.string().optional(),
        numberOfPages: z.number().optional(),
        contributors: z
          .array(
            z.object({
              name: z.string(),
              roles: z.enum(relatorRoles).array(),
              sortingKey: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(
      async ({
        input: {
          numberOfPages,
          legalInformation,
          sortingKey,
          rating,
          title,
          language: languageCode,
          synopsis,
          asset,
        },
        ctx: { userId, database, storage },
      }) => {
        const checksum = asset.checksum;
        const existingAsset = await findAssetByChecksum(database, checksum);

        if (existingAsset) {
          return null;
        }

        const language = languageCode
          ? await loadLanguage(database, languageCode)
          : undefined;

        const { workId, editionId } = await database
          .transaction()
          .execute(async (trx) => {
            // TODO: Check if contributors exist
            // TODO: Create contributors, one by one

            // TODO: Check if book exists
            const { id: workId } = await createWork(trx, userId);

            // TODO: Check if edition exists, by comparing unique identifiers like
            //       the ISBN. If we don't have an ISBN, we will import the book as
            //       a duplicate and rely on the suggestion queue to merge them.
            const { id: editionId } = await createEdition(trx, workId, {
              title,
              synopsis: synopsis,
              language: language?.iso_639_3,
              legalInformation,
              pages: numberOfPages,
              sortingKey: sortingKey ?? title,
            });

            // TODO: Update main edition for book
            // TODO: Create rating

            // TODO: Create publisher

            if (rating) {
              await updateRating(trx, workId, userId, rating);
            }

            return { workId, editionId };
          });

        const assetUrl = await uploadUrl(
          await storage,
          `${workId}-${editionId}.epub`,
          3600,
          checksum,
          { title },
        );

        return { assetUrl };
      },
    ),

  /**
   * Get a presigned upload URL for a book file.
   * This endpoint checks for exact duplicates by checksum before returning a URL.
   * If a duplicate is found, returns the existing asset info instead of an upload URL.
   */
  getUploadUrl: procedure()
    .input(
      z.object({
        uploadId: z.string(),
        checksum: z
          .string()
          .base64()
          .transform((value) => decodeFromBase64(value)),
        mimeType: z.string().optional(),
        size: z.number().positive(),
        filename: z.string(),
      }),
    )
    .mutation(
      async ({
        input: { uploadId, checksum, mimeType, size, filename },
        ctx: { userId, database, storage },
      }) => {
        // Check for exact duplicate by checksum
        const existingAsset = await findAssetByChecksum(database, checksum);

        if (existingAsset) {
          // Emit duplicate event
          emitImportEvent(userId, {
            type: "skipped",
            uploadId,
            reason: "Exact duplicate file already exists in library",
          });

          return {
            duplicate: true as const,
            existingAssetId: existingAsset.id,
          };
        }

        // Generate a unique S3 key for this upload
        // Sanitize filename for S3 key (remove/replace problematic characters)
        const extension = filename.includes(".")
          ? filename.slice(filename.lastIndexOf("."))
          : "";
        const sanitizedFilename =
          filename
            .slice(0, filename.length - extension.length)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
            .replace(/[&]/g, "and")
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .replace(/_+/g, "_")
            .slice(0, 100) + extension;
        const s3Key = `uploads/${generateRandomUuid()}-${sanitizedFilename}`;

        const url = await uploadUrl(
          await storage,
          s3Key,
          3600, // 1 hour expiry
          checksum,
          { originalFilename: filename },
        );

        return {
          duplicate: false as const,
          uploadUrl: url,
          s3Key,
        };
      },
    ),

  /**
   * Trigger server-side ingestion after the file has been uploaded to S3.
   * This uses the full SDK ingestion logic with duplicate detection,
   * contributor processing, and cover handling.
   */
  ingest: procedure()
    .input(
      z.object({
        uploadId: z.string(),
        s3Key: z.string(),
        filename: z.string(),
      }),
    )
    .mutation(
      async ({
        input: { uploadId, s3Key, filename },
        ctx: { userId, database, storage },
      }) => {
        try {
          // Emit progress event
          emitImportEvent(userId, {
            type: "progress",
            uploadId,
            stage: "ingesting",
          });

          // Download the file from S3
          const fileBuffer = await read(await storage, s3Key);
          // Convert Uint8Array to ArrayBuffer for File constructor
          const arrayBuffer = fileBuffer.buffer.slice(
            fileBuffer.byteOffset,
            fileBuffer.byteOffset + fileBuffer.byteLength,
          ) as ArrayBuffer;
          const file = new File([arrayBuffer], filename);

          // Use the SDK ingestion function
          const result = await ingestWork(database, file, {
            userId,
            onDuplicateEdition: "prompt",
            onDuplicateWork: "prompt",
          });

          // Emit appropriate event based on result
          switch (result.status) {
            case "created":
            case "added-edition":
              emitImportEvent(userId, {
                type: "completed",
                uploadId,
                workId: result.work!.id,
                editionId: result.edition!.id,
                title: result.edition!.title,
              });

              // Trigger async enrichment (fire and forget)
              triggerAsyncEnrichment(
                database,
                result.work!.id,
                result.edition!.title,
                userId,
              ).catch((err) => {
                console.warn("Background enrichment failed:", err);
              });

              // Trigger async content indexing for full-text search (fire and forget)
              // We have the file already loaded, so we can index directly
              if (result.asset) {
                indexAsset(
                  database,
                  result.asset.id,
                  file,
                  result.asset.media_type,
                ).catch((err) => {
                  console.warn("Background content indexing failed:", err);
                });
              }
              break;

            case "skipped":
              emitImportEvent(userId, {
                type: "skipped",
                uploadId,
                reason: result.warnings[0] ?? "Duplicate detected",
              });
              break;

            case "needs-confirmation":
              emitImportEvent(userId, {
                type: "duplicate",
                uploadId,
                pendingId: result.pendingId!,
                duplicateInfo: result.duplicateInfo!,
              });
              break;
          }

          return {
            status: result.status,
            workId: result.work?.id,
            editionId: result.edition?.id,
            pendingId: result.pendingId,
            warnings: result.warnings,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          emitImportEvent(userId, {
            type: "failed",
            uploadId,
            error: message,
          });
          throw error;
        }
      },
    ),

  /**
   * Confirm how to handle a duplicate detection result.
   * Called after user chooses an action from the duplicate prompt.
   */
  confirmDuplicate: procedure()
    .input(
      z.object({
        uploadId: z.string(),
        pendingId: z.string(),
        action: z.enum(["skip", "create-work", "create-edition"]),
      }),
    )
    .mutation(
      async ({
        input: { uploadId, pendingId, action },
        ctx: { userId, database, storage },
      }) => {
        try {
          const result = await confirmIngestion(
            database,
            pendingId,
            action as ConfirmAction,
          );

          // Emit appropriate event based on result
          switch (result.status) {
            case "created":
            case "added-edition":
              emitImportEvent(userId, {
                type: "completed",
                uploadId,
                workId: result.work!.id,
                editionId: result.edition!.id,
                title: result.edition!.title,
              });

              // Trigger async enrichment (fire and forget)
              triggerAsyncEnrichment(
                database,
                result.work!.id,
                result.edition!.title,
                userId,
              ).catch((err) => {
                console.warn("Background enrichment failed:", err);
              });

              // Trigger async content indexing for full-text search (fire and forget)
              // Need to fetch file from storage since we don't have it here
              if (result.asset) {
                triggerAsyncIndexing(
                  database,
                  storage,
                  result.asset.id,
                  result.asset.media_type,
                ).catch((err) => {
                  console.warn("Background content indexing failed:", err);
                });
              }
              break;

            case "skipped":
              emitImportEvent(userId, {
                type: "skipped",
                uploadId,
                reason: "Skipped by user",
              });
              break;
          }

          return {
            status: result.status,
            workId: result.work?.id,
            editionId: result.edition?.id,
            warnings: result.warnings,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          emitImportEvent(userId, {
            type: "failed",
            uploadId,
            error: message,
          });
          throw error;
        }
      },
    ),

  // ============================================================
  // Enrichment Routes
  // ============================================================

  /**
   * Get pending enrichment preview for a work.
   * Returns null if no pending enrichment exists.
   */
  getEnrichmentPreview: procedure()
    .input(z.object({ workId: z.string() }))
    .query(async ({ input: { workId }, ctx: { database } }) => {
      const result = await database
        .selectFrom("enrichment_result")
        .selectAll()
        .where("work_id", "=", workId)
        .where("status", "=", "pending")
        .executeTakeFirst();

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        workId: result.work_id,
        createdAt: result.created_at,
        preview: result.preview as MetadataPreview,
        improvements: result.improvements as Record<string, unknown>,
        sources: result.sources,
      };
    }),

  /**
   * Apply enrichment improvements to a work.
   * Updates the edition with selected field improvements.
   */
  applyEnrichment: procedure()
    .input(
      z.object({
        enrichmentId: z.string(),
        selectedFields: z.array(z.string()).optional(),
      }),
    )
    .mutation(
      async ({
        input: { enrichmentId, selectedFields },
        ctx: { database, userId },
      }) => {
        // Load enrichment result
        const enrichment = await database
          .selectFrom("enrichment_result")
          .selectAll()
          .where("id", "=", enrichmentId)
          .where("status", "=", "pending")
          .executeTakeFirstOrThrow();

        const preview = enrichment.preview as MetadataPreview;
        const improvements = enrichment.improvements as Record<string, unknown>;

        // Build update object based on selected fields (or all if not specified)
        const fieldsToApply = selectedFields ?? Object.keys(improvements);
        const updates: Record<string, unknown> = {};

        for (const field of fieldsToApply) {
          if (field in improvements) {
            updates[field] = improvements[field];
          }
        }

        // Load work to get edition ID
        const work = await loadWork(database, enrichment.work_id);

        // Apply updates to edition
        if (Object.keys(updates).length > 0) {
          const editionUpdates: Record<string, unknown> = {};

          // Map preview fields to edition columns
          if (updates.title) editionUpdates.title = updates.title;
          if (updates.synopsis) editionUpdates.synopsis = updates.synopsis;
          if (updates.description)
            editionUpdates.synopsis = (
              updates.description as { text?: string }
            )?.text;
          if (updates.pages) editionUpdates.pages = updates.pages;
          if (updates.language) editionUpdates.language = updates.language;

          // Handle ISBN updates
          if (updates.isbn) {
            const isbns = updates.isbn as string[];
            for (const isbn of isbns) {
              const clean = isbn.replace(/[-\s]/g, "");
              if (clean.length === 10) editionUpdates.isbn_10 = clean;
              if (clean.length === 13) editionUpdates.isbn_13 = clean;
            }
          }

          if (Object.keys(editionUpdates).length > 0) {
            await database
              .updateTable("edition")
              .set({
                ...editionUpdates,
                updated_at: new Date(),
              })
              .where("id", "=", work.edition_id)
              .execute();
          }
        }

        // Mark enrichment as applied
        await database
          .updateTable("enrichment_result")
          .set({
            status: "applied",
            applied_at: new Date(),
          })
          .where("id", "=", enrichmentId)
          .execute();

        return {
          success: true,
          appliedFields: fieldsToApply,
        };
      },
    ),

  /**
   * Dismiss enrichment without applying.
   */
  dismissEnrichment: procedure()
    .input(z.object({ enrichmentId: z.string() }))
    .mutation(async ({ input: { enrichmentId }, ctx: { database } }) => {
      await database
        .updateTable("enrichment_result")
        .set({
          status: "dismissed",
          dismissed_at: new Date(),
        })
        .where("id", "=", enrichmentId)
        .where("status", "=", "pending")
        .execute();

      return { success: true };
    }),

  /**
   * Manually trigger metadata enrichment for a work.
   * Fetches metadata from external providers and stores results for review.
   */
  triggerEnrichment: procedure()
    .input(z.object({ workId: z.string() }))
    .mutation(async ({ input: { workId }, ctx: { database, userId } }) => {
      // Load work details
      const work = await loadWork(database, workId);
      const creators = await loadCreatorsForWork(database, workId);

      // Emit start event
      emitImportEvent(userId, {
        type: "enrichment-started",
        workId,
        title: work.title ?? "Untitled",
      });

      try {
        // Initialize metadata providers (registers them to global registry)
        await initializeMetadataProviders(database);

        // Get enabled providers from the registry
        const providers = globalProviderRegistry.getEnabledProviders();

        if (providers.length === 0) {
          throw new Error("No metadata providers available");
        }

        // Build query from work data
        const authorNames = creators
          .filter((c) => c.essential)
          .map((c) => c.name);

        const query = {
          title: work.title ?? undefined,
          authors: authorNames.length > 0 ? authorNames : undefined,
          isbn: work.isbn_13 ?? work.isbn_10 ?? undefined,
        };

        // Query providers
        const coordinator = new MetadataCoordinator(providers, {
          globalTimeout: 30000,
          providerTimeout: 10000,
        });
        const result = await coordinator.query(query);

        if (result.aggregatedRecords.length === 0) {
          emitImportEvent(userId, {
            type: "enrichment-failed",
            workId,
            error: "No metadata found from any provider",
          });
          return { success: false, error: "No metadata found" };
        }

        // Generate preview
        const generator = new PreviewGenerator();
        const preview = generator.generatePreview(result.aggregatedRecords);

        // Calculate improvements (fields that differ from current work)
        const improvements = calculateImprovements(work, preview);
        const improvementCount = Object.keys(improvements).length;
        const hasConflicts = preview.summary.conflictedFields > 0;
        const sources = preview.sources.map((s) => s.name);

        // Store enrichment result
        await database
          .insertInto("enrichment_result")
          .values({
            work_id: workId,
            user_id: userId,
            preview: JSON.stringify(preview),
            improvements: JSON.stringify(improvements),
            sources,
          })
          .onConflict((oc) =>
            oc
              .column("work_id")
              .where("status", "=", "pending")
              .doUpdateSet({
                preview: JSON.stringify(preview),
                improvements: JSON.stringify(improvements),
                sources,
                created_at: new Date(),
              }),
          )
          .execute();

        // Emit completion event
        emitImportEvent(userId, {
          type: "enrichment-completed",
          workId,
          title: work.title ?? "Untitled",
          improvementCount,
          hasConflicts,
          sources,
        });

        return {
          success: true,
          improvementCount,
          hasConflicts,
          sources,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        emitImportEvent(userId, {
          type: "enrichment-failed",
          workId,
          error: message,
        });
        throw error;
      }
    }),

  /**
   * Check if a work has pending enrichment.
   */
  hasEnrichment: procedure()
    .input(z.object({ workId: z.string() }))
    .query(async ({ input: { workId }, ctx: { database } }) => {
      const result = await database
        .selectFrom("enrichment_result")
        .select(["id", "created_at", "sources"])
        .select((eb) =>
          eb
            .cast<number>(
              eb.fn("jsonb_object_length", [eb.ref("improvements")]),
              "integer",
            )
            .as("improvement_count"),
        )
        .where("work_id", "=", workId)
        .where("status", "=", "pending")
        .executeTakeFirst();

      if (!result) {
        return { hasEnrichment: false };
      }

      return {
        hasEnrichment: true,
        enrichmentId: result.id,
        createdAt: result.created_at,
        improvementCount: result.improvement_count ?? 0,
        sources: result.sources,
      };
    }),
});

/**
 * Trigger async enrichment for a newly imported work.
 * This runs in the background and doesn't block the import response.
 */
async function triggerAsyncEnrichment(
  database: Parameters<typeof loadWork>[0],
  workId: string,
  title: string,
  userId: string,
): Promise<void> {
  // Check if enrichment is enabled
  const enrichmentEnabled = await getSettingValue(
    database,
    "urn:colibri:settings:metadata:enrichment-enabled",
  );

  if (!enrichmentEnabled) {
    console.debug("Metadata enrichment is disabled by settings");
    return;
  }

  // Emit start event
  emitImportEvent(userId, {
    type: "enrichment-started",
    workId,
    title,
  });

  try {
    // Initialize metadata providers (registers them to global registry)
    await initializeMetadataProviders(database);

    // Get enabled providers from the registry
    const providers = globalProviderRegistry.getEnabledProviders();

    if (providers.length === 0) {
      console.debug("No metadata providers available for enrichment");
      return;
    }

    // Load work and creators for query building
    const work = await loadWork(database, workId);
    const creators = await loadCreatorsForWork(database, workId);
    const authorNames = creators.filter((c) => c.essential).map((c) => c.name);

    const query = {
      title: work.title ?? undefined,
      authors: authorNames.length > 0 ? authorNames : undefined,
      isbn: work.isbn_13 ?? work.isbn_10 ?? undefined,
    };

    // Query providers
    const coordinator = new MetadataCoordinator(providers, {
      globalTimeout: 30000,
      providerTimeout: 10000,
    });
    const result = await coordinator.query(query);

    if (result.aggregatedRecords.length === 0) {
      console.debug("No metadata found for enrichment");
      return;
    }

    // Generate preview
    const generator = new PreviewGenerator();
    const preview = generator.generatePreview(result.aggregatedRecords);

    // Calculate improvements
    const improvements = calculateImprovements(work, preview);
    const improvementCount = Object.keys(improvements).length;

    if (improvementCount === 0) {
      console.debug("No improvements found during enrichment");
      return;
    }

    const hasConflicts = preview.summary.conflictedFields > 0;
    const sources = preview.sources.map((s) => s.name);

    // Store enrichment result
    await database
      .insertInto("enrichment_result")
      .values({
        work_id: workId,
        user_id: userId,
        preview: JSON.stringify(preview),
        improvements: JSON.stringify(improvements),
        sources,
      })
      .onConflict((oc) =>
        oc
          .column("work_id")
          .where("status", "=", "pending")
          .doUpdateSet({
            preview: JSON.stringify(preview),
            improvements: JSON.stringify(improvements),
            sources,
            created_at: new Date(),
          }),
      )
      .execute();

    // Emit completion event
    emitImportEvent(userId, {
      type: "enrichment-completed",
      workId,
      title,
      improvementCount,
      hasConflicts,
      sources,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    emitImportEvent(userId, {
      type: "enrichment-failed",
      workId,
      error: message,
    });
    // Don't throw - this is background enrichment
    console.error("Async enrichment failed:", error);
  }
}

/**
 * Calculate which fields from the preview improve upon the current work data.
 */
function calculateImprovements(
  work: Awaited<ReturnType<typeof loadWork>>,
  preview: MetadataPreview,
): Record<string, unknown> {
  const improvements: Record<string, unknown> = {};

  // Check each field - only include if preview has data and work lacks it or preview is better
  if (preview.title.value && preview.title.confidence > 0.8 && !work.title) {
    improvements.title = preview.title.value;
  }

  if (
    preview.description.value?.text &&
    preview.description.confidence > 0.7 &&
    !work.synopsis
  ) {
    improvements.description = preview.description.value;
  }

  if (
    preview.publicationDate.value &&
    preview.publicationDate.confidence > 0.7 &&
    !work.published_at
  ) {
    improvements.publicationDate = preview.publicationDate.value;
  }

  if (
    preview.language.value &&
    preview.language.confidence > 0.8 &&
    !work.language
  ) {
    improvements.language = preview.language.value;
  }

  if (
    preview.physicalDescription.value?.pageCount &&
    preview.physicalDescription.confidence > 0.7 &&
    !work.pages
  ) {
    improvements.pages = preview.physicalDescription.value.pageCount;
  }

  // Check for new ISBNs
  if (preview.isbn.value && preview.isbn.value.length > 0) {
    const hasIsbn = work.isbn_10 || work.isbn_13;
    if (!hasIsbn) {
      improvements.isbn = preview.isbn.value;
    }
  }

  // Add subjects if we have high confidence
  if (
    preview.subjects.value &&
    preview.subjects.value.length > 0 &&
    preview.subjects.confidence > 0.6
  ) {
    improvements.subjects = preview.subjects.value;
  }

  // Add series if we have high confidence
  if (
    preview.series.value &&
    preview.series.value.length > 0 &&
    preview.series.confidence > 0.7
  ) {
    improvements.series = preview.series.value;
  }

  return improvements;
}

/**
 * Trigger async content indexing for a newly created asset.
 * This runs in the background and doesn't block the response.
 * Used when we don't have the file in memory and need to fetch from storage.
 */
async function triggerAsyncIndexing(
  database: Parameters<typeof loadWork>[0],
  storage: Promise<Parameters<typeof read>[0]>,
  assetId: string,
  mediaType: string,
): Promise<void> {
  try {
    // Get the asset's storage reference
    const asset = await database
      .selectFrom("asset")
      .select(["storage_reference", "filename"])
      .where("id", "=", assetId)
      .executeTakeFirst();

    if (!asset) {
      console.warn(`Asset ${assetId} not found for indexing`);
      return;
    }

    // Fetch the file from storage
    const fileBuffer = await read(await storage, asset.storage_reference);
    // Convert Uint8Array to ArrayBuffer for File constructor
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    ) as ArrayBuffer;
    const file = new File([arrayBuffer], asset.filename ?? "ebook", {
      type: mediaType,
    });

    // Index the asset
    await indexAsset(database, assetId, file, mediaType);
  } catch (error) {
    // Don't throw - this is background indexing
    console.error("Async content indexing failed:", error);
  }
}
