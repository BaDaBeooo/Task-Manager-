import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "../services/api";
import "../Dashboard.css";
import "./DocumentLibrary.css";

const TYPES = ["Datasheet", "Catalogue", "Brochure", "PowerPoint", "Bảng giá", "Tài liệu kỹ thuật", "Hướng dẫn", "Khác"];
const TAG_SUGGESTIONS = ["CCTV", "AI", "Access Control", "Networking", "QMS"];
const fmtSize = (bytes = 0) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const fmtDate = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";
const errorText = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (typeof item === "string") return item;
      const location = Array.isArray(item?.loc) ? item.loc.filter((part) => part !== "body" && part !== "query").join(" → ") : "";
      const message = item?.msg || item?.message || JSON.stringify(item);
      return location ? `${location}: ${message}` : message;
    }).join("; ");
  }
  if (detail && typeof detail === "object") return detail.message || detail.msg || JSON.stringify(detail);
  return error?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
};

const emptyForm = () => ({ title: "", vendor: "", product: "", model: "", document_type: "Datasheet", tags: "", description: "", visibility: "all", allowed_user_ids: [] });

function DocumentLibrary() {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderSaving, setFolderSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState({});
  const [versionTarget, setVersionTarget] = useState(null);
  const [versionFile, setVersionFile] = useState(null);
  const [storage, setStorage] = useState({ used: 0, limit: 20 * 1024 * 1024 * 1024, maxFile: 500 * 1024 * 1024 });
  const fileInput = useRef(null);
  const handleLogout = () => { localStorage.removeItem("access_token"); window.location.href = "/"; };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (query.trim()) params.q = query.trim();
      if (vendorFilter.trim()) params.vendor = vendorFilter.trim();
      if (typeFilter) params.document_type = typeFilter;
      if (tagFilter) params.tag = tagFilter;
      // Omit nullable folder filters instead of sending the literal "null" to FastAPI.
      if (currentFolderId != null) params.folder_id = currentFolderId;
      const folderParams = currentFolderId != null ? { parent_id: currentFolderId } : {};
      // Load account independently so a document/folder API error cannot blank the Topbar.
      const [meResult, usersResult, docsResult, foldersResult] = await Promise.allSettled([
        api.get("/auth/me"),
        api.get("/users"),
        api.get("/document-library", { params }),
        api.get("/document-library/folders", { params: folderParams }),
      ]);
      if (meResult.status === "fulfilled") setCurrentUser(meResult.value.data);
      if (usersResult.status === "fulfilled") setUsers(usersResult.value.data || []);
      if (docsResult.status === "fulfilled") {
        const data = docsResult.value.data || {};
        setDocuments(Array.isArray(data.items) ? data.items : []);
        setStorage({ used: data.storage_used || 0, limit: data.max_total_storage || (20 * 1024 * 1024 * 1024), maxFile: data.max_file_size || (500 * 1024 * 1024) });
      } else {
        throw docsResult.reason;
      }
      if (foldersResult.status === "fulfilled") setFolders(foldersResult.value.data || []);
      else throw foldersResult.reason;
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [query, vendorFilter, typeFilter, tagFilter, currentFolderId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    let active = true;
    if (currentFolderId == null) { setFolderPath([]); return () => { active = false; }; }
    api.get(`/document-library/folders/${currentFolderId}/path`).then((response) => { if (active) setFolderPath(response.data || []); }).catch((err) => { if (active) setError(errorText(err)); });
    return () => { active = false; };
  }, [currentFolderId]);

  const allTags = useMemo(() => [...new Set(documents.flatMap((item) => item.tags || []))].sort((a, b) => a.localeCompare(b)), [documents]);
  const isAdmin = String(currentUser?.role_code || "").toLowerCase() === "admin";
  const usagePercent = Math.min(100, storage.limit ? storage.used / storage.limit * 100 : 0);

  const startCreate = () => {
    setEditing(null); setForm(emptyForm()); setFiles([]); setNotice(""); setShowUpload(true);
  };
  const startEdit = (doc) => {
    setEditing(doc); setForm({ title: doc.title, vendor: doc.vendor, product: doc.product, model: doc.model, document_type: doc.document_type, tags: (doc.tags || []).join(", "), description: doc.description, visibility: doc.visibility, allowed_user_ids: doc.allowed_user_ids || [] }); setFiles([]); setNotice(""); setShowUpload(true);
  };
  const updateForm = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, key === "allowed_user_ids" ? JSON.stringify(value) : value));
      if (!editing && currentFolderId != null) data.append("folder_id", String(currentFolderId));
      if (editing) {
        await api.patch(`/document-library/${editing.id}`, data, { headers: { "Content-Type": "multipart/form-data" } });
        if (files.length) {
          for (const file of files) {
            const versionData = new FormData(); versionData.append("file", file);
            await api.post(`/document-library/${editing.id}/versions`, versionData, { headers: { "Content-Type": "multipart/form-data" } });
          }
        }
        setNotice("Đã cập nhật tài liệu.");
      } else {
        if (!files.length) { setError("Vui lòng chọn ít nhất một file để tải lên."); setSaving(false); return; }
        files.forEach((file) => data.append("files", file));
        await api.post("/document-library", data, { headers: { "Content-Type": "multipart/form-data" } });
        setNotice(`Đã tải lên ${files.length} file thành công.`);
      }
      setShowUpload(false); setEditing(null); setFiles([]); await loadData();
    } catch (err) { setError(errorText(err)); }
    finally { setSaving(false); }
  };

  const openFile = async (doc, version, inline = false) => {
    try {
      const response = await api.get(`/document-library/${doc.id}/versions/${version.id}/file`, { params: { inline }, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      if (inline) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      } else {
        link.download = version.original_filename;
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) { setError(errorText(err)); }
  };

  const addVersion = async (event) => {
    event.preventDefault();
    if (!versionTarget || !versionFile) return;
    setSaving(true); setError("");
    try {
      const data = new FormData(); data.append("file", versionFile);
      await api.post(`/document-library/${versionTarget.id}/versions`, data, { headers: { "Content-Type": "multipart/form-data" } });
      setVersionTarget(null); setVersionFile(null); await loadData();
    } catch (err) { setError(errorText(err)); }
    finally { setSaving(false); }
  };

  const createFolder = async (event) => {
    event.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    setFolderSaving(true); setError("");
    try {
      const data = new FormData();
      data.append("name", name);
      if (currentFolderId != null) data.append("parent_id", String(currentFolderId));
      const response = await api.post("/document-library/folders", data, { headers: { "Content-Type": "multipart/form-data" } });
      // Update the visible folder list immediately; avoid a full reload/race after creation.
      const createdFolder = response?.data;
      if (createdFolder && createdFolder.id != null) {
        setFolders((previous) => [...previous, {
          child_count: 0,
          document_count: 0,
          ...createdFolder,
        }].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi")));
      } else {
        await loadData();
      }
      setFolderName("");
      setShowFolderModal(false);
      setNotice(`Đã tạo thư mục “${name}”.`);
    } catch (err) { setError(errorText(err)); }
    finally { setFolderSaving(false); }
  };

  const renameFolder = async (folder) => {
    const name = window.prompt("Tên thư mục mới:", folder.name);
    if (name == null || !name.trim() || name.trim() === folder.name) return;
    try { const data = new FormData(); data.append("name", name.trim()); await api.patch(`/document-library/folders/${folder.id}`, data); await loadData(); }
    catch (err) { setError(errorText(err)); }
  };

  const deleteFolder = async (folder) => {
    if (!window.confirm(`Xóa thư mục “${folder.name}”? Chỉ thư mục rỗng mới xóa được.`)) return;
    try { await api.delete(`/document-library/folders/${folder.id}`); await loadData(); }
    catch (err) { setError(errorText(err)); }
  };

  const deleteDocument = async (doc) => {
    if (!window.confirm(`Xóa tài liệu “${doc.title}”? Các file phiên bản trên ổ lưu trữ cũng sẽ bị xóa.`)) return;
    try { await api.delete(`/document-library/${doc.id}`); setNotice("Đã xóa tài liệu."); await loadData(); }
    catch (err) { setError(errorText(err)); }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main library-main">
        <Topbar user={currentUser} onLogout={handleLogout} title="Kho dữ liệu" description="Datasheet, catalogue và tài liệu kỹ thuật của hãng" />
        <div className="library-page">
          <div className="library-heading">
            <div><div className="library-eyebrow">TÀI LIỆU HÃNG & NHÀ CUNG CẤP</div><h1>Kho dữ liệu</h1><p>Tập trung datasheet, catalogue, brochure, bảng giá và tài liệu kỹ thuật.</p></div>
            <div className="library-heading-actions"><button className="library-secondary" onClick={() => { setFolderName(""); setShowFolderModal(true); }}>＋ Tạo thư mục</button><button className="library-primary" onClick={startCreate}>↑ Tải tài liệu lên</button></div>
          </div>

          <div className="library-storage-card">
            <div className="library-storage-icon">▤</div>
            <div className="library-storage-info"><strong>Dung lượng kho</strong><span>{fmtSize(storage.used)} đã sử dụng / {fmtSize(storage.limit)}</span><div className="library-progress"><span style={{ width: `${usagePercent}%` }} /></div></div>
            <div className="library-storage-meta"><strong>{usagePercent.toFixed(1)}%</strong><span>Tối đa {fmtSize(storage.maxFile)}/file</span></div>
          </div>

          {error && <div className="library-alert error">{error}<button onClick={() => setError("")}>×</button></div>}
          {notice && <div className="library-alert success">{notice}<button onClick={() => setNotice("")}>×</button></div>}

          <div className="library-breadcrumb"><button onClick={() => setCurrentFolderId(null)}>Kho dữ liệu</button>{folderPath.map((folder) => <span key={folder.id}>› <button onClick={() => setCurrentFolderId(folder.id)}>{folder.name}</button></span>)}</div>
          <div className="library-list-header"><div><h2>Thư mục</h2><span>{folders.length} thư mục</span></div></div>
          {folders.length > 0 && <div className="library-folder-grid">{folders.map((folder) => <article className="library-folder-card" key={folder.id}><button className="library-folder-open" onDoubleClick={() => setCurrentFolderId(folder.id)} onClick={() => setCurrentFolderId(folder.id)}><span className="library-folder-icon">📁</span><span className="library-folder-name">{folder.name}</span><small>{folder.child_count} thư mục · {folder.document_count} tài liệu</small></button>{(folder.can_manage || isAdmin) && <div className="library-folder-actions"><button title="Đổi tên" onClick={() => renameFolder(folder)}>✎</button><button title="Xóa" onClick={() => deleteFolder(folder)}>×</button></div>}</article>)}</div>}

          <div className="library-filters">
            <label className="library-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm hãng, sản phẩm, model, tài liệu..." /></label>
            <input value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} placeholder="Lọc theo hãng" aria-label="Lọc theo hãng" />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Loại tài liệu"><option value="">Tất cả loại tài liệu</option>{TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} aria-label="Lọc theo tag"><option value="">Tất cả tag</option>{[...new Set([...TAG_SUGGESTIONS, ...allTags])].map((tag) => <option key={tag}>{tag}</option>)}</select>
          </div>

          <div className="library-list-header"><div><h2>Tài liệu trong thư mục</h2><span>{documents.length} mục</span></div><button className="library-refresh" onClick={loadData} title="Tải lại">↻ Làm mới</button></div>
          {loading ? <div className="library-empty"><div className="library-spinner" />Đang tải kho dữ liệu...</div> : documents.length === 0 ? <div className="library-empty"><div className="library-empty-icon">▤</div><strong>Chưa có tài liệu phù hợp</strong><span>Tải lên datasheet hoặc catalogue đầu tiên để bắt đầu xây dựng kho dữ liệu.</span><button className="library-primary" onClick={startCreate}>＋ Tải tài liệu lên</button></div> : (
            <div className="library-doc-list">
              {documents.map((doc) => {
                const latest = doc.latest_version;
                const expandedNow = !!expanded[doc.id];
                return <article className="library-doc-card" key={doc.id}>
                  <div className="library-doc-main"><div className="library-file-icon">{latest?.original_filename?.toLowerCase().endsWith(".pdf") ? "PDF" : latest?.original_filename?.toLowerCase().match(/\.(ppt|pptx)$/) ? "PPT" : "FILE"}</div>
                    <div className="library-doc-info"><div className="library-doc-title-row"><h3>{doc.title}</h3><span className="library-type-pill">{doc.document_type}</span>{doc.visibility === "restricted" && <span className="library-private-pill">Riêng tư</span>}</div>
                      <div className="library-doc-meta">{doc.vendor || "Chưa có hãng"}{doc.product ? ` · ${doc.product}` : ""}{doc.model ? ` · Model ${doc.model}` : ""}</div>
                      {doc.description && <p className="library-doc-description">{doc.description}</p>}
                      <div className="library-tags">{(doc.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div>
                      <div className="library-doc-submeta"><span>{latest?.original_filename || "Chưa có file"}</span><span>{latest ? fmtSize(latest.size_bytes) : "—"}</span><span>v{latest?.version_number || 1} · {doc.version_count} phiên bản</span><span>Cập nhật {fmtDate(doc.updated_at)}</span></div>
                    </div>
                    <div className="library-doc-actions"><button className="library-action-primary" disabled={!latest} onClick={() => openFile(doc, latest, false)}>↓ Tải xuống</button><button onClick={() => setExpanded((old) => ({ ...old, [doc.id]: !old[doc.id] }))}>{expandedNow ? "Thu gọn" : "Phiên bản"}</button>{doc.can_manage && <button onClick={() => startEdit(doc)}>Chỉnh sửa</button>}{isAdmin && <button className="library-delete" onClick={() => deleteDocument(doc)}>Xóa</button>}</div>
                  </div>
                  {expandedNow && <div className="library-version-panel"><div className="library-version-heading"><strong>Lịch sử phiên bản</strong>{doc.can_manage && <button onClick={() => { setVersionTarget(doc); setVersionFile(null); }}>＋ Tải phiên bản mới</button>}</div>
                    {(doc.versions || []).map((version) => <div className="library-version-row" key={version.id}><span className="library-version-number">v{version.version_number}</span><div className="library-version-file"><strong>{version.original_filename}</strong><span>{fmtSize(version.size_bytes)} · {fmtDate(version.uploaded_at)}</span></div><div className="library-version-actions">{[".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".txt"].some((ext) => version.original_filename.toLowerCase().endsWith(ext)) && <button onClick={() => openFile(doc, version, true)}>Xem trước</button>}<button onClick={() => openFile(doc, version, false)}>Tải xuống</button></div></div>)}
                  </div>}
                </article>;
              })}
            </div>
          )}
        </div>
      </main>

      {showFolderModal && <div className="library-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowFolderModal(false); }}><form className="library-modal library-folder-modal" onSubmit={createFolder}><div className="library-modal-heading"><div><span>QUẢN LÝ THƯ MỤC</span><h2>Tạo thư mục mới</h2><p>{folderPath.length ? `Vị trí: ${folderPath.map((item) => item.name).join(" / ")}` : "Vị trí: Kho dữ liệu gốc"}</p></div><button type="button" onClick={() => setShowFolderModal(false)}>×</button></div><label className="library-folder-name-field">Tên thư mục<input autoFocus maxLength={200} value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Ví dụ: GeoVision" required /></label><div className="library-modal-footer"><button type="button" className="library-secondary" onClick={() => setShowFolderModal(false)}>Hủy</button><button className="library-primary" disabled={folderSaving || !folderName.trim()}>{folderSaving ? "Đang tạo..." : "Tạo thư mục"}</button></div></form></div>}

      {showUpload && <div className="library-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowUpload(false); }}><form className="library-modal" onSubmit={submitForm}><div className="library-modal-heading"><div><span>{editing ? "CẬP NHẬT HỒ SƠ" : "THÊM VÀO KHO"}</span><h2>{editing ? "Chỉnh sửa tài liệu" : "Tải tài liệu lên"}</h2></div><button type="button" onClick={() => setShowUpload(false)}>×</button></div>
        <div className="library-form-grid"><label className="span-2">Tên tài liệu<input value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="Ví dụ: Datasheet camera GV-VD8700" /></label><label>Hãng / Nhà cung cấp<input value={form.vendor} onChange={(e) => updateForm("vendor", e.target.value)} placeholder="GeoVision" /></label><label>Sản phẩm / Dòng sản phẩm<input value={form.product} onChange={(e) => updateForm("product", e.target.value)} placeholder="AI Camera" /></label><label>Model<input value={form.model} onChange={(e) => updateForm("model", e.target.value)} placeholder="GV-VD8700" /></label><label>Loại tài liệu<select value={form.document_type} onChange={(e) => updateForm("document_type", e.target.value)}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="span-2">Tags <span className="library-field-hint">(phân cách bằng dấu phẩy)</span><input value={form.tags} onChange={(e) => updateForm("tags", e.target.value)} placeholder="CCTV, AI, Access Control" />{!form.tags && <div className="library-suggested-tags">Gợi ý: {TAG_SUGGESTIONS.map((tag) => <button type="button" key={tag} onClick={() => updateForm("tags", form.tags ? `${form.tags}, ${tag}` : tag)}>{tag}</button>)}</div>}</label><label className="span-2">Mô tả<textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows="2" placeholder="Ghi chú ngắn về tài liệu..." /></label>
          <label className="span-2">Quyền xem<select value={form.visibility} onChange={(e) => updateForm("visibility", e.target.value)}><option value="all">Tất cả nhân viên</option><option value="restricted">Chỉ người được chỉ định và Admin</option></select></label>
          {form.visibility === "restricted" && <label className="span-2">Người được xem <select multiple value={form.allowed_user_ids.map(String)} onChange={(e) => updateForm("allowed_user_ids", Array.from(e.target.selectedOptions).map((option) => Number(option.value)))} size="4">{users.map((user) => <option key={user.id} value={user.id}>{user.full_name} ({user.username})</option>)}</select><span className="library-field-hint">Giữ Ctrl để chọn nhiều người. Người tạo và Admin luôn có quyền xem.</span></label>}
          <label className="span-2 library-file-drop"><input ref={fileInput} type="file" multiple={!editing} onChange={(e) => setFiles(Array.from(e.target.files || []))} /> <strong>{files.length ? `${files.length} file đã chọn` : editing ? "Chọn file mới để thêm phiên bản (không bắt buộc)" : "Chọn một hoặc nhiều file"}</strong><span>PDF, Office, ảnh, ZIP, file kỹ thuật · Tối đa {fmtSize(storage.maxFile)}/file</span>{files.length > 0 && <small>{files.map((file) => `${file.name} (${fmtSize(file.size)}`).join(" · ")}</small>}</label>
        </div><div className="library-modal-footer"><span>File được lưu ngoài thư mục frontend/dist.</span><button type="button" className="library-secondary" onClick={() => setShowUpload(false)}>Hủy</button><button className="library-primary" disabled={saving}>{saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tải lên"}</button></div></form></div>}

      {versionTarget && <div className="library-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setVersionTarget(null); }}><form className="library-modal library-version-modal" onSubmit={addVersion}><div className="library-modal-heading"><div><span>QUẢN LÝ PHIÊN BẢN</span><h2>Thêm phiên bản mới</h2><p>{versionTarget.title}</p></div><button type="button" onClick={() => setVersionTarget(null)}>×</button></div><label className="library-file-drop"><input type="file" required onChange={(e) => setVersionFile(e.target.files?.[0] || null)} /><strong>{versionFile?.name || "Chọn file phiên bản mới"}</strong><span>Phiên bản cũ vẫn được giữ lại.</span></label><div className="library-modal-footer"><button type="button" className="library-secondary" onClick={() => setVersionTarget(null)}>Hủy</button><button className="library-primary" disabled={saving || !versionFile}>{saving ? "Đang tải..." : "Lưu phiên bản"}</button></div></form></div>}
    </div>
  );
}

export default DocumentLibrary;
