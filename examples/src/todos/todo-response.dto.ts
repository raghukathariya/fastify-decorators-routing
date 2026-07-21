import { Expose } from 'fastify-decorators-routing';

/**
 * The shape every todo route responds with, via `@SerializeWith(TodoResponseDto)` (Phase 15).
 * `Todo` (the internal entity `TodoService` stores) also carries an `ownerId` field that should
 * never reach a client — leaving it un-`@Expose()`d here is what actually enforces that, not
 * convention or care taken in each handler.
 */
export class TodoResponseDto {
  @Expose()
  public id!: string;

  @Expose()
  public title!: string;

  @Expose()
  public done!: boolean;
}
