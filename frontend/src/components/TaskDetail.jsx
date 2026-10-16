import { useEffect, useState } from "react";

import api from "../services/api";
import { parseApiDate } from "../services/realtime";
import { resolveAvatarUrl } from "../utils/avatar";


/*
 * =========================================================
 * LABEL HELPERS
 * =========================================================
 */

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


/*
 * =========================================================
 * DATE HELPERS
 * =========================================================
 */

function formatDeadline(deadline) {

  if (!deadline) {
    return "Không có deadline";
  }

  return parseApiDate(deadline).toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );

}


function formatActivityTime(datetime) {

  if (!datetime) {
    return "";
  }

  const date = parseApiDate(datetime);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

}


function toDateInputValue(deadline) {

  if (!deadline) {
    return "";
  }

  const date = parseApiDate(deadline);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];

}


/*
 * =========================================================
 * ACTIVITY DISPLAY
 * =========================================================
 */

function getActivityInfo(action) {

  const activities = {

    task_created: {
      icon: "＋",
      text: "đã tạo task",
    },

    assigned: {
      icon: "👤",
      text: "đã giao người phụ trách",
    },

    reassigned: {
      icon: "👤",
      text: "đã thay đổi người phụ trách",
    },

    unassigned: {
      icon: "↩",
      text: "đã bỏ người phụ trách",
    },

    status_changed: {
      icon: "🔄",
      text: "đã thay đổi trạng thái",
    },

    priority_changed: {
      icon: "🚩",
      text: "đã thay đổi ưu tiên",
    },

    deadline_changed: {
      icon: "📅",
      text: "đã thay đổi deadline",
    },

    subtask_added: {
      icon: "＋",
      text: "đã thêm việc cần làm",
    },

    completed: {
      icon: "✓",
      text: "đã hoàn thành",
    },

    uncompleted: {
      icon: "↩",
      text: "đã bỏ hoàn thành",
    },

  };

  return (
    activities[action] || {
      icon: "•",
      text: "đã cập nhật task",
    }
  );

}


