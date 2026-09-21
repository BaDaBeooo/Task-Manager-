import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";
import { parseApiDate } from "../services/realtime";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import "../Dashboard.css";
import "../Support.css";


const STATUS_LABELS = {
  open: "Mở",
  assigned: "Đã phân công",
  in_progress: "Đang xử lý",
  waiting: "Chờ phản hồi",
  resolved: "Đã xử lý",
  closed: "Đã đóng",
};


const PRIORITY_LABELS = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp",
};


const CATEGORY_LABELS = {
  technical: "Kỹ thuật",
  software: "Phần mềm",
  hardware: "Phần cứng",
  network: "Mạng",
  account: "Tài khoản",
  other: "Khác",
};


function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = parseApiDate(value);

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


function getStatusLabel(status) {
  return (
    STATUS_LABELS[status] ||
    status ||
    "Không xác định"
  );
}


function getPriorityLabel(priority) {
  return (
    PRIORITY_LABELS[priority] ||
    priority ||
    "Không xác định"
  );
}


function getCategoryLabel(category) {
  return (
    CATEGORY_LABELS[category] ||
    category ||
    "Không xác định"
  );
}


function getUserName(user) {
  return (
    user?.full_name ||
    user?.username ||
    "Chưa xác định"
  );
}


function getInitials(user) {
  const name =
    getUserName(user);

  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((item) =>
      item
        .charAt(0)
        .toUpperCase()
    )
    .join("");
}


function getRoleCode(user) {
  if (!user?.role) {
    return "";
  }

  if (
    typeof user.role ===
    "string"
  ) {
    return user.role
      .toLowerCase()
      .trim();
  }

  return (
    user.role.code ||
    user.role.name ||
    ""
  )
    .toLowerCase()
    .trim();
}


