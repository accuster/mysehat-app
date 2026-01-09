export const TYPOGRAPHY = {
  size: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    "2xl": 22,
    "3xl": 28,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
} as const;

export type FontSizeKey = keyof typeof TYPOGRAPHY.size;
export type FontWeightKey = keyof typeof TYPOGRAPHY.weight;