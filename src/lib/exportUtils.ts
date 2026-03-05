import { Task } from '@/types';
import { format } from 'date-fns';

export function exportToCSV(tasks: Task[], filename: string = 'tasks') {
  const headers = [
    'Title',
    'Description',
    'Status',
    'Priority',
    'Assignee',
    'Project',
    'Due Date',
    'Created At',
    'Completed At',
    'SLA Hours'
  ];

  const rows = tasks.map(task => [
    escapeCSV(task.title),
    escapeCSV(task.description || ''),
    task.status.replace('_', ' '),
    task.priority,
    task.assignee?.full_name || task.assignee?.email || 'Unassigned',
    task.project?.name || 'No Project',
    task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
    format(new Date(task.created_at), 'yyyy-MM-dd HH:mm'),
    task.completed_at ? format(new Date(task.completed_at), 'yyyy-MM-dd HH:mm') : '',
    task.sla_hours?.toString() || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadFile(csvContent, `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToPDF(tasks: Task[], filename: string = 'tasks') {
  // Create a printable HTML document
  const statusColors: Record<string, string> = {
    created: '#6b7280',
    in_progress: '#3b82f6',
    review: '#f59e0b',
    completed: '#22c55e'
  };

  const priorityColors: Record<string, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444'
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Tasks Export</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }
        h1 { font-size: 24px; margin-bottom: 8px; color: #1f2937; }
        .subtitle { color: #6b7280; margin-bottom: 24px; font-size: 14px; }
        .summary { display: flex; gap: 16px; margin-bottom: 24px; }
        .summary-card { padding: 16px; background: #f9fafb; border-radius: 8px; flex: 1; }
        .summary-value { font-size: 24px; font-weight: 600; color: #1f2937; }
        .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
        .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>Tasks Report</h1>
      <p class="subtitle">Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
      
      <div class="summary">
        <div class="summary-card">
          <div class="summary-value">${tasks.length}</div>
          <div class="summary-label">Total Tasks</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${tasks.filter(t => t.status === 'completed').length}</div>
          <div class="summary-label">Completed</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${tasks.filter(t => t.status === 'in_progress').length}</div>
          <div class="summary-label">In Progress</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length}</div>
          <div class="summary-label">Overdue</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Due Date</th>
            <th>Project</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => `
            <tr>
              <td>
                <div style="font-weight: 500;">${escapeHTML(task.title)}</div>
                ${task.description ? `<div style="color: #6b7280; font-size: 11px;" class="truncate">${escapeHTML(task.description)}</div>` : ''}
              </td>
              <td>
                <span class="badge" style="background: ${statusColors[task.status]}20; color: ${statusColors[task.status]};">
                  ${task.status.replace('_', ' ')}
                </span>
              </td>
              <td>
                <span class="badge" style="background: ${priorityColors[task.priority]}20; color: ${priorityColors[task.priority]};">
                  ${task.priority}
                </span>
              </td>
              <td>${task.assignee?.full_name || task.assignee?.email || 'Unassigned'}</td>
              <td>${task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}</td>
              <td>${task.project?.name || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
