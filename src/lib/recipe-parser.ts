/**
 * Recipe parser: extracts a RecipeDraft from raw HTML fetched from a recipe URL.
 *
 * Strategy (in order of preference):
 *  1. JSON-LD with @type "Recipe" (schema.org) — most reliable, widely supported.
 *  2. HTML microdata (itemprop attributes) — used by many European recipe blogs
 *     that don't emit JSON-LD (e.g. aniagotuje.pl).
 *  3. OpenGraph / <meta> / <title> as a last-resort title fallback.
 *
 * All inference is pure (no network calls). The route handler is responsible for
 * fetching the HTML and passing it here.
 */

import type { Difficulty, Ingredient, MealSlot, RecipeDraft } from "./types";
import { UNIT_OPTIONS } from "./constants";
import { createId } from "./planner";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ParseResult {
  draft: RecipeDraft;
  /** True when a schema.org/Recipe JSON-LD block was found. */
  richData: boolean;
}

export function parseRecipeFromHtml(html: string): ParseResult {
  // Strategy 1: JSON-LD
  const jsonLd = extractJsonLd(html);
  if (jsonLd) {
    return { draft: draftFromJsonLd(jsonLd), richData: true };
  }

  // Strategy 2: HTML microdata (itemprop)
  const microdata = extractMicrodata(html);
  if (microdata) {
    return { draft: draftFromJsonLd(microdata), richData: true };
  }

  // Strategy 3: bare-minimum fallback — at least populate the title.
  const title = extractMetaTitle(html) ?? "";
  return {
    draft: emptyDraftWithTitle(title),
    richData: false,
  };
}

// ---------------------------------------------------------------------------
// JSON-LD extraction
// ---------------------------------------------------------------------------

/**
 * Returns the first schema.org/Recipe object found in any JSON-LD script block,
 * handling both top-level objects and @graph arrays.
 */
function extractJsonLd(html: string): SchemaRecipe | null {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim()) as unknown;
      const found = findRecipeNode(data);
      if (found) return found;
    } catch {
      // Malformed JSON-LD — skip.
    }
  }
  return null;
}

function findRecipeNode(data: unknown): SchemaRecipe | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Direct Recipe object.
  if (isRecipeType(obj["@type"])) return obj as SchemaRecipe;

  // @graph array (common on WordPress-based recipe sites).
  if (Array.isArray(obj["@graph"])) {
    for (const node of obj["@graph"]) {
      const found = findRecipeNode(node);
      if (found) return found;
    }
  }
  return null;
}

function isRecipeType(value: unknown): boolean {
  if (typeof value === "string") return value === "Recipe";
  if (Array.isArray(value)) return value.includes("Recipe");
  return false;
}

// ---------------------------------------------------------------------------
// HTML microdata extraction (itemprop / itemscope)
// ---------------------------------------------------------------------------

/**
 * Extracts schema.org/Recipe data from HTML microdata attributes.
 * Returns a SchemaRecipe-shaped object so it can be fed into draftFromJsonLd.
 *
 * Handles patterns like:
 *   <span itemprop="name">Babka budyniowa</span>
 *   <li itemprop="recipeIngredient">2 jajka</li>
 *   <meta itemprop="prepTime" content="PT20M">
 *   <span itemprop="recipeYield">8</span>
 */
