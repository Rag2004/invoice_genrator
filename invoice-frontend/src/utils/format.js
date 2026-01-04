// src/utils/format.js
export function padSeq(n, len = 3) {
  return String(n).padStart(len, '0')
}
export function formatCurrency(value, currency='INR') {
  try { return new Intl.NumberFormat('en-IN', { style:'currency', currency, maximumFractionDigits:2 }).format(Number(value)||0) }
  catch(e) { return `₹${(Number(value)||0).toFixed(2)}` }
}
