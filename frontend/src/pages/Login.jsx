import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";


function Login() {

  const navigate = useNavigate();


  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");


  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");


  const [mustChangePassword, setMustChangePassword] =
    useState(false);


  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (
    event
  ) => {

    event.preventDefault();

    setError("");
    setLoading(true);


    try {

      const response =
        await api.post(
          "/auth/login",
          {
            username,
            password,
          }
        );


      localStorage.setItem(
        "access_token",
        response.data.access_token
      );


      if (
        response.data.must_change_password
      ) {

        setMustChangePassword(
          true
        );

        return;

      }


      navigate(
        "/dashboard"
      );


    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể kết nối đến server"
      );


    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // CHANGE PASSWORD
  // =====================================================

  const handleChangePassword = async (
    event
  ) => {

    event.preventDefault();

    setError("");


    if (
      newPassword.length < 6
    ) {

      setError(
        "Mật khẩu mới phải có ít nhất 6 ký tự."
      );

      return;

    }


    if (
      newPassword !==
      confirmPassword
    ) {

      setError(
        "Xác nhận mật khẩu không khớp."
      );

      return;

    }


    setLoading(true);


    try {

      await api.post(
        "/auth/change-password",
        {
          current_password:
            password,

          new_password:
            newPassword,

          confirm_password:
            confirmPassword,
        }
      );


      setMustChangePassword(
        false
      );

      setPassword("");
      setNewPassword("");
      setConfirmPassword("");


      navigate(
        "/dashboard"
      );


    } catch (error) {

      console.error(
        "CHANGE PASSWORD ERROR:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Không thể đổi mật khẩu."
      );


    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // FORCE CHANGE PASSWORD SCREEN
  // =====================================================

  if (
    mustChangePassword
  ) {

    return (

      <div className="login-page">

        <div
          className="login-card"
          style={{
            maxWidth: "430px",
          }}
        >

          <div
            style={{
              fontSize: "38px",
              textAlign: "center",
              marginBottom: "10px",
            }}
          >
            🔐
          </div>


          <h1>
            Đổi mật khẩu
          </h1>


          <p className="login-subtitle">
            Đây là lần đăng nhập đầu tiên.
            <br />
            Vui lòng đặt mật khẩu mới để
            tiếp tục.
          </p>


          <form
            onSubmit={
              handleChangePassword
            }
          >

            <div className="form-group">

              <label>
                Mật khẩu hiện tại
              </label>

              <input
                type="password"
                value={password}
                readOnly
                autoComplete="current-password"
              />

            </div>


            <div className="form-group">

              <label>
                Mật khẩu mới
              </label>

              <input
                type="password"
                value={
                  newPassword
                }
                onChange={(
                  event
                ) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                placeholder="Ít nhất 6 ký tự"
                autoComplete="new-password"
                required
                autoFocus
              />

            </div>


            <div className="form-group">

              <label>
                Xác nhận mật khẩu mới
              </label>

              <input
                type="password"
                value={
                  confirmPassword
                }
                onChange={(
                  event
                ) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
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
                ? "Đang cập nhật..."
                : "Đổi mật khẩu"}

            </button>

          </form>

        </div>

      </div>

    );

  }


  // =====================================================
  // LOGIN SCREEN
  // =====================================================

  return (

    <div className="login-page">

      <div className="login-card">

        <h1>
          Task Manager
        </h1>

        <p className="login-subtitle">
          Quản lý công việc nhóm
        </p>


        <form
          onSubmit={handleLogin}
        >

          <div className="form-group">

            <label>
              Tài khoản
            </label>

            <input
              type="text"
              value={username}
              onChange={(
                event
              ) =>
                setUsername(
                  event.target.value
                )
              }
              placeholder="Nhập tài khoản"
              autoComplete="username"
              required
              autoFocus
            />

          </div>


          <div className="form-group">

            <label>
              Mật khẩu
            </label>

            <input
              type="password"
              value={password}
              onChange={(
                event
              ) =>
                setPassword(
                  event.target.value
                )
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