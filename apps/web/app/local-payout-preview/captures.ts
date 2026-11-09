export const captures = {
  'stripe-entry': { width: 1443, height: 796 },
  'legal-name': { width: 393, height: 851 },
  'bank-selection': { width: 393, height: 851 },
  'manual-bank': { width: 393, height: 851 },
  'final-review': { width: 1443, height: 852 },
  'cleanup-safety': { width: 1443, height: 852 },
  'express-home': { width: 1280, height: 720 },
  'express-settings': { width: 1280, height: 720 },
};

export type Capture = keyof typeof captures;
