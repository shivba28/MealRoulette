import { graphqlRequest } from '../client';
import type { GraphQLVariables } from '../client';
import type { Recipe } from '@mealroulette/shared-types';

export const GET_RECIPES_QUERY = `
  query GetRecipes($limit: Int, $offset: Int) {
    recipes(limit: $limit, offset: $offset) {
      id
      name
      description
      imageUrl
      calories
      protein
      carbs
      fat
      servings
      cookTimeMinutes
      tags
      createdAt
      updatedAt
    }
  }
`;

export interface GetRecipesResponse {
  recipes: Recipe[];
}

export interface GetRecipesVariables extends GraphQLVariables {
  limit?: number;
  offset?: number;
}

export async function getRecipes(
  variables?: GetRecipesVariables
): Promise<GetRecipesResponse> {
  const { data } = await graphqlRequest<GetRecipesResponse>(
    GET_RECIPES_QUERY,
    variables ?? {}
  );
  return data;
}
