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
        "Không thể tải công việc của bạn."
      );


    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadMyTasks();

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

    setSelectedTask(task);

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

    setSelectedTask(null);

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


    setSelectedTask(null);

  };


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
                Việc của tôi
              </h1>

              <p>
                Các công việc được giao
                cho bạn.
              </p>

            </div>

          </div>


          {/* ERROR */}

          {error && (

            <div className="dashboard-error">
              {error}
            </div>

          )}


          {/* STATS */}

          <div className="stats-grid">


            {/* TOTAL */}

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
                Công việc được giao
              </div>

            </div>


            {/* TODO */}

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
                Công việc đang chờ
              </div>

            </div>


            {/* IN PROGRESS */}

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
                Công việc đang thực hiện
              </div>

            </div>


            {/* COMPLETED */}

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
                Công việc hoàn tất
              </div>

            </div>


          </div>


          {/* TASKS */}

          <section className="tasks-section">


            <div className="section-header">

              <div>

                <h2>
                  Công việc được giao
                </h2>

                <p>
                  Danh sách công việc
                  bạn cần thực hiện
                </p>

              </div>

            </div>


            {tasks.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  🎉
                </div>

                <h3>
                  Bạn chưa có công việc
                </h3>

                <p>
                  Hiện tại chưa có task
                  nào được giao cho bạn.
                </p>

              </div>

            ) : (

              <div className="task-list">

                {tasks.map(
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


      {/* TASK DETAIL */}

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