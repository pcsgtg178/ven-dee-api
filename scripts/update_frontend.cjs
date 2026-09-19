const fs = require('fs');
const path = require('path');

console.log('--- Updating ven-dee-app with live API integrations ---');

const storagePath = 'd:/ven-dee/ven-dee-app/lib/storage.ts';
let storage = fs.readFileSync(storagePath, 'utf8');

// 1. Add api import if not present
if (!storage.includes('import { shiftsApi,')) {
  storage = storage.replace(
    '"use client";\n',
    '"use client";\n\nimport { shiftsApi, customersApi, servicesApi, analyticsApi } from "./api";\n'
  );
}

// 2. Add syncAllDataFromApi & fetchMonthlyQuotaFromApi
const syncMethods = `
/**
 * Synchronize local storage with live backend REST API (http://localhost:8080/api/v1)
 */
export async function syncAllDataFromApi(): Promise<{
  shifts: ShiftRecord[];
  customers: Customer[];
  services: CustomerServiceRecord[];
  isOnline: boolean;
}> {
  if (typeof window === "undefined") {
    return { shifts: initialShifts, customers: initialCustomers, services: initialServices, isOnline: false };
  }

  try {
    const [shiftsRes, customersRes, servicesRes] = await Promise.allSettled([
      shiftsApi.getAll(),
      customersApi.getAll(),
      servicesApi.getAll(),
    ]);

    let shifts = getShifts();
    let customers = getCustomers();
    let services = getServices();
    let isOnline = false;

    if (shiftsRes.status === "fulfilled" && Array.isArray(shiftsRes.value) && shiftsRes.value.length > 0) {
      shifts = shiftsRes.value;
      localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
      isOnline = true;
    }

    if (customersRes.status === "fulfilled" && Array.isArray(customersRes.value) && customersRes.value.length > 0) {
      customers = customersRes.value;
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      isOnline = true;
    }

    if (servicesRes.status === "fulfilled" && Array.isArray(servicesRes.value) && servicesRes.value.length > 0) {
      services = servicesRes.value;
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
      isOnline = true;
    }

    triggerSync();
    return { shifts, customers, services, isOnline };
  } catch (err) {
    console.warn("[VenDee Storage] Failed to sync with backend API:", err);
    return { shifts: getShifts(), customers: getCustomers(), services: getServices(), isOnline: false };
  }
}

export async function fetchMonthlyQuotaFromApi(yearMonth: string = "2026-09") {
  try {
    const data = await analyticsApi.getMonthlyQuota(yearMonth);
    return data;
  } catch (err) {
    console.warn("[VenDee Storage] Failed to fetch quota from API:", err);
    return null;
  }
}
`;

if (!storage.includes('syncAllDataFromApi')) {
  storage = storage.replace('export function triggerSync()', syncMethods + '\nexport function triggerSync()');
}

// 3. Update saveShift with API async sync
if (!storage.includes('// API Async Sync: saveShift')) {
  const targetSaveShift = '  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));\n  triggerSync();\n  return newShift;\n}';
  const replacementSaveShift = `  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));
  triggerSync();

  // API Async Sync: saveShift
  if (typeof window !== "undefined") {
    if (existingIdx >= 0) {
      shiftsApi.update(newShift.id, {
        department: newShift.department || undefined,
        note: newShift.note || undefined,
      }).catch((e) => console.warn("shiftsApi.update error:", e));
    } else {
      shiftsApi.create({
        date: newShift.date,
        shiftType: newShift.shiftType,
        category: newShift.category,
        department: newShift.department || undefined,
        note: newShift.note || undefined,
      }).then((created) => {
        if (created?.id && created.id !== newShift.id) {
          const list = getShifts();
          const sIdx = list.findIndex((s) => s.id === newShift.id);
          if (sIdx >= 0) {
            list[sIdx] = { ...list[sIdx], id: created.id };
            localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(list));
            triggerSync();
          }
        }
      }).catch((e) => console.warn("shiftsApi.create error:", e));
    }
  }

  return newShift;
}`;
  storage = storage.replace(targetSaveShift, replacementSaveShift);
}

// 4. Update deleteShift with API async sync
if (!storage.includes('// API Async Sync: deleteShift')) {
  const targetDeleteShift = '  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));\n  triggerSync();\n  return { restoredParentId };\n}';
  const replacementDeleteShift = `  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));
  triggerSync();

  // API Async Sync: deleteShift
  if (typeof window !== "undefined") {
    shiftsApi.delete(id).catch((e) => console.warn("shiftsApi.delete error:", e));
  }

  return { restoredParentId };
}`;
  storage = storage.replace(targetDeleteShift, replacementDeleteShift);
}

// 5. Update restoreShift with API async sync
if (!storage.includes('// API Async Sync: restoreShift')) {
  const targetRestoreShift = '  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(current));\n  triggerSync();\n  return target;\n}';
  const replacementRestoreShift = `  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(current));
  triggerSync();

  // API Async Sync: restoreShift
  if (typeof window !== "undefined") {
    shiftsApi.restore(shiftId).catch((e) => console.warn("shiftsApi.restore error:", e));
  }

  return target;
}`;
  storage = storage.replace(targetRestoreShift, replacementRestoreShift);
}

