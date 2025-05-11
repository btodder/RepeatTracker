import React, { useState, useEffect, useRef } from "react";
import useLocalStorage from "use-local-storage";
import { SpeedInsights } from "@vercel/speed-insights/react";

const categories = ["Hygiene", "Expiration", "Performance", "None"];
const verbs = ["Appointment", "Meeting", "Replace", "Check", "Water"];

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

const verbLastText = () => "Last:";

const verbEveryText = (verb: string) => {
  switch (verb) {
    case "Appointment":
      return "Appointment";
    case "Meeting":
      return "Meet";
    case "Replace":
      return "Replace";
    case "Check":
      return "Check";
    case "Water":
      return "Water";
    default:
      return "Every";
  }
};

const App: React.FC = () => {
  const [items, setItems] = useLocalStorage<Item[]>("replacement-items", []);
  const [name, setName] = useState("");
  const [interval, setInterval] = useState(30);
  const [category, setCategory] = useState("None");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editLastDate, setEditLastDate] = useState<string>("");
  const [editNextDate, setEditNextDate] = useState<string>("");
  const [editVerb, setEditVerb] = useState<string>("");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [verbMenuId, setVerbMenuId] = useState<number | null>(null);

  const [dark, setDark] = useDarkMode();

  const modalRef = useRef<HTMLDivElement>(null);

  // Add new item, interval default always 30
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setItems([
      ...(items ?? []),
      {
        id: Date.now(),
        name: name.trim(),
        replacementInterval: 30,
        lastReplaced: new Date().toISOString(),
        category,
        verb: "Replace",
      },
    ]);
    setName("");
    setInterval(30);
    setCategory("None");
  };

  const handleReplace = (id: number) => {
    setItems(
      (items ?? []).map((item) =>
        item.id === id
          ? { ...item, lastReplaced: new Date().toISOString() }
          : item
      )
    );
  };

  const handleDelete = (id: number) => {
    setItems((items ?? []).filter((item) => item.id !== id));
    setDeleteId(null);
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditLastDate(item.lastReplaced.slice(0, 10));
    const last = new Date(item.lastReplaced);
    last.setDate(last.getDate() + item.replacementInterval);
    setEditNextDate(last.toISOString().slice(0, 10));
    setEditVerb(item.verb);
  };

  const handleEditSave = (id: number) => {
    const days = calculateDaysBetween(editLastDate, editNextDate);
    setItems(
      (items ?? []).map((item) =>
        item.id === id
          ? {
              ...item,
              name: editName.trim(),
              lastReplaced: new Date(editLastDate).toISOString(),
              replacementInterval: days,
              verb: editVerb,
            }
          : item
      )
    );
    setEditingId(null);
    setEditName("");
    setEditLastDate("");
    setEditNextDate("");
    setEditVerb("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName("");
    setEditLastDate("");
    setEditNextDate("");
    setEditVerb("");
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        deleteId !== null &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setDeleteId(null);
      }
      if (verbMenuId !== null) {
        setVerbMenuId(null);
      }
    }
    if (deleteId !== null || verbMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [deleteId, verbMenuId]);

  const sortedItems = [...(items ?? [])].sort((a, b) => {
    const aLeft = calculateDaysLeft(a.lastReplaced, a.replacementInterval);
    const bLeft = calculateDaysLeft(b.lastReplaced, b.replacementInterval);
    return aLeft - bLeft;
  });

  const iconColor = dark ? "#fff" : "#000";

  return (
    <div className="App">
      <h1 className="centered-title">Replacement Tracker</h1>

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
            placeholder="Interval"
            style={{ width: 70 }}
          />
          <span className="interval-label">days</span>
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
          <button
            className="icon-btn darkmode-btn-inline"
            aria-label="Toggle dark mode"
            type="button"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? (
              <svg
                width="24"
                height="24"
                fill="none"
                stroke={iconColor}
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                fill="none"
                stroke={iconColor}
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            )}
          </button>
        </div>
      </form>

      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {(sortedItems ?? []).length === 0 && (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            No items yet. Add something to track!
          </div>
        )}
        {(sortedItems ?? []).map((item, idx) => {
          const daysLeft = calculateDaysLeft(
            item.lastReplaced,
            item.replacementInterval
          );
          const nextDate = calculateNextDate(
            item.lastReplaced,
            item.replacementInterval
          );
          const isEditing = editingId === item.id;
          return (
            <React.Fragment key={item.id}>
              <div className={`card${isEditing ? " card-editing" : ""}`}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="task-name">
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          placeholder="Rename item"
                          style={{
                            fontSize: "1.08rem",
                            fontWeight: 700,
                            minWidth: 120,
                            borderRadius: 6,
                            border: "1px solid var(--color-border)",
                            padding: "0.2rem 0.5rem",
                          }}
                        />
                      ) : (
                        <>
                          {item.name}
                          {item.category !== "None" && (
                            <span className="category">{item.category}</span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="days-left" style={{ marginTop: "0.15rem" }}>
                      {daysLeft < 0 ? (
                        <span style={{ color: "var(--color-danger)" }}>
                          {Math.abs(daysLeft)} days overdue
                        </span>
                      ) : (
                        <span>{daysLeft} days left</span>
                      )}
                    </div>
                    <div className="meta-grey" style={{ position: "relative" }}>
                      <span
                        className="verb-select"
                        tabIndex={0}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.textDecoration = "underline")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.textDecoration = "none")
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          setVerbMenuId(item.id);
                        }}
                      >
                        {isEditing ? editVerb : item.verb}
                      </span>
                      {" every "}
                      <b>
                        {isEditing
                          ? calculateDaysBetween(editLastDate, editNextDate)
                          : item.replacementInterval}
                      </b>{" "}
                      days.
                      {verbMenuId === item.id && (
                        <div
                          className="verb-menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {verbs.map((v) => (
                            <div
                              key={v}
                              className="verb-menu-item"
                              onClick={() => {
                                if (isEditing) setEditVerb(v);
                                else
                                  setItems((items) =>
                                    (items ?? []).map((i) =>
                                      i.id === item.id ? { ...i, verb: v } : i
                                    )
                                  );
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
                    className="actions-row"
                    style={{ alignItems: "flex-start", marginLeft: "0.5rem" }}
                  >
                    {!isEditing && (
                      <>
                        <button
                          className="icon-btn"
                          title="Edit"
                          aria-label="Edit"
                          onClick={() => handleEdit(item)}
                        >
                          {/* Calendar icon */}
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke={iconColor}
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </button>
                        <button
                          className="icon-btn"
                          title="Replace now"
                          aria-label="Replace now"
                          onClick={() => handleReplace(item.id)}
                        >
                          {/* Refresh icon */}
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke={iconColor}
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M4 4v5h5" />
                            <path d="M19 20v-5h-5" />
                            <path d="M5 9a9 9 0 0 1 14 6" />
                            <path d="M19 15a9 9 0 0 1-14-6" />
                          </svg>
                        </button>
                        <button
                          className="icon-btn"
                          title="Delete"
                          aria-label="Delete"
                          onClick={() => setDeleteId(item.id)}
                        >
                          {/* Trash icon */}
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke={iconColor}
                            strokeWidth="2"
                            viewBox="0 0 24 24"
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
                <div className="meta-row">
                  <div></div>
                  <div
                    className={`meta-info${isEditing ? " edit-meta-info" : ""}`}
                  >
                    {isEditing ? (
                      <>
                        <div>
                          <span className="calendar-label">Next:</span>
                          <input
                            type="date"
                            value={editNextDate}
                            onChange={(e) => setEditNextDate(e.target.value)}
                            className="calendar-date"
                          />
                        </div>
                        <div style={{ marginTop: "0.5rem" }}>
                          <span className="calendar-label">Last:</span>
                          <input
                            type="date"
                            value={editLastDate}
                            onChange={(e) => setEditLastDate(e.target.value)}
                            className="calendar-date"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        Next: {nextDate}
                        <br />
                        Last: {new Date(item.lastReplaced).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <div className="edit-btn-row">
                    <button
                      className="modal-btn"
                      onClick={() => handleEditSave(item.id)}
                    >
                      Save
                    </button>
                    <button className="modal-btn" onClick={handleEditCancel}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div className="card-divider" />
            </React.Fragment>
          );
        })}
      </div>

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

      <SpeedInsights />
    </div>
  );
};

export default App;
