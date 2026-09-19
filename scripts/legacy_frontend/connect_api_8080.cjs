const fs = require('fs');

// ============================================================================
// 1. Update d:/ven-dee/ven-dee-api/.env to PORT=8080
// ============================================================================
const apiEnvPath = 'd:/ven-dee/ven-dee-api/.env';
if (fs.existsSync(apiEnvPath)) {
  let env = fs.readFileSync(apiEnvPath, 'utf8');
  env = env.replace(/PORT=\d+/, 'PORT=8080');
  if (!env.includes('PORT=8080')) {
    env = 'PORT=8080\n' + env;
  }
  fs.writeFileSync(apiEnvPath, env, 'utf8');
  console.log('Updated api/.env to PORT=8080');
}

// ============================================================================
// 2. Update d:/ven-dee/ven-dee-api/index.js default PORT to 8080
// ============================================================================
const apiIndexPath = 'd:/ven-dee/ven-dee-api/index.js';
if (fs.existsSync(apiIndexPath)) {
  let indexCode = fs.readFileSync(apiIndexPath, 'utf8');
  indexCode = indexCode.replace(
    'const PORT = process.env.PORT || 5000;',
    'const PORT = process.env.PORT || 8080;'
  );
  fs.writeFileSync(apiIndexPath, indexCode, 'utf8');
  console.log('Updated api/index.js default PORT to 8080');
}

// ============================================================================
// 3. Create .env and .env.local in d:/ven-dee/ven-dee-app
// ============================================================================
const appEnvContent = `# VenDee API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
`;

fs.writeFileSync('d:/ven-dee/ven-dee-app/.env', appEnvContent, 'utf8');
fs.writeFileSync('d:/ven-dee/ven-dee-app/.env.local', appEnvContent, 'utf8');
console.log('Created app/.env and app/.env.local with NEXT_PUBLIC_API_BASE_URL=http://localhost:8080');

// ============================================================================
// 4. Update d:/ven-dee/ven-dee-app/next.config.ts with rewrites
// ============================================================================
const nextConfigPath = 'd:/ven-dee/ven-dee-app/next.config.ts';
let nextConfig = fs.readFileSync(nextConfigPath, 'utf8');

if (!nextConfig.includes('rewrites()')) {
  const rewritesSnippet = `  async rewrites() {
    const apiTarget = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    return [
      {
        source: "/api/v1/:path*",
        destination: \`\${apiTarget}/api/v1/:path*\`,
      },
      {
        source: "/api/:path*",
        destination: \`\${apiTarget}/api/:path*\`,
      },
    ];
  },
  async headers()`;

  nextConfig = nextConfig.replace('  async headers()', rewritesSnippet);
  fs.writeFileSync(nextConfigPath, nextConfig, 'utf8');
  console.log('Updated next.config.ts with rewrites proxying to http://localhost:8080');
}

