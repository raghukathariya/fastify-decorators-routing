import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  After,
  Before,
  OnRequest,
  OnSend,
  PreHandler,
  PreParsing,
  PreValidation,
  getRouteOnRequestHooks,
  getRouteOnSendHooks,
  getRoutePreHandlerHooks,
  getRoutePreParsingHooks,
  getRoutePreValidationHooks,
} from './route-hooks.decorator.js';

const noop = (): void => {
  // intentionally empty
};

describe('@OnRequest', () => {
  it('records a single hook for the decorated method', () => {
    class Controller {
      @OnRequest(noop)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteOnRequestHooks(Controller.prototype, 'handle')).toEqual([noop]);
  });

  it('accumulates hooks across repeated applications, in argument order', () => {
    const a = (): void => {
      // intentionally empty
    };
    const b = (): void => {
      // intentionally empty
    };

    class Controller {
      @OnRequest(b)
      @OnRequest(a)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteOnRequestHooks(Controller.prototype, 'handle')).toEqual([a, b]);
  });

  it('records multiple hooks passed to one call, in argument order', () => {
    const a = (): void => {
      // intentionally empty
    };
    const b = (): void => {
      // intentionally empty
    };

    class Controller {
      @OnRequest(a, b)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteOnRequestHooks(Controller.prototype, 'handle')).toEqual([a, b]);
  });

  it('keeps hooks for different methods independent', () => {
    const a = (): void => {
      // intentionally empty
    };

    class Controller {
      @OnRequest(a)
      public handle(): void {
        // intentionally empty
      }

      public other(): void {
        // intentionally empty
      }
    }

    expect(getRouteOnRequestHooks(Controller.prototype, 'handle')).toEqual([a]);
    expect(getRouteOnRequestHooks(Controller.prototype, 'other')).toEqual([]);
  });

  it('inherits a hook for a method not overridden by a subclass', () => {
    class Base {
      @OnRequest(noop)
      public handle(): void {
        // intentionally empty
      }
    }
    class Sub extends Base {}

    expect(getRouteOnRequestHooks(Sub.prototype, 'handle')).toEqual([noop]);
  });

  it('returns an empty array for a method with no @OnRequest', () => {
    class Controller {
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteOnRequestHooks(Controller.prototype, 'handle')).toEqual([]);
  });
});

describe('@PreParsing', () => {
  it('records a hook independently of the other hook kinds', () => {
    class Controller {
      @PreParsing(noop)
      @OnRequest(noop)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRoutePreParsingHooks(Controller.prototype, 'handle')).toEqual([noop]);
    expect(getRouteOnRequestHooks(Controller.prototype, 'handle')).toEqual([noop]);
  });
});

describe('@PreValidation', () => {
  it('records a hook for the decorated method', () => {
    class Controller {
      @PreValidation(noop)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRoutePreValidationHooks(Controller.prototype, 'handle')).toEqual([noop]);
  });
});

describe('@PreHandler / @Before', () => {
  it('records a @PreHandler hook', () => {
    class Controller {
      @PreHandler(noop)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRoutePreHandlerHooks(Controller.prototype, 'handle')).toEqual([noop]);
  });

  it('@Before is the exact same decorator as @PreHandler, composing together', () => {
    const a = (): void => {
      // intentionally empty
    };
    const b = (): void => {
      // intentionally empty
    };

    class Controller {
      @Before(b)
      @PreHandler(a)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRoutePreHandlerHooks(Controller.prototype, 'handle')).toEqual([a, b]);
    expect(Before).toBe(PreHandler);
  });
});

describe('@OnSend / @After', () => {
  it('records an @OnSend hook', () => {
    class Controller {
      @OnSend(noop)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteOnSendHooks(Controller.prototype, 'handle')).toEqual([noop]);
  });

  it('@After is the exact same decorator as @OnSend, composing together', () => {
    const a = (): void => {
      // intentionally empty
    };
    const b = (): void => {
      // intentionally empty
    };

    class Controller {
      @After(b)
      @OnSend(a)
      public handle(): void {
        // intentionally empty
      }
    }

    expect(getRouteOnSendHooks(Controller.prototype, 'handle')).toEqual([a, b]);
    expect(After).toBe(OnSend);
  });
});
