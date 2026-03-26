export const typeDefs = `#graphql
  type Recipe {
    id: ID!
    name: String!
    description: String!
    imageUrl: String
    calories: Int!
    protein: Float!
    carbs: Float!
    fat: Float!
    servings: Int!
    cookTimeMinutes: Int
    tags: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    recipes(limit: Int, offset: Int): [Recipe!]!
  }
`;