/*
 * =========================================================
 * COMPONENT
 * =========================================================
 */

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

  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

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


  /*
   * =======================================================
   * FORM DATA
   * =======================================================
   */

  const [formData, setFormData] = useState({

    title:
      task.title || "",

    description:
      task.description || "",

    assignee_id:
      task.assignee_id
        ? String(task.assignee_id)
        : "",

    status:
      task.status || "todo",

    priority:
      task.priority || "medium",

    deadline:
      toDateInputValue(
        task.deadline
      ),

  });


  /*
   * =======================================================
   * SUPPORTERS
   * =======================================================
   */

  const [supporterIds, setSupporterIds] =
    useState(

      (task.supporters || []).map(
        (supporter) =>
          Number(
            supporter.user_id
          )
      )

    );


  /*
   * =======================================================
   * SYNC TASK FROM PARENT
   * =======================================================
   */

  useEffect(() => {

    setCurrentTask(task);
    setComments([]);
    setCommentDraft("");
    loadComments();
    api.get(`/tasks/${task.id}/attachments`)
      .then((response) => setAttachments(Array.isArray(response.data) ? response.data : []))
      .catch((loadError) => console.error("Load task attachments error:", loadError));


    setFormData({

      title:
        task.title || "",

      description:
        task.description || "",

      assignee_id:
        task.assignee_id
          ? String(
              task.assignee_id
            )
          : "",

      status:
        task.status || "todo",

      priority:
        task.priority || "medium",

      deadline:
        toDateInputValue(
          task.deadline
        ),

    });


    setSupporterIds(

      (task.supporters || []).map(
        (supporter) =>
          Number(
            supporter.user_id
          )
      )

    );

  }, [task]);


  const loadComments = async () => {
    try {
      const response = await api.get(`/tasks/${task.id}/comments`);
      setComments(Array.isArray(response.data) ? response.data : []);
    } catch (loadError) {
      console.error("Load task comments error:", loadError);
    }
  };


  const formatAttachmentSize = (bytes) => {
    if (!Number.isFinite(Number(bytes))) return "";
    const size = Number(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleUploadAttachment = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length || uploadingAttachment) return;
    setUploadingAttachment(true);
    setAttachmentError("");
    try {
      for (const file of selected) {
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File "${file.name}" vượt quá giới hạn 50 MB.`);
        }
        const body = new FormData();
        body.append("file", file);
        const response = await api.post(`/tasks/${task.id}/attachments`, body, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setAttachments((current) => [response.data, ...current]);
      }
    } catch (uploadError) {
      setAttachmentError(uploadError.response?.data?.detail || uploadError.message || "Không thể tải file lên.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const response = await api.get(`/tasks/${task.id}/attachments/${attachment.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.original_name || "attachment";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setAttachmentError(downloadError.response?.data?.detail || "Không thể tải file xuống.");
    }
  };

  const handleDeleteAttachment = async (attachment) => {
    if (!window.confirm(`Xóa file "${attachment.original_name}" khỏi task này?`)) return;
    try {
      await api.delete(`/tasks/${task.id}/attachments/${attachment.id}`);
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
      setAttachmentError("");
    } catch (deleteError) {
      setAttachmentError(deleteError.response?.data?.detail || "Không thể xóa file.");
    }
  };

  const handleAddSubtask = async (event) => {
    event.preventDefault();
    const title = subtaskDraft.trim();
    if (!title || addingSubtask) return;
    try {
      setAddingSubtask(true);
      setError("");
      await api.post(`/tasks/${task.id}/subtasks`, { title });
      setSubtaskDraft("");
      await loadTask();
    } catch (addError) {
      setError(addError.response?.data?.detail || "Không thể thêm việc cần làm.");
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleSubmitComment = async (event) => {
    event.preventDefault();
    const content = commentDraft.trim();
    if (!content || submittingComment) return;
    try {
      setSubmittingComment(true);
      const response = await api.post(`/tasks/${task.id}/comments`, { content });
      setComments((current) => [...current, response.data]);
      setCommentDraft("");
    } catch (commentError) {
      setError(commentError.response?.data?.detail || "Không thể gửi bình luận.");
    } finally {
      setSubmittingComment(false);
    }
  };

  /*
   * =======================================================
   * LOAD TASK DETAIL
   * =======================================================
   */

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

        (
          response.data.supporters ||
          []
        ).map(
          (supporter) =>
            Number(
              supporter.user_id
            )
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


  /*
   * =======================================================
   * SUBTASK CHECK / UNCHECK
   * =======================================================
   */

  const handleQuickStatusChange = async (event) => {
    const status = event.target.value;
    try {
      setError("");
      setSaving(true);
      const response = await api.put(`/tasks/${currentTask.id}`, { status });
      setCurrentTask(response.data);
      if (onUpdated) onUpdated(response.data);
    } catch (statusError) {
      setError(statusError.response?.data?.detail || "Không thể cập nhật trạng thái.");
    } finally {
      setSaving(false);
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


  /*
   * =======================================================
   * FORM CHANGE
   * =======================================================
   */

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


  /*
   * =======================================================
   * START EDIT
   * =======================================================
   */

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


  /*
   * =======================================================
   * CANCEL EDIT
   * =======================================================
   */

  const handleCancelEdit = () => {

    setError("");
    setIsEditing(false);

  };


  /*
   * =======================================================
   * SUPPORTER TOGGLE
   * =======================================================
   */

  const toggleSupporter = (
    userId
  ) => {

    const normalizedId =
      Number(userId);


    /*
     * Người phụ trách chính
     * không được đồng thời là supporter.
     */

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


  /*
   * =======================================================
   * ASSIGNEE CHANGE
   * =======================================================
   */

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


    /*
     * Nếu người phụ trách chính
     * cũng đang là supporter thì remove.
     */

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


  /*
   * =======================================================
   * SAVE EDIT
   * =======================================================
   */

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
       * ---------------------------------------------------
       * 1. UPDATE TASK
       * ---------------------------------------------------
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
       * ---------------------------------------------------
       * 2. GET CURRENT SUPPORTERS
       * ---------------------------------------------------
       */

      const detailResponse =
        await api.get(
          `/tasks/${currentTask.id}`
        );


      const existingSupporterIds =
        (
          detailResponse.data.supporters ||
          []
        ).map(
          (supporter) =>
            Number(
              supporter.user_id
            )
        );


      /*
       * ---------------------------------------------------
       * 3. CALCULATE SUPPORTER CHANGES
       * ---------------------------------------------------
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
       * ---------------------------------------------------
       * 4. ADD SUPPORTERS
       * ---------------------------------------------------
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
       * ---------------------------------------------------
       * 5. REMOVE SUPPORTERS
       * ---------------------------------------------------
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
       * ---------------------------------------------------
       * 6. LOAD FINAL TASK
       * ---------------------------------------------------
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
          finalResponse.data.supporters ||
          []
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


  /*
   * =======================================================
   * DELETE TASK
   * =======================================================
   */

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


  /*
   * =======================================================
   * CALCULATED DATA
   * =======================================================
   */

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
        Number(user.id) ===
        Number(
          currentTask.assignee_id
        )
    );


  const assigneeName =
    assignee?.full_name ||
    assignee?.username ||
    "Chưa phân công";


  const currentSupporterIds =
    (
      currentTask.supporters ||
      []
    ).map(
      (supporter) =>
        Number(
          supporter.user_id
        )
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


  /*
   * ACTIVITY LOG
   */

  const activities =
    currentTask.activities || [];


  /*
   * =======================================================
   * RENDER
   * =======================================================
   */

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


        {/* =================================================
            HEADER
            ================================================= */}

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


        {/* =================================================
            CONTENT
            ================================================= */}

        <div className="task-detail-content">


          {/* ERROR */}

          {error && (

            <div className="dashboard-error">
              {error}
            </div>

          )}


          {/* =================================================
              EDIT MODE
              ================================================= */}

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

                                <span className="supporter-avatar-initial">
                                  {(
                                    user.full_name ||
                                    user.username ||
                                    "U"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>

                                {user.avatar_url && (
                                  <img
                                    className="supporter-avatar-image"
                                    src={resolveAvatarUrl(user.avatar_url)}
                                    alt=""
                                    loading="lazy"
                                    onError={(event) => {
                                      event.currentTarget.style.display = "none";
                                    }}
                                  />
                                )}

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


              {/* STATUS / PRIORITY */}

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

            /* =================================================
               VIEW MODE
               ================================================= */

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


              {/* SUPPORTERS */}

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

                            <span className="supporter-avatar-initial">
                              {(
                                user.full_name ||
                                user.username ||
                                "U"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            {user.avatar_url && (
                              <img
                                className="supporter-avatar-image"
                                src={resolveAvatarUrl(user.avatar_url)}
                                alt=""
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            )}

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
                  {" "}
                  công việc hoàn thành

                </div>

              </div>


              {/* SUBTASKS */}

              <div className="subtasks-section">

                <h3>
                  Việc cần làm
                </h3>

                <form className="subtask-add-form" onSubmit={handleAddSubtask}>
                  <input
                    type="text"
                    value={subtaskDraft}
                    onChange={(event) => setSubtaskDraft(event.target.value)}
                    placeholder="Thêm việc cần làm..."
                    maxLength={200}
                    aria-label="Tên việc cần làm mới"
                  />
                  <button type="submit" disabled={!subtaskDraft.trim() || addingSubtask}>
                    {addingSubtask ? "Đang thêm..." : "+ Thêm việc"}
                  </button>
                </form>

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



          {/* =================================================
              TASK ATTACHMENTS
              ================================================= */}
          <section className="task-comments-section task-attachments-section">
            <div className="task-comments-heading">
              <h3>File đính kèm dự án</h3>
              <span className="task-comments-count">{attachments.length}</span>
            </div>
            <div className="task-attachment-toolbar">
              <label className="task-attachment-upload">
                {uploadingAttachment ? "Đang tải lên..." : "＋ Tải file lên"}
                <input type="file" multiple onChange={handleUploadAttachment} disabled={uploadingAttachment} />
              </label>
              <span className="task-attachment-hint">Tối đa 50 MB/file</span>
            </div>
            {attachmentError && <div className="task-attachment-error" role="alert">{attachmentError}</div>}
            {attachments.length === 0 ? (
              <div className="task-comments-empty">Chưa có file đính kèm. Bạn có thể tải lên tài liệu, hình ảnh, biên bản hoặc file liên quan đến dự án.</div>
            ) : (
              <div className="task-attachment-list">
                {attachments.map((attachment) => (
                  <article className="task-attachment-item" key={attachment.id}>
                    <div className="task-attachment-icon">▤</div>
                    <div className="task-attachment-info">
                      <div className="task-attachment-name" title={attachment.original_name}>{attachment.original_name}</div>
                      <div className="task-attachment-meta">{formatAttachmentSize(attachment.size_bytes)} · {attachment.uploaded_by_name || "Người dùng"} · {formatActivityTime(attachment.created_at)}</div>
                    </div>
                    <button type="button" className="task-attachment-action" onClick={() => handleDownloadAttachment(attachment)}>Tải xuống</button>
                    <button type="button" className="task-attachment-delete" onClick={() => handleDeleteAttachment(attachment)} aria-label={`Xóa ${attachment.original_name}`}>×</button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* =================================================
              TASK COMMENTS
              ================================================= */}
          <section className="task-comments-section">
            <div className="task-comments-heading">
              <h3>Trao đổi / Bình luận</h3>
              <span className="task-comments-count">{comments.length}</span>
            </div>

            {comments.length === 0 ? (
              <div className="task-comments-empty">Chưa có bình luận. Hãy để lại trao đổi đầu tiên cho công việc này.</div>
            ) : (
              <div className="task-comments-list">
                {comments.map((comment) => (
                  <article className="task-comment" key={comment.id}>
                    <div className="task-comment-meta">
                      <span className="task-comment-author">{comment.user_name || users.find((u) => Number(u.id) === Number(comment.user_id))?.full_name || `User #${comment.user_id}`}</span>
                      <time className="task-comment-time">{formatActivityTime(comment.created_at)}</time>
                    </div>
                    <div className="task-comment-content">{comment.content}</div>
                  </article>
                ))}
              </div>
            )}

            <form className="task-comment-form" onSubmit={handleSubmitComment}>
              <textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Viết bình luận hoặc cập nhật tiến độ..."
                maxLength={5000}
                rows={2}
                aria-label="Nội dung bình luận"
              />
              <button type="submit" disabled={!commentDraft.trim() || submittingComment}>
                {submittingComment ? "Đang gửi..." : "Gửi bình luận"}
              </button>
            </form>
          </section>

          {/* =================================================
              ACTIVITY LOG
              ================================================= */}

          <div className="task-activity-section">

            <h3>
              Lịch sử hoạt động
            </h3>


            {activities.length === 0 ? (

              <div className="activity-empty">
                Chưa có hoạt động nào.
              </div>

            ) : (

              <div className="activity-list">

                {[...activities]
                  .sort(
                    (a, b) =>
                      parseApiDate(
                        b.created_at
                      ) -
                      parseApiDate(
                        a.created_at
                      )
                  )
                  .map(
                    (activity) => {

                      /*
                       * FIND USER
                       */

                      const activityUser =
                        users.find(
                          (user) =>
                            Number(
                              user.id
                            ) ===
                            Number(
                              activity.user_id
                            )
                        );


                      /*
                       * FIND SUBTASK
                       */

                      const activitySubtask =
                        currentTask.subtasks?.find(
                          (subtask) =>
                            Number(
                              subtask.id
                            ) ===
                            Number(
                              activity.subtask_id
                            )
                        );


                      /*
                       * USER NAME
                       */

                      const userName =
                        activityUser?.full_name ||
                        activityUser?.username ||
                        `User #${activity.user_id}`;


                      /*
                       * SUBTASK TITLE
                       */

                      const subtaskTitle =
                        activitySubtask?.title ||
                        "công việc";


                      /*
                       * ACTIVITY DISPLAY
                       */

                      const activityInfo =
                        getActivityInfo(
                          activity.action
                        );


                      /*
                       * SUBTASK ACTIVITY
                       */

                      const isSubtaskActivity =
                        activity.action === "completed" ||
                        activity.action === "uncompleted" ||
                        activity.action === "subtask_added";


                      return (

                        <div
                          key={activity.id}
                          className="activity-item"
                        >


                          <div className="activity-icon">

                            {activityInfo.icon}

                          </div>


                          <div className="activity-content">


                            <div className="activity-text">

                              <strong>
                                {userName}
                              </strong>


                              {" "}


                              {activityInfo.text}


                              {isSubtaskActivity && (

                                <>

                                  {" "}

                                  <strong>
                                    "{subtaskTitle}"
                                  </strong>

                                </>

                              )}

                            </div>


                            <div className="activity-time">

                              {formatActivityTime(
                                activity.created_at
                              )}

                            </div>


                          </div>

                        </div>

                      );

                    }
                  )}

              </div>

            )}

          </div>


        </div>


        {/* =================================================
            FOOTER
            ================================================= */}

        <div className="task-detail-footer">

          {!isEditing && (
            <div className="task-status-control">
              <label htmlFor="task-detail-status">Trạng thái</label>
              <select
                id="task-detail-status"
                value={currentTask.status || "todo"}
                onChange={handleQuickStatusChange}
                disabled={saving}
              >
                <option value="todo">Chưa làm</option>
                <option value="in_progress">Đang làm</option>
                <option value="completed">Hoàn thành</option>
              </select>
            </div>
          )}

          <div className="task-detail-footer-actions">
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
                <span>
                  🚫 Hủy
                </span>
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
                <span>
                  ✏️ Chỉnh sửa
                </span>
              </button>


              <button
                className="danger-button"
                onClick={() =>
                  setShowDeleteConfirm(
                    true
                  )
                }
                type="button"
              >
                <span>
                  🗑️ Xóa
                </span>
              </button>


              <button
                className="secondary-button"
                onClick={onClose}
                type="button"
              >
                <span>
                  Đóng
                </span>
              </button>

            </>

          )}
          </div>

        </div>


        {/* =================================================
            DELETE CONFIRMATION
            ================================================= */}

        {showDeleteConfirm && (

          <div
            className="delete-confirm-overlay"
            onClick={() =>
              setShowDeleteConfirm(
                false
              )
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
                    setShowDeleteConfirm(
                      false
                    )
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