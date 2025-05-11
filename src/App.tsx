import React, { useState, useEffect, useRef } from "react";
import useLocalStorage from "use-local-storage";
import { SpeedInsights } from "@vercel/speed-insights/react";

type Item = {
  id: number;
  name: string;
  replacementInterval: number;
  lastReplaced: string;
  category: string;
};

const categories = ["Hygiene", "Expiration", "Performance", "None"];

// Dark mode hook with localStorage
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const ls = localStorage.getItem("dark-mode");
    if (ls !== null) return ls === "true";
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });
  useEffect(() => {
    if (dark) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("dark-mode", "true");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("dark-mode", "false");
    }
  }, [dark]);
  return [dark, setDark] as const;
}

function calculateDaysLeft(lastReplaced: string, interval: number) {
  const last = new Date(lastReplaced);
  const now = new Date();
  const diff = Math.floor(
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  );
  return interval - diff;
}

function calculateNextDate(lastReplaced: string, interval: number) {
  const last = new Date(lastReplaced);
  last.setDate(last.getDate() + interval);
  return last.toLocaleDateString();
}

const App: React.FC = () => {
  const [items, setItems] = useLocalStorage<Item[]>("replacement-items", []);
  const [name, setName] = useState("");
  const [interval, setInterval] = useState(30);
  const [category, setCategory] = useState(categories[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>("");

  // For calendar (date picker)
  const [calendarId, setCalendarId] = useState<number | null>(null);
  const [calendarLastDate, setCalendarLastDate] = useState<string>("");
  const [calendarNextDate, setCalendarNextDate] = useState<string>("");

  // Delete modal state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Dark mode
  const [dark, setDark] = useDarkMode();

  // For click-outside cancel on rename
  const editInputRef = useRef<HTMLInputElement | null>(null);

  // Add new item
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setItems([
      ...(items ?? []),
      {
        id: Date.now(),
        name: name.trim(),
        replacementInterval: interval,
        lastReplaced: new Date().toISOString(),
        category,
      },
    ]);
    setName("");
    setInterval(30);
    setCategory(categories[0]);
  };

  // Replace now
  const handleReplace = (id: number) => {
    setItems(
      (items ?? []).map((item) =>
        item.id === id
          ? { ...item, lastReplaced: new Date().toISOString() }
          : item
      )
    );
  };

  // Delete item (after confirmation)
  const handleDelete = (id: number) => {
    setItems((items ?? []).filter((item) => item.id !== id));
    setDeleteId(null);
  };

  // Edit (rename) logic
  const handleEditClick = (id: number, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(e.target.value);
  };

  const handleEditSave = (id: number) => {
    if (editName.trim() === "") return;
    setItems(
      (items ?? []).map((item) =>
        item.id === id ? { ...item, name: editName } : item
      )
    );
    setEditingId(null);
    setEditName("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName("");
  };

  // Click outside to cancel rename
  useEffect(() => {
    if (editingId === null) return;
    function handleClick(e: MouseEvent) {
      if (
        editInputRef.current &&
        !editInputRef.current.contains(e.target as Node)
      ) {
        handleEditCancel();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
    // eslint-disable-next-line
  }, [editingId]);

  // Calendar button logic
  const handleCalendarClick = (
    id: number,
    lastReplaced: string,
    interval: number
  ) => {
    setCalendarId(id);
    setCalendarLastDate(lastReplaced.slice(0, 10)); // yyyy-mm-dd
    // Pre-fill next replacement date
    const last = new Date(lastReplaced);
    last.setDate(last.getDate() + interval);
    setCalendarNextDate(last.toISOString().slice(0, 10));
  };

  const handleCalendarLastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCalendarLastDate(e.target.value);
    // Update next replacement date to match new last replaced + interval
    if (calendarId !== null) {
      const item = (items ?? []).find((i) => i.id === calendarId);
      if (item) {
        const last = new Date(e.target.value);
        last.setDate(last.getDate() + item.replacementInterval);
        setCalendarNextDate(last.toISOString().slice(0, 10));
      }
    }
  };

  const handleCalendarNextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCalendarNextDate(e.target.value);
    // Update last replaced date so that last + interval = next
    if (calendarId !== null) {
      const item = (items ?? []).find((i) => i.id === calendarId);
      if (item) {
        const next = new Date(e.target.value);
        next.setDate(next.getDate() - item.replacementInterval);
        setCalendarLastDate(next.toISOString().slice(0, 10));
      }
    }
  };

  const handleCalendarSave = (id: number) => {
    setItems(
      (items ?? []).map((item) =>
        item.id === id
          ? { ...item, lastReplaced: new Date(calendarLastDate).toISOString() }
          : item
      )
    );
    setCalendarId(null);
    setCalendarLastDate("");
    setCalendarNextDate("");
  };

  const handleCalendarCancel = () => {
    setCalendarId(null);
    setCalendarLastDate("");
    setCalendarNextDate("");
  };

  // Sort items: overdue first, then soonest to be replaced
  const sortedItems = [...(items ?? [])].sort((a, b) => {
    const aLeft = calculateDaysLeft(a.lastReplaced, a.replacementInterval);
    const bLeft = calculateDaysLeft(b.lastReplaced, b.replacementInterval);
    return aLeft - bLeft;
  });

  return (
    <div className="App">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 700,
          margin: "0 auto 2rem auto",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "1.5rem 0" }}>
          Replacement Tracker
        </h1>
        <button
          className="icon-btn"
          aria-label="Toggle dark mode"
          onClick={() => setDark((d) => !d)}
          style={{ fontSize: "1.5rem" }}
        >
          {dark ? (
            // Moon
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
            </svg>
          ) : (
            // Sun
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          )}
        </button>
      </div>

      {/* Modern input row */}
      <form onSubmit={handleAdd} style={{ margin: 0 }}>
        <div className="input-row">
          <input
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
          />
          <input
            type="number"
            min={1}
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            required
            placeholder="days"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
          <button className="replace-btn" type="submit">
            Add
          </button>
        </div>
      </form>

      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {(sortedItems ?? []).length === 0 && (
          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            No items yet. Add something to track!
          </div>
        )}
        {(sortedItems ?? []).map((item) => {
          const daysLeft = calculateDaysLeft(
            item.lastReplaced,
            item.replacementInterval
          );
          const nextDate = calculateNextDate(
            item.lastReplaced,
            item.replacementInterval
          );

          return (
            <div className="card" key={item.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  {editingId === item.id ? (
                    <>
                      <input
                        ref={editInputRef}
                        value={editName}
                        onChange={handleEditChange}
                        autoFocus
                        placeholder="Rename item"
                        onBlur={handleEditCancel}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditSave(item.id);
                        }}
                        style={{ fontSize: "1.1rem", minWidth: 120 }}
                      />
                      <button
                        className="icon-btn"
                        title="Save"
                        onClick={() => handleEditSave(item.id)}
                      >
                        {/* Floppy disk SVG */}
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            stroke="currentColor"
                          />
                          <path
                            d="M16 3v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V3"
                            stroke="currentColor"
                          />
                          <path d="M9 15h6v6H9z" stroke="currentColor" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className="task-name"
                        style={{ fontWeight: 600, fontSize: "1.1rem" }}
                      >
                        {item.name}
                      </span>
                      {item.category !== "None" && (
                        <span className="category">{item.category}</span>
                      )}
                    </>
                  )}
                </div>
                <div className="text-muted">
                  Replace every <b>{item.replacementInterval}</b> days. Last
                  replaced: {new Date(item.lastReplaced).toLocaleDateString()}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  gap: "1rem",
                  marginTop: "1.1rem",
                }}
              >
                <div className={daysLeft < 0 ? "overdue" : "normal"}>
                  {daysLeft < 0 ? (
                    <span>Overdue by {Math.abs(daysLeft)} days</span>
                  ) : (
                    <span>
                      {daysLeft}{" "}
                      <span style={{ fontWeight: 400, fontSize: "1rem" }}>
                        days
                      </span>{" "}
                      left
                    </span>
                  )}
                </div>
                <div className="text-muted">Next: {nextDate}</div>
                <div className="actions-row">
                  {editingId !== item.id && (
                    <>
                      <button
                        className="icon-btn"
                        title="Rename"
                        aria-label="Rename"
                        onClick={() => handleEditClick(item.id, item.name)}
                      >
                        {/* I-beam SVG */}
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="9"
                            y="4"
                            width="6"
                            height="16"
                            rx="2"
                            stroke="currentColor"
                            fill="none"
                          />
                          <line
                            x1="12"
                            y1="4"
                            x2="12"
                            y2="20"
                            stroke="currentColor"
                          />
                        </svg>
                      </button>
                      <button
                        className="icon-btn"
                        title="Replace now"
                        aria-label="Replace now"
                        onClick={() => handleReplace(item.id)}
                      >
                        {/* Refresh SVG */}
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M4 4v5h5" />
                          <path d="M19 20v-5h-5" />
                          <path d="M5 9a9 9 0 0 1 14 6" />
                          <path d="M19 15a9 9 0 0 1-14-6" />
                        </svg>
                      </button>
                      <button
                        className="icon-btn"
                        title="Calendar"
                        aria-label="Calendar"
                        onClick={() =>
                          handleCalendarClick(
                            item.id,
                            item.lastReplaced,
                            item.replacementInterval
                          )
                        }
                      >
                        {/* Calendar SVG */}
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            stroke="currentColor"
                            fill="none"
                          />
                          <line
                            x1="16"
                            y1="2"
                            x2="16"
                            y2="6"
                            stroke="currentColor"
                          />
                          <line
                            x1="8"
                            y1="2"
                            x2="8"
                            y2="6"
                            stroke="currentColor"
                          />
                          <line
                            x1="3"
                            y1="10"
                            x2="21"
                            y2="10"
                            stroke="currentColor"
                          />
                        </svg>
                      </button>
                      <button
                        className="icon-btn"
                        title="Delete"
                        aria-label="Delete"
                        onClick={() => setDeleteId(item.id)}
                      >
                        {/* Trash SVG */}
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <SpeedInsights />
    </div>
  );
};

export default App;
