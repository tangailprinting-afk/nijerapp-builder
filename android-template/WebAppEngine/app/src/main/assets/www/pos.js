
        let sales = [];
        let customers = [];
        let menuItems = [];
        let collections = [];
        let cart = [];
        let selectedCustomerId = null;
        let selectedCustomerName = '';
        let selectedCustomerDisplay = '';
        let lastSavedSale = null;
        let menuDataReady = false;

        async function init() {
            document.getElementById('saleDate').value = todayDate();
            await loadData();
            refreshInvoiceNo();
            renderMenu();
            renderCart();
            recalculateTotals();
        }

        async function loadData() {
            try {
                const [sd, cd, pd, cld] = await Promise.all([
                    FrameworkDB.get('sales'),
                    FrameworkDB.get('customers'),
                    FrameworkDB.get('products'),
                    FrameworkDB.get('collections')
                ]);
                sales = ensureArray(sd);
                customers = ensureArray(cd);
                menuItems = ensureArray(pd);
                collections = ensureArray(cld);
                refreshInvoiceNo();
            } catch (err) {
                console.error(err);
                showToast('Failed to load POS data', 'error');
            } finally {
                menuDataReady = true;
            }
        }

        function refreshInvoiceNo() {
            document.getElementById('invoiceNo').value = 'INV-' + String(sales.length + 1).padStart(3, '0');
        }

        function clearCart() {
            cart = [];
            selectedCustomerId = null;
            selectedCustomerName = '';
            selectedCustomerDisplay = '';
            document.getElementById('discountType').value = 'fixed';
            document.getElementById('discountValue').value = '0';
            document.getElementById('paidAmount').value = '0';
            document.getElementById('paymentMethod').value = 'Cash';
            document.getElementById('saleNotes').value = '';
            document.getElementById('customerSearch').value = '';
            document.getElementById('customerId').value = '';
            document.getElementById('customerHint').textContent = '';
            closeCustomerDropdown();
            renderCart();
            recalculateTotals();
            renderMenu();
            refreshInvoiceNo();
        }

        function resetPOS() {
            clearCart();
            document.getElementById('saleDate').value = todayDate();
            showToast('POS reset');
        }

        function getFilteredMenu() {
            const q = (document.getElementById('menuSearch').value || '').trim().toLowerCase();
            const scored = menuItems.map(item => {
                const name = (item.name || '').toLowerCase();
                const category = (item.category || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                const haystack = `${name} ${category} ${desc}`;
                const exactName = q && name === q ? 100 : 0;
                const startsName = q && name.startsWith(q) ? 60 : 0;
                const startsCat = q && category.startsWith(q) ? 35 : 0;
                const containsName = q && name.includes(q) ? 25 : 0;
                const containsCat = q && category.includes(q) ? 15 : 0;
                const containsDesc = q && desc.includes(q) ? 10 : 0;
                const hasAny = !q || haystack.includes(q);
                const score = exactName + startsName + startsCat + containsName + containsCat + containsDesc;
                return { item, score, hasAny };
            }).filter(x => x.hasAny)
              .sort((a, b) => b.score - a.score || (a.item.name || '').localeCompare(b.item.name || ''));

            return q ? scored.slice(0, 3).map(x => x.item) : [];
        }

        function renderMenu() {
            const host = document.getElementById('menuGrid');
            const q = (document.getElementById('menuSearch').value || '').trim();
            if (!menuDataReady) {
                host.innerHTML = '<div class="empty-state"><p>Loading menu...</p></div>';
                return;
            }
            if (!menuItems.length && !q) {
                host.innerHTML = `
                    <div class="empty-state">
                        <p>No menu items added yet.</p>
                        <div class="empty-actions">
                            <a class="btn btn-primary btn-sm" href="products.html">Add Menu Items</a>
                        </div>
                    </div>
                `;
                return;
            }
            if (!q) {
                host.innerHTML = '<div class="empty-state"><p>Start typing to see the top 3 matching menu items.</p></div>';
                return;
            }
            const items = getFilteredMenu();
            if (!items.length) {
                host.innerHTML = `
                    <div class="empty-state">
                        <p>No menu items found for "${esc(q)}".</p>
                        <div class="empty-actions">
                            <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('menuSearch').value=''; renderMenu();">Clear Search</button>
                            <a class="btn btn-primary btn-sm" href="products.html">Add in Menu</a>
                        </div>
                    </div>
                `;
                return;
            }
            host.innerHTML = items.map(item => {
                const stock = item.current_stock;
                const stockText = stock === '' || stock === null || stock === undefined ? 'Stock optional' : `Stock: ${stock}`;
                const count = cart.filter(x => x.id == item.id).reduce((sum, x) => sum + (parseFloat(x.qty) || 0), 0);
                const selected = count > 0 ? 'selected' : '';
                return `
                    <button type="button" class="menu-row ${selected}" onclick="addMenuItem(${item.id})">
                        <div class="menu-badge">${typeof renderIcon === 'function' ? renderIcon('box') : 'M'}</div>
                        <div class="menu-main">
                            <div class="menu-name">${esc(item.name || 'Unnamed')}</div>
                            <div class="menu-meta">${esc(item.category || 'Menu Item')} · ${esc(item.unit || 'Piece')}</div>
                            <div class="menu-meta">${esc(item.description || '')}</div>
                            <div class="menu-meta">${esc(stockText)}</div>
                        </div>
                        <div class="menu-actions">
                            <div class="menu-price">${fmtCurrency(parseFloat(item.selling_price ?? item.salePrice ?? item.price ?? 0))}</div>
                            <div class="menu-add">${count > 0 ? `In Cart ×${count}` : '+ Add'}</div>
                        </div>
                    </button>
                `;
            }).join('');
        }

        function addMenuItem(id) {
            const item = menuItems.find(x => x.id == id);
            if (!item) return;
            const existing = cart.find(x => x.id == id);
            if (existing) {
                existing.qty += 1;
                existing.total = existing.qty * existing.price;
            } else {
                cart.push({
                    id: item.id,
                    name: item.name || 'Menu Item',
                    category: item.category || '',
                    unit: item.unit || 'Piece',
                    description: item.description || '',
                    price: parseFloat(item.selling_price ?? item.salePrice ?? item.price ?? 0) || 0,
                    qty: 1,
                    total: parseFloat(item.selling_price ?? item.salePrice ?? item.price ?? 0) || 0,
                });
            }
            renderCart();
            recalculateTotals();
            renderMenu();
        }

        function renderCart() {
            const host = document.getElementById('cartList');
            if (!cart.length) {
                host.innerHTML = '<div class="empty-state"><p>Cart is empty. Tap any menu item to start.</p></div>';
                return;
            }
            host.innerHTML = cart.map((item, idx) => `
                <div class="cart-row">
                    <div>
                        <div class="cart-name">${esc(item.name)}</div>
                        <div class="cart-meta">${esc(item.unit || 'Piece')}${item.category ? ' · ' + esc(item.category) : ''}</div>
                        <div class="cart-meta">${esc(item.description || '')}</div>
                        <div class="amount">${fmtCurrency(item.total || 0)}</div>
                    </div>
                    <div class="qty-control">
                        <button type="button" class="btn btn-outline btn-xs" onclick="changeQty(${idx}, -1)">-</button>
                        <div class="qty-pill">${item.qty}</div>
                        <button type="button" class="btn btn-outline btn-xs" onclick="changeQty(${idx}, 1)">+</button>
                        <button type="button" class="btn btn-danger btn-xs" onclick="removeCartItem(${idx})">${typeof renderIcon === 'function' ? renderIcon('close') : 'X'}</button>
                    </div>
                </div>
            `).join('');
        }

        function changeQty(index, delta) {
            const item = cart[index];
            if (!item) return;
            item.qty += delta;
            if (item.qty <= 0) {
                cart.splice(index, 1);
            } else {
                item.total = item.qty * item.price;
            }
            renderCart();
            recalculateTotals();
            renderMenu();
        }

        function removeCartItem(index) {
            cart.splice(index, 1);
            renderCart();
            recalculateTotals();
            renderMenu();
        }

        function getCartTotals() {
            const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
            const discountType = document.getElementById('discountType').value;
            const discountValue = parseFloat(document.getElementById('discountValue').value) || 0;
            const discount = discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue;
            const grand = Math.max(0, subtotal - Math.min(discount, subtotal));
            let paid = parseFloat(document.getElementById('paidAmount').value) || 0;
            if (document.getElementById('paymentMethod').value === 'Due') {
                paid = 0;
            }
            paid = Math.max(0, Math.min(paid, grand));
            const due = Math.max(0, grand - paid);
            return { subtotal, discount, grand, paid, due };
        }

        function recalculateTotals() {
            const totals = getCartTotals();
            const setText = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            setText('subtotalValue', fmtCurrency(totals.subtotal));
            setText('discountValueLabel', fmtCurrency(totals.discount));
            setText('grandValue', fmtCurrency(totals.grand));
            setText('dueValue', fmtCurrency(totals.due));
            const paidAmount = document.getElementById('paidAmount');
            if (paidAmount) paidAmount.value = totals.paid;
            if (document.getElementById('customerId')?.value) {
                updateCustomerHint();
            }
        }

        function syncPaymentMethod() {
            if (document.getElementById('paymentMethod').value === 'Due') {
                document.getElementById('paidAmount').value = '0';
            }
            recalculateTotals();
        }

        function filterCustomers() {
            const input = document.getElementById('customerSearch');
            const q = (input.value || '').trim().toLowerCase();
            selectedCustomerId = null;
            selectedCustomerName = '';
            selectedCustomerDisplay = '';
            document.getElementById('customerId').value = '';
            const matches = getCustomerSearchMatches(customers, q, 5);
            const host = document.getElementById('customerDropdown');
            let html = matches.map(c => `
                <div class="customer-item" data-customer-id="${esc(c.id)}" data-customer-name="${esc(c.name || '')}" data-customer-mobile="${esc(c.mobile || '')}">
                    <div class="customer-avatar">${esc((c.mobile || c.name || 'C').replace(/\D/g, '').slice(-1) || (c.name || 'C').charAt(0).toUpperCase())}</div>
                    <div class="customer-info">
                        <div class="customer-name">${esc(getCustomerSearchLabel(c, { preferMobile: true, includeName: true }))}</div>
                        <div class="customer-mobile">${esc(c.name || 'Customer')} · ${esc(c.mobile || 'No mobile')}</div>
                    </div>
                </div>
            `).join('');
            const exact = customers.some(c => normalizeCustomerSearchQuery(c.mobile || '') === q || normalizeCustomerSearchQuery(c.name || '') === q);
            if (q && !exact) {
                html += `
                    <div class="customer-item" data-quick-prefill="${esc(input.value || '')}">
                        <div class="customer-avatar">+</div>
                        <div class="customer-info">
                            <div class="customer-name">Add "${esc(input.value)}"</div>
                            <div class="customer-mobile">Create new customer</div>
                        </div>
                    </div>
                `;
            }
            host.innerHTML = html || '<div class="empty-state"><p>No customer found</p></div>';
            host.classList.add('show');
        }

        document.getElementById('customerDropdown').addEventListener('click', function(e) {
            const row = e.target.closest('.customer-item');
            if (!row) return;
            const customerId = row.dataset.customerId;
            const customerName = row.dataset.customerName;
            const customerMobile = row.dataset.customerMobile;
            const quickPrefill = row.dataset.quickPrefill;
            if (quickPrefill !== undefined) {
                openQuickCustomer(quickPrefill);
                return;
            }
            if (customerId) {
                selectCustomer(customerId, customerName || '', customerMobile || '');
            }
        });

        function selectCustomer(id, name, mobile = '') {
            selectedCustomerId = id ? String(id) : null;
            selectedCustomerName = name || '';
            selectedCustomerDisplay = mobile || name || '';
            document.getElementById('customerId').value = selectedCustomerId || '';
            document.getElementById('customerSearch').value = selectedCustomerDisplay;
            closeCustomerDropdown();
            updateCustomerHint();
        }

        function openQuickCustomer(prefill = '') {
            closeCustomerDropdown();
            const raw = String(prefill || document.getElementById('customerSearch').value || '').trim();
            document.getElementById('qc_name').value = /[A-Za-z\u0980-\u09FF]/.test(raw) ? raw : '';
            document.getElementById('qc_mobile').value = normalizeCustomerMobile(raw) || raw;
            document.getElementById('qc_opening').value = '0';
            document.getElementById('qc_address').value = '';
            document.getElementById('quickCustomerModal').classList.add('show');
        }

        function closeQuickCustomerModal() {
            document.getElementById('quickCustomerModal').classList.remove('show');
        }

        function closeCustomerDropdown() {
            document.getElementById('customerDropdown').classList.remove('show');
        }

        function updateCustomerHint() {
            const cid = selectedCustomerId || parseInt(document.getElementById('customerId').value, 10);
            const hint = document.getElementById('customerHint');
            if (!cid) {
                hint.textContent = '';
                return;
            }
            const summary = getCustomerFinancialSummary(cid, sales, collections, customers);
            hint.textContent = summary.currentDue > 0 ? `Existing due: ${fmtCurrency(summary.currentDue)}` : 'Customer balance clear';
        }

        document.getElementById('quickCustomerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = {
                name: document.getElementById('qc_name').value.trim(),
                mobile: document.getElementById('qc_mobile').value.trim(),
                opening_balance: parseFloat(document.getElementById('qc_opening').value) || 0,
                address: document.getElementById('qc_address').value.trim(),
                notes: '',
                createdAt: new Date().toISOString()
            };
            if (!data.name) {
                showToast('Name required', 'error');
                return;
            }
            if (!data.mobile) {
                showToast('Mobile number required', 'error');
                return;
            }
            try {
                const result = await FrameworkDB.save('customers', data);
                const id = result?.id || result;
                customers.push({ id, ...data });
                selectCustomer(id, data.name, data.mobile);
                closeQuickCustomerModal();
                showToast('Customer saved!');
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        });

        function buildReceiptHTML(saleData) {
            const customer = customers.find(c => c.id == saleData.customer_id);
            const customerName = saleData.customer_name || customer?.name || 'Walk-in Customer';
            const items = saleData.items || [];
            return `
                <div class="receipt-head">
                    <h2>${esc(SHOP_SETTINGS.name)}</h2>
                    <p>${esc(SHOP_SETTINGS.address)}</p>
                    <p>${esc(SHOP_SETTINGS.phone)}</p>
                </div>
                <div class="receipt-meta">
                    <div class="receipt-box"><strong>Invoice:</strong> ${esc(saleData.invoice_no || '')}<br><strong>Date:</strong> ${esc(saleData.sale_date || '')}</div>
                    <div class="receipt-box"><strong>Customer:</strong> ${esc(customerName)}<br><strong>Method:</strong> ${esc(saleData.payment_method || 'Cash')}</div>
                </div>
                <table class="receipt-items">
                    <thead>
                        <tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Total</th></tr>
                    </thead>
                    <tbody>
                        ${items.map(it => `
                            <tr>
                                <td>${esc(it.name || it.description || '')}${it.description ? `<div class="menu-meta">${esc(it.description)}</div>` : ''}</td>
                                <td style="text-align:center;">${esc(it.qty || 1)}</td>
                                <td style="text-align:right;">${fmtCurrency(it.total || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="receipt-total">
                    <div class="row"><span>Subtotal</span><strong>${fmtCurrency(saleData.subtotal || 0)}</strong></div>
                    <div class="row"><span>Discount</span><strong>${fmtCurrency(saleData.discount || 0)}</strong></div>
                    <div class="row grand"><span>Grand Total</span><span>${fmtCurrency(saleData.total_amount || 0)}</span></div>
                    <div class="row"><span>Paid</span><strong>${fmtCurrency(saleData.paid_amount || 0)}</strong></div>
                    <div class="row"><span>Due</span><strong>${fmtCurrency(saleData.due_amount || 0)}</strong></div>
                </div>
                <div class="receipt-note">Thank you for your order</div>
            `;
        }

        function buildThermalReceiptHTML(saleData) {
            const customer = customers.find(c => c.id == saleData.customer_id);
            const customerName = saleData.customer_name || customer?.name || 'Walk-in Customer';
            const items = saleData.items || [];
            const shopName = SHOP_SETTINGS.name;
            const shopAddress = SHOP_SETTINGS.address;
            const shopPhone = SHOP_SETTINGS.phone;
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        @page { size: 58mm auto; margin: 0; }
                        html, body { width: 58mm; margin: 0; padding: 0; background: #fff; color: #000; }
                        body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .bill { width: 58mm; padding: 4mm 3mm; box-sizing: border-box; }
                        .center { text-align: center; }
                        .shop-name { font-size: 14px; font-weight: 800; line-height: 1.15; }
                        .shop-sub { font-size: 9px; line-height: 1.35; margin-top: 1mm; }
                        .line { border-top: 1px dashed #000; margin: 2mm 0; }
                        .meta { font-size: 9px; line-height: 1.45; }
                        .meta strong { font-weight: 700; }
                        table { width: 100%; border-collapse: collapse; font-size: 9px; }
                        th, td { padding: 1.2mm 0; vertical-align: top; }
                        th { border-bottom: 1px solid #000; text-align: left; font-size: 8px; }
                        td.qty, th.qty { width: 7mm; text-align: center; }
                        td.total, th.total { width: 13mm; text-align: right; }
                        .totals { font-size: 9px; line-height: 1.55; margin-top: 2mm; }
                        .totals .row { display: flex; justify-content: space-between; gap: 2mm; }
                        .grand { font-size: 11px; font-weight: 800; border-top: 1px solid #000; margin-top: 1.5mm; padding-top: 1mm; }
                        .thanks { text-align: center; font-size: 8px; margin-top: 3mm; }
                    </style>
                </head>
                <body>
                    <div class="bill">
                        <div class="center">
                            <div class="shop-name">${esc(shopName)}</div>
                            <div class="shop-sub">${esc(shopAddress)}</div>
                            <div class="shop-sub">Phone: ${esc(shopPhone)}</div>
                        </div>
                        <div class="line"></div>
                        <div class="meta">
                            <div><strong>Invoice:</strong> ${esc(saleData.invoice_no || '')}</div>
                            <div><strong>Date:</strong> ${esc(saleData.sale_date || '')}</div>
                            <div><strong>Customer:</strong> ${esc(customerName)}</div>
                            <div><strong>Method:</strong> ${esc(saleData.payment_method || 'Cash')}</div>
                        </div>
                        <div class="line"></div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th class="qty">Q</th>
                                    <th class="total">Tk</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(it => `
                                    <tr>
                                        <td>${esc(it.name || it.description || '')}${it.description ? `<div style="font-size:8px;color:#444;">${esc(it.description)}</div>` : ''}</td>
                                        <td class="qty">${esc(it.qty || 1)}</td>
                                        <td class="total">${Number(parseFloat(it.total || 0)).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="line"></div>
                        <div class="totals">
                            <div class="row"><span>Subtotal</span><span>${Number(parseFloat(saleData.subtotal || 0)).toFixed(2)}</span></div>
                            <div class="row"><span>Discount</span><span>${Number(parseFloat(saleData.discount || 0)).toFixed(2)}</span></div>
                            <div class="row grand"><span>Grand Total</span><span>${Number(parseFloat(saleData.total_amount || 0)).toFixed(2)}</span></div>
                            <div class="row"><span>Paid</span><span>${Number(parseFloat(saleData.paid_amount || 0)).toFixed(2)}</span></div>
                            <div class="row"><span>Due</span><span>${Number(parseFloat(saleData.due_amount || 0)).toFixed(2)}</span></div>
                        </div>
                        <div class="line"></div>
                        <div class="thanks">Thank you</div>
                    </div>
                </body>
                </html>
            `;
        }

        function closeReceiptModal() {
            document.getElementById('receiptModal').classList.remove('show');
        }

        async function printLastReceipt() {
            if (!lastSavedSale) {
                showToast('No saved receipt yet', 'warning');
                return;
            }
            await printHTMLContent(buildThermalReceiptHTML(lastSavedSale), {
                title: 'POS Receipt',
                mode: 'thermal',
                paperWidthMm: 58
            });
        }

        async function savePOS() {
            if (!cart.length) {
                showToast('Add at least one menu item', 'error');
                return;
            }
            const validItems = cart.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description,
                unit: item.unit,
                category: item.category,
                qty: item.qty,
                price: item.price,
                total: item.total
            }));
            const totals = getCartTotals();
            const customerSearchValue = document.getElementById('customerSearch').value.trim();
            let customerId = selectedCustomerId || parseInt(document.getElementById('customerId').value, 10) || null;
            let matchedCustomer = customerId ? customers.find(c => c.id == customerId) : null;
            if (!customerId && customerSearchValue) {
                const normalizedDigits = normalizeCustomerMobile(customerSearchValue).replace(/\D/g, '');
                const normalizedSearch = customerSearchValue.toLowerCase();
                matchedCustomer = customers.find(c => {
                    const name = (c.name || '').trim().toLowerCase();
                    const mobile = normalizeCustomerMobile(c.mobile || '');
                    return name === normalizedSearch || mobile === normalizeCustomerMobile(customerSearchValue) || (normalizedDigits && mobile.replace(/\D/g, '').includes(normalizedDigits));
                }) || null;
                if (matchedCustomer) customerId = matchedCustomer.id;
            }
            const paymentMethod = document.getElementById('paymentMethod').value;
            const paidAmount = paymentMethod === 'Due' ? 0 : totals.paid;
            const saleData = {
                invoice_no: document.getElementById('invoiceNo').value,
                customer_id: customerId,
                customer_name: selectedCustomerName || matchedCustomer?.name || customerSearchValue || '',
                sale_date: document.getElementById('saleDate').value || todayDate(),
                due_date: null,
                payment_method: paymentMethod,
                items: JSON.stringify(validItems),
                subtotal: totals.subtotal,
                discount: totals.discount,
                discount_type: document.getElementById('discountType').value,
                total_amount: totals.grand,
                paid_amount: paidAmount,
                due_amount: Math.max(0, totals.grand - paidAmount),
                notes: document.getElementById('saleNotes').value.trim(),
                createdAt: new Date().toISOString()
            };

            try {
                const result = await FrameworkDB.save('sales', saleData);
                lastSavedSale = { ...saleData, id: result?.id || result, items: validItems };
                showToast('Sale saved!');
                await printHTMLContent(buildThermalReceiptHTML(lastSavedSale), {
                    title: 'POS Receipt',
                    mode: 'thermal',
                    paperWidthMm: 58
                });
                cart = [];
                await loadData();
                clearCart();
                renderMenu();
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        }

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.searchable-select')) {
                closeCustomerDropdown();
            }
        });

        document.getElementById('receiptModal').addEventListener('click', function(e) {
            if (e.target === this) closeReceiptModal();
        });

        document.getElementById('quickCustomerModal').addEventListener('click', function(e) {
            if (e.target === this) closeQuickCustomerModal();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeCustomerDropdown();
                closeReceiptModal();
                closeQuickCustomerModal();
            }
        });

        init();
    
