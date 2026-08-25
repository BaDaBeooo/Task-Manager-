import UserAvatar from "./UserAvatar";


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
  users = [],
  onClick,
}) {

  const completedSubtasks =
    task.subtasks?.filter(
      (subtask) =>
        subtask.completed
    ).length || 0;


  const totalSubtasks =
    task.subtasks?.length || 0;


  // =====================================================
  // ASSIGNEE
  // =====================================================

  const assignee =
    users.find(
      (user) =>
        user.id === task.assignee_id
    );


  // =====================================================
  // SUPPORTERS
  // =====================================================

  const supporters =
    task.supporters || [];


  const visibleSupporters =
    supporters.slice(0, 3);


  const remainingSupporters =
    Math.max(
      supporters.length - 3,
      0
    );


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


        {/* TITLE */}

        <div className="task-card-title-row">

          <h3>
            {task.title}
          </h3>


          <span
            className={`status-badge status-${task.status}`}
          >
            {getStatusLabel(
              task.status
            )}
          </span>

        </div>


        {/* DESCRIPTION */}

        {task.description && (

          <p className="task-description">

            {task.description}

          </p>

        )}


        {/* META */}

        <div className="task-meta">

          <span>
            🚩{" "}
            {getPriorityLabel(
              task.priority
            )}
          </span>


          <span>
            📅{" "}
            {formatDeadline(
              task.deadline
            )}
          </span>


          {totalSubtasks > 0 && (

            <span>
              ☑{" "}
              {completedSubtasks}/
              {totalSubtasks}
            </span>

          )}

        </div>


        {/* ASSIGNEE */}

        {assignee && (

          <div className="task-card-assignee">

            <UserAvatar
              user={assignee}
              size="small"
            />

          </div>

        )}


        {/* SUPPORTERS */}

        {supporters.length > 0 && (

          <div className="task-card-team">

            <span className="task-card-team-label">
              Người hỗ trợ
            </span>


            <div className="task-card-supporters">

              {visibleSupporters.map(
                (supporter) => {

                  const supporterUser =
                    users.find(
                      (user) =>
                        user.id ===
                        supporter.user_id
                    );


                  if (!supporterUser) {
                    return null;
                  }


                  return (

                    <div
                      key={
                        supporter.id
                      }
                      className="task-card-supporter"
                    >

                      <UserAvatar
                        user={
                          supporterUser
                        }
                        size="small"
                      />

                    </div>

                  );

                }
              )}


              {remainingSupporters > 0 && (

                <div className="task-card-avatar-more">

                  +{remainingSupporters}

                </div>

              )}

            </div>

          </div>

        )}

      </div>


      {/* PROGRESS */}

      <div className="task-card-progress">

        <div className="progress-header">

          <span>
            Tiến độ
          </span>


          <strong>
            {task.progress || 0}%
          </strong>

        </div>


        <div className="progress-bar">

          <div
            className="progress-fill"
            style={{
              width: `${
                task.progress || 0
              }%`,
            }}
          />

        </div>

      </div>

    </div>

  );

}


export default TaskCard;