import { requireAdmin, ROLE_LABELS, type Role } from "@/app/actions/admin/guard";
import {
  assignBatchTeacher,
  createStaffAccount,
  deleteStaffAccount,
  resetStaffPassword,
} from "@/app/actions/admin/staff";
import { emailToUsername } from "@/lib/staff-usernames";
import { RoleSelect } from "@/components/admin/RoleSelect";
import {
  AdminHeader,
  EmptyState,
  Field,
  FlashMessage,
  Panel,
  Select,
  TableShell,
} from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

const ROLE_OPTIONS = [
  { value: "teacher", label: "Teacher" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Administrator" },
];

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    reset?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const { db, user } = await requireAdmin();
  const { created, reset, deleted, error } = await searchParams;

  const { data: people } = await db
    .from("profiles")
    .select("id, full_name, phone, role, created_at")
    .in("role", ["teacher", "staff", "admin"])
    .order("role", { ascending: false })
    .order("full_name", { ascending: true });

  // Usernames live on the auth record, not the profile.
  const { data: authList } = await db.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(
    (authList?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  const teachers = (people ?? []).filter((p) => p.role === "teacher");

  const { data: batches } = await db
    .from("batches")
    .select("id, name, start_date, teacher_id, course_id, course:courses (title_en)")
    .order("start_date", { ascending: false })
    .limit(60);

  return (
    <>
      <AdminHeader
        title="Staff & teachers"
        subtitle="Who can sign in to the dashboard, and what they can reach."
      />

      <FlashMessage
        saved={created || reset || deleted}
        error={error}
        savedText={
          created
            ? "Account created. Give them the username and password in person."
            : reset
              ? "Password changed."
              : "Account removed."
        }
        messages={{
          fields: "Username, full name and password are all required.",
          password: "The password needs at least 8 characters.",
          taken: "That username is already in use.",
          role: "Pick a role.",
          self: "You cannot change or remove your own account here.",
          failed: "Something went wrong. Please try again.",
        }}
      />

      {/* ---------------- Existing accounts ---------------- */}
      {(people ?? []).length === 0 ? (
        <EmptyState>No staff accounts yet.</EmptyState>
      ) : (
        <TableShell
          head={["Name", "Username", "Role", "Added", "Reset password", ""]}
          minWidth="56rem"
        >
          {(people ?? []).map((person) => {
            const isSelf = person.id === user.id;
            const username = emailToUsername(emailById.get(person.id) ?? "");

            return (
              <tr key={person.id} className="border-b border-ink-50 last:border-0">
                <td className="px-5 py-3">
                  <span className="font-semibold text-ink-900">
                    {person.full_name || "(no name)"}
                  </span>
                  {person.phone && (
                    <span className="block text-xs text-ink-400">{person.phone}</span>
                  )}
                </td>
                <td className="px-5 py-3 font-mono text-sm text-ink-600">{username}</td>
                <td className="px-5 py-3">
                  <RoleSelect
                    id={person.id}
                    name={person.full_name || username}
                    role={person.role}
                    disabled={isSelf}
                  />
                </td>
                <td className="px-5 py-3 text-ink-500">
                  {formatDate(person.created_at)}
                </td>
                <td className="px-5 py-3">
                  <form action={resetStaffPassword} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={person.id} />
                    <input
                      name="password"
                      type="text"
                      required
                      minLength={8}
                      placeholder="New password"
                      className="field-input py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="btn btn-outline px-3 py-1.5 text-xs"
                    >
                      Reset
                    </button>
                  </form>
                </td>
                <td className="px-5 py-3 text-right">
                  {!isSelf && (
                    <form action={deleteStaffAccount}>
                      <input type="hidden" name="id" value={person.id} />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-coral-600 hover:underline"
                      >
                        Remove
                      </button>
                    </form>
                  )}
                  {isSelf && <span className="text-xs text-ink-400">You</span>}
                </td>
              </tr>
            );
          })}
        </TableShell>
      )}

      {/* ---------------- Add an account ---------------- */}
      <Panel
        title="Add a teacher or staff member"
        description="They sign in at /admin/login with the username below — no email address needed."
      >
        <form action={createStaffAccount} className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Full name"
            name="full_name"
            required
            placeholder="Farhana Akter"
          />
          <Field
            label="Username"
            name="username"
            required
            placeholder="farhana"
            hint="Lowercase, no spaces. This is what they type to sign in."
          />
          <Field label="Phone" name="phone" type="tel" placeholder="01XXXXXXXXX" />
          <Select
            label="Role"
            name="role"
            defaultValue="teacher"
            options={ROLE_OPTIONS}
            hint="Teachers see only their own classes. Staff handle enrolments and payments."
          />
          <Field
            label="Password"
            name="password"
            required
            hint="At least 8 characters. Write it down — it is shown only here."
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary">
              Create account
            </button>
          </div>
        </form>
      </Panel>

      {/* ---------------- Batch assignments ---------------- */}
      <Panel
        title="Who teaches which batch"
        description="A teacher only sees the batches assigned to them here."
      >
        {teachers.length === 0 ? (
          <p className="text-sm text-ink-500">
            Add a teacher account first, then assign batches.
          </p>
        ) : (batches ?? []).length === 0 ? (
          <p className="text-sm text-ink-500">No batches yet.</p>
        ) : (
          <div className="space-y-3">
            {(batches ?? []).map((batch) => {
              const course = (
                Array.isArray(batch.course) ? batch.course[0] : batch.course
              ) as { title_en: string } | null;

              return (
                <form
                  key={batch.id}
                  action={assignBatchTeacher}
                  className="flex flex-wrap items-center gap-3 border-t border-ink-100 pt-3 first:border-t-0 first:pt-0"
                >
                  <input type="hidden" name="batch_id" value={batch.id} />
                  <input type="hidden" name="course_id" value={batch.course_id} />

                  <div className="min-w-56 flex-1">
                    <p className="text-sm font-semibold text-ink-900">
                      {course?.title_en ?? "—"}
                    </p>
                    <p className="text-xs text-ink-400">
                      {batch.name} · {formatDate(batch.start_date)}
                    </p>
                  </div>

                  <select
                    name="teacher_id"
                    defaultValue={batch.teacher_id ?? ""}
                    className="field-input max-w-56 py-1.5 text-sm"
                  >
                    <option value="">Not assigned</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name || "(no name)"}
                      </option>
                    ))}
                  </select>

                  <button type="submit" className="btn btn-outline px-3 py-1.5 text-sm">
                    Save
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="What each role can reach">
        <ul className="space-y-2 text-sm text-ink-600">
          {(["admin", "staff", "teacher"] as Role[]).map((role) => (
            <li key={role}>
              <strong className="text-ink-900">{ROLE_LABELS[role]}</strong> —{" "}
              {role === "admin" &&
                "everything: courses, prices, students, enrolments, payments, site settings and these accounts."}
              {role === "staff" &&
                "enrolments, payments and verification, students, contact messages. Cannot edit courses, prices, settings or accounts."}
              {role === "teacher" &&
                "only the batches assigned to them, with the student list and contact details for each. No payments, no fees, no settings."}
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
