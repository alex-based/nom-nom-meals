/**
 * Recipe parser: extracts a RecipeDraft from raw HTML fetched from a recipe URL
 * or pasted directly from a browser's View Source.
 *
 * Parsing strategies (tried in order):
 *  1. JSON-LD   — schema.org/Recipe in <script type="application/ld+json">
 *  2. Microdata — itemprop attributes on HTML elements
 *  3. WP Recipe Maker (WPRM) — CSS class-based extraction for the most popular
 *     WordPress recipe plugin (used by thousands of food blogs)
 *  4. Title-only fallback — OpenGraph / <title> tag
 *
 * Ingredient strings (from strategies 1–2) are parsed by the `parse-ingredient`
 * npm library, which handles fractions, mixed numbers, ranges, and a wide unit
 * vocabulary far more robustly than a hand-rolled regex.
 *
 * All logic is pure — no network calls. The route handler and the client-side
 * paste path are both responsible for supplying the raw HTML.
 */

import { parseIngredient as libParseIngredient } from "parse-ingredient";
import type { Difficulty, Ingredient, MealSlot, RecipeDraft } from "./types";
import { createId } from "./planner";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ParseResult {
  draft: RecipeDraft;
  /** True when structured recipe data (JSON-LD, microdata, or WPRM) was found. */
  richData: boolean;
}

export function parseRecipeFromHtml(html: string): ParseResult {
  // Strategy 1: JSON-LD
  const jsonLd = extractJsonLd(html);
  if (jsonLd) return { draft: draftFromSchemaRecipe(jsonLd), richData: true };

  // Strategy 2: HTML microdata (itemprop / itemscope)
  const microdata = extractMicrodata(html);
  if (microdata) return { draft: draftFromSchemaRecipe(microdata), richData: true };

  // Strategy 3: WP Recipe Maker CSS classes
  const wprm = extractWprm(html);
  if (wprm) return { draft: wprm, richData: true };

  // Strategy 4: bare-minimum — title only
  const title = extractMetaTitle(html) ?? "";
  return { draft: emptyDraftWithTitle(title), richData: false };
}

// ---------------------------------------------------------------------------
// Strategy 1: JSON-LD
// ---------------------------------------------------------------------------

