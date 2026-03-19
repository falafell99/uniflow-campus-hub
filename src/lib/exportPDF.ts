export function exportToPDF(title: string, htmlContent: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 13px;
          line-height: 1.6;
          color: #111;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
        h2 { font-size: 18px; font-weight: 600; margin: 20px 0 8px; }
        h3 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; }
        p { margin-bottom: 8px; color: #333; }
        ul { padding-left: 20px; margin-bottom: 12px; }
        li { margin-bottom: 4px; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
        pre { background: #f4f4f4; padding: 12px; border-radius: 6px; margin-bottom: 12px; overflow: auto; }
        .meta { color: #666; font-size: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
        .tag { display: inline-block; background: #f0f0f0; padding: 2px 8px; border-radius: 99px; font-size: 11px; margin-right: 4px; }
        .task { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .task-status { font-size: 11px; background: #f0f0f0; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
        .task-priority-urgent { color: #ef4444; font-weight: 600; }
        .task-priority-high { color: #f97316; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin: 24px 0 12px; }
        @media print {
          body { padding: 20px; }
          @page { margin: 1cm; }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 500);
}

export function noteToHTML(note: { title: string; subject?: string | null; topic?: string | null; tags: string[]; blocks: any[]; updated_at: string }): string {
  const blocksHTML = note.blocks.map((block: any) => {
    switch (block.type) {
      case "h1": return `<h2>${block.content}</h2>`;
      case "h2": return `<h3>${block.content}</h3>`;
      case "bullet": return `<ul><li>${block.content}</li></ul>`;
      case "checklist": return `<ul><li>${block.checked ? "☑" : "☐"} ${block.content}</li></ul>`;
      case "code": return `<pre><code>${block.content}</code></pre>`;
      case "divider": return `<hr style="border:none;border-top:1px solid #eee;margin:16px 0">`;
      default: return `<p>${block.content || "&nbsp;"}</p>`;
    }
  }).join("\n");

  const tagsHTML = note.tags.map((t: string) => `<span class="tag">${t}</span>`).join("");

  return `
    <h1>${note.title}</h1>
    <div class="meta">
      ${note.subject ? `<strong>${note.subject}</strong>${note.topic ? ` · ${note.topic}` : ""}` : ""}
      ${tagsHTML ? `<div style="margin-top:6px">${tagsHTML}</div>` : ""}
      <div style="margin-top:4px">Last updated: ${new Date(note.updated_at).toLocaleDateString()}</div>
    </div>
    ${blocksHTML}
  `;
}

export function tasksToHTML(tasks: any[], title: string = "My Tasks"): string {
  const grouped: Record<string, any[]> = {
    todo: tasks.filter((t: any) => t.status === "todo"),
    in_progress: tasks.filter((t: any) => t.status === "in_progress"),
    review: tasks.filter((t: any) => t.status === "review"),
    done: tasks.filter((t: any) => t.status === "done"),
  };

  const statusLabels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", review: "In Review", done: "Done" };

  const sectionsHTML = Object.entries(grouped)
    .filter(([, items]) => items.length > 0)
    .map(([status, items]) => `
      <div class="section-title">${statusLabels[status]} (${items.length})</div>
      ${items.map((task: any) => `
        <div class="task">
          <span class="task-status">${statusLabels[task.status]}</span>
          <div style="flex:1">
            <strong class="${task.priority === "urgent" ? "task-priority-urgent" : task.priority === "high" ? "task-priority-high" : ""}">${task.title}</strong>
            ${task.subject ? `<span style="color:#888;font-size:12px"> · ${task.subject}</span>` : ""}
            ${task.due_date ? `<div style="color:#888;font-size:12px">Due: ${new Date(task.due_date).toLocaleDateString()}</div>` : ""}
            ${task.description ? `<div style="color:#555;font-size:12px;margin-top:4px">${task.description}</div>` : ""}
          </div>
        </div>
      `).join("")}
    `).join("");

  return `
    <h1>${title}</h1>
    <div class="meta">Exported on ${new Date().toLocaleDateString()} · ${tasks.length} tasks total</div>
    ${sectionsHTML}
  `;
}
