/**
 * Value object: score for a recipe given user preferences.
 */
export class RecipeScore {
  constructor(
    public readonly recipeId: string,
    public readonly score: number,
    public readonly matchDetails: {
      proteinMatch: number;
      carbsMatch: number;
      fatMatch: number;
      calorieMatch: number;
    }
  ) {}

  static create(
    recipeId: string,
    score: number,
    matchDetails: RecipeScore['matchDetails']
  ): RecipeScore {
    return new RecipeScore(recipeId, score, matchDetails);
  }
}
