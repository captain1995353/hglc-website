import { requireAdmin } from "@/app/actions/admin/guard";
import { createCourse } from "@/app/actions/admin/courses";
import { AdminHeader, BackLink, FlashMessage } from "@/components/admin/ui";
import { CourseForm } from "@/components/admin/CourseForm";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <>
      <BackLink href="/admin/courses">All courses</BackLink>
      <AdminHeader
        title="Add a course"
        subtitle="It appears in the catalogue as soon as it is saved and visible."
      />

      <FlashMessage
        error={error}
        messages={{
          title: "Give the course an English title.",
          slug_taken: "That web address is already used by another course.",
        }}
      />

      <CourseForm action={createCourse} submitLabel="Create course" />
    </>
  );
}
