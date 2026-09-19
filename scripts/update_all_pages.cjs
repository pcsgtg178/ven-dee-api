const fs = require('fs');

console.log('--- Updating ScheduleOverview.tsx ---');

const scheduleOverviewPath = 'd:/ven-dee/ven-dee-app/app/components/ScheduleOverview.tsx';
let overview = fs.readFileSync(scheduleOverviewPath, 'utf8');

// 1. Update imports to include syncAllDataFromApi
if (!overview.includes('syncAllDataFromApi,')) {
  overview = overview.replace(
    '  getMonthlyBlackShiftStats,\n} from "../../lib/storage";',
    '  getMonthlyBlackShiftStats,\n  syncAllDataFromApi,\n} from "../../lib/storage";\nimport { RefreshCw, Wifi } from "lucide-react";'
  );
}

// 2. Add isSyncing and apiConnected states
if (!overview.includes('const [isSyncing, setIsSyncing] = useState(false);')) {
  overview = overview.replace(
    '  // Action Confirmation Modal state (Restore, Undo Swap, Delete)\n  const [confirmActionState, setConfirmActionState] =\n    useState<ConfirmModalState>(null);',
    `  // Action Confirmation Modal state (Restore, Undo Swap, Delete)
  const [confirmActionState, setConfirmActionState] =
    useState<ConfirmModalState>(null);

  // Live API Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);`
  );
}

// 3. Update reloadData in ScheduleOverview
if (!overview.includes('// Load activities with live API sync')) {
  const oldReload = `  // Load activities
  const reloadData = useCallback(() => {
    setActivities(getAllActivities());
  }, []);`;

  const newReload = `  // Load activities with live API sync
  const reloadData = useCallback(async () => {
    // 1. Initial fast local load
    setActivities(getAllActivities());

    // 2. Background sync with backend API (http://localhost:8080/api/v1)
    try {
      setIsSyncing(true);
      const res = await syncAllDataFromApi();
      setApiConnected(res.isOnline);
      setActivities(getAllActivities());
    } catch (err) {
      console.warn("API sync warning:", err);
      setApiConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);`;

  overview = overview.replace(oldReload, newReload);
}

// 4. Add Live API badge in header
if (!overview.includes('API เชื่อมต่อแล้ว') && overview.includes('บันทึกเวรและบริการลูกค้า')) {
  overview = overview.replace(
    `<p className="text-[10px] text-text-muted dark:text-zinc-400 leading-none">
                บันทึกเวรและบริการลูกค้า
              </p>`,
    `<div className="flex items-center gap-1.5 pt-0.5">
                <p className="text-[10px] text-text-muted dark:text-zinc-400 leading-none">
                  บันทึกเวรและบริการลูกค้า
                </p>
                <button
                  type="button"
                  onClick={reloadData}
                  disabled={isSyncing}
                  title="คลิกเพื่อรีเฟรชข้อมูลจาก API เซิร์ฟเวอร์ (พอร์ต 8080)"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors border border-emerald-200/60 dark:border-emerald-800/60"
                >
                  <RefreshCw className={\`h-2.5 w-2.5 \${isSyncing ? "animate-spin text-teal-600" : "text-emerald-600"}\`} />
                  <span>{isSyncing ? "กำลังซิงค์..." : "API Live"}</span>
                </button>
              </div>`
  );
}

fs.writeFileSync(scheduleOverviewPath, overview, 'utf8');
console.log('✅ Updated ScheduleOverview.tsx');

// =========================================================================
// 5. Update customers/page.tsx
// =========================================================================
console.log('--- Updating customers/page.tsx ---');
const customersPagePath = 'd:/ven-dee/ven-dee-app/app/customers/page.tsx';
let custPage = fs.readFileSync(customersPagePath, 'utf8');

if (!custPage.includes('import { customersApi }')) {
  custPage = custPage.replace(
    'import { getCustomers, saveCustomer, subscribeToStorage } from "../../lib/storage";',
    'import { getCustomers, saveCustomer, subscribeToStorage, syncAllDataFromApi } from "../../lib/storage";\nimport { customersApi } from "../../lib/api";\nimport { RefreshCw } from "lucide-react";'
  );
}

// Add isSyncing state
if (!custPage.includes('const [isSyncing, setIsSyncing] = useState(false);')) {
  custPage = custPage.replace(
    '  const [customers, setCustomers] = useState<Customer[]>([]);\n  const [searchQuery, setSearchQuery] = useState("");',
    `  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);`
  );
}

