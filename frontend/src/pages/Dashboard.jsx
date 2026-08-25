import { useEffect, useState } from "react";

import api from "../services/api";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";

import "../Dashboard.css";


function Dashboard() {
  const [user, setUser] = useState(null);

  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showTaskModal, setShowTaskModal] =
    useState(false);


  /*
   * LOAD DASHBOARD DATA
   */
  useEffect(() => {
    const loadDashboard = async () => {
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
          "Dashboard error:",
          error
        );


        /*
         * TOKEN KHÔNG HỢP LỆ
         */
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
          "Không thể tải dữ liệu Dashboard."
        );

      } finally {

        setLoading(false);

      }
    };


    loadDashboard();

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
   * TASK CREATED
   *
   * TaskModal gọi function này
   * sau khi POST /tasks thành công.
   */
  const handleTaskCreated = (
    newTask
  ) => {

    setTasks(
      (currentTasks) => [
        newTask,
        ...currentTasks,
      ]
    );

  };


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
          Đang tải Dashboard...
        </span>

      </div>
    );

  }


  /*
   * DASHBOARD
   */
  return (
    <div className="dashboard-layout">


      {/* =========================
          CREATE TASK MODAL
          ========================= */}

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


      {/* =========================
          SIDEBAR
          ========================= */}

      <Sidebar />


      {/* =========================
          MAIN
          ========================= */}

      <main className="dashboard-main">


        {/* =========================
            TOPBAR
            ========================= */}

        <Topbar
          user={user}
          onLogout={handleLogout}
        />


        {/* =========================
            CONTENT
            ========================= */}

        <div className="dashboard-content">


          {/* =========================
              WELCOME
              ========================= */}

          <div className="welcome-section">

            <div>

              <h1>
                Xin chào,{" "}
                {user?.full_name ||
                  user?.username}
                ! 👋
              </h1>


              <p>
                Đây là tình hình công việc
                của nhóm hiện tại.
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


          {/* =========================
              ERROR
              ========================= */}

          {error && (

            <div className="dashboard-error">
              {error}
            </div>

          )}


          {/* =========================
              STATISTICS
              ========================= */}

          <div className="stats-grid">


            <StatCard
              title="Tổng công việc"
              value={totalTasks}
              icon="📋"
              description="Tất cả công việc"
            />


            <StatCard
              title="Chưa làm"
              value={todoTasks}
              icon="📝"
              description="Đang chờ xử lý"
            />


            <StatCard
              title="Đang làm"
              value={inProgressTasks}
              icon="⚡"
              description="Đang được thực hiện"
            />


            <StatCard
              title="Hoàn thành"
              value={completedTasks}
              icon="✅"
              description="Đã hoàn thành"
            />

          </div>


          {/* =========================
              TASK SECTION
              ========================= */}

          <section className="tasks-section">


            {/* HEADER */}

            <div className="section-header">

              <div>

                <h2>
                  Công việc gần đây
                </h2>


                <p>
                  Các công việc mới nhất
                  trong nhóm
                </p>

              </div>


              <button
                className="view-all-button"
                type="button"
              >
                Xem tất cả →
              </button>

            </div>


            {/* =========================
                TASK LIST
                ========================= */}

            {tasks.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  📋
                </div>


                <h3>
                  Chưa có công việc
                </h3>


                <p>
                  Tạo công việc đầu tiên
                  cho nhóm của bạn.
                </p>


                <button
                  className="create-task-button"
                  type="button"
                  onClick={() =>
                    setShowTaskModal(true)
                  }
                >
                  + Tạo công việc
                </button>

              </div>

            ) : (

              <div className="task-list">

                {tasks
                  .slice(0, 10)
                  .map((task) => (

                    <TaskCard
                      key={task.id}
                      task={task}
                    />

                  ))}

              </div>

            )}

          </section>


        </div>


      </main>


    </div>
  );
}


export default Dashboard;