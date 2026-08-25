import { useEffect, useState } from "react";

import api from "../services/api";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import UserAvatar from "../components/UserAvatar";

import "../Dashboard.css";


function Settings() {

  const [currentUser, setCurrentUser] =
    useState(null);

  const [roles, setRoles] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingRole, setEditingRole] =
    useState(null);

  const [roleName, setRoleName] =
    useState("");

  const [roleCode, setRoleCode] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [changingUserId, setChangingUserId] =
    useState(null);


  // =====================================================
  // ADMIN CHECK
  // =====================================================

  const isAdmin =
    currentUser?.role?.toLowerCase() ===
    "admin";


  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async () => {

    try {

      setLoading(true);
      setError("");


      const [
        meResponse,
        rolesResponse,
        usersResponse,
      ] = await Promise.all([

        api.get("/auth/me"),

        api.get("/roles"),

        api.get("/users"),

      ]);


      setCurrentUser(
        meResponse.data
      );

      setRoles(
        rolesResponse.data
      );

      setUsers(
        usersResponse.data
      );


    } catch (error) {

      console.error(
        "Settings load error:",
        error
      );


      if (
        error.response?.status === 401
      ) {

        localStorage.removeItem(
          "access_token"
        );

        window.location.href = "/";

        return;
      }


      setError(
        error.response?.data?.detail ||
        "Không thể tải dữ liệu cài đặt."
      );


    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadData();

  }, []);


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {

    localStorage.removeItem(
      "access_token"
    );

    window.location.href = "/";

  };


  // =====================================================
  // CREATE ROLE
  // =====================================================

  const openCreateForm = () => {

    if (!isAdmin) {
      return;
    }

    setEditingRole(null);

    setRoleName("");

    setRoleCode("");

    setError("");

    setShowForm(true);

  };


  // =====================================================
  // EDIT ROLE
  // =====================================================

  const openEditForm = (role) => {

    if (!isAdmin) {
      return;
    }

    setEditingRole(role);

    setRoleName(
      role.name
    );

    setRoleCode(
      role.code
    );

    setError("");

    setShowForm(true);

  };


  // =====================================================
  // CLOSE ROLE FORM
  // =====================================================

  const closeForm = () => {

    if (saving) {
      return;
    }

    setShowForm(false);

    setEditingRole(null);

    setRoleName("");

    setRoleCode("");

  };


  // =====================================================
  // SAVE ROLE
  // =====================================================

  const handleSaveRole = async (
    event
  ) => {

    event.preventDefault();


    if (!isAdmin) {
      return;
    }


    if (!roleName.trim()) {

      setError(
        "Vui lòng nhập tên vai trò."
      );

      return;

    }


    if (!roleCode.trim()) {

      setError(
        "Vui lòng nhập mã vai trò."
      );

      return;

    }


    try {

      setSaving(true);

      setError("");


      if (editingRole) {

        await api.put(
          `/roles/${editingRole.id}`,
          {
            name:
              roleName.trim(),

            code:
              roleCode
                .trim()
                .toLowerCase(),
          }
        );

      } else {

        await api.post(
          "/roles",
          {
            name:
              roleName.trim(),

            code:
              roleCode
                .trim()
                .toLowerCase(),
          }
        );

      }


      await loadData();

      closeForm();


    } catch (error) {

      console.error(
        "Save role error:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể lưu vai trò."
      );


    } finally {

      setSaving(false);

    }

  };


  // =====================================================
  // DEACTIVATE ROLE
  // =====================================================

  const handleDeactivateRole = async (
    role
  ) => {

    if (!isAdmin) {
      return;
    }


    if (
      role.code === "admin"
    ) {

      return;

    }


    const confirmed =
      window.confirm(
        `Tắt vai trò "${role.name}"?`
      );


    if (!confirmed) {
      return;
    }


    try {

      setError("");


      await api.delete(
        `/roles/${role.id}`
      );


      await loadData();


    } catch (error) {

      console.error(
        "Deactivate role error:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể tắt vai trò."
      );

    }

  };


  // =====================================================
  // CHANGE USER ROLE
  // =====================================================

  const handleChangeUserRole = async (
    userId,
    roleId
  ) => {

    if (!isAdmin) {
      return;
    }


    if (!roleId) {
      return;
    }


    try {

      setChangingUserId(
        userId
      );

      setError("");


      const response =
        await api.put(
          `/users/${userId}/role`,
          {
            role_id:
              Number(roleId),
          }
        );


      const updatedUser =
        response.data;


      setUsers(
        (currentUsers) =>
          currentUsers.map(
            (user) =>
              user.id === userId
                ? updatedUser
                : user
          )
      );


    } catch (error) {

      console.error(
        "Change user role error:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể thay đổi vai trò."
      );


    } finally {

      setChangingUserId(
        null
      );

    }

  };


  // =====================================================
  // FIND ROLE ID
  // =====================================================

  const getRoleIdByName = (
    roleName
  ) => {

    const role =
      roles.find(
        (item) =>
          item.name === roleName
      );


    return role?.id || "";

  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="dashboard-layout">

        <Sidebar />

        <main className="dashboard-main">

          <Topbar
            user={currentUser}
            onLogout={handleLogout}
          />

          <div className="dashboard-content">

            <div className="dashboard-loading">

              <div className="loading-spinner" />

              <span>
                Đang tải cài đặt...
              </span>

            </div>

          </div>

        </main>

      </div>

    );

  }


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="dashboard-layout">


      {/* SIDEBAR */}

      <Sidebar />


      {/* MAIN */}

      <main className="dashboard-main">


        {/* TOPBAR */}

        <Topbar
          user={currentUser}
          onLogout={handleLogout}
        />


        <div className="dashboard-content">


          {/* HEADER */}

          <div className="welcome-section">

            <div>

              <h1>
                Cài đặt
              </h1>

              <p>
                Quản lý cấu hình hệ thống
              </p>

            </div>

          </div>


          {/* ERROR */}

          {error && (

            <div className="dashboard-error">
              {error}
            </div>

          )}


          {/* =================================================
              ROLES
          ================================================= */}

          <section className="settings-card">

            <div className="settings-card-header">

              <div>

                <h2>
                  Vai trò
                </h2>

                <p>
                  Quản lý các vai trò
                  trong hệ thống
                </p>

              </div>


              {isAdmin && (

                <button
                  className="primary-button"
                  type="button"
                  onClick={
                    openCreateForm
                  }
                >
                  + Thêm vai trò
                </button>

              )}

            </div>


            <div className="roles-table">

              <div className="roles-table-header">

                <span>
                  Tên vai trò
                </span>

                <span>
                  Mã
                </span>

                <span>
                  Trạng thái
                </span>

                <span>
                  Thao tác
                </span>

              </div>


              {roles.map(
                (role) => (

                  <div
                    key={role.id}
                    className="role-row"
                  >

                    <div className="role-name">

                      <strong>
                        {role.name}
                      </strong>

                    </div>


                    <code>
                      {role.code}
                    </code>


                    <span
                      className={`role-status ${
                        role.is_active
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {role.is_active
                        ? "Đang hoạt động"
                        : "Đã tắt"}
                    </span>


                    <div className="role-actions">

                      {isAdmin ? (

                        <>

                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() =>
                              openEditForm(
                                role
                              )
                            }
                          >
                            Sửa
                          </button>


                          {role.code !==
                            "admin" && (

                            <button
                              className="danger-button"
                              type="button"
                              onClick={() =>
                                handleDeactivateRole(
                                  role
                                )
                              }
                            >
                              Tắt
                            </button>

                          )}

                        </>

                      ) : (

                        <span className="settings-readonly">
                          Chỉ xem
                        </span>

                      )}

                    </div>

                  </div>

                )
              )}

            </div>

          </section>


          {/* =================================================
              USERS
          ================================================= */}

          <section className="settings-card settings-users-card">

            <div className="settings-card-header">

              <div>

                <h2>
                  Người dùng
                </h2>

                <p>
                  Quản lý người dùng và
                  vai trò của họ
                </p>

              </div>

            </div>


            <div className="settings-users-list">

              {users.map(
                (user) => {

                  const currentRoleId =
                    getRoleIdByName(
                      user.role
                    );


                  const isCurrentUser =
                    currentUser?.id ===
                    user.id;


                  return (

                    <div
                      key={user.id}
                      className="settings-user-row"
                    >


                      {/* USER */}

                      <div className="settings-user-info">

                        <UserAvatar
                          user={user}
                          size="medium"
                        />

                      </div>


                      {/* ROLE */}

                      <div className="settings-user-role">

                        <label>
                          Vai trò
                        </label>


                        <select
                          value={
                            currentRoleId
                          }
                          disabled={
                            !isAdmin ||
                            changingUserId ===
                              user.id ||
                            isCurrentUser
                          }
                          onChange={(
                            event
                          ) =>
                            handleChangeUserRole(
                              user.id,
                              event.target.value
                            )
                          }
                        >

                          {roles
                            .filter(
                              (role) =>
                                role.is_active
                            )
                            .map(
                              (role) => (

                                <option
                                  key={
                                    role.id
                                  }
                                  value={
                                    role.id
                                  }
                                >
                                  {role.name}
                                </option>

                              )
                            )}

                        </select>


                        {!isAdmin && (

                          <small>
                            Chỉ Admin có quyền
                            thay đổi vai trò
                          </small>

                        )}


                        {isAdmin &&
                          isCurrentUser && (

                            <small>
                              Tài khoản hiện tại
                            </small>

                          )}

                      </div>


                    </div>

                  );

                }
              )}

            </div>

          </section>


        </div>


      </main>


      {/* =================================================
          ROLE MODAL
      ================================================= */}

      {showForm && isAdmin && (

        <div
          className="settings-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeForm();

            }

          }}
        >

          <div className="settings-modal">


            <div className="settings-modal-header">

              <div>

                <h2>
                  {editingRole
                    ? "Chỉnh sửa vai trò"
                    : "Thêm vai trò"}
                </h2>

                <p>
                  {editingRole
                    ? "Cập nhật thông tin vai trò"
                    : "Tạo một vai trò mới"}
                </p>

              </div>


              <button
                className="modal-close"
                type="button"
                onClick={
                  closeForm
                }
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                handleSaveRole
              }
            >

              <div className="settings-form-group">

                <label>
                  Tên vai trò
                </label>

                <input
                  type="text"
                  value={
                    roleName
                  }
                  onChange={(event) =>
                    setRoleName(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: Marketing"
                  autoFocus
                />

              </div>


              <div className="settings-form-group">

                <label>
                  Mã vai trò
                </label>

                <input
                  type="text"
                  value={
                    roleCode
                  }
                  onChange={(event) =>
                    setRoleCode(
                      event.target.value
                    )
                  }
                  placeholder="Ví dụ: marketing"
                />

                <small>
                  Mã được dùng nội bộ,
                  không cần dấu cách.
                </small>

              </div>


              <div className="settings-modal-footer">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                >
                  Hủy
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "Đang lưu..."
                    : editingRole
                      ? "Lưu thay đổi"
                      : "Tạo vai trò"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

}


export default Settings;