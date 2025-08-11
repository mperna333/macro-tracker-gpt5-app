// pages/api/parse-meal.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FDC_ENDPOINT = "https://api.nal.usda.gov/fdc/v1/foods/search";
const FDC_TYPES = encodeURIComponent("SR Legacy,Foundation,Survey (FNDDS)");

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { query } = req.body || {};
    if (!query || !query.trim()) return res.status(400).json({ error: "Missing query" });

    // 1) Ask GPT to extract foods in grams (so we can scale USDA values)
    const system = `You are a nutrition parsing engine. Convert a natural language meal into
a JSON object with normalized grams per item. When unclear, estimate grams conservatively.
IMPORTANT: Return ONLY valid JSON.`;

    const schemaExample = {
      items: [
        { name: "chicken breast, cooked", qty: 1, unit: "piece", grams: 120 },
        { name: "white rice, cooked", qty: 1, unit: "cup", grams: 158 },
        { name: "avocado", qty: 0.5, unit: "fruit", grams: 75 }
      ],
      // Optional rough totals (used only if USDA lookup fails)
      estimates: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Meal: "${query}"
Return JSON exactly like this example (keys & types), no prose:\n${JSON.stringify(schemaExample, null, 2)}` }
      ],
      // (If you prefer, swap this for response_format: { type: "json_object" })
    });

    const text = completion.choices?.[0]?.message?.content || "{}";
    const parsed = safeJson(text, { items: [], estimates: { calories:0, protein:0, carbs:0, fat:0 } });

    // 2) Look up each item in USDA FDC and scale per grams
    const apiKey = process.env.USDA_FDC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "USDA_FDC_API_KEY not set" });

    const outItems = [];
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const it of parsed.items || []) {
      const grams = Number(it.grms || it.grams || 0) || 0;
      const name = String(it.name || "").slice(0, 80);
      if (!grams || !name) continue;

      const url = `${FDC_ENDPOINT}?api_key=${apiKey}&query=${encodeURIComponent(name)}&pageSize=1&dataType=${FDC_TYPES}`;
      const r = await fetch(url);
      const data = await r.json();

      let cals = null, prot = null, carb = null, fat = null;
      const food = data?.foods?.[0];

      if (food?.foodNutrients?.length) {
        // nutrientId mapping (FDC):
        // 1008 = Energy (kcal), 1003 = Protein (g), 1005 = Carbohydrate (g), 1004 = Total lipid (fat) (g)
        const lookup = (id) => food.foodNutrients.find(n => String(n.nutrientId) === String(id));
        const n1008 = lookup(1008);
        const n1003 = lookup(1003);
        const n1005 = lookup(1005);
        const n1004 = lookup(1004);

        // Most SR/Survey values are per 100 g; scale by grams/100
        const scale = grams / 100;
        if (n1008?.value != null) cals = n1008.value * scale;
        if (n1003?.value != null) prot = n1003.value * scale;
        if (n1005?.value != null) carb = n1005.value * scale;
        if (n1004?.value != null) fat  = n1004.value * scale;
      }

      // fallback to GPT estimates if USDA not found for a field
      // (we didn't ask GPT for per-item macros to keep it simple,
      // so we only fall back to totals later if needed)

      outItems.push({
        name,
        grams,
        source: food?.description || name,
        calories: round0(cals),
        protein: round1(prot),
        carbs: round1(carb),
        fat: round1(fat),
      });

      totals.calories += cals || 0;
      totals.protein  += prot || 0;
      totals.carbs    += carb || 0;
      totals.fat      += fat || 0;
    }

    // 3) If totals are zero (no USDA matches), fall back to GPT rough totals
    if (totals.calories === 0 && (parsed.estimates?.calories || 0) > 0) {
      totals = {
        calories: round0(parsed.estimates.calories),
        protein:  round1(parsed.estimates.protein),
        carbs:    round1(parsed.estimates.carbs),
        fat:      round1(parsed.estimates.fat),
        note: "Totals estimated by model (USDA match not found)"
      };
    } else {
      totals = {
        calories: round0(totals.calories),
        protein:  round1(totals.protein),
        carbs:    round1(totals.carbs),
        fat:      round1(totals.fat),
      };
    }

    return res.status(200).json({ items: outItems, ...totals });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
}

function safeJson(s, fallback) {
  try {
    // handle code fences or stray text
    const m = s.match(/\{[\s\S]*\}$/);
    return JSON.parse(m ? m[0] : s);
  } catch {
    return fallback;
  }
}
function round0(x){ return Math.round((x ?? 0) * 1) }
function round1(x){ return Math.round((x ?? 0) * 10) / 10 }
