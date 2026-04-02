/**
 * Detailed offline fallbacks for roulette when LLMs are unavailable or return low-quality JSON.
 */

import type { MacroPreferences, Recipe, RecipeMacros } from '@mealroulette/shared-types';

type Template = {
  name: string;
  cuisineType: string;
  description: string;
  cookTimeMinutes: number;
  ingredients: string[];
  steps: string[];
};

function normalizeAvoid(names: string[]): Set<string> {
  return new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean));
}

function conflictsAvoid(recipeName: string, avoid: Set<string>): boolean {
  const n = recipeName.trim().toLowerCase();
  if (!n) return true;
  for (const a of avoid) {
    if (n === a) return true;
    if (a.length >= 6 && n.includes(a)) return true;
    if (n.length >= 6 && a.includes(n)) return true;
  }
  return false;
}

const TEMPLATES: Template[] = [
  {
    name: 'Sheet-pan lemon garlic chicken with broccoli',
    cuisineType: 'American',
    description:
      'Crispy-edged chicken thighs with bright lemon, roasted broccoli, and a quick pan sauce.',
    cookTimeMinutes: 40,
    ingredients: [
      '4 bone-in, skin-on chicken thighs (about 1.5 lb), patted dry',
      '3 tbsp extra-virgin olive oil, divided',
      '2 lemons (1 sliced, 1 juiced to yield ~3 tbsp)',
      '4 garlic cloves, minced',
      '12 oz broccoli florets, cut into medium pieces',
      '1 tsp kosher salt, plus more to taste',
      '½ tsp freshly ground black pepper',
      '½ tsp smoked paprika (optional)',
      '2 tbsp chopped fresh parsley',
    ],
    steps: [
      'Preheat oven to 425°F (220°C). Line a large rimmed baking sheet with foil for easier cleanup.',
      'In a small bowl, mix 2 tbsp olive oil, half the minced garlic, 1 tbsp lemon juice, paprika, ½ tsp salt, and pepper. Rub all over chicken thighs, including under the skin where possible.',
      'Toss broccoli with remaining 1 tbsp oil, remaining garlic, ½ tsp salt, and a squeeze of lemon on the baking sheet. Spread into a single layer on one side of the pan.',
      'Nestle chicken thighs skin-side up on the other side of the pan. Place lemon slices around the chicken.',
      'Roast 28–35 minutes until chicken skin is deep golden and an instant-read thermometer in the thickest part reads 165°F (74°C), and broccoli tips are charred in spots.',
      'Transfer chicken to a plate to rest 5 minutes. Squeeze remaining lemon over broccoli and toss on the pan.',
      'Pour any resting juices from the chicken back onto the sheet, scrape browned bits, and spoon over chicken. Garnish with parsley and serve.',
    ],
  },
  {
    name: 'Turkey and vegetable skillet rice bowl',
    cuisineType: 'Fusion',
    description: 'Lean ground turkey with peppers, spinach, and warm spices over fluffy rice.',
    cookTimeMinutes: 35,
    ingredients: [
      '1 cup dry long-grain white rice (or 3 cups cooked rice)',
      '1 lb 93% lean ground turkey',
      '1 red bell pepper, diced',
      '1 yellow onion, diced',
      '3 cups baby spinach',
      '2 tbsp tomato paste',
      '1 tsp ground cumin',
      '1 tsp ground coriander',
      '½ tsp chili powder (or Aleppo pepper)',
      '2 tbsp olive oil',
      '1½ cups low-sodium chicken broth (for rice) + ½ cup for deglazing',
      'Salt and black pepper to taste',
      'Lime wedges and cilantro for serving',
    ],
    steps: [
      'If starting from dry rice: rinse rice until water runs mostly clear. In a saucepan, combine rice, 1½ cups broth, and a pinch of salt. Bring to a boil, cover, reduce to low, and simmer 15–18 minutes until liquid is absorbed. Rest off heat 5 minutes, fluff with a fork.',
      'Heat olive oil in a large skillet over medium-high. Add turkey, break into chunks, and brown 6–8 minutes until mostly cooked through.',
      'Add onion and bell pepper with a pinch of salt; cook 5 minutes until softened. Stir in tomato paste, cumin, coriander, and chili powder; cook 1–2 minutes until paste darkens slightly.',
      'Add ½ cup broth, scrape the pan, and simmer 3–4 minutes until saucy. Fold in spinach until wilted. Season with salt and pepper.',
      'Serve turkey mixture over rice. Finish with cilantro and a squeeze of lime.',
    ],
  },
  {
    name: 'Miso-ginger baked salmon with sesame green beans',
    cuisineType: 'Japanese-inspired',
    description: 'Silky salmon with savory-sweet miso glaze and crisp-tender green beans.',
    cookTimeMinutes: 28,
    ingredients: [
      '4 salmon fillets (6 oz each), skin on or off, patted dry',
      '3 tbsp white miso paste',
      '2 tbsp maple syrup or honey',
      '1 tbsp soy sauce or tamari',
      '1 tbsp rice vinegar',
      '1 tbsp grated fresh ginger',
      '1 lb green beans, trimmed',
      '1 tbsp toasted sesame oil',
      '1 tbsp neutral oil (grapeseed or canola)',
      '2 tsp toasted sesame seeds',
      '2 scallions, thinly sliced',
    ],
    steps: [
      'Preheat oven to 400°F (200°C). Whisk miso, maple syrup, soy sauce, vinegar, and ginger until smooth.',
      'Line a baking sheet with parchment. Place salmon fillets with space between; spread miso mixture evenly on top of each fillet.',
      'On the other half of the sheet (or a second sheet), toss green beans with neutral oil and a pinch of salt.',
      'Bake 12–15 minutes until salmon flakes easily at the thickest part but still moist inside, and green beans are tender with a few blistered spots.',
      'Drizzle green beans with sesame oil, toss, and top with sesame seeds and scallions. Serve salmon with beans immediately.',
    ],
  },
  {
    name: 'Chickpea and sweet potato coconut curry',
    cuisineType: 'Indian-inspired',
    description: 'Creamy coconut curry with tender sweet potato, protein-rich chickpeas, and warm spices.',
    cookTimeMinutes: 45,
    ingredients: [
      '2 tbsp coconut or vegetable oil',
      '1 large yellow onion, diced',
      '3 garlic cloves, minced',
      '1 tbsp grated fresh ginger',
      '2 tbsp curry powder (mild or hot)',
      '1 tsp ground turmeric',
      '1 medium sweet potato (~12 oz), peeled, ½-inch dice',
      '1 can (15 oz) chickpeas, drained and rinsed',
      '1 can (14 oz) full-fat coconut milk',
      '1 cup low-sodium vegetable broth',
      '2 cups baby spinach or chopped kale',
      '1 tbsp lime juice',
      'Salt to taste',
      'Cooked basmati rice for serving',
    ],
    steps: [
      'Heat oil in a large pot or Dutch oven over medium. Cook onion with a pinch of salt 6–7 minutes until translucent.',
      'Add garlic, ginger, curry powder, and turmeric; stir 60 seconds until fragrant.',
      'Add sweet potato, chickpeas, coconut milk, and broth. Bring to a gentle simmer, partially cover, and cook 18–22 minutes until sweet potato is fork-tender.',
      'Stir in greens until wilted, about 2 minutes. Add lime juice, adjust salt, and thin with a splash of broth if needed.',
      'Serve over rice. Leftovers thicken as they cool; reheat with a splash of water.',
    ],
  },
  {
    name: 'Beef and mushroom bolognese with whole-wheat pasta',
    cuisineType: 'Italian',
    description: 'Slow-simmered sauce with umami from mushrooms and lean beef over pasta.',
    cookTimeMinutes: 50,
    ingredients: [
      '12 oz lean ground beef (90/10)',
      '8 oz cremini mushrooms, finely chopped',
      '1 carrot, finely diced',
      '1 celery stalk, finely diced',
      '1 small onion, finely diced',
      '3 garlic cloves, minced',
      '2 tbsp olive oil',
      '2 tbsp tomato paste',
      '1 can (28 oz) crushed tomatoes',
      '1 cup low-sodium beef or chicken broth',
      '1 tsp dried oregano',
      'Pinch red pepper flakes (optional)',
      '12 oz dry whole-wheat spaghetti or penne',
      'Grated Parmesan, fresh basil, and salt/pepper',
    ],
    steps: [
      'Heat olive oil in a large deep skillet or pot over medium-high. Add beef, break up, and brown 5 minutes. Season lightly with salt and pepper.',
      'Add mushroom, carrot, celery, and onion; cook 8–10 minutes until vegetables soften and liquid mostly evaporates.',
      'Stir in garlic, tomato paste, oregano, and pepper flakes; cook 2 minutes until paste caramelizes slightly.',
      'Pour in crushed tomatoes and broth. Bring to a simmer, reduce heat to low, and cook uncovered 25–30 minutes, stirring occasionally, until thick and glossy.',
      'Meanwhile, cook pasta in salted water until al dente. Reserve ½ cup pasta water, drain pasta.',
      'Toss pasta with sauce, adding pasta water to loosen if needed. Serve with Parmesan and basil.',
    ],
  },
  {
    name: 'Greek-style chicken souvlaki bowls with tzatziki',
    cuisineType: 'Greek',
    description: 'Marinated grilled or skillet chicken with cucumber yogurt sauce and fresh vegetables.',
    cookTimeMinutes: 35,
    ingredients: [
      '1.5 lb boneless skinless chicken breasts, cut into 1¼-inch cubes',
      '3 tbsp olive oil',
      '3 tbsp lemon juice',
      '4 garlic cloves, minced',
      '2 tsp dried oregano',
      '1 tsp kosher salt',
      '½ tsp black pepper',
      '1 cup Greek yogurt (full-fat or 2%)',
      '½ cucumber, seeded and finely diced',
      '1 tbsp chopped dill',
      '1 tbsp chopped mint',
      '1 small garlic clove, grated (for tzatziki)',
      '2 cups cooked quinoa or brown rice',
      '2 cups chopped romaine or mixed greens',
      '1 cup cherry tomatoes, halved',
      '½ red onion, thinly sliced',
    ],
    steps: [
      'Whisk 2 tbsp oil, 2 tbsp lemon juice, half the minced garlic, oregano, salt, and pepper. Toss with chicken and marinate at least 15 minutes (or up to 8 hours chilled).',
      'For tzatziki: mix yogurt, cucumber, dill, mint, grated garlic, remaining 1 tbsp oil and 1 tbsp lemon juice, and salt to taste. Chill until serving.',
      'Thread chicken onto skewers if grilling, or leave loose for skillet. Heat a grill pan or large skillet over medium-high. Cook chicken in batches 3–4 minutes per side until browned and internal temperature reaches 165°F (74°C).',
      'Divide grains, greens, tomatoes, and onion among bowls. Top with chicken and a generous dollop of tzatziki.',
    ],
  },
  {
    name: 'Shrimp and asparagus stir-fry with garlic sauce',
    cuisineType: 'Chinese-inspired',
    description: 'Quick high-heat stir-fry with crisp asparagus and a glossy garlic-soy glaze.',
    cookTimeMinutes: 22,
    ingredients: [
      '1 lb large shrimp, peeled and deveined, patted dry',
      '1 lb asparagus, trimmed, cut on bias into 2-inch pieces',
      '4 garlic cloves, minced',
      '1 tbsp grated fresh ginger',
      '3 tbsp low-sodium soy sauce',
      '2 tbsp oyster sauce (or extra soy)',
      '1 tbsp rice vinegar',
      '1 tsp toasted sesame oil',
      '2 tsp cornstarch dissolved in 3 tbsp cold water',
      '2 tbsp neutral high-heat oil, divided',
      '2 scallions, sliced',
      'Cooked jasmine rice for serving',
    ],
    steps: [
      'Pat shrimp very dry; season lightly with salt. Mix soy sauce, oyster sauce, vinegar, sesame oil, and half the garlic/ginger in a small bowl.',
      'Heat 1 tbsp oil in a wok or large skillet over high until shimmering. Add asparagus in a single layer; stir-fry 2–3 minutes until bright green with char spots. Remove.',
      'Add remaining 1 tbsp oil. Add shrimp in one layer; cook 1–2 minutes per side until pink and curled. Return asparagus to the pan.',
      'Add sauce mixture; toss 30 seconds. Stir cornstarch slurry, pour in, and toss until sauce thickens and coats, 30–60 seconds.',
      'Top with scallions. Serve immediately over rice.',
    ],
  },
  {
    name: 'Black bean and quinoa stuffed poblano peppers',
    cuisineType: 'Mexican-inspired',
    description: 'Roasted poblanos filled with spiced quinoa, beans, and melted cheese.',
    cookTimeMinutes: 55,
    ingredients: [
      '4 large poblano peppers',
      '1 cup dry quinoa, rinsed',
      '2 cups vegetable broth',
      '1 can (15 oz) black beans, drained and rinsed',
      '1 cup frozen corn, thawed',
      '1 small red onion, diced',
      '2 garlic cloves, minced',
      '1 tbsp ground cumin',
      '1 tsp smoked paprika',
      '1 can (10 oz) diced tomatoes with green chiles, drained',
      '1½ cups shredded Monterey Jack or pepper Jack',
      '2 tbsp olive oil',
      'Salt and pepper',
      'Fresh cilantro and lime wedges',
    ],
    steps: [
      'Roast poblanos under a broiler or over a gas flame, turning, until skins blister and blacken. Steam in a covered bowl 10 minutes, peel, make a slit lengthwise, and remove seeds carefully.',
      'Cook quinoa in broth per package directions (~15 minutes), fluff, and season lightly.',
      'Heat oil in a skillet over medium. Sauté onion 4 minutes, add garlic, cumin, and paprika 1 minute. Stir in beans, corn, tomatoes, and quinoa; cook 3–4 minutes. Off heat, fold in 1 cup cheese.',
      'Stuff poblanos with filling, place in a baking dish, sprinkle remaining cheese on top. Bake at 375°F (190°C) 12–15 minutes until cheese is bubbly.',
      'Serve with cilantro and lime.',
    ],
  },
  {
    name: 'Tofu peanut noodles with crunchy vegetables',
    cuisineType: 'Thai-inspired',
    description: 'Crispy baked tofu, whole-grain noodles, and a savory peanut-lime dressing.',
    cookTimeMinutes: 40,
    ingredients: [
      '14 oz extra-firm tofu, pressed 15 minutes and cubed',
      '8 oz whole-wheat spaghetti or soba noodles',
      '⅓ cup natural peanut butter',
      '3 tbsp soy sauce',
      '2 tbsp lime juice',
      '1 tbsp maple syrup or honey',
      '1 tbsp grated fresh ginger',
      '1 garlic clove, minced',
      '¼ cup warm water (to thin sauce)',
      '2 cups shredded red cabbage',
      '1 cup shredded carrots',
      '1 red bell pepper, thinly sliced',
      '2 tbsp neutral oil',
      '¼ cup roasted peanuts, chopped',
      'Fresh cilantro and optional sriracha',
    ],
    steps: [
      'Preheat oven to 425°F (220°C). Toss tofu cubes with 1 tbsp oil and salt; spread on a baking sheet. Bake 22–28 minutes, turning once, until golden and crisp-edged.',
      'Whisk peanut butter, soy sauce, lime juice, syrup, ginger, garlic, and warm water until smooth; thin with more water if needed.',
      'Cook noodles in salted water until al dente; drain and rinse if using soba.',
      'Heat remaining 1 tbsp oil in a large pan over medium-high. Stir-fry cabbage, carrots, and bell pepper 3–4 minutes until slightly tender but still crunchy.',
      'Toss noodles with vegetables, tofu, and peanut sauce. Top with peanuts and cilantro; add sriracha to taste.',
    ],
  },
  {
    name: 'Pork tenderloin with apple-cider pan sauce and roasted Brussels sprouts',
    cuisineType: 'American',
    description: 'Juicy pork medallions with a tangy cider reduction and caramelized sprouts.',
    cookTimeMinutes: 45,
    ingredients: [
      '1.25 lb pork tenderloin, silver skin removed, cut into 1½-inch medallions',
      '1 lb Brussels sprouts, halved',
      '2 tbsp olive oil, divided',
      '2 tbsp unsalted butter, divided',
      '1 tsp kosher salt, divided',
      '½ tsp black pepper',
      '1 shallot, minced',
      '1 cup apple cider (not vinegar)',
      '½ cup low-sodium chicken broth',
      '1 tsp Dijon mustard',
      '1 tsp chopped fresh thyme',
      '1 tbsp apple cider vinegar (optional, to balance)',
    ],
    steps: [
      'Preheat oven to 425°F (220°C). Toss Brussels sprouts with 1 tbsp oil, ½ tsp salt, and pepper on a baking sheet; roast cut-side down 20–25 minutes until deeply browned and tender.',
      'Pat pork dry; season with remaining salt and pepper. Heat 1 tbsp oil and 1 tbsp butter in a large oven-safe skillet over medium-high. Sear medallions 2–3 minutes per side until golden.',
      'Transfer skillet to oven 8–12 minutes until pork reaches 145°F (63°C) internal; rest on a plate loosely tented with foil 5 minutes.',
      'In the same skillet over medium, sauté shallot 1 minute. Add cider and broth; simmer 8–10 minutes until reduced by half. Whisk in mustard, thyme, remaining butter, and vinegar if needed.',
      'Slice pork if thick. Serve with sprouts and spoon sauce over pork.',
    ],
  },
];

