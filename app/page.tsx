import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white">
      <div className="max-w-md space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          StudyHup
        </h1>
        <p className="text-zinc-400 text-base sm:text-lg">
          Không gian học tập tập trung, theo dõi thời gian và thi đua cùng bạn bè.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 shadow-lg shadow-blue-500/20"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3 font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Đăng ký tài khoản
          </Link>
        </div>
      </div>
    </main>
  );
}