// Update reloadData in customers/page.tsx
if (!custPage.includes('// Load customers with live API sync')) {
  const oldCustReload = `  // Load customers
  const reloadData = useCallback(() => {
    setCustomers(getCustomers());
  }, []);`;

  const newCustReload = `  // Load customers with live API sync
  const reloadData = useCallback(async () => {
    // 1. Initial fast local read
    setCustomers(getCustomers());

    // 2. Fetch live customers from API (http://localhost:8080/api/v1/customers)
    try {
      setIsSyncing(true);
      const apiCusts = await customersApi.getAll();
      if (apiCusts && Array.isArray(apiCusts) && apiCusts.length > 0) {
        setCustomers(apiCusts);
        localStorage.setItem("vendee_customers_v1", JSON.stringify(apiCusts));
      }
    } catch (err) {
      console.warn("API customer fetch warning:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);`;

  custPage = custPage.replace(oldCustReload, newCustReload);
}

// Update handleCreateCustomer
if (!custPage.includes('// Create via API first')) {
  const oldCreateCust = `    saveCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || "-",
      note: newCustNote.trim() || "ลูกค้าทั่วไป",
      address: newCustAddress.trim() || undefined,
    });

    setOpenNewCustomerModal(false);`;

  const newCreateCust = `    // Create via API first
    const payload = {
      name: newCustName.trim(),
      phone: newCustPhone.trim() || "-",
      note: newCustNote.trim() || "ลูกค้าทั่วไป",
      address: newCustAddress.trim() || undefined,
    };

    try {
      const created = await customersApi.create(payload);
      saveCustomer(created);
    } catch (err) {
      console.warn("API customer create error, saving locally:", err);
      saveCustomer(payload);
    }

    setOpenNewCustomerModal(false);`;

  custPage = custPage.replace(oldCreateCust, newCreateCust);
}

// Add Sync button next to count in customers/page.tsx
if (!custPage.includes('onClick={reloadData}') && custPage.includes('ทั้งหมด {customers.length} คน')) {
  custPage = custPage.replace(
    '<span>ทั้งหมด {customers.length} คน</span>',
    `<span>ทั้งหมด {customers.length} คน</span>
            <button
              type="button"
              onClick={reloadData}
              disabled={isSyncing}
              title="รีเฟรชข้อมูลลูกค้าจาก API"
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-2xs hover:bg-slate-50 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 ml-2"
            >
              <RefreshCw className={\`h-3 w-3 \${isSyncing ? "animate-spin text-teal-600" : "text-slate-500"}\`} />
              <span>{isSyncing ? "กำลังซิงค์..." : "ซิงค์ API"}</span>
            </button>`
  );
}

fs.writeFileSync(customersPagePath, custPage, 'utf8');
console.log('✅ Updated customers/page.tsx');

// =========================================================================
// 6. Update customers/[id]/page.tsx
// =========================================================================
console.log('--- Updating customers/[id]/page.tsx ---');
const customerDetailPath = 'd:/ven-dee/ven-dee-app/app/customers/[id]/page.tsx';
let custDetail = fs.readFileSync(customerDetailPath, 'utf8');

if (!custDetail.includes('import { customersApi, servicesApi }')) {
  custDetail = custDetail.replace(
    'import { Customer, CustomerServiceRecord, SERVICE_CONFIG } from "../../../types/vendee";',
    'import { Customer, CustomerServiceRecord, SERVICE_CONFIG } from "../../../types/vendee";\nimport { customersApi, servicesApi } from "../../../lib/api";\nimport { RefreshCw } from "lucide-react";'
  );
}

// Add isSyncing state to customer detail
if (!custDetail.includes('const [isSyncing, setIsSyncing] = useState(false);')) {
  custDetail = custDetail.replace(
    '  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");',
    `  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [isSyncing, setIsSyncing] = useState(false);`
  );
}

// Update loadData in customers/[id]/page.tsx
if (!custDetail.includes('// Live API load for customer detail')) {
  const oldLoadData = `  // Load data
  const loadData = useCallback(() => {
    if (!customerId) return;
    const cust = getCustomerById(customerId);
    setCustomer(cust);

    const allServices = getServices();
    const customerServices = allServices.filter((s) => s.customerId === customerId);
    setServices(customerServices);
  }, [customerId]);`;

  const newLoadData = `  // Live API load for customer detail
  const loadData = useCallback(async () => {
    if (!customerId) return;

    // 1. Initial fast local read
    const localCust = getCustomerById(customerId);
    if (localCust) {
      setCustomer(localCust);
      const allServices = getServices();
      const customerServices = allServices.filter((s) => s.customerId === customerId);
      setServices(customerServices);
    }

    // 2. Fetch live data from backend API (http://localhost:8080/api/v1/customers/:id)
    try {
      setIsSyncing(true);
      const apiCust = await customersApi.getById(customerId);
      if (apiCust) {
        setCustomer(apiCust);
        const combined = [
          ...(apiCust.upcomingServices || []),
          ...(apiCust.historyServices || []),
        ];
        if (combined.length > 0) {
          setServices(combined);
        }
      }
    } catch (err) {
      console.warn("API customer detail fetch warning:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [customerId]);`;

  custDetail = custDetail.replace(oldLoadData, newLoadData);
}

