import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if ICP analysis is stale (older than specified days)
 * @param icp - ICP data object with last_icp_analysis timestamp
 * @param maxAgeDays - Maximum age in days before considering stale (default: 60)
 * @returns boolean indicating if analysis is stale
 */
export function isICPAnalysisStale(icp: Record<string, any> | null, maxAgeDays: number = 60): boolean {
  if (!icp?.last_icp_analysis) {
    return true
  }
  
  const lastAnalysis = new Date(icp.last_icp_analysis)
  const now = new Date()
  const daysDiff = (now.getTime() - lastAnalysis.getTime()) / (1000 * 60 * 60 * 24)
  
  return daysDiff > maxAgeDays
}
