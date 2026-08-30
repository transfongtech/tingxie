"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        const from = searchParams.get("from") || "/";
        router.push(from);
        router.refresh();
      } else {
        setError(data.message || "密码错误，请重试");
      }
    } catch {
      setError("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          访问密码
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入密码"
          required
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-lg"
        />
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl shadow-xs transition duration-200 min-h-[48px] text-lg disabled:opacity-50"
      >
        {loading ? "解锁中..." : "开启听写练习 →"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#FBF7F0] flex items-center justify-center p-4 text-[#2D2D2D]">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xs border border-amber-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-wide">Tingxie Practice</h1>
          <p className="text-gray-500 text-sm mt-1">请输入访问密码解锁练习</p>
        </div>

        <Suspense fallback={<div className="text-center py-4 text-gray-400">加载中...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
