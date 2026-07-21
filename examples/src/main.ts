import 'reflect-metadata';
import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { Container, registerControllers } from 'fastify-decorators-routing';
import { registerFakeAuth } from './auth/fake-auth-plugin.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { TodoController } from './todos/todo.controller.js';
import { TodoService } from './todos/todo.service.js';

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(fastifySwagger, {
    openapi: { info: { title: 'Todo API', version: '1.0.0' } },
  });
  await app.register(fastifySwaggerUi, { routePrefix: '/documentation' });

  registerFakeAuth(app);

  // registerControllers auto-registers each *controller* class on the container for you, but has
  // no way to know what a controller's own dependencies are ahead of time — those are registered
  // here, the same way you would for any DI-managed class.
  const container = new Container();
  container.registerClass(TodoService);

  await app.register(registerControllers, {
    controllers: [TodoController],
    filters: [new HttpExceptionFilter()],
    container,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`Try: curl -H "Authorization: Bearer demo-user" http://localhost:${port}/todos`);
  app.log.info(`API docs: http://localhost:${port}/documentation`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
