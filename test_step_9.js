const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== TaskFlow Step 9 (Business, Billing & Admin) Verification ===\n');

  // 1. Health check
  const health = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/health',
    method: 'GET'
  });
  console.log(`[1] Health Check: Status ${health.status} (${JSON.stringify(health.data)})`);
  if (health.status !== 200) throw new Error('Health check failed');

  // 2. Login as Demo User (Alex Rivera)
  const loginRes = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/auth/demo',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  console.log(`[2] Demo Login: Status ${loginRes.status}, User: ${loginRes.data?.user?.email}, Role: ${loginRes.data?.user?.role}`);
  if (loginRes.status !== 200 || !loginRes.data?.accessToken) throw new Error('Demo login failed');

  const token = loginRes.data.accessToken;
  const user = loginRes.data.user;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 3. Fetch Pricing Plans
  const plansRes = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/billing/plans',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`[3] Plans: Status ${plansRes.status}, Total plans returned: ${plansRes.data?.length}`);
  if (plansRes.status !== 200 || !Array.isArray(plansRes.data) || plansRes.data.length < 3) {
    throw new Error('Plans list invalid');
  }
  console.log(`    Available Plans: ${plansRes.data.map(p => `${p.name} ($${p.priceMonthly})`).join(' | ')}`);

  // 4. Get Current Subscription
  const subRes = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/billing/subscription',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`[4] Current Subscription: Status ${subRes.status}, Tier: ${subRes.data?.planTier}, Status: ${subRes.data?.status}`);
  if (subRes.status !== 200) throw new Error('Failed to get current subscription');

  // 5. Upgrade to PRO Plan via simulated Stripe Card
  const checkoutPro = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/billing/checkout',
    method: 'POST',
    headers: authHeaders
  }, {
    planTier: 'PRO',
    provider: 'STRIPE',
    paymentMethod: 'CARD'
  });
  console.log(`[5] Upgrade to PRO: Status ${checkoutPro.status}, Plan: ${checkoutPro.data?.planTier}, Amount: $${checkoutPro.data?.amount}, Provider: ${checkoutPro.data?.provider}`);
  if (checkoutPro.status !== 200 || checkoutPro.data?.planTier !== 'PRO' || checkoutPro.data?.amount !== 12) {
    throw new Error('Upgrade to PRO failed');
  }

  // 6. Upgrade to ENTERPRISE Plan via simulated Razorpay UPI
  const checkoutEnterprise = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/billing/checkout',
    method: 'POST',
    headers: authHeaders
  }, {
    planTier: 'ENTERPRISE',
    provider: 'RAZORPAY',
    paymentMethod: 'UPI'
  });
  console.log(`[6] Upgrade to ENTERPRISE: Status ${checkoutEnterprise.status}, Plan: ${checkoutEnterprise.data?.planTier}, Amount: $${checkoutEnterprise.data?.amount}, Provider: ${checkoutEnterprise.data?.provider}`);
  if (checkoutEnterprise.status !== 200 || checkoutEnterprise.data?.planTier !== 'ENTERPRISE' || checkoutEnterprise.data?.amount !== 29) {
    throw new Error('Upgrade to ENTERPRISE failed');
  }

  // 7. Export Tasks to CSV
  const csvRes = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/billing/export/csv',
    method: 'GET',
    headers: authHeaders
  });
  const csvHeaders = csvRes.data?.split('\n')?.[0];
  console.log(`[7] CSV Export: Status ${csvRes.status}, Content-Type: ${csvRes.headers['content-type']}, Header: ${csvHeaders}`);
  if (csvRes.status !== 200 || !csvHeaders?.includes('ID') || !csvHeaders?.includes('Title')) {
    throw new Error('CSV Export failed');
  }

  // 8. Admin Telemetry & Metrics (Demo user Alex Rivera has role ADMIN)
  const metricsRes = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/admin/metrics',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`[8] Admin Metrics: Status ${metricsRes.status}, Users: ${metricsRes.data?.totalUsers}, MRR: $${metricsRes.data?.monthlyRecurringRevenue}, Tasks Completed: ${metricsRes.data?.completedTasks}`);
  if (metricsRes.status !== 200) throw new Error('Admin metrics failed');

  // 9. Admin Users List
  const adminUsersRes = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/admin/users',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`[9] Admin Users List: Status ${adminUsersRes.status}, Count: ${adminUsersRes.data?.length}`);
  if (adminUsersRes.status !== 200 || !Array.isArray(adminUsersRes.data)) throw new Error('Admin users list failed');

  // Find a non-admin target user to test toggle status and plan update
  const targetUser = adminUsersRes.data.find(u => u.email !== user.email);
  if (targetUser) {
    // 10. Admin Toggle User Status
    const toggleRes = await request({
      hostname: 'localhost',
      port: 8081,
      path: `/api/admin/users/${targetUser.id}/status`,
      method: 'PATCH',
      headers: authHeaders
    });
    console.log(`[10] Admin Toggle User Status (${targetUser.email}): Status ${toggleRes.status}, Enabled now: ${toggleRes.data?.enabled}`);
    if (toggleRes.status !== 200) throw new Error('Admin toggle user status failed');

    // Toggle back to original
    await request({
      hostname: 'localhost',
      port: 8081,
      path: `/api/admin/users/${targetUser.id}/status`,
      method: 'PATCH',
      headers: authHeaders
    });

    // 11. Admin Update Target User Role and Plan
    const rolePlanRes = await request({
      hostname: 'localhost',
      port: 8081,
      path: `/api/admin/users/${targetUser.id}/role-plan`,
      method: 'PATCH',
      headers: authHeaders
    }, {
      role: 'USER',
      planTier: 'PRO'
    });
    console.log(`[11] Admin Update User Plan (${targetUser.email}): Status ${rolePlanRes.status}, Role: ${rolePlanRes.data?.role}, Plan: ${rolePlanRes.data?.planTier}`);
    if (rolePlanRes.status !== 200 || rolePlanRes.data?.planTier !== 'PRO') {
      throw new Error('Admin update user role-plan failed');
    }
  } else {
    console.log('[10 & 11] No secondary user found to test admin toggle; skipping secondary target operations.');
  }

  // 12. Cancel Subscription
  const cancelRes = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/billing/cancel',
    method: 'POST',
    headers: authHeaders
  });
  console.log(`[12] Cancel Subscription: Status ${cancelRes.status}, Plan: ${cancelRes.data?.planTier}, Status: ${cancelRes.data?.status}`);
  if (cancelRes.status !== 200 || cancelRes.data?.planTier !== 'FREE') {
    throw new Error('Cancel subscription failed');
  }

  console.log('\n✅ ALL STEP 9 BUSINESS, BILLING & ADMIN TESTS PASSED SUCCESSFULLY! 🚀');
}

runTests().catch(err => {
  console.error('\n❌ STEP 9 VERIFICATION FAILED:', err);
  process.exit(1);
});
