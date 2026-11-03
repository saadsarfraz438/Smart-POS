type ReceiptItem = {
  name: string;
  qty: number;
  unitPrice: number;
  discountLabel: string;
  lineTotal: number;
};

type ReceiptPayload = {
  companyName: string;
  invoiceNo: string;
  salespersonName: string;
  receiptDateTime: string;
  currency: string;
  items: ReceiptItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const buildReceiptText = (payload: ReceiptPayload) => {
  const lines = [
    payload.companyName,
    'Customer Receipt',
    '',
    `Invoice: ${payload.invoiceNo}`,
    `Salesperson: ${payload.salespersonName}`,
    `Date: ${payload.receiptDateTime}`,
    '',
    'Description                 Qty   Price    Disc    Total',
    '--------------------------------------------------------',
    ...payload.items.map((item) => `${item.name.slice(0, 24).padEnd(24)} ${String(item.qty).padStart(3)} ${payload.currency}${item.unitPrice.toLocaleString().padStart(8)} ${item.discountLabel.padStart(7)} ${payload.currency}${item.lineTotal.toLocaleString().padStart(8)}`),
    '--------------------------------------------------------',
    `Subtotal: ${payload.currency} ${payload.subtotal.toLocaleString()}`,
    `Tax (${payload.taxRate}%): ${payload.currency} ${payload.taxAmount.toLocaleString()}`,
    `Discount: ${payload.currency} ${payload.discount.toLocaleString()}`,
    `Grand Total: ${payload.currency} ${payload.grandTotal.toLocaleString()}`,
    '',
    'THANK YOU',
  ];

  return lines.join('\n');
};

export const buildReceiptHtml = (payload: ReceiptPayload) => {
  const rows = payload.items.map((item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="num">${item.qty}</td>
          <td class="num">${payload.currency} ${item.unitPrice.toLocaleString()}</td>
          <td class="num">${escapeHtml(item.discountLabel)}</td>
          <td class="num">${payload.currency} ${item.lineTotal.toLocaleString()}</td>
        </tr>
      `).join('');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(payload.invoiceNo)}</title>
  <style>
    body {
      margin: 0;
      background: #f3f4f6;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
    }
    .receipt-page {
      width: 100%;
      padding: 16px;
      box-sizing: border-box;
    }
    .receipt-paper {
      width: 80mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 16px;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
    }
    .receipt-header {
      text-align: center;
      border-bottom: 1px dashed #9ca3af;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .receipt-header h1 {
      margin: 0;
      font-size: 18px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .receipt-header p {
      margin: 4px 0 0;
      font-size: 12px;
      color: #6b7280;
    }
    .receipt-meta {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      table-layout: fixed;
    }
    .receipt-table th,
    .receipt-table td {
      padding: 6px 4px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
      word-break: break-word;
    }
    .receipt-table th {
      text-align: left;
      font-size: 11px;
      color: #4b5563;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .num { text-align: right; white-space: nowrap; }
    .summary {
      margin-top: 12px;
      border-top: 1px dashed #9ca3af;
      padding-top: 12px;
      font-size: 12px;
      line-height: 1.7;
    }
    .summary .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .summary .total {
      font-size: 14px;
      font-weight: 700;
      border-top: 1px solid #d1d5db;
      margin-top: 8px;
      padding-top: 8px;
    }
    .footer {
      margin-top: 16px;
      text-align: center;
      font-size: 12px;
      letter-spacing: 0.12em;
    }
    @media print {
      body { background: #fff; }
      .receipt-page { padding: 0; }
      .receipt-paper {
        width: 80mm;
        border: none;
        box-shadow: none;
        border-radius: 0;
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-page">
    <div class="receipt-paper">
      <div class="receipt-header">
        <h1>${escapeHtml(payload.companyName)}</h1>
        <p>Customer Receipt</p>
      </div>
      <div class="receipt-meta">
        <div><strong>Invoice:</strong> ${escapeHtml(payload.invoiceNo)}</div>
        <div><strong>Salesperson:</strong> ${escapeHtml(payload.salespersonName)}</div>
        <div><strong>Date:</strong> ${escapeHtml(payload.receiptDateTime)}</div>
      </div>
      <table class="receipt-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="num">Qty</th>
            <th class="num">Price</th>
            <th class="num">Disc</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="summary">
        <div class="row"><span>Subtotal</span><span>${payload.currency} ${payload.subtotal.toLocaleString()}</span></div>
        <div class="row"><span>Tax (${payload.taxRate}%)</span><span>${payload.currency} ${payload.taxAmount.toLocaleString()}</span></div>
        <div class="row"><span>Discount</span><span>${payload.currency} ${payload.discount.toLocaleString()}</span></div>
        <div class="row total"><span>Grand Total</span><span>${payload.currency} ${payload.grandTotal.toLocaleString()}</span></div>
      </div>
      <div class="footer">THANK YOU</div>
    </div>
  </div>
</body>
</html>`;
};