function extractJsonLd(html: string): SchemaRecipe | null {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html)) !== null) {
    try {
      const found = findRecipeNode(JSON.parse(match[1].trim()) as unknown);
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
  if (isRecipeType(obj["@type"])) return obj as SchemaRecipe;
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
// Strategy 2: HTML microdata (itemprop / itemscope)
// ---------------------------------------------------------------------------

function extractMicrodata(html: string): SchemaRecipe | null {
  if (!/itemtype=["'][^"']*schema\.org\/Recipe["']/i.test(html)) return null;

  function getItemprop(prop: string): string | null {
    const metaRe = new RegExp(
      `<meta[^>]+itemprop=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i",
    );
    const metaMatch = metaRe.exec(html);
    if (metaMatch) return metaMatch[1].trim();

    const contentRe = new RegExp(
      `<[a-z]+[^>]+itemprop=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i",
    );
    const contentMatch = contentRe.exec(html);
    if (contentMatch) return contentMatch[1].trim();

    const textRe = new RegExp(
      `<[a-z][^>]+itemprop=["']${prop}["'][^>]*>([\\s\\S]*?)<\\/[a-z]`, "i",
    );
    const textMatch = textRe.exec(html);
    if (textMatch) return stripTags(textMatch[1]).trim();

    return null;
  }

  function getAllItemprop(prop: string): string[] {
    const results: string[] = [];
    const re = new RegExp(
      `<[a-z][^>]+itemprop=["']${prop}["'][^>]*>([\\s\\S]*?)<\\/[a-z]`, "gi",
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const text = stripTags(m[1]).trim();
      if (text) results.push(text);
    }
    return results;
  }

  const name = getItemprop("name");
  if (!name) return null;

  const caloriesRaw = getItemprop("calories");

  return {
    name,
    prepTime: getItemprop("prepTime") ?? undefined,
    cookTime: getItemprop("cookTime") ?? undefined,
    totalTime: getItemprop("totalTime") ?? undefined,
    recipeYield: getItemprop("recipeYield") ?? undefined,
    recipeIngredient: getAllItemprop("recipeIngredient"),
    recipeInstructions:
      getAllItemprop("recipeInstructions").join("\n") ||
      getItemprop("recipeInstructions") ||
      undefined,
    recipeCategory: getItemprop("recipeCategory") ?? undefined,
    keywords: getItemprop("keywords") ?? undefined,
    description: getItemprop("description") ?? undefined,
    nutrition: caloriesRaw ? { calories: caloriesRaw } : undefined,
  };
}

// ---------------------------------------------------------------------------
// Strategy 3: WP Recipe Maker (WPRM)
// ---------------------------------------------------------------------------

/**
 * WP Recipe Maker is the most-used WordPress recipe plugin. It renders a
 * dedicated recipe card with predictable CSS class names, even when the
 * page's JSON-LD / microdata is absent or incomplete.
 *
 * Class naming convention: wprm-recipe-{field}
 * Timing: separate number + unit elements, e.g.
 *   <span class="wprm-recipe-prep_time">15</span>
 *   <span class="wprm-recipe-prep_time-unit-container">minutes</span>
 *
 * Ingredients are pre-split into amount / unit / name / notes spans,
 * so we construct Ingredient objects directly without re-parsing strings.
 */
function extractWprm(html: string): RecipeDraft | null {
  if (!/wprm-recipe\b/i.test(html)) return null;

  /** Returns text content of the first element matching the CSS class. */
  function getField(cls: string): string | null {
    const re = new RegExp(
      `<[^>]+class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/`,
      "i",
    );
    const m = re.exec(html);
    return m ? stripTags(m[1]).trim() : null;
  }

  /** Returns text content of all elements matching the CSS class. */
  function getAllFields(cls: string): string[] {
    const results: string[] = [];
    const re = new RegExp(
      `<[^>]+class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/`,
      "gi",
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const text = stripTags(m[1]).trim();
      if (text) results.push(text);
    }
    return results;
  }

  const title = getField("wprm-recipe-name");
  if (!title) return null;

  // ---- Timing ----
  function wprmMinutes(type: string): number {
    const numStr = getField(`wprm-recipe-${type}_time-minutes`) ?? getField(`wprm-recipe-${type}_time`);
    if (!numStr) return 0;
    const n = parseInt(numStr, 10);
    if (isNaN(n)) return 0;
    const unitRaw = (
      getField(`wprm-recipe-${type}_time-unit-container`) ??
      getField(`wprm-recipe-${type}_time-unit`)
    )?.toLowerCase() ?? "minutes";
    return /hour/.test(unitRaw) ? n * 60 : n;
  }

  const prepTimeMinutes = wprmMinutes("prep");
  const cookTimeMinutes = wprmMinutes("cook");

  // ---- Servings ----
  const servingsStr =
    getField("wprm-recipe-servings-with-unit") ??
    getField("wprm-recipe-servings");
  const baseServings = servingsStr ? (parseInt(servingsStr, 10) || 2) : 2;

  // ---- Calories ----
  const caloriesStr = getField("wprm-recipe-calories");
  const caloriesPerServing = caloriesStr ? (parseInt(caloriesStr, 10) || 0) : 0;

  // ---- Ingredients ----
  // WPRM renders each ingredient as a <li> with sub-spans for amount/unit/name/notes.
  const ingredients: Ingredient[] = [];
  const liRe = /<li[^>]+class="[^"]*\bwprm-recipe-ingredient\b[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch: RegExpExecArray | null;
  while ((liMatch = liRe.exec(html)) !== null) {
    const block = liMatch[1];

    function subField(cls: string): string {
      const re = new RegExp(
        `<[^>]+class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/`,
        "i",
      );
      const m = re.exec(block);
      return m ? stripTags(m[1]).trim() : "";
    }

    const amount = subField("wprm-recipe-ingredient-amount");
    const unitStr = subField("wprm-recipe-ingredient-unit");
    const name = subField("wprm-recipe-ingredient-name");
    const notes = subField("wprm-recipe-ingredient-notes");

    if (!name) continue;

    // Reconstruct a string and run through the standard parser so unit
    // normalisation and category inference apply uniformly.
    const ingredientStr = [amount, unitStr, name, notes ? `, ${notes}` : ""]
      .filter(Boolean)
      .join(" ")
      .trim();

    ingredients.push(parseIngredientString(ingredientStr));
  }

  // ---- Instructions ----
  const instructions = getAllFields("wprm-recipe-instruction-text").join("\n");

  // ---- Tags / keywords ----
  const rawTags = getAllFields("wprm-recipe-keyword");
  const tags = [...new Set(
    rawTags
      .flatMap((t) => t.split(/[,;]/))
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length < 30),
  )].slice(0, 8);

  // ---- Description ----
  const comments = getField("wprm-recipe-summary") ?? getField("wprm-recipe-description") ?? "";

  // ---- Meal type / dietary / difficulty ----
  const mealType = inferMealType(undefined, tags.join(","), title);
  const { vegetarian, highProtein, budgetFriendly } = inferDietaryFlags(ingredients);
  const difficulty = inferDifficulty(prepTimeMinutes + cookTimeMinutes, ingredients.length);

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
// SchemaRecipe → RecipeDraft
// ---------------------------------------------------------------------------

function draftFromSchemaRecipe(schema: SchemaRecipe): RecipeDraft {
  const title = asString(schema.name) ?? "";
  const prepTimeMinutes = parseDuration(asString(schema.prepTime));
  const cookTimeMinutes =
    parseDuration(asString(schema.cookTime)) ||
    Math.max(0, parseDuration(asString(schema.totalTime)) - prepTimeMinutes);
  const baseServings = parseServings(schema.recipeYield);
  const instructions = parseInstructions(schema.recipeInstructions);
  const rawIngredients = (schema.recipeIngredient ?? [])
    .map(asString)
    .filter(Boolean) as string[];
  const ingredients = rawIngredients.map(parseIngredientString);
  const caloriesPerServing = parseCalories(schema.nutrition);
  const mealType = inferMealType(schema.recipeCategory, schema.keywords, title);
  const { vegetarian, highProtein, budgetFriendly } = inferDietaryFlags(ingredients);
  const difficulty = inferDifficulty(prepTimeMinutes + cookTimeMinutes, ingredients.length);
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
// Ingredient string → Ingredient  (powered by parse-ingredient)
// ---------------------------------------------------------------------------

/**
 * Maps parse-ingredient's unitOfMeasureID to the app's UNIT_OPTIONS.
 * Size descriptors ("large", "medium", "small") that the library sometimes
 * picks up as units are normalised to "pcs".
 */
const UNIT_ID_MAP: Record<string, string> = {
  cup: "cup",
  tablespoon: "tbsp",
  teaspoon: "tsp",
  gram: "g",
  kilogram: "kg",
  milliliter: "ml",
  liter: "l",
  ounce: "oz",
  pound: "lb",
  bunch: "bunch",
  slice: "slice",
  can: "can",
  jar: "jar",
  bag: "bag",
  piece: "pcs",
  // Count-style units → pcs
  clove: "pcs",
  head: "pcs",
  sprig: "pcs",
  ear: "pcs",
  stick: "pcs",
  box: "pcs",
  package: "pcs",
  pack: "pcs",
  carton: "pcs",
  container: "pcs",
  dozen: "pcs",
};

const SIZE_DESCRIPTORS = new Set(["large", "medium", "small", "extra-large", "xl"]);

function mapUnit(unitId: string | null | undefined): string {
  if (!unitId) return "pcs";
  const lower = unitId.toLowerCase();
  if (SIZE_DESCRIPTORS.has(lower)) return "pcs";
  return UNIT_ID_MAP[lower] ?? "pcs";
}

/**
 * Parses a natural-language ingredient string into a structured Ingredient.
 * Uses the `parse-ingredient` library for quantity/unit extraction, which
 * handles fractions (½, 1/2, 1 1/2), ranges (2–3), and a wide unit vocabulary
 * across English and metric systems.
 *
 * For non-English strings (e.g. Polish) where the library finds no unit,
 * the full string becomes the name with quantity 1 and unit "pcs" — the user
 * can adjust before saving.
 */
export function parseIngredientString(raw: string): Ingredient {
  const trimmed = raw.trim();
  const [result] = libParseIngredient(trimmed);

  if (!result || result.isGroupHeader) {
    return {
      id: createId("ingredient"),
      name: trimmed,
      quantity: 1,
      unit: "pcs",
      categoryId: inferCategory(trimmed),
      note: "",
    };
  }

  const unit = mapUnit(result.unitOfMeasureID);

  // Split description on first comma: "olive oil, divided" → name + note.
  const desc = result.description.trim();
  const commaIdx = desc.indexOf(",");
  const name = (commaIdx > 0 ? desc.slice(0, commaIdx) : desc).trim() || trimmed;
  const note = commaIdx > 0 ? desc.slice(commaIdx + 1).trim() : "";

  return {
    id: createId("ingredient"),
    name,
    quantity: result.quantity ?? 1,
    unit,
    categoryId: inferCategory(name),
    note,
  };
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
      /\b(oil|olive\s+oil|vegetable\s+oil|canola|sesame\s+oil|vinegar|balsamic|salt|pepper|sugar|brown\s+sugar|honey|maple\s+syrup|agave|molasses|soy\s+sauce|tamari|fish\s+sauce|worcestershire|hot\s+sauce|sriracha|tabasco|ketchup|mustard|mayonnaise|mayo|pasta|noodle|spaghetti|fettuccine|penne|rigatoni|linguine|orzo|rice|quinoa|couscous|bulgur|farro|millet|oat|granola|lentil|chickpea|bean|kidney\s+bean|black\s+bean|cannellini|split\s+pea|peanut\s+butter|almond\s+butter|tahini|jam|jelly|marmalade|chocolate|cocoa|vanilla|baking\s+powder|baking\s+soda|cornstarch|corn\s+flour|bread\s+crumb|panko|nut|almond|cashew|walnut|pecan|pistachio|pine\s+nut|seed|sesame|sunflower\s+seed|pumpkin\s+seed|flaxseed|chia\s+seed|spice|cumin|coriander\s+powder|paprika|cinnamon|turmeric|cardamom|clove|nutmeg|allspice|star\s+anise|fennel\s+seed|chili|cayenne|curry\s+powder|garam\s+masala|za.?atar|sumac|dried\s+herb|tomato\s+paste|tomato\s+sauce|canned|tinned|diced\s+tomato|passata|curry\s+paste|miso|capers|olive|pickle|sun[-\s]dried|anchovy\s+paste|gelatin|agar)\b/i,
  },
];

function inferCategory(name: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(name)) return rule.id;
  }
  return "other";
}

