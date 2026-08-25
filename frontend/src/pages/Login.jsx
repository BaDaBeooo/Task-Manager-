import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";


function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      console.log("1. Đang login...");

      const response = await api.post("/auth/login", {
        username,
        password,
      });

      console.log("2. Login thành công:", response.data);

      localStorage.setItem(
        "access_token",
        response.data.access_token
      );

      console.log(
        "3. Token đã lưu:",
        localStorage.getItem("access_token")
      );

      const meResponse = await api.get("/auth/me");

      console.log(
        "4. Current user:",
        meResponse.data
      );

      console.log(
        "5. Đang navigate tới /dashboard"
      );

      navigate("/dashboard");

      console.log(
        "6. Navigate đã được gọi"
      );

    } catch (error) {
      console.error("LOGIN ERROR:", error);

      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError("Không thể kết nối đến server");
      }

    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-page">

      <div className="login-card">

        <h1>Task Manager</h1>

        <p className="login-subtitle">
          Quản lý công việc nhóm
        </p>


        <form onSubmit={handleLogin}>

          <div className="form-group">

            <label>
              Tài khoản
            </label>

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="Nhập tài khoản"
              autoComplete="username"
              required
            />

          </div>


          <div className="form-group">

            <label>
              Mật khẩu
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
            />

          </div>


          {error && (
            <div className="login-error">
              {error}
            </div>
          )}


          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Đang đăng nhập..."
              : "Đăng nhập"}
          </button>

        </form>

      </div>

    </div>
  );
}


export default Login;