// src/lib/theme.js
export const C = {
  gold: "#c8a97e", goldDim: "#8a6e4a", goldBg: "rgba(200,169,126,0.12)",
  // ... rest of your C object
};
export const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
export const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: .5 } }, exit: { opacity: 0, y: -12 } };
export const stagger = { visible: { transition: { staggerChildren: .07 } } };
export const scaleIn = { hidden: { opacity: 0, scale: .92 }, visible: { opacity: 1, scale: 1 } };
export const slideRight = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } };