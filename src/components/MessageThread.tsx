import { LocalTime } from "@/components/LocalTime";

export type ThreadMessage = {
  id: string;
  body: string;
  from_staff: boolean;
  created_at: string;
};

/**
 * One conversation, read from either side. `mine` says which column the
 * viewer sits in, so the same component serves the student portal and the
 * dashboard without either needing its own copy.
 */
export function MessageThread({
  messages,
  viewer,
  staffName = "Hangeul Global",
  studentName = "Student",
}: {
  messages: ThreadMessage[];
  viewer: "student" | "staff";
  staffName?: string;
  studentName?: string;
}) {
  if (messages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-400">No messages yet.</p>
    );
  }

  return (
    <ol className="space-y-4">
      {messages.map((message) => {
        const mine =
          viewer === "staff" ? message.from_staff : !message.from_staff;
        const who = message.from_staff ? staffName : studentName;

        return (
          <li
            key={message.id}
            className={`flex ${mine ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] sm:max-w-[70%]`}>
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  mine
                    ? "rounded-br-sm bg-brand-600 text-white"
                    : "rounded-bl-sm bg-ink-100 text-ink-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
              </div>
              <p
                className={`mt-1 text-xs text-ink-400 ${
                  mine ? "text-right" : "text-left"
                }`}
              >
                {who} · <LocalTime iso={message.created_at} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
