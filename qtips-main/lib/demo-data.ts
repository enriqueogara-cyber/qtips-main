/**
 * QTips — Demo data for commercial presentations
 *
 * Activate with EXPO_PUBLIC_DEMO_MODE=true in .env.local
 * NEVER activates in production (never set that env var in Vercel).
 *
 * Usage:
 *   import { IS_DEMO, DEMO_RESTAURANT, DEMO_TIPS, DEMO_EMPLOYEES } from '@/lib/demo-data';
 *   if (IS_DEMO) { ... use demo data ... } else { ... use Firebase ... }
 */

export const IS_DEMO = process.env.EXPO_PUBLIC_DEMO_MODE === "true";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTs(daysAgo: number, hour = 13, minute = 0): { toDate: () => Date } {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  const frozen = new Date(d);
  return { toDate: () => new Date(frozen) };
}

// ─── Restaurant ───────────────────────────────────────────────────────────────

export const DEMO_RESTAURANT = {
  name: "Restaurante QTips",
  address: "Calle Gran Vía 28, Madrid",
  stripe_account_id: "acct_demo123",
  stripe_onboarding_complete: true,
  stripe_charges_enabled: true,
  stripe_payouts_enabled: true,
  stripe_account_status: "active",
  tipDistributionMode: "employee_optional" as const,
};

// ─── Employees ────────────────────────────────────────────────────────────────

export const DEMO_EMPLOYEES = [
  { id: "emp1", name: "María García",    role: "Camarera",      status: "active"   },
  { id: "emp2", name: "Carlos López",    role: "Barista",       status: "active"   },
  { id: "emp3", name: "Ana Martínez",    role: "Jefa de sala",  status: "active"   },
  { id: "emp4", name: "Javier Torres",   role: "Sumiller",      status: "active"   },
  { id: "emp5", name: "Lucía Fernández", role: "Ayudante",      status: "active"   },
  { id: "emp6", name: "Pablo Ruiz",      role: "Cocinero",      status: "inactive" },
] as const;

// ─── Tip type ─────────────────────────────────────────────────────────────────

export type DemoTip = {
  id: string;
  restaurantId: string;
  employeeName: string;
  employeeId: string | null;
  amount: number;
  amountCents: number;
  feeCents: number;
  currency: string;
  status: string;
  isTest: boolean;
  createdAt: { toDate: () => Date };
  paidAt: { toDate: () => Date } | null;
};

// ─── Tips — current period (last 14 days) ────────────────────────────────────

