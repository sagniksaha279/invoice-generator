require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 📧 MAIL CONFIG
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Serve uploads
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, `sig_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ─────────────────────────────────────────────
// INVOICE HTML GENERATOR
// ─────────────────────────────────────────────
function buildInvoiceHTML(invoice) {
  const {
    invoiceNo,
    invoiceDate,
    dueDate,
    billedByName,
    billedByCity,
    billedByState,
    billedByCountry,
    billedByEmail,
    billedByInstagram,
    billedToName,
    billedToAddress,
    billedToGSTIN,
    billedToPAN,
    countryOfSupply,
    placeOfSupply,
    items = [],
    signatureUrl,
    clientEmail,
    notes = [],
    contactEmail,
    contactPhone,
  } = invoice;

  // Compute totals
  const subtotal = items.reduce((sum, item) => {
    const rate = parseFloat(item.rate) || 0;
    const qty = parseFloat(item.quantity) || 1;
    return sum + rate * qty;
  }, 0);

  const totalIGST = items.reduce((sum, item) => {
    const rate = parseFloat(item.rate) || 0;
    const qty = parseFloat(item.quantity) || 1;
    const gstRate = parseFloat(item.gstRate) || 0;
    const amount = rate * qty;
    return sum + (amount * gstRate) / 100;
  }, 0);

  const grandTotal = subtotal + totalIGST;

  const fmt = (n) =>
    "₹" +
    parseFloat(n).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const itemRows = items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}.</td>
        <td>${item.description || ""}</td>
        <td class="center">${item.gstRate != null ? item.gstRate + "%" : "0%"}</td>
        <td class="center">${item.quantity || 1}</td>
        <td class="right">${fmt(item.rate)}</td>
        <td class="right">${fmt((parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 1))}</td>
        <td class="right">${fmt(
          ((parseFloat(item.rate) || 0) *
            (parseFloat(item.quantity) || 1) *
            (parseFloat(item.gstRate) || 0)) /
            100
        )}</td>
        <td class="right">${fmt(
          (parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 1) +
            ((parseFloat(item.rate) || 0) *
              (parseFloat(item.quantity) || 1) *
              (parseFloat(item.gstRate) || 0)) /
              100
        )}</td>
      </tr>
    `
    )
    .join("");

  const notesList = notes
    .map((n) => `<li>${n}</li>`)
    .join("");

  const sigHtml = signatureUrl
    ? `<img src="${signatureUrl}" alt="Signature" style="max-width:160px;max-height:60px;object-fit:contain;" />`
    : `<div style="height:60px;"></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #374151;
    background: #fff;
    padding: 32px 36px;
  }

  /* ── Title ── */
  h1.invoice-title {
    font-size: 32px;
    font-weight: 400;
    color: #7C3AED;
    margin-bottom: 16px;
  }

  /* ── Meta rows ── */
  .meta-table { border-collapse: collapse; margin-bottom: 20px; }
  .meta-table td { padding: 2px 0; font-size: 13px; }
  .meta-table td:first-child { color: #9CA3AF; width: 110px; }
  .meta-table td:last-child { font-weight: 600; color: #111827; }

  /* ── Billed By / To ── */
  .billed-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }
  .billed-card {
    background: #F5F3FF;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
    padding: 14px 16px;
  }
  .billed-card h3 {
    font-size: 14px;
    font-weight: 700;
    color: #7C3AED;
    margin-bottom: 8px;
  }
  .billed-card p {
    font-size: 12.5px;
    color: #374151;
    line-height: 1.6;
  }
  .billed-card p span.label { font-weight: 600; color: #111827; }

  /* ── Supply row ── */
  .supply-row {
    display: flex;
    justify-content: space-between;
    font-size: 12.5px;
    color: #374151;
    margin-bottom: 10px;
    padding: 0 2px;
  }
  .supply-row span b { color: #111827; }

  /* ── Items Table ── */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0;
    table-layout: fixed;
  }
  .items-table thead tr {
    background: #6D28D9;
  }
  .items-table thead th {
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    padding: 9px 8px;
    text-align: left;
  }
  .items-table thead th.center { text-align: center; }
  .items-table thead th.right { text-align: right; }

  .items-table tbody tr:nth-child(even) { background: #F9FAFB; }
  .items-table tbody tr:nth-child(odd)  { background: #fff; }
  .items-table tbody td {
    padding: 9px 8px;
    font-size: 12.5px;
    color: #374151;
    border-bottom: 1px solid #E5E7EB;
    vertical-align: middle;
  }
  .items-table td.center { text-align: center; }
  .items-table td.right  { text-align: right; }

  /* col widths */
  .items-table col.c-num   { width: 28px; }
  .items-table col.c-desc  { width: auto; }
  .items-table col.c-gst   { width: 60px; }
  .items-table col.c-qty   { width: 60px; }
  .items-table col.c-rate  { width: 80px; }
  .items-table col.c-amt   { width: 88px; }
  .items-table col.c-igst  { width: 70px; }
  .items-table col.c-total { width: 90px; }

  /* ── Bottom section: totals + signature ── */
  .bottom-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 0;
  }
  .totals-block {
    width: 260px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 13px;
    color: #374151;
    border-bottom: 1px solid #E5E7EB;
  }
  .totals-row:last-of-type { border-bottom: none; }
  .totals-grand {
    display: flex;
    justify-content: space-between;
    padding: 8px 0 4px;
    font-size: 15px;
    font-weight: 700;
    color: #111827;
    border-top: 1.5px solid #D1D5DB;
    margin-top: 4px;
  }

  .sig-block {
    text-align: center;
    margin-top: 10px;
    padding-top: 6px;
  }
  .sig-block p {
    font-size: 12px;
    color: #6B7280;
    margin-top: 4px;
  }

  /* ── Notes ── */
  .notes-section { margin-top: 28px; }
  .notes-section h3 {
    font-size: 14px;
    font-weight: 700;
    color: #7C3AED;
    margin-bottom: 8px;
  }
  .notes-section ul {
    list-style: none;
    padding: 0;
  }
  .notes-section ul li {
    font-size: 12.5px;
    color: #374151;
    padding: 1px 0;
    padding-left: 14px;
    position: relative;
  }
  .notes-section ul li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #9CA3AF;
  }

  /* ── Footer ── */
  .footer {
    text-align: center;
    font-size: 12px;
    color: #6B7280;
    margin-top: 24px;
  }
  .footer b { color: #374151; }
</style>
</head>
<body>

  <h1 class="invoice-title">Invoice</h1>

  <table class="meta-table">
    <tr>
      <td>Invoice No</td>
      <td>${invoiceNo || ""}</td>
    </tr>
    <tr>
      <td>Invoice Date</td>
      <td>${invoiceDate || ""}</td>
    </tr>
    <tr>
      <td>Due Date</td>
      <td>${dueDate || ""}</td>
    </tr>
  </table>

  <div class="billed-grid">
    <div class="billed-card">
      <h3>Billed By</h3>
      <p>${billedByName || ""}</p>
      <p>${billedByCity || ""}${billedByCity && billedByState ? ", " : ""}${billedByState || ""}</p>
      ${billedByCountry ? `<p>${billedByCountry}</p>` : ""}
      ${billedByEmail ? `<p><span class="label">Email:</span> ${billedByEmail}</p>` : ""}
      ${billedByInstagram ? `<p><span class="label">Instagram ID ::</span> ${billedByInstagram}</p>` : ""}
    </div>
    <div class="billed-card">
      <h3>Billed To</h3>
      <p><strong>${billedToName || ""}</strong></p>
      <p>${billedToAddress || ""}</p>
      ${billedToGSTIN ? `<p><span class="label">GSTIN:</span> ${billedToGSTIN}</p>` : ""}
      ${billedToPAN ? `<p><span class="label">PAN:</span> ${billedToPAN}</p>` : ""}
    </div>
  </div>

  <div class="supply-row">
    <span><b>Country of Supply:</b> ${countryOfSupply || "India"}</span>
    <span><b>Place of Supply:</b> ${placeOfSupply || ""}</span>
  </div>

  <table class="items-table">
    <colgroup>
      <col class="c-num" />
      <col class="c-desc" />
      <col class="c-gst" />
      <col class="c-qty" />
      <col class="c-rate" />
      <col class="c-amt" />
      <col class="c-igst" />
      <col class="c-total" />
    </colgroup>
    <thead>
      <tr>
        <th></th>
        <th>Item</th>
        <th class="center">GST<br/>Rate</th>
        <th class="center">Quantity</th>
        <th class="right">Rate</th>
        <th class="right">Amount</th>
        <th class="right">IGST</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="bottom-section">
    <div class="totals-block">
      <div class="totals-row">
        <span>Amount</span>
        <span>${fmt(subtotal)}</span>
      </div>
      <div class="totals-row">
        <span>IGST</span>
        <span>${fmt(totalIGST)}</span>
      </div>
      <div class="totals-grand">
        <span>Total (INR)</span>
        <span>${fmt(grandTotal)}</span>
      </div>
      <div class="sig-block">
        ${sigHtml}
        <p>Authorised Signatory</p>
      </div>
    </div>
  </div>

  ${
    notesList
      ? `<div class="notes-section">
      <h3>Additional Notes</h3>
      <ul>${notesList}</ul>
    </div>`
      : ""
  }

  <div class="footer">
    For any enquiry, reach out via email at <b>${contactEmail || billedByEmail || ""}</b>${
    contactPhone ? `, call on <b>${contactPhone}</b>` : ""
  }
  </div>

</body>
</html>`;
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.USERNAME && password === process.env.PASSWORD) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    return res.json({ token, username });
  }
  res.status(401).json({ message: "Invalid credentials" });
});

