import { useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import styles from "./InvoiceForm.module.css";

const defaultItem = () => ({ description: "", quantity: 1, rate: "", gstRate: 0 });
const api = process.env.REACT_APP_API_URL || "http://localhost:5000";
const defaultForm = {
  invoiceNo: "AD/001",
  invoiceDate: "",
  dueDate: "",
  billedByName: "Arka Dey",
  billedByAddress: "Kolkata, West Bengal, India",
  billedByEmail: "arkadeyvlogs@gmail.com",
  billedByInstagram: "@orkodex_",
  billedByPhone: "+91 62915 18204",
  billedToName: "",
  billedToAddress: "",
  billedToGSTIN: "",
  billedToPAN: "",
  countryOfSupply: "India",
  placeOfSupply: "Maharashtra",
  items: [defaultItem()],
  notes: ["As discussed and agreed upon on the call"],
  signatureUrl: "",
};

function Field({ label, value, onChange, type = "text", placeholder, required }) {
  return (
    <div className={styles.field}>
      <label>{label}{required && <span className={styles.req}> *</span>}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h2>{title}</h2>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

export default function InvoiceForm() {
  const { token, user, logout } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [sigUploading, setSigUploading] = useState(false);
  const sigInputRef = useRef();

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const setItem = (i, key) => (val) => {
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], [key]: val };
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, defaultItem()] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const addNote = () => setForm(f => ({ ...f, notes: [...f.notes, ""] }));
  const setNote = (i, val) => setForm(f => { const n = [...f.notes]; n[i] = val; return { ...f, notes: n }; });
  const removeNote = (i) => setForm(f => ({ ...f, notes: f.notes.filter((_, idx) => idx !== i) }));

  const subtotal = form.items.reduce((s, it) => s + (parseFloat(it.rate) || 0) * (parseInt(it.quantity) || 0), 0);
  const igst = form.items.reduce((s, it) => {
    const amt = (parseFloat(it.rate) || 0) * (parseInt(it.quantity) || 0);
    return s + (it.gstRate > 0 ? amt * it.gstRate / 100 : 0);
  }, 0);
  const total = subtotal + igst;

  const fmt = (n) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSigUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image file");
    setSigUploading(true);
    try {
      const fd = new FormData();
      fd.append("signature", file);
      const { data } = await axios.post(`${api}/api/upload-signature`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      setForm(f => ({ ...f, signatureUrl: data.url }));
      toast.success("Signature uploaded!");
    } catch {
      toast.error("Signature upload failed");
    } finally {
      setSigUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.clientEmail) return toast.error("Client email required");
    setLoading(true);
    try {
      const safeName = (form.billedByName || "User").replace(/\s+/g, "");
      const safeDate = (form.invoiceDate || "nodate").replace(/\//g, "-");
      const pdfFilename = `${safeName}_${safeDate}.pdf`;

      await axios.post(`${api}/api/generate-pdf`,
        { ...form, pdfFilename },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("📧 Invoice sent to email!");
    } catch (err) {
      toast.error("Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  const displayName = "Sagnik";

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>✦</div>
            <span>Invoice Generator</span>
          </div>
          <div className={styles.userBar}>
            {/* ✅ Shows billedByName instead of raw auth username */}
            <span className={styles.userTag}>👤 {displayName}</span>
            <button className={styles.logoutBtn} onClick={logout}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <div className={styles.pageTitleWrap}>
            <div className={styles.pageEyebrow}>Create Document</div>
            {/* ✅ "Hello, Arka Dey" — updates live as user types their name */}
            <h1 className={styles.pageTitle}>Hello, {displayName} 👋</h1>
          </div>
          <button className={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
            {loading
              ? <><span className={styles.spinner} /> Generating…</>
              : <>Send PDF</>
            }
          </button>
        </div>
        <p className={styles.intro}>Fill the client details to get the pdf in your email</p>
        <Field
          label="Client Email"
          value={form.clientEmail || ""}
          onChange={set("clientEmail")}
          type="email"
          placeholder="client@gmail.com"
          required
        />
        <br /><br />
        <div className={styles.grid}>
          {/* LEFT COLUMN */}
          <div className={styles.left}>
            <Section title="Invoice Details" icon="📄">
              <div className={styles.row3}>
                <Field label="Invoice No" value={form.invoiceNo} onChange={set("invoiceNo")} placeholder="AD/001" required />
                <Field label="Invoice Date" value={form.invoiceDate} onChange={set("invoiceDate")} type="date" required />
                <Field label="Due Date" value={form.dueDate} onChange={set("dueDate")} type="date" required />
              </div>
            </Section>

            <Section title="Billed By (You)" icon="🏷️">
              <div className={styles.row2}>
                <Field label="Full Name" value={form.billedByName} onChange={set("billedByName")} placeholder="Your name" required />
                <Field label="Email" value={form.billedByEmail} onChange={set("billedByEmail")} type="email" placeholder="you@email.com" />
              </div>
              <div className={styles.row2}>
                <Field label="Instagram ID" value={form.billedByInstagram} onChange={set("billedByInstagram")} placeholder="@handle" />
                <Field label="Phone" value={form.billedByPhone} onChange={set("billedByPhone")} placeholder="+91 XXXXX XXXXX" />
              </div>
              <Field label="Address" value={form.billedByAddress} onChange={set("billedByAddress")} placeholder="City, State, Country" />
            </Section>

            <Section title="Billed To (Client)" icon="🏢">
              <Field label="Company / Client Name" value={form.billedToName} onChange={set("billedToName")} placeholder="Client name or company" required />
              <Field label="Address" value={form.billedToAddress} onChange={set("billedToAddress")} placeholder="Full address" />
              <div className={styles.row2}>
                <Field label="GSTIN" value={form.billedToGSTIN} onChange={set("billedToGSTIN")} placeholder="27AAMCC9638B1ZG" />
                <Field label="PAN" value={form.billedToPAN} onChange={set("billedToPAN")} placeholder="AAMCC9638B" />
              </div>
              <div className={styles.row2}>
                <Field label="Country of Supply" value={form.countryOfSupply} onChange={set("countryOfSupply")} placeholder="India" />
                <Field label="Place of Supply" value={form.placeOfSupply} onChange={set("placeOfSupply")} placeholder="Maharashtra (27)" />
              </div>
            </Section>
          </div>

          {/* RIGHT COLUMN */}
          <div className={styles.right}>
            <Section title="Invoice Items" icon="📋">
              {form.items.map((item, i) => (
                <div key={i} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemBadge}>#{String(i + 1).padStart(2, "0")}</span>
                    {form.items.length > 1 && (
                      <button className={styles.removeBtn} onClick={() => removeItem(i)}>✕ Remove</button>
                    )}
                  </div>
                  <div className={styles.itemGrid}>
                    <div className={`${styles.field} ${styles.fullSpan}`}>
                      <label>Description <span className={styles.req}>*</span></label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => setItem(i, "description")(e.target.value)}
                        placeholder="e.g. Commercial Collaboration (ZEE5)"
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Qty</label>
                      <input type="number" min="1" value={item.quantity} onChange={e => setItem(i, "quantity")(e.target.value)} />
                    </div>
                    <div className={styles.field}>
                      <label>Rate (₹) <span className={styles.req}>*</span></label>
                      <input type="number" min="0" value={item.rate} onChange={e => setItem(i, "rate")(e.target.value)} placeholder="2000" />
                    </div>
                    <div className={styles.field}>
                      <label>GST Rate (%)</label>
                      <select value={item.gstRate} onChange={e => setItem(i, "gstRate")(parseFloat(e.target.value))}>
                        <option value={0}>0% (Nil)</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.itemTotal}>
                    Total: <strong>₹{fmt((parseFloat(item.rate) || 0) * (parseInt(item.quantity) || 0) * (1 + (item.gstRate || 0) / 100))}</strong>
                  </div>
                </div>
              ))}
              <button className={styles.addBtn} onClick={addItem}>+ Add Item</button>

              <div className={styles.summary}>
                <div className={styles.summaryRow}><span>Subtotal</span><span>₹{fmt(subtotal)}</span></div>
                <div className={styles.summaryRow}><span>IGST</span><span>₹{fmt(igst)}</span></div>
                <div className={styles.summaryTotal}><span>Total (INR)</span><span>₹{fmt(total)}</span></div>
              </div>
            </Section>

            <Section title="Additional Notes" icon="📝">
              {form.notes.map((note, i) => (
                <div key={i} className={styles.noteRow}>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(i, e.target.value)}
                    placeholder="Add a note..."
                    className={styles.noteInput}
                  />
                  <button className={styles.removeNote} onClick={() => removeNote(i)}>✕</button>
                </div>
              ))}
              <button className={styles.addNoteBtn} onClick={addNote}>+ Add Note</button>
            </Section>

            <Section title="Authorised Signature" icon="✍️">
              <div className={styles.sigArea}>
                {form.signatureUrl ? (
                  <div className={styles.sigPreview}>
                    <img src={form.signatureUrl} alt="Signature" />
                    <button className={styles.changeSig} onClick={() => setForm(f => ({ ...f, signatureUrl: "" }))}>
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <div className={styles.sigUpload} onClick={() => sigInputRef.current.click()}>
                    {sigUploading
                      ? <><span className={styles.spinner} /><span>Uploading…</span></>
                      : <><span className={styles.sigIcon}>🖊️</span><span>Upload Signature Image</span><span className={styles.sigHint}>PNG, JPG up to 5MB</span></>
                    }
                  </div>
                )}
                <input
                  ref={sigInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSigUpload}
                  style={{ display: "none" }}
                />
              </div>
            </Section>
          </div>
        </div>

        <div className={styles.mobileGenerate}>
          <button className={styles.generateBtn} onClick={handleGenerate} disabled={loading}>
            {loading ? <><span className={styles.spinner} /> Generating…</> : <>⬇ Download PDF</>}
          </button>
        </div>
      </main>
    </div>
  );
}