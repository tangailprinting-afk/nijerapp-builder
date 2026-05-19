import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ------------- Firebase কনফিগ -------------
const firebaseConfig = {
  apiKey: "AIzaSyCDhybF3cOOPnzKvG6g0kXRmWWBjbP7_KA",
  authDomain: "bakihisabyousuf.firebaseapp.com",
  projectId: "bakihisabyousuf",
  storageBucket: "bakihisabyousuf.firebasestorage.app",
  messagingSenderId: "1039052204987",
  appId: "1:1039052204987:web:a4aa0009d9d011633bb29e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const imgbbKey = "54be6a546843ad33762fa8da6870d5ca";

// ------------- গ্লোবাল স্টেট -------------
let allCustomers = [];
let allProducts = [];
let allMemos = [];
let currentDetailCustomerId = null;
let currentPaymentMemoId = null;
let currentViewMemoId = null;
let homeFilter = "all";
let productRowsCount = 0;

// ------------- ইউটিলিটি -------------
function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.style.background = isError ? "#dc2626" : "#1e293b";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function toggleLoader(show) {
  document.getElementById("loader").style.display = show ? "flex" : "none";
}

window.previewImg = (input, imgId) => {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById(imgId);
    img.src = e.target.result;
    img.style.display = "block";
  };
  reader.readAsDataURL(file);
};

