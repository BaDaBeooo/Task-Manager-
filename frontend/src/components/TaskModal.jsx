import { useEffect, useState } from "react";

import api from "../services/api";


function TaskModal({ onClose, onCreated }) {

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [priority, setPriority] =
    useState("medium");

  const [deadline, setDeadline] =
    useState("");

  const [assigneeId, setAssigneeId] =
    useState("");

  const [supporterIds, setSupporterIds] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [loadingUsers, setLoadingUsers] =
    useState(true);

  const [subtasks, setSubtasks] =
    useState([
      {
        title: "",
      },
    ]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  /*
   * LOAD USERS
   */

  useEffect(() => {

    const loadUsers = async () => {

      try {

        setLoadingUsers(true);

        const response =
          await api.get("/users");

        setUsers(
          response.data
        );

      } catch (error) {

        console.error(
          "Load users error:",
          error
        );

        setError(
          "Không thể tải danh sách thành viên."
        );

      } finally {

        setLoadingUsers(false);

      }

    };

    loadUsers();

  }, []);


  /*
   * CHANGE ASSIGNEE
   *
   * Nếu một user đang là supporter
   * mà được chọn làm assignee chính
   * thì tự động bỏ khỏi supporter.
   */

  const handleAssigneeChange = (
    event
  ) => {

    const value =
      event.target.value;

    setAssigneeId(value);

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
   * TOGGLE SUPPORTER
   */

  const toggleSupporter = (
    userId
  ) => {

    const normalizedId =
      Number(userId);


    if (
      assigneeId &&
      Number(assigneeId) ===
        normalizedId
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
   * ADD SUBTASK
   */

  const addSubtask = () => {

    setSubtasks([
      ...subtasks,
      {
        title: "",
      },
    ]);

  };


  /*
   * UPDATE SUBTASK
   */

  const updateSubtask = (
    index,
    value
  ) => {

    const updated = [
      ...subtasks,
    ];

    updated[index].title =
      value;

    setSubtasks(updated);

  };


  /*
   * REMOVE SUBTASK
   */

  const removeSubtask = (
    index
  ) => {

    if (
      subtasks.length === 1
    ) {

      return;

    }


    setSubtasks(
      subtasks.filter(
        (_, i) =>
          i !== index
      )
    );

  };


  /*
   * CREATE TASK
   */

  const handleSubmit = async (
    event
  ) => {

    event.preventDefault();


    if (!title.trim()) {

      setError(
        "Vui lòng nhập tên công việc."
      );

      return;

    }


    try {

      setLoading(true);
      setError("");


      /*
       * STEP 1
       * CREATE TASK
       */

      const taskData = {

        title:
          title.trim(),

        description:
          description.trim()
            ? description.trim()
            : null,

        assignee_id:
          assigneeId
            ? Number(assigneeId)
            : null,

        priority,

        deadline:
          deadline
            ? `${deadline}T23:59:59`
            : null,

        subtasks:
          subtasks
            .filter(
              (item) =>
                item.title.trim()
            )
            .map(
              (item) => ({
                title:
                  item.title.trim(),
              })
            ),

      };


      const response =
        await api.post(
          "/tasks",
          taskData
        );


      const createdTask =
        response.data;


      /*
       * STEP 2
       * ADD SUPPORTERS
       */

      if (
        supporterIds.length > 0
      ) {

        await Promise.all(
          supporterIds.map(
            (userId) =>
              api.post(
                `/tasks/${createdTask.id}/supporters/${userId}`
              )
          )
        );

      }


      /*
       * STEP 3
       * LOAD FULL TASK
       *
       * Để response có supporters
       */

      const detailResponse =
        await api.get(
          `/tasks/${createdTask.id}`
        );


      onCreated(
        detailResponse.data
      );


      onClose();


    } catch (error) {

      console.error(
        "Create task error:",
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
        "Không thể tạo công việc."
      );


    } finally {

      setLoading(false);

    }

  };


  /*
   * USERS AVAILABLE AS SUPPORTERS
   *
   * Không cho chọn người đang là
   * assignee chính.
   */

  const supporterUsers =
    users.filter(
      (user) =>
        !assigneeId ||
        Number(user.id) !==
          Number(assigneeId)
    );


  return (

    <div
      className="modal-overlay"

      onMouseDown={(event) => {

        if (
          event.target ===
          event.currentTarget
        ) {

          onClose();

        }

      }}
    >

      <div className="task-modal">


        {/* HEADER */}

        <div className="modal-header">

          <div>

            <h2>
              Tạo công việc
            </h2>

            <p>
              Tạo một công việc mới
              cho nhóm
            </p>

          </div>


          <button
            className="modal-close"
            type="button"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {/* ERROR */}

        {error && (

          <div className="modal-error">
            {error}
          </div>

        )}


        {/* FORM */}

        <form
          className="task-form"
          onSubmit={handleSubmit}
        >


          {/* TITLE */}

          <div className="form-group">

            <label>
              Tên công việc
              <span>*</span>
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="Ví dụ: Chuẩn bị proposal"
              autoFocus
            />

          </div>


          {/* DESCRIPTION */}

          <div className="form-group">

            <label>
              Mô tả
            </label>

            <textarea
              rows={4}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Mô tả nội dung công việc..."
            />

          </div>


          {/* ASSIGNEE */}

          <div className="form-group">

            <label>
              Người phụ trách chính
            </label>

            <select
              value={assigneeId}
              onChange={
                handleAssigneeChange
              }
              disabled={loadingUsers}
            >

              <option value="">
                {loadingUsers
                  ? "Đang tải thành viên..."
                  : "Không giao cho ai"}
              </option>


              {users.map(
                (user) => (

                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.full_name || user.username}{user.position ? ` · ${user.position}` : ""}
                  </option>

                )
              )}

            </select>

          </div>


          {/* SUPPORTERS */}

          <div className="form-group">

            <label>
              Người hỗ trợ
            </label>

            <div className="supporter-picker">

              {loadingUsers ? (

                <div className="supporter-loading">
                  Đang tải thành viên...
                </div>

              ) : supporterUsers.length ===
                0 ? (

                <div className="supporter-empty">
                  Không có thành viên khác.
                </div>

              ) : (

                <div className="supporter-list">

                  {supporterUsers.map(
                    (user) => {

                      const selected =
                        supporterIds.includes(
                          Number(user.id)
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
                              {user.position ||
                                "Chưa cập nhật chức vụ"}
                            </small>

                          </span>

                        </button>

                      );

                    }
                  )}

                </div>

              )}

            </div>


            {supporterIds.length > 0 && (

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

            )}

          </div>


          {/* PRIORITY + DEADLINE */}

          <div className="form-row">


            <div className="form-group">

              <label>
                Ưu tiên
              </label>

              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target.value
                  )
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


            <div className="form-group">

              <label>
                Deadline
              </label>

              <input
                type="date"
                value={deadline}
                onChange={(event) =>
                  setDeadline(
                    event.target.value
                  )
                }
              />

            </div>

          </div>


          {/* SUBTASKS */}

          <div className="subtasks-section">


            <div className="subtasks-header">

              <div>

                <label>
                  Việc cần làm
                </label>

                <p>
                  Chia công việc thành
                  các bước nhỏ
                </p>

              </div>


              <button
                type="button"
                className="add-subtask-button"
                onClick={addSubtask}
              >
                + Thêm việc
              </button>

            </div>


            <div className="subtasks-list">

              {subtasks.map(
                (
                  subtask,
                  index
                ) => (

                  <div
                    className="subtask-row"
                    key={index}
                  >

                    <span>
                      {index + 1}.
                    </span>


                    <input
                      type="text"
                      value={
                        subtask.title
                      }
                      onChange={(event) =>
                        updateSubtask(
                          index,
                          event.target.value
                        )
                      }
                      placeholder={
                        `Việc cần làm ${index + 1}`
                      }
                    />


                    <button
                      type="button"
                      className="remove-subtask"
                      onClick={() =>
                        removeSubtask(
                          index
                        )
                      }
                    >
                      ×
                    </button>

                  </div>

                )
              )}

            </div>

          </div>


          {/* FOOTER */}

          <div className="modal-footer">


            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>


            <button
              type="submit"
              className="submit-task-button"
              disabled={
                loading ||
                loadingUsers
              }
            >

              {loading
                ? "Đang tạo..."
                : "Tạo công việc"}

            </button>

          </div>


        </form>

      </div>

    </div>

  );

}


export default TaskModal;