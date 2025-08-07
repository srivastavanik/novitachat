import { Request, Response, NextFunction } from 'express';
import { resetDailyUsage } from '../routes/usage.routes';

// Track the last reset date to avoid multiple resets
let lastResetDate: string | null = null;

// Function to get current date in PST
const getCurrentPSTDate = (): string => {
  const now = new Date();
  // Convert to PST (UTC-8)
  const pstTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  return pstTime.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Middleware to check and perform daily reset if needed
export const usageResetMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentPSTDate = getCurrentPSTDate();
    
    // If we haven't reset today yet, do it now
    if (lastResetDate !== currentPSTDate) {
      console.log(`Performing daily usage reset for date: ${currentPSTDate}`);
      await resetDailyUsage();
      lastResetDate = currentPSTDate;
      console.log('Daily usage reset completed');
    }
    
    next();
  } catch (error) {
    console.error('Error in usage reset middleware:', error);
    // Don't block the request if reset fails
    next();
  }
};