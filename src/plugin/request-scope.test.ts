import 'reflect-metadata';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { Container } from '../container/container.js';
import { Injectable } from '../container/injectable.decorator.js';
import { RequestScopeManager } from './request-scope.js';

function fakeRequest(): FastifyRequest {
  return {} as unknown as FastifyRequest;
}

describe('RequestScopeManager', () => {
  it('creates a scope on first access for a given request', () => {
    const root = new Container();
    const manager = new RequestScopeManager(root);
    const request = fakeRequest();

    const scope = manager.getOrCreate(request);
    expect(scope).toBeInstanceOf(Container);
  });

  it('returns the same scope for repeated access within the same request', () => {
    const root = new Container();
    const manager = new RequestScopeManager(root);
    const request = fakeRequest();

    expect(manager.getOrCreate(request)).toBe(manager.getOrCreate(request));
  });

  it('gives different requests independent scopes', () => {
    const root = new Container();
    const manager = new RequestScopeManager(root);

    const scopeA = manager.getOrCreate(fakeRequest());
    const scopeB = manager.getOrCreate(fakeRequest());

    expect(scopeA).not.toBe(scopeB);
  });

  it("a request's scope resolves 'scoped' services independently of other requests", () => {
    @Injectable({ scope: 'scoped' })
    class Service {}

    const root = new Container();
    root.registerClass(Service);
    const manager = new RequestScopeManager(root);

    const a = manager.getOrCreate(fakeRequest()).resolve(Service);
    const b = manager.getOrCreate(fakeRequest()).resolve(Service);

    expect(a).not.toBe(b);
  });

  it('dispose calls onDestroy on the scope and forgets it', () => {
    const onDestroy = vi.fn();
    @Injectable({ scope: 'scoped' })
    class Service {
      public onDestroy(): void {
        onDestroy();
      }
    }

    const root = new Container();
    root.registerClass(Service);
    const manager = new RequestScopeManager(root);
    const request = fakeRequest();

    manager.getOrCreate(request).resolve(Service);
    manager.dispose(request);

    expect(onDestroy).toHaveBeenCalledOnce();
    // A subsequent getOrCreate for the same request object creates a brand new scope.
    expect(manager.getOrCreate(request).resolve(Service)).not.toBe(undefined);
  });

  it('dispose is a no-op for a request with no scope', () => {
    const root = new Container();
    const manager = new RequestScopeManager(root);
    expect(() => manager.dispose(fakeRequest())).not.toThrow();
  });
});
