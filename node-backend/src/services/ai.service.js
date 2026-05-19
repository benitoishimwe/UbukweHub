'use strict';

const OpenAI = require('openai');
const config = require('../config/env');

// ─── GitHub Models — one token, four models ────────────────────────────────────
const GITHUB_ENDPOINT    = 'https://models.github.ai/inference';
const GPT4O_MODEL        = 'openai/gpt-4o';
const DEEPSEEK_MODEL     = 'deepseek/DeepSeek-R1';
const LLAMA4_MODEL       = 'meta/Llama-4-Maverick-17B-128E-Instruct-FP8';
const LLAMA_VISION_MODEL = 'meta/Llama-3.2-90B-Vision-Instruct';

const MAX_TOKENS = 4096;

let _github;
let _openai;

function getGithubClient() {
  if (!_github) {
    _github = new OpenAI({
      baseURL: GITHUB_ENDPOINT,
      apiKey: config.github.token || 'no-token',
    });
  }
  return _github;
}

function getOpenAIClient() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return _openai;
}

/**
 * Call any GitHub Models chat completion.
 * Strips DeepSeek-R1 <think>…</think> reasoning blocks automatically.
 */
async function callModel(model, messages, maxTokens = MAX_TOKENS) {
  const response = await getGithubClient().chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
  });
  let text = response.choices[0]?.message?.content || '';
  // DeepSeek-R1 wraps chain-of-thought in <think> blocks — strip before returning
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return text;
}

/** GPT-4o — general text generation (chat, planning, checklists, etc.) */
async function generateText(prompt, systemPrompt) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  return callModel(GPT4O_MODEL, messages);
}

/** DeepSeek-R1 — step-by-step reasoning for budget calculations */
async function generateWithReasoning(prompt, systemPrompt) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  return callModel(DEEPSEEK_MODEL, messages, 8192);
}

/** Llama 4 Maverick — creative design variations */
async function generateDesign(prompt) {
  return callModel(LLAMA4_MODEL, [{ role: 'user', content: prompt }]);
}

/** Llama 3.2-90B Vision — describe / enhance visual prompts */
async function generateVisualPrompt(prompt) {
  return callModel(LLAMA_VISION_MODEL, [{ role: 'user', content: prompt }]);
}

/**
 * Parse AI response text as JSON. Strips markdown code fences if present.
 */
