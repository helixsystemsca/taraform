/** PostgREST / Postgres messages when objects are missing from the project. */
export function isSupabaseSchemaMissingError(message: string) {
  return /schema cache|does not exist|Could not find the table|relation .+ does not exist|column .+ does not exist/i.test(
    message,
  );
}
