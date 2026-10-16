import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "../Dashboard.css";

const emptyCompany = { name: "", company_type: "customer", industry: "", region: "", website: "", address: "", notes: "", visibility: "selected", access_user_ids: [], edit_user_ids: [] };
const emptyContact = { full_name: "", position: "", department: "", email: "", phone: "", decision_role: "", notes: "", view_roles: ["admin"], edit_roles: ["admin"] };
const typeLabels = { customer: "Khách hàng", partner: "Đối tác", supplier: "Nhà cung cấp" };
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d8e0ec", borderRadius: 9, font: "inherit", background: "white" };
const labelStyle = { display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 600 };
const buttonStyle = { border: 0, borderRadius: 9, padding: "10px 14px", background: "#2563eb", color: "white", fontWeight: 700, cursor: "pointer" };
const secondaryButton = { ...buttonStyle, background: "white", color: "#334155", border: "1px solid #d8e0ec" };

function Customers() {
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [companyModal, setCompanyModal] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const load = useCallback(async (search = query) => {
    setLoading(true); setError("");
    try {
      const [companyRes, meRes] = await Promise.all([api.get("/customers", { params: { q: search } }), api.get("/auth/me")]);
      setCompanies(Array.isArray(companyRes.data) ? companyRes.data : []);
      setCurrentUser(meRes.data);
      if (selected) {
        const refreshed = (companyRes.data || []).find((c) => c.id === selected.id);
        setSelected(refreshed || null);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "Không tải được danh sách khách hàng và đối tác.");
    } finally { setLoading(false); }
  }, [query, selected]);

  useEffect(() => {
    let alive = true;
    Promise.all([api.get("/customers"), api.get("/auth/me"), api.get("/users")])
      .then(([companiesRes, meRes, usersRes]) => { if (!alive) return; setCompanies(companiesRes.data || []); setCurrentUser(meRes.data); setUsers(usersRes.data || []); })
      .catch((e) => { if (alive) setError(e?.response?.data?.detail || "Không tải được dữ liệu."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filteredCompanies = useMemo(() => companies.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLocaleLowerCase("vi-VN");
    return [c.name, c.industry, c.region, ...(c.contacts || []).flatMap((x) => [x.full_name, x.email, x.phone, x.position])].some((v) => String(v || "").toLocaleLowerCase("vi-VN").includes(q));
  }), [companies, query]);

  const role = String(currentUser?.role_code || currentUser?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const canEditCompany = (c) => isAdmin || c.created_by_id === currentUser?.id || (c.edit_user_ids || []).includes(currentUser?.id);

  const openCreateCompany = () => { setEditingCompany(null); setCompanyForm({ ...emptyCompany, access_user_ids: currentUser?.id ? [currentUser.id] : [] }); setCompanyModal(true); };
  const openEditCompany = (c) => { setEditingCompany(c); setCompanyForm({ ...emptyCompany, ...c, access_user_ids: c.access_user_ids || [], edit_user_ids: c.edit_user_ids || [] }); setCompanyModal(true); };
  const openCreateContact = () => { setEditingContact(null); setContactForm({ ...emptyContact, view_roles: ["admin"], edit_roles: ["admin"] }); setContactModal(true); };
  const openEditContact = (contact) => { setEditingContact(contact); setContactForm({ ...emptyContact, ...contact, view_roles: contact.view_roles || ["admin", "supervisor", "leader", "user"], edit_roles: contact.edit_roles || ["admin"] }); setContactModal(true); };
  const toggleContactRole = (field, roleCode) => setContactForm((prev) => {
    const current = prev[field] || [];
    const next = current.includes(roleCode) ? current.filter((r) => r !== roleCode) : [...current, roleCode];
    if (field === "edit_roles") return { ...prev, edit_roles: next, view_roles: [...new Set([...(prev.view_roles || []), ...next])] };
    return { ...prev, view_roles: next, edit_roles: (prev.edit_roles || []).filter((r) => next.includes(r)) };
  });
  const handleLogout = () => { localStorage.removeItem("access_token"); window.location.href = "/"; };

  const saveCompany = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...companyForm, name: companyForm.name.trim(), access_user_ids: companyForm.access_user_ids.map(Number), edit_user_ids: companyForm.edit_user_ids.map(Number) };
      const response = editingCompany ? await api.put(`/customers/${editingCompany.id}`, payload) : await api.post("/customers", payload);
      setNotice(editingCompany ? "Đã cập nhật hồ sơ công ty." : "Đã tạo hồ sơ công ty."); setCompanyModal(false);
      await load(""); setSelected(response.data);
    } catch (e) { setError(e?.response?.data?.detail || "Không lưu được hồ sơ công ty."); }
    finally { setSaving(false); }
  };

  const saveContact = async (event) => {
    event.preventDefault(); if (!selected) return; setSaving(true); setError("");
    try {
      const payload = { ...contactForm, full_name: contactForm.full_name.trim() };
      if (editingContact) await api.put(`/customers/contacts/${editingContact.id}`, payload);
      else await api.post(`/customers/${selected.id}/contacts`, payload);
      setContactModal(false); setNotice(editingContact ? "Đã cập nhật contact." : "Đã thêm contact.");
      const response = await api.get("/customers", { params: { q: query } }); setCompanies(response.data || []); setSelected((response.data || []).find((c) => c.id === selected.id) || null);
    } catch (e) { setError(e?.response?.data?.detail || "Không lưu được contact."); }
    finally { setSaving(false); }
  };

  const removeContact = async (contact) => {
    if (!window.confirm(`Xóa contact ${contact.full_name}?`)) return;
    try { await api.delete(`/customers/contacts/${contact.id}`); setNotice("Đã xóa contact."); const r = await api.get("/customers", { params: { q: query } }); setCompanies(r.data || []); setSelected((r.data || []).find((c) => c.id === selected?.id) || null); }
    catch (e) { setError(e?.response?.data?.detail || "Không xóa được contact."); }
  };

  const removeCompany = async (company) => {
    if (!window.confirm(`Xóa hồ sơ ${company.name} và toàn bộ contact bên trong?`)) return;
    try { await api.delete(`/customers/${company.id}`); setSelected(null); setNotice("Đã xóa hồ sơ công ty."); await load(""); }
    catch (e) { setError(e?.response?.data?.detail || "Không xóa được hồ sơ công ty."); }
  };

  const toggleId = (field, id) => setCompanyForm((prev) => {
    const list = prev[field] || []; const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    if (field === "edit_user_ids") return { ...prev, edit_user_ids: next, access_user_ids: [...new Set([...(prev.access_user_ids || []), ...next])] };
    return { ...prev, access_user_ids: next, edit_user_ids: (prev.edit_user_ids || []).filter((x) => next.includes(x)) };
  });

  return <div className="dashboard-layout customers-page"><Sidebar /><main className="main-content customers-main-content"><Topbar user={currentUser} onLogout={handleLogout} title="Khách hàng & Đối tác" description="Quản lý công ty, key contact và quyền truy cập hồ sơ." /><div style={{ padding: "28px 32px", maxWidth: 1500, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
      <div><div style={{ color: "#2563eb", fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>CRM nội bộ</div><h1 style={{ margin: "8px 0", fontSize: 32, color: "#111827" }}>Khách hàng & Đối tác</h1><div style={{ color: "#64748b" }}>Quản lý công ty, key contact, lịch sử trao đổi và quyền truy cập hồ sơ.</div></div>
      <button style={buttonStyle} onClick={openCreateCompany}>＋ Tạo hồ sơ</button>
    </div>
    {error && <div role="alert" style={{ padding: 13, marginBottom: 14, borderRadius: 10, background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" }}>{typeof error === "string" ? error : "Có lỗi xảy ra."}<button onClick={() => setError("")} style={{ float: "right", border: 0, background: "transparent", cursor: "pointer" }}>×</button></div>}
    {notice && <div style={{ padding: 13, marginBottom: 14, borderRadius: 10, background: "#ecfdf5", color: "#047857" }}>{notice}<button onClick={() => setNotice("")} style={{ float: "right", border: 0, background: "transparent", cursor: "pointer" }}>×</button></div>}
    <div style={{ display: "grid", gridTemplateColumns: selected ? "minmax(300px, 0.8fr) minmax(450px, 1.5fr)" : "1fr", gap: 20, alignItems: "start" }}>
      <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: 18, borderBottom: "1px solid #edf1f7" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><strong>Danh sách hồ sơ</strong><span style={{ color: "#2563eb", background: "#eff6ff", padding: "4px 9px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{filteredCompanies.length} công ty</span></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm công ty, contact, email, số điện thoại..." style={inputStyle} /></div>
        {loading ? <div style={{ padding: 24, color: "#64748b" }}>Đang tải dữ liệu...</div> : filteredCompanies.length === 0 ? <div style={{ padding: 28, textAlign: "center", color: "#64748b" }}>Chưa có hồ sơ phù hợp. Tạo hồ sơ đầu tiên để bắt đầu.</div> : filteredCompanies.map((c) => <button key={c.id} onClick={() => setSelected(c)} style={{ width: "100%", textAlign: "left", display: "flex", gap: 12, alignItems: "center", padding: 16, border: 0, borderBottom: "1px solid #f1f5f9", background: selected?.id === c.id ? "#eff6ff" : "white", cursor: "pointer" }}><div style={{ width: 42, height: 42, borderRadius: 12, background: "#dbeafe", color: "#1d4ed8", display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 }}>{c.name?.trim()?.charAt(0)?.toUpperCase() || "C"}</div><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 750, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div><div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{typeLabels[c.company_type] || "Khách hàng"}{c.region ? ` · ${c.region}` : ""}</div></div><div style={{ color: "#64748b", fontSize: 12, whiteSpace: "nowrap" }}>{(c.contacts || []).length} contact</div></button>)}
      </section>
      {selected && <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: 22, borderBottom: "1px solid #edf1f7", background: "linear-gradient(135deg,#fff,#f8fbff)" }}><div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}><div style={{ width: 54, height: 54, borderRadius: 14, background: "#dbeafe", color: "#1d4ed8", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 800 }}>{selected.name?.charAt(0)?.toUpperCase()}</div><div style={{ flex: 1 }}><h2 style={{ margin: "0 0 6px", color: "#0f172a" }}>{selected.name}</h2><div style={{ color: "#64748b", fontSize: 13 }}>{typeLabels[selected.company_type] || "Khách hàng"}{selected.industry ? ` · ${selected.industry}` : ""}{selected.region ? ` · ${selected.region}` : ""}</div></div>{canEditCompany(selected) && <button style={secondaryButton} onClick={() => openEditCompany(selected)}>Chỉnh sửa</button>}</div>
          {(selected.website || selected.address || selected.notes) && <div style={{ display: "grid", gap: 7, marginTop: 16, color: "#475569", fontSize: 13 }}>{selected.website && <div>🌐 {selected.website}</div>}{selected.address && <div>📍 {selected.address}</div>}{selected.notes && <div>{selected.notes}</div>}</div>}
          <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>Quyền xem: {selected.visibility === "all" ? "Tất cả nhân viên" : "Người được cấp quyền"} · {selected.access_user_ids?.length || 0} người được cấp quyền</div>
        </div>
        <div style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}><div><h3 style={{ margin: 0, color: "#0f172a" }}>Key Contact</h3><div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{(selected.contacts || []).length} người liên hệ</div></div><button style={buttonStyle} onClick={openCreateContact}>＋ Thêm contact</button></div>
          {(selected.contacts || []).length === 0 ? <div style={{ padding: 24, border: "1px dashed #cbd5e1", borderRadius: 12, textAlign: "center", color: "#64748b" }}>Chưa có contact trong hồ sơ này.</div> : <div style={{ display: "grid", gap: 12 }}>{selected.contacts.map((c) => <div key={c.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 15 }}><div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><div style={{ width: 38, height: 38, borderRadius: 50, display: "grid", placeItems: "center", background: "#f1f5f9", color: "#334155", fontWeight: 800 }}>{c.full_name?.split(/\s+/).slice(-1)[0]?.charAt(0)?.toUpperCase()}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, color: "#0f172a" }}>{c.full_name}</div><div style={{ color: "#64748b", fontSize: 13, marginTop: 3 }}>{[c.position, c.department].filter(Boolean).join(" · ") || "Chưa cập nhật chức vụ"}</div>{c.decision_role && <div style={{ display: "inline-block", marginTop: 7, background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "3px 7px", fontSize: 11, fontWeight: 700 }}>{c.decision_role}</div>}<div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 9, fontSize: 13, color: "#475569" }}>{c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}{c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}</div>{c.notes && <div style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>{c.notes}</div>}</div>{c.can_edit && <div style={{ display: "flex", gap: 6 }}><button style={{ ...secondaryButton, padding: "7px 9px" }} onClick={() => openEditContact(c)}>Sửa</button><button style={{ ...secondaryButton, padding: "7px 9px", color: "#b91c1c" }} onClick={() => removeContact(c)}>Xóa</button></div>}</div></div>)}</div>}
          {canEditCompany(selected) && isAdmin || selected.created_by_id === currentUser?.id ? <div style={{ textAlign: "right", marginTop: 18 }}><button onClick={() => removeCompany(selected)} style={{ ...secondaryButton, color: "#b91c1c" }}>Xóa hồ sơ công ty</button></div> : null}
        </div>
      </section>}
    </div>
  </div></main>

  {companyModal && <div onMouseDown={(e) => { if (e.target === e.currentTarget) setCompanyModal(false); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", padding: 18 }}><form onSubmit={saveCompany} style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflow: "auto", background: "white", borderRadius: 16, padding: 24, boxSizing: "border-box", boxShadow: "0 20px 60px #0002" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><h2 style={{ margin: 0 }}>{editingCompany ? "Chỉnh sửa hồ sơ" : "Tạo hồ sơ khách hàng / đối tác"}</h2><button type="button" onClick={() => setCompanyModal(false)} style={{ border: 0, background: "transparent", fontSize: 24, cursor: "pointer" }}>×</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
    <label style={labelStyle}>Tên công ty *<input required value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} style={inputStyle} /></label>
    <label style={labelStyle}>Loại hồ sơ<select value={companyForm.company_type} onChange={(e) => setCompanyForm({ ...companyForm, company_type: e.target.value })} style={inputStyle}><option value="customer">Khách hàng</option><option value="partner">Đối tác</option><option value="supplier">Nhà cung cấp</option></select></label>
    <label style={labelStyle}>Ngành nghề<input value={companyForm.industry || ""} onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })} style={inputStyle} /></label>
    <label style={labelStyle}>Khu vực<input value={companyForm.region || ""} onChange={(e) => setCompanyForm({ ...companyForm, region: e.target.value })} style={inputStyle} placeholder="Ví dụ: Miền Nam" /></label>
    <label style={labelStyle}>Website<input value={companyForm.website || ""} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} style={inputStyle} /></label>
    <label style={labelStyle}>Địa chỉ<input value={companyForm.address || ""} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} style={inputStyle} /></label>
    <label style={{ ...labelStyle, gridColumn: "1/-1" }}>Ghi chú<textarea rows={2} value={companyForm.notes || ""} onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })} style={inputStyle} /></label>
    <div style={{ gridColumn: "1/-1", color: "#64748b", fontSize: 13, background: "#f8fafc", padding: 12, borderRadius: 8 }}>Thông tin công ty hiển thị với tất cả nhân viên. Quyền xem và chỉnh sửa được thiết lập riêng cho từng Key Contact.</div>
  </div><div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}><button type="button" style={secondaryButton} onClick={() => setCompanyModal(false)}>Hủy</button><button disabled={saving} style={{ ...buttonStyle, opacity: saving ? .6 : 1 }}>{saving ? "Đang lưu..." : "Lưu hồ sơ"}</button></div></form></div>}

  {contactModal && <div onMouseDown={(e) => { if (e.target === e.currentTarget) setContactModal(false); }} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", padding: 18 }}><form onSubmit={saveContact} style={{ width: "min(620px, 100%)", maxHeight: "90vh", overflow: "auto", background: "white", borderRadius: 16, padding: 24, boxSizing: "border-box" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><h2 style={{ margin: 0 }}>{editingContact ? "Sửa contact" : "Thêm key contact"}</h2><button type="button" onClick={() => setContactModal(false)} style={{ border: 0, background: "transparent", fontSize: 24, cursor: "pointer" }}>×</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
    <label style={labelStyle}>Họ và tên *<input required value={contactForm.full_name} onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })} style={inputStyle} /></label><label style={labelStyle}>Chức vụ<input value={contactForm.position || ""} onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })} style={inputStyle} /></label><label style={labelStyle}>Phòng ban<input value={contactForm.department || ""} onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })} style={inputStyle} /></label><label style={labelStyle}>Email<input type="email" value={contactForm.email || ""} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} style={inputStyle} /></label><label style={labelStyle}>Điện thoại<input value={contactForm.phone || ""} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} style={inputStyle} /></label><label style={labelStyle}>Vai trò trong quyết định mua hàng<input value={contactForm.decision_role || ""} onChange={(e) => setContactForm({ ...contactForm, decision_role: e.target.value })} style={inputStyle} placeholder="Người quyết định / ảnh hưởng..." /></label><label style={{ ...labelStyle, gridColumn: "1/-1" }}>Lịch sử trao đổi / ghi chú<textarea rows={3} value={contactForm.notes || ""} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} style={inputStyle} /></label>
    <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
      {[["view_roles","Role được xem"],["edit_roles","Role được chỉnh sửa"]].map(([field,label]) => <div key={field} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}><strong style={{ fontSize: 13 }}>{label}</strong><div style={{ display: "grid", gap: 8, marginTop: 10 }}>{[["admin","Admin"],["supervisor","Supervisor"],["leader","Leader"],["user","User"]].map(([code,name]) => <label key={code} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" checked={(contactForm[field] || []).includes(code)} onChange={() => toggleContactRole(field,code)} />{name}</label>)}</div></div>)}
    </div>
  </div><div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}><button type="button" style={secondaryButton} onClick={() => setContactModal(false)}>Hủy</button><button disabled={saving} style={buttonStyle}>{saving ? "Đang lưu..." : "Lưu contact"}</button></div></form></div>}
  </div>;
}

export default Customers;
