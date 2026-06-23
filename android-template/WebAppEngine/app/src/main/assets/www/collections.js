let collections = [], customers = [], sales = [], editingId = null, currentReceipt = null;
        const collectionEntryParams = new URLSearchParams(location.search);
        const prefillCollection = {
            customerId: collectionEntryParams.get('customer_id') || collectionEntryParams.get('customerId') || '',
            saleId: parseInt(collectionEntryParams.get('sale_id') || collectionEntryParams.get('saleId') || '0', 10) || null,
            amount: parseFloat(collectionEntryParams.get('amount') || '0') || null,
            notes: collectionEntryParams.get('notes') || '',
        };

        async function init() { await loadAllData(); resetCollectionForm(); applyPrefillFromUrl(); }
        async function loadAllData() { try { const [cd, cud, sd] = await Promise.all([FrameworkDB.get('collections'), FrameworkDB.get('customers'), FrameworkDB.get('sales')]); collections = ensureArray(cd); customers = ensureArray(cud); sales = ensureArray(sd); updateAllUI(); } catch (e) { console.error(e); showToast('Failed to load data', 'error'); } }

        function getCustomerDue(cid) { return getCustomerFinancialSummary(cid, sales, collections, customers).currentDue; }
        function getCustomerTotalPaid(cid) { return getCustomerFinancialSummary(cid, sales, collections, customers).totalPaid; }
        function generateReceiptNo() { return 'RCP-' + String(collections.length + 1).padStart(3, '0'); }
        function normalizeCustomerId(value) { return String(value || '').trim(); }
        function getCustomerById(cid) {
            const key = normalizeCustomerId(cid);
            if (!key) return null;
            return customers.find(c => String(c.id) === key || String(c.id).toLowerCase() === key.toLowerCase()) || null;
        }
        function getOutstandingSalesForCustomer(cid) {
            return sales
                .filter(s => (s.customer_id || s.customerId) == cid && getSaleDueAmount(s) > 0)
                .sort((a, b) => {
                    const ad = (a.sale_date || a.date || '');
                    const bd = (b.sale_date || b.date || '');
                    if (ad !== bd) return ad.localeCompare(bd);
                    return (a.id || 0) - (b.id || 0);
                });
        }
        function getReceiptGroup(col) {
            const receiptNo = col?.receipt_no || '';
            const customerKey = normalizeCustomerId(col?.customer_id || col?.customerId);
            if (!receiptNo) return [col];
            const group = collections.filter(c => (c.receipt_no || '') === receiptNo && normalizeCustomerId(c.customer_id || c.customerId) === customerKey);
            return group.length ? group : [col];
        }
        function getReceiptGroupTotal(group) {
            return (group || []).reduce((sum, item) => sum + (parseFloat(item.amount || 0) || 0), 0);
        }
        function getCollectionRecordDate(col) {
            return col?.collection_date || col?.date || todayDate();
        }

        function resetCollectionForm() { editingId = null; document.getElementById('c_id').value = ''; document.getElementById('c_customer_search').value = ''; document.getElementById('c_customer').value = ''; document.getElementById('c_date').value = todayDate(); document.getElementById('c_paymentMethod').value = 'Cash'; document.getElementById('c_amount').value = ''; document.getElementById('c_saleId').innerHTML = '<option value="">General Collection</option>'; document.getElementById('c_notes').value = ''; document.getElementById('customerInfoCard').style.display = 'none'; }

        function applyPrefillFromUrl() {
            if (!prefillCollection.customerId) return;
            const c = getCustomerById(prefillCollection.customerId);
            if (!c) return;
            document.getElementById('c_customer').value = c.id;
            document.getElementById('c_customer_search').value = getCustomerSearchLabel(c, { preferMobile: true, includeName: true });
            updateCustomerInfo(c.id);
            populateSaleDropdown(c.id);
            if (prefillCollection.saleId) {
                document.getElementById('c_saleId').value = String(prefillCollection.saleId);
            }
            const sale = prefillCollection.saleId ? sales.find(s => s.id == prefillCollection.saleId) : null;
            if (prefillCollection.amount && prefillCollection.amount > 0) {
                document.getElementById('c_amount').value = prefillCollection.amount.toFixed(2);
            } else if (sale) {
                document.getElementById('c_amount').value = getSaleDueAmount(sale).toFixed(2);
            }
            if (prefillCollection.notes) {
                document.getElementById('c_notes').value = prefillCollection.notes;
            }
        }

        function filterCustomerDropdown() { const s = (document.getElementById('c_customer_search').value || '').trim().toLowerCase(); const dd = document.getElementById('customerDropdown'); const f = getCustomerSearchMatches(customers, s, 5); dd.innerHTML = f.map(c => `<div class="dropdown-item" onclick='selectCollectionCustomer(${JSON.stringify(c.id)}, ${JSON.stringify(c.mobile || '')}, ${JSON.stringify(c.name || '')})'>${esc(getCustomerSearchLabel(c, { preferMobile: true, includeName: true }))} <span style="color:var(--text-muted);">${esc(c.name || '')}${c.name && c.mobile ? ' · ' : ''}${esc(c.mobile || '')}</span> ${getCustomerDue(c.id)>0?'(Due: '+fmtCurrency(getCustomerDue(c.id))+')':'(Clear)'}</div>`).join('') || '<div class="dropdown-item" style="color:var(--text-muted);">No customers found</div>'; dd.classList.add('show'); }
        function selectCollectionCustomer(id, mobile, name) { document.getElementById('c_customer').value = id; document.getElementById('c_customer_search').value = mobile || name || ''; document.getElementById('customerDropdown').classList.remove('show'); updateCustomerInfo(id); populateSaleDropdown(id); }
        function updateCustomerInfo(cid) { const c = getCustomerById(cid); if (!c) { document.getElementById('customerInfoCard').style.display = 'none'; return; } const fs = getCustomerFinancialSummary(c.id, sales, collections, customers); document.getElementById('customerInfoCard').style.display = 'flex'; document.getElementById('infoName').innerHTML = customerLink(c.id, c.name || 'N/A'); document.getElementById('infoMobile').textContent = c.mobile || '-'; document.getElementById('infoDue').innerHTML = fs.currentDue > 0 ? dueAmountLink(getCollectionEntryUrl({ customerId: c.id, amount: fs.currentDue }), fmtCurrency(fs.currentDue)) : '<span style="color:#10b981;font-weight:800;">✅ Clear</span>'; document.getElementById('infoPaid').textContent = fmtCurrency(fs.totalPaid); if (fs.currentDue > 0) document.getElementById('c_amount').value = fs.currentDue; }
        function populateSaleDropdown(cid) { const dueSales = sales.filter(s => (s.customer_id || s.customerId) == cid && getSaleDueAmount(s) > 0); document.getElementById('c_saleId').innerHTML = '<option value="">General Collection</option>' + dueSales.map(s => `<option value="${s.id}">${esc(s.invoice_no||s.invoiceNo||'#'+s.id)} — Due: ${fmtCurrency(getSaleDueAmount(s))}</option>`).join(''); }

        function updateAllUI() { updateStats(); updateCollectionTable(); }
        function updateStats() { document.getElementById('statTotal').textContent = collections.length; const t = todayDate(), ms = monthStartDate(); document.getElementById('statToday').textContent = fmtCurrency(collections.filter(c => (c.collection_date||c.date)===t).reduce((s,c)=>s+(parseFloat(c.amount||0)),0)); document.getElementById('statMonth').textContent = fmtCurrency(collections.filter(c => (c.collection_date||c.date)>=ms).reduce((s,c)=>s+(parseFloat(c.amount||0)),0)); let tr = 0; customers.forEach(c => { tr += getCustomerDue(c.id); }); document.getElementById('statRemaining').innerHTML = `<a href="${getCollectionEntryUrl()}" class="inline-link inline-due">${fmtCurrency(tr)}</a>`; }

        function updateCollectionTable() { const tbody = document.getElementById('collectionTable'); const s = (document.getElementById('searchInput')?.value || '').trim().toLowerCase(); let list = [...collections].sort((a, b) => (b.id || 0) - (a.id || 0)); if (s) list = list.filter(c => (getCustName(c.customer_id || c.customerId) || '').toLowerCase().includes(s)); if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">💵</div><p>No collections yet</p></div></td></tr>'; return; } tbody.innerHTML = list.map(c => { const saleRef = c.sale_id || c.saleId; const sale = saleRef ? sales.find(s => s.id == saleRef) : null; const invoiceHtml = sale ? saleLink(sale.id, sale.invoice_no || sale.invoiceNo || '#'+sale.id) : 'General'; return `<tr><td>#${c.id}</td><td style="font-family:monospace;">${esc(c.receipt_no||'-')}</td><td>${c.collection_date||c.date||'-'}</td><td class="cname">${customerLink(c.customer_id||c.customerId, getCustName(c.customer_id||c.customerId))}</td><td class="amount green">${fmtCurrency(parseFloat(c.amount||0))}</td><td><span class="badge badge-info">${esc(c.payment_method||'Cash')}</span></td><td>${invoiceHtml}</td><td>${esc(c.notes||'-')}</td><td><button class="btn btn-outline btn-xs" onclick="previewReceipt(${c.id})">🧾</button><button class="btn btn-danger btn-xs" onclick="deleteCollection(${c.id})">🗑️</button></td></tr>`; }).join(''); }
        function getCustName(cid) { const c = getCustomerById(cid); return c?.name || 'N/A'; }
        function getSelectedSaleId() { const raw = document.getElementById('c_saleId').value; return raw ? parseInt(raw, 10) : null; }
        async function saveCollectionRecord(data) { const r = await FrameworkDB.save('collections', data); return r?.id || r; }
        async function updateSalePaymentFromCollection(saleId, deltaAmount) {
            const sale = sales.find(s => s.id == saleId);
            if (!sale) return;
            const paid = Math.max(0, (getSalePaidAmount(sale) || 0) + (parseFloat(deltaAmount || 0) || 0));
            const total = getSaleTotalAmount(sale);
            const due = Math.max(0, total - paid);
            await FrameworkDB.update('sales', saleId, { ...sale, paid_amount: paid, due_amount: due, status: due === 0 ? 'Completed' : 'Partial', updatedAt: new Date().toISOString() });
        }

        document.getElementById('collectionForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const cidRaw = document.getElementById('c_customer').value;
            const cid = normalizeCustomerId(cidRaw);
            const customer = getCustomerById(cid);
            const amount = parseFloat(document.getElementById('c_amount').value);
            const selectedSaleId = getSelectedSaleId();
            const customerDue = customer ? getCustomerDue(customer.id) : 0;
            const selectedSale = selectedSaleId ? sales.find(s => s.id == selectedSaleId) : null;
            const selectedSaleDue = selectedSale ? getSaleDueAmount(selectedSale) : 0;

            if (!customer) { showToast('Select customer', 'error'); return; }
            if (!amount || amount <= 0) { showToast('Enter valid amount', 'error'); return; }
            if (amount > customerDue) { showToast(`Amount cannot exceed customer due (${fmtCurrency(customerDue)})`, 'error'); return; }
            if (selectedSaleId && amount > selectedSaleDue) { showToast(`Amount cannot exceed invoice due (${fmtCurrency(selectedSaleDue)})`, 'error'); return; }

            const originalCollection = editingId ? collections.find(c => c.id == editingId) : null;
            const originalSaleId = originalCollection ? parseInt(originalCollection.sale_id || originalCollection.saleId || 0, 10) || null : null;
            const originalAmount = parseFloat(originalCollection?.amount || 0) || 0;
            const receiptNo = editingId && originalCollection ? (originalCollection.receipt_no || generateReceiptNo()) : generateReceiptNo();
            const commonFields = {
                customer_id: customer.id,
                collection_date: document.getElementById('c_date').value,
                payment_method: document.getElementById('c_paymentMethod').value,
                notes: document.getElementById('c_notes').value.trim(),
                createdAt: new Date().toISOString(),
                receipt_no: receiptNo,
            };

            try {
                let firstSavedId = null;

                if (editingId) {
                    const data = { ...commonFields, amount, sale_id: selectedSaleId };
                    await FrameworkDB.update('collections', editingId, data);
                    firstSavedId = editingId;

                    const saleIdsToUpdate = [...new Set([originalSaleId, selectedSaleId].filter(Boolean))];
                    for (const saleId of saleIdsToUpdate) {
                        const sale = sales.find(s => s.id == saleId);
                        if (!sale) continue;
                        let paid = getSalePaidAmount(sale);
                        if (saleId === originalSaleId) paid -= originalAmount;
                        if (saleId === selectedSaleId) paid += amount;
                        paid = Math.max(0, paid);
                        const total = getSaleTotalAmount(sale);
                        const due = Math.max(0, total - paid);
                        await FrameworkDB.update('sales', saleId, { ...sale, paid_amount: paid, due_amount: due, status: due === 0 ? 'Completed' : 'Partial', updatedAt: new Date().toISOString() });
                    }
                    showToast('✅ Updated!');
                } else if (selectedSaleId) {
                    const data = { ...commonFields, amount, sale_id: selectedSaleId };
                    firstSavedId = await saveCollectionRecord(data);
                    await updateSalePaymentFromCollection(selectedSaleId, amount);
                    showToast('✅ Recorded!');
                } else {
                    let remaining = amount;
                    const dueSales = getOutstandingSalesForCustomer(customer.id);
                    const createdIds = [];

                    for (const sale of dueSales) {
                        if (remaining <= 0) break;
                        const saleDue = getSaleDueAmount(sale);
                        const alloc = Math.min(remaining, saleDue);
                        if (alloc <= 0) continue;
                        const id = await saveCollectionRecord({ ...commonFields, amount: alloc, sale_id: sale.id });
                        createdIds.push(id);
                        await updateSalePaymentFromCollection(sale.id, alloc);
                        if (!firstSavedId) firstSavedId = id;
                        remaining -= alloc;
                    }

                    if (remaining > 0) {
                        const id = await saveCollectionRecord({ ...commonFields, amount: remaining, sale_id: null });
                        createdIds.push(id);
                        if (!firstSavedId) firstSavedId = id;
                        remaining = 0;
                    }

                    if (!createdIds.length) {
                        const id = await saveCollectionRecord({ ...commonFields, amount, sale_id: null });
                        firstSavedId = id;
                    }
                    showToast('✅ Recorded!');
                }

                resetCollectionForm();
                document.getElementById('c_date').value = todayDate();
                await loadAllData();
                if (firstSavedId) previewReceipt(firstSavedId);
            } catch (err) { showToast('❌ ' + err.message, 'error'); }
        });

        async function deleteCollection(id) { if (!confirm('Delete this collection?')) return; try { const col = collections.find(c => c.id == id); if (col && (col.sale_id||col.saleId)) { const saleId = col.sale_id||col.saleId; const sale = sales.find(s => s.id == saleId); if (sale) { const paid = Math.max(0, getSalePaidAmount(sale) - (parseFloat(col.amount || 0) || 0)); const total = getSaleTotalAmount(sale); const due = Math.max(0, total - paid); await FrameworkDB.update('sales', saleId, { ...sale, paid_amount: paid, due_amount: due, status: due===0?'Completed':'Partial', updatedAt: new Date().toISOString() }); } } await FrameworkDB.delete('collections', id); showToast('🗑️ Deleted!'); await loadAllData(); } catch (err) { showToast('❌ ' + err.message, 'error'); } }

        function previewReceipt(id) { const col = collections.find(c => c.id == id); if (!col) return; currentReceipt = col; document.getElementById('receiptContent').innerHTML = buildReceiptHTML(col); document.getElementById('receiptModal').classList.add('show'); }

        function buildReceiptHTML(col) {
            const group = getReceiptGroup(col);
            const cust = getCustomerById(col.customer_id || col.customerId);
            const saleRef = col.sale_id || col.saleId;
            const sale = saleRef ? sales.find(s => s.id == saleRef) : null;
            const due = cust ? getCustomerDue(cust.id) : 0;
            const totalReceived = getReceiptGroupTotal(group);
            const allocationsHtml = group.length > 1 || group.some(item => item.sale_id || item.saleId)
                ? `
                    <table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:12px;">
                        <thead>
                            <tr>
                                <th style="padding:6px 8px;border:1px solid #ccc;background:#f5f5f5;text-align:left;">Invoice</th>
                                <th style="padding:6px 8px;border:1px solid #ccc;background:#f5f5f5;text-align:right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.map(item => {
                                const itemSale = (item.sale_id || item.saleId) ? sales.find(s => s.id == (item.sale_id || item.saleId)) : null;
                                const label = itemSale ? (itemSale.invoice_no || itemSale.invoiceNo || '#'+itemSale.id) : 'General';
                                return `<tr><td style="padding:6px 8px;border:1px solid #ccc;">${esc(label)}</td><td style="padding:6px 8px;border:1px solid #ccc;text-align:right;">${fmtCurrency(parseFloat(item.amount || 0))}</td></tr>`;
                            }).join('')}
                            <tr><td style="padding:8px 8px;border:1px solid #ccc;font-weight:700;background:#f5f5f5;">Total Received</td><td style="padding:8px 8px;border:1px solid #ccc;text-align:right;font-weight:800;color:#059669;">${fmtCurrency(totalReceived)}</td></tr>
                        </tbody>
                    </table>
                `
                : '';
            const shopName = SHOP_SETTINGS.name, shopAddress = SHOP_SETTINGS.address, shopPhone = SHOP_SETTINGS.phone;
            return `
            <div style="font-family:'Segoe UI',sans-serif;color:#000;background:#fff;padding:10px;">
                <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:12px;">
                    ${SHOP_LOGO?`<img src="${SHOP_LOGO}" alt="Logo" style="max-width:120px;max-height:40px;margin-bottom:6px;">`:''}
                    <h2 style="margin:0;font-size:18px;font-weight:800;">${esc(shopName)}</h2>
                    <p style="margin:2px 0;font-size:10px;">${esc(shopAddress)}</p>
                    <p style="margin:2px 0;font-size:10px;">📞 ${esc(shopPhone)}</p>
                    <h3 style="margin:8px 0 0;font-size:16px;font-weight:900;color:#059669;">COLLECTION RECEIPT</h3>
                    <p style="margin:2px 0;font-size:12px;font-weight:600;">Receipt No: ${esc(col.receipt_no || 'RCP-'+String(col.id).padStart(3,'0'))}</p>
                </div>
                <table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:12px;">
                    <tr><td style="padding:6px 8px;border:1px solid #ccc;font-weight:600;background:#f5f5f5;width:35%;">Date</td><td style="padding:6px 8px;border:1px solid #ccc;">${col.collection_date || col.date || '-'}</td></tr>
                    <tr><td style="padding:6px 8px;border:1px solid #ccc;font-weight:600;background:#f5f5f5;">Customer</td><td style="padding:6px 8px;border:1px solid #ccc;">${cust ? customerLink(cust.id, cust.name || 'N/A') : 'N/A'}</td></tr>
                    ${cust?.mobile ? `<tr><td style="padding:6px 8px;border:1px solid #ccc;font-weight:600;background:#f5f5f5;">Mobile</td><td style="padding:6px 8px;border:1px solid #ccc;">${esc(cust.mobile)}</td></tr>` : ''}
                    ${cust?.address ? `<tr><td style="padding:6px 8px;border:1px solid #ccc;font-weight:600;background:#f5f5f5;">Address</td><td style="padding:6px 8px;border:1px solid #ccc;">${esc(cust.address)}</td></tr>` : ''}
                    <tr><td style="padding:6px 8px;border:1px solid #ccc;font-weight:600;background:#f5f5f5;">Payment Method</td><td style="padding:6px 8px;border:1px solid #ccc;">${esc(col.payment_method || 'Cash')}</td></tr>
                    ${sale ? `<tr><td style="padding:6px 8px;border:1px solid #ccc;font-weight:600;background:#f5f5f5;">Invoice Ref</td><td style="padding:6px 8px;border:1px solid #ccc;">${saleLink(sale.id, sale.invoice_no || sale.invoiceNo || '#'+sale.id)}</td></tr>` : ''}
                    <tr><td style="padding:8px;border:1px solid #ccc;font-weight:700;background:#f5f5f5;font-size:14px;">Amount Received</td><td style="padding:8px;border:1px solid #ccc;font-size:18px;font-weight:800;color:#059669;">${fmtCurrency(totalReceived)}</td></tr>
                    <tr><td style="padding:6px 8px;border:1px solid #ccc;font-weight:600;background:#f5f5f5;">Remaining Due</td><td style="padding:6px 8px;border:1px solid #ccc;font-weight:700;color:#c00;">${fmtCurrency(due)}</td></tr>
                </table>
                ${allocationsHtml}
                ${col.notes ? `<p style="margin:6px 0;font-size:11px;"><strong>Notes:</strong> ${esc(col.notes)}</p>` : ''}
                <div style="text-align:center;margin-top:16px;padding-top:10px;border-top:1px solid #ccc;font-size:10px;color:#555;">
                    <p>Signature: ____________________</p>
                    <p>Thank you! | ${esc(shopName)} | 📞 ${esc(shopPhone)}</p>
                </div>
            </div>`;
        }

        function closeReceiptModal() { document.getElementById('receiptModal').classList.remove('show'); }
        function printReceipt() { if (!currentReceipt) return; printHTMLContent(buildReceiptHTML(currentReceipt)); }
        async function exportReceipt(format) { if (!currentReceipt) return; const tempDiv = document.createElement('div');
            tempDiv.innerHTML = buildReceiptHTML(currentReceipt);
            tempDiv.style.cssText = 'position:absolute;left:-9999px;top:0;width:210mm;'; document.body.appendChild(tempDiv); try { const canvas = await html2canvas(tempDiv, { scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false }); document.body.removeChild(tempDiv); if (format === 'jpg') { const link = document.createElement('a');
                    link.download = `receipt_${currentReceipt.receipt_no||currentReceipt.id}.jpg`;
                    link.href = canvas.toDataURL('image/jpeg', 0.95);
                    link.click();
                    showToast('✅ JPG exported!'); } } catch (err) { if (tempDiv.parentNode) document.body.removeChild(tempDiv);
                showToast('⚠️ Export failed.', 'error'); } }

        document.addEventListener('click', function(e) { if (!e.target.closest('.searchable-select')) document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show')); });
        document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); }));
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show')); });
        init();
