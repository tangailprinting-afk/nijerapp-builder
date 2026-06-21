# Print Shop Management System (PSMS)

## Overview
A complete business management system for a printing shop. Not just due tracking — it manages **Sales, Expenses, Employee Salaries, Customer Due, Supplier Due, Cash Flow, Daily Reports, and Profit Calculation**.

---

## 1. Dashboard

### KPI Cards
- Today's Sales
- Today's Collection
- Today's Expense
- Today's Due Collection
- Total Due (Receivable)
- Total Payable (Supplier Due)
- Cash Balance
- Monthly Profit

### Quick View
- Recent Sales (Last 10)
- Recent Collections
- Recent Expenses
- Low Stock Alerts (Paper/Ink etc.)

---

## 2. Customer Management

### Fields
- Customer Name
- Mobile Number
- Address
- Notes
- Opening Balance (if any old due)

### Functions
- Add / Edit / Delete Customer
- Search Customer
- View Customer Ledger (All Transactions)
- Customer Statement (Date-wise)
- Total Sales, Total Paid, Current Due

---

## 3. Sale Entry (Invoice)

### Sale Fields
- Invoice No (Auto: INV-001, INV-002...)
- Sale Date
- Customer (Optional — can be Walk-in)
- Due Date (If credit sale)

### Items (Multiple Items)
| # | Description | Quantity | Unit Price | Total |
|---|-------------|----------|------------|-------|
| 1 | Visiting Card (500 pcs) | 2 | 300 | 600 |
| 2 | Banner (4x2 ft) | 1 | 500 | 500 |

### Summary
- Subtotal
- Discount (Fixed ৳ or %)
- Grand Total
- Paid Amount
- Due Amount (Auto: GT - Paid)
- Payment Method (Cash / Bank / Mobile Banking / Due)
- Notes

### Functions
- Add Multiple Items
- Auto Calculate
- Discount (Fixed / Percent)
- Print Invoice (Thermal / A4)
- Invoice Preview
- Edit Sale
- Delete Sale
- If Due → Auto add to Customer Ledger

---

## 4. Collection Entry

### Fields
- Customer (Select)
- Amount
- Collection Date
- Payment Method
- Notes

### Functions
- Add Collection
- Auto Update Customer Due
- Show Customer Current Due on Select
- Collection History

---

## 5. Expense Management

### Expense Categories
- Paper Stock
- Ink / Toner
- Machine Maintenance
- Electricity
- Rent
- Salary (Advance)
- Transport
- Tea / Snacks
- Other

### Fields
- Expense Category
- Amount
- Date
- Notes
- Paid By

### Functions
- Add / Edit / Delete Expense
- Category-wise Filter
- Daily Expense Report
- Monthly Expense Report
- Expense Analytics (Category-wise Pie/Bar)

---

## 6. Supplier Management

### Fields
- Supplier Name
- Company Name
- Mobile
- Address
- Notes
- Opening Balance (Payable)

### Functions
- Add / Edit / Delete Supplier
- Supplier Ledger
- Supplier Payment
- Total Purchases, Total Paid, Current Payable

---

## 7. Purchase Entry (Stock In)

### Fields
- Supplier
- Purchase Date
- Invoice No

### Items
| # | Description | Quantity | Unit Price | Total |
|---|-------------|----------|------------|-------|

### Summary
- Subtotal
- Discount
- Grand Total
- Paid Amount
- Due Amount (Supplier Due)
- Notes

### Functions
- Add Multiple Items
- Auto Update Supplier Due
- Purchase History

---

## 8. Employee Management

### Fields
- Employee Name
- Mobile
- Designation
- Salary (Monthly)
- Joining Date
- Address
- Notes

### Functions
- Add / Edit / Delete Employee
- Employee List
- Salary History

---

## 9. Salary Payment

### Fields
- Employee (Select)
- Month / Year
- Salary Amount
- Bonus
- Deduction
- Net Pay
- Payment Date
- Notes

### Functions
- Auto Calculate Net Pay
- Salary History
- Monthly Salary Report

---

## 10. Cash Book

### Transactions
- Cash In (Sales Collection)
- Cash Out (Expenses, Salary, Supplier Payment)

### Fields
- Date
- Description
- Type (In / Out)
- Amount
- Balance (Running)

### Functions
- Daily Cash Report
- Opening Balance / Closing Balance
- Cash Flow Statement

---

## 11. Reports

### Sales Reports
- Daily Sales Report
- Monthly Sales Report
- Date Range Sales Report
- Customer-wise Sales Report

### Due Reports
- Customer Due Report
- Overdue Report
- Collection Schedule (Today / This Week)

### Expense Reports
- Daily Expense Report
- Monthly Expense Report
- Category-wise Expense Report

### Supplier Reports
- Supplier Due Report
- Purchase History

### Profit Report
- Revenue (Total Sales Collection)
- Expense (Total Expenses)
- Salary Paid
- Supplier Payment
- Net Profit = Revenue - (Expense + Salary + Supplier Payment)

---

## 12. Settings

- Shop Name
- Shop Address
- Phone Number
- Invoice Prefix
- Currency Symbol (৳)
- Default Due Days
- Low Stock Alert Quantity

---

## Database Tables

### customers
| id | name | mobile | address | notes | opening_balance | created_at |

### sales
| id | invoice_no | customer_id | sale_date | due_date | items (JSON) | subtotal | discount | discount_type | total_amount | paid_amount | due_amount | payment_method | notes | created_at |

### collections
| id | customer_id | amount | collection_date | payment_method | notes | created_at |

### expenses
| id | category | amount | expense_date | notes | paid_by | created_at |

### expense_categories
| id | name | created_at |

### suppliers
| id | name | company | mobile | address | notes | opening_balance | created_at |

### purchases
| id | invoice_no | supplier_id | purchase_date | items (JSON) | subtotal | discount | total_amount | paid_amount | due_amount | notes | created_at |

### supplier_payments
| id | supplier_id | amount | payment_date | payment_method | notes | created_at |

### employees
| id | name | mobile | designation | monthly_salary | joining_date | address | notes | created_at |

### salary_payments
| id | employee_id | month | year | salary_amount | bonus | deduction | net_pay | payment_date | notes | created_at |

### cash_book
| id | date | description | type (in/out) | amount | balance | reference | created_at |

### settings
| id | key | value |

---

## Main Objective
The software must answer:
- আজ কত বিক্রি হয়েছে?
- আজ কত টাকা জমা পড়েছে?
- আজ কত খরচ হয়েছে?
- কার কাছে কত টাকা পাই?
- কাকে কত টাকা দিতে হবে?
- ক্যাশে কত টাকা আছে?
- এই মাসে লাভ কত?
- কোন কাস্টমার বাকি দেয়নি?
- কোন সাপ্লায়ারকে পেমেন্ট দিতে হবে?
- কার কত বেতন বাকি?