function extractMicrodata(html: string): SchemaRecipe | null {
  // Only proceed if the page actually contains recipe microdata.
  if (!/itemtype=["'][^"']*schema\.org\/Recipe["']/i.test(html)) return null;

  function getItemprop(prop: string): string | null {
    // <meta itemprop="X" content="Y"> — used for machine-readable values
    const metaRe = new RegExp(
      `<meta[^>]+itemprop=["']${prop}["'][^>]+content=["']([^"']*)["']`,
      "i",
    );
    const metaMatch = metaRe.exec(html);
    if (metaMatch) return metaMatch[1].trim();

    // <X itemprop="Y" content="Z"> — datetime / link elements
    const contentRe = new RegExp(
      `<[a-z]+[^>]+itemprop=["']${prop}["'][^>]+content=["']([^"']*)["']`,
      "i",
    );
    const contentMatch = contentRe.exec(html);
    if (contentMatch) return contentMatch[1].trim();

    // <X itemprop="Y">text</X>
    const textRe = new RegExp(
      `<[a-z][^>]+itemprop=["']${prop}["'][^>]*>([\\s\\S]*?)<\\/[a-z]`,
      "i",
    );
    const textMatch = textRe.exec(html);
    if (textMatch) return stripTags(textMatch[1]).trim();

    return null;
  }

  function getAllItemprop(prop: string): string[] {
    const results: string[] = [];
    const re = new RegExp(
      `<[a-z][^>]+itemprop=["']${prop}["'][^>]*>([\\s\\S]*?)<\\/[a-z]`,
      "gi",
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const text = stripTags(m[1]).trim();
      if (text) results.push(text);
    }
    return results;
  }

  const name = getItemprop("name");
  if (!name) return null; // Not enough data.

  // Nutrition calories may be nested: itemprop="calories" inside itemprop="nutrition"
  const caloriesRaw = getItemprop("calories");
  const nutrition = caloriesRaw ? { calories: caloriesRaw } : undefined;

  return {
    name,
    prepTime: getItemprop("prepTime") ?? undefined,
    cookTime: getItemprop("cookTime") ?? undefined,
    totalTime: getItemprop("totalTime") ?? undefined,
    recipeYield: getItemprop("recipeYield") ?? undefined,
    recipeIngredient: getAllItemprop("recipeIngredient"),
    recipeInstructions: getAllItemprop("recipeInstructions").join("\n") || getItemprop("recipeInstructions") || undefined,
    recipeCategory: getItemprop("recipeCategory") ?? undefined,
    keywords: getItemprop("keywords") ?? undefined,
    description: getItemprop("description") ?? undefined,
    nutrition,
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

// ---------------------------------------------------------------------------
// JSON-LD → RecipeDraft
// ---------------------------------------------------------------------------

function draftFromJsonLd(schema: SchemaRecipe): RecipeDraft {
  const title = asString(schema.name) ?? "";
  const prepTimeMinutes = parseDuration(asString(schema.prepTime));
  const cookTimeMinutes = parseDuration(asString(schema.cookTime)) ||
    parseDuration(asString(schema.totalTime)) - prepTimeMinutes || 0;
  const baseServings = parseServings(schema.recipeYield);
  const instructions = parseInstructions(schema.recipeInstructions);
  const rawIngredients = (schema.recipeIngredient ?? []).map(asString).filter(Boolean) as string[];
  const ingredients = rawIngredients.map(parseIngredientString);
  const caloriesPerServing = parseCalories(schema.nutrition);
  const mealType = inferMealType(schema.recipeCategory, schema.keywords, title);
  const { vegetarian, highProtein, budgetFriendly } = inferDietaryFlags(ingredients);
  const totalMinutes = prepTimeMinutes + cookTimeMinutes;
  const difficulty = inferDifficulty(totalMinutes, ingredients.length);
  const tags = extractTags(schema.keywords, schema.recipeCategory);
  const comments = asString(schema.description) ?? "";

  return {
    title,
    mealType,
    baseServings,
    prepTimeMinutes,
    cookTimeMinutes,
    caloriesPerServing,
    difficulty,
    vegetarian,
    highProtein,
    budgetFriendly,
    tags,
    comments,
    instructions,
    ingredients,
  };
}

// ---------------------------------------------------------------------------
// Duration (ISO 8601 PT…) → minutes
// ---------------------------------------------------------------------------

function parseDuration(value: string | null | undefined): number {
  if (!value) return 0;
  // e.g. PT1H30M, PT45M, P0DT1H
  const hours = /(\d+(?:\.\d+)?)\s*H/i.exec(value)?.[1] ?? "0";
  const minutes = /(\d+(?:\.\d+)?)\s*M/i.exec(value)?.[1] ?? "0";
  return Math.round(parseFloat(hours) * 60 + parseFloat(minutes));
}

// ---------------------------------------------------------------------------
// Servings
// ---------------------------------------------------------------------------

function parseServings(value: unknown): number {
  if (Array.isArray(value)) {
    const first = value[0];
    return parseServings(first);
  }
  if (typeof value === "number") return Math.max(1, value);
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return isNaN(n) ? 2 : Math.max(1, n);
  }
  return 2;
}

// ---------------------------------------------------------------------------
// Ingredient string → Ingredient
// ---------------------------------------------------------------------------

/**
 * Parses a natural-language ingredient string into a structured Ingredient.
 *
 * Examples handled:
 *   "2 cups all-purpose flour"
 *   "1/2 cup butter, softened"
 *   "1 1/2 teaspoons baking powder"
 *   "3 large eggs"
 *   "Salt and pepper to taste"
 *   "500g chicken breast"
 */
export function parseIngredientString(raw: string): Ingredient {
  const text = raw.trim();

  // Strip leading Unicode fractions / HTML entities.
  const normalized = normalizeUnicodeFractions(text);

  // Quantity patterns: "1 1/2", "1/2", "½", "2", "2.5", "2-3" (range → first)
  const qtyRe =
    /^(\d+(?:\.\d+)?)\s+(\d+\/\d+)|^(\d+\/\d+)|^(\d+(?:\.\d+)?)(?:\s*[-–]\s*\d+(?:\.\d+)?)?/;

  let quantity = 1;
  let remainder = normalized;

  const qtyMatch = qtyRe.exec(normalized);
  if (qtyMatch) {
    if (qtyMatch[1] && qtyMatch[2]) {
      // "1 1/2" style
      quantity = parseFloat(qtyMatch[1]) + evalFraction(qtyMatch[2]);
    } else if (qtyMatch[3]) {
      // pure fraction
      quantity = evalFraction(qtyMatch[3]);
    } else if (qtyMatch[4]) {
      quantity = parseFloat(qtyMatch[4]);
    }
    remainder = normalized.slice(qtyMatch[0].length).trim();
  }

  // Try to match a known unit next.
  const { unit, rest } = extractUnit(remainder);

  // Clean up the ingredient name: strip preparation notes after comma.
  const commaIdx = rest.indexOf(",");
  const nameRaw = commaIdx > 0 ? rest.slice(0, commaIdx) : rest;
  const note = commaIdx > 0 ? rest.slice(commaIdx + 1).trim() : "";

  // Strip size descriptors ("large", "medium", "small", "fresh", "chopped", etc.)
  const name = cleanIngredientName(nameRaw).trim() || rest.trim();

  const categoryId = inferCategory(name);

  return {
    id: createId("ingredient"),
    name,
    quantity: quantity || 1,
    unit,
    categoryId,
    note,
  };
}

function normalizeUnicodeFractions(text: string): string {
  return text
    .replace(/\u00bc/g, "1/4")
    .replace(/\u00bd/g, "1/2")
    .replace(/\u00be/g, "3/4")
    .replace(/\u2153/g, "1/3")
    .replace(/\u2154/g, "2/3")
    .replace(/\u215b/g, "1/8")
    .replace(/\u215c/g, "3/8")
    .replace(/\u215d/g, "5/8")
    .replace(/\u215e/g, "7/8");
}

function evalFraction(frac: string): number {
  const parts = frac.split("/");
  if (parts.length !== 2) return 1;
  const num = parseFloat(parts[0]);
  const den = parseFloat(parts[1]);
  return den !== 0 ? num / den : 1;
}

/**
 * Matches the first word(s) of `text` against a comprehensive unit table.
 * Returns the canonical unit and the remaining string.
 */
function extractUnit(text: string): { unit: string; rest: string } {
  // Map from pattern → canonical unit (canonical units come from UNIT_OPTIONS).
  const unitMap: Array<[RegExp, string]> = [
    [/^kilograms?\b/i, "kg"],
    [/^kg\b/i, "kg"],
    [/^grams?\b/i, "g"],
    [/^gr?\b/i, "g"],
    [/^liters?\b/i, "l"],
    [/^litres?\b/i, "l"],
    [/^ltr?\b/i, "l"],
    [/^milliliters?\b/i, "ml"],
    [/^millilitres?\b/i, "ml"],
    [/^ml\b/i, "ml"],
    [/^tablespoons?\b/i, "tbsp"],
    [/^tbsp?\b/i, "tbsp"],
    [/^teaspoons?\b/i, "tsp"],
    [/^tsps?\b/i, "tsp"],
    [/^cups?\b/i, "cup"],
    [/^ounces?\b/i, "oz"],
    [/^oz\b/i, "oz"],
    [/^pounds?\b/i, "lb"],
    [/^lbs?\b/i, "lb"],
    [/^bunches?\b/i, "bunch"],
    [/^slices?\b/i, "slice"],
    [/^cans?\b/i, "can"],
    [/^jars?\b/i, "jar"],
    [/^bags?\b/i, "bag"],
    [/^pieces?\b/i, "pcs"],
    [/^pcs?\b/i, "pcs"],
    [/^cloves?\b/i, "pcs"],
    [/^heads?\b/i, "pcs"],
    [/^stalks?\b/i, "pcs"],
  ];

  for (const [pattern, canonical] of unitMap) {
    const m = pattern.exec(text);
    if (m) {
      // Verify canonical is in UNIT_OPTIONS (or fall through to "pcs").
      const unit = UNIT_OPTIONS.includes(canonical) ? canonical : "pcs";
      return { unit, rest: text.slice(m[0].length).trim() };
    }
  }

  // Units sometimes appear with no space after a number: "500g chicken"
  const stickyRe = /^(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|lb)\s+/i.exec(text);
  if (stickyRe) {
    const unit = stickyRe[2].toLowerCase() as string;
    const canonUnit = UNIT_OPTIONS.includes(unit) ? unit : "pcs";
    return { unit: canonUnit, rest: text.slice(stickyRe[0].length).trim() };
  }

  return { unit: "pcs", rest: text };
}

const DESCRIPTOR_RE =
  /\b(large|medium|small|extra[-\s]large|xl|fresh|frozen|dried|whole|boneless|skinless|chopped|diced|sliced|minced|grated|shredded|peeled|halved|quartered|crushed|ground|cooked|uncooked|raw|ripe|firm|soft|heaping|packed|scant|level|flat|rounded|optional|approximately|about|to taste|as needed|or more|or less)\b/gi;

function cleanIngredientName(text: string): string {
  return text.replace(DESCRIPTOR_RE, "").replace(/\s{2,}/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Category inference
// ---------------------------------------------------------------------------

const CATEGORY_RULES: Array<{ id: string; keywords: RegExp }> = [
  {
    id: "meat-fish",
    keywords:
      /\b(chicken|beef|pork|lamb|turkey|duck|veal|venison|bison|fish|salmon|tuna|cod|tilapia|trout|halibut|shrimp|prawn|lobster|crab|scallop|clam|mussel|oyster|anchov|sardine|sausage|bacon|ham|prosciutto|pancetta|chorizo|steak|mince|ground\s+(beef|pork|turkey)|lardons?)\b/i,
  },
  {
    id: "dairy",
    keywords:
      /\b(milk|cheese|butter|cream|yogurt|yoghurt|egg|sour\s+cream|creme\s+fraiche|ricotta|mozzarella|parmesan|parmigiano|cheddar|feta|brie|camembert|gouda|gruyere|cream\s+cheese|heavy\s+cream|whipping\s+cream|half[\s-]and[\s-]half|ghee|paneer|kefir|buttermilk|condensed\s+milk|evaporated\s+milk|mascarpone)\b/i,
  },
  {
    id: "produce",
    keywords:
      /\b(tomato|onion|garlic|carrot|potato|sweet\s+potato|pepper|capsicum|spinach|lettuce|kale|arugula|rocket|broccoli|cauliflower|cabbage|brussels|zucchini|courgette|eggplant|aubergine|cucumber|celery|asparagus|artichoke|beet|beetroot|parsnip|turnip|radish|leek|scallion|spring\s+onion|shallot|chive|mushroom|corn|pea|edamame|bok\s+choy|chard|collard|rapini|apple|banana|lemon|lime|orange|grapefruit|avocado|mango|pineapple|strawberr|raspberr|blueberr|blackberr|cherry|grape|peach|plum|apricot|fig|date|kiwi|papaya|pomegranate|cranberr|herb|basil|parsley|cilantro|coriander|thyme|rosemary|sage|dill|mint|oregano|tarragon|chervil|bay\s+leaf|lemongrass|ginger|turmeric\s+root)\b/i,
  },
  {
    id: "dairy",
    keywords: /\b(egg)\b/i,
  },
  {
    id: "bakery",
    keywords:
      /\b(bread|flour|yeast|sourdough|roll|baguette|tortilla|pita|naan|chapati|cracker|biscuit|croissant|bagel|muffin|scone|brioche|focaccia|ciabatta|pumpernickel|rye\s+bread|whole\s+wheat\s+bread)\b/i,
  },
  {
    id: "frozen",
    keywords: /\b(frozen\s+\w+|ice\s+cream|sorbet|gelato)\b/i,
  },
  {
    id: "beverages",
    keywords:
      /\b(wine|beer|ale|lager|spirits|vodka|rum|whiskey|brandy|juice|stock|broth|coconut\s+milk|coconut\s+cream|oat\s+milk|almond\s+milk|soy\s+milk|rice\s+milk|sparkling\s+water)\b/i,
  },
  {
    id: "pantry",
    keywords:
      /\b(oil|olive\s+oil|vegetable\s+oil|canola|sesame\s+oil|vinegar|balsamic|salt|pepper|sugar|brown\s+sugar|honey|maple\s+syrup|agave|molasses|soy\s+sauce|tamari|fish\s+sauce|worcestershire|hot\s+sauce|sriracha|tabasco|ketchup|mustard|mayonnaise|mayo|pasta|noodle|spaghetti|fettuccine|penne|rigatoni|linguine|orzo|rice|quinoa|couscous|bulgur|farro|millet|oat|granola|lentil|chickpea|bean|kidney\s+bean|black\s+bean|cannellini|lentil|split\s+pea|peanut\s+butter|almond\s+butter|tahini|jam|jelly|marmalade|chocolate|cocoa|vanilla|baking\s+powder|baking\s+soda|cornstarch|corn\s+flour|bread\s+crumb|panko|nut|almond|cashew|walnut|pecan|pistachio|pine\s+nut|seed|sesame|sunflower\s+seed|pumpkin\s+seed|flaxseed|chia\s+seed|spice|cumin|coriander\s+powder|paprika|cinnamon|turmeric|cardamom|clove|nutmeg|allspice|star\s+anise|fennel\s+seed|chili|cayenne|curry\s+powder|garam\s+masala|za.?atar|sumac|dried\s+herb|tomato\s+paste|tomato\s+sauce|canned|tinned|diced\s+tomato|passata|coconut\s+milk|curry\s+paste|miso|tahini|capers|olive|pickle|sun[-\s]dried|anchovy\s+paste|gelatin|agar)\b/i,
  },
];

function inferCategory(name: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(name)) return rule.id;
  }
  return "other";
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

type SchemaInstructionStep = {
  "@type"?: string;
  text?: string;
  name?: string;
};

function parseInstructions(
  instructions: SchemaRecipe["recipeInstructions"],
): string {
  if (!instructions) return "";
  if (typeof instructions === "string") return instructions.trim();
  if (Array.isArray(instructions)) {
    return instructions
      .map((step) => {
        if (typeof step === "string") return step.trim();
        const s = step as SchemaInstructionStep;
        return (s.text ?? s.name ?? "").trim();
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

// ---------------------------------------------------------------------------
// Calories
// ---------------------------------------------------------------------------

function parseCalories(nutrition: SchemaRecipe["nutrition"]): number {
  if (!nutrition || typeof nutrition !== "object") return 0;
  const raw = (nutrition as Record<string, unknown>)["calories"];
  if (typeof raw === "number") return Math.round(raw);
  if (typeof raw === "string") {
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Meal type inference
// ---------------------------------------------------------------------------

function inferMealType(
  category: unknown,
  keywords: unknown,
  title: string,
): MealSlot {
  const combined = [
    ...(asStringArray(category)),
    ...(asStringArray(keywords)),
    title,
  ]
    .join(" ")
    .toLowerCase();

  if (/\b(breakfast|brunch|morning|oatmeal|pancake|waffle|french\s+toast|granola|smoothie\s+bowl|egg\s+benedict|frittata)\b/.test(combined)) {
    return "Breakfast";
  }
  if (/\b(lunch|salad|sandwich|wrap|soup|stew|chowder|bisque|gazpacho|light\s+meal|snack)\b/.test(combined)) {
    return "Lunch";
  }
  return "Dinner";
}

// ---------------------------------------------------------------------------
// Dietary flags
// ---------------------------------------------------------------------------

const MEAT_FISH_RE =
  /\b(chicken|beef|pork|lamb|turkey|duck|veal|venison|bison|fish|salmon|tuna|cod|tilapia|trout|halibut|shrimp|prawn|lobster|crab|scallop|clam|mussel|oyster|anchov|sardine|sausage|bacon|ham|prosciutto|pancetta|chorizo|steak|mince|ground\s+(beef|pork|turkey)|lardons?)\b/i;

const HIGH_PROTEIN_RE =
  /\b(chicken|beef|pork|lamb|turkey|fish|salmon|tuna|shrimp|prawn|egg|lentil|chickpea|bean|tofu|tempeh|edamame|cottage\s+cheese|greek\s+yogurt|quinoa)\b/i;

const PREMIUM_RE =
  /\b(lobster|crab|wagyu|truffle|foie\s+gras|caviar|saffron|kobe|matsutake|morel)\b/i;

function inferDietaryFlags(ingredients: Ingredient[]): {
  vegetarian: boolean;
  highProtein: boolean;
  budgetFriendly: boolean;
} {
  let hasMeat = false;
  let hasProtein = false;
  let hasPremium = false;

  for (const ingredient of ingredients) {
    const text = ingredient.name + " " + ingredient.note;
    if (MEAT_FISH_RE.test(text)) hasMeat = true;
    if (HIGH_PROTEIN_RE.test(text)) hasProtein = true;
    if (PREMIUM_RE.test(text)) hasPremium = true;
  }

  return {
    vegetarian: !hasMeat,
    highProtein: hasProtein,
    budgetFriendly: !hasPremium && ingredients.length <= 12,
  };
}

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------

function inferDifficulty(totalMinutes: number, ingredientCount: number): Difficulty {
  if (totalMinutes <= 30 && ingredientCount <= 8) return "Easy";
  if (totalMinutes <= 60 && ingredientCount <= 15) return "Medium";
  if (totalMinutes <= 30 || ingredientCount <= 8) return "Easy";
  if (totalMinutes <= 60 || ingredientCount <= 15) return "Medium";
  return "Hard";
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

function extractTags(keywords: unknown, category: unknown): string[] {
  const raw = [...asStringArray(keywords), ...asStringArray(category)]
    .flatMap((s) => s.split(/[,;|]/))
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.length < 30);

  // Deduplicate.
  return [...new Set(raw)].slice(0, 8);
}

// ---------------------------------------------------------------------------
// Meta title fallback
// ---------------------------------------------------------------------------

function extractMetaTitle(html: string): string | null {
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html);
  if (og) return og[1];
  const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (title) return title[1].trim();
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return asString(value[0]);
  return null;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => asStringArray(v));
  return [];
}

function emptyDraftWithTitle(title: string): RecipeDraft {
  return {
    title,
    mealType: "Dinner",
    baseServings: 2,
    prepTimeMinutes: 0,
    cookTimeMinutes: 0,
    caloriesPerServing: 0,
    difficulty: "Easy",
    vegetarian: false,
    highProtein: false,
    budgetFriendly: true,
    tags: [],
    comments: "",
    instructions: "",
    ingredients: [],
  };
}

// ---------------------------------------------------------------------------
// schema.org/Recipe shape (loose — only fields we actually use)
// ---------------------------------------------------------------------------

interface SchemaRecipe {
  "@type"?: string | string[];
  name?: unknown;
  prepTime?: unknown;
  cookTime?: unknown;
  totalTime?: unknown;
  recipeYield?: unknown;
  recipeIngredient?: unknown[];
  recipeInstructions?: unknown;
  recipeCategory?: unknown;
  keywords?: unknown;
  description?: unknown;
  nutrition?: unknown;
}
