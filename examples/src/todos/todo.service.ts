import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from 'fastify-decorators-routing';
import type { Todo } from './todo.entity.js';

/**
 * `@Injectable()` (Phase 4) — one instance shared by every `TodoController` request, resolved
 * through the DI container. A real app would swap this in-memory `Map` for a database client;
 * nothing about `TodoController` would need to change, since it depends on `TodoService`, not on
 * how `TodoService` stores anything.
 */
@Injectable()
export class TodoService {
  private readonly todos = new Map<string, Todo>();

  public list(ownerId: string): readonly Todo[] {
    return [...this.todos.values()].filter((todo) => todo.ownerId === ownerId);
  }

  public get(id: string, ownerId: string): Todo {
    const todo = this.todos.get(id);
    if (todo?.ownerId !== ownerId) {
      throw new NotFoundException(`Todo '${id}' was not found`);
    }
    return todo;
  }

  public create(title: string, ownerId: string): Todo {
    const todo: Todo = { id: randomUUID(), title, done: false, ownerId };
    this.todos.set(todo.id, todo);
    return todo;
  }

  public update(id: string, ownerId: string, changes: { title?: string; done?: boolean }): Todo {
    const todo = this.get(id, ownerId);
    Object.assign(todo, changes);
    return todo;
  }

  public delete(id: string, ownerId: string): void {
    this.get(id, ownerId);
    this.todos.delete(id);
  }
}
