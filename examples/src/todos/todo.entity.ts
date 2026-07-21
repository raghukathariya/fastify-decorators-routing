export interface Todo {
  readonly id: string;
  title: string;
  done: boolean;
  /** Never exposed in a response — see `TodoResponseDto`. */
  readonly ownerId: string;
}
