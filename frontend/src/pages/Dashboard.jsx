import { useEffect, useState } from "react";

import api from "../services/api";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import TaskModal from "../components/TaskModal";

import "../Dashboard.css";


function Dashboard() {

  const [user, setUser] =
    useState(null);

  const [tasks, setTasks] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showTaskModal, setShowTaskModal] =
    useState(false);


  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  useEffect(() => {

    const loadDashboard =
      async () => {

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


          setUser(
            userResponse.data
          );


          setTasks(
            tasksResponse.data
          );


        } catch (error) {

          console.error(
            "Dashboard error:",
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
            "Không thể tải dữ liệu Dashboard."
          );


        } finally {

          setLoading(false);

        }

      };


    loadDashboard();

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
  // TASK CREATED
  // =====================================================

  const handleTaskCreated = (
    newTask
  ) => {

    setTasks(
      (currentTasks) => [
        newTask,
        ...currentTasks,
      ]
    );


    setShowTaskModal(false);

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
  // OVERDUE
  // =====================================================

  const now =
    new Date();


  const overdueTasks =
    tasks.filter(
      (task) => {

        if (
          !task.deadline ||
          task.status === "completed"
        ) {

          return false;

        }


        return (
          new Date(
            task.deadline
          ) < now
        );

      }
    ).length;


  // =====================================================
  // COMPLETION RATE
  // =====================================================

  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round(
          (
            completedTasks /
            totalTasks
          ) * 100
        );


  // =====================================================
  // PROGRESS
  // =====================================================

  const progressWidth =
    Math.min(
      Math.max(
        completionRate,
        0
      ),
      100
    );


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
              Đang tải Dashboard...
            </span>

          </div>

        </main>

      </div>

    );

  }


  // =====================================================
  // DASHBOARD
  // =====================================================

  return (

    <div className="dashboard-layout">


      {/* =================================================
          CREATE TASK MODAL
      ================================================= */}

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


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <Sidebar />


      {/* =================================================
          MAIN
      ================================================= */}

      <main className="dashboard-main">


        {/* =================================================
            TOPBAR
        ================================================= */}

        <Topbar
          user={user}
          onLogout={handleLogout}
        />


        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="dashboard-content">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="welcome-section">

            <div>

              <h1>
                Xin chào,{" "}
                {user?.full_name ||
                  user?.username}
                ! 👋
              </h1>


              <p>
                Tổng quan tình hình
                công việc của bạn.
              </p>

            </div>


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


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div className="dashboard-error">
              {error}
            </div>

          )}


          {/* =================================================
              STATISTICS
          ================================================= */}

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


          {/* =================================================
              SECONDARY STATISTICS
          ================================================= */}

          <div className="dashboard-summary-grid">


            {/* COMPLETION RATE */}

            <section className="dashboard-panel">

              <div className="dashboard-panel-header">

                <div>

                  <h2>
                    Tỷ lệ hoàn thành
                  </h2>

                  <p>
                    Tiến độ hoàn thành
                    công việc
                  </p>

                </div>


                <div className="dashboard-panel-value">
                  {completionRate}%
                </div>

              </div>


              <div className="dashboard-progress">

                <div className="dashboard-progress-track">

                  <div
                    className="dashboard-progress-fill"
                    style={{
                      width:
                        `${progressWidth}%`,
                    }}
                  />

                </div>

              </div>


              <div className="dashboard-progress-info">

                <span>
                  {completedTasks} hoàn thành
                </span>

                <span>
                  {totalTasks} tổng cộng
                </span>

              </div>

            </section>


            {/* OVERDUE */}

            <section className="dashboard-panel">

              <div className="dashboard-panel-header">

                <div>

                  <h2>
                    Công việc quá hạn
                  </h2>

                  <p>
                    Các công việc đã
                    vượt deadline
                  </p>

                </div>


                <div
                  className={`dashboard-panel-value ${
                    overdueTasks > 0
                      ? "dashboard-danger-value"
                      : "dashboard-success-value"
                  }`}
                >
                  {overdueTasks}
                </div>

              </div>


              <div className="dashboard-panel-status">

                {overdueTasks > 0 ? (

                  <span className="dashboard-status-danger">
                    ⚠ Cần xử lý
                  </span>

                ) : (

                  <span className="dashboard-status-success">
                    ✓ Không có công việc quá hạn
                  </span>

                )}

              </div>

            </section>


          </div>


          {/* =================================================
              KPI
          ================================================= */}

          <section className="dashboard-kpi-panel">


            <div className="dashboard-kpi-header">

              <div>

                <h2>
                  KPI
                </h2>

                <p>
                  Theo dõi hiệu suất công việc
                </p>

              </div>


              <span className="dashboard-kpi-badge">
                Chưa thiết lập
              </span>

            </div>


            <div className="dashboard-kpi-content">


              <div className="dashboard-kpi-icon">
                🎯
              </div>


              <div className="dashboard-kpi-text">

                <strong>
                  KPI chưa được thiết lập
                </strong>

                <p>
                  Hệ thống sẽ hiển thị
                  chỉ số KPI khi cấu hình
                  tiêu chí đánh giá.
                </p>

              </div>

            </div>


          </section>


          {/* =================================================
              STATUS SUMMARY
          ================================================= */}

          <section className="dashboard-status-panel">


            <div className="dashboard-panel-header">

              <div>

                <h2>
                  Phân bổ công việc
                </h2>

                <p>
                  Thống kê theo trạng thái
                </p>

              </div>

            </div>


            <div className="dashboard-status-list">


              {/* TODO */}

              <div className="dashboard-status-row">

                <div className="dashboard-status-label">

                  <span className="dashboard-status-dot todo" />

                  <span>
                    Chưa làm
                  </span>

                </div>


                <div className="dashboard-status-bar">

                  <div
                    className="dashboard-status-fill todo"
                    style={{
                      width:
                        totalTasks === 0
                          ? "0%"
                          : `${(
                              todoTasks /
                              totalTasks
                            ) * 100}%`,
                    }}
                  />

                </div>


                <strong>
                  {todoTasks}
                </strong>

              </div>


              {/* IN PROGRESS */}

              <div className="dashboard-status-row">

                <div className="dashboard-status-label">

                  <span className="dashboard-status-dot progress" />

                  <span>
                    Đang làm
                  </span>

                </div>


                <div className="dashboard-status-bar">

                  <div
                    className="dashboard-status-fill progress"
                    style={{
                      width:
                        totalTasks === 0
                          ? "0%"
                          : `${(
                              inProgressTasks /
                              totalTasks
                            ) * 100}%`,
                    }}
                  />

                </div>


                <strong>
                  {inProgressTasks}
                </strong>

              </div>


              {/* COMPLETED */}

              <div className="dashboard-status-row">

                <div className="dashboard-status-label">

                  <span className="dashboard-status-dot completed" />

                  <span>
                    Hoàn thành
                  </span>

                </div>


                <div className="dashboard-status-bar">

                  <div
                    className="dashboard-status-fill completed"
                    style={{
                      width:
                        totalTasks === 0
                          ? "0%"
                          : `${(
                              completedTasks /
                              totalTasks
                            ) * 100}%`,
                    }}
                  />

                </div>


                <strong>
                  {completedTasks}
                </strong>

              </div>


            </div>


          </section>


        </div>


      </main>


    </div>

  );

}


export default Dashboard;