// Update handleToggleStatus in customers/[id]/page.tsx
if (!custDetail.includes('// API Async Status Update')) {
  const oldToggle = `  // Toggle status between upcoming and completed
  const handleToggleStatus = (srv: CustomerServiceRecord) => {
    const nextStatus = srv.status === "completed" ? "upcoming" : "completed";
    saveService({
      ...srv,
      status: nextStatus,
    });
  };`;

  const newToggle = `  // Toggle status between upcoming and completed with API sync
  const handleToggleStatus = async (srv: CustomerServiceRecord) => {
    const nextStatus = srv.status === "completed" ? "upcoming" : "completed";
    try {
      await servicesApi.updateStatus(srv.id, nextStatus);
    } catch (err) {
      console.warn("API status update error, saving locally:", err);
    }
    saveService({
      ...srv,
      status: nextStatus,
    });
    loadData();
  };`;

  custDetail = custDetail.replace(oldToggle, newToggle);
}

// Update onDelete call in customers/[id]/page.tsx
if (!custDetail.includes('handleDeleteService')) {
  custDetail = custDetail.replace(
    'onDelete={() => deleteService(srv.id)}',
    'onDelete={() => handleDeleteService(srv.id)}'
  );
  custDetail = custDetail.replace(
    'onDelete={() => deleteService(srv.id)}',
    'onDelete={() => handleDeleteService(srv.id)}'
  );

  const deleteFunc = `  const handleDeleteService = async (serviceId: string) => {
    try {
      await servicesApi.delete(serviceId);
    } catch (err) {
      console.warn("API delete service error, deleting locally:", err);
    }
    deleteService(serviceId);
    loadData();
  };
`;
  custDetail = custDetail.replace('  // Toggle status between upcoming and completed with API sync', deleteFunc + '\n  // Toggle status between upcoming and completed with API sync');
}

fs.writeFileSync(customerDetailPath, custDetail, 'utf8');
console.log('✅ Updated customers/[id]/page.tsx');

// =========================================================================
// 7. Update customers/[id]/edit/page.tsx
// =========================================================================
console.log('--- Updating customers/[id]/edit/page.tsx ---');
const customerEditPath = 'd:/ven-dee/ven-dee-app/app/customers/[id]/edit/page.tsx';
let custEdit = fs.readFileSync(customerEditPath, 'utf8');

if (!custEdit.includes('import { customersApi }')) {
  custEdit = custEdit.replace(
    'import { getCustomerById, saveCustomer } from "../../../../lib/storage";',
    'import { getCustomerById, saveCustomer } from "../../../../lib/storage";\nimport { customersApi } from "../../../../lib/api";'
  );
}

// Update handleSubmit in customers/[id]/edit/page.tsx
if (!custEdit.includes('// Live API customer update')) {
  const oldEditSubmit = `  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("กรุณากรอกชื่อ-นามสกุลลูกค้า");
      return;
    }

    try {
      saveCustomer({
        id: customer.id,
        name: name.trim(),
        phone: phone.trim() || "-",
        note: note.trim() || "ลูกค้าทั่วไป",
        address: address.trim() || undefined,
        avatarColor: customer.avatarColor,
        createdAt: customer.createdAt,
      });

      router.push(\`/customers/\${customer.id}\`);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };`;

  const newEditSubmit = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("กรุณากรอกชื่อ-นามสกุลลูกค้า");
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || "-",
        note: note.trim() || "ลูกค้าทั่วไป",
        address: address.trim() || undefined,
      };

      // Live API customer update
      try {
        await customersApi.update(customer.id, payload);
      } catch (apiErr) {
        console.warn("API update warning, persisting locally:", apiErr);
      }

      saveCustomer({
        id: customer.id,
        ...payload,
        avatarColor: customer.avatarColor,
        createdAt: customer.createdAt,
      });

      router.push(\`/customers/\${customer.id}\`);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };`;

  custEdit = custEdit.replace(oldEditSubmit, newEditSubmit);
}

fs.writeFileSync(customerEditPath, custEdit, 'utf8');
console.log('✅ Updated customers/[id]/edit/page.tsx');
