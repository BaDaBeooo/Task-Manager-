import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import "../Dashboard.css";
import "../SupportOrganization.css";


function getUserName(user) {
  return (
    user?.full_name ||
    user?.username ||
    "Chưa xác định"
  );
}


function getRoleName(user) {
  if (!user?.role) {
    return "";
  }

  if (typeof user.role === "string") {
    return user.role;
  }

  return (
    user.role.name ||
    user.role.code ||
    ""
  );
}


function SupportOrganization() {

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);


  const roleCode = String(currentUser?.role_code || currentUser?.role || "").toLowerCase();
  const isAdmin = roleCode === "admin";
  const isSupervisor = roleCode === "supervisor";
  const isLeader = roleCode === "leader";
  const canManageOrg = isAdmin || isSupervisor;
  const canManageTeam = isAdmin || isSupervisor;
  const canManageMembers = isAdmin || isSupervisor;
  const canEditRouting = isAdmin || isSupervisor || isLeader;


  const [
    departments,
    setDepartments,
  ] = useState([]);


  const [
    teams,
    setTeams,
  ] = useState([]);


  const [
    users,
    setUsers,
  ] = useState([]);


  const [
    rules,
    setRules,
  ] = useState([]);


  const [
    members,
    setMembers,
  ] = useState([]);


  const [
    selectedTeamId,
    setSelectedTeamId,
  ] = useState(null);


  const [
    activeTab,
    setActiveTab,
  ] = useState("departments");


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  // =====================================================
  // MODALS
  // =====================================================

  const [
    showDepartmentModal,
    setShowDepartmentModal,
  ] = useState(false);


  const [
    showTeamModal,
    setShowTeamModal,
  ] = useState(false);


  const [
    showMemberModal,
    setShowMemberModal,
  ] = useState(false);


  const [
    showRuleModal,
    setShowRuleModal,
  ] = useState(false);


  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingRuleId, setEditingRuleId] = useState(null);


  // =====================================================
  // FORM DATA
  // =====================================================

  const [
    departmentForm,
    setDepartmentForm,
  ] = useState({
    name: "",
    code: "",
    manager_id: "",
  });


  const [
    teamForm,
    setTeamForm,
  ] = useState({
    department_id: "",
    name: "",
    code: "",
    lead_id: "",
  });


  const [
    memberForm,
    setMemberForm,
  ] = useState({
    user_id: "",
  });


  const [
    ruleForm,
    setRuleForm,
  ] = useState({
    team_id: "",
    keyword: "",
    weight: 10,
  });


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
  // LOAD DATA
  // =====================================================

  const loadData = async () => {

    setLoading(true);
    setError("");

    try {

      const userResponse =
        await api.get(
          "/auth/me"
        );

      setCurrentUser(
        userResponse.data
      );


      const role = String(userResponse.data.role_code || userResponse.data.role || "").toLowerCase();
      if (!["admin", "supervisor", "leader"].includes(role)) {
        setError("Bạn không có quyền quản trị Support.");
        setLoading(false);
        return;
      }


      const [departmentsResponse, teamsResponse, rulesResponse] = await Promise.all([
        api.get("/support/org/departments"),
        api.get("/support/org/teams"),
        api.get("/support/org/rules"),
      ]);
      let usersResponse = { data: [] };
      if (role === "admin" || role === "supervisor") {
        usersResponse = await api.get("/users");
      }


      setDepartments(
        Array.isArray(
          departmentsResponse.data
        )
          ? departmentsResponse.data
          : []
      );


      setTeams(
        Array.isArray(
          teamsResponse.data
        )
          ? teamsResponse.data
          : []
      );


      setUsers(
        Array.isArray(
          usersResponse.data
        )
          ? usersResponse.data
          : []
      );


      setRules(
        Array.isArray(
          rulesResponse.data
        )
          ? rulesResponse.data
          : []
      );


    } catch (error) {

      console.error(
        "Support organization load error:",
        error
      );


      if (
        error.response?.status ===
        401
      ) {

        localStorage.removeItem(
          "access_token"
        );

        window.location.href =
          "/";

        return;
      }


      if (
        error.response?.status ===
        403
      ) {

        setError(
          "Bạn không có quyền quản trị Support."
        );

      } else {

        setError(
          error.response?.data?.detail ||
          "Không thể tải cấu hình Support."
        );

      }

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    loadData();

  }, []);


  // =====================================================
  // LOAD TEAM MEMBERS
  // =====================================================

  const loadMembers =
    async (teamId) => {

      if (!teamId) {

        setMembers([]);

        return;
      }


      try {

        const response =
          await api.get(
            `/support/org/teams/${teamId}/members`
          );


        setMembers(
          Array.isArray(
            response.data
          )
            ? response.data
            : []
        );

      } catch (error) {

        console.error(
          "Load team members error:",
          error
        );

        setMembers([]);

        setError(
          error.response?.data?.detail ||
          "Không thể tải thành viên Team."
        );
      }
    };


  useEffect(() => {

    if (selectedTeamId) {

      loadMembers(
        selectedTeamId
      );

    } else {

      setMembers([]);

    }

  }, [selectedTeamId]);


  // =====================================================
  // HELPERS
  // =====================================================

  const getDepartmentName =
    (departmentId) => {

      const department =
        departments.find(
          (item) =>
            Number(item.id) ===
            Number(departmentId)
        );

      return (
        department?.name ||
        "Không xác định"
      );
    };


  const getTeamName =
    (teamId) => {

      const team =
        teams.find(
          (item) =>
            Number(item.id) ===
            Number(teamId)
        );

      return (
        team?.name ||
        "Không xác định"
      );
    };


  const selectedTeam =
    teams.find(
      (team) =>
        Number(team.id) ===
        Number(selectedTeamId)
    );


  const availableUsers =
    useMemo(() => {

      const memberIds =
        new Set(
          members.map(
            (member) =>
              Number(member.user_id)
          )
        );


      return users.filter(
        (user) =>
          !memberIds.has(
            Number(user.id)
          )
      );

    }, [
      users,
      members,
    ]);


  // =====================================================
  // RESET MESSAGE
  // =====================================================

  const clearMessages = () => {

    setError("");
    setSuccess("");

  };


  // =====================================================
  // CREATE DEPARTMENT
  // =====================================================

  const handleCreateDepartment =
    async (event) => {

      event.preventDefault();

      clearMessages();


      if (
        !departmentForm.name.trim()
      ) {

        setError(
          "Vui lòng nhập tên phòng ban."
        );

        return;
      }


      if (
        !departmentForm.code.trim()
      ) {

        setError(
          "Vui lòng nhập mã phòng ban."
        );

        return;
      }


      try {

        setSaving(true);


        await api.post(
          "/support/org/departments",
          {
            name:
              departmentForm.name.trim(),

            code:
              departmentForm.code.trim(),

            manager_id:
              departmentForm.manager_id
                ? Number(
                    departmentForm.manager_id
                  )
                : null,
          }
        );


        setShowDepartmentModal(
          false
        );


        setDepartmentForm({
          name: "",
          code: "",
          manager_id: "",
        });


        setSuccess(
          "Đã tạo phòng ban thành công."
        );


        await loadData();


      } catch (error) {

        console.error(
          "Create department error:",
          error
        );

        setError(
          error.response?.data?.detail ||
          "Không thể tạo phòng ban."
        );

      } finally {

        setSaving(false);

      }
    };


  // =====================================================
  // UPDATE / DELETE DEPARTMENT
  // =====================================================

  const handleUpdateDepartment = async (event) => {
    event.preventDefault();
    clearMessages();
    if (!editingDepartmentId) return;

    try {
      setSaving(true);
      await api.put(`/support/org/departments/${editingDepartmentId}`, {
        name: departmentForm.name.trim(),
        code: departmentForm.code.trim(),
        manager_id: departmentForm.manager_id ? Number(departmentForm.manager_id) : null,
      });
      setShowDepartmentModal(false);
      setEditingDepartmentId(null);
      setSuccess("Đã cập nhật phòng ban.");
      await loadData();
    } catch (error) {
      setError(error.response?.data?.detail || "Không thể cập nhật phòng ban.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async (department) => {
    if (!window.confirm(`Xóa phòng ban "${department.name}"? Các Team và Routing Rule thuộc phòng ban cũng sẽ được ngừng hoạt động.`)) return;
    try {
      clearMessages();
      await api.delete(`/support/org/departments/${department.id}`);
      if (selectedTeamId && teams.some(t => Number(t.id) === Number(selectedTeamId) && Number(t.department_id) === Number(department.id))) {
        setSelectedTeamId(null);
      }
      setSuccess("Đã xóa phòng ban.");
      await loadData();
    } catch (error) {
      setError(error.response?.data?.detail || "Không thể xóa phòng ban.");
    }
  };


  // =====================================================
  // CREATE TEAM
  // =====================================================

  const handleCreateTeam =
    async (event) => {

      event.preventDefault();

      clearMessages();


      if (
        !teamForm.department_id
      ) {

        setError(
          "Vui lòng chọn phòng ban."
        );

        return;
      }


      if (
        !teamForm.name.trim()
      ) {

        setError(
          "Vui lòng nhập tên Team."
        );

        return;
      }


      if (
        !teamForm.code.trim()
      ) {

        setError(
          "Vui lòng nhập mã Team."
        );

        return;
      }


      try {

        setSaving(true);


        await api.post(
          "/support/org/teams",
          {
            department_id:
              Number(
                teamForm.department_id
              ),

            name:
              teamForm.name.trim(),

            code:
              teamForm.code.trim(),

            lead_id:
              teamForm.lead_id
                ? Number(
                    teamForm.lead_id
                  )
                : null,
          }
        );


        setShowTeamModal(
          false
        );


        setTeamForm({
          department_id: "",
          name: "",
          code: "",
          lead_id: "",
        });


        setSuccess(
          "Đã tạo Support Team thành công."
        );


        await loadData();


      } catch (error) {

        console.error(
          "Create team error:",
          error
        );

        setError(
          error.response?.data?.detail ||
          "Không thể tạo Support Team."
        );

      } finally {

        setSaving(false);

      }
    };


  // =====================================================
  // UPDATE / DELETE TEAM
  // =====================================================

  const handleUpdateTeam = async (event) => {
    event.preventDefault();
    clearMessages();
    if (!editingTeamId) return;

    try {
      setSaving(true);
      await api.put(`/support/org/teams/${editingTeamId}`, {
        name: teamForm.name.trim(),
        code: teamForm.code.trim(),
        lead_id: teamForm.lead_id ? Number(teamForm.lead_id) : 0,
      });
      setShowTeamModal(false);
      setEditingTeamId(null);
      setSuccess("Đã cập nhật Support Team.");
      await loadData();
    } catch (error) {
      setError(error.response?.data?.detail || "Không thể cập nhật Support Team.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (team) => {
    if (!window.confirm(`Xóa Support Team "${team.name}"? Thành viên và Routing Rule của Team sẽ được ngừng hoạt động.`)) return;
    try {
      clearMessages();
      await api.delete(`/support/org/teams/${team.id}`);
      if (Number(selectedTeamId) === Number(team.id)) {
        setSelectedTeamId(null);
        setMembers([]);
      }
      setSuccess("Đã xóa Support Team.");
      await loadData();
    } catch (error) {
      setError(error.response?.data?.detail || "Không thể xóa Support Team.");
    }
  };


  // =====================================================
  // ADD MEMBER
  // =====================================================

  const handleAddMember =
    async (event) => {

      event.preventDefault();

      clearMessages();


      if (
        !selectedTeamId
      ) {

        setError(
          "Vui lòng chọn Team."
        );

        return;
      }


      if (
        !memberForm.user_id
      ) {

        setError(
          "Vui lòng chọn nhân viên."
        );

        return;
      }


      try {

        setSaving(true);


        await api.post(
          `/support/org/teams/${selectedTeamId}/members`,
          {
            user_id:
              Number(
                memberForm.user_id
              ),
          }
        );


        setShowMemberModal(
          false
        );


        setMemberForm({
          user_id: "",
        });


        setSuccess(
          "Đã thêm thành viên vào Team."
        );


        await loadMembers(
          selectedTeamId
        );


      } catch (error) {

        console.error(
          "Add member error:",
          error
        );

        setError(
          error.response?.data?.detail ||
          "Không thể thêm thành viên."
        );

      } finally {

        setSaving(false);

      }
    };


  // =====================================================
  // REMOVE MEMBER
  // =====================================================

  const handleRemoveMember = async (member) => {
    const name = getUserName(member.user);
    if (!window.confirm(`Xóa ${name} khỏi Team ${selectedTeam?.name || "này"}?`)) return;
    try {
      clearMessages();
      await api.delete(`/support/org/teams/${selectedTeamId}/members/${member.user_id}`);
      setSuccess("Đã xóa thành viên khỏi Team.");
      await loadMembers(selectedTeamId);
    } catch (error) {
      setError(error.response?.data?.detail || "Không thể xóa thành viên.");
    }
  };


  // =====================================================
  // CREATE ROUTING RULE
  // =====================================================

  const handleCreateRule =
    async (event) => {

      event.preventDefault();

      clearMessages();


      if (
        !ruleForm.team_id
      ) {

        setError(
          "Vui lòng chọn Team."
        );

        return;
      }


      if (
        !ruleForm.keyword.trim()
      ) {

        setError(
          "Vui lòng nhập keyword."
        );

        return;
      }


      try {

        setSaving(true);


        await api.post(
          "/support/org/rules",
          {
            team_id:
              Number(
                ruleForm.team_id
              ),

            keyword:
              ruleForm.keyword.trim(),

            weight:
              Number(
                ruleForm.weight
              ),
          }
        );


        setShowRuleModal(
          false
        );


        setRuleForm({
          team_id: "",
          keyword: "",
          weight: 10,
        });


        setSuccess(
          "Đã tạo Routing Rule."
        );


        await loadData();


      } catch (error) {

        console.error(
          "Create rule error:",
          error
        );

        setError(
          error.response?.data?.detail ||
          "Không thể tạo Routing Rule."
        );

      } finally {

        setSaving(false);

      }
    };


  // =====================================================
  // DELETE RULE
  // =====================================================

  const handleDeleteRule =
    async (ruleId) => {

      const confirmed =
        window.confirm(
          "Bạn có chắc muốn xóa Routing Rule này?"
        );


      if (!confirmed) {
        return;
      }


      try {

        clearMessages();

        await api.delete(
          `/support/org/rules/${ruleId}`
        );


        setSuccess(
          "Đã xóa Routing Rule."
        );


        await loadData();


      } catch (error) {

        console.error(
          "Delete rule error:",
          error
        );

        setError(
          error.response?.data?.detail ||
          "Không thể xóa Routing Rule."
        );

      }
    };


  // =====================================================
  // UPDATE ROUTING RULE
  // =====================================================

  const handleUpdateRule = async (event) => {
    event.preventDefault();
    clearMessages();
    if (!editingRuleId) return;

    try {
      setSaving(true);
      await api.put(`/support/org/rules/${editingRuleId}`, {
        keyword: ruleForm.keyword.trim(),
        weight: Number(ruleForm.weight),
      });
      setShowRuleModal(false);
      setEditingRuleId(null);
      setSuccess("Đã cập nhật Routing Rule.");
      await loadData();
    } catch (error) {
      setError(error.response?.data?.detail || "Không thể cập nhật Routing Rule.");
    } finally {
      setSaving(false);
    }
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
            title="Quản trị Support"
            description="Cấu hình phòng ban, team và tự động phân tuyến"
          />


          <div className="dashboard-content">

            <div className="dashboard-loading">

              <div className="loading-spinner" />

              <span>
                Đang tải cấu hình Support...
              </span>

            </div>

          </div>

        </main>

      </div>
    );
  }


  // =====================================================
  // MAIN
  // =====================================================

  return (
    <div className="dashboard-layout">

      <Sidebar />


      <main className="dashboard-main">

        <Topbar
          user={currentUser}
          onLogout={handleLogout}
          title="Quản trị Support"
          description="Cấu hình phòng ban, team và tự động phân tuyến"
        />


        <div className="dashboard-content support-org-page">

          {/* HEADER */}

          <div className="welcome-section support-org-header">

            <div>

              <h1>
                Quản trị Support
              </h1>

              <p>
                Quản lý cơ cấu hỗ trợ và quy tắc tự động phân tuyến ticket.
              </p>

            </div>

          </div>


          {/* MESSAGES */}

          {error && (

            <div className="dashboard-error">
              {error}
            </div>

          )}


          {success && (

            <div className="support-org-success">
              ✓ {success}
            </div>

          )}


          {/* SUMMARY */}

          <div className="support-org-summary">

            <div className="support-org-summary-card">

              <span className="support-org-summary-icon">
                🏢
              </span>

              <div>

                <strong>
                  {departments.length}
                </strong>

                <span>
                  Phòng ban
                </span>

              </div>

            </div>


            <div className="support-org-summary-card">

              <span className="support-org-summary-icon">
                🛠️
              </span>

              <div>

                <strong>
                  {teams.length}
                </strong>

                <span>
                  Support Team
                </span>

              </div>

            </div>


            <div className="support-org-summary-card">

              <span className="support-org-summary-icon">
                👥
              </span>

              <div>

                <strong>
                  {users.length}
                </strong>

                <span>
                  Người dùng
                </span>

              </div>

            </div>


            <div className="support-org-summary-card">

              <span className="support-org-summary-icon">
                🔀
              </span>

              <div>

                <strong>
                  {rules.length}
                </strong>

                <span>
                  Routing Rules
                </span>

              </div>

            </div>

          </div>


          {/* TABS */}

          <div className="support-org-tabs">

            <button
              type="button"
              className={
                activeTab ===
                "departments"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "departments"
                )
              }
            >
              🏢 Phòng ban
            </button>


            <button
              type="button"
              className={
                activeTab ===
                "teams"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "teams"
                )
              }
            >
              🛠️ Support Team
            </button>


            <button
              type="button"
              className={
                activeTab ===
                "members"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "members"
                )
              }
            >
              👥 Thành viên
            </button>


            <button
              type="button"
              className={
                activeTab ===
                "rules"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(
                  "rules"
                )
              }
            >
              🔀 Routing Rules
            </button>

          </div>


          {/* =================================================
              DEPARTMENTS
          ================================================= */}

          {activeTab ===
            "departments" && (

            <section className="support-org-panel">

              <div className="support-org-panel-header">

                <div>

                  <h2>
                    Phòng ban
                  </h2>

                  <p>
                    Các bộ phận tham gia xử lý yêu cầu hỗ trợ.
                  </p>

                </div>


                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {

                    clearMessages();
                    setEditingDepartmentId(null);

                    setDepartmentForm({
                      name: "",
                      code: "",
                      manager_id: "",
                    });

                    setShowDepartmentModal(
                      true
                    );

                  }}
                  disabled={!canManageOrg}
                >
                  + Thêm phòng ban
                </button>

              </div>


              {departments.length ===
              0 ? (

                <div className="support-org-empty">

                  <div>
                    🏢
                  </div>

                  <h3>
                    Chưa có phòng ban
                  </h3>

                  <p>
                    Tạo phòng ban đầu tiên để bắt đầu cấu hình Support.
                  </p>

                </div>

              ) : (

                <div className="support-org-table-wrap">

                  <table className="support-org-table">

                    <thead>

                      <tr>

                        <th>
                          Phòng ban
                        </th>

                        <th>
                          Mã
                        </th>

                        <th>
                          Trưởng phòng
                        </th>

                        <th>
                          Trạng thái
                        </th>

                        <th>
                          Thao tác
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {departments.map(
                        (department) => (

                          <tr
                            key={
                              department.id
                            }
                          >

                            <td>

                              <div className="org-name-cell">

                                <div className="org-avatar">
                                  🏢
                                </div>

                                <div>

                                  <strong>
                                    {
                                      department.name
                                    }
                                  </strong>

                                  <span>
                                    ID #{department.id}
                                  </span>

                                </div>

                              </div>

                            </td>


                            <td>

                              <code>
                                {
                                  department.code
                                }
                              </code>

                            </td>


                            <td>

                              {department.manager
                                ? getUserName(
                                    department.manager
                                  )
                                : "Chưa chỉ định"}

                            </td>


                            <td>

                              <span className="org-status active">
                                Đang hoạt động
                              </span>

                            </td>

                            <td>
                              <div className="org-actions">
                                {canManageOrg && <button type="button" className="org-action-button edit" onClick={() => {
                                  clearMessages();
                                  setEditingDepartmentId(department.id);
                                  setDepartmentForm({
                                    name: department.name || "",
                                    code: department.code || "",
                                    manager_id: department.manager_id ? String(department.manager_id) : "",
                                  });
                                  setShowDepartmentModal(true);
                                }}>✏️ Sửa</button>}
                                {isAdmin && <button type="button" className="org-action-button delete" onClick={() => handleDeleteDepartment(department)}>🗑️ Xóa</button>}
                              </div>
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

          )}


          {/* =================================================
              TEAMS
          ================================================= */}

          {activeTab ===
            "teams" && (

            <section className="support-org-panel">

              <div className="support-org-panel-header">

                <div>

                  <h2>
                    Support Team
                  </h2>

                  <p>
                    Nhóm xử lý ticket trong từng phòng ban.
                  </p>

                </div>


                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {

                    clearMessages();
                    setEditingTeamId(null);

                    setTeamForm({
                      department_id:
                        departments[0]?.id
                          ? String(
                              departments[0].id
                            )
                          : "",
                      name: "",
                      code: "",
                      lead_id: "",
                    });

                    setShowTeamModal(
                      true
                    );

                  }}
                  disabled={!canManageTeam}
                >
                  + Thêm Team
                </button>

              </div>


              {teams.length ===
              0 ? (

                <div className="support-org-empty">

                  <div>
                    🛠️
                  </div>

                  <h3>
                    Chưa có Support Team
                  </h3>

                  <p>
                    Tạo Team để hệ thống có thể phân tuyến ticket.
                  </p>

                </div>

              ) : (

                <div className="support-org-table-wrap">

                  <table className="support-org-table">

                    <thead>

                      <tr>

                        <th>
                          Team
                        </th>

                        <th>
                          Phòng ban
                        </th>

                        <th>
                          Team Lead
                        </th>

                        <th>
                          Mã
                        </th>

                        <th>
                          Trạng thái
                        </th>

                        <th>
                          Thao tác
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {teams.map(
                        (team) => (

                          <tr
                            key={
                              team.id
                            }
                          >

                            <td>

                              <div className="org-name-cell">

                                <div className="org-avatar team">
                                  🛠️
                                </div>

                                <div>

                                  <strong>
                                    {team.name}
                                  </strong>

                                  <span>
                                    ID #{team.id}
                                  </span>

                                </div>

                              </div>

                            </td>


                            <td>
                              {getDepartmentName(
                                team.department_id
                              )}
                            </td>


                            <td>

                              {team.lead
                                ? getUserName(
                                    team.lead
                                  )
                                : "Chưa chỉ định"}

                            </td>


                            <td>

                              <code>
                                {team.code}
                              </code>

                            </td>


                            <td>

                              <span className="org-status active">
                                Đang hoạt động
                              </span>

                            </td>

                            <td>
                              <div className="org-actions">
                                {canManageTeam && <button type="button" className="org-action-button edit" onClick={() => {
                                  clearMessages();
                                  setEditingTeamId(team.id);
                                  setTeamForm({
                                    department_id: String(team.department_id),
                                    name: team.name || "",
                                    code: team.code || "",
                                    lead_id: team.lead_id ? String(team.lead_id) : "",
                                  });
                                  setShowTeamModal(true);
                                }}>✏️ Sửa</button>}
                                {canManageTeam && <button type="button" className="org-action-button delete" onClick={() => handleDeleteTeam(team)}>🗑️ Xóa</button>}
                              </div>
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

          )}


          {/* =================================================
              MEMBERS
          ================================================= */}

          {activeTab ===
            "members" && (

            <section className="support-org-panel">

              <div className="support-org-panel-header">

                <div>

                  <h2>
                    Thành viên Team
                  </h2>

                  <p>
                    Quản lý nhân sự được phép tiếp nhận ticket của từng Team.
                  </p>

                </div>

              </div>


              <div className="support-member-layout">

                {/* TEAM SELECTOR */}

                <div className="support-team-selector">

                  <label>
                    Chọn Support Team
                  </label>


                  <select
                    value={
                      selectedTeamId ||
                      ""
                    }
                    onChange={(event) => {

                      const value =
                        event.target.value;

                      setSelectedTeamId(
                        value
                          ? Number(value)
                          : null
                      );

                      clearMessages();

                    }}
                  >

                    <option value="">
                      -- Chọn Team --
                    </option>


                    {teams.map(
                      (team) => (

                        <option
                          key={
                            team.id
                          }
                          value={
                            team.id
                          }
                        >
                          {team.name}
                          {" · "}
                          {
                            getDepartmentName(
                              team.department_id
                            )
                          }
                        </option>

                      )
                    )}

                  </select>


                  {selectedTeam && (

                    <div className="selected-team-card">

                      <div className="org-avatar team">
                        🛠️
                      </div>

                      <div>

                        <strong>
                          {
                            selectedTeam.name
                          }
                        </strong>

                        <span>
                          {
                            getDepartmentName(
                              selectedTeam.department_id
                            )
                          }
                        </span>

                      </div>

                    </div>

                  )}

                </div>


                {/* MEMBERS */}

                <div className="support-members-content">

                  {!selectedTeamId ? (

                    <div className="support-org-empty compact">

                      <div>
                        👥
                      </div>

                      <h3>
                        Chọn một Team
                      </h3>

                      <p>
                        Chọn Team bên trái để xem thành viên.
                      </p>

                    </div>

                  ) : (

                    <>

                      <div className="members-header">

                        <div>

                          <h3>
                            Thành viên
                          </h3>

                          <span>
                            {members.length} người
                          </span>

                        </div>


                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => {

                            clearMessages();

                            setMemberForm({
                              user_id: "",
                            });

                            setShowMemberModal(
                              true
                            );

                          }}
                          disabled={!canManageMembers || availableUsers.length === 0}
                        >
                          + Thêm thành viên
                        </button>

                      </div>


                      {members.length ===
                      0 ? (

                        <div className="support-org-empty compact">

                          <div>
                            👤
                          </div>

                          <h3>
                            Team chưa có thành viên
                          </h3>

                          <p>
                            Thêm nhân viên vào Team để họ có thể Claim ticket.
                          </p>

                        </div>

                      ) : (

                        <div className="member-list">

                          {members.map(
                            (member) => (

                              <div
                                key={
                                  member.id
                                }
                                className="member-card"
                              >

                                <div className="member-avatar">
                                  {getUserName(
                                    member.user
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>


                                <div className="member-info">

                                  <strong>
                                    {getUserName(
                                      member.user
                                    )}
                                  </strong>

                                  <span>
                                    {member.user?.username}
                                  </span>

                                </div>


                                <span className="org-status active">
                                  Thành viên
                                </span>

                                {canManageMembers && <button
                                  type="button"
                                  className="org-action-button delete member-remove-button"
                                  onClick={() => handleRemoveMember(member)}
                                >
                                  🗑️ Xóa
                                </button>}

                              </div>

                            )
                          )}

                        </div>

                      )}

                    </>

                  )}

                </div>

              </div>

            </section>

          )}


          {/* =================================================
              RULES
          ================================================= */}

          {activeTab ===
            "rules" && (

            <section className="support-org-panel">

              <div className="support-org-panel-header">

                <div>

                  <h2>
                    Routing Rules
                  </h2>

                  <p>
                    Keyword dùng để tự động đưa ticket vào đúng Support Team.
                  </p>

                </div>


                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {

                    clearMessages();
                    setEditingRuleId(null);

                    setRuleForm({
                      team_id:
                        selectedTeamId
                          ? String(
                              selectedTeamId
                            )
                          : "",
                      keyword: "",
                      weight: 10,
                    });

                    setShowRuleModal(
                      true
                    );

                  }}
                  disabled={!canManageTeam || teams.length === 0}
                >
                  + Thêm Rule
                </button>

              </div>


              <div className="routing-explain">

                <div className="routing-explain-icon">
                  💡
                </div>

                <div>

                  <strong>
                    Cách hoạt động
                  </strong>

                  <p>
                    Khi người dùng tạo ticket, hệ thống tìm keyword trong tiêu đề và nội dung. Team có tổng điểm cao nhất sẽ được tự động nhận ticket.
                  </p>

                </div>

              </div>


              {rules.length ===
              0 ? (

                <div className="support-org-empty">

                  <div>
                    🔀
                  </div>

                  <h3>
                    Chưa có Routing Rule
                  </h3>

                  <p>
                    Thêm keyword để bật tự động phân tuyến ticket.
                  </p>

                </div>

              ) : (

                <div className="support-org-table-wrap">

                  <table className="support-org-table routing-table">

                    <thead>

                      <tr>

                        <th>
                          Keyword
                        </th>

                        <th>
                          Support Team
                        </th>

                        <th>
                          Phòng ban
                        </th>

                        <th>
                          Weight
                        </th>

                        <th>
                          Thao tác
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {rules.map(
                        (rule) => {

                          const team =
                            teams.find(
                              (item) =>
                                Number(
                                  item.id
                                ) ===
                                Number(
                                  rule.team_id
                                )
                            );


                          return (

                            <tr
                              key={
                                rule.id
                              }
                            >

                              <td>

                                <span className="keyword-badge">
                                  {rule.keyword}
                                </span>

                              </td>


                              <td>

                                <strong>
                                  {getTeamName(
                                    rule.team_id
                                  )}
                                </strong>

                              </td>


                              <td>

                                {team
                                  ? getDepartmentName(
                                      team.department_id
                                    )
                                  : "Không xác định"}

                              </td>


                              <td>

                                <span className="weight-badge">
                                  {rule.weight}
                                </span>

                              </td>


                              <td>

                                <div className="org-actions">
                                  {canEditRouting && <button
                                    type="button"
                                    className="org-action-button edit"
                                    onClick={() => {
                                      clearMessages();
                                      setEditingRuleId(rule.id);
                                      setRuleForm({
                                        team_id: String(rule.team_id),
                                        keyword: rule.keyword || "",
                                        weight: rule.weight ?? 10,
                                      });
                                      setShowRuleModal(true);
                                    }}
                                  >
                                    ✏️ Sửa
                                  </button>}
                                  {(isAdmin || isSupervisor) && <button
                                    type="button"
                                    className="org-action-button delete"
                                    onClick={() => handleDeleteRule(rule.id)}
                                  >
                                    🗑️ Xóa
                                  </button>}
                                </div>

                              </td>

                            </tr>

                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

          )}

        </div>

      </main>


      {/* =====================================================
          DEPARTMENT MODAL
      ===================================================== */}

      {showDepartmentModal && (

        <div
          className="support-org-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              if (!saving) {
                setShowDepartmentModal(
                  false
                );
              }

            }

          }}
        >

          <div className="support-org-modal">

            <div className="support-org-modal-header">

              <div>

                <span>
                  🏢
                </span>

                <div>

                  <h2>
                    {editingDepartmentId ? "Chỉnh sửa phòng ban" : "Thêm phòng ban"}
                  </h2>

                  <p>
                    Tạo một bộ phận mới trong cơ cấu Support.
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowDepartmentModal(
                    false
                  )
                }
                disabled={saving}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={editingDepartmentId ? handleUpdateDepartment : handleCreateDepartment}
            >

              <div className="org-form-group">

                <label>
                  Tên phòng ban
                </label>

                <input
                  value={
                    departmentForm.name
                  }
                  onChange={(event) =>
                    setDepartmentForm(
                      (current) => ({
                        ...current,
                        name:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Ví dụ: IT Support"
                />

              </div>


              <div className="org-form-group">

                <label>
                  Mã phòng ban
                </label>

                <input
                  value={
                    departmentForm.code
                  }
                  onChange={(event) =>
                    setDepartmentForm(
                      (current) => ({
                        ...current,
                        code:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Ví dụ: IT_SUPPORT"
                />

                <small>
                  Mã nên ngắn, không dấu và dễ nhận diện.
                </small>

              </div>


              <div className="org-form-group">

                <label>
                  Trưởng phòng
                </label>

                <select
                  value={
                    departmentForm.manager_id
                  }
                  onChange={(event) =>
                    setDepartmentForm(
                      (current) => ({
                        ...current,
                        manager_id:
                          event.target.value,
                      })
                    )
                  }
                >

                  <option value="">
                    -- Chưa chỉ định --
                  </option>


                  {users.map(
                    (user) => (

                      <option
                        key={
                          user.id
                        }
                        value={
                          user.id
                        }
                      >
                        {getUserName(
                          user
                        )}
                        {" · "}
                        {user.username}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="org-modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowDepartmentModal(false);
                    setEditingDepartmentId(null);
                  }}
                  disabled={saving}
                >
                  Hủy
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingDepartmentId ? "Lưu thay đổi" : "Tạo phòng ban"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================================
          TEAM MODAL
      ===================================================== */}

      {showTeamModal && (

        <div
          className="support-org-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              if (!saving) {
                setShowTeamModal(
                  false
                );
              }

            }

          }}
        >

          <div className="support-org-modal">

            <div className="support-org-modal-header">

              <div>

                <span>
                  🛠️
                </span>

                <div>

                  <h2>
                    {editingTeamId ? "Chỉnh sửa Support Team" : "Thêm Support Team"}
                  </h2>

                  <p>
                    Tạo nhóm xử lý ticket.
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={() => {
                  setShowTeamModal(false);
                  setEditingTeamId(null);
                }}
                disabled={saving}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={editingTeamId ? handleUpdateTeam : handleCreateTeam}
            >

              <div className="org-form-group">

                <label>
                  Phòng ban
                </label>

                <select
                  value={
                    teamForm.department_id
                  }
                  onChange={(event) =>
                    setTeamForm(
                      (current) => ({
                        ...current,
                        department_id:
                          event.target.value,
                      })
                    )
                  }
                >

                  <option value="">
                    -- Chọn phòng ban --
                  </option>


                  {departments.map(
                    (department) => (

                      <option
                        key={
                          department.id
                        }
                        value={
                          department.id
                        }
                      >
                        {department.name}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="org-form-group">

                <label>
                  Tên Team
                </label>

                <input
                  value={
                    teamForm.name
                  }
                  onChange={(event) =>
                    setTeamForm(
                      (current) => ({
                        ...current,
                        name:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Ví dụ: IT Helpdesk"
                />

              </div>


              <div className="org-form-group">

                <label>
                  Mã Team
                </label>

                <input
                  value={
                    teamForm.code
                  }
                  onChange={(event) =>
                    setTeamForm(
                      (current) => ({
                        ...current,
                        code:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Ví dụ: IT_HELPDESK"
                />

              </div>


              <div className="org-form-group">

                <label>
                  Team Lead
                </label>

                <select
                  value={
                    teamForm.lead_id
                  }
                  onChange={(event) =>
                    setTeamForm(
                      (current) => ({
                        ...current,
                        lead_id:
                          event.target.value,
                      })
                    )
                  }
                >

                  <option value="">
                    -- Chưa chỉ định --
                  </option>


                  {users.map(
                    (user) => (

                      <option
                        key={
                          user.id
                        }
                        value={
                          user.id
                        }
                      >
                        {getUserName(
                          user
                        )}
                        {" · "}
                        {user.username}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="org-modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowTeamModal(
                      false
                    )
                  }
                  disabled={saving}
                >
                  Hủy
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingTeamId ? "Lưu thay đổi" : "Tạo Team"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================================
          MEMBER MODAL
      ===================================================== */}

      {showMemberModal && (

        <div
          className="support-org-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              if (!saving) {
                setShowMemberModal(
                  false
                );
              }

            }

          }}
        >

          <div className="support-org-modal">

            <div className="support-org-modal-header">

              <div>

                <span>
                  👥
                </span>

                <div>

                  <h2>
                    Thêm thành viên
                  </h2>

                  <p>
                    Thêm nhân viên vào {selectedTeam?.name || "Team"}.
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowMemberModal(
                    false
                  )
                }
                disabled={saving}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                handleAddMember
              }
            >

              <div className="org-form-group">

                <label>
                  Nhân viên
                </label>

                <select
                  value={
                    memberForm.user_id
                  }
                  onChange={(event) =>
                    setMemberForm(
                      (current) => ({
                        ...current,
                        user_id:
                          event.target.value,
                      })
                    )
                  }
                >

                  <option value="">
                    -- Chọn nhân viên --
                  </option>


                  {availableUsers.map(
                    (user) => (

                      <option
                        key={
                          user.id
                        }
                        value={
                          user.id
                        }
                      >
                        {getUserName(
                          user
                        )}
                        {" · "}
                        {user.username}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="org-modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowMemberModal(
                      false
                    )
                  }
                  disabled={saving}
                >
                  Hủy
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    saving ||
                    availableUsers.length ===
                      0
                  }
                >
                  {saving
                    ? "Đang thêm..."
                    : "Thêm thành viên"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================================
          RULE MODAL
      ===================================================== */}

      {showRuleModal && (

        <div
          className="support-org-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              if (!saving) {
                setShowRuleModal(
                  false
                );
              }

            }

          }}
        >

          <div className="support-org-modal">

            <div className="support-org-modal-header">

              <div>

                <span>
                  🔀
                </span>

                <div>

                  <h2>
                    {editingRuleId ? "Chỉnh sửa Routing Rule" : "Thêm Routing Rule"}
                  </h2>

                  <p>
                    Keyword để tự động phân tuyến ticket.
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={() => {
                  setShowRuleModal(false);
                  setEditingRuleId(null);
                }}
                disabled={saving}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={editingRuleId ? handleUpdateRule : handleCreateRule}
            >

              <div className="org-form-group">

                <label>
                  Support Team
                </label>

                <select
                  value={
                    ruleForm.team_id
                  }
                  onChange={(event) =>
                    setRuleForm(
                      (current) => ({
                        ...current,
                        team_id:
                          event.target.value,
                      })
                    )
                  }
                >

                  <option value="">
                    -- Chọn Team --
                  </option>


                  {teams.map(
                    (team) => (

                      <option
                        key={
                          team.id
                        }
                        value={
                          team.id
                        }
                      >
                        {team.name}
                        {" · "}
                        {
                          getDepartmentName(
                            team.department_id
                          )
                        }
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="org-form-group">

                <label>
                  Keyword
                </label>

                <input
                  value={
                    ruleForm.keyword
                  }
                  onChange={(event) =>
                    setRuleForm(
                      (current) => ({
                        ...current,
                        keyword:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Ví dụ: wifi"
                />

                <small>
                  Có thể nhập từ khóa tiếng Việt có dấu hoặc không dấu.
                </small>

              </div>


              <div className="org-form-group">

                <label>
                  Weight
                </label>

                <input
                  type="number"
                  min="1"
                  max="100"
                  value={
                    ruleForm.weight
                  }
                  onChange={(event) =>
                    setRuleForm(
                      (current) => ({
                        ...current,
                        weight:
                          event.target.value,
                      })
                    )
                  }
                />

                <small>
                  Điểm càng cao thì keyword càng có ảnh hưởng lớn khi phân tuyến.
                </small>

              </div>


              <div className="org-modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowRuleModal(
                      false
                    )
                  }
                  disabled={saving}
                >
                  Hủy
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingRuleId ? "Lưu thay đổi" : "Tạo Routing Rule"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


export default SupportOrganization;