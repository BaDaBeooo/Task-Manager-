import { useEffect, useState } from "react";
import api from "../services/api";

function getStatusLabel(status) {
  const labels = {
    todo: "Chưa làm",
    in_progress: "Đang làm",
    completed: "Hoàn thành",
  };

  return labels[status] || status;
}

function getPriorityLabel(priority) {
  const labels = {
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
  };

  return labels[priority] || priority;
}

function formatDeadline(deadline) {
  if (!deadline) {
    return "Không có deadline";
  }

  return new Date(deadline).toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function TaskDetail({ task, onClose, onUpdated }) {
  const [currentTask, setCurrentTask] = useState(task);

  const [loading, setLoading] = useState(false);

  const [updatingSubtask, setUpdatingSubtask] =
    useState(null);

  const [error, setError] = useState("");

  useEffect(() => {
    setCurrentTask(task);
  }, [task]);


  const loadTask = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/tasks/${task.id}`
      );

      setCurrentTask(response.data);

      if (onUpdated) {
        onUpdated(response.data);
      }

    } catch (error) {
      console.error(
        "Load task detail error:",
        error
      );

      setError(
        "Không thể tải chi tiết công việc."
      );

    } finally {
      setLoading(false);
    }
  };


  const handleSubtaskChange = async (
    subtask,
    checked
  ) => {
    try {
      setUpdatingSubtask(subtask.id);
      setError("");

      await api.patch(
        `/tasks/${currentTask.id}/subtasks/${subtask.id}`,
        {
          completed: checked,
        }
      );

      await loadTask();

    } catch (error) {
      console.error(
        "Update subtask error:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Không thể cập nhật công việc."
      );

    } finally {
      setUpdatingSubtask(null);
    }
  };


  const completedSubtasks =
    currentTask.subtasks?.filter(
      (subtask) => subtask.completed
    ).length || 0;

  const totalSubtasks =
    currentTask.subtasks?.length || 0;


  return (
    <div
      className="task-detail-overlay"
      onClick={onClose}
    >

      <div
        className="task-detail-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="task-detail-header">

          <div>

            <h2>
              {currentTask.title}
            </h2>

            <span
              className={`status-badge status-${currentTask.status}`}
            >
              {getStatusLabel(
                currentTask.status
              )}
            </span>

          </div>

          <button
            className="task-detail-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {/* CONTENT */}

        <div className="task-detail-content">

          {currentTask.description && (

            <div className="task-detail-description">

              <h3>
                Mô tả
              </h3>

              <p>
                {currentTask.description}
              </p>

            </div>

          )}


          {/* META */}

          <div className="task-detail-meta">

            <div>
              <span>
                🚩 Ưu tiên
              </span>

              <strong>
                {getPriorityLabel(
                  currentTask.priority
                )}
              </strong>
            </div>


            <div>
              <span>
                📅 Deadline
              </span>

              <strong>
                {formatDeadline(
                  currentTask.deadline
                )}
              </strong>
            </div>

          </div>


          {/* PROGRESS */}

          <div className="task-detail-progress">

            <div className="task-detail-progress-header">

              <span>
                Tiến độ
              </span>

              <strong>
                {currentTask.progress || 0}%
              </strong>

            </div>

            <div className="progress-bar">

              <div
                className="progress-fill"
                style={{
                  width: `${currentTask.progress || 0}%`,
                }}
              />

            </div>

            <div className="subtask-count">
              {completedSubtasks}/{totalSubtasks} công việc hoàn thành
            </div>

          </div>


          {/* ERROR */}

          {error && (

            <div className="dashboard-error">
              {error}
            </div>

          )}


          {/* SUBTASKS */}

          <div className="subtasks-section">

            <h3>
              Việc cần làm
            </h3>


            {loading ? (

              <div className="subtasks-loading">
                Đang cập nhật...
              </div>

            ) : totalSubtasks === 0 ? (

              <div className="empty-state">
                <p>
                  Công việc này chưa có subtask.
                </p>
              </div>

            ) : (

              <div className="subtask-list">

                {currentTask.subtasks.map(
                  (subtask) => (

                    <label
                      key={subtask.id}
                      className={`subtask-item ${
                        subtask.completed
                          ? "completed"
                          : ""
                      }`}
                    >

                      <input
                        type="checkbox"
                        checked={
                          Boolean(
                            subtask.completed
                          )
                        }
                        disabled={
                          updatingSubtask ===
                          subtask.id
                        }
                        onChange={(event) =>
                          handleSubtaskChange(
                            subtask,
                            event.target.checked
                          )
                        }
                      />

                      <span className="subtask-title">
                        {subtask.title}
                      </span>

                    </label>

                  )
                )}

              </div>

            )}

          </div>

        </div>


        {/* FOOTER */}

        <div className="task-detail-footer">

          <button
            className="secondary-button"
            onClick={onClose}
          >
            Đóng
          </button>

        </div>

      </div>

    </div>
  );
}

export default TaskDetail;