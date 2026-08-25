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


function toDateInputValue(deadline) {
  if (!deadline) {
    return "";
  }

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}


function TaskDetail({
  task,
  users = [],
  onClose,
  onUpdated,
  onDeleted,
}) {

  const [currentTask, setCurrentTask] =
    useState(task);

  const [loading, setLoading] =
    useState(false);

  const [updatingSubtask, setUpdatingSubtask] =
    useState(null);

  const [error, setError] =
    useState("");

  const [isEditing, setIsEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);


  const [formData, setFormData] = useState({
    title: task.title || "",
    description: task.description || "",
    assignee_id: task.assignee_id
      ? String(task.assignee_id)
      : "",
    status: task.status || "todo",
    priority: task.priority || "medium",
    deadline: toDateInputValue(
      task.deadline
    ),
  });


  const [supporterIds, setSupporterIds] =
    useState(
      (task.supporters || []).map(
        (supporter) =>
          Number(supporter.user_id)
      )
    );


  useEffect(() => {

    setCurrentTask(task);

    setFormData({
      title: task.title || "",
      description: task.description || "",
      assignee_id: task.assignee_id
        ? String(task.assignee_id)
        : "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      deadline: toDateInputValue(
        task.deadline
      ),
    });


    setSupporterIds(
      (task.supporters || []).map(
        (supporter) =>
          Number(supporter.user_id)
      )
    );

  }, [task]);


  const loadTask = async () => {

    try {

      setLoading(true);
      setError("");


      const response =
        await api.get(
          `/tasks/${task.id}`
        );


      setCurrentTask(
        response.data
      );


      setSupporterIds(
        (response.data.supporters || []).map(
          (supporter) =>
            Number(supporter.user_id)
        )
      );


      if (onUpdated) {
        onUpdated(
          response.data
        );
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

      setUpdatingSubtask(
        subtask.id
      );

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


  const handleFormChange = (
    event
  ) => {

    const {
      name,
      value,
    } = event.target;


    setFormData(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

  };


  const handleStartEdit = () => {

    setError("");


    setFormData({
      title:
        currentTask.title || "",

      description:
        currentTask.description || "",

      assignee_id:
        currentTask.assignee_id
          ? String(
              currentTask.assignee_id
            )
          : "",

      status:
        currentTask.status || "todo",

      priority:
        currentTask.priority || "medium",

      deadline:
        toDateInputValue(
          currentTask.deadline
        ),
    });


    setSupporterIds(
      (currentTask.supporters || []).map(
        (supporter) =>
          Number(
            supporter.user_id
          )
      )
    );


    setIsEditing(true);

  };


  const handleCancelEdit = () => {

    setError("");

    setIsEditing(false);

  };


  const toggleSupporter = (
    userId
  ) => {

    const normalizedId =
      Number(userId);


    if (
      formData.assignee_id &&
      Number(
        formData.assignee_id
      ) === normalizedId
    ) {

      return;

    }


    setSupporterIds(
      (currentIds) => {

        if (
          currentIds.includes(
            normalizedId
          )
        ) {

          return currentIds.filter(
            (id) =>
              id !== normalizedId
          );

        }


        return [
          ...currentIds,
          normalizedId,
        ];

      }
    );

  };


  const handleAssigneeChange = (
    event
  ) => {

    const value =
      event.target.value;


    setFormData(
      (current) => ({
        ...current,
        assignee_id: value,
      })
    );


    if (!value) {
      return;
    }


    setSupporterIds(
      (currentIds) =>
        currentIds.filter(
          (id) =>
            String(id) !==
            String(value)
        )
    );

  };


  const handleSaveEdit = async () => {

    if (!formData.title.trim()) {

      setError(
        "Tên công việc không được để trống."
      );

      return;

    }


    try {

      setSaving(true);
      setError("");


      /*
       * 1. UPDATE TASK
       */

      const payload = {

        title:
          formData.title.trim(),

        description:
          formData.description.trim() ||
          null,

        assignee_id:
          formData.assignee_id
            ? Number(
                formData.assignee_id
              )
            : null,

        status:
          formData.status,

        priority:
          formData.priority,

        deadline:
          formData.deadline
            ? `${formData.deadline}T23:59:59`
            : null,

      };


      await api.put(
        `/tasks/${currentTask.id}`,
        payload
      );


      /*
       * 2. GET CURRENT SUPPORTERS
       */

      const detailResponse =
        await api.get(
          `/tasks/${currentTask.id}`
        );


      const existingSupporterIds =
        (
          detailResponse.data
            .supporters || []
        ).map(
          (supporter) =>
            Number(
              supporter.user_id
            )
        );


      /*
       * 3. CALCULATE CHANGES
       */

      const supportersToAdd =
        supporterIds.filter(
          (userId) =>
            !existingSupporterIds.includes(
              userId
            )
        );


      const supportersToRemove =
        existingSupporterIds.filter(
          (userId) =>
            !supporterIds.includes(
              userId
            )
        );


      /*
       * 4. ADD NEW SUPPORTERS
       */

      if (
        supportersToAdd.length > 0
      ) {

        await Promise.all(
          supportersToAdd.map(
            (userId) =>
              api.post(
                `/tasks/${currentTask.id}/supporters/${userId}`
              )
          )
        );

      }


      /*
       * 5. REMOVE OLD SUPPORTERS
       */

      if (
        supportersToRemove.length > 0
      ) {

        await Promise.all(
          supportersToRemove.map(
            (userId) =>
              api.delete(
                `/tasks/${currentTask.id}/supporters/${userId}`
              )
          )
        );

      }


      /*
       * 6. LOAD FINAL TASK
       */

      const finalResponse =
        await api.get(
          `/tasks/${currentTask.id}`
        );


      setCurrentTask(
        finalResponse.data
      );


      setSupporterIds(
        (
          finalResponse.data
            .supporters || []
        ).map(
          (supporter) =>
            Number(
              supporter.user_id
            )
        )
      );


      setIsEditing(false);


      if (onUpdated) {

        onUpdated(
          finalResponse.data
        );

      }


    } catch (error) {

      console.error(
        "Update task error:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể cập nhật công việc."
      );


    } finally {

      setSaving(false);

    }

  };


  const handleDelete = async () => {

    try {

      setDeleting(true);
      setError("");


      await api.delete(
        `/tasks/${currentTask.id}`
      );


      if (onDeleted) {

        onDeleted(
          currentTask.id
        );

      } else {

        onClose();

      }


    } catch (error) {

      console.error(
        "Delete task error:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể xóa công việc."
      );


      setDeleting(false);

    }

  };


  const completedSubtasks =
    currentTask.subtasks?.filter(
      (subtask) =>
        subtask.completed
    ).length || 0;


  const totalSubtasks =
    currentTask.subtasks?.length || 0;


  const assignee =
    users.find(
      (user) =>
        user.id ===
        currentTask.assignee_id
    );


  const assigneeName =
    assignee?.full_name ||
    assignee?.username ||
    "Chưa phân công";


  const currentSupporterIds =
    (currentTask.supporters || []).map(
      (supporter) =>
        Number(supporter.user_id)
    );


  const currentSupporters =
    users.filter(
      (user) =>
        currentSupporterIds.includes(
          Number(user.id)
        )
    );


  const availableSupporters =
    users.filter(
      (user) =>
        !formData.assignee_id ||
        Number(user.id) !==
          Number(
            formData.assignee_id
          )
    );


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

            {!isEditing ? (

              <>
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
              </>

            ) : (

              <>
                <h2>
                  Chỉnh sửa công việc
                </h2>

                <span className="status-badge">
                  Đang chỉnh sửa
                </span>
              </>

            )}

          </div>


          <button
            className="task-detail-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>

        </div>


        {/* CONTENT */}

        <div className="task-detail-content">


          {error && (

            <div className="dashboard-error">
              {error}
            </div>

          )}


          {isEditing ? (

            <div className="task-edit-form">


              {/* TITLE */}

              <div className="task-form-group">

                <label>
                  Tên công việc
                </label>

                <input
                  type="text"
                  name="title"
                  value={
                    formData.title
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="Tên công việc"
                />

              </div>


              {/* DESCRIPTION */}

              <div className="task-form-group">

                <label>
                  Mô tả
                </label>

                <textarea
                  name="description"
                  value={
                    formData.description
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="Mô tả công việc"
                  rows="4"
                />

              </div>


              {/* ASSIGNEE */}

              <div className="task-form-group">

                <label>
                  Người phụ trách chính
                </label>

                <select
                  name="assignee_id"
                  value={
                    formData.assignee_id
                  }
                  onChange={
                    handleAssigneeChange
                  }
                >

                  <option value="">
                    Chưa phân công
                  </option>


                  {users.map(
                    (user) => (

                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.full_name ||
                          user.username}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* SUPPORTERS */}

              <div className="task-form-group">

                <label>
                  Người hỗ trợ
                </label>


                <div className="supporter-picker">

                  <div className="supporter-list">

                    {availableSupporters.length ===
                    0 ? (

                      <div className="supporter-empty">
                        Không có thành viên khác.
                      </div>

                    ) : (

                      availableSupporters.map(
                        (user) => {

                          const selected =
                            supporterIds.includes(
                              Number(
                                user.id
                              )
                            );


                          return (

                            <button
                              key={user.id}
                              type="button"
                              className={`supporter-option ${
                                selected
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() =>
                                toggleSupporter(
                                  user.id
                                )
                              }
                            >

                              <span className="supporter-checkbox">

                                {selected
                                  ? "✓"
                                  : ""}

                              </span>


                              <span className="supporter-avatar">

                                {(
                                  user.full_name ||
                                  user.username ||
                                  "U"
                                )
                                  .charAt(0)
                                  .toUpperCase()}

                              </span>


                              <span className="supporter-info">

                                <strong>
                                  {user.full_name ||
                                    user.username}
                                </strong>

                                <small>
                                  {user.role ||
                                    "member"}
                                </small>

                              </span>

                            </button>

                          );

                        }
                      )

                    )}

                  </div>

                </div>


                <div className="selected-supporters">

                  <span>
                    Đã chọn:
                  </span>

                  <strong>
                    {supporterIds.length}
                    {" "}
                    người hỗ trợ
                  </strong>

                </div>

              </div>


              {/* OTHER FIELDS */}

              <div className="task-edit-grid">


                <div className="task-form-group">

                  <label>
                    Trạng thái
                  </label>

                  <select
                    name="status"
                    value={
                      formData.status
                    }
                    onChange={
                      handleFormChange
                    }
                  >

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

                </div>


                <div className="task-form-group">

                  <label>
                    Ưu tiên
                  </label>

                  <select
                    name="priority"
                    value={
                      formData.priority
                    }
                    onChange={
                      handleFormChange
                    }
                  >

                    <option value="low">
                      Thấp
                    </option>

                    <option value="medium">
                      Trung bình
                    </option>

                    <option value="high">
                      Cao
                    </option>

                  </select>

                </div>


                <div className="task-form-group">

                  <label>
                    Deadline
                  </label>

                  <input
                    type="date"
                    name="deadline"
                    value={
                      formData.deadline
                    }
                    onChange={
                      handleFormChange
                    }
                  />

                </div>

              </div>


            </div>

          ) : (

            <>


              {/* DESCRIPTION */}

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
                    👤 Người phụ trách
                  </span>

                  <strong>
                    {assigneeName}
                  </strong>

                </div>


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


                <div>

                  <span>
                    📊 Trạng thái
                  </span>

                  <strong>
                    {getStatusLabel(
                      currentTask.status
                    )}
                  </strong>

                </div>

              </div>


              {/* SUPPORTERS VIEW */}

              <div className="task-detail-supporters">

                <h3>
                  Người hỗ trợ
                </h3>


                {currentSupporters.length ===
                0 ? (

                  <div className="supporter-empty">
                    Chưa có người hỗ trợ.
                  </div>

                ) : (

                  <div className="task-detail-supporter-list">

                    {currentSupporters.map(
                      (user) => (

                        <div
                          key={user.id}
                          className="task-detail-supporter"
                        >

                          <span className="supporter-avatar">

                            {(
                              user.full_name ||
                              user.username ||
                              "U"
                            )
                              .charAt(0)
                              .toUpperCase()}

                          </span>


                          <div className="supporter-info">

                            <strong>
                              {user.full_name ||
                                user.username}
                            </strong>

                            <small>
                              {user.role ||
                                "member"}
                            </small>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

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
                      width: `${
                        currentTask.progress || 0
                      }%`,
                    }}
                  />

                </div>


                <div className="subtask-count">
                  {completedSubtasks}/
                  {totalSubtasks}
                  {" "}công việc hoàn thành
                </div>

              </div>


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
                      Công việc này chưa có
                      subtask.
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


            </>

          )}

        </div>


        {/* FOOTER */}

        <div className="task-detail-footer">


          {isEditing ? (

            <>

              <button
                className="secondary-button"
                onClick={
                  handleCancelEdit
                }
                disabled={saving}
                type="button"
              >
                <span>🚫 Hủy</span>
              </button>


              <button
                className="primary-button"
                onClick={
                  handleSaveEdit
                }
                disabled={saving}
                type="button"
              >
                {saving
                  ? "Đang lưu..."
                  : "Lưu thay đổi"}
              </button>

            </>

          ) : (

            <>

              <button
                className="secondary-button"
                onClick={
                  handleStartEdit
                }
                type="button"
              >
                <span>✏️ Chỉnh sửa</span>
              </button>


              <button
                className="danger-button"
                onClick={() =>
                  setShowDeleteConfirm(true)
                }
                type="button"
              >
                <span>🗑️ Xóa</span>
              </button>


              <button
                className="secondary-button"
                onClick={onClose}
                type="button"
              >
                <span>Đóng</span>
              </button>

            </>

          )}

        </div>


        {/* DELETE CONFIRMATION */}

        {showDeleteConfirm && (

          <div
            className="delete-confirm-overlay"
            onClick={() =>
              setShowDeleteConfirm(false)
            }
          >

            <div
              className="delete-confirm-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="delete-confirm-icon">
                🗑️
              </div>

              <h3>
                Xóa công việc?
              </h3>

              <p>
                Bạn có chắc chắn muốn xóa
                <strong>
                  {" "}
                  {currentTask.title}
                </strong>
                ?
              </p>

              <p>
                Hành động này không thể hoàn tác.
              </p>


              <div className="delete-confirm-actions">

                <button
                  className="secondary-button"
                  onClick={() =>
                    setShowDeleteConfirm(false)
                  }
                  disabled={deleting}
                  type="button"
                >
                  Hủy
                </button>


                <button
                  className="danger-button"
                  onClick={handleDelete}
                  disabled={deleting}
                  type="button"
                >
                  {deleting
                    ? "Đang xóa..."
                    : "Xóa công việc"}
                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}


export default TaskDetail;