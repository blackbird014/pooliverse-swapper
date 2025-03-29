
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Enhanced formatNumber function to handle large and small numbers more elegantly
export function formatNumber(num: string | number, decimals: number = 4): string {
  if (typeof num === 'string') {
    num = parseFloat(num);
  }
  
  // Check for NaN or undefined
  if (isNaN(num) || num === undefined) return "0";
  
  // For very large numbers, use compact notation
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  }
  
  // For very small numbers (but not zero), use scientific notation
  if (num < 0.0001 && num > 0) {
    return num.toExponential(2);
  }
  
  // For normal size numbers
  return num.toFixed(decimals);
}
