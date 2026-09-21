import {
  useEffect,
  useState,
} from "react";

import {
  NavLink,
} from "react-router-dom";

import api from "../services/api";


function getRoleCode(user) {

  if (!user?.role) {
    return "";
  }


  if (
    typeof user.role ===
    "string"
  ) {

    return user.role
      .toLowerCase()
      .trim();

  }


  return (
    user.role.code ||
    user.role.name ||
    ""
  )
    .toLowerCase()
    .trim();
}


function Sidebar() {

  const [user, setUser] = useState(null);


  useEffect(() => {

    let mounted = true;


    const loadUser =
      async () => {

        try {

          const response =
            await api.get(
              "/auth/me"
            );


          if (!mounted) {
            return;
          }


          const role =
            getRoleCode(
              response.data
            );


          setUser(response.data);


        } catch (error) {

          console.warn(
            "Sidebar user load failed:",
            error
          );

          if (mounted) {
            setUser(null);
          }

        }

      };


    loadUser();


    return () => {
      mounted = false;
    };

  }, []);


  const navClass =
    ({ isActive }) =>
      `nav-item${
        isActive
          ? " active"
          : ""
      }`;


  return (
    <aside className="sidebar">

      {/* =====================================================
          LOGO
      ===================================================== */}

      <div className="sidebar-logo">

        <img
          src="/miraway-logo.png"
          alt="Miraway"
          className="sidebar-logo-image"
        />


        <div className="sidebar-logo-text">

          <div className="logo-title">
            Task Manager
          </div>


          <div className="logo-subtitle">
            Miraway
          </div>

        </div>

      </div>


      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="sidebar-nav">

        <div className="nav-section-title">
          MENU
        </div>


        {/* DASHBOARD */}

        <NavLink
          to="/dashboard"
          className={navClass}
        >

          <span>
            🏠
          </span>

          <span>
            Tổng quan
          </span>

        </NavLink>


        {/* ALL TASKS */}

        <NavLink
          to="/tasks"
          className={navClass}
        >

          <span>
            📋
          </span>

          <span>
            Công việc
          </span>

        </NavLink>


        {/* MY TASKS */}

        <NavLink
          to="/my-tasks"
          className={navClass}
        >

          <span>
            👤
          </span>

          <span>
            Việc của tôi
          </span>

        </NavLink>


        {/* SUPPORT */}

        <NavLink
          to="/support"
          end
          className={navClass}
        >

          <span>
            📥
          </span>

          <span>
            Yêu cầu hỗ trợ
          </span>

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

          <span>
            🔔
          </span>

          <span>
            Thông báo
          </span>

        </NavLink>


        {/* REPORTS */}

        <NavLink
          to="/reports"
          className={navClass}
        >

          <span>
            📊
          </span>

          <span>
            Báo cáo
          </span>

        </NavLink>


        {/* SETTINGS */}

        <NavLink
          to="/settings"
          className={navClass}
        >

          <span>
            ⚙️
          </span>

          <span>
            Cài đặt
          </span>

        </NavLink>


        {/* =================================================
            SUPPORT ADMIN
        ================================================= */}

        {["admin", "supervisor", "leader"].includes(String(user?.role_code || user?.role || "").toLowerCase()) && (

          <>

            <div className="nav-section-title">
              QUẢN TRỊ
            </div>


            <NavLink
              to="/support/settings"
              end
              className={navClass}
            >

              <span>
                🛠️
              </span>

              <span>
                Quản trị Support
              </span>

            </NavLink>

          </>

        )}

      </nav>


      {/* =====================================================
          HELP
      ===================================================== */}

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