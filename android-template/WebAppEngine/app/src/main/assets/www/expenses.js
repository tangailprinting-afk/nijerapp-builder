
        let expenses = [], editingId = null, currentReceiptData = null;
        const predefinedCategories = ['Paper Stock','Ink / Toner','Machine Maintenance','Electricity','Rent','Salary (Advance)','Transport','Tea / Snacks','Internet','Printing Materials'];
        const catColors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#3b82f6','#84cc16','#64748b','#06b6d4','#d946ef','#a3e635','#f43f5e'];

        async function init() { await loadData(); resetForm(); populateCategoryFilter(); }
        async function loadData() { try { expenses = ensureArray(await FrameworkDB.get('expenses')); updateAllUI(); } catch (e) { console.error(e); } }

        function getAllCategories() { const cats = new Set([...predefinedCategories]); expenses.forEach(e => { if (e.category && !predefinedCategories.includes(e.category)) cats.add(e.category); }); return [...cats].sort(); }
        function resetForm() { editingId = null; document.getElementById('e_id').value = ''; document.getElementById('e_category').value = ''; document.getElementById('e_customCategory').value = ''; document.getElementById('e_customCategory').style.display = 'none'; document.getElementById('e_amount').value = ''; document.getElementById('e_date').value = todayDate(); document.getElementById('e_paidBy').value = 'Cash'; document.getElementById('e_notes').value = ''; }
        function resetStaffForm() { editingStaffId = null; document.getElementById('st_id').value = ''; document.getElementById('st_name').value = ''; document.getElementById('st_designation').value = ''; document.getElementById('st_mobile').value = ''; document.getElementById('st_opening').value = '0'; document.getElementById('st_notes').value = ''; }
        function resetStaffSalaryForm() { editingStaffSalaryId = null; document.getElementById('ss_id').value = ''; document.getElementById('ss_staff').value = ''; document.getElementById('ss_amount').value = ''; document.getElementById('ss_date').value = todayDate(); document.getElementById('ss_method').value = 'Cash'; document.getElementById('ss_notes').value = ''; updateStaffSalaryPreview(); }
        function toggleCustomCategory() { const s=document.getElementById('e_category'), c=document.getElementById('e_customCategory'); if(s.value==='__custom__'){c.style.display='block';c.focus();}else{c.style.display='none';c.value='';} }
        function toggleEditCustomCategory() { const s=document.getElementById('ee_category'), c=document.getElementById('ee_customCategory'); if(s.value==='__custom__'){c.style.display='block';c.focus();}else{c.style.display='none';c.value='';} }
        function getFinalCategory(selId, custId) { const s=document.getElementById(selId); return s.value==='__custom__' ? (document.getElementById(custId).value.trim()||'Other') : s.value; }
        function populateCategoryFilter() { const s=document.getElementById('categoryFilter'); s.innerHTML='<option value="all">All Categories</option>'+getAllCategories().map(c=>`<option value="${c}">${c}</option>`).join(''); }
        function updateAllUI() { updateStats(); updateTable(); updateCategoryAnalytics(); populateCategoryFilter(); }

        function updateStats() { document.getElementById('statTotal').textContent = expenses.length; const t=todayDate(), ms=monthStartDate(); document.getElementById('statToday').textContent = fmtCurrency(expenses.filter(e=>(e.expense_date||e.date)===t).reduce((s,e)=>s+(parseFloat(e.amount||0)),0)); document.getElementById('statMonth').textContent = fmtCurrency(expenses.filter(e=>(e.expense_date||e.date)>=ms).reduce((s,e)=>s+(parseFloat(e.amount||0)),0)); document.getElementById('statCategories').textContent = new Set(expenses.map(e=>e.category).filter(Boolean)).size; }

        function updateTable() { const tbody=document.getElementById('expenseTable'), s=(document.getElementById('searchInput')?.value||'').trim().toLowerCase(), cf=document.getElementById('categoryFilter')?.value||'all'; let list=[...expenses].sort((a,b)=>(b.id||0)-(a.id||0)); if(s) list=list.filter(e=>(e.category||'').toLowerCase().includes(s)||(e.notes||'').toLowerCase().includes(s)); if(cf!=='all') list=list.filter(e=>e.category===cf); if(list.length===0){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><p>No expenses yet</p></div></td></tr>';return;} tbody.innerHTML=list.map(e=>`<tr><td>#${e.id}</td><td>${e.expense_date||e.date||'-'}</td><td><span class="badge badge-info">${esc(e.category||'Other')}</span></td><td class="amount orange">${fmtCurrency(parseFloat(e.amount||0))}</td><td>${esc(e.paid_by||e.paidBy||'Cash')}</td><td>${esc(e.notes||'-')}</td><td><button class="btn btn-outline btn-xs" onclick="previewSingleReceipt(${e.id})">🧾</button><button class="btn btn-outline btn-xs" onclick="openEditModal(${e.id})">✏️</button><button class="btn btn-danger btn-xs" onclick="deleteExpense(${e.id})">🗑️</button></td></tr>`).join(''); }

        function updateCategoryAnalytics() { const c=document.getElementById('categoryAnalytics'), ms=monthStartDate(); const me=expenses.filter(e=>(e.expense_date||e.date)>=ms), tm=me.reduce((s,e)=>s+(parseFloat(e.amount||0)),0)||1; const cd=getAllCategories().map(cat=>({name:cat,amount:me.filter(e=>e.category===cat).reduce((s,e)=>s+(parseFloat(e.amount||0)),0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount); if(cd.length===0){c.innerHTML='<div class="empty-state"><p>No expenses this month</p></div>';return;} c.innerHTML=cd.map((x,i)=>`<div class="pie-item"><div class="cat-name">${esc(x.name)}</div><div class="cat-amount">${fmtCurrency(x.amount)}</div><div style="font-size:10px;color:var(--text-muted);">${((x.amount/tm)*100).toFixed(1)}%</div><div class="pie-bar"><div class="pie-bar-fill" style="width:${((x.amount/tm)*100).toFixed(1)}%;background:${catColors[i%catColors.length]};"></div></div></div>`).join(''); }

        function getStaffDisplayName(staff) { return [staff?.name, staff?.designation].filter(Boolean).join(' - ') || 'Unnamed Staff'; }
        function getStaffPayable(staffOrId) {
            const staff = typeof staffOrId === 'object' ? staffOrId : staffs.find(s => s.id == staffOrId);
            if (!staff) return 0;
            const opening = parseFloat(staff.opening_balance || staff.opening || 0) || 0;
            const sid = staff.id;
            const dueTotal = staffSalaryEntries.filter(x => (x.staff_id || x.staffId) == sid && ((x.entry_type || x.type || x.paid_by || x.paidBy) === 'Due')).reduce((sum, x) => sum + (parseFloat(x.amount || 0)), 0);
            const paidTotal = staffSalaryEntries.filter(x => (x.staff_id || x.staffId) == sid && ((x.entry_type || x.type || x.paid_by || x.paidBy) !== 'Due')).reduce((sum, x) => sum + (parseFloat(x.amount || 0)), 0);
            return Math.max(0, opening + dueTotal - paidTotal);
        }
        function updateStaffSelects() {
            const sel = document.getElementById('ss_staff');
            if (!sel) return;
            const current = sel.value;
            sel.innerHTML = '<option value="">Select Staff</option>' + [...staffs].sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(s => `<option value="${s.id}">${esc(s.name || 'Unnamed Staff')}${s.designation ? ` (${esc(s.designation)})` : ''}</option>`).join('');
            if ([...sel.options].some(o => o.value === current)) sel.value = current;
        }
        function updateStaffTable() {
            const tbody = document.getElementById('staffTable');
            if (!tbody) return;
            const list = [...staffs].sort((a,b)=>getStaffPayable(b)-getStaffPayable(a) || (b.id||0)-(a.id||0));
            if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>No staff added yet</p></div></td></tr>'; return; }
            tbody.innerHTML = list.map(s => `
                <tr>
                    <td class="cname">${esc(s.name || '-')}</td>
                    <td>${esc(s.mobile || '-')}</td>
                    <td class="amount red">${fmtCurrency(parseFloat(s.opening_balance || s.opening || 0))}</td>
                    <td class="amount red">${getStaffPayable(s) > 0 ? fmtCurrency(getStaffPayable(s)) : '✅ Clear'}</td>
                    <td>
                        <button class="btn btn-outline btn-xs" onclick="openStaffLedger(${s.id})">📒</button>
                        <button class="btn btn-outline btn-xs" onclick="editStaff(${s.id})">✏️</button>
                        <button class="btn btn-danger btn-xs" onclick="deleteStaff(${s.id})">🗑️</button>
                    </td>
                </tr>
            `).join('');
        }
        function updateStaffSalaryPreview() {
            const box = document.getElementById('salaryPreview');
            if (!box) return;
            const sid = document.getElementById('ss_staff')?.value;
            const amt = parseFloat(document.getElementById('ss_amount')?.value || 0) || 0;
            const method = document.getElementById('ss_method')?.value || 'Cash';
            if (!sid) { box.textContent = 'Current Payable: ৳ 0'; return; }
            const staff = staffs.find(s => s.id == sid);
            const before = getStaffPayable(staff);
            const after = method === 'Due' ? before + amt : Math.max(0, before - amt);
            box.textContent = `Current Payable: ${fmtCurrency(before)}${amt > 0 ? ` → ${fmtCurrency(after)} (${method})` : ''}`;
        }
        function updateStaffSalaryTable() {
            const tbody = document.getElementById('staffSalaryTable');
            if (!tbody) return;
            const list = [...staffSalaryEntries].sort((a,b)=>(new Date(b.salary_date || b.date || b.createdAt || 0)) - (new Date(a.salary_date || a.date || a.createdAt || 0)) || (b.id||0)-(a.id||0));
            if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>No salary records yet</p></div></td></tr>'; return; }
            tbody.innerHTML = list.map(x => {
                const staff = staffs.find(s => s.id == (x.staff_id || x.staffId));
                const type = (x.entry_type || x.type || x.paid_by || x.paidBy) === 'Due' ? 'Due' : 'Payment';
                return `<tr>
                    <td>${x.salary_date || x.date || '-'}</td>
                    <td class="cname">${esc(staff?.name || 'Unknown')}</td>
                    <td><span class="badge ${type === 'Due' ? 'badge-warning' : 'badge-success'}">${type}</span></td>
                    <td class="amount ${type === 'Due' ? 'red' : 'green'}">${fmtCurrency(parseFloat(x.amount || 0))}</td>
                    <td>${esc(x.paid_by || x.paidBy || x.method || 'Cash')}</td>
                    <td>${esc(x.notes || '-')}</td>
                    <td>
                        <button class="btn btn-outline btn-xs" onclick="openStaffLedger(${staff?.id || 0})">📒</button>
                        <button class="btn btn-outline btn-xs" onclick="editStaffSalary(${x.id})">✏️</button>
                        <button class="btn btn-danger btn-xs" onclick="deleteStaffSalary(${x.id})">🗑️</button>
                    </td>
                </tr>`;
            }).join('');
        }
        function renderStaffLedger(staffId) {
            const staff = staffs.find(s => s.id == staffId);
            const tbody = document.getElementById('staffLedgerTable');
            if (!staff || !tbody) return;
            const entries = [...staffSalaryEntries].filter(x => (x.staff_id || x.staffId) == staffId).sort((a,b)=>(new Date(a.salary_date || a.date || a.createdAt || 0)) - (new Date(b.salary_date || b.date || b.createdAt || 0)) || (a.id||0)-(b.id||0));
            let balance = parseFloat(staff.opening_balance || staff.opening || 0) || 0;
            document.getElementById('staffLedgerName').textContent = staff.name || 'Unnamed Staff';
            document.getElementById('staffLedgerMeta').textContent = [staff.designation, staff.mobile ? `📱 ${staff.mobile}` : ''].filter(Boolean).join(' | ');
            if (entries.length === 0) {
                document.getElementById('staffLedgerBalance').textContent = fmtCurrency(balance);
                tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No salary records yet</p></div></td></tr>`;
                return;
            }
            const rows = [];
            rows.push(`<tr><td>${staff.createdAt ? staff.createdAt.split('T')[0] : '-'}</td><td><span class="badge badge-info">Opening</span></td><td class="amount red">${fmtCurrency(parseFloat(staff.opening_balance || staff.opening || 0) || 0)}</td><td>-</td><td>${esc(staff.notes || '-')}</td><td class="amount red">${fmtCurrency(balance)}</td></tr>`);
            entries.forEach(x => {
                const type = (x.entry_type || x.type || x.paid_by || x.paidBy) === 'Due' ? 'Due' : 'Payment';
                const amt = parseFloat(x.amount || 0) || 0;
                balance += type === 'Due' ? amt : -amt;
                rows.push(`<tr><td>${x.salary_date || x.date || '-'}</td><td><span class="badge ${type === 'Due' ? 'badge-warning' : 'badge-success'}">${type}</span></td><td class="amount ${type === 'Due' ? 'red' : 'green'}">${fmtCurrency(amt)}</td><td>${esc(x.paid_by || x.paidBy || x.method || 'Cash')}</td><td>${esc(x.notes || '-')}</td><td class="amount red">${fmtCurrency(Math.max(0, balance))}</td></tr>`);
            });
            document.getElementById('staffLedgerBalance').textContent = fmtCurrency(Math.max(0, balance));
            tbody.innerHTML = rows.join('');
        }
        function openStaffLedger(id) { const staff = staffs.find(s => s.id == id); if (!staff) return; currentStaffLedgerId = id; renderStaffLedger(id); document.getElementById('staffLedgerModal').classList.add('show'); }
        function closeStaffLedgerModal(){ document.getElementById('staffLedgerModal').classList.remove('show'); currentStaffLedgerId = null; }
        function editStaff(id){ const s = staffs.find(x => x.id == id); if(!s)return; editingStaffId = id; document.getElementById('st_id').value = id; document.getElementById('st_name').value = s.name || ''; document.getElementById('st_designation').value = s.designation || ''; document.getElementById('st_mobile').value = s.mobile || ''; document.getElementById('st_opening').value = parseFloat(s.opening_balance || s.opening || 0) || 0; document.getElementById('st_notes').value = s.notes || ''; }
        function editStaffSalary(id){ const x = staffSalaryEntries.find(r => r.id == id); if(!x)return; editingStaffSalaryId = id; document.getElementById('ss_id').value = id; document.getElementById('ss_staff').value = x.staff_id || x.staffId || ''; document.getElementById('ss_amount').value = x.amount || ''; document.getElementById('ss_date').value = x.salary_date || x.date || todayDate(); document.getElementById('ss_method').value = (x.paid_by || x.paidBy || 'Cash'); document.getElementById('ss_notes').value = x.notes || ''; updateStaffSalaryPreview(); }
        async function deleteStaff(id){ if(!confirm('Delete this staff?'))return; try{ const related = staffSalaryEntries.filter(x => (x.staff_id || x.staffId) == id); if(related.length && !confirm('This staff has salary records. Delete anyway?')) return; for (const rec of related) { if(rec.source_expense_id) await FrameworkDB.delete('expenses', rec.source_expense_id); await FrameworkDB.delete('staff_salary_entries', rec.id); } await FrameworkDB.delete('staffs', id); showToast('🗑️ Staff deleted!'); await loadData(); }catch(err){ showToast('❌ '+err.message,'error'); } }
        async function deleteStaffSalary(id){ if(!confirm('Delete this salary record?'))return; try{ const rec=staffSalaryEntries.find(x=>x.id==id); if(rec?.source_expense_id) await FrameworkDB.delete('expenses', rec.source_expense_id); await FrameworkDB.delete('staff_salary_entries', id); showToast('🗑️ Salary record deleted!'); await loadData(); }catch(err){ showToast('❌ '+err.message,'error'); } }

        document.getElementById('expenseForm').addEventListener('submit',async function(e){ e.preventDefault(); const cat=getFinalCategory('e_category','e_customCategory'), data={category:cat,amount:parseFloat(document.getElementById('e_amount').value)||0,expense_date:document.getElementById('e_date').value,paid_by:document.getElementById('e_paidBy').value,notes:document.getElementById('e_notes').value.trim(),createdAt:new Date().toISOString()}; if(!cat){showToast('Select or type a category','error');return;} if(data.amount<=0){showToast('Enter valid amount','error');return;} try{ let sid; if(editingId){await FrameworkDB.update('expenses',editingId,data);sid=editingId;showToast('✅ Updated!');}else{const r=await FrameworkDB.save('expenses',data);sid=r?.id||r;showToast('✅ Saved!');} resetForm();document.getElementById('e_date').value=todayDate();await loadData(); previewSingleReceipt(sid); }catch(err){showToast('❌ '+err.message,'error');} });

        function openEditModal(id){const e=expenses.find(x=>x.id==id);if(!e)return;editingId=id;document.getElementById('ee_id').value=id;const ip=predefinedCategories.includes(e.category||'');document.getElementById('ee_category').value=ip?e.category:'__custom__';document.getElementById('ee_customCategory').value=ip?'':(e.category||'');document.getElementById('ee_customCategory').style.display=ip?'none':'block';document.getElementById('ee_amount').value=e.amount||0;document.getElementById('ee_date').value=e.expense_date||e.date||'';document.getElementById('ee_paidBy').value=e.paid_by||e.paidBy||'Cash';document.getElementById('ee_notes').value=e.notes||'';document.getElementById('editModal').classList.add('show');}
        function closeEditModal(){document.getElementById('editModal').classList.remove('show');editingId=null;}
        document.getElementById('editForm').addEventListener('submit',async function(e){e.preventDefault();const cat=getFinalCategory('ee_category','ee_customCategory'),data={category:cat,amount:parseFloat(document.getElementById('ee_amount').value)||0,expense_date:document.getElementById('ee_date').value,paid_by:document.getElementById('ee_paidBy').value,notes:document.getElementById('ee_notes').value.trim(),updatedAt:new Date().toISOString()};try{await FrameworkDB.update('expenses',editingId,data);showToast('✅ Updated!');closeEditModal();await loadData();}catch(err){showToast('❌ '+err.message,'error');}});
        async function deleteExpense(id){if(!confirm('Delete this expense?'))return;try{await FrameworkDB.delete('expenses',id);showToast('🗑️ Deleted!');await loadData();}catch(err){showToast('❌ '+err.message,'error');}}

        function previewSingleReceipt(id){const exp=expenses.find(x=>x.id==id);if(!exp)return;currentReceiptData=exp;document.getElementById('receiptContent').innerHTML=buildVoucherHTML(exp);document.getElementById('receiptModal').classList.add('show');}
        function closeReceiptModal(){document.getElementById('receiptModal').classList.remove('show');currentReceiptData=null;}

        function buildVoucherHTML(exp){ const shopName=SHOP_SETTINGS.name,shopAddress=SHOP_SETTINGS.address,shopPhone=SHOP_SETTINGS.phone; return `
            <div style="font-family:'Segoe UI',sans-serif;color:#000;background:#fff;padding:16px;">
                <div style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:10px;margin-bottom:10px;">
                    ${SHOP_LOGO?`<img src="${SHOP_LOGO}" alt="Logo" style="max-width:100px;max-height:35px;margin-bottom:4px;">`:''}
                    <h3 style="margin:0;font-size:15px;color:#f97316;">EXPENSE VOUCHER</h3>
                    <p style="margin:2px 0;font-size:10px;">${esc(shopName)} | ${esc(shopAddress)}</p>
                </div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #eee;"><span style="color:#555;font-size:10px;">Voucher No</span><span style="font-weight:600;">EXP-${String(exp.id).padStart(4,'0')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #eee;"><span style="color:#555;font-size:10px;">Date</span><span style="font-weight:600;">${exp.expense_date||exp.date||'-'}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #eee;"><span style="color:#555;font-size:10px;">Category</span><span style="font-weight:600;">${esc(exp.category||'Other')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #eee;"><span style="color:#555;font-size:10px;">Paid By</span><span style="font-weight:600;">${esc(exp.paid_by||exp.paidBy||'Cash')}</span></div>
                ${exp.notes?`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #eee;"><span style="color:#555;font-size:10px;">Notes</span><span style="font-weight:600;">${esc(exp.notes)}</span></div>`:''}
                <div style="text-align:center;margin:12px 0;font-size:22px;font-weight:900;color:#f97316;">${fmtCurrency(parseFloat(exp.amount||0))}</div>
                <div style="text-align:center;border-top:1px dashed #ccc;padding-top:8px;font-size:9px;color:#666;"><p>Authorized Signature</p><p>________________________</p><p>${esc(shopName)} | 📞 ${esc(shopPhone)}</p></div>
            </div>`; }

        function printSingleReceipt(){ if(!currentReceiptData)return; printHTMLContent(buildVoucherHTML(currentReceiptData)); }

        function printCategoryReport(){ const ms=monthStartDate(); const me=expenses.filter(e=>(e.expense_date||e.date)>=ms), tm=me.reduce((s,e)=>s+(parseFloat(e.amount||0)),0)||1; const cd=getAllCategories().map(cat=>({name:cat,amount:me.filter(e=>e.category===cat).reduce((s,e)=>s+(parseFloat(e.amount||0)),0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount); const rows=cd.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td>${fmtCurrency(x.amount)}</td><td>${((x.amount/tm)*100).toFixed(1)}%</td></tr>`).join(''); const html=`<html><head><title>Category Report</title><style>@page{margin:15mm;}body{font-family:sans-serif;font-size:12px;}h2{text-align:center;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px;font-size:11px;}th{background:#f5f5f5;}</style></head><body><h2>${esc(SHOP_SETTINGS.name)} - Category Report</h2><p>Total: ${fmtCurrency(tm)}</p><table><thead><tr><th>#</th><th>Category</th><th>Amount</th><th>%</th></tr></thead><tbody>${rows}</tbody></table></body></html>`; printHTMLContent(html); }
        function printExpenseList(){ const s=(document.getElementById('searchInput')?.value||'').trim().toLowerCase(), cf=document.getElementById('categoryFilter')?.value||'all'; let list=[...expenses].sort((a,b)=>(b.id||0)-(a.id||0)); if(s) list=list.filter(e=>(e.category||'').toLowerCase().includes(s)||(e.notes||'').toLowerCase().includes(s)); if(cf!=='all') list=list.filter(e=>e.category===cf); const total=list.reduce((s,e)=>s+(parseFloat(e.amount||0)),0); const rows=list.map(e=>`<tr><td>${e.expense_date||e.date||'-'}</td><td>${esc(e.category||'Other')}</td><td>${fmtCurrency(parseFloat(e.amount||0))}</td><td>${esc(e.paid_by||e.paidBy||'Cash')}</td><td>${esc(e.notes||'-')}</td></tr>`).join(''); const html=`<html><head><title>Expense List</title><style>@page{margin:15mm;}body{font-family:sans-serif;font-size:12px;}h2{text-align:center;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px;font-size:11px;}th{background:#f5f5f5;}</style></head><body><h2>${esc(SHOP_SETTINGS.name)} - Expense List</h2><p>Total: ${fmtCurrency(total)} | Records: ${list.length}</p><table><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Paid By</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></body></html>`; printHTMLContent(html); }

        const staffFormEl = document.getElementById('staffForm');
        if (staffFormEl) {
            staffFormEl.addEventListener('submit',async function(e){ e.preventDefault(); const data={name:document.getElementById('st_name').value.trim(),designation:document.getElementById('st_designation').value.trim(),mobile:document.getElementById('st_mobile').value.trim(),opening_balance:parseFloat(document.getElementById('st_opening').value)||0,notes:document.getElementById('st_notes').value.trim(),updatedAt:new Date().toISOString()}; if(!data.name){showToast('Enter staff name','error');return;} try{ if(editingStaffId){await FrameworkDB.update('staffs',editingStaffId,data);showToast('✅ Staff updated!');}else{data.createdAt=new Date().toISOString();await FrameworkDB.save('staffs',data);showToast('✅ Staff saved!');} resetStaffForm();await loadData(); }catch(err){showToast('❌ '+err.message,'error');} });
        }
        const staffSalaryFormEl = document.getElementById('staffSalaryForm');
        if (staffSalaryFormEl) {
            staffSalaryFormEl.addEventListener('submit',async function(e){ e.preventDefault(); const staffId=document.getElementById('ss_staff').value, amount=parseFloat(document.getElementById('ss_amount').value)||0, method=document.getElementById('ss_method').value, salaryDate=document.getElementById('ss_date').value; const data={staff_id:parseInt(staffId,10),amount,salary_date:salaryDate,paid_by:method,entry_type:method==='Due'?'Due':'Payment',notes:document.getElementById('ss_notes').value.trim(),updatedAt:new Date().toISOString()}; if(!data.staff_id){showToast('Select staff','error');return;} if(amount<=0){showToast('Enter valid amount','error');return;} try{ let savedId; if(editingStaffSalaryId){const prev=staffSalaryEntries.find(r=>r.id==editingStaffSalaryId); await FrameworkDB.update('staff_salary_entries',editingStaffSalaryId,data); savedId=editingStaffSalaryId; if(prev?.source_expense_id){ if(method==='Due'){ await FrameworkDB.delete('expenses', prev.source_expense_id); }else{ await FrameworkDB.update('expenses', prev.source_expense_id,{category:'Staff Salary',amount,expense_date:salaryDate,paid_by:method,notes:`Staff: ${getStaffDisplayName(staffs.find(s=>s.id==data.staff_id))}${data.notes?' | '+data.notes:''}`,updatedAt:new Date().toISOString()}); } }else if(method!=='Due'){ const staff=staffs.find(s=>s.id==data.staff_id); const exp=await FrameworkDB.save('expenses',{category:'Staff Salary',amount,salary_date:salaryDate,expense_date:salaryDate,paid_by:method,notes:`Staff: ${getStaffDisplayName(staff)}${data.notes?' | '+data.notes:''}`,createdAt:new Date().toISOString(),source_type:'staff_salary',source_id:savedId}); await FrameworkDB.update('staff_salary_entries', savedId, {source_expense_id: exp?.id || exp}); } showToast('✅ Salary updated!'); }else{data.createdAt=new Date().toISOString();const r=await FrameworkDB.save('staff_salary_entries',data);savedId=r?.id||r;if(method!=='Due'){const staff=staffs.find(s=>s.id==data.staff_id);const exp=await FrameworkDB.save('expenses',{category:'Staff Salary',amount,salary_date:salaryDate,expense_date:salaryDate,paid_by:method,notes:`Staff: ${getStaffDisplayName(staff)}${data.notes?' | '+data.notes:''}`,createdAt:new Date().toISOString(),source_type:'staff_salary',source_id:savedId}); await FrameworkDB.update('staff_salary_entries', savedId, {source_expense_id: exp?.id || exp});} showToast('✅ Salary recorded!');} resetStaffSalaryForm();await loadData(); if(currentStaffLedgerId) renderStaffLedger(currentStaffLedgerId); }catch(err){showToast('❌ '+err.message,'error');} });
        }
        document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',function(e){if(e.target===this)this.classList.remove('show');}));
        document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.modal-overlay.show').forEach(m=>m.classList.remove('show'));});
        init();
    