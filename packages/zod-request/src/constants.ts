// Error message constants
export const ERROR_EXPECTED_REQUEST = "Expected Request";
export const ERROR_EXPECTED_HEADERS = "Expected Headers";
export const ERROR_EXPECTED_URL_SEARCH_PARAMS =
  "Expected URLSearchParams or string";
export const ERROR_UNABLE_TO_EXTRACT_BASE_SCHEMA =
  "Unable to extract base schema from preprocessed {name} schema. This may be a Zod v4 compatibility issue.";
export const ERROR_MULTIPLE_VALUES_SINGLE_SCHEMA =
  'Multiple values found for parameter "{key}" but schema expects a single value. Use an array schema (e.g., z.array(z.string())) to accept multiple values.';
