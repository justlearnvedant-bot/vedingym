// src/services/ai.service.js
export const SYSTEM_PROMPT = `You are Vedinzen AI...`;
export const FOOD_ANALYSIS_PROMPT = `You are a nutrition expert...`;
export const QUICK_PROMPTS = [ /* ... */ ];

export function buildAIContext(data, latestWeight, settings) { /* ... */ }

export async function callAI({ model, system, history, imageBase64, imageMime }) {
  // Try backend first, fallback to direct API
}