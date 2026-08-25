import { useEffect, useMemo, useState } from "react";

import api from "../services/api";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import TaskDetail from "../components/TaskDetail";

import "../Dashboard.css";


function Tasks() {
  const [user, setUser] = useState(null);

  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");
  
  const [sortBy, setSortBy] =
  useState("updated_desc");  

  const [showTaskModal, setShowTaskModal] =
    useState(false);

  const [selectedTask, setSelectedTask] =
    useState(null);


  /*
   * LOAD DATA
   */
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        userResponse,
        tasksResponse,
      ] = await Promise.all([
        api.get("/auth/me"),
        api.get("/tasks"),
      ]);

      setUser(userResponse.data);

      setTasks(tasksResponse.data);

    } catch (error) {
      console.error(
        "Tasks page error:",
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
        "Không thể tải danh sách công việc."
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadTasks();
  }, []);


  /*
   * LOGOUT
   */
  const handleLogout = () => {
    localStorage.removeItem(
      "access_token"
    );

    window.location.href = "/";
  };


  /*
   * CREATE TASK
   */
  const handleTaskCreated = () => {
    setShowTaskModal(false);
    loadTasks();
  };


  /*
   * TASK CLICK
   */
  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };


  /*
   * TASK UPDATED
   */
  const handleTaskUpdated = (
    updatedTask
  ) => {

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === updatedTask.id
          ? updatedTask
          : task
      )
    );

    setSelectedTask(updatedTask);
  };


  /*
   * FILTER TASKS
   */
