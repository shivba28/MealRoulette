import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express, { type Express } from 'express';
import { typeDefs } from './schema.js';
import { createResolvers } from './resolvers.js';
import { GetRecipes } from '../application/GetRecipes.js';
import { InMemoryRecipeRepository } from '../infrastructure/repositories/InMemoryRecipeRepository.js';

const recipeRepository = new InMemoryRecipeRepository();
const getRecipes = new GetRecipes(recipeRepository);
const resolvers = createResolvers();

const server = new ApolloServer({
  typeDefs,
  resolvers: resolvers as never,
});

const app: Express = express();

/** Apply GraphQL route after server.start() (required by Apollo 4). */
export function applyGraphQLMiddleware(): void {
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async () => ({ getRecipes }),
    })
  );
}

export { app, server };
export const PORT = 4000;
