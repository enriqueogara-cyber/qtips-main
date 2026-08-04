/**
 * Demo data for development / design preview.
 * Activate with EXPO_PUBLIC_DEMO_MODE=true in .env.local
 */

export const IS_DEMO = process.env.EXPO_PUBLIC_DEMO_MODE === "true";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTs(daysAgo: number, hour = 12, minute = 0): { toDate: () => Date } {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return { toDate: () => new Date(d) };
}

// ─── Restaurant ───────────────────────────────────────────────────────────────

export const DEMO_RESTAURANT = {
  name: "El Rincón de Pepe",
  address: "Calle Mayor 12, Madrid",
  stripeAccountId: "acct_demo",
  stripeOnboarded: true,
  tipDistributionMode: "employee_optional" as const,
};

// ─── Employees ────────────────────────────────────────────────────────────────

export const DEMO_EMPLOYEES = [
  { id: "emp1", name: "María García",  role: "Camarera",    status: "active"   },
  { id: "emp2", name: "Carlos López",  role: "Barista",     status: "active"   },
  { id: "emp3", name: "Ana Martínez",  role: "Jefa de sala", status: "active"  },
  { id: "emp4", name: "Pablo Ruiz",    role: "Ayudante",    status: "inactive" },
] as const;

// ─── Tips ─────────────────────────────────────────────────────────────────────

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

export const DEMO_TIPS: DemoTip[] = [
  { id: "t01", restaurantId: "demo", employeeName: "María García",   employeeId: "emp1", amount: 4.50,  amountCents: 450,  feeCents: 20,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(0, 13, 30), paidAt: makeTs(0, 13, 31) },
  { id: "t02", restaurantId: "demo", employeeName: "Carlos López",   employeeId: "emp2", amount: 3.00,  amountCents: 300,  feeCents: 14,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(0, 11, 0),  paidAt: makeTs(0, 11, 1)  },
  { id: "t03", restaurantId: "demo", employeeName: "Ana Martínez",   employeeId: "emp3", amount: 5.00,  amountCents: 500,  feeCents: 23,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(1, 20, 15), paidAt: makeTs(1, 20, 16) },
  { id: "t04", restaurantId: "demo", employeeName: "María García",   employeeId: "emp1", amount: 2.00,  amountCents: 200,  feeCents: 9,   currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(1, 14, 0),  paidAt: makeTs(1, 14, 1)  },
  { id: "t05", restaurantId: "demo", employeeName: "Ana Martínez",   employeeId: "emp3", amount: 10.00, amountCents: 1000, feeCents: 46,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(2, 21, 30), paidAt: makeTs(2, 21, 31) },
  { id: "t06", restaurantId: "demo", employeeName: "Carlos López",   employeeId: "emp2", amount: 3.50,  amountCents: 350,  feeCents: 16,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(2, 13, 0),  paidAt: makeTs(2, 13, 1)  },
  { id: "t07", restaurantId: "demo", employeeName: "Propina general", employeeId: null,  amount: 1.50,  amountCents: 150,  feeCents: 7,   currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(3, 12, 45), paidAt: makeTs(3, 12, 46) },
  { id: "t08", restaurantId: "demo", employeeName: "María García",   employeeId: "emp1", amount: 5.00,  amountCents: 500,  feeCents: 23,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(3, 19, 0),  paidAt: makeTs(3, 19, 1)  },
  { id: "t09", restaurantId: "demo", employeeName: "Carlos López",   employeeId: "emp2", amount: 2.00,  amountCents: 200,  feeCents: 0,   currency: "eur", status: "failed",   isTest: false, createdAt: makeTs(4, 11, 0),  paidAt: null               },
  { id: "t10", restaurantId: "demo", employeeName: "Ana Martínez",   employeeId: "emp3", amount: 3.00,  amountCents: 300,  feeCents: 14,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(4, 20, 0),  paidAt: makeTs(4, 20, 1)  },
  { id: "t11", restaurantId: "demo", employeeName: "María García",   employeeId: "emp1", amount: 5.00,  amountCents: 500,  feeCents: 23,  currency: "eur", status: "paid",     isTest: true,  createdAt: makeTs(5, 10, 0),  paidAt: makeTs(5, 10, 1)  },
  { id: "t12", restaurantId: "demo", employeeName: "Ana Martínez",   employeeId: "emp3", amount: 7.50,  amountCents: 750,  feeCents: 35,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(5, 14, 30), paidAt: makeTs(5, 14, 31) },
  { id: "t13", restaurantId: "demo", employeeName: "Carlos López",   employeeId: "emp2", amount: 4.00,  amountCents: 400,  feeCents: 18,  currency: "eur", status: "refunded", isTest: false, createdAt: makeTs(6, 18, 0),  paidAt: null               },
  { id: "t14", restaurantId: "demo", employeeName: "María García",   employeeId: "emp1", amount: 2.50,  amountCents: 250,  feeCents: 12,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(6, 20, 15), paidAt: makeTs(6, 20, 16) },
  { id: "t15", restaurantId: "demo", employeeName: "Ana Martínez",   employeeId: "emp3", amount: 6.00,  amountCents: 600,  feeCents: 28,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(7, 13, 0),  paidAt: makeTs(7, 13, 1)  },
  { id: "t16", restaurantId: "demo", employeeName: "María García",   employeeId: "emp1", amount: 3.00,  amountCents: 300,  feeCents: 14,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(8, 21, 0),  paidAt: makeTs(8, 21, 1)  },
  { id: "t17", restaurantId: "demo", employeeName: "Carlos López",   employeeId: "emp2", amount: 8.00,  amountCents: 800,  feeCents: 37,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(9, 14, 0),  paidAt: makeTs(9, 14, 1)  },
  { id: "t18", restaurantId: "demo", employeeName: "Propina general", employeeId: null,  amount: 2.00,  amountCents: 200,  feeCents: 9,   currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(10, 12, 0), paidAt: makeTs(10, 12, 1) },
  { id: "t19", restaurantId: "demo", employeeName: "Ana Martínez",   employeeId: "emp3", amount: 12.00, amountCents: 1200, feeCents: 55,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(12, 20, 30), paidAt: makeTs(12, 20, 31) },
  { id: "t20", restaurantId: "demo", employeeName: "María García",   employeeId: "emp1", amount: 5.50,  amountCents: 550,  feeCents: 25,  currency: "eur", status: "paid",     isTest: false, createdAt: makeTs(14, 19, 0), paidAt: makeTs(14, 19, 1) },
];
