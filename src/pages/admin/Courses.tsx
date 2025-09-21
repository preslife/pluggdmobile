import { EnhancedAdminCourseManager } from "@/components/EnhancedAdminCourseManager";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const AdminCoursesPage = () => {
  useEffect(() => {
    setMeta(
      "Course Management — Pluggd Admin",
      "Create and manage courses with lessons, quizzes, and multimedia content.",
      "/admin/courses"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <EnhancedAdminCourseManager />
        </div>
      </main>
    </div>
  );
};

export default AdminCoursesPage;