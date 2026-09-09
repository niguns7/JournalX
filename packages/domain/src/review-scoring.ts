import { DailyGrade } from './enums.js';
import { ProcessChecklistItem, ProcessJson } from './types.js';

export interface CalculateDailyProcessScoreInput {
  items: ProcessChecklistItem[];
  isNoTradeDay?: boolean;
  hasSeriousViolation?: boolean; // revenge trading, oversizing, stop widening, omitted execution
  hasRiskViolation?: boolean;
}

export interface CalculateDailyProcessScoreOutput {
  score: number; // 0-10
  passedCount: number;
  applicableCount: number;
  grade: DailyGrade;
  gradeReason: string;
  processJson: ProcessJson;
}

export function calculateDailyProcessScore(
  input: CalculateDailyProcessScoreInput,
): CalculateDailyProcessScoreOutput {
  const items = input.items || [];
  let passedCount = 0;
  let applicableCount = 0;

  for (const item of items) {
    if (item.applicable) {
      applicableCount++;
      if (item.passed) {
        passedCount++;
      }
    }
  }

  let score: number;
  if (applicableCount === 0) {
    score = input.isNoTradeDay ? 10 : 0;
  } else {
    score = Math.round((10 * passedCount) / applicableCount);
    // Clamp to 0-10
    score = Math.max(0, Math.min(10, score));
  }

  let grade: DailyGrade;
  let gradeReason: string;

  if (input.hasSeriousViolation) {
    grade = DailyGrade.D;
    gradeReason = 'Grade D assigned due to serious process violation (e.g., revenge trading, stop widening, oversizing).';
  } else if (score >= 9 && !input.hasRiskViolation) {
    grade = DailyGrade.A;
    gradeReason = input.isNoTradeDay
      ? 'Grade A achieved on disciplined no-trade day.'
      : `Grade A achieved with process score ${score}/10 and no serious violations.`;
  } else if (score >= 7 && !input.hasRiskViolation) {
    grade = DailyGrade.B;
    gradeReason = `Grade B achieved with process score ${score}/10 and good risk control.`;
  } else {
    grade = DailyGrade.C;
    gradeReason = input.hasRiskViolation
      ? `Grade C assigned due to risk violation (score: ${score}/10).`
      : `Grade C assigned due to sub-7 process score (${score}/10).`;
  }

  return {
    score,
    passedCount,
    applicableCount,
    grade,
    gradeReason,
    processJson: {
      score,
      passedCount,
      applicableCount,
      items,
    },
  };
}
