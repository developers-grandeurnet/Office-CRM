import React, { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { AuthInput } from "./AuthInput";
import { PasswordInput } from "./PasswordInput";
import { Checkbox } from "../ui/Checkbox";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { cn } from "../../utils/cn";

export const LoginForm = () => {
  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
  const [errors, setErrors] = useState({ email: "", password: "", general: "" });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { brand } = useBrand();
  const companyName = brand.companyName || "AK Techs";

  const validate = () => {
    let valid = true;
    const newErrors = { email: "", password: "", general: "" };

    if (!formData.email) {
      newErrors.email = "Please enter a valid email address.";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
      valid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ email: "", password: "", general: "" });

    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}auth/login`,
        {
          email: formData.email,
          password: formData.password,
        },
        { withCredentials: true }
      );

      const responseData = response.data;
      const { user, accessToken, refreshToken } = responseData.data || {};

      if (user && accessToken) {
        login(user, { accessToken, refreshToken });
      } else if (user) {
        login(user);
      } else {
        throw new Error("Invalid response from server");
      }

      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Something went wrong.";
      toast.error(errorMessage);
      setErrors((prev) => ({ ...prev, general: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name] || errors.general) {
      setErrors((prev) => ({ ...prev, [name]: "", general: "" }));
    }
  };

  return (
    <div className="auth-rise-delay w-full">
      <div className="mb-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c45c26]">
          Sign in
        </p>
        <h2 className="auth-display mt-2.5 text-[2rem] font-extrabold leading-tight tracking-tight text-[#0f2744] sm:text-[2.15rem]">
          Welcome back
        </h2>
        <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-slate-500">
          Enter your {companyName} credentials to open the dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.general && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {errors.general}
          </div>
        )}

        <AuthInput
          label="Email"
          name="email"
          type="email"
          placeholder="you@company.com"
          icon={Mail}
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
        />

        <div>
          <PasswordInput
            label="Password"
            name="password"
            placeholder="Your password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isLoading}
          />

          <div className="mt-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={isLoading}
              />
              <label
                htmlFor="rememberMe"
                className="cursor-pointer text-sm font-medium text-slate-600"
              >
                Remember me
              </label>
            </div>
            <a
              href="#"
              className="text-sm font-semibold text-[#c45c26] transition-colors hover:text-[#a34b1f]"
            >
              Forgot password?
            </a>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "group mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#0f2744] text-[15px] font-semibold text-white transition",
            "hover:bg-[#163a66] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c45c26]",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {isLoading ? "Signing in..." : (
            <>
              Continue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
