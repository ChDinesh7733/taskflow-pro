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
  console.log('=== TaskFlow Step 10 (Backend Quality, Security & Hardening) Verification ===\n');

  // 1. Health check
  const health = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/health',
    method: 'GET'
  });
  console.log(`[1] Health Check: Status ${health.status} (${JSON.stringify(health.data)})`);
  if (health.status !== 200) throw new Error('Health check failed');

  // 2. Correlation ID Header Propagation & Generation
  const customCorrId = 'tf-trace-' + Date.now();
  const corrTestWithHeader = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/health',
    method: 'GET',
    headers: { 'X-Correlation-ID': customCorrId }
  });
  console.log(`[2a] Custom Correlation ID Echo: Sent="${customCorrId}", Received="${corrTestWithHeader.headers['x-correlation-id']}"`);
  if (corrTestWithHeader.headers['x-correlation-id'] !== customCorrId) {
    throw new Error('Correlation ID header not propagated back to response');
  }

  const corrTestGenerated = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/health',
    method: 'GET'
  });
  const autoCorrId = corrTestGenerated.headers['x-correlation-id'];
  console.log(`[2b] Auto-Generated Correlation ID: "${autoCorrId}"`);
  if (!autoCorrId || autoCorrId.length < 10) {
    throw new Error('Auto correlation ID not generated');
  }

  // 3. Security Headers Verification
  const headers = corrTestGenerated.headers;
  console.log(`[3] Security Headers:
    X-Content-Type-Options : ${headers['x-content-type-options']}
    X-Frame-Options        : ${headers['x-frame-options']}
    Strict-Transport-Sec   : ${headers['strict-transport-security']}
    Referrer-Policy        : ${headers['referrer-policy']}`);

  if (headers['x-content-type-options'] !== 'nosniff') throw new Error('Missing nosniff header');
  if (headers['x-frame-options'] !== 'SAMEORIGIN') throw new Error('Missing SAMEORIGIN frame options');
  if (!headers['strict-transport-security']?.includes('max-age=31536000')) throw new Error('Missing HSTS header');
  if (!headers['referrer-policy']?.includes('strict-origin-when-cross-origin')) throw new Error('Missing Referrer Policy');

  // 4. Rate Limiting Telemetry Headers
  const demoLoginRes = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/auth/demo',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  console.log(`[4] Rate Limit Headers:
    X-RateLimit-Limit     : ${demoLoginRes.headers['x-ratelimit-limit']}
    X-RateLimit-Remaining : ${demoLoginRes.headers['x-ratelimit-remaining']}
    X-RateLimit-Reset     : ${demoLoginRes.headers['x-ratelimit-reset']}s`);

  if (!demoLoginRes.headers['x-ratelimit-limit']) throw new Error('Missing X-RateLimit-Limit header');
  if (demoLoginRes.headers['x-ratelimit-remaining'] === undefined) throw new Error('Missing X-RateLimit-Remaining header');

  const token = demoLoginRes.data.accessToken;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Correlation-ID': 'test-error-tracing-999'
  };

  // 5. Global Exception Handling & Correlation ID in Error Payload (404 ResourceNotFound)
  const notFoundRes = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/tasks/00000000-0000-0000-0000-000000000000',
    method: 'GET',
    headers: authHeaders
  });
  console.log(`[5a] 404 Error Payload: Status ${notFoundRes.status}, Error="${notFoundRes.data?.error}", CorrelationId="${notFoundRes.data?.correlationId}"`);
  if (notFoundRes.status !== 404 || notFoundRes.data?.correlationId !== 'test-error-tracing-999') {
    throw new Error('404 Error handler did not return correlationId or standard payload');
  }

  // 5b. Validation Error Payload (400 Bad Request)
  const validationRes = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: '',
    password: ''
  });
  console.log(`[5b] 400 Validation Error Payload: Status ${validationRes.status}, Error="${validationRes.data?.error}", FieldErrors=${JSON.stringify(validationRes.data?.fieldErrors)}`);
  if (validationRes.status !== 400 || !validationRes.data?.fieldErrors) {
    throw new Error('400 Validation error payload invalid');
  }

  // 6. Actuator Endpoints: Health, Info, Metrics & Prometheus
  const actuatorHealth = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/actuator/health',
    method: 'GET'
  });
  console.log(`[6a] Actuator Health: Status ${actuatorHealth.status}, State=${JSON.stringify(actuatorHealth.data?.status)}`);
  if (actuatorHealth.status !== 200 || actuatorHealth.data?.status !== 'UP') {
    throw new Error('Actuator health endpoint failed');
  }

  const actuatorMetricsList = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/actuator/metrics',
    method: 'GET'
  });
  const names = actuatorMetricsList.data?.names || [];
  console.log(`[6b] Actuator Metrics: Total metrics exposed=${names.length}`);
  const hasTaskflowUsers = names.includes('taskflow.users.total');
  const hasTaskflowTasks = names.includes('taskflow.tasks.total');
  const hasTaskflowMrr = names.includes('taskflow.billing.mrr.usd');
  const hasTaskflowPomodoro = names.includes('taskflow.productivity.pomodoro.minutes');
  console.log(`    Custom Metric taskflow.users.total: ${hasTaskflowUsers ? '✅' : '❌'}`);
  console.log(`    Custom Metric taskflow.tasks.total: ${hasTaskflowTasks ? '✅' : '❌'}`);
  console.log(`    Custom Metric taskflow.billing.mrr.usd: ${hasTaskflowMrr ? '✅' : '❌'}`);
  console.log(`    Custom Metric taskflow.productivity.pomodoro.minutes: ${hasTaskflowPomodoro ? '✅' : '❌'}`);

  if (!hasTaskflowUsers || !hasTaskflowTasks || !hasTaskflowMrr || !hasTaskflowPomodoro) {
    throw new Error('One or more custom TaskFlow Micrometer metrics missing from Actuator');
  }

  // Query custom MRR metric value
  const mrrMetric = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/actuator/metrics/taskflow.billing.mrr.usd',
    method: 'GET'
  });
  console.log(`[6c] Query Metric taskflow.billing.mrr.usd: ${JSON.stringify(mrrMetric.data?.measurements)}`);
  if (mrrMetric.status !== 200) throw new Error('Failed to query custom MRR metric');

  // Query Prometheus Scrape Endpoint
  const prometheusScrape = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/actuator/prometheus',
    method: 'GET'
  });
  const scrapeSnippet = typeof prometheusScrape.data === 'string'
    ? prometheusScrape.data.split('\n').filter(l => l.startsWith('taskflow_')).slice(0, 4).join('\n    ')
    : '';
  console.log(`[6d] Prometheus Scrape Endpoint: Status ${prometheusScrape.status}, Sample lines:\n    ${scrapeSnippet}`);
  if (prometheusScrape.status !== 200 || !prometheusScrape.data.includes('taskflow_')) {
    throw new Error('Prometheus scrape endpoint did not expose taskflow metrics');
  }

  // 7. OpenAPI / Swagger v3 Completeness
  const openApiDocs = await request({
    hostname: 'localhost',
    port: 8081,
    path: '/v3/api-docs',
    method: 'GET'
  });
  console.log(`[7] OpenAPI v3 Specification: Status ${openApiDocs.status}, Title="${openApiDocs.data?.info?.title}", Version="${openApiDocs.data?.info?.version}"`);
  const secSchemes = openApiDocs.data?.components?.securitySchemes;
  console.log(`    Security Schemes: BearerAuth=${Boolean(secSchemes?.bearerAuth)}, ApiKeyAuth=${Boolean(secSchemes?.apiKeyAuth)}`);
  console.log(`    Tags defined: ${openApiDocs.data?.tags?.map(t => t.name).join(', ')}`);

  if (openApiDocs.status !== 200 || !secSchemes?.bearerAuth || !secSchemes?.apiKeyAuth) {
    throw new Error('OpenAPI v3 schema missing required security schemes');
  }

  console.log('\n✅ ALL STEP 10 BACKEND QUALITY, SECURITY & HARDENING TESTS PASSED! 🚀');
}

runTests().catch(err => {
  console.error('\n❌ STEP 10 VERIFICATION FAILED:', err);
  process.exit(1);
});
