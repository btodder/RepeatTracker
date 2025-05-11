import React, { useState, useEffect, useRef } from "react";
import useLocalStorage from "use-local-storage";
import { SpeedInsights } from "@vercel/speed-insights/react";

const categories = ["Hygiene", "Expiration", "Performance", "None"];
const verbs = [
  "Appointment",
  "Meeting",
  "Replace",
  "Check",
  "Water"
];

type Item = {
  id: number;
  name: string;
  replacementInterval: number;
  lastReplaced: string;
  category: string;
  verb: string;
};

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

function calculateDaysBetween(date1: string, date2: string) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diff / (1000 * 60 * 60 * 24));
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
  const [category, setCategory] = useState("None");
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

  // Verb menu state
  const [verbMenuId, setVerbMenuId] = useState<number | null>(null);

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
        verb: "Replace"
      }
    ]);
    setName("");
    setInterval(30);
    setCategory("None");
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

  // When calendar dates change, update interval automatically
  useEffect(() => {
    if (calendarId !== null && calendarLastDate && calendarNextDate) {
      const days = calculateDaysBetween(calendarLastDate, calendarNextDate);
      setItems((items ?? []).map((item) =>
        item.id === calendarId
          ? { ...item, replacementInterval: days }
          : item
      ));
      setInterval(days); // also update the add form interval for consistency
    }
    // eslint-disable-next-line
  }, [calendarLastDate, calendarNextDate]);

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
    // Update interval when next date changes
    if (calendarId !== null) {
      const days = calculateDaysBetween(calendarLastDate, e.target.value);
      setItems((items ?? []).map((item) =>
        item.id === calendarId
          ? { ...item, replacementInterval: days }
          : item
      ));
    }
  };

  const handleCalendarSave = (id: number) => {
    setItems(
      (items ?? []).map((item) =>
        item.id === id
          ? {
              ...item,
              lastReplaced: new Date(calendarLastDate).toISOString(),
              replacementInterval: calculateDaysBetween(
                calendarLastDate,
                calendarNextDate
              )
            }
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

  // Modal click-outside logic
  const modalRef = useRef<HTMLDivElement>(null);
  const calendarModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (deleteId !== null && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setDeleteId(null);
      }
      if (calendarId !== null && calendarModalRef.current && !calendarModalRef.current.contains(event.target as Node)) {
        handleCalendarCancel();
      }
      if (verbMenuId !== null) {
        setVerbMenuId(null);
      }
    }
    if (deleteId !== null || calendarId !== null || verbMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // eslint-disable-next-line
  }, [deleteId, calendarId, verbMenuId]);

  // Sort items: overdue first, then soonest to be replaced
  const sortedItems = [...(items ?? [])].sort((a, b) => {
    const aLeft = calculateDaysLeft(a.lastReplaced, a.replacementInterval);
    const bLeft = calculateDaysLeft(b.lastReplaced, b.replacementInterval);
    return aLeft - bLeft;
  });

  return (
    <div className="App">
      <h1 className="centered-title">Replacement Tracker</h1>
      <button
        className="icon-btn darkmode-btn"
        aria-label="Toggle dark mode"
        onClick={() => setDark((d) => !d)}
      >
        {dark ? "🌙" : "☀️"}
      </button>

      {/* Input Row */}
      <form onSubmit={handleAdd} style={{ margin: 0 }}>
        <div className="input-row">
          <input
            placeholder="Item"
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
            placeholder="Interval (days)"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
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
                        💾
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
                  <span
                    className="verb-select"
                    tabIndex={0}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                    onClick={e => {
                      e.stopPropagation();
                      setVerbMenuId(item.id);
                    }}
                  >
                    {item.verb}
                  </span>{" "}
                  every <b>{item.replacementInterval}</b> days.{" "}
                  {item.verb === "Replace" || item.verb === "Check" || item.verb === "Water"
                    ? `Last ${item.verb.toLowerCase()}ed:`
                    : `Last ${item.verb.toLowerCase()}:`
                  }{" "}
                  {new Date(item.lastReplaced).toLocaleDateString()}
                  {verbMenuId === item.id && (
                    <div className="verb-menu" onClick={e => e.stopPropagation()}>
                      {verbs.map(v => (
                        <div
                          key={v}
                          className="verb-menu-item"
                          onClick={() => {
                            setItems((items ?? []).map(i =>
                              i.id === item.id ? { ...i, verb: v } : i
                            ));
                            setVerbMenuId(null);
                          }}
                        >
                          {v}
                        </div>
                      ))}
                    </div>
                  )}
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
                    <span>{Math.abs(daysLeft)} days overdue</span>
                  ) : (
                    <span>
                      {daysLeft} <span style={{ fontWeight: 400, fontSize: "1rem" }}>days</span> left
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
                        ✏️
                      </button>
                      <button
                        className="icon-btn"
                        title="Replace now"
                        aria-label="Replace now"
                        onClick={() => handleReplace(item.id)}
                      >
                        🔄
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
                        📅
                      </button>
                      <button
                        className="icon-btn"
                        title="Delete"
                        aria-label="Delete"
                        onClick={() => setDeleteId(item.id)}
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Modal */}
      {deleteId !== null && (
        <div className="modal-overlay">
          <div className="modal-dialog" ref={modalRef}>
            <div className="modal-title">Delete Item</div>
            <div style={{ marginBottom: "1.5rem" }}>
              Are you sure you want to delete this item?
            </div>
            <div className="modal-btn-row">
              <button
                className="modal-btn"
                onClick={() => handleDelete(deleteId)}
              >
                Delete
              </button>
              <button className="modal-btn" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {calendarId !== null && (
        <div className="modal-overlay">
          <div className="modal-dialog" ref={calendarModalRef}>
            <div className="modal-title">Edit Dates</div>
            <div className="calendar-row">
              <label>
                <span className="calendar-label">Last replaced:</span>
                <input
                  type="date"
                  value={calendarLastDate}
                  onChange={handleCalendarLastChange}
                  className="calendar-date"
                />
              </label>
              <label>
                <span className="calendar-label">Next replacement:</span>
                <input
                  type="date"
                  value={calendarNextDate}
                  onChange={handleCalendarNextChange}
                  className="calendar-date"
                />
              </label>
            </div>
            <div className="modal-btn-row">
              <button
                className="modal-btn"
                onClick={() => handleCalendarSave(calendarId)}
              >
                Save
              </button>
              <button className="modal-btn" onClick={handleCalendarCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <SpeedInsights />
    </div>
  );
};

export default App;
