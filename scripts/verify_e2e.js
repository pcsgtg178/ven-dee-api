import app from '../index.js';

async function verify() {
  const BASE = 'http://localhost:8080/api/v1';

  const [shiftsRes, custsRes, srvsRes, quotaRes] = await Promise.all([
    fetch(`${BASE}/shifts`),
    fetch(`${BASE}/customers`),
    fetch(`${BASE}/services`),
    fetch(`${BASE}/analytics/monthly-quota?month=2026-09`),
  ]);

  const shifts = await shiftsRes.json();
  const custs = await custsRes.json();
  const srvs = await srvsRes.json();
  const quota = await quotaRes.json();

  console.log('✅ API E2E Verification Results:');
  console.log(`- Shifts: HTTP ${shiftsRes.status}, count: ${shifts.data?.length}, success: ${shifts.success}`);
  console.log(`- Customers: HTTP ${custsRes.status}, count: ${custs.data?.length}, success: ${custs.success}`);
  console.log(`- Services: HTTP ${srvsRes.status}, count: ${srvs.data?.length}, success: ${srvs.success}`);
  console.log(`- Monthly Quota (2026-09): HTTP ${quotaRes.status}, quota: ${quota.data?.quota}, black shifts: ${quota.data?.blackCount}, red shifts: ${quota.data?.redCount}, remaining: ${quota.data?.remaining}`);

  if (!shifts.success || !custs.success || !srvs.success || !quota.success) {
    throw new Error('API E2E Verification failed');
  }
}

// Allow server 1s to start listening
setTimeout(async () => {
  try {
    await verify();
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E verification failed:', err);
    process.exit(1);
  }
}, 1000);