// ============================================================================
// 5. Create d:/ven-dee/ven-dee-app/lib/api.ts
// ============================================================================
const apiTsContent = `/**
 * VenDee API Client
 * Base URL: http://localhost:8080/
 * Specification: API_REQUIREMENTS.md
 */

import {
  Customer,
  CustomerServiceRecord,
  ShiftRecord,
  ShiftType,
  ShiftCategory,
  ShiftStatus,
  ServiceType,
} from "../types/vendee";

export const API_BASE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) ||
  "http://localhost:8080";

const API_V1 = \`\${API_BASE_URL}/api/v1\`;

/**
 * Standard fetch wrapper with error handling and timeout
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : \`\${API_V1}\${endpoint}\`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage =
        json?.error?.message || json?.message || \`API Error: \${res.status} \${res.statusText}\`;
      const err = new Error(errorMessage);
      (err as any).status = res.status;
      (err as any).data = json;
      throw err;
    }

    return json?.data !== undefined ? json.data : json;
  } catch (err: any) {
    // Network or server offline error
    console.warn(\`[VenDee API] Request to \${url} failed:\`, err.message || err);
    throw err;
  }
}

/**
 * Health Check API
 */
export const healthApi = {
  check: () => request<{ success: boolean; message: string }>("/health"),
};

/**
 * Shifts API (/api/v1/shifts)
 */
export const shiftsApi = {
  getAll: (params?: { month?: string; startDate?: string; endDate?: string; status?: ShiftStatus; category?: ShiftCategory }) => {
    const query = new URLSearchParams();
    if (params?.month) query.append("month", params.month);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    if (params?.status) query.append("status", params.status);
    if (params?.category) query.append("category", params.category);
    const qs = query.toString();
    return request<ShiftRecord[]>(\`/shifts\${qs ? \`?\${qs}\` : ""}\`);
  },

  create: (data: {
    date: string;
    shiftType: ShiftType;
    category?: ShiftCategory;
    department?: string;
    note?: string;
  }) => {
    return request<ShiftRecord>("/shifts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: { department?: string; note?: string }) => {
    return request<ShiftRecord>(\`/shifts/\${id}\`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return request<{ deletedShiftId: string; restoredParentId?: string }>(\`/shifts/\${id}\`, {
      method: "DELETE",
    });
  },

  swap: (
    id: string,
    data: {
      newDate: string;
      newShiftType: ShiftType;
      newCategory?: ShiftCategory;
      swappedWith: string;
      originalOwner?: string;
      swapReason?: string;
    }
  ) => {
    return request<{
      oldShift: { id: string; status: string };
      newShift: ShiftRecord;
    }>(\`/shifts/\${id}/swap\`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  undoSwap: (id: string, reason?: string) => {
    return request<{
      cancelledShiftId: string;
      restoredShiftId: string;
      restoredParentId: string;
    }>(\`/shifts/\${id}/undo-swap\`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "ยกเลิกการแลกเวร" }),
    });
  },

  getSwapTrail: (id: string) => {
    return request<{
      currentShiftId: string;
      currentHolder: string;
      shiftDate: string;
      shiftLabel: string;
      timeline: Array<{
        step: number;
        fromPerson: string;
        toPerson: string;
        date: string;
        shiftLabel: string;
        note: string;
      }>;
    }>(\`/shifts/\${id}/swap-trail\`);
  },

  restore: (id: string) => {
    return request<ShiftRecord>(\`/shifts/\${id}/restore\`, {
      method: "POST",
    });
  },

  simulateQuota: (data: { targetDate: string; newCategory: ShiftCategory; shiftId?: string }) => {
    return request<{
      currentBlackCount: number;
      simulatedBlackCount: number;
      quota: number;
      remainingNeeded: number;
      willBeUnderQuota: boolean;
      monthName: string;
      warningMessage?: string;
    }>("/shifts/simulate-quota", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

/**
 * Customers API (/api/v1/customers)
 */
export const customersApi = {
  getAll: (params?: { search?: string; name?: string; phone?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.name) query.append("name", params.name);
    if (params?.phone) query.append("phone", params.phone);
    const qs = query.toString();
    return request<Customer[]>(\`/customers\${qs ? \`?\${qs}\` : ""}\`);
  },

  getById: (id: string) => {
    return request<
      Customer & {
        upcomingServices: CustomerServiceRecord[];
        historyServices: CustomerServiceRecord[];
      }
    >(\`/customers/\${id}\`);
  },

  create: (data: { name: string; phone?: string; note?: string; address?: string; avatarColor?: string }) => {
    return request<Customer>("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: { name?: string; phone?: string; note?: string; address?: string; avatarColor?: string }) => {
    return request<Customer>(\`/customers/\${id}\`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return request<Customer>(\`/customers/\${id}\`, {
      method: "DELETE",
    });
  },
};

/**
 * Customer Services API (/api/v1/services)
 */
export const servicesApi = {
  getAll: (params?: { date?: string; customerId?: string; status?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.date) query.append("date", params.date);
    if (params?.customerId) query.append("customerId", params.customerId);
    if (params?.status) query.append("status", params.status);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const qs = query.toString();
    return request<CustomerServiceRecord[]>(\`/services\${qs ? \`?\${qs}\` : ""}\`);
  },

  create: (data: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerNote: string;
    date: string;
    time: string;
    services: ServiceType[];
    otherServiceText?: string;
    medications?: string[];
    note?: string;
    price?: number;
    status?: "upcoming" | "completed" | "cancelled";
  }) => {
    return request<CustomerServiceRecord>("/services", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateStatus: (id: string, status: "upcoming" | "completed" | "cancelled") => {
    return request<CustomerServiceRecord>(\`/services/\${id}/status\`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  delete: (id: string) => {
    return request<{ message: string; deletedId: string }>(\`/services/\${id}\`, {
      method: "DELETE",
    });
  },
};

/**
 * Analytics & Unified Feed API (/api/v1/analytics & /api/v1/schedule)
 */
export const analyticsApi = {
  getMonthlyQuota: (month?: string) => {
    const qs = month ? \`?month=\${month}\` : "";
    return request<{
      month: string;
      quota: number;
      actualBlackShifts: number;
      redShifts: number;
      greenShifts: number;
      remainingNeeded: number;
      isMet: boolean;
    }>(\`/analytics/monthly-quota\${qs}\`);
  },

  getScheduleFeed: () => {
    return request<{
      activities: Array<any>;
      totalCount: number;
    }>("/schedule/activities");
  },
};
`;

fs.writeFileSync('d:/ven-dee/ven-dee-app/lib/api.ts', apiTsContent, 'utf8');
console.log('Created d:/ven-dee/ven-dee-app/lib/api.ts connecting to http://localhost:8080');
