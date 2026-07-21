import {
  ApiOperation,
  Authenticated,
  Body,
  Controller,
  Delete,
  Get,
  getRequestUser,
  LoggingInterceptor,
  Param,
  Patch,
  Post,
  Req,
  SerializeWith,
  Tag,
  UseInterceptor,
} from 'fastify-decorators-routing';
import type { FastifyRequest } from 'fastify';
import { CreateTodoDto, UpdateTodoDto } from './todo.dto.js';
import { TodoResponseDto } from './todo-response.dto.js';
import { TodoService } from './todo.service.js';

/** Every route below requires a `request.user` (`registerFakeAuth`, in `main.ts`) and responds
 *  through `TodoResponseDto`, so a todo's internal `ownerId` never leaks into a response. */
function ownerId(request: FastifyRequest): string {
  return (getRequestUser(request) as { id: string }).id;
}

@Tag('todos')
@Authenticated()
@UseInterceptor(LoggingInterceptor)
@Controller('/todos')
export class TodoController {
  public constructor(private readonly todos: TodoService) {}

  @Get('/')
  @ApiOperation({ summary: 'List every todo owned by the caller' })
  @SerializeWith(TodoResponseDto)
  public list(@Req() request: FastifyRequest): readonly unknown[] {
    return this.todos.list(ownerId(request));
  }

  @Get('/:id', { name: 'todo.detail' })
  @ApiOperation({ summary: 'Get one todo by id' })
  @SerializeWith(TodoResponseDto)
  public getOne(@Param('id') id: string, @Req() request: FastifyRequest): unknown {
    return this.todos.get(id, ownerId(request));
  }

  @Post('/')
  @ApiOperation({ summary: 'Create a todo' })
  @SerializeWith(TodoResponseDto)
  public create(@Body() body: CreateTodoDto, @Req() request: FastifyRequest): unknown {
    return this.todos.create(body.title, ownerId(request));
  }

  @Patch('/:id')
  @ApiOperation({ summary: "Update a todo's title and/or done state" })
  @SerializeWith(TodoResponseDto)
  public update(
    @Param('id') id: string,
    @Body() body: UpdateTodoDto,
    @Req() request: FastifyRequest,
  ): unknown {
    return this.todos.update(id, ownerId(request), body);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Delete a todo' })
  public delete(@Param('id') id: string, @Req() request: FastifyRequest): object {
    this.todos.delete(id, ownerId(request));
    return { deleted: true };
  }
}
