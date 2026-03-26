import type { GetRecipes } from '../application/GetRecipes.js';

export interface ResolverContext {
  getRecipes: GetRecipes;
}

export function createResolvers(): Record<string, unknown> {
  return {
    Query: {
      recipes: async (
        _: unknown,
        args: { limit?: number; offset?: number },
        context: ResolverContext
      ) => {
        const result = await context.getRecipes.execute({
          limit: args.limit ?? 20,
          offset: args.offset ?? 0,
        });
        return result.recipes;
      },
    },
  };
}
