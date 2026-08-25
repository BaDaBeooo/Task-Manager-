import { useState } from "react";

function TaskModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [deadline, setDeadline] = useState("");

  const [subtasks, setSubtasks] = useState([
    { title: "" }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const addSubtask = () => {
    setSubtasks([
      ...subtasks,
      { title: "" }
    ]);
  };


  const updateSubtask = (index, value) => {
    const updated = [...subtasks];

    updated[index].title = value;

    setSubtasks(updated);
  };


  const removeSubtask = (index) => {
    if (subtasks.length === 1) {
      return;
    }

    setSubtasks(
      subtasks.filter(
        (_, i) => i !== index
      )
    );
  };


  const handleSubmit = async (event) => {
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


      const token =
        localStorage.getItem(
          "access_token"
        );


      const taskData = {
        title: title.trim(),

        description:
          description.trim() || null,

        assignee_id: null,

        priority,

        deadline:
          deadline
            ? new Date(
                `${deadline}T23:59:59`
              ).toISOString()
            : null,

        subtasks:
          subtasks
            .filter(
              (item) =>
                item.title.trim()
            )
            .map((item) => ({
              title:
                item.title.trim()
            })),
      };


      const response =
        await fetch(
          "http://127.0.0.1:8000/tasks",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                taskData
              ),
          }
        );


      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          data?.detail ||
          "Không thể tạo công việc."
        );
      }


      const createdTask =
        await response.json();


      onCreated(createdTask);

      onClose();

    } catch (error) {
      console.error(
        "Create task error:",
        error
      );

      setError(
        error.message ||
        "Không thể tạo công việc."
      );

    } finally {
      setLoading(false);
    }
  };


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
            onClick={onClose}
            type="button"
          >
            ×
          </button>

        </div>


        {error && (
          <div className="modal-error">
            {error}
          </div>
        )}


        <form
          onSubmit={handleSubmit}
          className="task-form"
        >

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


          <div className="form-group">

            <label>
              Mô tả
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Mô tả nội dung công việc..."
              rows={4}
            />

          </div>


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
                (subtask, index) => (

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
              disabled={loading}
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