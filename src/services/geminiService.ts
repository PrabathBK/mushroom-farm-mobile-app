import { CurrentSensorValues, MLModelInfo, LightControl, Alert } from '../types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ─── Schema ───────────────────────────────────────────────────────────────────

export type Severity  = 'good' | 'warning' | 'critical';
export type Priority  = 'immediate' | 'today' | 'monitor';
export type ImpactArea = 'yield' | 'quality' | 'health' | 'safety' | 'efficiency';

export interface AdvisoryItem {
  /** Short category label shown in tab / card header */
  category: string;
  /** Traffic-light severity */
  severity: Severity;
  /** 1-line headline */
  title: string;
  /** 2-3 sentence explanation of WHY this matters right now */
  situation: string;
  /** Ordered list of concrete things the farmer should physically do */
  steps: string[];
  /** When to act: immediate (<2 h), today (<24 h), monitor (keep watching) */
  priority: Priority;
  /** Which farming outcome is most affected */
  impact: ImpactArea;
  /** Expected outcome if steps are followed */
  expectedOutcome: string;
}

export interface FarmSummary {
  /** 0-100 overall farm health score computed by the model */
  healthScore: number;
  /** One-paragraph plain-English farm status for the operator */
  overallSituation: string;
  /** Predicted days to next harvest (null if not determinable) */
  daysToHarvest: number | null;
  /** Ordered advisory items, most urgent first */
  items: AdvisoryItem[];
}

export interface FarmContext {
  sensors: CurrentSensorValues;
  mlModel: MLModelInfo | null;
  lightControl: LightControl | null;
  recentAlerts: Alert[];
}

