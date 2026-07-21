import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * The request body for `POST /todos`. `@Body()` in the controller validates a request against
 * this class automatically (Phase 14) — a request missing `title`, or with a `title` shorter
 * than 3 characters, is rejected with a `400` before the handler ever runs.
 */
export class CreateTodoDto {
  @IsString()
  @MinLength(3)
  public title!: string;
}

/** The request body for `PATCH /todos/:id` — every field optional, since a PATCH may update
 *  just one of them. */
export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  public title?: string;

  @IsOptional()
  @IsBoolean()
  public done?: boolean;
}
