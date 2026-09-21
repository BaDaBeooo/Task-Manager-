import { useEffect, useState } from "react";

import api from "../services/api";
import "./TelegramSettings.css";


function TelegramSettings() {
  const [chatId, setChatId] = useState("");
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [botUsername, setBotUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminActionId, setAdminActionId] = useState(null);
  const [adminLinks, setAdminLinks] = useState({});

  const isAdmin = [currentUser?.role, currentUser?.role?.code]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase() === "admin");


  const loadStatus = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/telegram/status");
      const data = response.data || {};

      setConfigured(Boolean(data.configured));
      setConnected(Boolean(data.connected));
      setBotUsername(data.bot_username || "");
      setChatId(data.chat_id || "");
    } catch (requestError) {
      console.error(
        "Load Telegram status error:",
        requestError
      );

      setError(
        requestError.response?.data?.detail ||
        "Không thể kiểm tra kết nối Telegram."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadStatus();
    loadCurrentUser();
  }, []);


  const loadCurrentUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setCurrentUser(response.data || null);
    } catch (requestError) {
      console.error("Load current user error:", requestError);
    }
  };


  const loadAdminUsers = async () => {
    try {
      setAdminLoading(true);
      const response = await api.get("/telegram/admin/users");
      setAdminUsers(response.data || []);
    } catch (requestError) {
      console.error("Load Telegram admin users error:", requestError);
      setError(
        requestError.response?.data?.detail ||
        "Không thể tải danh sách liên kết Telegram."
      );
    } finally {
      setAdminLoading(false);
    }
  };


  useEffect(() => {
    if (isAdmin) {
      loadAdminUsers();
    }
  }, [currentUser, isAdmin]);


  const handleSave = async (event) => {
    event.preventDefault();

    const value = chatId.trim();

    if (!value) {
      setError("Vui lòng nhập Telegram Chat ID.");
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await api.put(
        "/telegram/me/chat-id",
        { chat_id: value }
      );

      const data = response.data || {};

      setConnected(Boolean(data.connected));
      setChatId(data.chat_id || value);
      setBotUsername(data.bot_username || botUsername);

      setMessage(
        "Đã lưu Telegram Chat ID."
      );
    } catch (requestError) {
      console.error(
        "Save Telegram Chat ID error:",
        requestError
      );

      setError(
        requestError.response?.data?.detail ||
        "Không thể lưu Telegram Chat ID."
      );
    } finally {
      setSaving(false);
    }
  };


  const handleTest = async () => {
    try {
      setTesting(true);
      setError("");
      setMessage("");

      await api.post("/telegram/me/test");

      setMessage(
        "Đã gửi tin nhắn kiểm tra. Hãy kiểm tra Telegram."
      );
    } catch (requestError) {
      console.error(
        "Test Telegram error:",
        requestError
      );

      setError(
        requestError.response?.data?.detail ||
        "Không thể gửi tin nhắn kiểm tra."
      );
    } finally {
      setTesting(false);
    }
  };


  const handleCreateLink = async () => {
    try {
      setCreatingLink(true);
      setError("");
      setMessage("");

      const response = await api.post("/telegram/me/link");
      const data = response.data || {};
      setLinkUrl(data.url || "");
      setMessage(
        "Đã tạo liên kết tự động. Mở liên kết bằng Telegram và bấm Start; hệ thống sẽ tự lưu Chat ID cho tài khoản này."
      );
    } catch (requestError) {
      console.error("Create Telegram link error:", requestError);
      setError(
        requestError.response?.data?.detail ||
        "Không thể tạo liên kết Telegram tự động."
      );
    } finally {
      setCreatingLink(false);
    }
  };


  const handleAdminCreateLink = async (userId) => {
    try {
      setAdminActionId(userId);
      setError("");
      setMessage("");

      const response = await api.post(`/telegram/admin/users/${userId}/link`);
      const data = response.data || {};
      setAdminLinks((previous) => ({ ...previous, [userId]: data.url || "" }));
      setMessage("Đã tạo link liên kết Telegram. Gửi link này cho đúng người dùng và yêu cầu họ bấm Start.");
      await loadAdminUsers();
    } catch (requestError) {
      console.error("Create admin Telegram link error:", requestError);
      setError(
        requestError.response?.data?.detail ||
        "Không thể tạo link liên kết Telegram."
      );
    } finally {
      setAdminActionId(null);
    }
  };


  const handleAdminUnlink = async (userId, name) => {
    if (!window.confirm(`Xóa liên kết Telegram của ${name}?`)) return;

    try {
      setAdminActionId(userId);
      setError("");
      setMessage("");
      await api.delete(`/telegram/admin/users/${userId}/chat-id`);
      setAdminLinks((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      setMessage("Đã xóa liên kết Telegram của người dùng.");
      await loadAdminUsers();
    } catch (requestError) {
      console.error("Unlink admin Telegram error:", requestError);
      setError(
        requestError.response?.data?.detail ||
        "Không thể xóa liên kết Telegram."
      );
    } finally {
      setAdminActionId(null);
    }
  };


  const copyAdminLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Đã copy link liên kết Telegram.");
    } catch {
      window.prompt("Copy link Telegram này:", url);
    }
  };


  const handleRemove = async () => {
    const confirmed = window.confirm(
      "Xóa liên kết Telegram khỏi tài khoản này?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.delete("/telegram/me/chat-id");

      setChatId("");
      setConnected(false);

      setMessage(
        "Đã xóa liên kết Telegram."
      );
    } catch (requestError) {
      console.error(
        "Remove Telegram Chat ID error:",
        requestError
      );

      setError(
        requestError.response?.data?.detail ||
        "Không thể xóa liên kết Telegram."
      );
    } finally {
      setSaving(false);
    }
  };


  return (
    <section className="settings-card telegram-settings-card">
      <div className="settings-card-header">
        <div>
          <h2>Telegram</h2>

          <p>
            Nhận thông báo công việc và yêu cầu hỗ trợ
            trực tiếp qua Telegram.
          </p>
        </div>

        <span
          className={`telegram-status ${
            connected
              ? "connected"
              : "disconnected"
          }`}
        >
          <span className="telegram-status-dot" />
          {connected
            ? "Đã liên kết"
            : "Chưa liên kết"}
        </span>
      </div>


      {loading ? (
        <div className="settings-empty">
          Đang kiểm tra kết nối Telegram...
        </div>
      ) : (
        <>
          {!configured && (
            <div className="telegram-notice warning">
              Telegram Bot chưa được cấu hình trên server.
              Admin cần thiết lập <code>TELEGRAM_BOT_TOKEN</code>
              trước khi người dùng có thể liên kết.
            </div>
          )}


          {configured && (
            <div className="telegram-notice">
              <strong>
                Bot:
              </strong>{" "}
              {botUsername
                ? `@${botUsername}`
                : "Đã cấu hình"}
            </div>
          )}


          <div className="telegram-auto-link">
            <div>
              <strong>Liên kết tự động — khuyến nghị</strong>
              <p>
                Không cần tự tìm và nhập Chat ID. Bấm nút dưới đây, mở bot bằng Telegram rồi bấm <strong>Start</strong>. Bot sẽ tự nhận Chat ID và liên kết đúng tài khoản Task Manager của bạn.
              </p>
            </div>

            <div className="telegram-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleCreateLink}
                disabled={!configured || creatingLink || saving}
              >
                {creatingLink ? "Đang tạo liên kết..." : "🔗 Liên kết Telegram tự động"}
              </button>

              {linkUrl && (
                <a
                  className="secondary-button telegram-link-button"
                  href={linkUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở Telegram
                </a>
              )}
            </div>

            {linkUrl && (
              <small className="telegram-link-note">
                Liên kết có hiệu lực 10 phút. Nếu hết hạn, tạo liên kết mới.
              </small>
            )}
          </div>

          <form
            className="telegram-form"
            onSubmit={handleSave}
          >
            <div className="telegram-form-field">
              <label htmlFor="telegram-chat-id">
                Telegram Chat ID
              </label>

              <input
                id="telegram-chat-id"
                type="text"
                value={chatId}
                onChange={(event) =>
                  setChatId(event.target.value)
                }
                placeholder="Ví dụ: 123456789"
                disabled={
                  !configured ||
                  saving
                }
              />

              <small>
                Mở bot Telegram, lấy Chat ID của bạn rồi
                nhập vào đây. Với chat cá nhân, Chat ID
                thường là một dãy số.
              </small>
            </div>


            <div className="telegram-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={
                  !configured ||
                  saving
                }
              >
                {saving
                  ? "Đang lưu..."
                  : "Lưu Chat ID"}
              </button>


              <button
                type="button"
                className="secondary-button"
                onClick={handleTest}
                disabled={
                  !configured ||
                  !connected ||
                  testing ||
                  saving
                }
              >
                {testing
                  ? "Đang gửi..."
                  : "Gửi tin nhắn thử"}
              </button>


              {connected && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleRemove}
                  disabled={saving}
                >
                  Xóa liên kết
                </button>
              )}
            </div>
          </form>


          <div className="telegram-help">
            <strong>Cách kết nối:</strong>

            <ol>
              <li>
                Cách nhanh nhất: bấm <strong>🔗 Liên kết Telegram tự động</strong>.
              </li>

              <li>
                Mở Telegram từ liên kết đó và bấm <strong>Start</strong>.
              </li>

              <li>
                Bot sẽ tự lưu Chat ID vào đúng tài khoản Task Manager và trả lại Chat ID cho bạn.
              </li>

              <li>
                Vẫn có thể nhập Chat ID thủ công nếu cần.
              </li>
            </ol>
          </div>
        </>
      )}


      {isAdmin && (
        <div className="telegram-admin-panel">
          <div className="telegram-admin-header">
            <div>
              <h3>Quản trị liên kết Telegram</h3>
              <p>Admin có thể tạo link cho từng user. User không cần đăng nhập Task Manager để liên kết.</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={loadAdminUsers}
              disabled={adminLoading}
            >
              {adminLoading ? "Đang tải..." : "↻ Làm mới"}
            </button>
          </div>

          {adminLoading ? (
            <div className="settings-empty">Đang tải danh sách người dùng...</div>
          ) : (
            <div className="telegram-admin-list">
              {adminUsers.map((adminUser) => {
                const link = adminLinks[adminUser.id];
                return (
                  <div className="telegram-admin-user" key={adminUser.id}>
                    <div className="telegram-admin-user-main">
                      <div className="telegram-admin-avatar">{(adminUser.full_name || adminUser.username || "?").charAt(0).toUpperCase()}</div>
                      <div>
                        <strong>{adminUser.full_name || adminUser.username}</strong>
                        <span>@{adminUser.username}</span>
                        <small>User ID: {adminUser.id}</small>
                      </div>
                    </div>

                    <div className="telegram-admin-state">
                      {adminUser.connected ? (
                        <span className="telegram-admin-connected">● Đã liên kết</span>
                      ) : (
                        <span className="telegram-admin-disconnected">○ Chưa liên kết</span>
                      )}
                      {adminUser.chat_id && <small>Chat ID: {adminUser.chat_id}</small>}
                    </div>

                    <div className="telegram-admin-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => handleAdminCreateLink(adminUser.id)}
                        disabled={!configured || adminActionId === adminUser.id}
                      >
                        {adminActionId === adminUser.id ? "Đang tạo..." : adminUser.connected ? "Tạo link mới" : "Tạo link liên kết"}
                      </button>
                      {link && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => copyAdminLink(link)}
                        >
                          Copy link
                        </button>
                      )}
                      {adminUser.connected && (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleAdminUnlink(adminUser.id, adminUser.full_name || adminUser.username)}
                          disabled={adminActionId === adminUser.id}
                        >
                          Xóa
                        </button>
                      )}
                    </div>

                    {link && (
                      <div className="telegram-admin-link-result">
                        <span>Link cho {adminUser.full_name || adminUser.username}:</span>
                        <code>{link}</code>
                        <small>Link có hiệu lực 10 phút. Gửi đúng link này cho user và yêu cầu bấm Start.</small>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="telegram-message error">
          {error}
        </div>
      )}


      {message && (
        <div className="telegram-message success">
          {message}
        </div>
      )}
    </section>
  );
}


export default TelegramSettings;
