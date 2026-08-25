import { useEffect, useState } from "react";

import api from "../services/api";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import TaskCard from "../components/TaskCard";
import TaskDetail from "../components/TaskDetail";

import "../Dashboard.css";


function MyTasks() {

  const [user, setUser] = useState(null);

  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedTask, setSelectedTask] =
    useState(null);


  const loadMyTasks = async () => {

    try {

      setLoading(true);
      setError("");


      const [
        userResponse,
        tasksResponse,
      ] = await Promise.all([

        api.get("/auth/me"),

        api.get(
          "/tasks?mine=true"
        ),

      ]);


      setUser(
        userResponse.data
      );

      setTasks(
        tasksResponse.data
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


  const handleLogout = () => {

    localStorage.removeItem(
      "access_token"
    );

    window.location.href = "/";

  };


  const handleTaskClick = (task) => {

    setSelectedTask(task);

  };


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


  const handleCloseDetail = () => {

    setSelectedTask(null);

  };


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


      <Sidebar />


      <main className="dashboard-main">


        <Topbar
          user={user}
          onLogout={handleLogout}
        />


        <div className="dashboard-content">


          {/* TITLE */}

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
                Công việc được giao
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
          onClose={
            handleCloseDetail
          }
          onUpdated={
            handleTaskUpdated
          }
        />

      )}

    </div>
  );
}


export default MyTasks;