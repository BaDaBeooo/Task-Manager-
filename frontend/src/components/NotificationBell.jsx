import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { parseApiDate } from "../services/realtime";

function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const loadNotifications = async (silent = false) => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data || []);
    } catch (error) {
      if (!silent) console.error("Load notifications error:", error);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Polling is intentionally used here instead of opening a browser WebSocket.
    // This keeps the notification UI compatible with both Vite and Nginx deployments
    // and prevents a malformed/unproxied WS URL from crashing the whole React tree.
    const timer = window.setInterval(() => loadNotifications(true), 10000);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        await api.patch(`/notifications/${notification.id}/read`);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );
      }

      setOpen(false);

      if (notification.task_id) {
        navigate(`/tasks?task=${notification.task_id}`);
      }
    } catch (error) {
      console.error("Read notification error:", error);
    }
  };

  const handleMarkAllAsRead = async (event) => {
    event?.stopPropagation();
    if (unreadCount === 0) return;

    try {
      await api.patch("/notifications/read-all");
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  const formatNotificationTime = (createdAt) => {
    if (!createdAt) return "";
    const date = parseApiDate(createdAt);
    if (!date || Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        type="button"
        className="notification-button"
        title="Thông báo"
        onClick={() => setOpen((current) => !current)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <strong>Thông báo</strong>
            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <span className="notification-count">{unreadCount} chưa đọc</span>
              )}
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notification-mark-all-button"
                  onClick={handleMarkAllAsRead}
                  title="Đánh dấu tất cả đã đọc"
                >
                  Đọc tất cả
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">Không có thông báo.</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? "" : "unread"}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-item-title">{notification.title}</div>
                  <div className="notification-item-message">{notification.message}</div>
                  <div className="notification-item-time">
                    {formatNotificationTime(notification.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
