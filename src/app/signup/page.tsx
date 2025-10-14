"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function Signup() {
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<{ email: string; isNew: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, location }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setResult(json);
    } catch (err: any) {
      alert(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: 16 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0, marginBottom: 8 }}>Get Started</h1>
        <p style={{ color: "#6b7280", margin: 0 }}>Enter your email to get your unique ID for managing notifications.</p>
      </div>

      <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
          <div>
            <label htmlFor="email" style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Email</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 16 }}
            />
          </div>

          <div>
            <label htmlFor="location" style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Location (optional)</label>
            <input
              id="location"
              placeholder="e.g., New York, NY or Mumbai, India"
              value={location}
              onChange={e => setLocation(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 16 }}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Helps us provide location-specific information in your notifications.</div>
          </div>

          <button
            disabled={loading}
            type="submit"
            style={{ 
              background: "#0b5fff", 
              color: "white", 
              padding: "12px 16px", 
              border: "1px solid #0b5fff", 
              borderRadius: 8, 
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 16,
              fontWeight: 500
            }}
          >
            {loading ? "Getting your ID..." : "Get My ID"}
          </button>
        </form>
      </section>

      {result && (
        <section style={{ marginTop: 24, background: "#f0f9ff", border: "1px solid #0ea5e9", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#0c4a6e" }}>
            {result.isNew ? "Welcome! Your account has been created." : "Welcome back!"}
          </div>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <div><strong>Email:</strong> {result.email}</div>
            <div style={{ color: "#0c4a6e" }}>{result.message}</div>
          </div>
          <div style={{ marginTop: 16, padding: 12, background: "#e0f2fe", borderRadius: 8, fontSize: 13, color: "#0c4a6e" }}>
            <strong>Next steps:</strong>
            <ol style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
              <li>Check your email for your unique ID</li>
              <li>Use that ID to create and manage notifications</li>
            </ol>
          </div>
        </section>
      )}

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/" style={{ color: "#6b7280", textDecoration: "none", fontSize: 14 }}>
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
