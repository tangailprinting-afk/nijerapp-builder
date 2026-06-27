
        let sales = [], collections = [], expenses = [], customers = [], suppliers = [], purchases = [], supplierPayments = [], staffs = [], staffSalaryEntries = [];
        let cashFlowSnapshot = null;

        async function init() { await loadAllData(); populateFilters(); populateAllQuickDates(); setDefaultDates(); const tab = new URLSearchParams(location.search).get('tab'); if (tab) switchTab(tab); }
        async function loadAllData() { try { const [sd, cd, ed, cud, spd, pud, sppd, std, ssd] = await Promise.all([FrameworkDB.get('sales'), FrameworkDB.get('collections'), FrameworkDB.get('expenses'), FrameworkDB.get('customers'), FrameworkDB.get('suppliers'), FrameworkDB.get('purchases'), FrameworkDB.get('supplier_payments'), FrameworkDB.get('staffs'), FrameworkDB.get('staff_salary_entries')]); sales = ensureArray(sd); collections = ensureArray(cd); expenses = ensureArray(ed); customers = ensureArray(cud); suppliers = ensureArray(spd); purchases = ensureArray(pud); supplierPayments = ensureArray(sppd); staffs = ensureArray(std); staffSalaryEntries = ensureArray(ssd); } catch (e) { console.error(e); } }

        function setDefaultDates() { const t = todayDate(), ms = monthStartDate(); ['sales','expense','cash','cf','profit'].forEach(p => { document.getElementById(p+'From').value = ms; document.getElementById(p+'To').value = t; }); }
        function setDateRangeIfPresent(fromId, toId, from, to) { const fromEl = document.getElementById(fromId); const toEl = document.getElementById(toId); if (fromEl) fromEl.value = from; if (toEl) toEl.value = to; }

        function populateFilters() { document.getElementById('salesCustomer').innerHTML = '<option value="all">All Customers</option>' + customers.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join(''); const ec = [...new Set(expenses.map(e => e.category).filter(Boolean))]; document.getElementById('expenseCategory').innerHTML = '<option value="all">All Categories</option>' + ec.map(c => `<option value="${c}">${c}</option>`).join(''); }

        function renderLinkedInvoiceText(text) {
            const raw = String(text || '');
            const match = raw.match(/(INV-[0-9A-Za-z-]+)/i);
            if (!match) return esc(raw);
            const invoiceNo = match[1];
            const sale = sales.find(s => (s.invoice_no || s.invoiceNo || '').toLowerCase() === invoiceNo.toLowerCase());
            if (!sale) return esc(raw);
            return esc(raw).replace(esc(invoiceNo), saleLink(sale.id, invoiceNo));
        }

        function fmtSignedCurrency(amount) {
            const n = parseFloat(amount || 0) || 0;
            const sign = n < 0 ? '-' : '';
            return sign + fmtCurrency(Math.abs(n));
        }

        function buildCashFlowSnapshot() {
            const from = document.getElementById('cfFrom').value || monthStartDate();
            const to = document.getElementById('cfTo').value || todayDate();
            const today = todayDate();

            const openingBalance = (
                sales.filter(s => (s.sale_date || s.date) < from).reduce((sum, s) => sum + (parseFloat(s.paid_amount || s.paid || 0) || 0), 0) +
                collections.filter(c => (c.collection_date || c.date) < from && !(c.sale_id || c.saleId)).reduce((sum, c) => sum + (parseFloat(c.amount || 0) || 0), 0) -
                expenses.filter(e => (e.expense_date || e.date) < from).reduce((sum, e) => sum + (parseFloat(e.amount || 0) || 0), 0) -
                supplierPayments.filter(sp => (sp.payment_date || sp.date) < from).reduce((sum, sp) => sum + (parseFloat(sp.amount || 0) || 0), 0)
            );

            const totalIn = (
                sales.filter(s => (s.sale_date || s.date) >= from && (s.sale_date || s.date) <= to).reduce((sum, s) => sum + (parseFloat(s.paid_amount || s.paid || 0) || 0), 0) +
                collections.filter(c => (c.collection_date || c.date) >= from && (c.collection_date || c.date) <= to && !(c.sale_id || c.saleId)).reduce((sum, c) => sum + (parseFloat(c.amount || 0) || 0), 0)
            );

            const totalOut = (
                expenses.filter(e => (e.expense_date || e.date) >= from && (e.expense_date || e.date) <= to).reduce((sum, e) => sum + (parseFloat(e.amount || 0) || 0), 0) +
                supplierPayments.filter(sp => (sp.payment_date || sp.date) >= from && (sp.payment_date || sp.date) <= to).reduce((sum, sp) => sum + (parseFloat(sp.amount || 0) || 0), 0) +
                staffSalaryEntries.filter(x => (x.salary_date || x.date || x.createdAt || '').slice(0, 10) >= from && (x.salary_date || x.date || x.createdAt || '').slice(0, 10) <= to && ((x.entry_type || x.type || x.paid_by || x.paidBy) !== 'Due')).reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0)
            );

            const closingBalance = openingBalance + totalIn - totalOut;
            const transactions = sales.filter(s => (s.sale_date || s.date) >= from && (s.sale_date || s.date) <= to && (parseFloat(s.paid_amount || s.paid || 0) > 0)).length
                + collections.filter(c => (c.collection_date || c.date) >= from && (c.collection_date || c.date) <= to && !(c.sale_id || c.saleId)).length
                + expenses.filter(e => (e.expense_date || e.date) >= from && (e.expense_date || e.date) <= to).length
                + supplierPayments.filter(sp => (sp.payment_date || sp.date) >= from && (sp.payment_date || sp.date) <= to).length
                + staffSalaryEntries.filter(x => (x.salary_date || x.date || x.createdAt || '').slice(0, 10) >= from && (x.salary_date || x.date || x.createdAt || '').slice(0, 10) <= to).length;

            const todaySales = sales.filter(s => (s.sale_date || s.date) === today).reduce((sum, s) => sum + (parseFloat(s.total_amount || s.grandTotal || 0) || 0), 0);
            const todayCollection = collections.filter(c => (c.collection_date || c.date) === today).reduce((sum, c) => sum + (parseFloat(c.amount || 0) || 0), 0);
            const todayExpense = expenses.filter(e => (e.expense_date || e.date) === today).reduce((sum, e) => sum + (parseFloat(e.amount || 0) || 0), 0);
            const todayDueReceivable = customers.reduce((sum, c) => sum + getCustomerFinancialSummary(c.id, sales, collections, customers).currentDue, 0);
            const todayPayableSupplier = suppliers.reduce((sum, s) => sum + getSupplierPayableAmount(s.id), 0);
            const todayPayableStaff = staffs.reduce((sum, st) => sum + getStaffPayableAmount(st.id), 0);

            return { from, to, today, openingBalance, totalIn, totalOut, closingBalance, transactions, todaySales, todayCollection, todayExpense, todayDueReceivable, todayPayableSupplier, todayPayableStaff };
        }

        function buildCashFlowStatementStyles() {
            return `<style>
                @page { size: A4 portrait; margin: 12mm; }
                * { box-sizing: border-box; }
                body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #fff; }
                .cf-sheet { width: 100%; max-width: 210mm; margin: 0 auto; }
                .cf-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
                .brand { display: flex; gap: 12px; align-items: center; }
                .brand img { width: 56px; height: 56px; object-fit: cover; border-radius: 12px; }
                .brand h1 { margin: 0; font-size: 22px; line-height: 1.1; }
                .brand p { margin: 3px 0 0; font-size: 10px; color: #475569; }
                .title { text-align: right; }
                .title .kicker { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
                .title h2 { margin: 4px 0 0; font-size: 24px; letter-spacing: .5px; }
                .period { margin-top: 6px; font-size: 11px; color: #334155; }
                .hero-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
                .hero-card { position: relative; overflow: hidden; border: 1px solid #dbe3ea; border-top-width: 5px; border-radius: 16px; padding: 14px 16px; background: linear-gradient(180deg, #fff 0%, #f8fafc 100%); }
                .hero-card.opening { border-top-color: #6366f1; }
                .hero-card.in { border-top-color: #10b981; }
                .hero-card.out { border-top-color: #ef4444; }
                .hero-card.closing { border-top-color: #8b5cf6; }
                .hero-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: .8px; color: #64748b; font-weight: 700; }
                .hero-card .value { margin-top: 6px; font-size: 26px; font-weight: 900; line-height: 1; }
                .hero-card .hint { margin-top: 4px; font-size: 10px; color: #94a3b8; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-top: 12px; }
                .stat { border: 1px solid #dbe3ea; border-radius: 12px; padding: 10px 12px; background: #fafbfc; }
                .stat .label { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; font-weight: 700; color: #64748b; }
                .stat .value { margin-top: 3px; font-size: 15px; font-weight: 800; color: #0f172a; }
                .summary-box { margin-top: 12px; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 10px 12px; background: #fafafa; font-size: 11px; color: #475569; }
                .summary-box strong { color: #0f172a; }
                .footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 9px; color: #64748b; }
            </style>`;
        }

        function buildCashFlowStatementHTML(snapshot) {
            const s = snapshot || buildCashFlowSnapshot();
            return `
                <div class="cf-sheet">
                    <div class="cf-header">
                        <div class="brand">
                            <img src="${SHOP_LOGO}" alt="Logo" onerror="this.style.display='none'">
                            <div>
                                <h1>${esc(SHOP_SETTINGS.name)}</h1>
                                <p>${esc(SHOP_SETTINGS.address)}</p>
                                <p>${esc(SHOP_SETTINGS.phone)}</p>
                            </div>
                        </div>
                        <div class="title">
                            <div class="kicker">Professional Cash Statement</div>
                            <h2>Cash Flow</h2>
                            <div class="period">${s.from} to ${s.to}</div>
                        </div>
                    </div>
                    <div class="hero-grid">
                        <div class="hero-card opening"><div class="label">Opening Balance</div><div class="value">${fmtCurrency(s.openingBalance)}</div><div class="hint">Balance brought forward</div></div>
                        <div class="hero-card in"><div class="label">Total In</div><div class="value">${fmtCurrency(s.totalIn)}</div><div class="hint">Money received</div></div>
                        <div class="hero-card out"><div class="label">Total Out</div><div class="value">${fmtCurrency(s.totalOut)}</div><div class="hint">Money spent</div></div>
                        <div class="hero-card closing"><div class="label">Closing Balance</div><div class="value">${fmtCurrency(s.closingBalance)}</div><div class="hint">Closing balance for period</div></div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat"><div class="label">Transactions</div><div class="value">${s.transactions}</div></div>
                        <div class="stat"><div class="label">Today's Sales</div><div class="value" style="color:#10b981;">${fmtCurrency(s.todaySales)}</div></div>
                        <div class="stat"><div class="label">Today's Collection</div><div class="value" style="color:#10b981;">${fmtCurrency(s.todayCollection)}</div></div>
                        <div class="stat"><div class="label">Today's Expense</div><div class="value" style="color:#f97316;">${fmtCurrency(s.todayExpense)}</div></div>
                        <div class="stat"><div class="label">Today Due</div><div class="value" style="color:#ef4444;">${fmtCurrency(s.todayDueReceivable)}</div></div>
                        <div class="stat"><div class="label">Supplier Payable</div><div class="value" style="color:#ef4444;">${fmtCurrency(s.todayPayableSupplier)}</div></div>
                        <div class="stat"><div class="label">Staff Payable</div><div class="value" style="color:#ef4444;">${fmtCurrency(s.todayPayableStaff)}</div></div>
                    </div>
                    <div class="summary-box">
                        <strong>Summary:</strong> Opening ${fmtCurrency(s.openingBalance)} + In ${fmtCurrency(s.totalIn)} - Out ${fmtCurrency(s.totalOut)} = Closing ${fmtCurrency(s.closingBalance)}.
                    </div>
                    <div class="footer">Generated: ${new Date().toLocaleString()} | ${esc(SHOP_SETTINGS.name)}</div>
                </div>`;
        }

        function buildCashFlowStatementDocument(snapshot) {
            return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cash Flow Statement</title>${buildCashFlowStatementStyles()}</head><body>${buildCashFlowStatementHTML(snapshot)}</body></html>`;
        }

        async function exportCashFlow(format) {
            const snapshot = cashFlowSnapshot || buildCashFlowSnapshot();
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;background:#fff;z-index:-1;';
            tempDiv.innerHTML = buildCashFlowStatementHTML(snapshot, false);
            document.body.appendChild(tempDiv);
            try {
                const canvas = await html2canvas(tempDiv, { scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false });
                const baseName = `cash_flow_${snapshot.from}_to_${snapshot.to}`.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
                if (format === 'jpg') {
                    const link = document.createElement('a');
                    link.download = `${baseName}.jpg`;
                    link.href = canvas.toDataURL('image/jpeg', 0.96);
                    link.click();
                } else if (format === 'pdf') {
                    const imgData = canvas.toDataURL('image/jpeg', 0.96);
                    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
                    const pageW = pdf.internal.pageSize.getWidth();
                    const pageH = pdf.internal.pageSize.getHeight();
                    const imgH = (canvas.height * pageW) / canvas.width;
                    const y = imgH > pageH ? 0 : (pageH - imgH) / 2;
                    pdf.addImage(imgData, 'JPEG', 0, y, pageW, Math.min(imgH, pageH));
                    pdf.save(`${baseName}.pdf`);
                }
            } finally {
                if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
            }
        }

        function printCashFlow() {
            const snapshot = cashFlowSnapshot || buildCashFlowSnapshot();
            const printableHtml = buildCashFlowStatementDocument(snapshot);
            if (typeof window.printHTMLContent === 'function') {
                Promise.resolve(window.printHTMLContent(printableHtml, { title: 'Cash Flow Statement', mode: 'thermal', requireNative: true }))
                    .catch(err => showToast('Print failed: ' + err.message, 'error'));
                return;
            }
            const nativePrinter = window.NijerAppPrinter || window.AndroidPrinter;
            if (nativePrinter && typeof nativePrinter.printDocument === 'function') {
                nativePrinter.printDocument(JSON.stringify({ title: 'Cash Flow Statement', html: printableHtml, text: '', url: window.location.href, requireNative: true }));
                return;
            }
            showToast('Native printer bridge not available.', 'error');
        }

        function getSupplierPayableAmount(supplierId) {
            const supplier = suppliers.find(s => s.id == supplierId);
            if (!supplier) return 0;
            const opening = parseFloat(supplier.opening_balance || 0) || 0;
            const totalPurchases = purchases.filter(p => (p.supplier_id || p.supplierId) == supplierId).reduce((sum, p) => sum + (parseFloat(p.total_amount || p.grandTotal || 0) || 0), 0);
            const totalPaid = supplierPayments.filter(sp => (sp.supplier_id || sp.supplierId) == supplierId).reduce((sum, sp) => sum + (parseFloat(sp.amount || 0) || 0), 0);
            return Math.max(0, opening + totalPurchases - totalPaid);
        }

        function getStaffPayableAmount(staffId) {
            const staff = staffs.find(s => s.id == staffId);
            if (!staff) return 0;
            const opening = parseFloat(staff.opening_balance || staff.opening || 0) || 0;
            const dueTotal = staffSalaryEntries.filter(x => (x.staff_id || x.staffId) == staffId && ((x.entry_type || x.type || x.paid_by || x.paidBy) === 'Due')).reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);
            const paidTotal = staffSalaryEntries.filter(x => (x.staff_id || x.staffId) == staffId && ((x.entry_type || x.type || x.paid_by || x.paidBy) !== 'Due')).reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);
            return Math.max(0, opening + dueTotal - paidTotal);
        }

        function getQuickDates() {
            const today = todayDate();
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const weekStart = new Date(Date.now() - new Date().getDay() * 86400000).toISOString().split('T')[0];
            const monthStart = monthStartDate();
            const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
            const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];
            return [
                { label: 'Today', from: today, to: today }, { label: 'Yesterday', from: yesterday, to: yesterday },
                { label: 'This Week', from: weekStart, to: today }, { label: 'This Month', from: monthStart, to: today },
                { label: 'Last Month', from: lastMonthStart, to: lastMonthEnd }, { label: 'All Time', from: '2000-01-01', to: today }
            ];
        }

        function populateAllQuickDates() {
            const tabs = ['sales','due','expense','supplier','cashbook','cashflow','profit'];
            const quickDates = getQuickDates();
            tabs.forEach(tab => {
                const container = document.getElementById(tab + 'QuickDates');
                if (!container) return;
                container.innerHTML = quickDates.map((qd, i) => `<button class="quick-date-btn${i===3?' active':''}" onclick="setQuickDate('${tab}', '${qd.from}', '${qd.to}', this)">${qd.label}</button>`).join('');
            });
        }

        function setQuickDate(tab, from, to, btn) {
            const fromId = tab === 'cashbook' ? 'cashFrom' : tab === 'cashflow' ? 'cfFrom' : tab + 'From';
            const toId = tab === 'cashbook' ? 'cashTo' : tab === 'cashflow' ? 'cfTo' : tab + 'To';
            setDateRangeIfPresent(fromId, toId, from, to);

            if (tab === 'due') {
                const dueFilter = document.getElementById('dueFilter');
                if (dueFilter) dueFilter.value = 'all';
            }

            if (tab === 'supplier') {
                document.getElementById('supplierFrom').value = from;
                document.getElementById('supplierTo').value = to;
            }

            btn.parentElement.querySelectorAll('.quick-date-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const loadFn = { sales: loadSalesReport, due: loadDueReport, expense: loadExpenseReport, supplier: loadSupplierReport, cashbook: loadCashBook, cashflow: loadCashFlow, profit: loadProfitReport };
            if (loadFn[tab]) loadFn[tab]();
        }

        function getCustName(cid) { const c = customers.find(x => x.id == cid); return c?.name || 'Walk-in'; }
        function getSuppName(sid) { const s = suppliers.find(x => x.id == sid); return s?.name || 'N/A'; }

        // ============================================
        // UNIVERSAL PRINT FUNCTION (Single Page, No Blanks)
        // ============================================
        function printReport(tab) {
            if (tab === 'cashflow') {
                printCashFlow();
                return;
            }
            const titles = { sales: 'Sales Report', due: 'Due Report', expense: 'Expense Report', supplier: 'Supplier Report', cashbook: 'Cash Book', cashflow: 'Cash Flow Statement', profit: 'Profit Report' };
            const tableIds = { sales: 'salesReportTable', due: 'dueReportTable', expense: 'expenseReportTable', supplier: 'supplierReportTable', cashbook: 'cashbookTable', cashflow: 'cashflowTable', profit: null };
            const totalIds = { sales: 'salesTotal', expense: 'expenseTotal' };
            const fromId = tab === 'cashbook' ? 'cashFrom' : tab === 'cashflow' ? 'cfFrom' : tab + 'From';
            const toId = tab === 'cashbook' ? 'cashTo' : tab === 'cashflow' ? 'cfTo' : tab + 'To';
            const from = document.getElementById(fromId)?.value || '';
            const to = document.getElementById(toId)?.value || '';
            const total = totalIds[tab] ? document.getElementById(totalIds[tab])?.textContent || '' : '';

            let bodyHTML = '';
            if (tab === 'profit') {
                bodyHTML = `<div class="grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="card" style="border:1px solid #ccc;padding:14px;text-align:center;"><div style="font-size:11px;color:#555;">Revenue</div><div style="font-size:22px;font-weight:800;color:#10b981;">${document.getElementById('profRevenue')?.textContent||'৳ 0'}</div></div>
                    <div class="card" style="border:1px solid #ccc;padding:14px;text-align:center;"><div style="font-size:11px;color:#555;">Expenses</div><div style="font-size:22px;font-weight:800;color:#f97316;">${document.getElementById('profExpense')?.textContent||'৳ 0'}</div></div>
                    <div class="card" style="border:1px solid #ccc;padding:14px;text-align:center;"><div style="font-size:11px;color:#555;">Supplier Payments</div><div style="font-size:22px;font-weight:800;color:#ef4444;">${document.getElementById('profSuppPay')?.textContent||'৳ 0'}</div></div>
                    <div class="card total" style="background:#6366f1;color:white;padding:14px;text-align:center;"><div style="font-size:11px;color:rgba(255,255,255,0.8);">Net Profit</div><div style="font-size:22px;font-weight:800;">${document.getElementById('profNet')?.textContent||'৳ 0'}</div></div>
                </div>`;
            } else if (tab === 'cashbook') {
                const summaryHTML = document.getElementById(tab === 'cashbook' ? 'cashSummary' : 'cfSummary')?.innerHTML || '';
                bodyHTML = (summaryHTML ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px;">${summaryHTML.replace(/cash-summary-item/g,'').replace(/cs-label/g,'').replace(/cs-value/g,'').replace(/<div class=""/g,'<div style="border:1px solid #ccc;padding:10px;text-align:center;border-radius:6px;"')}</div>` : '') + `<table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>In</th><th>Out</th><th>Balance</th></tr></thead><tbody>${document.getElementById(tableIds[tab])?.innerHTML||''}</tbody></table>`;
            } else if (tab === 'cashflow') {
                const summaryHTML = document.getElementById('cfSummary')?.innerHTML || '';
                bodyHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px;">${summaryHTML.replace(/cash-summary-item/g,'').replace(/cs-label/g,'').replace(/cs-value/g,'').replace(/<div class=""/g,'<div style="border:1px solid #ccc;padding:10px;text-align:center;border-radius:6px;"')}</div><div style="margin-top:10px;padding:10px;border:1px dashed #ccc;border-radius:6px;color:#555;font-size:11px;text-align:center;">Detailed transactions are available in Cash Book.</div>`;
            } else {
                const cols = { sales: 8, due: 6, expense: 5, supplier: 6 };
                const headers = { sales: ['Invoice','Date','Customer','Items','Total','Paid','Due','Status'], due: ['Customer','Mobile','Total Due','Due Date','Overdue Days','Status'], expense: ['Date','Category','Amount','Paid By','Notes'], supplier: ['Supplier','Company','Mobile','Total Purchases','Total Paid','Payable'] };
                bodyHTML = `<table><thead><tr>${headers[tab].map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${document.getElementById(tableIds[tab])?.innerHTML||''}</tbody></table>`;
            }

            const printHTML = `<!DOCTYPE html><html><head><title>${titles[tab]}</title><style>
                @page { margin: 12mm; size: A4 portrait; }
                * { box-sizing: border-box; }
                body { font-family: 'Segoe UI', sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
                .print-header { text-align: center; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 6px; }
                .print-header h2 { margin: 0; font-size: 16px; } .print-header p { margin: 2px 0; font-size: 9px; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                th, td { border: 1px solid #999; padding: 4px 6px; font-size: 10px; text-align: left; }
                th { background: #eee; font-weight: 700; }
                .text-right { text-align: right; } .text-center { text-align: center; }
                .total-row { font-weight: 700; }
                .badge { padding: 2px 6px; border-radius: 10px; font-size: 9px; display: inline-block; }
                .badge-in { background: #d4edda; color: #155724; } .badge-out { background: #f8d7da; color: #721c24; }
                .print-footer { text-align: center; margin-top: 10px; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 6px; }
                .cashflow-summary-shell { display: grid; gap: 10px; }
                .cashflow-highlight-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
                .cashflow-highlight-card { border: 1px solid #cbd5e1; border-top-width: 4px; border-radius: 12px; padding: 12px 14px; background: #fff; }
                .cashflow-highlight-card.opening { border-top-color: #6366f1; }
                .cashflow-highlight-card.in { border-top-color: #10b981; }
                .cashflow-highlight-card.out { border-top-color: #ef4444; }
                .cashflow-highlight-card.closing { border-top-color: #8b5cf6; }
                .cashflow-highlight-card .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; }
                .cashflow-highlight-card .value { font-size: 20px; font-weight: 900; margin-top: 4px; }
                .cashflow-highlight-card .hint { font-size: 9px; color: #94a3b8; margin-top: 4px; }
                .cashflow-secondary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
                .cashflow-secondary-card { border: 1px solid #dbe3ea; border-radius: 10px; padding: 10px 12px; background: #fafbfc; }
                .cashflow-secondary-card .label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                .cashflow-secondary-card .value { font-size: 14px; font-weight: 800; margin-top: 3px; }
                @media print { html, body { height: auto; overflow: visible; } }
            </style></head><body>
            <div class="print-header"><h2>${esc(SHOP_SETTINGS.name)}</h2><p>${esc(SHOP_SETTINGS.address)} | 📞 ${esc(SHOP_SETTINGS.phone)}</p><h3>${titles[tab]}</h3><p>${from} to ${to} ${total ? '| ' + total : ''}</p></div>
            ${bodyHTML}
            <div class="print-footer">Generated: ${new Date().toLocaleString()} | ${esc(SHOP_SETTINGS.name)}</div>
            </body></html>`;

            if (typeof window.printHTMLContent === 'function') {
                Promise.resolve(window.printHTMLContent(printHTML, { title: titles[tab], mode: 'thermal', requireNative: true }))
                    .catch(err => showToast('Print failed: ' + err.message, 'error'));
                return;
            }
            const nativePrinter = window.NijerAppPrinter || window.AndroidPrinter;
            if (nativePrinter && typeof nativePrinter.printDocument === 'function') {
                nativePrinter.printDocument(JSON.stringify({ title: titles[tab], html: printHTML, text: '', url: window.location.href, requireNative: true }));
                return;
            }
            showToast('Native printer bridge not available.', 'error');
        }

        // SALES REPORT
        function loadSalesReport() { const from = document.getElementById('salesFrom').value, to = document.getElementById('salesTo').value, cid = document.getElementById('salesCustomer').value; let list = sales.filter(s => (s.sale_date || s.date) >= from && (s.sale_date || s.date) <= to); if (cid !== 'all') list = list.filter(s => (s.customer_id || s.customerId) == cid); list.sort((a, b) => (b.id || 0) - (a.id || 0)); const total = list.reduce((s, sl) => s + (parseFloat(sl.total_amount || sl.grandTotal || 0)), 0); const tbody = document.getElementById('salesReportTable'); if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>No sales found</p></div></td></tr>'; document.getElementById('salesTotal').textContent = ''; return; } tbody.innerHTML = list.map(s => { const due = getSaleDueAmount(s); const paid = getSalePaidAmount(s); const dd = s.due_date || s.dueDate || ''; const t = todayDate(); let st = 'Paid', bdg = 'badge-success'; if (due > 0 && dd && dd < t) { st = 'Overdue'; bdg = 'badge-danger'; } else if (due > 0 && dd === t) { st = 'Due Today'; bdg = 'badge-warning'; } else if (due > 0) { st = 'Pending'; bdg = 'badge-info'; } let ic = 0; try { ic = JSON.parse(s.items || '[]').length; } catch (e) {} return `<tr><td style="font-family:monospace;">${saleLink(s.id, s.invoice_no || s.invoiceNo || '#')}</td><td>${s.sale_date || s.date}</td><td>${customerLink(s.customer_id || s.customerId, getCustName(s.customer_id || s.customerId))}</td><td>${ic}</td><td>${fmtCurrency(parseFloat(s.total_amount || s.grandTotal || 0))}</td><td class="amount green">${fmtCurrency(paid)}</td><td class="amount red">${due > 0 ? dueAmountLink(getCollectionEntryUrl({ customerId: s.customer_id || s.customerId, saleId: s.id, amount: due }), fmtCurrency(due)) : '৳ 0'}</td><td><span class="badge ${bdg}">${st}</span></td></tr>`; }).join(''); document.getElementById('salesTotal').textContent = 'Total: ' + fmtCurrency(total); }

        // DUE REPORT
        function loadDueReport() {
            const filter = document.getElementById('dueFilter').value;
            const from = document.getElementById('dueFrom').value || '';
            const to = document.getElementById('dueTo').value || '';
            const today = todayDate();
            const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            const dueData = customers.map(c => {
                const summary = getCustomerFinancialSummary(c.id, sales, collections, customers);
                const relevantSales = sales.filter(s => (s.customer_id || s.customerId) == c.id && getSaleDueAmount(s) > 0);
                const dueDates = relevantSales.map(s => s.due_date || s.dueDate || s.sale_date || s.date || '').filter(Boolean).sort();
                const nextDue = dueDates.length > 0 ? dueDates[0] : null;
                const totalDue = summary.currentDue;
                let overdueDays = 0;
                if (nextDue && nextDue < today) overdueDays = Math.floor((new Date(today) - new Date(nextDue)) / 86400000);
                return { customer: c, due: totalDue, nextDue, overdueDays };
            }).filter(d => d.due > 0);

            let list = dueData;
            if (from && to) {
                list = dueData.filter(d => d.nextDue && d.nextDue >= from && d.nextDue <= to);
            } else if (filter === 'overdue') {
                list = dueData.filter(d => d.nextDue && d.nextDue < today);
            } else if (filter === 'today') {
                list = dueData.filter(d => d.nextDue === today);
            } else if (filter === 'week') {
                list = dueData.filter(d => d.nextDue && d.nextDue >= today && d.nextDue <= weekEnd);
            }
            list.sort((a, b) => b.due - a.due);
            const tbody = document.getElementById('dueReportTable');
            if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>No due found</p></div></td></tr>'; return; }
            tbody.innerHTML = list.map(d => { let st = 'Upcoming', bdg = 'badge-info'; if (d.nextDue === today) { st = 'Due Today'; bdg = 'badge-warning'; } else if (d.nextDue && d.nextDue < today) { st = 'Overdue'; bdg = 'badge-danger'; } return `<tr><td class="cname">${customerLink(d.customer.id, d.customer.name || 'N/A')}</td><td>${esc(d.customer.mobile || '-')}</td><td class="amount red">${dueAmountLink(getCollectionEntryUrl({ customerId: d.customer.id, amount: d.due }), fmtCurrency(d.due))}</td><td>${d.nextDue || '-'}</td><td>${d.overdueDays > 0 ? d.overdueDays + ' Days' : '-'}</td><td><span class="badge ${bdg}">${st}</span></td></tr>`; }).join(''); }

        // EXPENSE REPORT
        function loadExpenseReport() { const from = document.getElementById('expenseFrom').value, to = document.getElementById('expenseTo').value, cat = document.getElementById('expenseCategory').value; let list = expenses.filter(e => (e.expense_date || e.date) >= from && (e.expense_date || e.date) <= to); if (cat !== 'all') list = list.filter(e => e.category === cat); list.sort((a, b) => (b.id || 0) - (a.id || 0)); const total = list.reduce((s, e) => s + (parseFloat(e.amount || 0)), 0); const tbody = document.getElementById('expenseReportTable'); if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>No expenses found</p></div></td></tr>'; document.getElementById('expenseTotal').textContent = ''; return; } tbody.innerHTML = list.map(e => `<tr><td>${e.expense_date || e.date}</td><td><span class="badge badge-info">${esc(e.category || 'Other')}</span></td><td class="amount orange">${fmtCurrency(parseFloat(e.amount || 0))}</td><td>${esc(e.paid_by || e.paidBy || 'Cash')}</td><td>${esc(e.notes || '-')}</td></tr>`).join(''); document.getElementById('expenseTotal').textContent = 'Total: ' + fmtCurrency(total); }

        // SUPPLIER REPORT
        function loadSupplierReport() {
            const tbody = document.getElementById('supplierReportTable');
            const from = document.getElementById('supplierFrom').value || '2000-01-01';
            const to = document.getElementById('supplierTo').value || todayDate();
            const data = suppliers.map(s => {
                const purchasesTotal = purchases.filter(p => (p.supplier_id || p.supplierId) == s.id && (p.purchase_date || p.date || '') >= from && (p.purchase_date || p.date || '') <= to).reduce((sum, p) => sum + (parseFloat(p.total_amount || p.grandTotal || 0)), 0);
                const totalPaid = supplierPayments.filter(sp => (sp.supplier_id || sp.supplierId) == s.id && (sp.payment_date || sp.date || '') >= from && (sp.payment_date || sp.date || '') <= to).reduce((sum, sp) => sum + (parseFloat(sp.amount || 0)), 0);
                const opening = parseFloat(s.opening_balance || 0);
                const payable = Math.max(0, opening + purchasesTotal - totalPaid);
                return { ...s, totalPurchases: purchasesTotal, totalPaid, payable };
            }).filter(s => s.totalPurchases > 0 || s.totalPaid > 0 || s.payable > 0);
            if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>No suppliers</p></div></td></tr>'; return; }
            tbody.innerHTML = data.map(s => `<tr><td class="cname">${esc(s.name)}</td><td>${esc(s.company || '-')}</td><td>${esc(s.mobile || '-')}</td><td class="amount orange">${fmtCurrency(s.totalPurchases)}</td><td class="amount green">${fmtCurrency(s.totalPaid)}</td><td class="amount red">${fmtCurrency(s.payable)}</td></tr>`).join('');
        }

        // CASH BOOK
        function loadCashBook() { loadCashData('cashFrom', 'cashTo', 'cashSummary', 'cashbookTable'); }

        // CASH FLOW STATEMENT (with Opening Balance)
        function loadCashFlow() {
            cashFlowSnapshot = buildCashFlowSnapshot();
            document.getElementById('cfSummary').innerHTML = buildCashFlowStatementHTML(cashFlowSnapshot);
        }

        function loadCashData(fromId, toId, summaryId, tableId) {
            const from = document.getElementById(fromId).value, to = document.getElementById(toId).value;
            let entries = [];
            sales.filter(s => (s.sale_date || s.date) >= from && (s.sale_date || s.date) <= to).forEach(s => { const paid = parseFloat(s.paid_amount || s.paid || 0); if (paid > 0) entries.push({ date: s.sale_date || s.date, description: `Sale receipt - ${s.invoice_no || s.invoiceNo || '#'+s.id}`, type: 'in', amount: paid }); });
            collections.filter(c => (c.collection_date || c.date) >= from && (c.collection_date || c.date) <= to && !(c.sale_id || c.saleId)).forEach(c => { entries.push({ date: c.collection_date || c.date, description: `Collection from ${getCustName(c.customer_id || c.customerId)}`, type: 'in', amount: parseFloat(c.amount || 0) }); });
            expenses.filter(e => (e.expense_date || e.date) >= from && (e.expense_date || e.date) <= to).forEach(e => { entries.push({ date: e.expense_date || e.date, description: `${e.category || 'Expense'} - ${e.notes || ''}`, type: 'out', amount: parseFloat(e.amount || 0) }); });
            supplierPayments.filter(sp => (sp.payment_date || sp.date) >= from && (sp.payment_date || sp.date) <= to).forEach(sp => { entries.push({ date: sp.payment_date || sp.date, description: `Payment to ${getSuppName(sp.supplier_id || sp.supplierId)}`, type: 'out', amount: parseFloat(sp.amount || 0) }); });
            entries.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'in' ? -1 : 1));
            const totalIn = entries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
            const totalOut = entries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
            const netCash = totalIn - totalOut;
            document.getElementById(summaryId).innerHTML = `<div class="cash-summary-item"><div class="cs-label">Total In</div><div class="cs-value" style="color:#10b981;">${fmtCurrency(totalIn)}</div></div><div class="cash-summary-item"><div class="cs-label">Total Out</div><div class="cs-value" style="color:#ef4444;">${fmtCurrency(totalOut)}</div></div><div class="cash-summary-item"><div class="cs-label">Net Cash</div><div class="cs-value" style="color:${netCash>=0?'#6366f1':'#ef4444'};">${fmtCurrency(netCash)}</div></div><div class="cash-summary-item"><div class="cs-label">Transactions</div><div class="cs-value">${entries.length}</div></div>`;
            const tbody = document.getElementById(tableId);
            if (entries.length === 0) { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>No transactions found</p></div></td></tr>'; return; }
            let balance = 0;
            tbody.innerHTML = entries.map(e => { if (e.type === 'in') balance += e.amount; else balance -= e.amount; return `<tr><td>${e.date}</td><td>${renderLinkedInvoiceText(e.description)}</td><td><span class="badge ${e.type==='in'?'badge-in':'badge-out'}">${e.type==='in'?'IN':'OUT'}</span></td><td class="amount green">${e.type==='in'?fmtCurrency(e.amount):'-'}</td><td class="amount red">${e.type==='out'?fmtCurrency(e.amount):'-'}</td><td><strong>${fmtCurrency(balance)}</strong></td></tr>`; }).join('');
        }

        // PROFIT REPORT
        function loadProfitReport() { const from = document.getElementById('profitFrom').value, to = document.getElementById('profitTo').value; const revenue = sales.filter(s => (s.sale_date || s.date) >= from && (s.sale_date || s.date) <= to).reduce((sum, s) => sum + (parseFloat(s.paid_amount || s.paid || 0)), 0) + collections.filter(c => (c.collection_date || c.date) >= from && (c.collection_date || c.date) <= to && !(c.sale_id || c.saleId)).reduce((sum, c) => sum + (parseFloat(c.amount || 0)), 0); const totalExp = expenses.filter(e => (e.expense_date || e.date) >= from && (e.expense_date || e.date) <= to).reduce((s, e) => s + (parseFloat(e.amount || 0)), 0); const suppPay = supplierPayments.filter(sp => (sp.payment_date || sp.date) >= from && (sp.payment_date || sp.date) <= to).reduce((s, sp) => s + (parseFloat(sp.amount || 0)), 0); const net = revenue - totalExp - suppPay; document.getElementById('profRevenue').textContent = fmtCurrency(revenue); document.getElementById('profExpense').textContent = fmtCurrency(totalExp); document.getElementById('profSuppPay').textContent = fmtCurrency(suppPay); document.getElementById('profNet').textContent = fmtCurrency(net); }

        function switchTab(tab) {
            document.querySelectorAll('.tab-btn,.tab-content').forEach(e => e.classList.remove('active'));
            const panel = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
            if (panel) panel.classList.add('active');
            const labelMap = { sales: 'sales', due: 'due', expense: 'expense', supplier: 'supplier', cashbook: 'cash book', cashflow: 'cash flow', profit: 'profit' };
            const btn = [...document.querySelectorAll('.tab-btn')].find(b => b.textContent.toLowerCase().includes(labelMap[tab] || tab));
            if (btn) btn.classList.add('active');
            if (tab === 'cashbook') loadCashBook();
            if (tab === 'cashflow') loadCashFlow();
            if (history.replaceState) history.replaceState(null, '', `?tab=${encodeURIComponent(tab)}`);
        }

        document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); }));
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show')); });
        init();
    