function cookCapFromPrefs(prefs: MacroPreferences): number {
  if (prefs.maxCookTimeMinutes != null && prefs.maxCookTimeMinutes !== 60) {
    return prefs.maxCookTimeMinutes;
  }
  return 120;
}

export function buildRouletteFallbackRecipe(
  id: string,
  prefs: MacroPreferences,
  macros: RecipeMacros,
  avoidNames: string[]
): Recipe {
  const avoid = normalizeAvoid(avoidNames);
  const candidates = TEMPLATES.map((_, i) => i).filter((i) => !conflictsAvoid(TEMPLATES[i]!.name, avoid));
  const pool = candidates.length > 0 ? candidates : TEMPLATES.map((_, i) => i);
  const seed = (Date.now() + avoidNames.join('').length) % pool.length;
  const t = TEMPLATES[pool[seed]!]!;
  const cap = cookCapFromPrefs(prefs);
  const cookTime = Math.min(t.cookTimeMinutes, cap);
  return {
    id,
    name: t.name,
    description: t.description,
    cuisineType: t.cuisineType,
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    servings: 1,
    tags: ['roulette', 'fallback'],
    ingredients: [...t.ingredients],
    steps: [...t.steps],
    macros: { ...macros },
    isAiGenerated: true,
    cookTimeMinutes: cookTime,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
