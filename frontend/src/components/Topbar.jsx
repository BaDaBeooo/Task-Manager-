import NotificationBell from "./NotificationBell";


function getRoleName(role) {
  if (!role) {
    return "user";
  }

  if (typeof role === "string") {
    return role;
  }

  return (
    role.name ||
    role.code ||
    "user"
  );
}


function Topbar({
  user,
  onLogout,
  title = "Tổng quan",
  description = "Theo dõi công việc của nhóm",
}) {
  return (
    <header className="topbar">

      <div className="topbar-left">

        <div className="page-title">
          {title}
        </div>

        <div className="page-description">
          {description}
        </div>

      </div>


      <div className="topbar-right">

        <NotificationBell />


        <div className="user-menu">

          <div className="user-avatar">
            {(
              user?.full_name ||
              user?.username ||
              "U"
            )
              .charAt(0)
              .toUpperCase()}
          </div>


          <div className="user-info">

            <strong>
              {user?.full_name ||
                user?.username ||
                "user"}
            </strong>

            <span>
              {getRoleName(user?.role)}
            </span>

          </div>

        </div>


        <button
          className="logout-button"
          onClick={onLogout}
          title="Đăng xuất"
          type="button"
        >
          ↪
        </button>

      </div>

    </header>
  );
}


export default Topbar;