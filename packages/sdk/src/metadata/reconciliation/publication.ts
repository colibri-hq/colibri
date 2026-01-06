import type {
  PublicationInfoInput,
  ReconciledPublicationInfo,
} from "./types.js";
import { DateReconciler } from "./dates.js";
import { PublisherReconciler } from "./publishers.js";
import { PlaceReconciler } from "./places.js";

/**
 * Main publication information reconciler that coordinates all publication-related reconciliation
 */
export class PublicationReconciler {
  private readonly dateReconciler = new DateReconciler();
  private readonly publisherReconciler = new PublisherReconciler();
  private readonly placeReconciler = new PlaceReconciler();

  /**
   * Reconcile all publication information from multiple sources
   */
  reconcilePublicationInfo(
    inputs: PublicationInfoInput[],
  ): ReconciledPublicationInfo {
    if (inputs.length === 0) {
      throw new Error("No publication information to reconcile");
    }

    // Filter inputs that have at least one piece of publication information
    const validInputs = inputs.filter(
      (input) => input.date || input.publisher || input.place,
    );

    if (validInputs.length === 0) {
      throw new Error("No valid publication information found in inputs");
    }

    // Reconcile each field independently
    const dateInputs = validInputs.filter((input) => input.date);
    const publisherInputs = validInputs.filter((input) => input.publisher);
    const placeInputs = validInputs.filter((input) => input.place);

    const result: ReconciledPublicationInfo = {
      date:
        dateInputs.length > 0
          ? this.dateReconciler.reconcileDates(dateInputs)
          : {
              value: { precision: "unknown" as const },
              confidence: 0,
              sources: [],
              reasoning: "No date information available",
            },
      publisher:
        publisherInputs.length > 0
          ? this.publisherReconciler.reconcilePublishers(publisherInputs)
          : {
              value: { name: "", normalized: "" },
              confidence: 0,
              sources: [],
              reasoning: "No publisher information available",
            },
      place:
        placeInputs.length > 0
          ? this.placeReconciler.reconcilePlaces(placeInputs)
          : {
              value: { name: "", normalized: "" },
              confidence: 0,
              sources: [],
              reasoning: "No place information available",
            },
    };

    return result;
  }

  /**
   * Get overall confidence score for the reconciled publication information
   */
  getOverallConfidence(reconciledInfo: ReconciledPublicationInfo): number {
    const weights = {
      date: 0.4,
      publisher: 0.4,
      place: 0.2,
    };

    const weightedSum =
      reconciledInfo.date.confidence * weights.date +
      reconciledInfo.publisher.confidence * weights.publisher +
      reconciledInfo.place.confidence * weights.place;

    return Math.max(0, Math.min(1, weightedSum));
  }

  /**
   * Get a summary of all conflicts found during reconciliation
   */
  getAllConflicts(reconciledInfo: ReconciledPublicationInfo) {
    const conflicts = [];

    if (reconciledInfo.date.conflicts) {
      conflicts.push(...reconciledInfo.date.conflicts);
    }

    if (reconciledInfo.publisher.conflicts) {
      conflicts.push(...reconciledInfo.publisher.conflicts);
    }

    if (reconciledInfo.place.conflicts) {
      conflicts.push(...reconciledInfo.place.conflicts);
    }

    return conflicts;
  }

  /**
   * Get all unique sources that contributed to the reconciled information
   */
  getAllSources(reconciledInfo: ReconciledPublicationInfo) {
    const sources = new Map();

    for (const source of reconciledInfo.date.sources) {
      sources.set(source.name, source);
    }

    for (const source of reconciledInfo.publisher.sources) {
      sources.set(source.name, source);
    }

    for (const source of reconciledInfo.place.sources) {
      sources.set(source.name, source);
    }

    return Array.from(sources.values());
  }
}
