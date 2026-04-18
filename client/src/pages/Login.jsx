import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import styles from "./Login.module.css";

export default function Login() {
  const { login } = useAuth();

  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // ✅ NEW STATES
  const [demoEmail, setDemoEmail] = useState("");
  const [sendingDemo, setSendingDemo] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error("Fill all fields");

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/login`,
        form
      );

      login(data.token, data.username);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRequest = async () => {
    if (!demoEmail) return toast.error("Enter your email");
    setSendingDemo(true);
    try {
      const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/send-demo-credentials`,{ email: demoEmail });
      toast.success(data.message);
      setDemoEmail("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send demo");
    } finally {
      setSendingDemo(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>✦</div>
          <h1>Invoice Generator</h1>
        </div>

        <p className={styles.sub}>
          Sign in to generate professional invoices
        </p>

        {/* ✅ NEW SUBTITLE */}
        <p className={styles.sub}>
          Don't have access? Get demo credentials instantly
        </p>

        <div className={styles.divider} />

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <div className={styles.passWrap}>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Enter password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eye}
                onClick={() => setShowPass((s) => !s)}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : "Sign In →"}
          </button>
        </form>

        {/* DIVIDER */}
        <div className={styles.divider} />

        {/* ✅ DEMO SECTION */}
        <div className={styles.form}>
          <div className={styles.field}>
            <label>Get Demo Credentials</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.btn}
            onClick={handleDemoRequest}
            disabled={sendingDemo}
          >
            {sendingDemo ? (
              <span className={styles.spinner} />
            ) : (
              "Send Demo Login ✉️"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}