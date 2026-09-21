import { useEffect, useState } from "react";

import api from "../services/api";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TaskCard from "../components/TaskCard";
import TaskDetail from "../components/TaskDetail";

import "../Dashboard.css";


function MyTasks() {

  const [user, setUser] =
    useState(null);

  const [users, setUsers] =
    useState([]);

  const [tasks, setTasks] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedTask, setSelectedTask] =
    useState(null);


  // =====================================================
  // FILTER
  // =====================================================

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [priorityFilter, setPriorityFilter] =
    useState("all");


  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadMyTasks = async () => {

    try {

      setLoading(true);
      setError("");


      const [
        userResponse,
        tasksResponse,
        usersResponse,
      ] = await Promise.all([

        api.get("/auth/me"),

        api.get(
          "/tasks?mine=true"
        ),

        api.get("/users"),

      ]);


      setUser(
        userResponse.data
      );

      setTasks(
        tasksResponse.data
      );

      setUsers(
        usersResponse.data
      );


    } catch (error) {

      console.error(
        "My tasks error:",
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
        "Không thể tải công việc của bạn."
      );


    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadMyTasks();

  }, []);

  // Keep an open task detail synchronized with the refreshed list.
  useEffect(() => {
    if (!selectedTask) return;

    const latest = tasks.find((item) => item.id === selectedTask.id);
    if (latest) {
      setSelectedTask(latest);
    } else if (tasks.length > 0) {
      setSelectedTask(null);
    }
  }, [tasks, selectedTask?.id]);

  // Realtime task changes: refresh the page data without F5.
  useEffect(() => {
    const handleRealtime = (event) => {
      const data = event.detail;
      if (data?.type !== "data_changed" || data.entity !== "task") return;

      loadMyTasks();
    };

    window.addEventListener("taskmanager:realtime", handleRealtime);
    return () => window.removeEventListener("taskmanager:realtime", handleRealtime);
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
  // OPEN TASK DETAIL
  // =====================================================

  const handleTaskClick = (
    task
  ) => {

    setSelectedTask(
      task
    );

  };


  // =====================================================
  // TASK UPDATED
  // =====================================================

  const handleTaskUpdated = (
    updatedTask
  ) => {

    setTasks(
      (currentTasks) =>
        currentTasks.map(
          (task) =>
            task.id === updatedTask.id
              ? updatedTask
              : task
        )
    );


    setSelectedTask(
      updatedTask
    );

  };


  // =====================================================
  // CLOSE TASK DETAIL
  // =====================================================

  const handleCloseDetail = () => {

    setSelectedTask(
      null
    );

  };


  // =====================================================
  // TASK DELETED
  // =====================================================

  const handleTaskDeleted = (
    taskId
  ) => {

    setTasks(
      (currentTasks) =>
        currentTasks.filter(
          (task) =>
            task.id !== taskId
        )
    );


    setSelectedTask(
      null
    );

  };


  // =====================================================
  // STATISTICS
  // =====================================================

  const totalTasks =
    tasks.length;


  const todoTasks =
    tasks.filter(
      (task) =>
        task.status === "todo"
    ).length;


  const inProgressTasks =
    tasks.filter(
      (task) =>
        task.status === "in_progress"
    ).length;


  const completedTasks =
    tasks.filter(
      (task) =>
        task.status === "completed"
    ).length;


  // =====================================================
  // FILTERED TASKS
  // =====================================================

  const filteredTasks =
    tasks.filter(
      (task) => {

        const matchesStatus =
          statusFilter === "all" ||
          task.status === statusFilter;


        const matchesPriority =
          priorityFilter === "all" ||
          task.priority === priorityFilter;


        const searchText =
          search
            .trim()
            .toLowerCase();


        const matchesSearch =
          !searchText ||
          task.title
            ?.toLowerCase()
            .includes(searchText) ||
          task.description
            ?.toLowerCase()
            .includes(searchText);


        return (
          matchesStatus &&
          matchesPriority &&
          matchesSearch
        );

      }
    );
    const sortedTasks = [
  ...filteredTasks,
].sort((a, b) => {

  const aCompleted =
    a.status === "completed";

  const bCompleted =
    b.status === "completed";

  if (
    aCompleted === bCompleted
  ) {
    return 0;
  }

  return aCompleted ? 1 : -1;
});

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="dashboard-layout">

        <Sidebar />

        <main className="dashboard-main">

          <Topbar
            user={user}
            onLogout={handleLogout}
          />

          <div className="dashboard-loading-content">

            <div className="loading-spinner" />

            <span>
              Đang tải công việc...
            </span>

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
          user={user}
          onLogout={handleLogout}
        />


        <div className="dashboard-content">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="welcome-section">

            <div>

              <h1>
                Việc của tôi
              </h1>

              <p>
                Các công việc được giao
                hoặc bạn đang hỗ trợ.
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
              STATISTICS
          ================================================= */}

          <div className="stats-grid">


            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-icon">
                  📋
                </div>

                <div className="stat-card-value">
                  {totalTasks}
                </div>

              </div>

              <div className="stat-card-title">
                Tổng công việc
              </div>

              <div className="stat-card-description">
                Được giao hoặc hỗ trợ
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-icon">
                  📝
                </div>

                <div className="stat-card-value">
                  {todoTasks}
                </div>

              </div>

              <div className="stat-card-title">
                Chưa làm
              </div>

              <div className="stat-card-description">
                Đang chờ xử lý
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-icon">
                  🔄
                </div>

                <div className="stat-card-value">
                  {inProgressTasks}
                </div>

              </div>

              <div className="stat-card-title">
                Đang làm
              </div>

              <div className="stat-card-description">
                Đang thực hiện
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-icon">
                  ✅
                </div>

                <div className="stat-card-value">
                  {completedTasks}
                </div>

              </div>

              <div className="stat-card-title">
                Đã hoàn thành
              </div>

              <div className="stat-card-description">
                Đã hoàn tất
              </div>

            </div>


          </div>


          {/* =================================================
              SEARCH + FILTER
          ================================================= */}

          <div className="tasks-toolbar">


            <div className="tasks-search">

              <input
                type="text"
                placeholder="Tìm kiếm công việc..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="tasks-filters">

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  Tất cả trạng thái
                </option>

                <option value="todo">
                  Chưa làm
                </option>

                <option value="in_progress">
                  Đang làm
                </option>

                <option value="completed">
                  Hoàn thành
                </option>

              </select>


              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  Tất cả ưu tiên
                </option>

                <option value="high">
                  Cao
                </option>

                <option value="medium">
                  Trung bình
                </option>

                <option value="low">
                  Thấp
                </option>

              </select>

            </div>

          </div>


          {/* =================================================
              TASK LIST
          ================================================= */}

          <section className="tasks-section">


            <div className="section-header">

              <div>

                <h2>
                  Công việc của tôi
                </h2>

                <p>
                  {filteredTasks.length}{" "}
                  công việc
                </p>

              </div>

            </div>


            {filteredTasks.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  🎉
                </div>

                <h3>
                  Không có công việc
                </h3>

                <p>
                  Không tìm thấy công việc
                  phù hợp với bộ lọc hiện tại.
                </p>

              </div>

            ) : (

              <div className="task-list">

                {sortedTasks.map(
                  (task) => (

                    <TaskCard
                      key={task.id}
                      task={task}
                      users={users}
                      onClick={
                        handleTaskClick
                      }
                    />

                  )
                )}

              </div>

            )}

          </section>


        </div>


      </main>


      {/* =================================================
          TASK DETAIL
      ================================================= */}

      {selectedTask && (

        <TaskDetail
          task={selectedTask}
          users={users}

          onClose={
            handleCloseDetail
          }

          onUpdated={
            handleTaskUpdated
          }

          onDeleted={
            handleTaskDeleted
          }

        />

      )}


    </div>

  );

}


export default MyTasks;