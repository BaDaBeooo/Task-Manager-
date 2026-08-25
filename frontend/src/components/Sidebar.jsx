import { NavLink } from "react-router-dom";

function Sidebar() {
  const navClass = ({ isActive }) =>
    `nav-item${isActive ? " active" : ""}`;

  return (
    <aside className="sidebar">

      {/* LOGO */}
      <div className="sidebar-logo">

        <div className="logo-icon">
          T
        </div>

        <div>
          <div className="logo-title">
            Task Manager
          </div>

          <div className="logo-subtitle">
            Team Workspace
          </div>
        </div>

      </div>


      {/* NAVIGATION */}
      <nav className="sidebar-nav">

        <div className="nav-section-title">
          MENU
        </div>


        {/* DASHBOARD */}
        <NavLink
          to="/dashboard"
          className={navClass}
        >
          <span>🏠</span>
          <span>Tổng quan</span>
        </NavLink>


        {/* ALL TASKS */}
        <NavLink
          to="/tasks"
          className={navClass}
        >
          <span>📋</span>
          <span>Công việc</span>
        </NavLink>


        {/* MY TASKS */}
        <NavLink
          to="/my-tasks"
          className={navClass}
        >
          <span>👤</span>
          <span>Việc của tôi</span>
        </NavLink>


        {/* SUPPORT */}
        <NavLink
          to="/support"
          className={navClass}
        >
          <span>📥</span>
          <span>Yêu cầu hỗ trợ</span>
        </NavLink>


        {/* OTHER */}
        <div className="nav-section-title">
          KHÁC
        </div>


        {/* NOTIFICATIONS */}
        <NavLink
          to="/notifications"
          className={navClass}
        >
          <span>🔔</span>
          <span>Thông báo</span>
        </NavLink>


        {/* REPORTS */}
        <NavLink
          to="/reports"
          className={navClass}
        >
          <span>📊</span>
          <span>Báo cáo</span>
        </NavLink>


        {/* SETTINGS */}
        <NavLink
          to="/settings"
          className={navClass}
        >
          <span>⚙️</span>
          <span>Cài đặt</span>
        </NavLink>

      </nav>


      {/* HELP */}
      <div className="sidebar-bottom">

        <div className="sidebar-help">

          <div className="help-icon">
            ?
          </div>

          <div>
            <strong>
              Cần hỗ trợ?
            </strong>

            <span>
              Liên hệ quản trị viên
            </span>
          </div>

        </div>

      </div>

    </aside>
  );
}

export default Sidebar;