import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import NotificationBell from "./NotificationBell";
import AvatarCropModal from "./AvatarCropModal";
import { resolveAvatarUrl } from "../utils/avatar";

function getRoleName(role) {
  if (!role) return "user";
  if (typeof role === "string") return role;
  return role.name || role.code || "user";
}

function Topbar({ user, onLogout, title = "Tổng quan", description = "Theo dõi công việc của nhóm" }) {
  const fileInput = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [cropFile, setCropFile] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  useEffect(() => setAvatarUrl(user?.avatar_url || ""), [user?.avatar_url]);

  const chooseFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setAvatarError("");
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setAvatarError("Chỉ hỗ trợ ảnh PNG, JPG hoặc WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError("Ảnh gốc tối đa 10 MB.");
      return;
    }
    setCropFile(file);
  };

  const saveAvatar = async (avatarData) => {
    try {
      setSavingAvatar(true);
      setAvatarError("");
      const response = await api.put("/users/me/avatar", { avatar_data: avatarData });
      setAvatarUrl(response.data.avatar_url);
      setCropFile(null);
      window.dispatchEvent(new CustomEvent("taskmanager:avatar-updated", { detail: { avatar_url: response.data.avatar_url } }));
    } catch (error) {
      setAvatarError(error.response?.data?.detail || "Không thể lưu ảnh đại diện.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const name = user?.full_name || user?.username || "U";
  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="page-title">{title}</div>
          <div className="page-description">{description}</div>
        </div>
        <div className="topbar-right">
          <NotificationBell />
          <div className="user-menu">
            <button className="topbar-avatar-button" type="button" onClick={() => fileInput.current?.click()} title="Đổi ảnh đại diện" aria-label="Đổi ảnh đại diện">
              {avatarUrl ? <img className="topbar-avatar-image" src={resolveAvatarUrl(avatarUrl)} alt="Avatar" onError={() => setAvatarUrl("")} /> : <span className="user-avatar">{name.charAt(0).toUpperCase()}</span>}
              <span className="topbar-avatar-edit">✎</span>
            </button>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={chooseFile} />
            <div className="user-info">
              <strong>{name}</strong>
              <span>{user?.position || "Chưa cập nhật chức vụ"}</span>
            </div>
          </div>
          <button className="logout-button" onClick={onLogout} title="Đăng xuất" type="button">↪</button>
        </div>
      </header>
      {avatarError && <div className="avatar-toast" role="alert"><span>{avatarError}</span><button type="button" onClick={() => setAvatarError("")}>×</button></div>}
      {cropFile && <AvatarCropModal file={cropFile} onCancel={() => setCropFile(null)} onSave={saveAvatar} saving={savingAvatar} />}
    </>
  );
}

export default Topbar;
