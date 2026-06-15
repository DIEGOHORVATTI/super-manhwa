/**
 * Functional Result<T, E> | for paths where you want to model failure without
 * throwing (e.g. a use case that wants to inspect "primary source error" and
 * "fallback also failed" as two distinct return shapes). Lifted from
 * `novo-horizonte/server/src/shared/result.ts`.
 *
 * For most paths we still `throw` ORPCError via `shared/errors.ts`. Use Result
 * when the caller genuinely cares about the failure branch.
 */

export type Err<E> = { value?: never; error: E };
export type Ok<T> = { value: T; error?: never };
export type Result<T, E> = Ok<T> | Err<E>;

export const okResult = <T>(value: T): Ok<T> => ({ value });
export const errResult = <E>(error: E): Err<E> => ({ error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.error === undefined;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => r.error !== undefined;

/**
 * Wrap a Promise and capture errors. Returns `Result<T, E>` instead of
 * propagating throws | convenient at module boundaries.
 */
export const wrapPromiseResult = async <T, E = unknown>(
  promise: Promise<T>,
): Promise<Result<T, E>> => {
  try {
    return okResult(await promise);
  } catch (error) {
    return errResult(error as E);
  }
};
