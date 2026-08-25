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


function TaskCard({
  task,
  onClick,
}) {

  const completedSubtasks =
    task.subtasks?.filter(
      (subtask) => subtask.completed
    ).length || 0;


  const totalSubtasks =
    task.subtasks?.length || 0;


  return (
    <div
      className="task-card"
      onClick={() => {
        if (onClick) {
          onClick(task);
        }
      }}
      style={{
        cursor: onClick
          ? "pointer"
          : "default",
      }}
    >

      <div className="task-card-main">

        <div className="task-card-title-row">

          <h3>
            {task.title}
          </h3>

          <span
            className={`status-badge status-${task.status}`}
          >
            {getStatusLabel(task.status)}
          </span>

        </div>


        {task.description && (

          <p className="task-description">
            {task.description}
          </p>

        )}


        <div className="task-meta">

          <span>
            🚩 {getPriorityLabel(task.priority)}
          </span>

          <span>
            📅 {formatDeadline(task.deadline)}
          </span>

          {totalSubtasks > 0 && (

            <span>
              ☑ {completedSubtasks}/{totalSubtasks}
            </span>

          )}

        </div>

      </div>


      <div className="task-card-progress">

        <div className="progress-header">

          <span>
            Tiến độ
          </span>

          <strong>
            {task.progress}%
          </strong>

        </div>


        <div className="progress-bar">

          <div
            className="progress-fill"
            style={{
              width: `${task.progress}%`,
            }}
          />

        </div>

      </div>

    </div>
  );
}


export default TaskCard;