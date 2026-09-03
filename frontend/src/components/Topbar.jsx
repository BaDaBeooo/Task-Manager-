import NotificationBell from "./NotificationBell";


function Topbar({ user, onLogout }) {
  return (
    <header className="topbar">

      <div className="topbar-left">

        <div className="page-title">
          Tổng quan
        </div>

        <div className="page-description">
          Theo dõi công việc của nhóm
        </div>

      </div>


      <div className="topbar-right">

        <NotificationBell />


        <div className="user-menu">

          <div className="user-avatar">
            {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="user-info">

            <strong>
              {user?.full_name || user?.username}
            </strong>

            <span>
              {user?.role || "user"}
            </span>

          </div>

        </div>


        <button
          className="logout-button"
          onClick={onLogout}
          title="Đăng xuất"
        >
          ↪
        </button>

      </div>

    </header>
  );
}

export default Topbar;