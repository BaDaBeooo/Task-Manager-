function Sidebar() {
  return (
    <aside className="sidebar">

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


      <nav className="sidebar-nav">

        <div className="nav-section-title">
          MENU
        </div>

        <a
          href="/dashboard"
          className="nav-item active"
        >
          <span>🏠</span>
          <span>Tổng quan</span>
        </a>


        <a
          href="#"
          className="nav-item"
        >
          <span>📋</span>
          <span>Công việc</span>
        </a>


        <a
          href="#"
          className="nav-item"
        >
          <span>👤</span>
          <span>Việc của tôi</span>
        </a>


        <a
          href="#"
          className="nav-item"
        >
          <span>📥</span>
          <span>Yêu cầu hỗ trợ</span>
        </a>


        <div className="nav-section-title">
          KHÁC
        </div>


        <a
          href="#"
          className="nav-item"
        >
          <span>🔔</span>
          <span>Thông báo</span>
        </a>


        <a
          href="#"
          className="nav-item"
        >
          <span>📊</span>
          <span>Báo cáo</span>
        </a>


        <a
          href="#"
          className="nav-item"
        >
          <span>⚙️</span>
          <span>Cài đặt</span>
        </a>

      </nav>


      <div className="sidebar-bottom">

        <div className="sidebar-help">
          <div className="help-icon">
            ?
          </div>

          <div>
            <strong>Cần hỗ trợ?</strong>
            <span>Liên hệ quản trị viên</span>
          </div>
        </div>

      </div>

    </aside>
  );
}

export default Sidebar;