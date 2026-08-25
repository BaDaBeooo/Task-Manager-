import { useEffect, useState } from "react";

import api from "../services/api";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import TaskDetail from "../components/TaskDetail";

import "../Dashboard.css";


function Tasks() {

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

  const [showModal, setShowModal] =
    useState(false);

  const [selectedTask, setSelectedTask] =
    useState(null);


  // =====================================================
  // FILTER
  // =====================================================

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [priorityFilter, setPriorityFilter] =
    useState("all");

  const [search, setSearch] =
    useState("");


  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadTasks = async () => {

    try {

      setLoading(true);
      setError("");


      const [
        userResponse,
        tasksResponse,
        usersResponse,
      ] = await Promise.all([

        api.get("/auth/me"),

        api.get("/tasks"),

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
  // CREATE TASK
  // =====================================================

  const handleTaskCreated = (
    createdTask
  ) => {

    setTasks(
      (currentTasks) => [
        createdTask,
        ...currentTasks,
      ]
    );


    setShowModal(false);

  };


  // =====================================================
  // OPEN DETAIL
  // =====================================================

  const handleTaskClick = (
    task
  ) => {

    setSelectedTask(task);

  };


  // =====================================================
  // UPDATE TASK
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
  // DELETE TASK
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


    setSelectedTask(null);

  };


  // =====================================================
  // FILTER TASKS
  // =====================================================

  const filteredTasks =
    tasks.filter(
      (task) => {

        const matchesStatus =
          statusFilter === "all" ||
          task.status ===
            statusFilter;


        const matchesPriority =
          priorityFilter === "all" ||
          task.priority ===
            priorityFilter;


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


  // =====================================================
  // STATS
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
  // LOADING
  // =====================================================

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


          {/* HEADER */}

          <div className="welcome-section">

            <div>

              <h1>
                Công việc
              </h1>

              <p>
                Quản lý và theo dõi
                toàn bộ công việc.
              </p>

            </div>


            <button
              className="primary-button"
              type="button"
              onClick={() =>
                setShowModal(true)
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


          {/* STATS */}

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
                Tất cả công việc
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
                Đang chờ thực hiện
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
                Hoàn thành
              </div>

              <div className="stat-card-description">
                Đã hoàn tất
              </div>

            </div>


          </div>


          {/* FILTERS */}

          <div className="tasks-toolbar">


            {/* SEARCH */}

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


            {/* STATUS */}

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


            {/* PRIORITY */}

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


          {/* TASK LIST */}

          <section className="tasks-section">


            <div className="section-header">

              <div>

                <h2>
                  Danh sách công việc
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
                  📋
                </div>

                <h3>
                  Không có công việc
                </h3>

                <p>
                  Không tìm thấy công việc
                  phù hợp.
                </p>

              </div>

            ) : (

              <div className="task-list">

                {filteredTasks.map(
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


      {/* CREATE TASK MODAL */}

      {showModal && (

        <TaskModal

          users={users}

          onClose={() =>
            setShowModal(false)
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

          users={users}

          onClose={() =>
            setSelectedTask(null)
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


export default Tasks;