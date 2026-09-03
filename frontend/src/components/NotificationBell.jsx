import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

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
  // INITIAL LOAD + POLLING
  // =====================================================

  useEffect(() => {
    loadNotifications();

    // Kiểm tra notification mới mỗi 5 giây
    const interval = setInterval(() => {
      loadNotifications();
    }, 5000);

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      clearInterval(interval);

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // =====================================================
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

    const date = new Date(createdAt);

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

            {unreadCount > 0 && (
              <span className="notification-count">
                {unreadCount} chưa đọc
              </span>
            )}

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