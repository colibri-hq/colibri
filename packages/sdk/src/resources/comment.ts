import type { Selectable } from 'kysely';
import type { User } from './authentication';
import type { Database, Schema } from '../database';

const table = 'comment' as const;

export function loadComment(database: Database, id: number | string) {
  return database
    .selectFrom(table)
    .where('id', '=', id.toString())
    .executeTakeFirstOrThrow();
}

export function loadCommentsOn<T extends Commentable = Commentable>(
  database: Database,
  entity: T,
  id: number | string,
) {
  const k1 = `${entity}_id` as const;

  return database
    .selectFrom(entity)
    .selectAll()
    // @ts-ignore
    .innerJoin(`${entity}_comment`, k1, `${entity}.id`)
    // @ts-ignore
    .innerJoin(table, `${entity}_comment.comment_id`, `comment.id`)
    .where(`${entity}.id`, '=', id.toString())
    .execute();
}

export function loadCommentsOnBook(database: Database, id: number | string) {
  return database
    .selectFrom('book')
    .selectAll()
    .innerJoin('book_comment', 'book_comment.book_id', 'book.id')
    .innerJoin(table, 'book_comment.comment_id', 'id')
    .where('book.id', '=', id.toString())
    .execute();
}

export type Comment = Omit<
  Selectable<Schema[typeof table]>,
  'created_at' | 'updated_at'
> & {
  created_at: string | Date;
  updated_at: string | Date | null;
};
export type CommentWithUser = Omit<Comment, 'created_by'> & {
  created_by: User;
};
type Reaction = Omit<
  Selectable<Schema['comment_reaction']>,
  'comment_id' | 'created_at'
> & {
  created_at: string | Date;
};
export type CommentWithReactions = Comment & {
  reactions: Reaction[];
};
export type CommentWithUserAndReactions = CommentWithUser &
  Omit<CommentWithReactions, 'created_by'>;
export type Commentable =
  | 'book'
  | 'collection'
  | 'creator'
  | 'publisher'
  | 'series';