const filteredTasks = useMemo(() => {
  const result = tasks.filter((task) => {
    const matchesStatus =
      statusFilter === "all" ||
      task.status === statusFilter;

    const searchText =
      search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      task.title
        ?.toLowerCase()
        .includes(searchText) ||
      task.description
        ?.toLowerCase()
        .includes(searchText);

    return matchesStatus && matchesSearch;
  });


  const priorityOrder = {
    low: 1,
    medium: 2,
    high: 3,
  };


  return [...result].sort((a, b) => {
    switch (sortBy) {

      case "updated_desc":
        return (
          new Date(b.updated_at || 0) -
          new Date(a.updated_at || 0)
        );


      case "created_desc":
        return (
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
        );


      case "created_asc":
        return (
          new Date(a.created_at || 0) -
          new Date(b.created_at || 0)
        );


      case "deadline_asc":
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;

        return (
          new Date(a.deadline) -
          new Date(b.deadline)
        );


      case "deadline_desc":
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;

        return (
          new Date(b.deadline) -
          new Date(a.deadline)
        );


      case "priority_desc":
        return (
          (priorityOrder[b.priority] || 0) -
          (priorityOrder[a.priority] || 0)
        );


      case "priority_asc":
        return (
          (priorityOrder[a.priority] || 0) -
          (priorityOrder[b.priority] || 0)
        );


      case "progress_asc":
        return (
          (a.progress || 0) -
          (b.progress || 0)
        );


      case "progress_desc":
        return (
          (b.progress || 0) -
          (a.progress || 0)
        );


      default:
        return 0;
    }
  });

}, [
  tasks,
  statusFilter,
  search,
  sortBy,
]);


  /*
   * STATISTICS
   */
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


  /*
   * LOADING
   */
  if (loading) {
    return (
      <div className="dashboard-loading">

        <div className="loading-spinner" />

        <span>
          Đang tải công việc...
        </span>

      </div>
    );
  }


  return (
    <div className="dashboard-layout">


      {/* SIDEBAR */}

      <Sidebar />


      {/* MAIN */}

      <main className="dashboard-main">


        <Topbar
          user={user}
          onLogout={handleLogout}
        />


        <div className="dashboard-content">


          {/* HEADER */}

          <div className="welcome-section">

            <div>

              <h1>
                Công việc
              </h1>

              <p>
                Quản lý tất cả công việc
                của nhóm.
              </p>

            </div>


            <button
              className="create-task-button"
              onClick={() =>
                setShowTaskModal(true)
              }
            >
              + Tạo công việc
            </button>

          </div>


          {/* ERROR */}

          {error && (
            <div className="dashboard-error">
              {error}
            </div>
          )}


          {/* STATISTICS */}

          <div className="stats-grid">

            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-title">
                  Tổng công việc
                </div>

                <div className="stat-card-icon">
                  📋
                </div>

              </div>

              <div className="stat-card-value">
                {totalTasks}
              </div>

              <div className="stat-card-description">
                Tất cả công việc
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-title">
                  Chưa làm
                </div>

                <div className="stat-card-icon">
                  📝
                </div>

              </div>

              <div className="stat-card-value">
                {todoTasks}
              </div>

              <div className="stat-card-description">
                Đang chờ xử lý
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-title">
                  Đang làm
                </div>

                <div className="stat-card-icon">
                  ⚡
                </div>

              </div>

              <div className="stat-card-value">
                {inProgressTasks}
              </div>

              <div className="stat-card-description">
                Đang thực hiện
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-title">
                  Hoàn thành
                </div>

                <div className="stat-card-icon">
                  ✅
                </div>

              </div>

              <div className="stat-card-value">
                {completedTasks}
              </div>

              <div className="stat-card-description">
                Đã hoàn thành
              </div>

            </div>

          </div>


          {/* FILTER */}

          <section className="tasks-section">

            <div className="section-header">

              <div>

                <h2>
                  Danh sách công việc
                </h2>

                <p>
                  Tìm kiếm và lọc công việc
                </p>

              </div>

            </div>


            <div className="tasks-toolbar">


              {/* SEARCH */}

              <div className="task-search">

                <span>
                  🔎
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Tìm kiếm công việc..."
                />

              </div>


              {/* FILTER */}

              <div className="task-filters">

                <button
                  type="button"
                  className={
                    statusFilter === "all"
                      ? "filter-button active"
                      : "filter-button"
                  }
                  onClick={() =>
                    setStatusFilter("all")
                  }
                >
                  Tất cả
                </button>


                <button
                  type="button"
                  className={
                    statusFilter === "todo"
                      ? "filter-button active"
                      : "filter-button"
                  }
                  onClick={() =>
                    setStatusFilter("todo")
                  }
                >
                  Chưa làm
                </button>


                <button
                  type="button"
                  className={
                    statusFilter === "in_progress"
                      ? "filter-button active"
                      : "filter-button"
                  }
                  onClick={() =>
                    setStatusFilter(
                      "in_progress"
                    )
                  }
                >
                  Đang làm
                </button>


                <button
                  type="button"
                  className={
                    statusFilter === "completed"
                      ? "filter-button active"
                      : "filter-button"
                  }
                  onClick={() =>
                    setStatusFilter(
                      "completed"
                    )
                  }
                >
                  Hoàn thành
                </button>

              </div>

            </div>
            <div className="task-sort">

  <label htmlFor="task-sort">
    Sắp xếp
  </label>

  <select
    id="task-sort"
    value={sortBy}
    onChange={(event) =>
      setSortBy(event.target.value)
    }
  >
    <option value="updated_desc">
      Mới cập nhật
    </option>

    <option value="created_desc">
      Mới tạo
    </option>

    <option value="created_asc">
      Cũ nhất
    </option>

    <option value="deadline_asc">
      Deadline gần nhất
    </option>

    <option value="deadline_desc">
      Deadline xa nhất
    </option>

    <option value="priority_desc">
      Ưu tiên cao → thấp
    </option>

    <option value="priority_asc">
      Ưu tiên thấp → cao
    </option>

    <option value="progress_asc">
      Tiến độ thấp → cao
    </option>

    <option value="progress_desc">
      Tiến độ cao → thấp
    </option>
  </select>

</div>      

            {/* TASK LIST */}

            {filteredTasks.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  📋
                </div>

                <h3>
                  Không tìm thấy công việc
                </h3>

                <p>
                  Thử thay đổi từ khóa
                  hoặc bộ lọc.
                </p>

              </div>

            ) : (

              <div className="task-list">

                {filteredTasks.map(
                  (task) => (

                    <TaskCard
                      key={task.id}
                      task={task}
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


      {/* CREATE TASK */}

      {showTaskModal && (

        <TaskModal
          onClose={() =>
            setShowTaskModal(false)
          }
          onCreated={
            handleTaskCreated
          }
        />

      )}


      {/* TASK DETAIL */}

      {selectedTask && (

        <TaskDetail
          task={selectedTask}
          onClose={() =>
            setSelectedTask(null)
          }
          onUpdated={
            handleTaskUpdated
          }
        />

      )}

    </div>
  );
}


export default Tasks;