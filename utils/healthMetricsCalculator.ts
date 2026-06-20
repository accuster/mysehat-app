// utils/healthMetricsCalculator.ts

/**
 * Health Metrics Calculator
 * Matches the database trigger logic for calculating BMI, body fat, ideal weight, etc.
 */

export interface HealthMetrics {
  bmi: number;
  bmiStatus: string;
  idealWeight: number;
  bodyFatPercentage: number;
  fatMass: number;
  leanBodyMass: number;
  healthScore: number;
}

export interface HealthMetricsInput {
  height: number; // in cm
  weight: number; // in kg
  age: number;
  gender: 'Men' | 'Women' | 'Male' | 'Female' | 'Other';
}

/**
 * Get gender flag (matches database logic)
 * Male = 1, Female = 0, Other = 0
 */
function getGenderFlag(gender: string): number {
  const normalized = gender.toLowerCase();
  if (normalized === 'male' || normalized === 'men') {
    return 1;
  }
  return 0; // Female or Other
}

/**
 * Get target BMI based on gender
 * Male = 22, Female = 21
 */
function getTargetBMI(genderFlag: number): number {
  return genderFlag === 1 ? 22 : 21;
}

/**
 * Calculate BMI Status
 */
export function getBMIStatus(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi >= 18.5 && bmi < 25) return 'Normal';
  if (bmi >= 25 && bmi < 30) return 'Overweight';
  return 'Obese';
}

/**
 * Calculate all health metrics
 * Matches the database trigger logic exactly
 */