async function uploadImg(file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append("image", file);
  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return data.success ? data.data.url : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// ------------- সেকশন সুইচ -------------
window.showSection = (id) => {
  document.querySelectorAll("section").forEach((s) => (s.style.display = "none"));
  document.getElementById(id).style.display = "block";
  document.querySelectorAll(".bottom-nav button").forEach((btn) => btn.classList.remove("active-tab"));
  const navMap = {
    "home-sec": "btn-home",
    "customer-sec": "btn-customer",
    "product-sec": "btn-product",
    "memo-sec": "btn-memo",
    "customer-detail-sec": "btn-customer",
    "product-detail-sec": "btn-product"
  };
  if (navMap[id]) document.getElementById(navMap[id]).classList.add("active-tab");
};

// ------------- কাস্টমার CRUD -------------
window.saveCustomer = async () => {
  const name = document.getElementById("custName").value.trim();
  const mobile = document.getElementById("custMobile").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const editId = document.getElementById("custEditId").value;
  const file = document.getElementById("custImg").files[0];

  if (!name || !mobile) return showToast("নাম ও মোবাইল নম্বর আবশ্যক", true);

  toggleLoader(true);
  let imageUrl = null;
  if (file) imageUrl = await uploadImg(file);

  const customerData = { name, mobile, address: address || "" };
  if (imageUrl) customerData.image = imageUrl;

  try {
    if (editId) {
      if (!imageUrl) delete customerData.image;
      await updateDoc(doc(db, "customers", editId), customerData);
      showToast("কাস্টমার আপডেট হয়েছে");
    } else {
      customerData.createdAt = serverTimestamp();
      if (!imageUrl) customerData.image = "https://via.placeholder.com/150";
      await addDoc(collection(db, "customers"), customerData);
      showToast("কাস্টমার সংরক্ষিত");
    }
    resetCustomerForm();
  } catch (e) {
    console.error(e);
    showToast("সেভ করতে সমস্যা হয়েছে", true);
  } finally {
    toggleLoader(false);
  }
};

window.editCustomer = (customerId) => {
  const customer = allCustomers.find((c) => c.id === customerId);
  if (!customer) return;
  document.getElementById("custEditId").value = customer.id;
  document.getElementById("custName").value = customer.name;
  document.getElementById("custMobile").value = customer.mobile;
  document.getElementById("custAddress").value = customer.address || "";
  document.getElementById("customerFormTitle").textContent = "কাস্টমার সম্পাদনা";
  const preview = document.getElementById("cPre");
  preview.src = customer.image || "https://via.placeholder.com/150";
  preview.style.display = "block";
  document.getElementById("custImg").value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteCustomer = async (customerId) => {
  if (!confirm("কাস্টমারটি মুছে ফেলতে চান?")) return;
  try {
    await deleteDoc(doc(db, "customers", customerId));
    showToast("কাস্টমার মুছে ফেলা হয়েছে");
  } catch (e) {
    console.error(e);
    showToast("মুছতে সমস্যা হয়েছে", true);
  }
};

function resetCustomerForm() {
  document.getElementById("custEditId").value = "";
  document.getElementById("custName").value = "";
  document.getElementById("custMobile").value = "";
  document.getElementById("custAddress").value = "";
  document.getElementById("custImg").value = "";
  document.getElementById("cPre").style.display = "none";
  document.getElementById("customerFormTitle").textContent = "নতুন কাস্টমার";
}

// ------------- পণ্য CRUD -------------
window.saveProduct = async () => {
  const name = document.getElementById("prodName").value.trim();
  const desc = document.getElementById("prodDesc").value.trim();
  const price = parseFloat(document.getElementById("prodPrice").value) || 0;
  const stock = parseInt(document.getElementById("prodStock").value) || 0;
  const editId = document.getElementById("prodEditId").value;
  const file = document.getElementById("prodImg").files[0];

  if (!name) return showToast("পণ্যের নাম আবশ্যক", true);

  toggleLoader(true);
  let imageUrl = null;
  if (file) imageUrl = await uploadImg(file);

  const productData = { name, description: desc || "", price, stock };
  if (imageUrl) productData.image = imageUrl;

  try {
    if (editId) {
      if (!imageUrl) delete productData.image;
      await updateDoc(doc(db, "products", editId), productData);
      showToast("পণ্য আপডেট হয়েছে");
    } else {
      productData.createdAt = serverTimestamp();
      if (!imageUrl) productData.image = "https://via.placeholder.com/150";
      await addDoc(collection(db, "products"), productData);
      showToast("পণ্য সংরক্ষিত");
    }
    resetProductForm();
  } catch (e) {
    console.error(e);
    showToast("সেভ করতে সমস্যা হয়েছে", true);
  } finally {
    toggleLoader(false);
  }
};

window.editProduct = (productId) => {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;
  document.getElementById("prodEditId").value = product.id;
  document.getElementById("prodName").value = product.name;
  document.getElementById("prodDesc").value = product.description || "";
  document.getElementById("prodPrice").value = product.price || "";
  document.getElementById("prodStock").value = product.stock || 0;
  document.getElementById("productFormTitle").textContent = "পণ্য সম্পাদনা";
  const preview = document.getElementById("pPre");
  preview.src = product.image || "https://via.placeholder.com/150";
  preview.style.display = "block";
  document.getElementById("prodImg").value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteProduct = async (productId) => {
  if (!confirm("পণ্যটি মুছে ফেলতে চান?")) return;
  try {
    await deleteDoc(doc(db, "products", productId));
    showToast("পণ্য মুছে ফেলা হয়েছে");
  } catch (e) {
    console.error(e);
    showToast("মুছতে সমস্যা হয়েছে", true);
  }
};

function resetProductForm() {
  document.getElementById("prodEditId").value = "";
  document.getElementById("prodName").value = "";
  document.getElementById("prodDesc").value = "";
  document.getElementById("prodPrice").value = "";
  document.getElementById("prodStock").value = "";
  document.getElementById("prodImg").value = "";
  document.getElementById("pPre").style.display = "none";
  document.getElementById("productFormTitle").textContent = "নতুন পণ্য";
}

// ------------- পণ্য বিস্তারিত -------------
window.openProductDetail = (productId) => {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;
  document.getElementById("prodDetailName").textContent = product.name;
  document.getElementById("prodDetailDesc").textContent = product.description || "";
  document.getElementById("prodDetailPrice").textContent = product.price || "-";
  document.getElementById("prodDetailStock").textContent = product.stock || 0;
  document.getElementById("prodDetailImg").src = product.image || "https://via.placeholder.com/150";
  window._currentProductId = productId;
  showSection("product-detail-sec");
};

window.editProductFromDetail = () => {
  if (window._currentProductId) {
    editProduct(window._currentProductId);
    showSection("product-sec");
  }
};

// ------------- মেমো পণ্য সারি (datalist সহ) -------------
window.addProductRow = () => {
  const rowsDiv = document.getElementById("productRows");
  const idx = productRowsCount++;
  const div = document.createElement("div");
  div.className = "product-row";
  div.id = `row-${idx}`;
  div.innerHTML = `
    <div style="position:relative;">
      <input type="text" list="productDataList" id="prodInput-${idx}" placeholder="পণ্য / সেবা" 
             onchange="onProductInputChange(${idx})" oninput="updateRowTotal(${idx})">
      <input type="hidden" id="prodId-${idx}">
    </div>
    <input type="number" id="qty-${idx}" value="1" min="1" oninput="updateRowTotal(${idx})">
    <input type="number" id="unitPrice-${idx}" value="0" step="0.01" oninput="updateRowTotal(${idx})">
    <span id="rowTotal-${idx}">0</span>
    <button class="remove-btn" onclick="removeRow('${idx}')"><i class="fas fa-trash-alt"></i></button>
  `;
  rowsDiv.appendChild(div);
  updateMemoTotal();
};

window.removeRow = (idx) => {
  document.getElementById(`row-${idx}`).remove();
  updateMemoTotal();
};

window.onProductInputChange = (idx) => {
  const inputVal = document.getElementById(`prodInput-${idx}`).value.trim();
  const matchedProduct = allProducts.find((p) => p.name === inputVal);
  if (matchedProduct) {
    document.getElementById(`unitPrice-${idx}`).value = matchedProduct.price || 0;
    document.getElementById(`prodId-${idx}`).value = matchedProduct.id;
  } else {
    document.getElementById(`unitPrice-${idx}`).value = 0;
    document.getElementById(`prodId-${idx}`).value = "";
  }
  updateRowTotal(idx);
};

window.updateRowTotal = (idx) => {
  const qty = parseInt(document.getElementById(`qty-${idx}`).value) || 0;
  const price = parseFloat(document.getElementById(`unitPrice-${idx}`).value) || 0;
  document.getElementById(`rowTotal-${idx}`).textContent = (qty * price).toFixed(2);
  updateMemoTotal();
};

window.updateMemoTotal = () => {
  let subtotal = 0;
  document.querySelectorAll(".product-row").forEach((row) => {
    const idx = row.id.split("-")[1];
    subtotal += parseFloat(document.getElementById(`rowTotal-${idx}`).textContent) || 0;
  });
  const discount = parseFloat(document.getElementById("discountInput").value) || 0;
  const total = Math.max(0, subtotal - discount);
  const paid = parseFloat(document.getElementById("paidAmount").value) || 0;
  const due = total - paid;

  document.getElementById("subtotalDisplay").textContent = subtotal.toFixed(2);
  document.getElementById("totalDisplay").textContent = total.toFixed(2);
  const dueSpan = document.getElementById("liveDue");
  dueSpan.textContent = due.toFixed(2);

  const dueDiv = document.querySelector(".due-display");
  if (due > 0) {
    dueDiv.style.background = "#fff1f2";
    dueDiv.style.color = "#ef4444";
  } else {
    dueDiv.style.background = "#f0fdf4";
    dueDiv.style.color = "#10b981";
  }
};

// ------------- মেমো সেভ (প্রিন্ট ছাড়া) -------------
window.createMemo = async () => {
  const customerName = document.getElementById("selectCustomer").value;
  if (!customerName) return showToast("কাস্টমার নির্বাচন করুন", true);

  const rows = document.querySelectorAll(".product-row");
  if (rows.length === 0) return showToast("অন্তত একটি পণ্য দিন", true);

  const items = [];
  for (const row of rows) {
    const idx = row.id.split("-")[1];
    const productName = document.getElementById(`prodInput-${idx}`).value.trim();
    if (!productName) return showToast("প্রতিটি সারিতে পণ্য/সেবা লিখুন", true);
    const quantity = parseInt(document.getElementById(`qty-${idx}`).value);
    if (!quantity || quantity <= 0) return showToast("পরিমাণ সঠিক নয়", true);
    const unitPrice = parseFloat(document.getElementById(`unitPrice-${idx}`).value);
    if (isNaN(unitPrice) || unitPrice < 0) return showToast("একক মূল্য সঠিক নয়", true);
    const total = quantity * unitPrice;
    const productId = document.getElementById(`prodId-${idx}`).value || null;
    items.push({ productName, quantity, unitPrice, total, productId });
  }

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discount = parseFloat(document.getElementById("discountInput").value) || 0;
  const total = Math.max(0, subtotal - discount);
  const paid = parseFloat(document.getElementById("paidAmount").value) || 0;
  const due = total - paid;

  if (due < 0) return showToast("জমা মোটের চেয়ে বেশি হতে পারে না", true);

  toggleLoader(true);
  try {
    // স্টক আপডেট (শুধু বিদ্যমান পণ্যের জন্য)
    for (const item of items) {
      if (item.productId) {
        const prodRef = doc(db, "products", item.productId);
        await runTransaction(db, async (tx) => {
          const prodDoc = await tx.get(prodRef);
          if (!prodDoc.exists()) throw `"${item.productName}" পণ্য নেই`;
          const stock = prodDoc.data().stock || 0;
          if (stock < item.quantity) throw `"${item.productName}" স্টকে পর্যাপ্ত নেই`;
          tx.update(prodRef, { stock: stock - item.quantity });
        });
      }
    }

    const memoData = {
      customerName,
      items,
      subtotal,
      discount,
      total,
      paid,
      due,
      date: new Date().toISOString()
    };
    await addDoc(collection(db, "memos"), memoData);

    // ফর্ম রিসেট
    document.getElementById("productRows").innerHTML = "";
    document.getElementById("discountInput").value = 0;
    document.getElementById("paidAmount").value = 0;
    updateMemoTotal();
    addProductRow();
    showToast("মেমো সংরক্ষিত হয়েছে");
  } catch (e) {
    console.error(e);
    showToast(typeof e === "string" ? e : "মেমো সংরক্ষণ ব্যর্থ", true);
  } finally {
    toggleLoader(false);
  }
};

// ------------- মেমো বিস্তারিত মোডাল (ভিউ ও প্রিন্ট) -------------
window.viewMemo = (memoId) => {
  currentViewMemoId = memoId;
  const m = allMemos.find((m) => m.id === memoId);
  if (!m) return;
  const detailHtml = `
    <p><strong>কাস্টমার:</strong> ${m.customerName}</p>
    <p><strong>তারিখ:</strong> ${new Date(m.date).toLocaleString("bn-BD")}</p>
    <table style="width:100%; border-collapse:collapse; margin:10px 0;">
      <tr style="background:#f8fafc;"><th>পণ্য/সেবা</th><th>পরিমাণ</th><th>একক মূল্য</th><th>মোট</th></tr>
      ${m.items.map((i) => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>${i.unitPrice}</td><td>${i.total}</td></tr>`).join("")}
    </table>
    <p><strong>সাবটোটাল:</strong> ${m.subtotal.toFixed(2)} টাকা</p>
    <p><strong>ডিসকাউন্ট:</strong> ${m.discount.toFixed(2)} টাকা</p>
    <p><strong>মোট:</strong> ${m.total.toFixed(2)} টাকা</p>
    <p><strong>জমা:</strong> ${m.paid.toFixed(2)} টাকা</p>
    <p style="color:#ef4444; font-weight:bold;">বাকি: ${m.due.toFixed(2)} টাকা</p>
  `;
  document.getElementById("memoDetailContent").innerHTML = detailHtml;
  document.getElementById("memoDetailModal").style.display = "flex";
};

window.closeMemoDetail = () => {
  document.getElementById("memoDetailModal").style.display = "none";
};

window.printMemoFromDetail = () => {
  if (!currentViewMemoId) return;
  const m = allMemos.find((m) => m.id === currentViewMemoId);
  if (!m) return;
  const w = window.open("", "_blank", "width=800,height=600");
  w.document.write(`
    <html><head><title>মেমো</title>
    <style>body{font-family:'Segoe UI',sans-serif;padding:30px;} table{width:100%;border-collapse:collapse;margin:20px 0;} th,td{border:1px solid #ddd;padding:8px;}</style>
    </head><body>
      <h2>মেমো</h2>
      <p><strong>কাস্টমার:</strong> ${m.customerName}</p>
      <table><tr><th>পণ্য</th><th>পরিমাণ</th><th>একক মূল্য</th><th>মোট</th></tr>
        ${m.items.map((i) => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>${i.unitPrice}</td><td>${i.total}</td></tr>`).join("")}
      </table>
      <p>সাবটোটাল: ${m.subtotal.toFixed(2)} টাকা</p>
      <p>ডিসকাউন্ট: ${m.discount.toFixed(2)} টাকা</p>
      <p>মোট: ${m.total.toFixed(2)} টাকা</p>
      <p>জমা: ${m.paid.toFixed(2)} টাকা</p>
      <p style="color:#ef4444;">বাকি: ${m.due.toFixed(2)} টাকা</p>
      <p>তারিখ: ${new Date(m.date).toLocaleString("bn-BD")}</p>
      <script>window.print();setTimeout(window.close,500)<\/script>
    </body></html>
  `);
};

// ------------- কাস্টমার বিস্তারিত -------------
window.openCustomerDetail = (customerId) => {
  currentDetailCustomerId = customerId;
  const customer = allCustomers.find((c) => c.id === customerId);
  if (!customer) return;
  document.getElementById("custDetailName").textContent = customer.name;
  document.getElementById("custDetailMobile").textContent = customer.mobile;
  document.getElementById("custDetailAddress").textContent = customer.address || "";
  document.getElementById("custDetailImg").src = customer.image || "https://via.placeholder.com/150";
  loadCustomerDetail();
  showSection("customer-detail-sec");
};

function loadCustomerDetail() {
  if (!currentDetailCustomerId) return;
  const customer = allCustomers.find((c) => c.id === currentDetailCustomerId);
  if (!customer) return;

  let memos = allMemos.filter((m) => m.customerName === customer.name);

  const fromDate = document.getElementById("detailFromDate").value;
  const toDate = document.getElementById("detailToDate").value;
  if (fromDate) {
    memos = memos.filter((m) => new Date(m.date) >= new Date(fromDate));
  }
  if (toDate) {
    const toDateObj = new Date(toDate);
    toDateObj.setHours(23, 59, 59, 999);
    memos = memos.filter((m) => new Date(m.date) <= toDateObj);
  }

  let totalBuy = 0,
    totalDue = 0;
  let html = "";
  memos.forEach((memo) => {
    totalBuy += memo.total;
    totalDue += memo.due;
    html += `
      <div class="memo-card" onclick="viewMemo('${memo.id}')">
        <div class="memo-info">
          <strong>${new Date(memo.date).toLocaleString("bn-BD", { hour12: true })}</strong><br>
          <small>${memo.items.map((i) => i.productName).join(", ")}</small>
        </div>
        <div class="amount">
          ৳${memo.total.toFixed(2)}
          <div class="due">বাকি: ${memo.due.toFixed(2)}</div>
        </div>
      </div>`;
  });
  document.getElementById("custTotalBuy").textContent = totalBuy.toFixed(2);
  document.getElementById("custTotalDue").textContent = totalDue.toFixed(2);
  document.getElementById("customerMemosList").innerHTML =
    html || '<p class="empty-state">কোনো লেনদেন নেই</p>';
}

window.payAllDue = () => {
  if (!currentDetailCustomerId) return;
  const customer = allCustomers.find((c) => c.id === currentDetailCustomerId);
  if (!customer) return;
  const dueMemos = allMemos.filter((m) => m.customerName === customer.name && m.due > 0);
  if (dueMemos.length === 0) return showToast("কোনো বাকি নেই");
  openPaymentModal(dueMemos[0].id);
};

// ------------- পেমেন্ট মোডাল -------------
window.openPaymentModal = (memoId) => {
  currentPaymentMemoId = memoId;
  const m = allMemos.find((m) => m.id === memoId);
  if (!m) return;
  document.getElementById("paymentMemoInfo").innerHTML = `
    <strong>${m.customerName}</strong><br>
    মোট: ৳${m.total.toFixed(2)} | জমা: ৳${m.paid.toFixed(2)} | বাকি: ৳${m.due.toFixed(2)}
  `;
  document.getElementById("paymentAmount").value = m.due.toFixed(2);
  document.getElementById("paymentModal").style.display = "flex";
};

window.submitPayment = async () => {
  const amount = parseFloat(document.getElementById("paymentAmount").value);
  if (!amount || amount <= 0) return showToast("সঠিক পরিমাণ দিন", true);
  const m = allMemos.find((m) => m.id === currentPaymentMemoId);
  if (!m || amount > m.due) return showToast("জমা বাকির বেশি হতে পারবে না", true);

  const newPaid = m.paid + amount;
  const newDue = m.total - newPaid;
  try {
    await updateDoc(doc(db, "memos", currentPaymentMemoId), {
      paid: newPaid,
      due: newDue
    });
    showToast("জমা সফল হয়েছে");
    closePaymentModal();
  } catch (e) {
    console.error(e);
    showToast("জমা নেওয়া যায়নি", true);
  }
};

window.closePaymentModal = () => {
  document.getElementById("paymentModal").style.display = "none";
};

// ------------- হোম রেন্ডার (ফিল্টার ও সার্চ) -------------
function renderHome(searchTerm = "") {
  let filteredCustomers = [...allCustomers];
  let filteredMemos = [...allMemos];

  const term = searchTerm.trim().toLowerCase();
  if (term) {
    filteredCustomers = filteredCustomers.filter(
      (c) => (c.name || "").toLowerCase().includes(term) || (c.mobile || "").includes(term)
    );
    filteredMemos = filteredMemos.filter((m) =>
      (m.customerName || "").toLowerCase().includes(term)
    );
  }

  if (homeFilter === "due") {
    filteredMemos = filteredMemos.filter((m) => m.due > 0);
    filteredCustomers = filteredCustomers.filter((c) =>
      filteredMemos.some((m) => m.customerName === c.name)
    );
  } else if (homeFilter === "today") {
    const todayStr = new Date().toLocaleDateString("bn-BD");
    filteredMemos = filteredMemos.filter((m) => {
      const mDate = new Date(m.date).toLocaleDateString("bn-BD");
      return mDate === todayStr;
    });
    filteredCustomers = filteredCustomers.filter((c) =>
      filteredMemos.some((m) => m.customerName === c.name)
    );
  }

  // বাকি পাওনা কাস্টমার
  const dueCustomers = filteredCustomers.filter((c) =>
    filteredMemos.some((m) => m.customerName === c.name && m.due > 0)
  );
  document.getElementById("dueCustomerList").innerHTML = dueCustomers.length
    ? dueCustomers
        .map((c) => {
          const due = filteredMemos
            .filter((m) => m.customerName === c.name)
            .reduce((s, m) => s + m.due, 0);
          return `<div class="cust-card" onclick="openCustomerDetail('${c.id}')">
            <div class="name">${c.name}</div><div class="mobile">${c.mobile}</div>
            <div class="due">বাকি: ৳${due.toFixed(2)}</div>
          </div>`;
        })
        .join("")
    : '<span class="empty-state">কোনো বাকি নেই</span>';

  // নতুন কাস্টমার
  const newCustomers = filteredCustomers
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, 10);
  document.getElementById("newCustomerList").innerHTML = newCustomers.length
    ? newCustomers
        .map(
          (c) => `<div class="cust-card" onclick="openCustomerDetail('${c.id}')">
            <div class="name">${c.name}</div><div class="mobile">${c.mobile}</div>
          </div>`
        )
        .join("")
    : '<span class="empty-state">নেই</span>';

  // সাম্প্রতিক মেমো
  const recentMemos = filteredMemos
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);
  document.getElementById("recentMemos").innerHTML = recentMemos.length
    ? recentMemos
        .map(
          (m) => `
      <div class="memo-card" onclick="viewMemo('${m.id}')">
        <div class="memo-info">
          <strong>${m.customerName}</strong><br>
          <small>${new Date(m.date).toLocaleString("bn-BD", { hour12: true })}</small>
        </div>
        <div class="amount">
          ৳${m.total.toFixed(2)}
          <div class="due">বাকি: ${m.due.toFixed(2)}</div>
        </div>
      </div>`
        )
        .join("")
    : '<p class="empty-state">কোনো মেমো নেই</p>';
}

window.setHomeFilter = (filter) => {
  homeFilter = filter;
  document.querySelectorAll(".filter-chips .chip").forEach((chip) => chip.classList.remove("active"));
  document.querySelector(`.filter-chips .chip[data-filter="${filter}"]`).classList.add("active");
  renderHome();
};

window.toggleSearch = () => {
  const searchBar = document.getElementById("searchBar");
  searchBar.classList.toggle("hidden");
  if (!searchBar.classList.contains("hidden")) {
    document.getElementById("globalSearchInput").focus();
  } else {
    document.getElementById("globalSearchInput").value = "";
    renderHome();
  }
};

window.globalSearch = (value) => {
  renderHome(value);
};

// ------------- তালিকা ফিল্টার (কাস্টমার/পণ্য) -------------
window.filterList = (containerId, searchTerm) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  const items = container.querySelectorAll(".list-item");
  const term = searchTerm.toLowerCase();
  items.forEach((item) => {
    const nameEl = item.querySelector(".name");
    const metaEl = item.querySelector(".meta");
    const text = (nameEl?.textContent || "") + " " + (metaEl?.textContent || "");
    item.style.display = text.toLowerCase().includes(term) ? "" : "none";
  });
};

