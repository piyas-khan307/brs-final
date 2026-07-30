/**
 * @brs/contract — public surface.
 *
 * Frontends import from here and from ./client. Nothing else.
 */

export * from "./schemas.js";
export { createClient, ContractError } from "./client.js";
export type { BrsClient, ClientOptions } from "./client.js";