app.post(
  "/api/upload-signature",
  authMiddleware,
  upload.single("signature"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.json({ url });
  }
);

app.post("/api/generate-pdf", authMiddleware, async (req, res) => {
  const invoice = req.body;

  try {
    const html = buildInvoiceHTML(invoice);

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0px",
        bottom: "0px",
        left: "0px",
        right: "0px",
      },
    });

    await browser.close();

    if (invoice.clientEmail) {
      const pdfFilename = invoice.pdfFilename_teejnil || `${invoice.invoiceNo}_teejnil.pdf`;

      await transporter.sendMail({
        from: `"TeejNil" <${process.env.EMAIL_USER}>`,
        to: invoice.clientEmail,
        subject: `Invoice ${invoice.invoiceNo}`,
        html: `
          <h2>Thank you for using TeejNil_Invoice_Generator 💜</h2>
          <p>Hello ${invoice.billedToName},</p>
          <p>Your invoice <b>${invoice.invoiceNo}</b> is attached.</p>
          <p>We appreciate your trust in our platform.</p>
          <br/>
          <p>— Team TeejNil</p>
          <p>Get to know us: https://teejnil.vercel.app</p>
        `,
        attachments: [
          {
            filename: pdfFilename,
            content: pdf,
          },
        ],
      });
    }

    res.json({ message: "Invoice generated & emailed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating/sending PDF", error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`)
);