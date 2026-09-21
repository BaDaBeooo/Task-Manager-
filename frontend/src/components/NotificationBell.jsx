import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { parseApiDate } from "../services/realtime";

function NotificationBell() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef(null);

  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const loadNotifications = async () => {
    try {
      const response = await api.get("/notifications");

      setNotifications(response.data || []);
    } catch (error) {
      console.error(
        "Load notifications error:",
        error
      );
    }
  };

  // =====================================================
  // CLICK OUTSIDE
  // =====================================================

  const handleClickOutside = (event) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target)
    ) {
      setOpen(false);
    }
  };

  // =====================================================
  // INITIAL LOAD + REALTIME WEBSOCKET
  // =====================================================

  useEffect(() => {
    loadNotifications();

    let socket = null;
    let reconnectTimer = null;
    let pingTimer = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;

      const token = localStorage.getItem("access_token");
      if (!token) return;

      socket = new WebSocket(
        `ws://127.0.0.1:8000/ws/notifications?token=${encodeURIComponent(token)}`
      );

      socket.onopen = () => {
        console.log("[Realtime] Notification WebSocket connected");

        pingTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send("ping");
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Broadcast generic realtime events to the current page so task/ticket
          // lists can refresh without polling or requiring F5.
          if (data.type === "data_changed") {
            window.dispatchEvent(
              new CustomEvent("taskmanager:realtime", { detail: data })
            );
            return;
          }

          if (data.type === "notifications_read_all") {
            setNotifications((current) =>
              current.map((item) => ({
                ...item,
                is_read: true,
              }))
            );
            return;
          }

          if (data.type !== "notification" || !data.notification) return;

          const incoming = data.notification;
          setNotifications((current) => {
            if (current.some((item) => item.id === incoming.id)) return current;
            return [incoming, ...current];
          });
        } catch (error) {
          console.error("Realtime notification parse error:", error);
        }
      };

      socket.onerror = (error) => {
        console.warn("[Realtime] Notification WebSocket error", error);
      };

      socket.onclose = () => {
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        if (!stopped) reconnectTimer = setTimeout(connect, 2000);
      };
    };

    connect();

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      if (socket) socket.close();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // MARK AS READ
  // =====================================================

  const handleNotificationClick = async (
    notification
  ) => {
    try {
      if (!notification.is_read) {
        await api.patch(
          `/notifications/${notification.id}/read`
        );

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  is_read: true,
                }
              : item
          )
        );
      }

      setOpen(false);

      // Có task thì mở đúng task
      if (notification.task_id) {
        navigate(
          `/tasks?task=${notification.task_id}`
        );
      }
    } catch (error) {
      console.error(
        "Read notification error:",
        error
      );
    }
  };

  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const handleMarkAllAsRead = async (event) => {
    // Prevent the dropdown's notification click handling.
    event?.stopPropagation();

    if (unreadCount === 0) return;

    try {
      await api.patch("/notifications/read-all");

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (error) {
      console.error(
        "Mark all notifications as read error:",
        error
      );
    }
  };

  // =====================================================
  // UNREAD COUNT
  // =====================================================

  const unreadCount = notifications.filter(
    (notification) =>
      !notification.is_read
  ).length;

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatNotificationTime = (
    createdAt
  ) => {
    if (!createdAt) {
      return "";
    }

    const date = parseApiDate(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(
      "vi-VN",
      {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="notification-bell"
      ref={dropdownRef}
    >

      {/* =========================
          BELL BUTTON
      ========================= */}

      <button
        type="button"
        className="notification-button"
        title="Thông báo"
        onClick={() =>
          setOpen((current) => !current)
        }
      >
        🔔

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>


      {/* =========================
          DROPDOWN
      ========================= */}

      {open && (
        <div className="notification-dropdown">

          <div className="notification-header">

            <strong>
              Thông báo
            </strong>

            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <span className="notification-count">
                  {unreadCount} chưa đọc
                </span>
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

              <div className="notification-empty">
                Không có thông báo.
              </div>

            ) : (

              notifications.map(
                (notification) => (

                  <div
                    key={notification.id}
                    className={`notification-item ${
                      notification.is_read
                        ? ""
                        : "unread"
                    }`}
                    onClick={() =>
                      handleNotificationClick(
                        notification
                      )
                    }
                  >

                    <div className="notification-item-title">
                      {notification.title}
                    </div>


                    <div className="notification-item-message">
                      {notification.message}
                    </div>


                    <div className="notification-item-time">
                      {formatNotificationTime(
                        notification.created_at
                      )}
                    </div>

                  </div>

                )
              )

            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default NotificationBell;