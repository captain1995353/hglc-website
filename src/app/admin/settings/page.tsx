import { requireAdmin } from "@/app/actions/admin/guard";
import { saveSettings } from "@/app/actions/admin/settings";
import { getSettingRows, type SettingRow } from "@/lib/settings";
import { AdminHeader, EmptyState, FlashMessage, Panel } from "@/components/admin/ui";

const GROUP_TITLES: Record<string, { title: string; description: string }> = {
  contact: {
    title: "Contact details",
    description:
      "Shown in the footer, the about page and the contact page across the whole site.",
  },
  payment: {
    title: "Payment accounts",
    description:
      "The numbers students send fees to when they pay by manual transfer.",
  },
  home: {
    title: "Homepage & announcements",
    description:
      "Leave a field empty to keep the built-in wording. The announcement strip is hidden while it is blank.",
  },
  general: { title: "General", description: "" },
};

function SettingField({ row }: { row: SettingRow }) {
  const Input = row.is_long ? "textarea" : "input";

  return (
    <div className="border-t border-ink-100 py-5 first:border-t-0 first:pt-0">
      <label className="field-label" htmlFor={`en:${row.key}`}>
        {row.label || row.key}
      </label>
      {row.hint && <p className="mb-2 text-xs text-ink-400">{row.hint}</p>}

      <div className={row.bilingual ? "grid gap-3 sm:grid-cols-2" : ""}>
        <div>
          {row.bilingual && (
            <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide text-ink-400">
              English
            </span>
          )}
          <Input
            id={`en:${row.key}`}
            name={`en:${row.key}`}
            defaultValue={row.value_en}
            rows={row.is_long ? 3 : undefined}
            className="field-input resize-y"
          />
        </div>

        {row.bilingual && (
          <div>
            <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide text-ink-400">
              한국어
            </span>
            <Input
              id={`ko:${row.key}`}
              name={`ko:${row.key}`}
              defaultValue={row.value_ko}
              rows={row.is_long ? 3 : undefined}
              className="field-input resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { saved } = await searchParams;
  const rows = await getSettingRows();

  const groups = new Map<string, SettingRow[]>();
  for (const row of rows) {
    groups.set(row.group_name, [...(groups.get(row.group_name) ?? []), row]);
  }

  return (
    <>
      <AdminHeader
        title="Site settings"
        subtitle="Text and contact details that appear across the public site. Changes go live immediately."
      />

      <FlashMessage saved={saved} savedText="Settings saved and live on the site." />

      {rows.length === 0 ? (
        <EmptyState>
          The settings table is empty — run supabase/admin.sql in the Supabase SQL
          editor to create it.
        </EmptyState>
      ) : (
        <form action={saveSettings}>
          {[...groups].map(([group, groupRows]) => {
            const meta = GROUP_TITLES[group] ?? GROUP_TITLES.general;
            return (
              <Panel key={group} title={meta.title} description={meta.description}>
                {groupRows.map((row) => (
                  <SettingField key={row.key} row={row} />
                ))}
              </Panel>
            );
          })}

          <button type="submit" className="btn btn-primary">
            Save settings
          </button>
        </form>
      )}
    </>
  );
}
