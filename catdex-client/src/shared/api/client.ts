export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function setApiAccessToken(_nextAccessToken: string | null) {
  // Supabase manages access tokens through its Auth session storage.
}

export function throwIfSupabaseError(error: { message: string; status?: number } | null | undefined): asserts error is null | undefined {
  if (error) {
    throw new ApiError(error.message, error.status ?? 500);
  }
}
