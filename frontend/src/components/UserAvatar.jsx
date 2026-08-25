function getInitial(fullName = "") {
  const name = fullName.trim();

  if (!name) {
    return "?";
  }

  return name.charAt(0).toUpperCase();
}


function getAvatarColor(userId) {
  const colors = [
    "#DBEAFE",
    "#DCFCE7",
    "#FCE7F3",
    "#FEF3C7",
    "#EDE9FE",
    "#CCFBF1",
    "#FFEDD5",
    "#E0E7FF",
  ];

  if (!userId) {
    return colors[0];
  }

  return colors[userId % colors.length];
}


function UserAvatar({
  user,
  size = "medium",
  showRole = true,
}) {
  if (!user) {
    return null;
  }

  const fullName =
    user.full_name ||
    user.fullName ||
    "Unknown User";

  const role =
    typeof user.role === "string"
      ? user.role
      : user.role?.name || "";

  const initial =
    getInitial(fullName);

  const backgroundColor =
    getAvatarColor(user.id);

  return (
    <div
      className={`user-avatar-wrapper user-avatar-${size}`}
    >
      <div
        className="user-avatar-circle"
        style={{
          backgroundColor,
        }}
      >
        {initial}
      </div>

      <div className="user-avatar-info">

        <div className="user-avatar-name">
          {fullName}
        </div>

        {showRole && role && (
          <div className="user-avatar-role">
            {role}
          </div>
        )}

      </div>
    </div>
  );
}


export default UserAvatar;