// ------------- ক্যালকুলেটর -------------
function buildCalculator() {
  const buttons = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+", "C"];
  const container = document.getElementById("calcButtons");
  container.innerHTML = "";
  buttons.forEach((sym) => {
    const btn = document.createElement("button");
    btn.textContent = sym;
    if (sym === "=") btn.className = "equal";
    else if (["+", "-", "*", "/"].includes(sym)) btn.className = "operator";
    btn.onclick = () => {
      const scr = document.getElementById("calcScreen");
      if (sym === "C") scr.value = "";
      else if (sym === "=") {
        try { scr.value = eval(scr.value); } catch { scr.value = "ভুল"; }
      } else scr.value += sym;
    };
    container.appendChild(btn);
  });
}

window.openCalculator = () => {
  document.getElementById("calcModal").style.display = "flex";
};
window.closeCalculator = () => {
  document.getElementById("calcModal").style.display = "none";
};

// ------------- ইনিশিয়ালাইজ -------------
function initApp() {
  // কাস্টমার রিয়েল-টাইম
  onSnapshot(collection(db, "customers"), (snap) => {
    allCustomers = [];
    snap.forEach((doc) => allCustomers.push({ id: doc.id, ...doc.data() }));

    const custSelect = document.getElementById("selectCustomer");
    if (custSelect) {
      custSelect.innerHTML = '<option value="">কাস্টমার সিলেক্ট করুন</option>';
      allCustomers.forEach((c) => {
        custSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
      });
    }

    const listContainer = document.getElementById("customerList");
    if (listContainer) {
      listContainer.innerHTML = allCustomers
        .map(
          (c) => `
        <div class="list-item" onclick="openCustomerDetail('${c.id}')">
          <img src="${c.image || "https://via.placeholder.com/150"}" onerror="this.src='https://via.placeholder.com/150'">
          <div class="info">
            <span class="name">${c.name}</span>
            <span class="meta">${c.mobile}</span>
          </div>
          <div class="actions" onclick="event.stopPropagation()">
            <button onclick="editCustomer('${c.id}')"><i class="fas fa-edit"></i></button>
            <button onclick="deleteCustomer('${c.id}')"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>`
        )
        .join("");
    }
    renderHome();
  });

  // পণ্য রিয়েল-টাইম
  onSnapshot(collection(db, "products"), (snap) => {
    allProducts = [];
    snap.forEach((doc) => allProducts.push({ id: doc.id, ...doc.data() }));

    const prodList = document.getElementById("productList");
    if (prodList) {
      prodList.innerHTML = allProducts
        .map(
          (p) => `
        <div class="list-item" onclick="openProductDetail('${p.id}')">
          <img src="${p.image || "https://via.placeholder.com/150"}" onerror="this.src='https://via.placeholder.com/150'">
          <div class="info">
            <span class="name">${p.name}</span>
            <span class="meta">মূল্য: ${p.price || "-"} | স্টক: ${p.stock || 0}</span>
          </div>
          <div class="actions" onclick="event.stopPropagation()">
            <button onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i></button>
            <button onclick="deleteProduct('${p.id}')"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>`
        )
        .join("");
    }

    // ডাটালিস্ট আপডেট (মেমো ফর্মের জন্য)
    const dataList = document.getElementById("productDataList");
    if (dataList) {
      dataList.innerHTML = allProducts.map((p) => `<option value="${p.name}">`).join("");
    }

    // ইতিমধ্যে খোলা মেমো রো-গুলোর ডাটালিস্ট রিফ্রেশ
    document.querySelectorAll('[id^="prodInput-"]').forEach((input) => {
      // datalist গ্লোবাল, তাই আলাদা করে কিছু করতে হবে না
    });
  });

  // মেমো রিয়েল-টাইম
  onSnapshot(query(collection(db, "memos"), orderBy("date", "desc")), (snap) => {
    allMemos = [];
    snap.forEach((doc) => allMemos.push({ id: doc.id, ...doc.data() }));

    let totalSales = 0,
      totalDue = 0;
    allMemos.forEach((m) => {
      totalSales += m.total;
      totalDue += m.due;
    });
    document.getElementById("totalSales").textContent = totalSales;
    document.getElementById("totalDue").textContent = totalDue;

    renderHome();
    if (currentDetailCustomerId) loadCustomerDetail();
  });

  // বাটন ইভেন্ট
  document.getElementById("saveCustomerBtn").addEventListener("click", window.saveCustomer);
  document.getElementById("saveProductBtn").addEventListener("click", window.saveProduct);
  document.getElementById("addProductRowBtn").addEventListener("click", window.addProductRow);
  document.getElementById("createMemoBtn").addEventListener("click", window.createMemo);

  document.getElementById("calcToggleBtn").addEventListener("click", window.openCalculator);
  document.getElementById("closeCalcBtn").addEventListener("click", window.closeCalculator);
  document.getElementById("searchToggleBtn").addEventListener("click", window.toggleSearch);
  document.getElementById("closePaymentModalBtn").addEventListener("click", window.closePaymentModal);
  document.getElementById("submitPaymentBtn").addEventListener("click", window.submitPayment);
  document.getElementById("closeMemoDetailBtn").addEventListener("click", window.closeMemoDetail);
  document.getElementById("printMemoBtn").addEventListener("click", window.printMemoFromDetail);
  document.getElementById("payAllDueBtn")?.addEventListener("click", window.payAllDue);
  document.getElementById("editProdFromDetailBtn")?.addEventListener("click", window.editProductFromDetail);

  // নেভিগেশন
  document.querySelectorAll(".bottom-nav button").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.showSection(btn.dataset.section);
    });
  });
  document.getElementById("customerDetailBackBtn").addEventListener("click", () => {
    showSection("customer-sec");
  });
  document.getElementById("productDetailBackBtn").addEventListener("click", () => {
    showSection("product-sec");
  });

  // ডেট ফিল্টার
  document.getElementById("detailFromDate")?.addEventListener("change", loadCustomerDetail);
  document.getElementById("detailToDate")?.addEventListener("change", loadCustomerDetail);

  // ফিল্টার চিপ
  document.querySelectorAll(".filter-chips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      window.setHomeFilter(chip.dataset.filter);
    });
  });

  // গ্লোবাল সার্চ
  document.getElementById("globalSearchInput")?.addEventListener("input", (e) => {
    window.globalSearch(e.target.value);
  });

  // লোকাল সার্চ (কাস্টমার ও পণ্য)
  document.getElementById("searchCust")?.addEventListener("keyup", (e) => {
    window.filterList("customerList", e.target.value);
  });
  document.getElementById("searchProd")?.addEventListener("keyup", (e) => {
    window.filterList("productList", e.target.value);
  });

  // মেমো ক্যালকুলেশন রিয়েল-টাইম
  document.getElementById("discountInput")?.addEventListener("input", window.updateMemoTotal);
  document.getElementById("paidAmount")?.addEventListener("input", window.updateMemoTotal);

  // মোডাল বাইরে ক্লিক করলে বন্ধ
  window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("paymentModal")) closePaymentModal();
    if (e.target === document.getElementById("calcModal")) closeCalculator();
    if (e.target === document.getElementById("memoDetailModal")) closeMemoDetail();
  });

  // ক্যালকুলেটর তৈরি
  buildCalculator();

  // প্রথম পণ্য রো
  if (document.getElementById("productRows").children.length === 0) {
    addProductRow();
  }
}

// অ্যাপ চালু
initApp();