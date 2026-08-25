import { useEffect, useState } from "react";

import api from "../services/api";


function Dashboard() {
  const [user, setUser] = useState(null);


  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await api.get("/auth/me");

        setUser(response.data);
      } catch {
        localStorage.removeItem("access_token");

        window.location.href = "/";
      }
    };

    loadUser();
  }, []);


  const handleLogout = () => {
    localStorage.removeItem("access_token");

    window.location.href = "/";
  };


  if (!user) {
    return (
      <div>
        Đang tải...
      </div>
    );
  }


  return (
    <div>

      <h1>Task Manager</h1>

      <p>
        Xin chào, {user.full_name}
      </p>

      <p>
        Quyền: {user.role}
      </p>

      <button onClick={handleLogout}>
        Đăng xuất
      </button>

    </div>
  );
}


export default Dashboard;