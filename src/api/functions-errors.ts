// src/api/functions-errors.ts: the supabase-js edge-function error classes grading.ts checks against.
// The web build resolves functions-errors.web.ts instead, so the library stays out of its bundle.
export { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
