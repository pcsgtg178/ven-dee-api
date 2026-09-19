const fs = require('fs');

const storagePath = 'd:/ven-dee/ven-dee-app/lib/storage.ts';
let content = fs.readFileSync(storagePath, 'utf8');

// 1. Add canEditShift, canEditService, isDateInPast right after isShiftInPast
const targetAfterIsShiftInPast = `// Helper to determine if date is in past (locked)
export function isShiftInPast(dateStr: string): boolean {
  try {
    const todayStr = "2026-09-19"; // Current app mock reference date
    return dateStr < todayStr;
  } catch {
    return false;
  }
}`;

const newPermissionsCode = `// Helper to determine if date is in past (locked)
export function isShiftInPast(dateStr: string): boolean {
  try {
    const todayStr = "2026-09-19"; // Current app mock reference date
    return dateStr < todayStr;
  } catch {
    return false;
  }
}

export function isDateInPast(dateStr: string): boolean {
  try {
    const todayStr = "2026-09-19";
    return dateStr < todayStr;
  } catch {
    return false;
  }
}

/**
 * Conditional Visibility Rule for Shift Editing:
 * - Hide completely if shift cannot be edited.
 * - Do NOT display if:
 *   1. Shift is already past/locked (isLocked === true or historical date).
 *   2. Shift has been swapped out (status === 'swapped_out').
 *   3. Shift is cancelled (status === 'cancelled').
 * - Only shifts with status === 'active' and future/unlocked dates (today or future) can be edited.
 */
export function canEditShift(shift: ShiftRecord): boolean {
  if (shift.status !== "active") return false;
  if (shift.swapMeta?.isLocked) return false;
  if (isShiftInPast(shift.date)) return false;
  return true;
}

/**
 * Conditional Visibility Rule for Customer Service / Appointment Editing:
 * - Hide the edit button if service record is already completed or locked in the past.
 * - Show edit button for pending/upcoming appointments and editable today's service entries.
 */
export function canEditService(service: CustomerServiceRecord): boolean {
  if (service.status === "completed" || service.status === "cancelled") return false;
  if (isDateInPast(service.date)) return false;
  return true;
}`;

if (content.includes(targetAfterIsShiftInPast)) {
  content = content.replace(targetAfterIsShiftInPast, newPermissionsCode);
  console.log('Added permission helpers after isShiftInPast');
} else {
  console.error('targetAfterIsShiftInPast not found');
}

// 2. Enhance saveCustomer to sync customer name/phone/note to services
const oldSaveCustomer = `  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
  triggerSync();
  return newCustomer;
}

export function getCustomerById`;

const newSaveCustomer = `  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));

  // Sync updated customer details to any services referencing this customerId
  try {
    const rawServices = localStorage.getItem(STORAGE_KEYS.SERVICES);
    if (rawServices) {
      const servicesList: CustomerServiceRecord[] = JSON.parse(rawServices);
      let anyChanged = false;
      const updatedServices = servicesList.map((srv) => {
        if (srv.customerId === id) {
          anyChanged = true;
          return {
            ...srv,
            customerName: newCustomer.name,
            customerPhone: newCustomer.phone,
            customerNote: newCustomer.note,
          };
        }
        return srv;
      });
      if (anyChanged) {
        localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(updatedServices));
      }
    }
  } catch (_) {}

  triggerSync();
  return newCustomer;
}

export function getCustomerById`;

if (content.includes(oldSaveCustomer)) {
  content = content.replace(oldSaveCustomer, newSaveCustomer);
  console.log('Enhanced saveCustomer');
} else {
  console.error('oldSaveCustomer not found');
}

// 3. Enhance saveShift to support editing and preserve existingShift attributes
const oldSaveShiftStart = `export function saveShift(
  shift: Omit<ShiftRecord, "id" | "type" | "createdAt" | "status"> & {
    id?: string;
    status?: ShiftRecord["status"];
  }
): ShiftRecord {`;

const newSaveShiftStart = `export function saveShift(
  shift: Omit<ShiftRecord, "id" | "type" | "createdAt" | "status"> & {
    id?: string;
    status?: ShiftRecord["status"];
    createdAt?: string;
    swapMeta?: any;
  }
): ShiftRecord {`;

if (content.includes(oldSaveShiftStart)) {
  content = content.replace(oldSaveShiftStart, newSaveShiftStart);
  console.log('Updated saveShift signature');
} else {
  console.error('oldSaveShiftStart not found');
}

const oldNewShiftBlock = `  const newShift: ShiftRecord = {
    ...shift,
    category: resolvedCategory,
    id,
    type: "shift",
    status: targetStatus,
    createdAt: new Date().toISOString(),
  };`;

const newNewShiftBlock = `  const existingIdx = current.findIndex((s) => s.id === id);
  const existingShift = existingIdx >= 0 ? current[existingIdx] : undefined;

  const newShift: ShiftRecord = {
    ...existingShift,
    ...shift,
    category: resolvedCategory,
    id,
    type: "shift",
    status: targetStatus,
    createdAt: existingShift?.createdAt || shift.createdAt || new Date().toISOString(),
  };`;

// replace existingIdx definition right after if it is already there
const oldIdxBlock = `  const existingIdx = current.findIndex((s) => s.id === id);
  let updated: ShiftRecord[];`;

const newIdxBlock = `  let updated: ShiftRecord[];`;

if (content.includes(oldNewShiftBlock) && content.includes(oldIdxBlock)) {
  content = content.replace(oldNewShiftBlock, newNewShiftBlock);
  content = content.replace(oldIdxBlock, newIdxBlock);
  console.log('Updated saveShift newShift creation');
} else {
  console.error('oldNewShiftBlock or oldIdxBlock not found');
}

// 4. Enhance saveService
const oldSaveServiceSignature = `export function saveService(
  service: Omit<CustomerServiceRecord, "id" | "type" | "createdAt"> & { id?: string }
): CustomerServiceRecord {`;

const newSaveServiceSignature = `export function saveService(
  service: Omit<CustomerServiceRecord, "id" | "type" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): CustomerServiceRecord {`;

if (content.includes(oldSaveServiceSignature)) {
  content = content.replace(oldSaveServiceSignature, newSaveServiceSignature);
  console.log('Updated saveService signature');
} else {
  console.error('oldSaveServiceSignature not found');
}

const oldSaveServiceNewService = `  const current = getServices();
  const id = service.id || \`srv-\${Date.now()}\`;
  const newService: CustomerServiceRecord = {
    ...service,
    id,
    type: "service",
    createdAt: new Date().toISOString(),
  };

  const existingIdx = current.findIndex((s) => s.id === id);`;

const newSaveServiceNewService = `  const current = getServices();
  const id = service.id || \`srv-\${Date.now()}\`;
  const existingIdx = current.findIndex((s) => s.id === id);
  const existingService = existingIdx >= 0 ? current[existingIdx] : undefined;

  const newService: CustomerServiceRecord = {
    ...existingService,
    ...service,
    id,
    type: "service",
    createdAt: existingService?.createdAt || service.createdAt || new Date().toISOString(),
  };`;

if (content.includes(oldSaveServiceNewService)) {
  content = content.replace(oldSaveServiceNewService, newSaveServiceNewService);
  console.log('Updated saveService newService creation');
} else {
  console.error('oldSaveServiceNewService not found');
}

fs.writeFileSync(storagePath, content, 'utf8');
console.log('Successfully updated storage.ts');
