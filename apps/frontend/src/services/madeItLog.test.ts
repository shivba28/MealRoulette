import { beforeEach, describe, expect, it } from 'vitest';
import { getLast5MadeItRecipeNames, logMadeIt } from './madeItLog';

describe('madeItLog', () => {
  beforeEach(() => {
    localStorage.removeItem('mealroulette-made-it');
  });

  it('returns empty when nothing logged', () => {
    expect(getLast5MadeItRecipeNames()).toEqual([]);
  });

  it('logs and returns last 5 names', () => {
    logMadeIt('Pasta Carbonara');
    expect(getLast5MadeItRecipeNames()).toEqual(['Pasta Carbonara']);
    logMadeIt('Salmon Bowl');
    expect(getLast5MadeItRecipeNames()).toEqual(['Salmon Bowl', 'Pasta Carbonara']);
  });

  it('caps at 5 entries', () => {
    logMadeIt('A');
    logMadeIt('B');
    logMadeIt('C');
    logMadeIt('D');
    logMadeIt('E');
    logMadeIt('F');
    expect(getLast5MadeItRecipeNames()).toHaveLength(5);
    expect(getLast5MadeItRecipeNames()[0]).toBe('F');
  });
});