// ─── Optimal ranges (Oyster mushroom / Pleurotus ostreatus industry standards) ─
const OPTIMAL_RANGES = {
  temperature: { min: 15,  max: 24,   unit: '°C',  name: 'Temperature',        critLow: 10,   critHigh: 28   },
  humidity:    { min: 80,  max: 95,   unit: '%',   name: 'Air Humidity',        critLow: 70,   critHigh: 100  },
  co2:         { min: 0,   max: 1000, unit: 'ppm', name: 'CO₂',                critLow: -1,   critHigh: 1500 },
  moisture:    { min: 65,  max: 75,   unit: '%',   name: 'Substrate Moisture',  critLow: 55,   critHigh: 80   },
  ph:          { min: 6.0, max: 7.0,  unit: '',    name: 'pH',                  critLow: 5.5,  critHigh: 7.5  },
};

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(ctx: FarmContext): string {
  const { sensors, mlModel, lightControl, recentAlerts } = ctx;
  const r = OPTIMAL_RANGES;

  // Returns WARNING or CRITICAL deviation tag, or OK
  type RangeEntry = { min: number; max: number; critLow: number; critHigh: number };
  const tag = (val: number, p: RangeEntry): string => {
    if (val <= p.critLow)  return `⛔ CRITICAL — ${(p.min - val).toFixed(1)} below safe minimum`;
    if (val >= p.critHigh) return `⛔ CRITICAL — ${(val - p.max).toFixed(1)} above safe maximum`;
    if (val < p.min)       return `⚠ WARNING — ${(p.min - val).toFixed(1)} below optimal`;
    if (val > p.max)       return `⚠ WARNING — ${(val - p.max).toFixed(1)} above optimal`;
    return '✓ within optimal range';
  };

  const sensorBlock = `
LIVE SENSOR DATA (species: Oyster mushroom / Pleurotus ostreatus):
| Parameter           | Current              | Optimal Range         | Critical Limits        | Status                                      |
|---------------------|----------------------|-----------------------|------------------------|---------------------------------------------|
| Temperature         | ${sensors.temperature}°C           | ${r.temperature.min}–${r.temperature.max}°C         | <${r.temperature.critLow}°C or >${r.temperature.critHigh}°C     | ${tag(sensors.temperature, r.temperature)} |
| Air Humidity        | ${sensors.humidity}%             | ${r.humidity.min}–${r.humidity.max}%          | <${r.humidity.critLow}%                   | ${tag(sensors.humidity, r.humidity)} |
| CO₂                 | ${sensors.co2} ppm          | <${r.co2.max} ppm             | >${r.co2.critHigh} ppm                | ${tag(sensors.co2, r.co2)} |
| Substrate Moisture  | ${sensors.moisture === 0 ? 'N/A (offline)' : sensors.moisture + '%'}        | ${r.moisture.min}–${r.moisture.max}%          | <${r.moisture.critLow}% or >${r.moisture.critHigh}%    | ${sensors.moisture === 0 ? '⚠ WARNING — sensor offline or reading zero' : tag(sensors.moisture, r.moisture)} |
| pH                  | ${sensors.ph}               | ${r.ph.min}–${r.ph.max}             | <${r.ph.critLow} or >${r.ph.critHigh}          | ${tag(sensors.ph, r.ph)} |`.trim();

  const mlBlock = mlModel ? `
ML MODEL PREDICTIONS:
- Model: ${mlModel.name ?? 'Mushroom ML Model'} v${mlModel.version ?? '1.0'} (accuracy: ${mlModel.accuracy}%)
- Model Status: ${mlModel.status}
- Fruiting Readiness: ${mlModel.predictions?.fruitingReadiness ?? 'N/A'}%
- Health Score: ${mlModel.predictions?.healthScore ?? 'N/A'}%
- Estimated Harvest Date: ${mlModel.predictions?.estimatedHarvestDate ?? 'N/A'}` : 'ML MODEL: data unavailable';

  const lightBlock = lightControl
    ? `LIGHTING: ${lightControl.status?.toUpperCase()}, intensity ${lightControl.intensity}%, control mode: ${lightControl.isAuto ? 'AUTO (ML-managed)' : 'MANUAL'}`
    : 'LIGHTING: data unavailable';

  const alertBlock = recentAlerts.length > 0
    ? `RECENT ALERTS:\n` + recentAlerts.slice(-5).map(a =>
        `- [${(a.type ?? 'INFO').toUpperCase()}] ${a.message ?? 'No message'}${(a as any).confidence != null ? ` — confidence: ${(a as any).confidence}%` : ''}`
      ).join('\n')
    : 'RECENT ALERTS: none';

  return `You are an expert mushroom cultivation agronomist advising a real commercial oyster mushroom farm. Your role is an on-site production advisor — give guidance that a farm worker can act on immediately with the equipment and environment described.

SPECIES: Oyster mushroom (Pleurotus ostreatus)
TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

${sensorBlock}

${mlBlock}

${lightBlock}

${alertBlock}

───────────────────────────────────────────────
DOMAIN KNOWLEDGE BASE — use these rules to drive your advisory:

TEMPERATURE:
  - >24°C (WARNING): Increase ventilation, install 50–70% shade netting outside, place water trays inside for evaporative cooling, run mist nozzles for 5 min every hour, harvest any existing pinheads immediately.
  - >28°C (CRITICAL): All of the above PLUS stop misting the substrate (prevents bacterial blotch at heat), move bags away from heat sources, consider adding ice blocks or chilled water trays.
  - <15°C (WARNING): Seal all gap drafts with foam tape, set space heater to maintain minimum 18°C, wrap growing room in black plastic mulch to retain warmth.
  - <10°C (CRITICAL): Mycelium is at risk — bring temperature to 18°C within 2 hours, insulate walls, use supplemental heating; inspect all bags for cold stress signs.

HUMIDITY:
  - <80% (WARNING): Mist walls, floor and air 4–6× daily using a fine-nozzle sprayer, hang wet burlap sacks at air inlets, reduce fan speed by 30–50%, set pulse humidifier to cycle every 30 min.
  - <70% (CRITICAL): Pin primordia will dehydrate within hours — emergency misting every 15 min, seal all air leaks, add standing water trays, target 85–90% recovery within 1 hour.
  - >95% (WARNING): Run full ventilation for 15–20 min, stop all misting immediately, inspect bags for signs of bacterial blotch (brown slimy patches), apply dilute calcium hypochlorite solution (1 tsp per 10 L water) as a precaution.
  - >95% (CRITICAL if blotch confirmed): Remove infected bags, disinfect room with 1% bleach mist, increase air exchanges to 8–10 per hour.

CO₂:
  - >1000 ppm (WARNING): Open all air inlets and run exhaust fans for 20 min, check for blocked vents or fans, reduce bag density by 20–30% if above 1200 ppm.
  - >1500 ppm (CRITICAL): Elongated stems and thin caps forming — emergency ventilation, verify exhaust fan is operational, install a timer ventilation cycle (10 min on / 20 min off), consider reducing bag count.

SUBSTRATE MOISTURE:
  - <65% (WARNING): Perform cold-water soaking of bags for 4–6 hours, or use syringe injection technique; target substrate weight 10–15% heavier than dry weight after rehydration.
  - <55% (CRITICAL): Fruiting will stop — immediate full-submersion soak for 6–8 hours, monitor bag weight to confirm rehydration, do not attempt soaking if Trichoderma is present.
  - >75% (WARNING): Stop all watering immediately, run fans 1–2 hours to dry substrate surface, inspect bags closely for Trichoderma (bright green patches on substrate surface).
  - >80% (CRITICAL): Trichoderma (green mould) likely — isolate and remove affected bags, clean room with 1% bleach solution, allow room to dry for 24 hours before resuming.

pH:
  - <6.0 (WARNING): Mix hydrated lime or wood ash solution at 2–3 g/L, apply to substrate surface, test new substrate batches before spawning.
  - <5.5 (CRITICAL): Mycelium colonisation suppressed — treat all bags with lime solution, discard bags with <20% colonisation, adjust water supply pH if source is acidic.
  - >7.0 (WARNING): Apply citric acid solution at 3–5 g/L to substrate surface, incorporate coffee grounds or rice bran at 5–10% by weight in next batch, check water supply pH.
  - >7.5 (CRITICAL): Mycelium suppressed — acidify substrate, consider full substrate replacement for any bags showing stalled colonisation.

LIGHTING:
  - Optimal: 8–12 hours indirect light per day, 1,000–2,000 lux.
  - Intensity >80%: Risk of heat buildup — reduce to 60% or below, ensure lighting is indirect (diffuse).
  - No light: Pins may not form or orient correctly — ensure minimum 8h of 1,000 lux indirect light.

PEST / DISEASE:
  - General: Install sticky yellow traps near air inlets, apply diatomaceous earth at doorways and around bag bases, use Bacillus thuringiensis (Bti) drench if fungus gnats detected, remove and bag any infested growing bags immediately.

healthScore FORMULA: Start at 100. Deduct 5 for each WARNING parameter, deduct 15 for each CRITICAL parameter. Minimum 0. Apply this formula strictly — do not round up.

───────────────────────────────────────────────
YOUR TASK: Produce a complete "FarmSummary" JSON object with this EXACT shape:

{
  "healthScore": <integer 0-100 computed by the formula above>,
  "overallSituation": "<2-3 sentence plain-English summary: what is the farm's current state, what is going well and what needs urgent attention — include actual sensor values>",
  "daysToHarvest": <integer days until likely harvest, or null if not determinable>,
  "items": [
    {
      "category": "<one of: Temperature | Humidity | CO2 | Substrate | pH | Lighting | Pest & Disease | Harvest | General>",
      "severity": "<good | warning | critical>",
      "priority": "<immediate | today | monitor>",
      "impact": "<yield | quality | health | safety | efficiency>",
      "title": "<concise 6-10 word headline that INCLUDES the actual sensor value, e.g. 'Temperature at 30.6°C — Reduce Heat Urgently'>",
      "situation": "<2-3 sentences: what the current reading means for the crop RIGHT NOW — be specific with the exact numbers and what physiological damage is occurring or about to occur>",
      "steps": [
        "<step 1: exact physical action with quantities, e.g. 'Open ventilation louvers to 60% on both north and south walls'>",
        "<step 2: ...>",
        "<step 3: ...>"
      ],
      "expectedOutcome": "<one sentence: what will improve and by when if steps are followed, with a target value>"
    }
  ]
}

RULES:
1. Include an item for EVERY parameter that is out of range. Mark severity "critical" if value breaches the CRITICAL threshold, "warning" if it breaches optimal but not critical.
2. Include items for parameters IN range only if there is genuinely useful cultivation advice.
3. Always include a "Harvest" item assessing readiness based on ML predictions.
4. Always include a "General" item as the last entry — overall farm management advice.
5. Steps must be PHYSICAL and SPECIFIC with quantities. Never say "adjust conditions" — say exactly what to turn, open, spray, add, measure.
6. Each item must have at least 3 steps.
7. Sort items: critical first, then warning, then good/monitor.
8. healthScore: apply the formula strictly (start 100, −15 per critical, −5 per warning). Do NOT invent a different score.
9. title MUST contain the actual sensor reading for out-of-range items (e.g. "Humidity at 72.1% — Below Optimal").
10. daysToHarvest: use ML estimatedHarvestDate if available; compute days from today.

Respond ONLY with the JSON object. No markdown, no preamble, no explanation.`;
}

// ─── API call ─────────────────────────────────────────────────────────────────
export async function getMushroomAdvisory(context: FarmContext): Promise<FarmSummary> {
  const prompt = buildPrompt(context);

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  const finishReason: string = data?.candidates?.[0]?.finishReason ?? 'UNKNOWN';
  if (finishReason === 'MAX_TOKENS') {
    throw new Error('Gemini response was truncated (MAX_TOKENS). Please try again.');
  }

  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!rawText) {
    throw new Error(`Empty Gemini response. finishReason: ${finishReason}`);
  }

  // Belt-and-suspenders: strip any accidental markdown fences
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let result: FarmSummary;
  try {
    result = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Gemini JSON. Preview: ${cleaned.slice(0, 300)}`);
  }

  if (!result || !Array.isArray(result.items)) {
    throw new Error('Gemini response missing required "items" array');
  }

  return result;
}
