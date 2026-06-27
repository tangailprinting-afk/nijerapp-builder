let customers = [], sales = [], collections = [], currentSale = null;
        const params = new URLSearchParams(location.search);
        const saleId = parseInt(params.get('sale_id') || params.get('id') || '0', 10) || null;

        async function init() { await loadData(); }
        async function loadData() {
            try {
                const [cd, sd, cld] = await Promise.all([FrameworkDB.get('customers'), FrameworkDB.get('sales'), FrameworkDB.get('collections')]);
                customers = ensureArray(cd); sales = ensureArray(sd); collections = ensureArray(cld);
                render();
            } catch (e) { console.error(e); document.getElementById('invoiceNo').textContent = 'Failed to load'; }
        }

        function render() {
            currentSale = sales.find(s => s.id == saleId);
            if (!currentSale) {
                document.getElementById('invoiceNo').textContent = 'Sale not found';
                document.getElementById('invoiceMeta').textContent = 'The requested sale record could not be located.';
                document.getElementById('collectionsTable').innerHTML = '<tr><td colspan="5"><div class="empty-state">No sale data</div></td></tr>';
                return;
            }
            let items = [];
            try { items = JSON.parse(currentSale.items || '[]'); } catch (e) { items = []; }
            const cust = customers.find(c => c.id == (currentSale.customer_id || currentSale.customerId));
            const total = getSaleTotalAmount(currentSale);
            const paid = getSalePaidAmount(currentSale);
            const due = getSaleDueAmount(currentSale);
            document.title = `${currentSale.invoice_no || currentSale.invoiceNo || 'Sale'} | Rizq Restaurant`;
            document.getElementById('invoiceNo').innerHTML = saleLink(currentSale.id, currentSale.invoice_no || currentSale.invoiceNo || '#');
            document.getElementById('invoiceMeta').innerHTML = `${esc(currentSale.sale_date || currentSale.date || '-')}${currentSale.due_date || currentSale.dueDate ? `<br>Due date: ${esc(currentSale.due_date || currentSale.dueDate)}` : ''}`;
            const payUrl = cust ? getCollectionEntryUrl({ customerId: cust.id, saleId: currentSale.id, amount: due }) : '';
            document.getElementById('dueAmount').innerHTML = cust ? dueAmountLink(payUrl, fmtCurrency(due)) : fmtCurrency(due);
            document.getElementById('totalAmount').textContent = fmtCurrency(total);
            document.getElementById('paidAmount').textContent = fmtCurrency(paid);
            document.getElementById('dueAmountSmall').innerHTML = cust ? dueAmountLink(payUrl, fmtCurrency(due)) : fmtCurrency(due);
            const payBtnHtml = cust ? `<a class="due-action" href="${esc(payUrl)}">💵 Pay Due</a>` : '';
            document.getElementById('duePayHero').innerHTML = payBtnHtml;
            document.getElementById('duePayStat').innerHTML = payBtnHtml;
            const collectPaymentTop = document.getElementById('collectPaymentTop');
            if (collectPaymentTop) {
                if (cust && due > 0) {
                    collectPaymentTop.href = payUrl;
                    collectPaymentTop.style.display = 'inline-flex';
                } else {
                    collectPaymentTop.style.display = 'none';
                }
            }
            document.getElementById('paymentMethod').textContent = currentSale.payment_method || 'N/A';
            document.getElementById('collectionsTable').innerHTML = collections.filter(c => (c.sale_id || c.saleId) == currentSale.id).sort((a,b)=>(b.id||0)-(a.id||0)).map(c => `<tr><td style="font-family:monospace;">${esc(c.receipt_no || '-')}</td><td>${c.collection_date || c.date || '-'}</td><td class="amount green">${fmtCurrency(parseFloat(c.amount || 0))}</td><td>${esc(c.payment_method || 'Cash')}</td><td>${esc(c.notes || '-')}</td></tr>`).join('') || '<tr><td colspan="5"><div class="empty-state">No linked collections</div></td></tr>';
        }

        function buildInvoiceHTMLClean(d, cust, it) {
            const shopName = SHOP_SETTINGS.name;
            const shopAddress = SHOP_SETTINGS.address;
            const shopPhone = SHOP_SETTINGS.phone;
            const shopLogo = SHOP_LOGO || '';
            const isPaid = parseFloat(d.due_amount || d.due || 0) <= 0;
            const itemLabel = (i) => i?.name || i?.item || i?.product_name || i?.productName || i?.menu_name || i?.menuName || i?.description || 'Item';
            const itemDetails = (i) => i?.details || i?.note || i?.variant || i?.category || i?.unit || '';
            const rows = (it || []).map((i, idx) => `
                <tr>
                    <td class="col-idx">${idx + 1}</td>
                    <td class="col-desc">
                        <span class="item-desc-main">${esc(itemLabel(i))}</span>
                        ${itemDetails(i) ? `<span class="item-desc-sub">${esc(itemDetails(i))}</span>` : ''}
                    </td>
                    <td class="col-qty">${i.qty || 1}</td>
                    <td class="col-price">৳ ${(parseFloat(i.price) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="col-total">৳ ${(parseFloat(i.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
            `).join('');
            const notesHtml = d.notes
                ? `<h4>Important Notes:</h4><p>${esc(d.notes)}</p>`
                : `<h4>Terms & Conditions:</h4><p>1. Goods once sold are not returnable.<br>2. Please check all items before leaving.<br>3. Thank you for choosing Rizq Restaurant!</p>`;
            const discountRow = parseFloat(d.discount) > 0
                ? `<tr><td class="lbl">Discount</td><td>- ৳ ${(parseFloat(d.discount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`
                : '';
            const dueDateRow = d.due_date || d.dueDate
                ? `<tr><td>Due Date</td><td style="color:#dc2626;">${esc(d.due_date || d.dueDate)}</td></tr>`
                : '';

            return `
                <style>
                    .inv-sheet{width:210mm;min-height:297mm;margin:0 auto;background:#fff;font-family:'Segoe UI',Arial,sans-serif;color:#334155;padding:12mm 12mm 14mm;box-sizing:border-box;position:relative;box-shadow:0 0 20px rgba(0,0,0,.1);overflow:hidden}
                    .inv-sheet *{box-sizing:border-box}
                    .inv-sheet .bill-to p,
                    .inv-sheet .notes-area p,
                    .inv-sheet .inv-meta-table td,
                    .inv-sheet .totals-table td,
                    .inv-sheet .item-desc-main,
                    .inv-sheet .item-desc-sub{overflow-wrap:break-word}
                    .brand-info h2,
                    .invoice-label-area h1,
                    .sig-box{overflow-wrap:normal;word-break:normal}
                    .inv-header{display:flex;justify-content:space-between;align-items:flex-start;gap:6mm;padding-bottom:8mm;border-bottom:2px solid #1e293b;margin-bottom:8mm}
                    .brand-area{display:flex;align-items:center;gap:4mm;min-width:0;flex:1 1 auto}
                    .brand-area img{width:28mm;max-width:28mm;max-height:18mm;object-fit:contain;flex:0 0 auto}
                    .brand-info{min-width:0}
                    .brand-info h2{margin:0;font-size:22px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:.4px;line-height:1.05}
                    .brand-info p{margin:1px 0;font-size:11px;color:#64748b;line-height:1.35}
                    .invoice-label-area{width:42mm;flex:0 0 42mm;text-align:right;min-width:42mm}
                    .invoice-label-area h1{margin:0;font-size:34px;font-weight:900;color:#1e293b;letter-spacing:1px;line-height:1}
                    .invoice-label-area .inv-no{font-size:13px;font-weight:700;margin-top:4px;color:#3b82f6}
                    .details-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:8mm;margin-bottom:10mm;align-items:start}
                    .bill-to h4,.notes-area h4{margin:0 0 3mm;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:1mm}
                    .bill-to .cust-name{font-size:15px;font-weight:800;color:#1e293b;margin-bottom:1mm;line-height:1.15}
                    .bill-to p{margin:1px 0;font-size:11.5px;line-height:1.45}
                    .inv-meta-table{width:100%;border-collapse:collapse;font-size:11.5px;table-layout:fixed}
                    .inv-meta-table td{padding:1.8mm 0;border-bottom:1px dashed #e2e8f0;vertical-align:top}
                    .inv-meta-table td:first-child{width:40%;color:#64748b;font-weight:400}
                    .inv-meta-table td:last-child{text-align:left;font-weight:700;color:#1e293b;padding-left:4mm}
                    .inv-table{width:100%;border-collapse:collapse;margin-bottom:10mm;table-layout:fixed}
                    .inv-table th{background:#1e293b;color:#fff;padding:4mm 3mm;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px}
                    .inv-table td{padding:4mm 3mm;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:12px;line-height:1.35}
                    .inv-table .col-idx{width:8mm;text-align:center;color:#64748b}
                    .inv-table .col-desc{width:auto}
                    .inv-table .col-qty{width:16mm;text-align:center}
                    .inv-table .col-price,.inv-table .col-total{width:28mm;text-align:right}
                    .inv-table .col-total{font-weight:700;color:#1e293b}
                    .item-desc-main{font-weight:700;color:#1e293b;display:block;margin-bottom:1mm}
                    .item-desc-sub{font-size:11px;color:#64748b;font-style:italic;display:block}
                    .summary-area{display:flex;justify-content:space-between;gap:8mm;align-items:flex-start;margin-bottom:15mm}
                    .notes-area,.totals-area{width:48%}
                    .notes-area p{font-size:11px;line-height:1.6;color:#64748b;margin:0}
                    .totals-table{width:100%;border-collapse:collapse;table-layout:fixed}
                    .totals-table td{padding:2.2mm 0;font-size:12.5px;vertical-align:top}
                    .totals-table td:last-child{text-align:right;font-weight:700;color:#1e293b;white-space:nowrap}
                    .totals-table .lbl{color:#64748b}
                    .totals-table tr.grand-total td{padding:4mm 0;font-size:17px;font-weight:900;color:#3b82f6;border-top:2px solid #1e293b;border-bottom:2px solid #1e293b}
                    .totals-table tr.paid-row td{color:#059669;font-size:13.5px}
                    .totals-table tr.due-row td{color:#dc2626;font-size:13.5px}
                    .signature-section{display:flex;justify-content:space-between;gap:10mm;margin-top:16mm;padding-top:8mm}
                    .sig-box{width:48%;text-align:center;border-top:1px solid #1e293b;padding-top:2mm;font-size:12px;font-weight:700;color:#1e293b}
                    .inv-footer{position:absolute;bottom:12mm;left:12mm;right:12mm;text-align:center;font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:4mm}
                    .paid-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:120px;font-weight:900;color:rgba(5,150,105,.1);border:15px solid rgba(5,150,105,.1);padding:10px 40px;border-radius:20px;text-transform:uppercase;pointer-events:none;display:${isPaid ? 'block' : 'none'}}
                    @media print{@page{size:A4 portrait;margin:0}body{visibility:hidden;background:#fff}.inv-sheet{visibility:visible;position:absolute;top:0;left:0;width:210mm;height:297mm;box-shadow:none;margin:0;padding:12mm 12mm 14mm;overflow:hidden}.inv-table th{background-color:#1e293b!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#fff!important}.totals-table tr.grand-total td{-webkit-print-color-adjust:exact;print-color-adjust:exact}.paid-watermark{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
                </style>
                <div class="inv-sheet">
                    <div class="paid-watermark">PAID</div>
                    <div class="inv-header">
                        <div class="brand-area">
                            <img src="${shopLogo}" alt="Logo" onerror="this.style.display='none'">
                            <div class="brand-info">
                                <h2>${esc(shopName)}</h2>
                                <p>${esc(shopAddress)}</p>
                                <p>Phone: ${esc(shopPhone)}</p>
                            </div>
                        </div>
                        <div class="invoice-label-area">
                            <h1>INVOICE</h1>
                            <div class="inv-no">${saleLink(d.id, '# ' + esc(d.invoice_no || d.invoiceNo || ''))}</div>
                        </div>
                    </div>

                    <div class="details-grid">
                        <div class="bill-to">
                            <h4>Bill To</h4>
                            <div class="cust-name">${cust ? customerLink(cust.id, cust.name || 'Walk-in Customer') : esc('Walk-in Customer')}</div>
                            ${cust?.mobile ? `<p><strong>Phone:</strong> ${esc(cust.mobile)}</p>` : ''}
                            ${cust?.address ? `<p><strong>Address:</strong> ${esc(cust.address)}</p>` : ''}
                        </div>
                        <div>
                            <h4>Invoice Details</h4>
                            <table class="inv-meta-table">
                                <tr><td>Invoice Date</td><td>${esc(d.sale_date || d.date || '-')}</td></tr>
                                <tr><td>Payment Method</td><td>${esc(d.payment_method || 'N/A')}</td></tr>
                                ${dueDateRow}
                            </table>
                        </div>
                    </div>

                    <table class="inv-table">
                        <thead>
                            <tr>
                                <th class="col-idx">#</th>
                                <th class="col-desc">Description &amp; Details</th>
                                <th class="col-qty">Qty</th>
                                <th class="col-price">Unit Price</th>
                                <th class="col-total">Total</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>

                    <div class="summary-area">
                        <div class="notes-area">${notesHtml}</div>
                        <div class="totals-area">
                            <table class="totals-table">
                                <tr><td class="lbl">Subtotal</td><td>৳ ${(parseFloat(d.subtotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                                ${discountRow}
                                <tr class="grand-total"><td class="lbl">Grand Total</td><td>৳ ${(parseFloat(d.total_amount || d.grandTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                                <tr class="paid-row"><td class="lbl">Paid Amount</td><td>৳ ${(parseFloat(d.paid_amount || d.paid) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                                <tr class="due-row"><td class="lbl">Due Amount</td><td>৳ ${(parseFloat(d.due_amount || d.due) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                            </table>
                        </div>
                    </div>

                    <div class="signature-section">
                        <div class="sig-box">Customer Signature</div>
                        <div class="sig-box">Authorized Signature</div>
                    </div>

                    <div class="inv-footer">
                        This is a computer generated invoice. No signature is required for electronic copy.<br>
                        <strong>Rizq Restaurant</strong> | Professional Printing &amp; Digital Solutions
                    </div>
                </div>`;
        }

        function buildInvoiceHTML(d, cust, it) {
            const shopName = SHOP_SETTINGS.name, shopAddress = SHOP_SETTINGS.address, shopPhone = SHOP_SETTINGS.phone, shopLogo = SHOP_LOGO || '';
            const isPaid = parseFloat(d.due_amount || d.due || 0) <= 0;
            return `<style>.inv-sheet{width:210mm;min-height:297mm;margin:0 auto;background:#fff;font-family:'Segoe UI',Arial,sans-serif;color:#334155;padding:15mm;box-sizing:border-box;position:relative;box-shadow:0 0 20px rgba(0,0,0,0.1)}.inv-sheet *{box-sizing:border-box}.inv-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:8mm;border-bottom:2px solid #1e293b;margin-bottom:8mm}.brand-area{display:flex;align-items:center;gap:5mm}.brand-area img{max-width:50mm;max-height:20mm;object-fit:contain}.brand-info h2{margin:0;font-size:22px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:.5px}.brand-info p{margin:1px 0;font-size:11px;color:#64748b;line-height:1.4}.invoice-label-area{text-align:right}.invoice-label-area h1{margin:0;font-size:36px;font-weight:900;color:#1e293b;letter-spacing:2px;line-height:1}.invoice-label-area .inv-no{font-size:14px;font-weight:700;margin-top:4px;color:#3b82f6}.details-grid{display:grid;grid-template-columns:1.2fr 0.8fr;gap:10mm;margin-bottom:10mm}.bill-to h4{margin:0 0 3mm;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:1mm}.bill-to .cust-name{font-size:16px;font-weight:800;color:#1e293b;margin-bottom:1mm}.bill-to p{margin:1px 0;font-size:12px;line-height:1.5}.inv-meta-table{width:100%;border-collapse:collapse;font-size:12px}.inv-meta-table td{padding:1.5mm 0;border-bottom:1px dashed #e2e8f0}.inv-meta-table td:last-child{text-align:right;font-weight:700;color:#1e293b}.inv-meta-table .lbl{color:#64748b;font-weight:400}.inv-table{width:100%;border-collapse:collapse;margin-bottom:10mm;table-layout:fixed}.inv-table th{background:#1e293b;color:#fff;padding:4mm 3mm;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px}.inv-table td{padding:4mm 3mm;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:12px;line-height:1.4;word-wrap:break-word}.inv-table .col-idx{width:10mm;text-align:center;color:#64748b}.inv-table .col-desc{width:auto}.inv-table .col-qty{width:20mm;text-align:center}.inv-table .col-price{width:30mm;text-align:right}.inv-table .col-total{width:35mm;text-align:right;font-weight:700;color:#1e293b}.item-desc-main{font-weight:700;color:#1e293b;display:block;margin-bottom:1mm}.item-desc-sub{font-size:11px;color:#64748b;font-style:italic}.summary-area{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15mm}.notes-area{width:45%}.notes-area h4{font-size:11px;text-transform:uppercase;color:#64748b;margin-bottom:2mm}.notes-area p{font-size:11px;line-height:1.6;color:#64748b}.totals-area{width:45%}.totals-table{width:100%;border-collapse:collapse}.totals-table td{padding:2.5mm 0;font-size:13px}.totals-table td:last-child{text-align:right;font-weight:700;color:#1e293b}.totals-table .lbl{color:#64748b}.totals-table tr.grand-total td{padding:4mm 0;font-size:18px;font-weight:900;color:#3b82f6;border-top:2px solid #1e293b;border-bottom:2px solid #1e293b}.totals-table tr.paid-row td{color:#059669;font-size:14px}.totals-table tr.due-row td{color:#dc2626;font-size:14px}.signature-section{display:flex;justify-content:space-between;margin-top:20mm;padding-top:10mm}.sig-box{width:50mm;text-align:center;border-top:1px solid #1e293b;padding-top:2mm;font-size:12px;font-weight:700;color:#1e293b}.inv-footer{position:absolute;bottom:15mm;left:15mm;right:15mm;text-align:center;font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:4mm}.paid-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:120px;font-weight:900;color:rgba(5,150,105,0.1);border:15px solid rgba(5,150,105,0.1);padding:10px 40px;border-radius:20px;text-transform:uppercase;pointer-events:none;display:${isPaid?'block':'none'}}@media print{@page{size:A4 portrait;margin:0}body{visibility:hidden;background:#fff}.inv-sheet{visibility:visible;position:absolute;top:0;left:0;width:210mm;height:297mm;box-shadow:none;margin:0;padding:15mm}.inv-table th{background-color:#1e293b!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;color:white!important}.totals-table tr.grand-total td{-webkit-print-color-adjust:exact;print-color-adjust:exact}.paid-watermark{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style><div class="inv-sheet"><div class="paid-watermark">PAID</div><div class="inv-header"><div class="brand-area"><img src="${shopLogo}" alt="Logo" onerror="this.style.display='none'"><div class="brand-info"><h2>${esc(shopName)}</h2><p>${esc(shopAddress)}</p><p>Phone: ${esc(shopPhone)}</p></div></div><div class="invoice-label-area"><h1>INVOICE</h1><div class="inv-no">${saleLink(d.id, '# ' + esc(d.invoice_no || d.invoiceNo || ''))}</div></div></div><div class="details-grid"><div class="bill-to"><h4>Bill To</h4><div class="cust-name">${cust ? customerLink(cust.id, cust.name || 'Walk-in Customer') : esc('Walk-in Customer')}</div>${cust?.mobile?`<p><strong>Phone:</strong> ${esc(cust.mobile)}</p>`:''}${cust?.address?`<p><strong>Address:</strong> ${esc(cust.address)}</p>`:''}</div><div><h4>Invoice Details</h4><table class="inv-meta-table"><tr><td class="lbl">Invoice Date</td><td>${esc(d.sale_date || d.date || '-')}</td></tr><tr><td class="lbl">Payment Method</td><td>${esc(d.payment_method || 'N/A')}</td></tr>${d.due_date||d.dueDate?`<tr><td class="lbl">Due Date</td><td style="color:#dc2626;">${esc(d.due_date || d.dueDate)}</td></tr>`:''}</table></div></div><table class="inv-table"><thead><tr><th class="col-idx">#</th><th class="col-desc">Description & Details</th><th class="col-qty">Qty</th><th class="col-price">Unit Price</th><th class="col-total">Total</th></tr></thead><tbody>${(it || []).map((i,idx)=>`<tr><td class="col-idx" data-label="#">${idx+1}</td><td class="col-desc" data-label="Description & Details"><span class="item-desc-main">${esc(i.description || '')}</span>${i.details?`<span class="item-desc-sub">${esc(i.details)}</span>`:''}</td><td class="col-qty" data-label="Qty">${i.qty||1}</td><td class="col-price" data-label="Unit Price">৳ ${(parseFloat(i.price)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td class="col-total" data-label="Total">৳ ${(parseFloat(i.total)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>`).join('')}</tbody></table><div class="summary-area"><div class="notes-area">${d.notes?`<h4>Important Notes:</h4><p>${esc(d.notes)}</p>`:`<h4>Terms & Conditions:</h4><p>1. Goods once sold are not returnable.<br>2. Please check all items before leaving.<br>3. Thank you for choosing Rizq Restaurant!</p>`}</div><div class="totals-area"><table class="totals-table"><tr><td class="lbl">Subtotal</td><td>৳ ${(parseFloat(d.subtotal)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>${parseFloat(d.discount)>0?`<tr><td class="lbl">Discount</td><td>- ৳ ${(parseFloat(d.discount)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>`:''}<tr class="grand-total"><td class="lbl">Grand Total</td><td>৳ ${(parseFloat(d.total_amount||d.grandTotal)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr><tr class="paid-row"><td class="lbl">Paid Amount</td><td>৳ ${(parseFloat(d.paid_amount||d.paid)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr><tr class="due-row"><td class="lbl">Due Amount</td><td>৳ ${(parseFloat(d.due_amount||d.due)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr></table></div></div><div class="signature-section"><div class="sig-box">Customer Signature</div><div class="sig-box">Authorized Signature</div></div><div class="inv-footer">This is a computer generated invoice. No signature is required for electronic copy.<br><strong>Rizq Restaurant</strong> | Professional Printing & Digital Solutions</div></div>`;
        }

        function printInvoice() {
            if (!currentSale) return;
            const cust = customers.find(c => c.id == (currentSale.customer_id || currentSale.customerId));
            let items = [];
            try { items = JSON.parse(currentSale.items || '[]'); } catch (e) {}
            const printableHtml = buildInvoiceHTMLClean(currentSale, cust, items);
            if (typeof window.printHTMLContent === 'function') {
                Promise.resolve(window.printHTMLContent(printableHtml, { title: 'Print Invoice', mode: 'thermal', requireNative: true }))
                    .catch(err => showToast('Print failed: ' + err.message, 'error'));
                return;
            }
            const nativePrinter = window.NijerAppPrinter || window.AndroidPrinter;
            if (nativePrinter && typeof nativePrinter.printDocument === 'function') {
                nativePrinter.printDocument(JSON.stringify({ title: 'Print Invoice', html: printableHtml, text: '', url: window.location.href, requireNative: true }));
                return;
            }
            showToast('Native printer bridge not available.', 'error');
        }

        init();