function tryParseJson(text) {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    return stripped;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * GPT-5: Freeform AI chat — Prani wedding assistant.
 */
async function chat({ userId, message, context, eventId }) {
  const systemPrompt =
    'You are Prani, an AI assistant for event planning in Rwanda. Help with wedding planning, vendor suggestions, budget advice, inventory, staff coordination, and scheduling. Be concise, practical, and culturally aware of Rwandan wedding traditions.';

  const userContent = context
    ? `Context:\n${context}\n\nUser message:\n${message}`
    : message;

  const text = await generateText(userContent, systemPrompt);
  return { response: text };
}

/**
 * GPT-5: Calculate a wedding greatness score.
 */
async function calculateGreatness(event) {
  const prompt = `You are a wedding planning expert. Evaluate this event and give a greatness score.

Event details:
- Name: ${event.name}
- Date: ${event.eventDate || 'Not set'}
- Venue: ${event.venue || 'Not set'}
- Guest Count: ${event.guestCount || 'Not set'}
- Budget: ${event.budget || 'Not set'}
- Status: ${event.status}
- Has checklist: ${event.checklist ? 'Yes' : 'No'}
- Has timeline: ${event.timeline ? 'Yes' : 'No'}
- Notes: ${event.notes || 'None'}

Return ONLY a JSON object with this exact structure:
{
  "score": <number 0-100>,
  "confidence": <number 0-1>,
  "summary": "<2-3 sentence summary of the event's readiness>",
  "metrics": {
    "planning": { "score": <0-100>, "note": "<brief note>" },
    "budget": { "score": <0-100>, "note": "<brief note>" },
    "guest_management": { "score": <0-100>, "note": "<brief note>" },
    "vendor_coordination": { "score": <0-100>, "note": "<brief note>" },
    "timeline": { "score": <0-100>, "note": "<brief note>" }
  },
  "priority_actions": ["<action 1>", "<action 2>", "<action 3>"]
}

Return valid JSON only, no extra text.`;

  return tryParseJson(await generateText(prompt));
}

/**
 * GPT-5: Generate a detailed event checklist.
 */
async function generateChecklist({ eventType, eventDate, guestCount, venue, budget }) {
  const venueNote  = venue  ? ` at ${venue}`                                         : '';
  const budgetNote = budget ? ` with a budget of ${Number(budget).toLocaleString()} RWF` : '';

  const prompt = `Generate a detailed event checklist for a ${eventType} with ${guestCount} guests on ${eventDate}${venueNote}${budgetNote}.

Return ONLY a JSON object with this exact structure:
{
  "total_tasks": <number>,
  "timeline_summary": "<brief summary like '12 weeks of preparation'>",
  "checklist": [
    {
      "category": "<category name>",
      "tasks": [
        { "task": "<task description>", "timeline": "<e.g. 12 weeks before>", "priority": "high|medium|low" }
      ]
    }
  ]
}

Include at least 6 categories: Venue & Decor, Catering, Photography & Video, Entertainment, Attire & Beauty, Transportation, Guest Management, Day-of Coordination.
Return valid JSON only, no extra text.`;

  return tryParseJson(await generateText(prompt));
}

/**
 * DeepSeek-R1: Generate a detailed budget breakdown with step-by-step reasoning.
 */
async function generateBudget({ eventType, guestCount, totalBudget, currency, venue }) {
  const venueNote  = venue ? ` at ${venue}` : '';
  const systemPrompt = 'You are a financial planning expert specialising in event budgets in Rwanda. Provide accurate cost breakdowns in RWF based on real market rates. Think step by step.';

  const prompt = `Create a detailed budget breakdown for a ${eventType} with ${guestCount} guests${venueNote} and total budget ${totalBudget} ${currency}.

Return ONLY a JSON object with this exact structure:
{
  "total_estimated": <total number in ${currency}>,
  "per_guest_cost": <cost per guest>,
  "currency": "${currency}",
  "breakdown": [
    { "category": "<name>", "amount": <number>, "percentage": <number 0-100>, "notes": "<brief note>" }
  ]
}

Include: Venue & Decoration, Catering & Beverages, Photography & Videography, Entertainment & Music, Attire & Beauty, Flowers & Floral, Transportation, Invitations & Stationery, Miscellaneous.
All amounts in ${currency}. Return valid JSON only, no extra text.`;

  return tryParseJson(await generateWithReasoning(prompt, systemPrompt));
}

/**
 * GPT-5: Generate a day-of event timeline.
 */
async function generateTimeline({ eventType, eventDate, startTime }) {
  const prompt = `Create a detailed day-of timeline for a ${eventType} on ${eventDate} starting at ${startTime}.

Return ONLY a JSON array of timeline items. Each item:
- time (string, e.g. "10:00 AM")
- activity (string)
- duration (string, e.g. "30 minutes")
- notes (string)
- responsible (string)

Return valid JSON only, no extra text.`;

  return { timeline: tryParseJson(await generateText(prompt)) };
}

/**
 * GPT-5: Generate a seating arrangement plan.
 */
async function generateSeating({ guestCount, tableSize, specialRequests }) {
  const specialNote = specialRequests ? `\nSpecial requests: ${specialRequests}` : '';

  const prompt = `Generate a seating arrangement for ${guestCount} guests at tables of ${tableSize}.${specialNote}

Return ONLY a JSON object:
{
  "totalGuests": number,
  "tableSize": number,
  "totalTables": number,
  "tables": [
    { "tableNumber": number, "seats": number, "label": string, "notes": string }
  ],
  "recommendations": [string]
}

Return valid JSON only, no extra text.`;

  return { seatingPlan: tryParseJson(await generateText(prompt)) };
}

/**
 * GPT-5: Vendor selection guidance.
 */
async function suggestVendors({ category, budget, location, eventType }) {
  const prompt = `Suggest what to look for in a ${category} vendor for a ${eventType} with budget ${budget} in ${location}.

Include: key qualities, questions to ask, red flags, pricing ranges, and how to evaluate portfolios.
Be specific and practical.`;

  return { suggestions: await generateText(prompt) };
}

/**
 * GPT-5: Generate save-the-date copy.
 */
async function generateSaveTheDateText({ occasion, coupleNames, date, venue, style }) {
  const prompt = `Write save-the-date text for ${occasion}: ${coupleNames}, ${date} at ${venue} in ${style} style.

Return ONLY a JSON object:
{
  "headline": string,
  "subtext": string,
  "callToAction": string
}

Warm, elegant, appropriate for the ${style} style. Return valid JSON only, no extra text.`;

  return tryParseJson(await generateText(prompt));
}

/**
 * Llama 3.2-90B Vision: Generate save-the-date card wording & design elements.
 * Returns structured JSON used by the SVG builder.
 */
async function generateSaveTheDateCard(design) {
  const tc = design.textContent || {};
  const style = design.style || {};
  const template = design.templateId || 'elegant-floral';
  const primaryColor = style.primaryColor || '#C9A84C';

  const prompt = `You are a wedding invitation designer. Create beautiful save-the-date card wording.

Design title: ${design.title}
Template: ${template}
${tc.headline ? `Headline hint: ${tc.headline}` : ''}
${tc.eventDate ? `Date: ${tc.eventDate}` : ''}
${tc.venue ? `Venue: ${tc.venue}` : ''}
${tc.rsvpInfo ? `RSVP: ${tc.rsvpInfo}` : ''}
Primary color: ${primaryColor}

Return ONLY a JSON object:
{
  "coupleNames": "<names extracted from title, formatted elegantly, e.g. 'Amina & Jean'>",
  "date": "<formatted date, e.g. 'Saturday, 15 March 2026'>",
  "venue": "<venue name, concise>",
  "tagline": "<romantic 1-line tagline, max 50 chars>",
  "rsvp": "<RSVP line, max 40 chars>",
  "mood": "<one word: romantic|elegant|rustic|modern|traditional>"
}

Return valid JSON only, no extra text.`;

  const raw = await callModel(LLAMA_VISION_MODEL, [{ role: 'user', content: prompt }], 512);
  return tryParseJson(raw);
}

/**
 * Llama 3.2-90B Vision enhances the prompt description,
 * then DALL-E 3 (OpenAI) renders the actual save-the-date image.
 */
async function generateSaveTheDateImage({ prompt, style }) {
  const visualDesc = await generateVisualPrompt(
    `Write a single detailed paragraph for an AI image generator describing a save-the-date wedding card.
Theme: ${prompt}. Style: ${style || 'elegant, classic'}.
Include: composition, color palette, decorative elements, typography mood, overall atmosphere.
No headings, one paragraph only.`
  );

  const fullPrompt = `${visualDesc} High quality, elegant wedding save-the-date card.`;
  const response = await getOpenAIClient().images.generate({
    model: 'dall-e-3',
    prompt: fullPrompt.substring(0, 1000),
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });

  return { imageUrl: response.data[0].url };
}

/**
 * Llama 4 Maverick: Generate 3 distinct design theme variations.
 */
async function generateDesignVariations({ occasion, style, colors, guestCount }) {
  const prompt = `Generate 3 distinct wedding design theme variations for a ${occasion} with ${guestCount} guests.
Preferred style: ${style}. Color hints: ${colors || 'not specified'}.

Return ONLY a JSON array of 3 objects:
[
  {
    "name": "<theme name>",
    "description": "<2-3 sentences>",
    "primaryColor": "<hex>",
    "accentColor": "<hex>",
    "keyElements": ["<element 1>", "<element 2>", "<element 3>"],
    "venueStyle": "<indoor|outdoor|garden|ballroom>",
    "estimatedCostMultiplier": <1.0|1.2|1.5>
  }
]

Return valid JSON only.`;

  return { variations: tryParseJson(await generateDesign(prompt)) };
}

module.exports = {
  chat,
  calculateGreatness,
  generateChecklist,
  generateBudget,
  generateTimeline,
  generateSeating,
  suggestVendors,
  generateSaveTheDateText,
  generateSaveTheDateCard,
  generateSaveTheDateImage,
  generateDesignVariations,
};
