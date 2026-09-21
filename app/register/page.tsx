"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.push("/login");
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Tạo tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Input placeholder="Email" type="email" onChange={(e) => setForm({...form, email: e.target.value})} required />
            <Input placeholder="Username (vd: nguyenvana)" onChange={(e) => setForm({...form, username: e.target.value})} required />
            <Input placeholder="Tên hiển thị (vd: Nguyễn Văn A)" onChange={(e) => setForm({...form, displayName: e.target.value})} required />
            <Input placeholder="Mật khẩu (ít nhất 6 ký tự)" type="password" onChange={(e) => setForm({...form, password: e.target.value})} required />
            <Button type="submit" className="w-full">Đăng ký</Button>
          </form>
          <p className="mt-4 text-center text-sm">
            Đã có tài khoản? <Link href="/login" className="text-blue-500 hover:underline">Đăng nhập</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}