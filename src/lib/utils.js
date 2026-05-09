// src/lib/utils.js
export const todayKey = () => new Date().toISOString().slice(0, 10);
export const dayKey = (d) => d.toISOString().slice(0, 10);
export const fmtDate = (k) => new Date(k + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export const calcCal = (meals, mealDefs) => (mealDefs || []).reduce((sum, m) => meals?.[m.id] ? sum + m.cal : sum, 0);
export const calcProtein = (weight, mult = 1.8) => Math.round(weight * (mult || 1.8));
export const dayScore = (day, s) => { /* ... */ };
export const scoreColor = (s) => { /* ... */ };
export const calcMilestones = (start, goal, mode) => { /* ... */ };
export const getGreeting = () => { /* ... */ };
export const getMonthKeys = (year, month) => { /* ... */ };
export const getYearKeys = (year) => { /* ... */ };
export const aggregateStats = (keys, data, settings) => { /* ... */ };
export const lastNKeys = (n) => { /* ... */ };
export const defaultDay = () => ({ meals: {}, study: {}, skincare: {}, medicine: {}, workout: false, sleep: 0, water: 0, acneSeverity: 2, steps: 0, caloriesBurned: 0, notes: "" });
export const genId = () => Math.random().toString(36).slice(2, 8);
export const fileToBase64 = (file) => new Promise(/* ... */);