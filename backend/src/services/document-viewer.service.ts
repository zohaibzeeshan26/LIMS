import fs from 'fs';
import path from 'path';

// Require mammoth and xlsx dynamically
const mammoth = require('mammoth');
const xlsx = require('xlsx');

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function renderDocumentToHtml(options: {
  filePath: string;
  fileName: string;
  mimeType: string;
  downloadUrl: string;
  title?: string;
  version?: number;
  productName?: string;
}): Promise<string> {
  const { filePath, fileName, downloadUrl, title, version, productName } = options;
  const ext = path.extname(fileName).toLowerCase();
  const safeTitle = escapeHtml(title || fileName);
  const safeProdName = escapeHtml(productName || 'Product Dossier');
  const safeVersion = version ? `v${version}.0` : 'v1.0';

  // Base CSS styles for the pharmaceutical document viewer
  const baseStyles = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.6;
      padding: 16px;
    }
    .top-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #ffffff;
      padding: 12px 18px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .file-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }
    .file-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-word { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-excel { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-text { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .file-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 380px;
    }
    .version-pill {
      font-size: 10px;
      font-family: monospace;
      font-weight: 700;
      background: #ccfbf1;
      color: #0f766e;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #99f6e4;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
    }
    .btn:hover { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }
    .btn-teal {
      background: #0d9488;
      color: #ffffff;
      border-color: #0d9488;
    }
    .btn-teal:hover { background: #0f766e; color: #ffffff; border-color: #0f766e; }

    /* Word Document Styles */
    .word-document-wrapper {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px 60px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .word-document-wrapper h1, .word-document-wrapper h2, .word-document-wrapper h3, .word-document-wrapper h4 {
      color: #0f172a;
      margin-top: 24px;
      margin-bottom: 12px;
      font-weight: 700;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .word-document-wrapper h1 { font-size: 20px; }
    .word-document-wrapper h2 { font-size: 17px; }
    .word-document-wrapper h3 { font-size: 14.5px; }
    .word-document-wrapper p {
      margin-bottom: 14px;
      font-size: 13.5px;
      color: #334155;
      text-align: justify;
    }
    .word-document-wrapper ol, .word-document-wrapper ul {
      margin-left: 24px;
      margin-bottom: 14px;
      font-size: 13.5px;
      color: #334155;
    }
    .word-document-wrapper li { margin-bottom: 6px; }
    .word-document-wrapper table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12.5px;
      background: #ffffff;
    }
    .word-document-wrapper th, .word-document-wrapper td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    .word-document-wrapper th {
      background: #f1f5f9;
      font-weight: 700;
      color: #1e293b;
    }
    .word-document-wrapper tr:nth-child(even) td { background: #fafafa; }
    .word-document-wrapper img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 14px 0;
      border: 1px solid #e2e8f0;
    }

    /* Excel Spreadsheet Styles */
    .excel-container {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      overflow: hidden;
      display: flex;
      flex-col: column;
    }
    .excel-tabs-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      overflow-x: auto;
    }
    .sheet-tab-btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      background: transparent;
      color: #64748b;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .sheet-tab-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .sheet-tab-btn.active {
      background: #ffffff;
      color: #166534;
      border-color: #cbd5e1;
      border-bottom-color: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      font-weight: 700;
    }
    .excel-sheet-panel {
      display: none;
      overflow: auto;
      max-height: 72vh;
      padding: 12px;
    }
    .excel-sheet-panel.active {
      display: block;
    }
    .excel-sheet-panel table {
      border-collapse: collapse;
      font-size: 11.5px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-width: 100%;
    }
    .excel-sheet-panel th, .excel-sheet-panel td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      white-space: nowrap;
    }
    .excel-sheet-panel tr:first-child td, .excel-sheet-panel th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .excel-sheet-panel tr:hover td {
      background: #f0fdf4;
    }

    /* Print styles */
    @media print {
      body { background: white; padding: 0; }
      .top-toolbar { display: none; }
      .word-document-wrapper, .excel-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .excel-tabs-bar { display: none; }
      .excel-sheet-panel { display: block !important; max-height: none; overflow: visible; }
    }
  `;

  // 1. Handle Word (.docx / .doc)
  if (ext === '.docx' || ext === '.doc') {
    try {
      const conversion = await mammoth.convertToHtml({ path: filePath });
      const docHtml = conversion.value;

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="top-toolbar">
    <div class="file-meta">
      <span class="file-badge badge-word">📝 Word Document</span>
      <span class="file-title" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</span>
      <span class="version-pill">${safeVersion}</span>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn" onclick="window.print()">🖨️ Print</button>
    </div>
  </div>

  <div class="word-document-wrapper">
    <div style="border-bottom: 2px solid #0d9488; padding-bottom: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h2 style="margin: 0; font-size: 18px; color: #0f172a; border: none; padding: 0;">${safeProdName}</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${safeTitle}</p>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 11px; font-weight: bold; background: #f0fdf4; color: #166534; padding: 3px 8px; border-radius: 4px; border: 1px solid #bbf7d0;">
          APPROVED QUALITY SPECIFICATION
        </span>
      </div>
    </div>

    ${docHtml || '<p style="color: #64748b; font-style: italic;">No readable content found in this document.</p>'}
  </div>
</body>
</html>`;
    } catch (err: any) {
      console.error('Failed to convert docx to HTML:', err);
      return `<div style="padding: 24px; font-family: sans-serif; text-align: center;">
        <h3>Could not preview Word document</h3>
        <p style="color: #64748b; margin-top: 8px;">${escapeHtml(err.message)}</p>
      </div>`;
    }
  }

  // 2. Handle Excel (.xlsx / .xls / .csv)
  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetNames: string[] = workbook.SheetNames || [];

      let tabsHtml = '';
      let panelsHtml = '';

      sheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName];
        const sheetTableHtml = xlsx.utils.sheet_to_html(sheet);
        const isActive = index === 0;

        tabsHtml += `
          <button
            type="button"
            class="sheet-tab-btn ${isActive ? 'active' : ''}"
            onclick="switchSheetTab(${index})"
            id="tab-btn-${index}"
          >
            📊 ${escapeHtml(sheetName)}
          </button>
        `;

        panelsHtml += `
          <div class="excel-sheet-panel ${isActive ? 'active' : ''}" id="sheet-panel-${index}">
            ${sheetTableHtml}
          </div>
        `;
      });

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="top-toolbar">
    <div class="file-meta">
      <span class="file-badge badge-excel">📊 Excel Workbook</span>
      <span class="file-title" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</span>
      <span class="version-pill">${safeVersion}</span>
      <span style="font-size: 11px; color: #64748b; font-weight: 600;">(${sheetNames.length} Sheets)</span>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn" onclick="window.print()">🖨️ Print</button>
    </div>
  </div>

  <div class="excel-container">
    <div class="excel-tabs-bar">
      ${tabsHtml}
    </div>
    ${panelsHtml}
  </div>

  <script>
    function switchSheetTab(targetIndex) {
      var tabs = document.querySelectorAll('.sheet-tab-btn');
      var panels = document.querySelectorAll('.excel-sheet-panel');
      tabs.forEach(function(btn, i) {
        if (i === targetIndex) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      panels.forEach(function(panel, i) {
        if (i === targetIndex) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    }
  </script>
</body>
</html>`;
    } catch (err: any) {
      console.error('Failed to convert xlsx to HTML:', err);
      return `<div style="padding: 24px; font-family: sans-serif; text-align: center;">
        <h3>Could not preview Excel spreadsheet</h3>
        <p style="color: #64748b; margin-top: 8px;">${escapeHtml(err.message)}</p>
      </div>`;
    }
  }

  // 3. Handle Text / Monograph files (.txt, .log, .json)
  try {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <style>
    ${baseStyles}
    .raw-text-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12.5px;
      white-space: pre-wrap;
      word-break: break-all;
      color: #1e293b;
      line-height: 1.7;
    }
  </style>
</head>
<body>
  <div class="top-toolbar">
    <div class="file-meta">
      <span class="file-badge badge-text">📄 Plain Text Document</span>
      <span class="file-title">${escapeHtml(fileName)}</span>
      <span class="version-pill">${safeVersion}</span>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn" onclick="window.print()">🖨️ Print</button>
    </div>
  </div>
  <pre class="raw-text-box">${escapeHtml(rawContent)}</pre>
</body>
</html>`;
  } catch {
    return `<div style="padding: 24px; font-family: sans-serif; text-align: center;">
      <h3>Preview not available</h3>
    </div>`;
  }
}

