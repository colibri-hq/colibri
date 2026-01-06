/**
 * Type-only exports from the SDK.
 *
 * These exports contain NO runtime code and are safe to import in browser code.
 * Use this entry point when you only need TypeScript types.
 *
 * IMPORTANT: This file must ONLY import from .d.ts files to avoid pulling in
 * Node.js dependencies like `pg` into the client bundle.
 *
 * Usage: import type { Work, Creator, User } from "@colibri-hq/sdk/types";
 */

// Import schema types directly (this is a .d.ts file with no runtime code)
import type {
  AuthenticationAuthenticator,
  AuthenticationUser,
  Collection as SchemaCollection,
  Comment as SchemaComment,
  CommentReaction,
  CommentReport as SchemaCommentReport,
  Creator as SchemaCreator,
  Edition,
  Publisher as SchemaPublisher,
  Work as SchemaWork,
} from "./schema.js";

// Re-export schema as DB type
export type { DB as Schema } from "./schema.js";

// Work types
export type Work = SchemaWork & {
  language_name?: string;
  cover_blurhash?: string | null;
};

export type WorkWithMainEdition<T extends Work = Work> = T & Edition;

export type WorkWithCreators<T extends Work = Work> = T & {
  creators: Creator[];
};

// Creator type
export type Creator = SchemaCreator;

// Publisher type
export type Publisher = SchemaPublisher;

// Collection type
export type Collection = SchemaCollection;

// Comment types
export type Comment = Omit<
  SchemaComment,
  "created_at" | "updated_at" | "hidden_at"
> & {
  created_at: string | Date;
  updated_at: string | Date | null;
  hidden_at: string | Date | null;
};

export type CommentWithUser = Omit<Comment, "created_by"> & {
  user: User | null;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  mention_usernames?: string[];
};

export type CommentWithReactions = Comment & {
  reactions: CommentReaction[];
};

export type CommentWithUserAndReactions = CommentWithUser &
  CommentWithReactions;

export type CommentReport = SchemaCommentReport & {
  reporter_name?: string | null;
  reporter_email?: string | null;
  resolver_name?: string | null;
  resolver_email?: string | null;
  comment?: CommentWithUser;
  reporter_total_reports?: number;
};

// Moderation statistics type
export type ModerationStats = {
  totalReports: number;
  unresolvedReports: number;
  resolvedThisWeek: number;
  resolvedThisMonth: number;
  byResolution: {
    dismissed: number;
    hidden: number;
    deleted: number;
  };
  hiddenComments: number;
  topReporters: Array<{
    userId: string;
    name: string;
    email: string | null;
    count: number;
  }>;
  averageResolutionTimeHours: number | null;
};

// Moderation activity log types
export type ModerationActionType =
  | "resolve_report"
  | "reopen_report"
  | "change_resolution"
  | "hide_comment"
  | "unhide_comment"
  | "delete_comment";

export type ModerationTargetType = "report" | "comment";

export type ModerationLogEntry = {
  id: string;
  action_type: ModerationActionType;
  target_type: ModerationTargetType;
  target_id: string;
  performed_by: string;
  performer_name?: string;
  performer_email?: string;
  details: Record<string, unknown> | null;
  created_at: Date | string;
};

// Bulk resolve result type
export type BulkResolveResult = {
  resolved: number;
  failed: number;
  commentIds: string[];
};

// User type
export type User = Omit<AuthenticationUser, "created_at" | "updated_at"> & {
  created_at: string | Date;
  updated_at: string | Date | null;
};

// Authenticator type
export type Authenticator = AuthenticationAuthenticator;

// Settings types (simplified for client use)
export type SettingCategory = {
  id: string;
  label: string;
  description?: string;
  settings: Array<{
    key: string;
    label: string;
    description?: string;
    type: "boolean" | "string" | "number" | "select";
    value: unknown;
    options?: Array<{ value: string; label: string }>;
  }>;
};