function Support() {

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);


  const [
    tickets,
    setTickets,
  ] = useState([]);


  const [
    users,
    setUsers,
  ] = useState([]);


  const [
    selectedTicket,
    setSelectedTicket,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    assigning,
    setAssigning,
  ] = useState(false);


  const [
    changingStatus,
    setChangingStatus,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");


  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("all");


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);


  const [
    createData,
    setCreateData,
  ] = useState({
    title: "",
    description: "",
    category: "other",
    priority: "medium",
  });


  const [
    comment,
    setComment,
  ] = useState("");


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
  // LOAD CURRENT USER
  // =====================================================

  const loadCurrentUser =
    async () => {

      try {

        const response =
          await api.get(
            "/auth/me"
          );

        setCurrentUser(
          response.data
        );

        return response.data;

      } catch (error) {

        console.error(
          "Load current user error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {

          localStorage.removeItem(
            "access_token"
          );

          window.location.href =
            "/";

          return null;
        }

        return null;
      }
    };


  // =====================================================
  // LOAD TICKETS
  // =====================================================

  const loadTickets =
    async () => {

      try {

        const response =
          await api.get(
            "/support/tickets"
          );

        const data =
          Array.isArray(
            response.data
          )
            ? response.data
            : [];

        setTickets(data);

        return true;

      } catch (error) {

        console.error(
          "Load support tickets error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {

          localStorage.removeItem(
            "access_token"
          );

          window.location.href =
            "/";

          return false;
        }

        setError(
          error.response?.data?.detail ||
          "Không thể tải yêu cầu hỗ trợ."
        );

        return false;
      }
    };


  // =====================================================
  // LOAD USERS
  //
  // IMPORTANT:
  // Users lỗi KHÔNG làm chết trang Support.
  // =====================================================

  const loadUsers =
    async () => {

      try {

        const response =
          await api.get(
            "/users"
          );

        const data =
          Array.isArray(
            response.data
          )
            ? response.data
            : [];

        setUsers(data);

      } catch (error) {

        console.warn(
          "Load support users failed:",
          error
        );

        /*
         * Không set error ở đây.
         *
         * Support vẫn phải hiển thị
         * ticket bình thường.
         */

        setUsers([]);
      }
    };


  // =====================================================
  // LOAD ALL DATA
  // =====================================================

  const loadData =
    async () => {

      setLoading(true);
      setError("");

      /*
       * Không dùng Promise.all().
       *
       * Mỗi API được xử lý độc lập.
       */

      await Promise.all([
        loadCurrentUser(),
        loadTickets(),
        loadUsers(),
      ]);

      setLoading(false);
    };


  useEffect(() => {

    loadData();

  }, []);

  // Realtime support changes: refresh the ticket list immediately.
  useEffect(() => {
    const handleRealtime = async (event) => {
      const data = event.detail;
      if (data?.type !== "data_changed" || data.entity !== "support_ticket") return;

      await loadTickets();

      if (selectedTicket?.id && data.ticket_id === selectedTicket.id) {
        try {
          const response = await api.get(`/support/tickets/${selectedTicket.id}`);
          setSelectedTicket(response.data);
        } catch (error) {
          console.warn("Realtime selected ticket refresh failed:", error);
        }
      }
    };

    window.addEventListener("taskmanager:realtime", handleRealtime);
    return () => window.removeEventListener("taskmanager:realtime", handleRealtime);
  }, [selectedTicket?.id]);


  // =====================================================
  // LOAD TICKET DETAIL
  // =====================================================

  const loadTicketDetail =
    async (ticketId) => {

      try {

        setDetailLoading(true);
        setError("");

        const response =
          await api.get(
            `/support/tickets/${ticketId}`
          );

        setSelectedTicket(
          response.data
        );

        return response.data;

      } catch (error) {

        console.error(
          "Support detail error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {

          localStorage.removeItem(
            "access_token"
          );

          window.location.href =
            "/";

          return;
        }

        setError(
          error.response?.data?.detail ||
          "Không thể tải chi tiết yêu cầu."
        );

        return null;

      } finally {

        setDetailLoading(false);
      }
    };


  // =====================================================
  // OPEN TICKET
  // =====================================================

  const handleOpenTicket =
    async (ticket) => {

      setError("");

      const detail = await loadTicketDetail(ticket.id);
      if (!detail || detail.assignee_id) {
        return;
      }

      // First eligible support agent who opens an unassigned ticket claims it.
      try {
        const response = await api.put(
          `/support/tickets/${ticket.id}/claim`
        );

        setSelectedTicket(response.data);
        setTickets((currentTickets) =>
          currentTickets.map((item) =>
            item.id === response.data.id ? response.data : item
          )
        );
      } catch (error) {
        // Users who can view but cannot claim can still read the ticket.
        console.info(
          "Ticket auto-claim skipped:",
          error.response?.data?.detail || error.message
        );
      }
    };


  // =====================================================
  // CLOSE DETAIL
  // =====================================================

  const handleCloseDetail =
    () => {

      if (
        saving ||
        assigning ||
        changingStatus
      ) {
        return;
      }

      setSelectedTicket(
        null
      );

      setComment("");
      setError("");
    };


  // =====================================================
  // CREATE MODAL
  // =====================================================

  const openCreateModal =
    () => {

      setCreateData({
        title: "",
        description: "",
        category: "other",
        priority: "medium",
      });

      setError("");

      setShowCreateModal(
        true
      );
    };


  const closeCreateModal =
    () => {

      if (saving) {
        return;
      }

      setShowCreateModal(
        false
      );

      setError("");
    };


  // =====================================================
  // CREATE TICKET
  // =====================================================

  const handleCreateTicket =
    async (event) => {

      event.preventDefault();

      if (
        !createData.title.trim()
      ) {

        setError(
          "Vui lòng nhập tiêu đề yêu cầu."
        );

        return;
      }


      if (
        !createData.description.trim()
      ) {

        setError(
          "Vui lòng nhập nội dung yêu cầu."
        );

        return;
      }


      try {

        setSaving(true);
        setError("");

        const response =
          await api.post(
            "/support/tickets",
            {
              title:
                createData.title.trim(),

              description:
                createData.description.trim(),

              category:
                createData.category,

              priority:
                createData.priority,
            }
          );


        setShowCreateModal(
          false
        );


        await loadTickets();


        setSelectedTicket(
          response.data
        );


      } catch (error) {

        console.error(
          "Create support ticket error:",
          error
        );

        if (
          error.response?.status ===
          401
        ) {

          localStorage.removeItem(
            "access_token"
          );

          window.location.href =
            "/";

          return;
        }

        setError(
          error.response?.data?.detail ||
          "Không thể tạo yêu cầu hỗ trợ."
        );

      } finally {

        setSaving(false);
      }
    };


  // =====================================================
  // REFRESH SELECTED TICKET
  // =====================================================

  const updateSelectedTicket =
    async () => {

      if (!selectedTicket) {
        return;
      }


      try {

        const response =
          await api.get(
            `/support/tickets/${selectedTicket.id}`
          );

        setSelectedTicket(
          response.data
        );


        setTickets(
          (currentTickets) =>
            currentTickets.map(
              (ticket) =>
                ticket.id ===
                response.data.id
                  ? response.data
                  : ticket
            )
        );


      } catch (error) {

        console.error(
          "Refresh support ticket error:",
          error
        );
      }
    };


  // =====================================================
  // REALTIME SUPPORT CHAT
  // =====================================================

  useEffect(() => {
    if (!selectedTicket?.id) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    let socket = null;
    let reconnectTimer = null;
    let pingTimer = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;

      socket = new WebSocket(
        `ws://127.0.0.1:8000/ws/support/${selectedTicket.id}?token=${encodeURIComponent(token)}`
      );

      socket.onopen = () => {
        console.log(
          `[Realtime] Support chat connected: ticket ${selectedTicket.id}`
        );

        pingTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send("ping");
          }
        }, 25000);
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "support_ticket_updated") {
            try {
              const response = await api.get(`/support/tickets/${selectedTicket.id}`);
              setSelectedTicket(response.data);
              setTickets((current) =>
                current.map((item) =>
                  item.id === response.data.id ? response.data : item
                )
              );
            } catch (refreshError) {
              console.warn("Realtime ticket update refresh failed:", refreshError);
            }
            return;
          }

          if (data.type !== "support_comment" || !data.comment) {
            return;
          }

          const incoming = data.comment;

          setSelectedTicket((current) => {
            if (!current || current.id !== selectedTicket.id) {
              return current;
            }

            const comments = current.comments || [];

            if (comments.some((item) => item.id === incoming.id)) {
              return current;
            }

            return {
              ...current,
              comments: [...comments, incoming],
              updated_at: incoming.created_at || current.updated_at,
            };
          });
        } catch (error) {
          console.error("Realtime support message parse error:", error);
        }
      };

      socket.onerror = (error) => {
        console.warn("[Realtime] Support chat WebSocket error", error);
      };

      socket.onclose = () => {
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }

        if (!stopped) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      stopped = true;

      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      if (socket) socket.close();
    };
  }, [selectedTicket?.id]);


  // =====================================================
  // ASSIGN
  // =====================================================

  const handleAssign =
    async (event) => {

      if (!selectedTicket) {
        return;
      }


      const value =
        event.target.value;


      try {

        setAssigning(true);
        setError("");

        const response =
          await api.put(
            `/support/tickets/${selectedTicket.id}/assign`,
            {
              assignee_id:
                value
                  ? Number(value)
                  : null,
            }
          );


        setSelectedTicket(
          response.data
        );


        setTickets(
          (currentTickets) =>
            currentTickets.map(
              (ticket) =>
                ticket.id ===
                selectedTicket.id
                  ? response.data
                  : ticket
            )
        );


      } catch (error) {

        console.error(
          "Assign support ticket error:",
          error
        );

        setError(
          error.response?.data?.detail ||
          "Không thể phân công yêu cầu."
        );

      } finally {

        setAssigning(false);
      }
    };


  // =====================================================
  // STATUS
  // =====================================================

  const handleStatusChange =
    async (event) => {

      if (!selectedTicket) {
        return;
      }


      const status =
        event.target.value;


      try {

        setChangingStatus(true);
        setError("");

        const response =
          await api.put(
            `/support/tickets/${selectedTicket.id}/status`,
            {
              status,
            }
          );


        setSelectedTicket(
          response.data
        );


        setTickets(
          (currentTickets) =>
            currentTickets.map(
              (ticket) =>
                ticket.id ===
                selectedTicket.id
                  ? response.data
                  : ticket
            )
        );


      } catch (error) {

        console.error(
          "Support status error:",
          error
        );

        setError(
          error.response?.data?.detail ||
          "Không thể cập nhật trạng thái."
        );

      } finally {

        setChangingStatus(false);
      }
    };


  // =====================================================
  // COMMENT
  // =====================================================

  const handleAddComment =
    async (event) => {

      event.preventDefault();

      if (
        !selectedTicket ||
        !comment.trim()
      ) {
        return;
      }


      try {

        setSaving(true);
        setError("");

        await api.post(
          `/support/tickets/${selectedTicket.id}/comments`,
          {
            content:
              comment.trim(),
          }
        );


        setComment("");

        await updateSelectedTicket();


      } catch (error) {

        console.error(
          "Support comment error:",
          error
        );

        setError(
          error.response?.data?.detail ||
          "Không thể gửi trao đổi."
        );

      } finally {

        setSaving(false);
      }
    };


  // =====================================================
  // FILTER
  // =====================================================

  const filteredTickets =
    useMemo(() => {

      const normalizedSearch =
        search
          .trim()
          .toLowerCase();


      return tickets.filter(
        (ticket) => {

          if (
            statusFilter !==
              "all" &&
            ticket.status !==
              statusFilter
          ) {
            return false;
          }


          if (
            priorityFilter !==
              "all" &&
            ticket.priority !==
              priorityFilter
          ) {
            return false;
          }


          if (
            normalizedSearch
          ) {

            const text = [
              ticket.ticket_code,
              ticket.title,
              ticket.description,
              ticket.category,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();


            if (
              !text.includes(
                normalizedSearch
              )
            ) {
              return false;
            }
          }


          return true;
        }
      );

    }, [
      tickets,
      statusFilter,
      priorityFilter,
      search,
    ]);


  // =====================================================
  // STATS
  // =====================================================

  const totalTickets =
    tickets.length;


  const openTickets =
    tickets.filter(
      (ticket) =>
        ticket.status ===
        "open"
    ).length;


  const inProgressTickets =
    tickets.filter(
      (ticket) =>
        ticket.status ===
          "assigned" ||
        ticket.status ===
          "in_progress" ||
        ticket.status ===
          "waiting"
    ).length;


  const completedTickets =
    tickets.filter(
      (ticket) =>
        ticket.status ===
          "resolved" ||
        ticket.status ===
          "closed"
    ).length;


  // =====================================================
  // ROLE
  // =====================================================

  const currentRole =
    getRoleCode(
      currentUser
    );


  const canAssign =
    currentRole ===
      "admin" ||
    currentRole ===
      "support";


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <div className="dashboard-layout">

        <Sidebar />

        <main className="dashboard-main">

          <Topbar
            user={currentUser}
            onLogout={handleLogout}
            title="Yêu cầu hỗ trợ"
            description="Quản lý và theo dõi các yêu cầu hỗ trợ"
          />


          <div className="dashboard-content">

            <div className="dashboard-loading">

              <div className="loading-spinner" />

              <span>
                Đang tải yêu cầu hỗ trợ...
              </span>

            </div>

          </div>

        </main>

      </div>
    );
  }


  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="dashboard-layout">

      <Sidebar />


      <main className="dashboard-main">

        <Topbar
          user={currentUser}
          onLogout={handleLogout}
          title="Yêu cầu hỗ trợ"
          description="Quản lý và theo dõi các yêu cầu hỗ trợ"
        />


        <div className="dashboard-content support-page">

          {/* HEADER */}

          <div className="welcome-section support-header">

            <div>

              <h1>
                Yêu cầu hỗ trợ
              </h1>

              <p>
                Quản lý và theo dõi các yêu cầu hỗ trợ
              </p>

            </div>


            <button
              className="primary-button"
              type="button"
              onClick={
                openCreateModal
              }
            >
              + Tạo yêu cầu
            </button>

          </div>


          {/* ERROR */}

          {error && (

            <div className="dashboard-error">

              {error}

            </div>

          )}


          {/* STATS */}

          <div className="stats-grid support-stats">

            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-title">
                  Tổng yêu cầu
                </div>

                <div className="stat-card-icon">
                  🎫
                </div>

              </div>

              <div className="stat-card-value">
                {totalTickets}
              </div>

              <div className="stat-card-description">
                Tất cả yêu cầu hỗ trợ
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-title">
                  Đang mở
                </div>

                <div className="stat-card-icon">
                  📥
                </div>

              </div>

              <div className="stat-card-value">
                {openTickets}
              </div>

              <div className="stat-card-description">
                Chưa được xử lý
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-card-top">

                <div className="stat-card-title">
                  Đang xử lý
                </div>

                <div className="stat-card-icon">
                  ⚡
                </div>

              </div>

              <div className="stat-card-value">
                {inProgressTickets}
              </div>

              <div className="stat-card-description">
                Đang được tiếp nhận
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
                {completedTickets}
              </div>

              <div className="stat-card-description">
                Đã xử lý hoặc đóng
              </div>

            </div>

          </div>


          {/* FILTER */}

          <section className="support-section">

            <div className="support-filter-bar">

              <div className="support-search">

                <span>
                  🔎
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Tìm ticket, tiêu đề..."
                />

              </div>


              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  Tất cả trạng thái
                </option>

                <option value="open">
                  Mở
                </option>

                <option value="assigned">
                  Đã phân công
                </option>

                <option value="in_progress">
                  Đang xử lý
                </option>

                <option value="waiting">
                  Chờ phản hồi
                </option>

                <option value="resolved">
                  Đã xử lý
                </option>

                <option value="closed">
                  Đã đóng
                </option>

              </select>


              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  Tất cả ưu tiên
                </option>

                <option value="urgent">
                  Khẩn cấp
                </option>

                <option value="high">
                  Cao
                </option>

                <option value="medium">
                  Trung bình
                </option>

                <option value="low">
                  Thấp
                </option>

              </select>

            </div>


            {/* TICKET LIST */}

            {filteredTickets.length ===
            0 ? (

              <div className="empty-state support-empty">

                <div className="empty-icon">
                  🎫
                </div>

                <h3>
                  Không có yêu cầu hỗ trợ
                </h3>

                <p>
                  {tickets.length === 0
                    ? "Chưa có yêu cầu hỗ trợ nào."
                    : "Chưa có ticket phù hợp với bộ lọc hiện tại."
                  }
                </p>

              </div>

            ) : (

              <div className="support-ticket-list">

                {filteredTickets.map(
                  (ticket) => (

                    <button
                      key={ticket.id}
                      type="button"
                      className="support-ticket-card"
                      onClick={() =>
                        handleOpenTicket(
                          ticket
                        )
                      }
                    >

                      <div className="support-ticket-main">

                        <div className="support-ticket-code">
                          {ticket.ticket_code}
                        </div>

                        <h3>
                          {ticket.title}
                        </h3>

                        <p>
                          {ticket.description}
                        </p>

                      </div>


                      <div className="support-ticket-meta">

                        <span
                          className={`support-status-badge status-${ticket.status}`}
                        >
                          {getStatusLabel(
                            ticket.status
                          )}
                        </span>


                        <span
                          className={`support-priority-badge priority-${ticket.priority}`}
                        >
                          {getPriorityLabel(
                            ticket.priority
                          )}
                        </span>


                        <span className="support-meta-item">

                          {getCategoryLabel(
                            ticket.category
                          )}

                        </span>

                      </div>


                      <div className="support-ticket-footer">

                        <span>
                          👤{" "}
                          {getUserName(
                            ticket.creator
                          )}
                        </span>


                        <span>
                          🛠️{" "}
                          {ticket.assignee
                            ? getUserName(
                                ticket.assignee
                              )
                            : "Chưa phân công"}
                        </span>


                        <span>
                          {formatDate(
                            ticket.created_at
                          )}
                        </span>


                        <strong>
                          Xem →
                        </strong>

                      </div>

                    </button>

                  )
                )}

              </div>

            )}

          </section>

        </div>

      </main>


      {/* =================================================
          CREATE MODAL
      ================================================= */}

      {showCreateModal && (

        <div
          className="support-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateModal();
            }

          }}
        >

          <div className="support-modal">

            <div className="support-modal-header">

              <div>

                <h2>
                  Tạo yêu cầu hỗ trợ
                </h2>

                <p>
                  Gửi yêu cầu đến bộ phận hỗ trợ
                </p>

              </div>


              <button
                type="button"
                className="modal-close"
                onClick={
                  closeCreateModal
                }
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                handleCreateTicket
              }
            >

              <div className="support-form-group">

                <label>
                  Tiêu đề
                </label>

                <input
                  type="text"
                  value={
                    createData.title
                  }
                  onChange={(event) =>
                    setCreateData(
                      (current) => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Ví dụ: Không xem được camera"
                  autoFocus
                />

              </div>


              <div className="support-form-group">

                <label>
                  Nội dung
                </label>

                <textarea
                  value={
                    createData.description
                  }
                  onChange={(event) =>
                    setCreateData(
                      (current) => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Mô tả chi tiết vấn đề..."
                  rows="6"
                />

              </div>


              <div className="support-form-grid">

                <div className="support-form-group">

                  <label>
                    Loại yêu cầu
                  </label>

                  <select
                    value={
                      createData.category
                    }
                    onChange={(event) =>
                      setCreateData(
                        (current) => ({
                          ...current,
                          category:
                            event.target.value,
                        })
                      )
                    }
                  >

                    <option value="technical">
                      Kỹ thuật
                    </option>

                    <option value="software">
                      Phần mềm
                    </option>

                    <option value="hardware">
                      Phần cứng
                    </option>

                    <option value="network">
                      Mạng
                    </option>

                    <option value="account">
                      Tài khoản
                    </option>

                    <option value="other">
                      Khác
                    </option>

                  </select>

                </div>


                <div className="support-form-group">

                  <label>
                    Mức độ ưu tiên
                  </label>

                  <select
                    value={
                      createData.priority
                    }
                    onChange={(event) =>
                      setCreateData(
                        (current) => ({
                          ...current,
                          priority:
                            event.target.value,
                        })
                      )
                    }
                  >

                    <option value="urgent">
                      Khẩn cấp
                    </option>

                    <option value="high">
                      Cao
                    </option>

                    <option value="medium">
                      Trung bình
                    </option>

                    <option value="low">
                      Thấp
                    </option>

                  </select>

                </div>

              </div>


              {error && (

                <div className="support-form-error">
                  {error}
                </div>

              )}


              <div className="support-modal-footer">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeCreateModal
                  }
                  disabled={saving}
                >
                  Hủy
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Đang tạo..."
                    : "Tạo yêu cầu"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =================================================
          DETAIL MODAL
      ================================================= */}

      {selectedTicket && (

        <div
          className="support-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              handleCloseDetail();
            }

          }}
        >

          <div className="support-detail-modal">

            <div className="support-modal-header">

              <div>

                <div className="support-detail-code">
                  {selectedTicket.ticket_code}
                </div>

                <h2>
                  {selectedTicket.title}
                </h2>

                <div className="support-detail-badges">

                  <span
                    className={`support-status-badge status-${selectedTicket.status}`}
                  >
                    {getStatusLabel(
                      selectedTicket.status
                    )}
                  </span>


                  <span
                    className={`support-priority-badge priority-${selectedTicket.priority}`}
                  >
                    {getPriorityLabel(
                      selectedTicket.priority
                    )}
                  </span>

                </div>

              </div>


              <button
                type="button"
                className="modal-close"
                onClick={
                  handleCloseDetail
                }
              >
                ×
              </button>

            </div>


            {detailLoading ? (

              <div className="support-detail-loading">

                <div className="loading-spinner" />

                <span>
                  Đang tải chi tiết...
                </span>

              </div>

            ) : (

              <div className="support-detail-content">

                {error && (

                  <div className="dashboard-error">
                    {error}
                  </div>

                )}


                {/* INFO */}

                <div className="support-detail-grid">

                  <div className="support-detail-info-card">

                    <span>
                      Người tạo
                    </span>

                    <strong>
                      {getUserName(
                        selectedTicket.creator
                      )}
                    </strong>

                  </div>


                  <div className="support-detail-info-card">

                    <span>
                      Loại yêu cầu
                    </span>

                    <strong>
                      {getCategoryLabel(
                        selectedTicket.category
                      )}
                    </strong>

                  </div>


                  <div className="support-detail-info-card">

                    <span>
                      Ngày tạo
                    </span>

                    <strong>
                      {formatDate(
                        selectedTicket.created_at
                      )}
                    </strong>

                  </div>


                  <div className="support-detail-info-card">

                    <span>
                      Cập nhật
                    </span>

                    <strong>
                      {formatDate(
                        selectedTicket.updated_at
                      )}
                    </strong>

                  </div>

                </div>


                {/* CONTROL */}

                <div className="support-control-card">

                  <div className="support-control">

                    <label>
                      Trạng thái
                    </label>

                    <select
                      value={
                        selectedTicket.status
                      }
                      disabled={
                        changingStatus
                      }
                      onChange={
                        handleStatusChange
                      }
                    >

                      <option value="open">
                        Mở
                      </option>

                      <option value="assigned">
                        Đã phân công
                      </option>

                      <option value="in_progress">
                        Đang xử lý
                      </option>

                      <option value="waiting">
                        Chờ phản hồi
                      </option>

                      <option value="resolved">
                        Đã xử lý
                      </option>

                      <option value="closed">
                        Đã đóng
                      </option>

                    </select>

                  </div>


                  <div className="support-control">

                    <label>
                      Người xử lý
                    </label>

                    <select
                      value={
                        selectedTicket.assignee_id ||
                        ""
                      }
                      disabled={
                        !canAssign ||
                        assigning ||
                        users.length === 0
                      }
                      onChange={
                        handleAssign
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
                            {getUserName(
                              user
                            )}
                          </option>

                        )
                      )}

                    </select>

                  </div>

                </div>


                {!canAssign && (

                  <div className="support-permission-note">
                    Chỉ Admin hoặc Support có quyền phân công người xử lý.
                  </div>

                )}


                {canAssign &&
                  users.length ===
                    0 && (

                    <div className="support-permission-note">
                      Không tải được danh sách người dùng để phân công.
                    </div>

                  )}


                {/* DESCRIPTION */}

                <section className="support-detail-section">

                  <div className="support-detail-section-title">

                    <h3>
                      Nội dung yêu cầu
                    </h3>

                  </div>


                  <div className="support-description">
                    {selectedTicket.description}
                  </div>

                </section>


                {/* COMMENTS */}

                <section className="support-detail-section">

                  <div className="support-detail-section-title">

                    <div>

                      <h3>
                        Trao đổi
                      </h3>

                      <span>
                        {
                          selectedTicket.comments
                            ?.length ||
                          0
                        }{" "}
                        trao đổi
                      </span>

                    </div>

                  </div>


                  <div className="support-comments">

                    {selectedTicket.comments?.length ? (

                      selectedTicket.comments.map(
                        (item) => (

                          <div
                            key={item.id}
                            className="support-comment"
                          >

                            <div className="support-comment-avatar">

                              {getInitials(
                                item.user
                              )}

                            </div>


                            <div className="support-comment-body">

                              <div className="support-comment-header">

                                <strong>
                                  {getUserName(
                                    item.user
                                  )}
                                </strong>

                                <span>
                                  {formatDate(
                                    item.created_at
                                  )}
                                </span>

                              </div>


                              <div className="support-comment-content">
                                {item.content}
                              </div>

                            </div>

                          </div>

                        )
                      )

                    ) : (

                      <div className="support-no-comments">
                        Chưa có trao đổi nào.
                      </div>

                    )}

                  </div>


                  <form
                    className="support-comment-form"
                    onSubmit={
                      handleAddComment
                    }
                  >

                    <textarea
                      value={comment}
                      onChange={(event) =>
                        setComment(
                          event.target.value
                        )
                      }
                      placeholder="Nhập nội dung trao đổi..."
                      rows="3"
                    />


                    <div className="support-comment-footer">

                      <span>
                        Trao đổi sẽ được lưu vào lịch sử ticket.
                      </span>


                      <button
                        type="submit"
                        className="primary-button"
                        disabled={
                          saving ||
                          !comment.trim()
                        }
                      >
                        {saving
                          ? "Đang gửi..."
                          : "Gửi trao đổi"}
                      </button>

                    </div>

                  </form>

                </section>


                {/* ACTIVITIES */}

                <section className="support-detail-section">

                  <div className="support-detail-section-title">

                    <div>

                      <h3>
                        Lịch sử
                      </h3>

                      <span>
                        Activity
                      </span>

                    </div>

                  </div>


                  <div className="support-activities">

                    {selectedTicket.activities?.length ? (

                      selectedTicket.activities.map(
                        (item) => (

                          <div
                            key={item.id}
                            className="support-activity"
                          >

                            <div className="support-activity-dot">
                              ✓
                            </div>


                            <div className="support-activity-body">

                              <div>

                                <strong>
                                  {item.action}
                                </strong>

                                <span>
                                  {formatDate(
                                    item.created_at
                                  )}
                                </span>

                              </div>


                              <small>

                                {getUserName(
                                  item.user
                                )}


                                {item.old_value &&
                                  item.new_value && (

                                    <>
                                      {" · "}
                                      {item.old_value}
                                      {" → "}
                                      {item.new_value}
                                    </>

                                  )}

                              </small>

                            </div>

                          </div>

                        )
                      )

                    ) : (

                      <div className="support-no-comments">
                        Chưa có lịch sử.
                      </div>

                    )}

                  </div>

                </section>

              </div>

            )}

          </div>

        </div>

      )}

    </div>
  );
}


export default Support;