export function calculateHealthMetrics(input: HealthMetricsInput): HealthMetrics {
  const { height, weight, age, gender } = input;

  // Validate inputs
  if (!height || !weight || !age || !gender) {
    throw new Error('Missing required parameters: height, weight, age, or gender');
  }

  if (height <= 0 || weight <= 0 || age <= 0) {
    throw new Error('Height, weight, and age must be positive numbers');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Calculate BMI
  // ═══════════════════════════════════════════════════════════════════════════
  const heightInMeters = height / 100;
  const bmi = weight / Math.pow(heightInMeters, 2);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Get gender flag and target BMI
  // ═══════════════════════════════════════════════════════════════════════════
  const genderFlag = getGenderFlag(gender);
  const targetBMI = getTargetBMI(genderFlag);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Calculate Ideal Weight
  // ═══════════════════════════════════════════════════════════════════════════
  // ideal_weight = target_bmi * (height_in_meters)^2
  const idealWeight = targetBMI * Math.pow(heightInMeters, 2);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Calculate Body Fat Percentage (Deurenberg Formula)
  // ═══════════════════════════════════════════════════════════════════════════
  // body_fat = (1.20 * bmi) + (0.23 * age) - (10.8 * gender_flag) - 5.4
  const bodyFatPercentage = 
    (1.20 * bmi) + 
    (0.23 * age) - 
    (10.8 * genderFlag) - 
    5.4;

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Calculate Fat Mass
  // ═══════════════════════════════════════════════════════════════════════════
  // fat_mass = weight * body_fat_pct / 100
  const fatMass = weight * bodyFatPercentage / 100;

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Calculate Lean Body Mass
  // ═══════════════════════════════════════════════════════════════════════════
  // lean_body_mass = weight - fat_mass
  const leanBodyMass = weight - fatMass;

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Calculate Health Score (0-100)
  // ═══════════════════════════════════════════════════════════════════════════
  // score = 100 - (ABS(bmi - target_bmi) * 1.5) - (GREATEST(body_fat - 22, 0) * 1.2)
  let healthScore = 100 
    - (Math.abs(bmi - targetBMI) * 1.5) 
    - (Math.max(bodyFatPercentage - 22, 0) * 1.2);

  // Cap between 0 and 100
  healthScore = Math.max(0, Math.min(100, healthScore));

  // ═══════════════════════════════════════════════════════════════════════════
  // Return all calculated metrics
  // ═══════════════════════════════════════════════════════════════════════════
  return {
    bmi: parseFloat(bmi.toFixed(1)),
    bmiStatus: getBMIStatus(bmi),
    idealWeight: parseFloat(idealWeight.toFixed(1)),
    bodyFatPercentage: parseFloat(bodyFatPercentage.toFixed(1)),
    fatMass: parseFloat(fatMass.toFixed(1)),
    leanBodyMass: parseFloat(leanBodyMass.toFixed(1)),
    healthScore: parseFloat(healthScore.toFixed(1)),
  };
}

/**
 * Generate detailed health insights based on metrics
 */
export function getHealthInsights(metrics: HealthMetrics): {
  bmiInsight: string;
  bodyFatInsight: string;
  healthScoreInsight: string;
  recommendations: string[];
} {
  const insights = {
    bmiInsight: '',
    bodyFatInsight: '',
    healthScoreInsight: '',
    recommendations: [] as string[],
  };

  // BMI Insight
  if (metrics.bmi < 18.5) {
    insights.bmiInsight = 'Your BMI indicates you are underweight. Consider consulting a nutritionist.';
    insights.recommendations.push('Increase caloric intake with nutrient-dense foods');
    insights.recommendations.push('Include protein-rich foods in your diet');
  } else if (metrics.bmi >= 18.5 && metrics.bmi < 25) {
    insights.bmiInsight = 'Your BMI is in the healthy range. Keep up the good work!';
    insights.recommendations.push('Maintain your current healthy lifestyle');
    insights.recommendations.push('Regular exercise and balanced diet');
  } else if (metrics.bmi >= 25 && metrics.bmi < 30) {
    insights.bmiInsight = 'Your BMI indicates you are overweight. Consider lifestyle modifications.';
    insights.recommendations.push('Reduce caloric intake by 300-500 calories/day');
    insights.recommendations.push('Increase physical activity to 150+ minutes/week');
  } else {
    insights.bmiInsight = 'Your BMI indicates obesity. Please consult a healthcare professional.';
    insights.recommendations.push('Seek professional guidance for weight management');
    insights.recommendations.push('Start with small, sustainable lifestyle changes');
  }

  // Body Fat Insight
  if (metrics.bodyFatPercentage < 10) {
    insights.bodyFatInsight = 'Very low body fat. Ensure adequate nutrition.';
  } else if (metrics.bodyFatPercentage >= 10 && metrics.bodyFatPercentage < 20) {
    insights.bodyFatInsight = 'Healthy body fat percentage.';
  } else if (metrics.bodyFatPercentage >= 20 && metrics.bodyFatPercentage < 30) {
    insights.bodyFatInsight = 'Slightly elevated body fat. Consider increasing activity.';
  } else {
    insights.bodyFatInsight = 'High body fat percentage. Focus on fat loss strategies.';
  }

  // Health Score Insight
  if (metrics.healthScore >= 80) {
    insights.healthScoreInsight = 'Excellent health indicators! Keep maintaining your healthy lifestyle.';
  } else if (metrics.healthScore >= 60) {
    insights.healthScoreInsight = 'Good health status with room for improvement.';
  } else if (metrics.healthScore >= 40) {
    insights.healthScoreInsight = 'Moderate health indicators. Consider lifestyle improvements.';
  } else {
    insights.healthScoreInsight = 'Health indicators need attention. Consult a healthcare professional.';
  }

  return insights;
}

/**
 * Format metrics for display
 */
export function formatMetricsForDisplay(metrics: HealthMetrics): {
  bmi: string;
  bmiStatus: string;
  idealWeight: string;
  bodyFat: string;
  fatMass: string;
  leanBodyMass: string;
  healthScore: string;
} {
  return {
    bmi: metrics.bmi.toFixed(1),
    bmiStatus: metrics.bmiStatus,
    idealWeight: `${metrics.idealWeight.toFixed(1)} kg`,
    bodyFat: `${metrics.bodyFatPercentage.toFixed(1)}%`,
    fatMass: `${metrics.fatMass.toFixed(1)} kg`,
    leanBodyMass: `${metrics.leanBodyMass.toFixed(1)} kg`,
    healthScore: `${metrics.healthScore.toFixed(0)}/100`,
  };
}

/**
 * Log calculated metrics (for debugging)
 */
export function logHealthMetrics(input: HealthMetricsInput, metrics: HealthMetrics): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 HEALTH METRICS CALCULATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 INPUT:');
  console.log(`   Height: ${input.height} cm`);
  console.log(`   Weight: ${input.weight} kg`);
  console.log(`   Age: ${input.age} years`);
  console.log(`   Gender: ${input.gender}`);
  console.log('');
  console.log('📈 CALCULATED METRICS:');
  console.log(`   BMI: ${metrics.bmi} (${metrics.bmiStatus})`);
  console.log(`   Ideal Weight: ${metrics.idealWeight} kg`);
  console.log(`   Body Fat: ${metrics.bodyFatPercentage}%`);
  console.log(`   Fat Mass: ${metrics.fatMass} kg`);
  console.log(`   Lean Body Mass: ${metrics.leanBodyMass} kg`);
  console.log(`   Health Score: ${metrics.healthScore}/100`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
