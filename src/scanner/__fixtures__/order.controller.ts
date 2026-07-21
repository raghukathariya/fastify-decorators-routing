import { Controller } from '../../decorators/controller.decorator.js';

@Controller('/orders')
export class OrderController {}

@Controller('/invoices')
export class InvoiceController {}

/** Not a controller — exercises that non-controller exports are filtered out, not just skipped by luck. */
export class OrderService {}

export const ORDER_CONSTANT = 42;
