/**
 * Utilities for CSV & PDF export and CSV import of tasks
 */

export function exportTasksToCSV(tasks, filename = 'taskflow-tasks.csv') {
  if (!tasks || !tasks.length) return false;

  const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Start Date', 'Due Date', 'Assignee', 'Tags'];

  const rows = tasks.map(t => [
    `"${(t.id || '').replace(/"/g, '""')}"`,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${t.status || 'TODO'}"`,
    `"${t.priority || 'MEDIUM'}"`,
    `"${t.startDate || ''}"`,
    `"${t.dueDate || ''}"`,
    `"${(t.assigneeName || '').replace(/"/g, '""')}"`,
    `"${(t.tags || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

export function exportTasksToPDF(tasks) {
  if (!tasks || !tasks.length) return false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const rowsHtml = tasks.map((t, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td style="font-weight: 600;">${t.title}</td>
      <td><span class="badge ${t.status.toLowerCase()}">${t.status}</span></td>
      <td>${t.priority}</td>
      <td>${t.dueDate ? t.dueDate.substring(0, 10) : '—'}</td>
      <td>${t.assigneeName || '—'}</td>
      <td>${t.tags || '—'}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TaskFlow Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 6px 0; font-size: 20px; color: #4338ca; }
          p { margin: 0 0 18px 0; font-size: 13px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
          th { text-align: left; padding: 8px 10px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; }
          td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
          .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .todo { background: #fef3c7; color: #92400e; }
          .in_progress { background: #dbeafe; color: #1e40af; }
          .in_review { background: #ede9fe; color: #5b21b6; }
          .done { background: #d1fae5; color: #065f46; }
          .cancelled { background: #f3f4f6; color: #4b5563; }
        </style>
      </head>
      <body>
        <h1>TaskFlow Pro — Task Report</h1>
        <p>Generated on ${new Date().toLocaleString()} • Total Tasks: ${tasks.length}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Assignee</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
  return true;
}

export function parseTasksCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  const titleIdx    = headers.findIndex(h => h.includes('title'));
  const descIdx     = headers.findIndex(h => h.includes('desc'));
  const priorityIdx = headers.findIndex(h => h.includes('priority'));
  const dueIdx      = headers.findIndex(h => h.includes('due'));
  const assigneeIdx = headers.findIndex(h => h.includes('assign'));
  const tagsIdx     = headers.findIndex(h => h.includes('tag'));

  if (titleIdx === -1) {
    throw new Error('CSV must contain a "Title" column');
  }

  const tasks = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV line splitter accounting for quotes
    const cols = [];
    let inQuotes = false;
    let curr = '';
    for (const char of lines[i]) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        cols.push(curr.trim());
        curr = '';
      } else {
        curr += char;
      }
    }
    cols.push(curr.trim());

    const title = (cols[titleIdx] || '').replace(/^"|"$/g, '').trim();
    if (!title) continue;

    const desc = descIdx !== -1 ? (cols[descIdx] || '').replace(/^"|"$/g, '').trim() : null;
    const priRaw = priorityIdx !== -1 ? (cols[priorityIdx] || '').replace(/^"|"$/g, '').toUpperCase().trim() : 'MEDIUM';
    const priority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priRaw) ? priRaw : 'MEDIUM';
    const dueRaw = dueIdx !== -1 ? (cols[dueIdx] || '').replace(/^"|"$/g, '').trim() : null;
    const assignee = assigneeIdx !== -1 ? (cols[assigneeIdx] || '').replace(/^"|"$/g, '').trim() : null;
    const tags = tagsIdx !== -1 ? (cols[tagsIdx] || '').replace(/^"|"$/g, '').trim() : null;

    tasks.push({
      title,
      description: desc || null,
      priority,
      dueDate: dueRaw ? dueRaw.substring(0, 10) : null,
      assigneeName: assignee || null,
      tags: tags || null,
    });
  }

  return tasks;
}
