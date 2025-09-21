import { AdminQuizManager } from "@/components/AdminQuizManager";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const AdminQuizzesPage = () => {
  useEffect(() => {
    setMeta(
      "Quiz Management — Pluggd Admin",
      "Create and manage course quizzes with AI-powered question generation.",
      "/admin/quizzes"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <AdminQuizManager />
        </div>
      </main>
    </div>
  );
};

export default AdminQuizzesPage;