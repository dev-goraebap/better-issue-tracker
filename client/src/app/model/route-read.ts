import { isCancelledError } from '@tanstack/react-query';

/** An outgoing screen can cancel a shared read while a route guard still needs it. */
export async function routeRead<T>(read: () => Promise<T>): Promise<T> {
  try { return await read(); }
  catch (error) { if (!isCancelledError(error)) throw error; return read(); }
}
