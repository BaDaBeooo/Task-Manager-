import { useEffect, useState } from "react";

import api from "../services/api";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import UserAvatar from "../components/UserAvatar";
import TelegramSettings from "../components/TelegramSettings";

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


  // =====================================================
  // ROLE FORM
  // =====================================================

  const [showRoleForm, setShowRoleForm] =
    useState(false);

  const [editingRole, setEditingRole] =
    useState(null);

  const [roleName, setRoleName] =
    useState("");

  const [newRoleCode, setRoleCode] =
    useState("");

  const [savingRole, setSavingRole] =
    useState(false);


  // =====================================================
  // USER FORM
  // =====================================================

  const [showUserForm, setShowUserForm] =
    useState(false);

  const [userFullName, setUserFullName] =
    useState("");

  const [userPosition, setUserPosition] =
    useState("");

  const [userUsername, setUserUsername] =
    useState("");

  const [userPassword, setUserPassword] =
    useState("");

  const [userRoleId, setUserRoleId] =
    useState("");

  const [savingUser, setSavingUser] =
    useState(false);


  // =====================================================
  // USER ACTION
  // =====================================================

  const [changingUserId, setChangingUserId] =
    useState(null);

  const [editingPositionUserId, setEditingPositionUserId] =
    useState(null);

  const [editingPosition, setEditingPosition] =
    useState("");


  // =====================================================
  // ADMIN
  // =====================================================

  const roleCode = String(currentUser?.role_code || currentUser?.role || "").toLowerCase();
  const isAdmin = roleCode === "admin";


  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async () => {

    try {

      setLoading(true);
      setError("");


      const [meResponse, rolesResponse] = await Promise.all([
        api.get("/auth/me"),
        api.get("/roles"),
      ]);
      let usersResponse = { data: [] };
      if (String(meResponse.data?.role_code || meResponse.data?.role || "").toLowerCase() === "admin") {
        usersResponse = await api.get("/users");
      }


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
  // ROLE CREATE
  // =====================================================

  const openCreateRoleForm = () => {

    if (!isAdmin) {
      return;
    }

    setEditingRole(null);

    setRoleName("");

    setRoleCode("");

    setError("");

    setShowRoleForm(true);

  };


  // =====================================================
  // ROLE EDIT
  // =====================================================

  const openEditRoleForm = (
    role
  ) => {

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

    setShowRoleForm(true);

  };


  // =====================================================
  // CLOSE ROLE FORM
  // =====================================================

  const closeRoleForm = () => {

    if (savingRole) {
      return;
    }

    setShowRoleForm(false);

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


    if (!newRoleCode.trim()) {

      setError(
        "Vui lòng nhập mã vai trò."
      );

      return;

    }


    try {

      setSavingRole(true);

      setError("");


      if (editingRole) {

        await api.put(
          `/roles/${editingRole.id}`,
          {
            name:
              roleName.trim(),

            code:
              newRoleCode
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
              newRoleCode
                .trim()
                .toLowerCase(),
          }
        );

      }


      await loadData();

      closeRoleForm();


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

      setSavingRole(false);

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
  // OPEN CREATE USER
  // =====================================================

  const openCreateUserForm = () => {

    if (!isAdmin) {
      return;
    }

    const firstRole =
      roles.find(
        (role) =>
          role.is_active &&
          role.code !== "admin"
      );


    setUserFullName("");

    setUserPosition("");

    setUserUsername("");

    setUserPassword("");

    setUserRoleId(
      firstRole
        ? String(firstRole.id)
        : ""
    );

    setError("");

    setShowUserForm(true);

  };


  // =====================================================
  // CLOSE USER FORM
  // =====================================================

  const closeUserForm = () => {

    if (savingUser) {
      return;
    }

    setShowUserForm(false);

    setUserFullName("");

    setUserPosition("");

    setUserUsername("");

    setUserPassword("");

    setUserRoleId("");

  };


  // =====================================================
  // CREATE USER
  // =====================================================

  const handleCreateUser = async (
    event
  ) => {

    event.preventDefault();


    if (!isAdmin) {
      return;
    }


    if (!userFullName.trim()) {

      setError(
        "Vui lòng nhập họ tên."
      );

      return;

    }


    if (!userPosition.trim()) {

      setError(
        "Vui lòng nhập chức vụ trong công ty."
      );

      return;

    }


    if (!userUsername.trim()) {

      setError(
        "Vui lòng nhập username."
      );

      return;

    }


    if (userPassword.length < 6) {

      setError(
        "Mật khẩu phải có ít nhất 6 ký tự."
      );

      return;

    }


    if (!userRoleId) {

      setError(
        "Vui lòng chọn vai trò."
      );

      return;

    }


    try {

      setSavingUser(true);

      setError("");


      await api.post(
        "/users",
        {
          full_name:
            userFullName.trim(),

          position:
            userPosition.trim(),

          username:
            userUsername.trim(),

          password:
            userPassword,

          role_id:
            Number(userRoleId),
        }
      );


      await loadData();

      closeUserForm();


      window.alert(
        "Tạo tài khoản thành công.\n\n" +
        "User sẽ phải đổi mật khẩu khi đăng nhập lần đầu."
      );


    } catch (error) {

      console.error(
        "Create user error:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể tạo tài khoản."
      );


    } finally {

      setSavingUser(false);

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
  // EDIT USER POSITION / CHỨC VỤ
  // =====================================================

  const handleStartEditPosition = (user) => {

    if (!isAdmin || !user.is_active) {
      return;
    }

    setEditingPositionUserId(user.id);
    setEditingPosition(user.position || "");
    setError("");

  };


  const handleCancelEditPosition = () => {

    setEditingPositionUserId(null);
    setEditingPosition("");

  };


  const handleSavePosition = async (userId) => {

    if (!isAdmin) {
      return;
    }

    if (!editingPosition.trim()) {
      setError("Chức vụ không được để trống.");
      return;
    }

    try {

      setChangingUserId(userId);
      setError("");

      const response = await api.put(
        `/users/${userId}/position`,
        { position: editingPosition.trim() }
      );

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? response.data : user
        )
      );

      setEditingPositionUserId(null);
      setEditingPosition("");

    } catch (error) {

      console.error("Update user position error:", error);
      setError(
        error.response?.data?.detail ||
        "Không thể cập nhật chức vụ."
      );

    } finally {
      setChangingUserId(null);
    }

  };


  // =====================================================
  // RESET PASSWORD
  // =====================================================

  const handleResetPassword = async (
    user
  ) => {

    if (!isAdmin) {
      return;
    }


    const newPassword =
      window.prompt(
        `Nhập mật khẩu mới cho ${user.full_name}:\n\n` +
        "User sẽ phải đổi lại mật khẩu sau khi đăng nhập."
      );


    if (
      newPassword === null
    ) {

      return;

    }


    if (
      newPassword.length < 6
    ) {

      setError(
        "Mật khẩu phải có ít nhất 6 ký tự."
      );

      return;

    }


    try {

      setChangingUserId(
        user.id
      );

      setError("");


      await api.post(
        `/users/${user.id}/reset-password`,
        {
          new_password:
            newPassword,
        }
      );


      setUsers(
        (currentUsers) =>
          currentUsers.map(
            (item) =>
              item.id === user.id
                ? {
                    ...item,
                    must_change_password:
                      true,
                  }
                : item
          )
      );


      window.alert(
        "Đã reset mật khẩu.\n\n" +
        "User sẽ phải đổi mật khẩu khi đăng nhập."
      );


    } catch (error) {

      console.error(
        "Reset password error:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể reset mật khẩu."
      );


    } finally {

      setChangingUserId(
        null
      );

    }

  };


  // =====================================================
  // LOCK USER
  // =====================================================

  const handleDeactivateUser = async (
    user
  ) => {

    if (!isAdmin) {
      return;
    }


    if (
      user.id === currentUser?.id
    ) {

      return;

    }


    const confirmed =
      window.confirm(
        `Khóa tài khoản "${user.full_name}"?`
      );


    if (!confirmed) {
      return;
    }


    try {

      setChangingUserId(
        user.id
      );

      setError("");


      const response =
        await api.post(
          `/users/${user.id}/deactivate`
        );


      setUsers(
        (currentUsers) =>
          currentUsers.map(
            (item) =>
              item.id === user.id
                ? response.data
                : item
          )
      );


    } catch (error) {

      console.error(
        "Deactivate user error:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể khóa tài khoản."
      );


    } finally {

      setChangingUserId(
        null
      );

    }

  };


  // =====================================================
  // UNLOCK USER
  // =====================================================

  const handleActivateUser = async (
    user
  ) => {

    if (!isAdmin) {
      return;
    }


    try {

      setChangingUserId(
        user.id
      );

      setError("");


      const response =
        await api.post(
          `/users/${user.id}/activate`
        );


      setUsers(
        (currentUsers) =>
          currentUsers.map(
            (item) =>
              item.id === user.id
                ? response.data
                : item
          )
      );


    } catch (error) {

      console.error(
        "Activate user error:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể mở khóa tài khoản."
      );


    } finally {

      setChangingUserId(
        null
      );

    }

  };


  // =====================================================
  // FIND ROLE
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

      <Sidebar />


      <main className="dashboard-main">

        <Topbar
          user={currentUser}
          onLogout={handleLogout}
        />


        <div className="dashboard-content">

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


              <span className="settings-readonly">4 vai trò cố định</span>

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
                      <span className="settings-readonly">Quyền cố định</span>
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
                  Quản lý tài khoản và
                  quyền truy cập hệ thống
                </p>

              </div>


              {isAdmin && (

                <button
                  className="primary-button"
                  type="button"
                  onClick={
                    openCreateUserForm
                  }
                >
                  + Tạo tài khoản
                </button>

              )}

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


                  const isChanging =
                    changingUserId ===
                    user.id;


                  return (

                    <div
                      key={user.id}
                      className="settings-user-row"
                      style={{
                        opacity:
                          user.is_active
                            ? 1
                            : 0.65,
                      }}
                    >

                      {/* USER */}

                      <div
                        className="settings-user-info"
                        style={{
                          minWidth: "220px",
                        }}
                      >

                        <UserAvatar
                          user={user}
                          size="medium"
                        />

                        <div
                          style={{
                            marginLeft: "10px",
                          }}
                        >

                          <strong>
                            {user.full_name}
                          </strong>

                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: "12px",
                              marginTop: "3px",
                            }}
                          >
                            @{user.username}
                          </div>

                          {editingPositionUserId === user.id ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                alignItems: "center",
                                marginTop: "7px",
                              }}
                            >
                              <input
                                type="text"
                                value={editingPosition}
                                onChange={(event) =>
                                  setEditingPosition(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleSavePosition(user.id);
                                  }
                                  if (event.key === "Escape") {
                                    handleCancelEditPosition();
                                  }
                                }}
                                autoFocus
                                disabled={isChanging}
                                style={{
                                  width: "190px",
                                  padding: "6px 8px",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "7px",
                                  fontSize: "12px",
                                }}
                              />

                              <button
                                type="button"
                                className="primary-button"
                                style={{ padding: "6px 9px", fontSize: "11px" }}
                                disabled={isChanging}
                                onClick={() => handleSavePosition(user.id)}
                              >
                                {isChanging ? "..." : "Lưu"}
                              </button>

                              <button
                                type="button"
                                className="secondary-button"
                                style={{ padding: "6px 9px", fontSize: "11px" }}
                                disabled={isChanging}
                                onClick={handleCancelEditPosition}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "7px",
                                marginTop: "4px",
                              }}
                            >
                              <span
                                style={{
                                  color: "#2563eb",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                }}
                              >
                                {user.position || "Chưa cập nhật chức vụ"}
                              </span>

                              {isAdmin && user.is_active && (
                                <button
                                  type="button"
                                  className="secondary-button"
                                  style={{ padding: "3px 7px", fontSize: "10px" }}
                                  disabled={isChanging}
                                  onClick={() => handleStartEditPosition(user)}
                                >
                                  Sửa
                                </button>
                              )}
                            </div>
                          )}

                        </div>

                      </div>


                      {/* PERMISSION ROLE */}

                      <div className="settings-user-role">

                        <label>
                          Quyền hệ thống
                        </label>


                        <select
                          value={
                            currentRoleId
                          }
                          disabled={
                            !isAdmin ||
                            isChanging ||
                            isCurrentUser ||
                            !user.is_active
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

                      </div>


                      {/* STATUS */}

                      <div
                        style={{
                          minWidth: "120px",
                        }}
                      >

                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            color:
                              user.is_active
                                ? "#15803d"
                                : "#b91c1c",
                          }}
                        >

                          {user.is_active
                            ? "● Hoạt động"
                            : "● Đã khóa"}

                        </div>


                        {user.must_change_password && (

                          <div
                            style={{
                              marginTop: "5px",
                              fontSize: "10px",
                              color: "#b45309",
                            }}
                          >
                            🔐 Chờ đổi mật khẩu
                          </div>

                        )}

                      </div>


                      {/* ACTIONS */}

                      <div
                        style={{
                          display: "flex",
                          gap: "7px",
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >

                        {isAdmin && !isCurrentUser && (

                          <button
                            className="secondary-button"
                            type="button"
                            disabled={isChanging}
                            onClick={() =>
                              handleResetPassword(
                                user
                              )
                            }
                          >
                            Reset mật khẩu
                          </button>

                        )}


                        {isAdmin &&
                          !isCurrentUser &&
                          user.is_active && (

                            <button
                              className="danger-button"
                              type="button"
                              disabled={isChanging}
                              onClick={() =>
                                handleDeactivateUser(
                                  user
                                )
                              }
                            >
                              Khóa
                            </button>

                          )}


                        {isAdmin &&
                          !isCurrentUser &&
                          !user.is_active && (

                            <button
                              className="primary-button"
                              type="button"
                              disabled={isChanging}
                              onClick={() =>
                                handleActivateUser(
                                  user
                                )
                              }
                            >
                              Mở khóa
                            </button>

                          )}

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          </section>


          {/* =================================================
              TELEGRAM
          ================================================= */}

          <TelegramSettings />

        </div>

      </main>


      {/* =====================================================
          ROLE MODAL
      ===================================================== */}

      {showRoleForm && isAdmin && (

        <div
          className="settings-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeRoleForm();

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
                  closeRoleForm
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
                    newRoleCode
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
                    closeRoleForm
                  }
                  disabled={
                    savingRole
                  }
                >
                  Hủy
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    savingRole
                  }
                >
                  {savingRole
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


      {/* =====================================================
          CREATE USER MODAL
      ===================================================== */}

      {showUserForm && isAdmin && (

        <div
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeUserForm();

            }

          }}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.18)",
              padding: "24px",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "22px",
              }}
            >

              <div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "20px",
                  }}
                >
                  Tạo tài khoản
                </h2>

                <p
                  style={{
                    margin:
                      "7px 0 0",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  Tạo tài khoản mới cho
                  thành viên trong hệ thống
                </p>

              </div>


              <button
                type="button"
                onClick={
                  closeUserForm
                }
                disabled={
                  savingUser
                }
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "25px",
                  color: "#6b7280",
                  cursor: "pointer",
                }}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                handleCreateUser
              }
            >

              <div
                style={{
                  marginBottom: "16px",
                }}
              >

                <label
                  style={{
                    display: "block",
                    marginBottom: "7px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Họ và tên
                </label>

                <input
                  type="text"
                  value={
                    userFullName
                  }
                  onChange={(event) =>
                    setUserFullName(
                      event.target.value
                    )
                  }
                  placeholder="Nguyễn Văn A"
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: "8px",
                  }}
                />

              </div>


              <div
                style={{
                  marginBottom: "16px",
                }}
              >

                <label
                  style={{
                    display: "block",
                    marginBottom: "7px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Chức vụ trong công ty
                </label>

                <input
                  type="text"
                  value={userPosition}
                  onChange={(event) => setUserPosition(event.target.value)}
                  placeholder="Ví dụ: Kỹ sư Pre-Sale, Trưởng phòng Kinh doanh"
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                  }}
                />

                <small
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#6b7280",
                  }}
                >
                  Đây là chức vụ hiển thị trong danh sách User và khi phân công Task. Không liên quan tới quyền hệ thống.
                </small>

              </div>


              <div
                style={{
                  marginBottom: "16px",
                }}
              >

                <label
                  style={{
                    display: "block",
                    marginBottom: "7px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Username
                </label>

                <input
                  type="text"
                  value={
                    userUsername
                  }
                  onChange={(event) =>
                    setUserUsername(
                      event.target.value
                    )
                  }
                  placeholder="nguyena"
                  autoComplete="off"
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: "8px",
                  }}
                />

              </div>


              <div
                style={{
                  marginBottom: "16px",
                }}
              >

                <label
                  style={{
                    display: "block",
                    marginBottom: "7px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Mật khẩu tạm thời
                </label>

                <input
                  type="password"
                  value={
                    userPassword
                  }
                  onChange={(event) =>
                    setUserPassword(
                      event.target.value
                    )
                  }
                  placeholder="Ít nhất 6 ký tự"
                  autoComplete="new-password"
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: "8px",
                  }}
                />

                <small
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#6b7280",
                  }}
                >
                  User sẽ bắt buộc đổi
                  mật khẩu này ở lần
                  đăng nhập đầu tiên.
                </small>

              </div>


              <div
                style={{
                  marginBottom: "24px",
                }}
              >

                <label
                  style={{
                    display: "block",
                    marginBottom: "7px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Quyền hệ thống
                </label>

                <select
                  value={
                    userRoleId
                  }
                  onChange={(event) =>
                    setUserRoleId(
                      event.target.value
                    )
                  }
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: "8px",
                    background:
                      "#ffffff",
                  }}
                >

                  <option value="">
                    Chọn vai trò
                  </option>

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

              </div>


              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeUserForm
                  }
                  disabled={
                    savingUser
                  }
                >
                  Hủy
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    savingUser
                  }
                >
                  {savingUser
                    ? "Đang tạo..."
                    : "Tạo tài khoản"}
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