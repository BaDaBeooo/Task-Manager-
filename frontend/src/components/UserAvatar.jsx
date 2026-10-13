import { resolveAvatarUrl } from "../utils/avatar";

function getInitial(fullName = "") {
  const name = fullName.trim();
  return name ? name.charAt(0).toUpperCase() : "?";
}

function getAvatarColor(userId) {
  const colors = ["#DBEAFE", "#DCFCE7", "#FCE7F3", "#FEF3C7", "#EDE9FE", "#CCFBF1", "#FFEDD5", "#E0E7FF"];
  return userId ? colors[userId % colors.length] : colors[0];
}

export default function UserAvatar({ user, size = "medium", showRole = true, showName = true }) {
  if (!user) return null;
  const fullName = user.full_name || user.fullName || "Unknown User";
  const position = user.position || "Chưa cập nhật chức vụ";
  const avatarUrl = user.avatar_url;
  return (
    <div className={`user-avatar-wrapper user-avatar-${size}`}>
      <div className="user-avatar-circle" style={{ backgroundColor: getAvatarColor(user.id), overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {avatarUrl ? <img src={resolveAvatarUrl(avatarUrl)} alt="" className="user-avatar-photo" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : getInitial(fullName)}
      </div>
      {(showName || showRole) && <div className="user-avatar-info">
        {showName && <div className="user-avatar-name">{fullName}</div>}
        {showRole && <div className="user-avatar-role">{position}</div>}
      </div>}
    </div>
  );
}