// 6. Update undoSwapShift with API async sync
if (!storage.includes('// API Async Sync: undoSwapShift')) {
  const targetUndoSwap = '  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));\n  triggerSync();\n  return true;\n}';
  const replacementUndoSwap = `  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));
  triggerSync();

  // API Async Sync: undoSwapShift
  if (typeof window !== "undefined") {
    shiftsApi.undoSwap(shiftId).catch((e) => console.warn("shiftsApi.undoSwap error:", e));
  }

  return true;
}`;
  storage = storage.replace(targetUndoSwap, replacementUndoSwap);
}

// 7. Update swapShift with API async sync
if (!storage.includes('// API Async Sync: swapShift')) {
  const targetSwapShift = '  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));\n  triggerSync();\n\n  return { newShift, oldShift };\n}';
  const replacementSwapShift = `  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(updated));
  triggerSync();

  // API Async Sync: swapShift
  if (typeof window !== "undefined") {
    shiftsApi.swap(oldShift.id, {
      newDate: params.newDate,
      newShiftType: params.newShiftType,
      newCategory: params.newCategory,
      swappedWith: params.swappedWith,
      originalOwner: params.originalOwner || undefined,
      swapReason: params.swapReason || undefined,
    }).then((res) => {
      if (res?.newShift?.id && res.newShift.id !== newShift.id) {
        const list = getShifts();
        const sIdx = list.findIndex((s) => s.id === newShift.id);
        if (sIdx >= 0) {
          list[sIdx] = { ...list[sIdx], id: res.newShift.id };
          localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(list));
          triggerSync();
        }
      }
    }).catch((e) => console.warn("shiftsApi.swap error:", e));
  }

  return { newShift, oldShift };
}`;
  storage = storage.replace(targetSwapShift, replacementSwapShift);
}

// 8. Update saveCustomer with API async sync
if (!storage.includes('// API Async Sync: saveCustomer')) {
  const targetSaveCustomer = '  triggerSync();\n  return newCustomer;\n}';
  const replacementSaveCustomer = `  triggerSync();

  // API Async Sync: saveCustomer
  if (typeof window !== "undefined") {
    if (existingIdx >= 0) {
      customersApi.update(newCustomer.id, {
        name: newCustomer.name,
        phone: newCustomer.phone,
        note: newCustomer.note,
        address: newCustomer.address,
        avatarColor: newCustomer.avatarColor,
      }).catch((e) => console.warn("customersApi.update error:", e));
    } else {
      customersApi.create({
        name: newCustomer.name,
        phone: newCustomer.phone,
        note: newCustomer.note,
        address: newCustomer.address,
        avatarColor: newCustomer.avatarColor,
      }).then((created) => {
        if (created?.id && created.id !== newCustomer.id) {
          const list = getCustomers();
          const cIdx = list.findIndex((c) => c.id === newCustomer.id);
          if (cIdx >= 0) {
            list[cIdx] = { ...list[cIdx], id: created.id };
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
            triggerSync();
          }
        }
      }).catch((e) => console.warn("customersApi.create error:", e));
    }
  }

  return newCustomer;
}`;
  storage = storage.replace(targetSaveCustomer, replacementSaveCustomer);
}

// 9. Update saveService with API async sync
if (!storage.includes('// API Async Sync: saveService')) {
  const targetSaveService = '  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(updated));\n  triggerSync();\n  return newService;\n}';
  const replacementSaveService = `  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(updated));
  triggerSync();

  // API Async Sync: saveService
  if (typeof window !== "undefined") {
    if (existingIdx >= 0) {
      servicesApi.updateStatus(newService.id, newService.status).catch((e) => console.warn("servicesApi.updateStatus error:", e));
    } else {
      servicesApi.create({
        customerId: newService.customerId,
        customerName: newService.customerName,
        customerPhone: newService.customerPhone,
        customerNote: newService.customerNote,
        date: newService.date,
        time: newService.time,
        services: newService.services,
        otherServiceText: newService.otherServiceText,
        medications: newService.medications,
        note: newService.note,
        price: newService.price,
        status: newService.status,
      }).then((created) => {
        if (created?.id && created.id !== newService.id) {
          const list = getServices();
          const svIdx = list.findIndex((s) => s.id === newService.id);
          if (svIdx >= 0) {
            list[svIdx] = { ...list[svIdx], id: created.id };
            localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
            triggerSync();
          }
        }
      }).catch((e) => console.warn("servicesApi.create error:", e));
    }
  }

  return newService;
}`;
  storage = storage.replace(targetSaveService, replacementSaveService);
}

// 10. Update deleteService with API async sync
if (!storage.includes('// API Async Sync: deleteService')) {
  const targetDeleteService = '  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(updated));\n  triggerSync();\n}\n\n// All Activities combined sorted latest first';
  const replacementDeleteService = `  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(updated));
  triggerSync();

  // API Async Sync: deleteService
  if (typeof window !== "undefined") {
    servicesApi.delete(id).catch((e) => console.warn("servicesApi.delete error:", e));
  }
}

// All Activities combined sorted latest first`;
  storage = storage.replace(targetDeleteService, replacementDeleteService);
}

fs.writeFileSync(storagePath, storage, 'utf8');
console.log('✅ Successfully updated lib/storage.ts with API sync methods');