export const DEMO_TIPS: DemoTip[] = [
  // Today
  { id: "t01", restaurantId: "demo", employeeName: "María García",    employeeId: "emp1", amount: 5.00,  amountCents: 500,  feeCents: 23,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(0, 14, 30), paidAt: makeTs(0, 14, 31) },
  { id: "t02", restaurantId: "demo", employeeName: "Carlos López",    employeeId: "emp2", amount: 3.00,  amountCents: 300,  feeCents: 14,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(0, 12, 0),  paidAt: makeTs(0, 12, 1)  },
  { id: "t03", restaurantId: "demo", employeeName: "Ana Martínez",    employeeId: "emp3", amount: 8.00,  amountCents: 800,  feeCents: 37,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(0, 21, 15), paidAt: makeTs(0, 21, 16) },
  // Yesterday
  { id: "t04", restaurantId: "demo", employeeName: "María García",    employeeId: "emp1", amount: 4.00,  amountCents: 400,  feeCents: 18,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(1, 20, 0),  paidAt: makeTs(1, 20, 1)  },
  { id: "t05", restaurantId: "demo", employeeName: "Ana Martínez",    employeeId: "emp3", amount: 12.00, amountCents: 1200, feeCents: 55,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(1, 21, 30), paidAt: makeTs(1, 21, 31) },
  { id: "t06", restaurantId: "demo", employeeName: "Carlos López",    employeeId: "emp2", amount: 3.50,  amountCents: 350,  feeCents: 16,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(1, 13, 0),  paidAt: makeTs(1, 13, 1)  },
  { id: "t07", restaurantId: "demo", employeeName: "Javier Torres",   employeeId: "emp4", amount: 6.00,  amountCents: 600,  feeCents: 28,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(1, 22, 45), paidAt: makeTs(1, 22, 46) },
  // 2 days ago
  { id: "t08", restaurantId: "demo", employeeName: "Lucía Fernández", employeeId: "emp5", amount: 2.00,  amountCents: 200,  feeCents: 9,   currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(2, 14, 0),  paidAt: makeTs(2, 14, 1)  },
  { id: "t09", restaurantId: "demo", employeeName: "María García",    employeeId: "emp1", amount: 5.50,  amountCents: 550,  feeCents: 25,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(2, 20, 30), paidAt: makeTs(2, 20, 31) },
  { id: "t10", restaurantId: "demo", employeeName: "Propina general", employeeId: null,   amount: 2.00,  amountCents: 200,  feeCents: 9,   currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(2, 12, 45), paidAt: makeTs(2, 12, 46) },
  // 3 days ago
  { id: "t11", restaurantId: "demo", employeeName: "Ana Martínez",    employeeId: "emp3", amount: 10.00, amountCents: 1000, feeCents: 46,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(3, 21, 0),  paidAt: makeTs(3, 21, 1)  },
  { id: "t12", restaurantId: "demo", employeeName: "Carlos López",    employeeId: "emp2", amount: 4.00,  amountCents: 400,  feeCents: 18,  currency: "eur", status: "failed",   isTest: false, createdAt: makeTs(3, 11, 0),  paidAt: null              },
  { id: "t13", restaurantId: "demo", employeeName: "Javier Torres",   employeeId: "emp4", amount: 7.50,  amountCents: 750,  feeCents: 35,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(3, 20, 15), paidAt: makeTs(3, 20, 16) },
  // 4 days ago
  { id: "t14", restaurantId: "demo", employeeName: "María García",    employeeId: "emp1", amount: 3.00,  amountCents: 300,  feeCents: 14,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(4, 14, 0),  paidAt: makeTs(4, 14, 1)  },
  { id: "t15", restaurantId: "demo", employeeName: "Ana Martínez",    employeeId: "emp3", amount: 6.00,  amountCents: 600,  feeCents: 28,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(4, 21, 30), paidAt: makeTs(4, 21, 31) },
  // 5 days ago
  { id: "t16", restaurantId: "demo", employeeName: "Lucía Fernández", employeeId: "emp5", amount: 4.50,  amountCents: 450,  feeCents: 20,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(5, 13, 0),  paidAt: makeTs(5, 13, 1)  },
  { id: "t17", restaurantId: "demo", employeeName: "Carlos López",    employeeId: "emp2", amount: 8.00,  amountCents: 800,  feeCents: 37,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(5, 20, 0),  paidAt: makeTs(5, 20, 1)  },
  { id: "t18", restaurantId: "demo", employeeName: "María García",    employeeId: "emp1", amount: 5.00,  amountCents: 500,  feeCents: 23,  currency: "eur", status: "refunded", isTest: false, createdAt: makeTs(5, 22, 0),  paidAt: null              },
  // 6 days ago
  { id: "t19", restaurantId: "demo", employeeName: "Ana Martínez",    employeeId: "emp3", amount: 15.00, amountCents: 1500, feeCents: 69,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(6, 21, 45), paidAt: makeTs(6, 21, 46) },
  { id: "t20", restaurantId: "demo", employeeName: "Javier Torres",   employeeId: "emp4", amount: 5.00,  amountCents: 500,  feeCents: 23,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(6, 14, 0),  paidAt: makeTs(6, 14, 1)  },
  // Previous period (7-14 days ago)  — for comparison
  { id: "t21", restaurantId: "demo", employeeName: "María García",    employeeId: "emp1", amount: 4.00,  amountCents: 400,  feeCents: 18,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(7, 20, 0),  paidAt: makeTs(7, 20, 1)  },
  { id: "t22", restaurantId: "demo", employeeName: "Carlos López",    employeeId: "emp2", amount: 3.00,  amountCents: 300,  feeCents: 14,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(8, 13, 0),  paidAt: makeTs(8, 13, 1)  },
  { id: "t23", restaurantId: "demo", employeeName: "Ana Martínez",    employeeId: "emp3", amount: 8.50,  amountCents: 850,  feeCents: 39,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(8, 21, 30), paidAt: makeTs(8, 21, 31) },
  { id: "t24", restaurantId: "demo", employeeName: "Javier Torres",   employeeId: "emp4", amount: 5.00,  amountCents: 500,  feeCents: 23,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(9, 20, 0),  paidAt: makeTs(9, 20, 1)  },
  { id: "t25", restaurantId: "demo", employeeName: "Lucía Fernández", employeeId: "emp5", amount: 2.50,  amountCents: 250,  feeCents: 11,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(10, 12, 0), paidAt: makeTs(10, 12, 1) },
  { id: "t26", restaurantId: "demo", employeeName: "María García",    employeeId: "emp1", amount: 6.00,  amountCents: 600,  feeCents: 28,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(11, 21, 0), paidAt: makeTs(11, 21, 1) },
  { id: "t27", restaurantId: "demo", employeeName: "Ana Martínez",    employeeId: "emp3", amount: 10.00, amountCents: 1000, feeCents: 46,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(12, 20, 30), paidAt: makeTs(12, 20, 31) },
  { id: "t28", restaurantId: "demo", employeeName: "Carlos López",    employeeId: "emp2", amount: 3.50,  amountCents: 350,  feeCents: 16,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(13, 13, 0), paidAt: makeTs(13, 13, 1)  },
  // Test tips
  { id: "t29", restaurantId: "demo", employeeName: "María García",    employeeId: "emp1", amount: 5.00,  amountCents: 500,  feeCents: 23,  currency: "eur", status: "paid",     isTest: true,  createdAt: makeTs(2, 10, 0),  paidAt: makeTs(2, 10, 1)  },
  { id: "t30", restaurantId: "demo", employeeName: "Carlos López",    employeeId: "emp2", amount: 2.00,  amountCents: 200,  feeCents: 9,   currency: "eur", status: "paid",     isTest: true,  createdAt: makeTs(5, 9, 0),   paidAt: makeTs(5, 9, 1)   },
];