// ---------------------------------------------------------------------------
// Duration (ISO 8601 PT…) → minutes
// ---------------------------------------------------------------------------

function parseDuration(value: string | null | undefined): number {
  if (!value) return 0;
  const hours = /(\d+(?:\.\d+)?)\s*H/i.exec(value)?.[1] ?? "0";
  const minutes = /(\d+(?:\.\d+)?)\s*M/i.exec(value)?.[1] ?? "0";
  return Math.round(parseFloat(hours) * 60 + parseFloat(minutes));
}

// ---------------------------------------------------------------------------
// Servings
// ---------------------------------------------------------------------------

function parseServings(value: unknown): number {
  if (Array.isArray(value)) return parseServings(value[0]);
  if (typeof value === "number") return Math.max(1, value);
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return isNaN(n) ? 2 : Math.max(1, n);
  }
  return 2;
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

type SchemaInstructionStep = { "@type"?: string; text?: string; name?: string };

function parseInstructions(instructions: SchemaRecipe["recipeInstructions"]): string {
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

function inferMealType(category: unknown, keywords: unknown, title: string): MealSlot {
  const combined = [...asStringArray(category), ...asStringArray(keywords), title]
    .join(" ")
    .toLowerCase();

  if (
    /\b(breakfast|brunch|morning|oatmeal|pancake|waffle|french\s+toast|granola|smoothie\s+bowl|egg\s+benedict|frittata)\b/.test(
      combined,
    )
  )
    return "Breakfast";
  if (
    /\b(lunch|salad|sandwich|wrap|soup|stew|chowder|bisque|gazpacho|light\s+meal|snack)\b/.test(
      combined,
    )
  )
    return "Lunch";
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
    const text = `${ingredient.name} ${ingredient.note}`;
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
  if (totalMinutes <= 30 || ingredientCount <= 8) return "Easy";
  if (totalMinutes <= 60 && ingredientCount <= 15) return "Medium";
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
  return [...new Set(raw)].slice(0, 8);
}

// ---------------------------------------------------------------------------
// Meta title fallback
// ---------------------------------------------------------------------------

function extractMetaTitle(html: string): string | null {
  const og =
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html);
  if (og) return og[1];
  const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  if (title) return title[1].trim();
  return null;
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

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
