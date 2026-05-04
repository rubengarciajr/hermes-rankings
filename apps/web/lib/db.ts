import "server-only";
import { getDb, schema } from "@hermesranker/db";

/**
 * Lazy db proxy — defers the actual `getDb()` call until first use.
 * Without this, `next build`'s page-data collection imports the route
 * modules and crashes when DATABASE_URL isn't set in the build env.
 */
type DbInstance = ReturnType<typeof getDb>;
export const db = new Proxy({} as DbInstance, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
export * from "@hermesranker/db";
