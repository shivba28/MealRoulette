const API_URL = import.meta.env.VITE_GRAPHQL_URL ?? '/graphql';

export type GraphQLVariables = Record<string, unknown>;

export async function graphqlRequest<T>(
  query: string,
  variables?: GraphQLVariables
): Promise<{ data: T; errors?: Array<{ message: string }> }> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }

  if (json.data === undefined) {
    throw new Error('No data in GraphQL response');
  }

  const result: { data: T; errors?: Array<{ message: string }> } = { data: json.data };
  if (json.errors !== undefined) result.errors = json.errors;
  return result;
}
