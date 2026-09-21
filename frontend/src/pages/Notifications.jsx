import { useEffect, useMemo, useState } from "react";

import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import "../Notifications.css";

const emptyForm = {
  title: "",
  content: "",
  target_type: "company",
  team_ids: [],
};

function roleOf(user) {
  return String(user?.role_code || user?.role || "").toLowerCase();
}

function Notifications() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);

  const role = roleOf(user);
  const canCompany = role === "admin" || role === "supervisor";
  const canTeam = canCompany || role === "leader";
  const canPost = canTeam;
  const canEditAny = canCompany;

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const me = await api.get("/auth/me");
      setUser(me.data);

      const requests = [api.get("/announcements")];
      const currentRole = roleOf(me.data);
      if (["admin", "supervisor", "leader"].includes(currentRole)) {
        requests.push(api.get("/support/org/teams"));
      }

      const results = await Promise.all(requests);
      setItems(results[0].data || []);
      setTeams(results[1]?.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Không thể tải trang thông báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unread = useMemo(() => items.filter((x) => !x.is_read).length, [items]);

  const resetForm = () => setForm({ ...emptyForm });

  const toggleTeam = (teamId) => {
    setForm((current) => ({
      ...current,
      team_ids: current.team_ids.includes(teamId)
        ? current.team_ids.filter((id) => id !== teamId)
        : [...current.team_ids, teamId],
    }));
  };

  const openCreate = () => {
    resetForm();
    setEditing(true);
    setSelected(null);
    setError("");
  };

  const openView = async (item) => {
    setSelected(item);
    setEditing(false);
    if (!item.is_read) {
      try {
        const response = await api.patch(`/announcements/${item.id}/read`);
        setItems((current) => current.map((x) => (x.id === item.id ? response.data : x)));
        setSelected(response.data);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const openEdit = (item) => {
    setSelected(item);
    setEditing(true);
    setForm({
      title: item.title || "",
      content: item.content || "",
      target_type: item.target_type || "company",
      team_ids: item.team_ids || [],
    });
    setError("");
  };

  const closeModal = () => {
    if (saving) return;
    setSelected(null);
    setEditing(false);
    resetForm();
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.title.trim() || !form.content.trim()) {
      setError("Vui lòng nhập Title và nội dung.");
      return;
    }
    if (form.target_type === "team" && form.team_ids.length === 0) {
      setError("Vui lòng chọn ít nhất một Team.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        target_type: form.target_type,
        team_ids: form.target_type === "team" ? form.team_ids.map(Number) : [],
      };

      if (selected) {
        const response = await api.put(`/announcements/${selected.id}`, payload);
        setItems((current) => current.map((x) => (x.id === selected.id ? response.data : x)));
        setSelected(response.data);
        setEditing(false);
        setMessage("Đã cập nhật thông báo.");
      } else {
        const response = await api.post("/announcements", payload);
        setItems((current) => [response.data, ...current]);
        setSelected(response.data);
        setEditing(false);
        setMessage("Đã đăng thông báo.");
      }
      resetForm();
    } catch (e) {
      setError(e.response?.data?.detail || "Không thể lưu thông báo.");
    } finally {
      setSaving(false);
    }
  };

  const renderTargets = (item) => {
    if (item.target_type === "company") return "Toàn công ty";
    return item.team_names?.length ? item.team_names.join(" · ") : "Team";
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    window.location.href = "/";
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <Topbar user={user} onLogout={logout} />

        <div className="notifications-page">
          <div className="notifications-header">
            <div>
              <span className="eyebrow">COMPANY NEWS</span>
              <h1>Thông báo</h1>
              <p>Thông báo chung tới toàn công ty hoặc riêng từng Team.</p>
            </div>
            <div className="notification-counter">{unread} chưa đọc</div>
          </div>

          {error && <div className="dashboard-error">{error}</div>}
          {message && <div className="notification-success">{message}</div>}

          {canPost && !selected && (
            <section className="announcement-compose compact-compose">
              <div className="compose-heading">
                <div>
                  <h2>Đăng thông báo</h2>
                  <p>Chỉ cần nhập Title và copy-paste nội dung.</p>
                </div>
                <button className="primary-button" type="button" onClick={openCreate}>+ Đăng thông báo</button>
              </div>
            </section>
          )}

          <section className="announcement-list-section">
            <div className="list-heading">
              <div>
                <h2>Danh sách thông báo</h2>
                <p>{items.length} thông báo khả dụng</p>
              </div>
            </div>

            {loading ? (
              <div className="settings-empty">Đang tải thông báo...</div>
            ) : items.length === 0 ? (
              <div className="notification-empty">
                <div>🔔</div>
                <h3>Chưa có thông báo</h3>
                <p>Khi có thông báo mới, nội dung sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="announcement-list">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className={`announcement-card ${item.is_read ? "read" : "unread"}`}
                    onClick={() => openView(item)}
                  >
                    <div className="announcement-icon">{item.target_type === "company" ? "🏢" : "👥"}</div>
                    <div className="announcement-body">
                      <div className="announcement-meta">
                        <span>{renderTargets(item)}</span>
                        <time>{new Date(item.created_at).toLocaleString("vi-VN")}</time>
                      </div>
                      <h3>{item.title}</h3>
                      <p className="announcement-preview">{item.content}</p>
                      <small>Đăng bởi {item.creator_name || "Quản trị viên"}</small>
                    </div>
                    <div className="announcement-card-action">
                      {canEditAny && <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(item); }}>Sửa</button>}
                      {!item.is_read && <span className="unread-dot" />}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {(selected || editing) && (
          <div className="announcement-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
            <div className="announcement-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="announcement-modal-header">
                <div>
                  <span className="eyebrow">{editing ? (selected ? "EDIT ANNOUNCEMENT" : "NEW ANNOUNCEMENT") : "ANNOUNCEMENT"}</span>
                  <h2>{editing ? (selected ? "Chỉnh sửa thông báo" : "Đăng thông báo") : selected?.title}</h2>
                </div>
                <button type="button" className="announcement-modal-close" onClick={closeModal}>×</button>
              </div>

              {editing ? (
                <form className="announcement-modal-form" onSubmit={submit}>
                  <label>Title<input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nhập tiêu đề thông báo" autoFocus /></label>

                  <label>Đối tượng<select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value, team_ids: [] })}>
                    {canCompany && <option value="company">Toàn công ty</option>}
                    {canTeam && <option value="team">Một hoặc nhiều Team</option>}
                  </select></label>

                  {form.target_type === "team" && (
                    <div className="team-picker">
                      <div className="team-picker-label">Chọn Team ({form.team_ids.length})</div>
                      <div className="team-picker-list">
                        {teams.map((team) => (
                          <button key={team.id} type="button" className={`team-picker-item ${form.team_ids.includes(team.id) ? "selected" : ""}`} onClick={() => toggleTeam(team.id)}>
                            <span>{form.team_ids.includes(team.id) ? "✓" : ""}</span>
                            <strong>{team.name}</strong>
                            <small>{team.code}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <label>Nội dung<textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Copy-paste nguyên nội dung thông báo vào đây..." rows={11} /></label>

                  <div className="announcement-modal-actions">
                    <button type="button" className="secondary-button" onClick={closeModal} disabled={saving}>Hủy</button>
                    <button type="submit" className="primary-button" disabled={saving}>{saving ? "Đang lưu..." : selected ? "Lưu thay đổi" : "📢 Đăng thông báo"}</button>
                  </div>
                </form>
              ) : (
                <div className="announcement-full-content">
                  <div className="announcement-full-meta">
                    <span>{renderTargets(selected)}</span>
                    <time>{new Date(selected.created_at).toLocaleString("vi-VN")}</time>
                  </div>
                  <div className="announcement-full-text">{selected.content}</div>
                  <div className="announcement-full-footer">Đăng bởi <strong>{selected.creator_name || "Quản trị viên"}</strong></div>
                  {canEditAny && <div className="announcement-modal-actions"><button type="button" className="primary-button" onClick={() => openEdit(selected)}>✏️ Chỉnh sửa</button><button type="button" className="secondary-button" onClick={closeModal}>Đóng</button></div>}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Notifications;
