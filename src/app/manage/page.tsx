"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

type Notification = {
  id: string;
  query: string;
  query_for_llm: string | null;
  schedule_cron: string | null;
  next_run_at: string | null;
  is_active: boolean;
  created_at: string;
  metadata: any;
};

export default function Manage() {
  const [userId, setUserId] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuery, setEditQuery] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('userId');
    if (id) {
      setUserId(id);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchNotifications(userId);
    }
  }, [userId]);

  async function fetchNotifications(userId: string) {
    setLoading(true);
    try {
        console.log("fetching notifications for userId", userId);
      const res = await fetch(`/api/notifications/list?userId=${userId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setNotifications(json.notifications || []);
    } catch (err: any) {
      alert(err.message || "Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(notificationId: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/notifications/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          notificationId, 
          userId, 
          isActive: !currentActive 
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_active: !currentActive } : n)
      );
    } catch (err: any) {
      alert(err.message || "Update failed");
    }
  }

  async function updateQuery(notificationId: string) {
    if (!editQuery.trim()) return;
    
    try {
      const res = await fetch("/api/notifications/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          notificationId, 
          userId, 
          query: editQuery.trim() 
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, ...json.notification } : n)
      );
      setEditingId(null);
      setEditQuery("");
    } catch (err: any) {
      alert(err.message || "Update failed");
    }
  }

  function startEdit(notification: Notification) {
    setEditingId(notification.id);
    setEditQuery(notification.query);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditQuery("");
  }

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0, marginBottom: 4 }}>Manage Notifications</h1>
          {userId && (
            <p style={{ color: "#6b7280", margin: 0, fontSize: 14 }}>
              User ID: <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>{userId}</code>
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link 
            href={`/?userId=${userId}`}
            style={{ 
              background: "#0b5fff", 
              color: "white", 
              padding: "8px 12px", 
              borderRadius: 6, 
              textDecoration: "none", 
              fontSize: 14,
              fontWeight: 500
            }}
          >
            + New Notification
          </Link>
          <Link 
            href="/signup"
            style={{ 
              background: "white", 
              color: "#6b7280", 
              padding: "8px 12px", 
              borderRadius: 6, 
              textDecoration: "none", 
              fontSize: 14,
              border: "1px solid #e5e7eb"
            }}
          >
            Switch User
          </Link>
        </div>
      </div>

      {!userId ? (
        <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, textAlign: "center" }}>
          <p style={{ color: "#6b7280", marginTop: 0, marginBottom: 16 }}>Please enter your User ID to manage notifications.</p>
          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
            <input
              placeholder="Enter your UUID from email"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, minWidth: 300 }}
            />
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
            Don't have an ID? <Link href="/signup" style={{ color: "#0b5fff", textDecoration: "none" }}>Get one here</Link>
          </div>
        </section>
      ) : loading ? (
        <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, textAlign: "center" }}>
          <p style={{ color: "#6b7280", margin: 0 }}>Loading notifications...</p>
        </section>
      ) : notifications.length === 0 ? (
        <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, textAlign: "center" }}>
          <p style={{ color: "#6b7280", margin: 0 }}>No notifications found. Create your first one!</p>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {notifications.map((notification) => (
            <section key={notification.id} style={{ 
              background: "#fff", 
              border: "1px solid #e5e7eb", 
              borderRadius: 12, 
              padding: 20,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ 
                      background: notification.is_active ? "#dcfce7" : "#fef2f2", 
                      color: notification.is_active ? "#166534" : "#dc2626",
                      padding: "2px 8px", 
                      borderRadius: 12, 
                      fontSize: 12,
                      fontWeight: 500
                    }}>
                      {notification.is_active ? "Active" : "Inactive"}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>
                      Created {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {editingId === notification.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <textarea
                        value={editQuery}
                        onChange={e => setEditQuery(e.target.value)}
                        rows={2}
                        style={{ 
                          flex: 1, 
                          padding: "8px 12px", 
                          border: "1px solid #e5e7eb", 
                          borderRadius: 6,
                          fontSize: 14
                        }}
                      />
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => updateQuery(notification.id)}
                          style={{ 
                            background: "#0b5fff", 
                            color: "white", 
                            padding: "6px 12px", 
                            border: "1px solid #0b5fff", 
                            borderRadius: 4, 
                            cursor: "pointer",
                            fontSize: 12
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{ 
                            background: "white", 
                            color: "#6b7280", 
                            padding: "6px 12px", 
                            border: "1px solid #e5e7eb", 
                            borderRadius: 4, 
                            cursor: "pointer",
                            fontSize: 12
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 14, marginBottom: 4, fontWeight: 500 }}>Query:</div>
                      <div style={{ fontSize: 14, marginBottom: 8, whiteSpace: "pre-wrap" }}>{notification.query}</div>
                      
                      {notification.query_for_llm && (
                        <div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Sanitized:</div>
                          <div style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>{notification.query_for_llm}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
                  <button
                    onClick={() => startEdit(notification)}
                    style={{ 
                      background: "white", 
                      color: "#0b5fff", 
                      padding: "6px 12px", 
                      border: "1px solid #0b5fff", 
                      borderRadius: 4, 
                      cursor: "pointer",
                      fontSize: 12
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(notification.id, notification.is_active)}
                    style={{ 
                      background: notification.is_active ? "#fef2f2" : "#dcfce7", 
                      color: notification.is_active ? "#dc2626" : "#166534", 
                      padding: "6px 12px", 
                      border: `1px solid ${notification.is_active ? "#fecaca" : "#bbf7d0"}`, 
                      borderRadius: 4, 
                      cursor: "pointer",
                      fontSize: 12
                    }}
                  >
                    {notification.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12, color: "#6b7280" }}>
                <div>
                  <strong>Schedule:</strong> {notification.schedule_cron || "Not set"}
                </div>
                <div>
                  <strong>Next run:</strong> {notification.next_run_at ? new Date(notification.next_run_at).toLocaleString() : "Not scheduled"}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
