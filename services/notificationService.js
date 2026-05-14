// src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "https://leave-application-management-system-up1h.onrender.com";
const NOTIFICATION_API = `${API_BASE}/api/notifications`;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const token = localStorage.getItem("token");

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${NOTIFICATION_API}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (err) {
      console.error("fetchUnreadCount failed:", err);
    }
  }, [token]);

  const fetchNotifications = useCallback(async (pageNum = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${NOTIFICATION_API}?page=${pageNum}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const list = Array.isArray(data.notifications) ? data.notifications : [];
      if (pageNum === 1) {
        setNotifications(list);
      } else {
        setNotifications((prev) => [...prev, ...list]);
      }
      setHasMore(data.total > pageNum * 10);
      fetchUnreadCount();
    } catch (err) {
      console.error("fetchNotifications failed:", err);
    } finally {
      setLoading(false);
    }
  }, [token, fetchUnreadCount]);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await fetch(`${NOTIFICATION_API}/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) =>
          (n._id === id || n.id === id) ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("markRead failed", err);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${NOTIFICATION_API}/mark-all-read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("markAllRead failed", err);
    }
  };

  const deleteNotif = async (id) => {
    try {
      await fetch(`${NOTIFICATION_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
      fetchUnreadCount();
    } catch (err) {
      console.error("deleteNotif failed", err);
    }
  };

  const fetchMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage);
  };

  const refresh = () => fetchNotifications(1);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    deleteNotif,
    fetchMore,
    hasMore,
    connected: true,
    refresh,
  };
};
