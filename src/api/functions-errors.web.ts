// src/api/functions-errors.web.ts: the web build never calls an edge function (no Supabase client, see
// supabase.web.ts), so no supabase-js error can reach grading.ts. These stand-ins keep its instanceof
// checks valid without bundling the library.
export class FunctionsFetchError extends Error {}
export class FunctionsHttpError extends Error {
  context!: Response;
}
