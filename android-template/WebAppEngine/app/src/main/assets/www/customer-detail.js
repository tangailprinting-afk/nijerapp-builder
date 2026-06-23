let customers = [], sales = [], collections = [], pointTransactions = [], currentCustomer = null;
        const params = new URLSearchParams(location.search);
        const customerId = params.get('customer_id') || params.get('id') || '';

        function findCustomerByParam(rawId) {
            const value = String(rawId || '').trim();
            if (!value) return null;

            const directMatch = customers.find(c => String(c.id) === value);
            if (directMatch) return directMatch;

            const numericValue = Number(value);
            if (Number.isFinite(numericValue)) {
                const numericMatch = customers.find(c => Number(c.id) === numericValue);
                if (numericMatch) return numericMatch;

                const stringNumberMatch = customers.find(c => String(c.id) === String(numericValue));
                if (stringNumberMatch) return stringNumberMatch;

                const positionMatch = customers[numericValue - 1];
                if (positionMatch && (String(positionMatch.id) === value || String(positionMatch.id) === String(numericValue))) {
                    return positionMatch;
                }
            }

            return customers.find(c =>
                String(c.id).toLowerCase() === value.toLowerCase() ||
                String(c.name || '').toLowerCase() === value.toLowerCase()
            ) || null;
        }

        async function init() { await loadData(); }
        async function loadData() {
            try {
                const [cd, sd, cld, ptd] = await Promise.all([FrameworkDB.get('customers'), FrameworkDB.get('sales'), FrameworkDB.get('collections'), FrameworkDB.get('customer_point_transactions')]);
                customers = ensureArray(cd); sales = ensureArray(sd); collections = ensureArray(cld); pointTransactions = ensureArray(ptd);
                render();
            } catch (e) { console.error(e); document.getElementById('customerName').textContent = 'Failed to load'; }
        }

        function getCustomerRewardPointsEarned(cid) {
            return sales.filter(s => (s.customer_id || s.customerId) == cid).reduce((sum, sale) => sum + (getSalePaidAmount(sale) * 0.02), 0);
        }

        function getCustomerPointTransactions(cid) {
            return pointTransactions.filter(tx => (tx.customer_id || tx.customerId) == cid).sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')));
        }

        function getCustomerAvailablePoints(cid) {
            const earned = getCustomerRewardPointsEarned(cid);
            const manual = getCustomerPointTransactions(cid).reduce((sum, tx) => sum + (parseFloat(tx.points_change ?? tx.points ?? 0) || 0), 0);
            return Math.max(0, earned + manual);
        }

        function getPointActionLabel(action) {
            const map = { earn: 'Earned', redeem: 'Gift / Redeem', deduct: 'Deduct', bonus: 'Bonus' };
            return map[action] || (action ? String(action) : 'Point');
        }

        function getPointsHistoryRows(cid) {
            const earnedRows = sales.filter(s => (s.customer_id || s.customerId) == cid).map(s => {
                const paid = getSalePaidAmount(s);
                const pts = paid * 0.02;
                if (pts <= 0) return null;
                return {
                    date: s.sale_date || s.date || '-',
                    type: 'earn',
                    reference: saleLink(s.id, s.invoice_no || s.invoiceNo || '#'+s.id),
                    points: pts,
                    notes: `Earned from ${fmtCurrency(paid)} paid`,
                };
            }).filter(Boolean);
            const manualRows = getCustomerPointTransactions(cid).map(tx => ({
                date: tx.createdAt || tx.date || '-',
                type: tx.point_action || tx.action || 'adjust',
                reference: tx.reference || '-',
                points: parseFloat(tx.points_change ?? tx.points ?? 0) || 0,
                notes: tx.notes || '',
            }));
            return [...earnedRows, ...manualRows].sort((a, b) => String(b.date).localeCompare(String(a.date)));
        }

        function render() {
            currentCustomer = findCustomerByParam(customerId);
            if (!currentCustomer) {
                document.getElementById('customerName').textContent = 'Customer not found';
                document.getElementById('customerMeta').textContent = 'The requested customer record could not be located.';
                document.getElementById('salesTable').innerHTML = '<tr><td colspan="6"><div class="empty-state">No customer data</div></td></tr>';
                document.getElementById('collectionTable').innerHTML = '<tr><td colspan="6"><div class="empty-state">No customer data</div></td></tr>';
                return;
            }
            const fs = getCustomerFinancialSummary(currentCustomer.id, sales, collections, customers);
            const rewardPoints = getCustomerRewardPointsEarned(currentCustomer.id);
            const availablePoints = getCustomerAvailablePoints(currentCustomer.id);
            document.title = `${currentCustomer.name || 'Customer'} | Rizq Restaurant`;
            document.getElementById('customerName').innerHTML = customerLink(currentCustomer.id, currentCustomer.name || 'N/A');
            document.getElementById('customerMeta').innerHTML = `${esc(currentCustomer.mobile || 'N/A')}<br>${esc(currentCustomer.address || 'No address')}`;
            document.getElementById('customerPointsBadge').textContent = `Reward points: ${availablePoints.toFixed(2)} available | Earned: ${rewardPoints.toFixed(2)} (2 points per 100 taka paid)`;
            document.getElementById('customerDue').innerHTML = dueAmountLink(getCollectionEntryUrl({ customerId: currentCustomer.id, amount: fs.currentDue }), fmtCurrency(fs.currentDue));
            document.getElementById('openingBalance').textContent = fmtCurrency(fs.openingBalance);
            document.getElementById('totalSales').textContent = fmtCurrency(fs.salesTotal);
            document.getElementById('totalPaid').textContent = fmtCurrency(fs.totalPaid);
            document.getElementById('totalCollections').textContent = fmtCurrency(fs.generalCollections);
            document.getElementById('rewardPoints').textContent = availablePoints.toFixed(2);

            const customerSales = sales.filter(s => (s.customer_id || s.customerId) == currentCustomer.id).sort((a,b)=>(b.id||0)-(a.id||0));
            document.getElementById('salesTable').innerHTML = customerSales.length ? customerSales.map(s => {
                const paid = getSalePaidAmount(s);
                const due = getSaleDueAmount(s);
                const t = todayDate();
                const dd = s.due_date || s.dueDate || '';
                let st = 'Paid', bdg = 'badge-success';
                if (due > 0 && dd && dd < t) { st = 'Overdue'; bdg = 'badge-danger'; }
                else if (due > 0 && dd === t) { st = 'Due Today'; bdg = 'badge-warning'; }
                else if (due > 0) { st = 'Pending'; bdg = 'badge-info'; }
                return `<tr><td>${saleLink(s.id, s.invoice_no || s.invoiceNo || '#')}</td><td>${s.sale_date || s.date || '-'}</td><td class="amount">${fmtCurrency(getSaleTotalAmount(s))}</td><td class="amount green">${fmtCurrency(paid)}</td><td class="amount red">${due > 0 ? dueAmountLink(getCollectionEntryUrl({ customerId: currentCustomer.id, saleId: s.id, amount: due }), fmtCurrency(due)) : '৳ 0'}</td><td><span class="badge ${bdg}">${st}</span></td></tr>`;
            }).join('') : '<tr><td colspan="6"><div class="empty-state">No sales found</div></td></tr>';

            const customerCollections = collections.filter(c => (c.customer_id || c.customerId) == currentCustomer.id).sort((a,b)=>(b.id||0)-(a.id||0));
            document.getElementById('collectionTable').innerHTML = customerCollections.length ? customerCollections.map(c => {
                const saleRef = c.sale_id || c.saleId;
                const sale = saleRef ? sales.find(s => s.id == saleRef) : null;
                return `<tr><td style="font-family:monospace;">${esc(c.receipt_no || '-' )}</td><td>${c.collection_date || c.date || '-'}</td><td class="amount green">${fmtCurrency(parseFloat(c.amount || 0))}</td><td>${esc(c.payment_method || 'Cash')}</td><td>${sale ? saleLink(sale.id, sale.invoice_no || sale.invoiceNo || '#'+sale.id) : 'General'}</td><td>${esc(c.notes || '-')}</td></tr>`;
            }).join('') : '<tr><td colspan="6"><div class="empty-state">No collections found</div></td></tr>';

            const pointsRows = getPointsHistoryRows(currentCustomer.id);
            document.getElementById('pointsTable').innerHTML = pointsRows.length ? pointsRows.map(row => {
                const pts = parseFloat(row.points || 0) || 0;
                const sign = pts >= 0 ? '+' : '−';
                const colorClass = pts >= 0 ? 'green' : 'red';
                return `<tr><td>${esc(row.date || '-')}</td><td><span class="badge ${pts >= 0 ? 'badge-success' : 'badge-danger'}">${esc(getPointActionLabel(row.type))}</span></td><td>${row.reference || '-'}</td><td class="amount ${colorClass}">${sign}${Math.abs(pts).toFixed(2)}</td><td>${esc(row.notes || '-')}</td></tr>`;
            }).join('') : '<tr><td colspan="5"><div class="empty-state">No point history</div></td></tr>';
        }

        function openPointModal() {
            if (!currentCustomer) return;
            document.getElementById('pt_action').value = 'redeem';
            document.getElementById('pt_points').value = '';
            document.getElementById('pt_reference').value = '';
            document.getElementById('pt_notes').value = '';
            document.getElementById('pointModal').classList.add('show');
        }

        function closePointModal() {
            document.getElementById('pointModal').classList.remove('show');
        }

        document.getElementById('pointForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!currentCustomer) return;
            const action = document.getElementById('pt_action').value;
            const pointsRaw = parseFloat(document.getElementById('pt_points').value);
            const reference = document.getElementById('pt_reference').value.trim();
            const notes = document.getElementById('pt_notes').value.trim();
            if (!pointsRaw || pointsRaw <= 0) {
                showToast('Enter valid points', 'error');
                return;
            }

            const availablePoints = getCustomerAvailablePoints(currentCustomer.id);
            const change = action === 'bonus' ? Math.abs(pointsRaw) : -Math.abs(pointsRaw);
            if (action !== 'bonus' && Math.abs(change) > availablePoints) {
                showToast(`Not enough points. Available: ${availablePoints.toFixed(2)}`, 'error');
                return;
            }

            try {
                await FrameworkDB.save('customer_point_transactions', {
                    customer_id: currentCustomer.id,
                    point_action: action,
                    points_change: change,
                    reference: reference || (action === 'bonus' ? 'Bonus' : 'Gift / Deduct'),
                    notes,
                    createdAt: new Date().toISOString(),
                });
                closePointModal();
                await loadData();
                showToast('✅ Point entry saved!');
            } catch (err) {
                console.error(err);
                showToast('❌ ' + err.message, 'error');
            }
        });

        function buildLedgerReportStyles() {
            return `
                @page { margin: 10mm; size: A4 portrait; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; margin: 0; background: #fff; }
                .wrap { padding: 14px; }
                .shop-header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #111827; padding-bottom: 8px; }
                .shop-header h2 { margin: 0 0 4px 0; font-size: 18px; }
                .shop-header p { margin: 1px 0; font-size: 10px; color: #374151; }
                .logo-img { max-width: 180px; max-height: 60px; width: auto; height: auto; object-fit: contain; }
                .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 12px; }
                .header h1 { margin: 0; font-size: 20px; }
                .header p { margin: 4px 0 0; font-size: 11px; color: #4b5563; }
                .hero { background: linear-gradient(135deg, #111827, #6366f1); color: white; border-radius: 14px; padding: 14px 16px; margin-bottom: 12px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
                .hero .name { font-size: 22px; font-weight: 900; margin: 0 0 4px; }
                .hero .meta { font-size: 11px; line-height: 1.5; opacity: 0.95; }
                .hero .due { font-size: 28px; font-weight: 900; text-align: right; }
                .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 14px; }
                .summary .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 10px 12px; background: #fff; text-align: center; }
                .summary .label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 700; }
                .summary .value { font-size: 18px; font-weight: 900; margin-top: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th, td { border: 1px solid #d1d5db; padding: 7px 8px; font-size: 10px; text-align: left; }
                th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; }
                .section-title { font-size: 13px; font-weight: 800; margin: 14px 0 6px; }
                .amount.green { color: #059669; font-weight: 800; }
                .amount.red { color: #dc2626; font-weight: 800; }
                .footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #d1d5db; text-align: center; font-size: 10px; color: #6b7280; }
            `;
        }

        function buildLedgerReportContent() {
            if (!currentCustomer) return '';
            const fs = getCustomerFinancialSummary(currentCustomer.id, sales, collections, customers);
            const rewardPoints = Math.max(0, (parseFloat(fs.paidOnSales || 0) || 0) * 0.02);
            const customerSales = sales.filter(s => (s.customer_id || s.customerId) == currentCustomer.id).sort((a,b)=>(a.sale_date || a.date || '').localeCompare(b.sale_date || b.date || ''));
            const customerCollections = collections.filter(c => (c.customer_id || c.customerId) == currentCustomer.id).sort((a,b)=>(a.collection_date || a.date || '').localeCompare(b.collection_date || b.date || ''));
            const salesRows = customerSales.map(s => {
                const paid = getSalePaidAmount(s);
                const due = getSaleDueAmount(s);
                return `<tr><td>${esc(s.sale_date || s.date || '-')}</td><td>${esc(s.invoice_no || s.invoiceNo || '#'+s.id)}</td><td class="amount">${fmtCurrency(getSaleTotalAmount(s))}</td><td class="amount green">${fmtCurrency(paid)}</td><td class="amount red">${fmtCurrency(due)}</td></tr>`;
            }).join('');
            const collectionRows = customerCollections.map(c => {
                const saleRef = c.sale_id || c.saleId;
                const sale = saleRef ? sales.find(s => s.id == saleRef) : null;
                return `<tr><td>${esc(c.collection_date || c.date || '-')}</td><td>${esc(c.receipt_no || '-')}</td><td>${esc(sale ? (sale.invoice_no || sale.invoiceNo || '#'+sale.id) : 'General')}</td><td class="amount green">${fmtCurrency(parseFloat(c.amount || 0))}</td><td>${esc(c.payment_method || 'Cash')}</td><td>${esc(c.notes || '-')}</td></tr>`;
            }).join('');
            return `
                <div class="wrap">
                    ${getShopHeaderHTML()}
                    <div class="hero">
                        <div>
                            <div class="name">${esc(currentCustomer.name || 'N/A')}</div>
                            <div class="meta">${esc(currentCustomer.mobile || 'N/A')}<br>${esc(currentCustomer.address || 'No address')}</div>
                        </div>
                        <div>
                            <div class="meta">Current Due</div>
                            <div class="due">${fmtCurrency(fs.currentDue)}</div>
                        </div>
                    </div>
                    <div class="summary">
                        <div class="card"><div class="label">Opening</div><div class="value">${fmtCurrency(fs.openingBalance)}</div></div>
                        <div class="card"><div class="label">Sales</div><div class="value">${fmtCurrency(fs.salesTotal)}</div></div>
                        <div class="card"><div class="label">Paid</div><div class="value" style="color:#059669;">${fmtCurrency(fs.totalPaid)}</div></div>
                        <div class="card"><div class="label">Collections</div><div class="value" style="color:#059669;">${fmtCurrency(fs.generalCollections)}</div></div>
                        <div class="card"><div class="label">Reward Points</div><div class="value" style="color:#7c3aed;">${rewardPoints.toFixed(2)}</div></div>
                    </div>
                    <div class="section-title">Sales History</div>
                    <table>
                        <thead><tr><th>Date</th><th>Invoice</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
                        <tbody>${salesRows || '<tr><td colspan="5">No sales found</td></tr>'}</tbody>
                    </table>
                    <div class="section-title">Collections</div>
                    <table>
                        <thead><tr><th>Date</th><th>Receipt</th><th>Reference</th><th>Amount</th><th>Method</th><th>Notes</th></tr></thead>
                        <tbody>${collectionRows || '<tr><td colspan="6">No collections found</td></tr>'}</tbody>
                    </table>
                    <div class="footer">Generated on ${new Date().toLocaleString()} | ${esc(SHOP_SETTINGS.name)}</div>
                    ${getShopFooterHTML()}
                </div>
            `;
        }

        function buildLedgerReportHTML() {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${esc(currentCustomer ? currentCustomer.name || 'Customer' : 'Customer')} Ledger</title>
                    <style>${buildLedgerReportStyles()}</style>
                </head>
                <body>
                    ${buildLedgerReportContent()}
                </body>
                </html>
            `;
        }

        function printLedger() {
            if (!currentCustomer) return;
            printHTMLContent(buildLedgerReportHTML());
        }

        async function downloadLedger() {
            if (!currentCustomer) return;
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;z-index:-1;background:#fff;';
            tempDiv.innerHTML = `<style>${buildLedgerReportStyles()}</style>${buildLedgerReportContent()}`;
            document.body.appendChild(tempDiv);
            try {
                const canvas = await html2canvas(tempDiv, { scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false });
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
                const pageW = pdf.internal.pageSize.getWidth();
                const pageH = pdf.internal.pageSize.getHeight();
                const imgH = (canvas.height * pageW) / canvas.width;
                let remainingH = imgH;
                let y = 0;
                pdf.addImage(imgData, 'JPEG', 0, y, pageW, imgH);
                remainingH -= pageH;
                while (remainingH > 0) {
                    y = remainingH - imgH;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, y, pageW, imgH);
                    remainingH -= pageH;
                }
                pdf.save(`customer_ledger_${(currentCustomer.name || 'customer').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.pdf`);
            } catch (err) {
                console.error(err);
                alert('PDF export failed. Please try again.');
            } finally {
                if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
            }
        }

        init();

