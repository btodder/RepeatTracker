import React, { useState, useEffect } from "react";
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

// Dark mode hook
function useDarkMode() {
  const [dark, setDark] = useState(
    () =>
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    if (dark) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
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

  // Add new item
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setItems([
      ...items,
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
      items.map((item) =>
        item.id === id
          ? { ...item, lastReplaced: new Date().toISOString() }
          : item
      )
    );
  };

  // Delete item (after confirmation)
  const handleDelete = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
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
    setItems((items) =>
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

  const handleCalendarLastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCalendarLastDate(e.target.value);
    // Update next replacement date to match new last replaced + interval
    if (calendarId !== null) {
      const item = items.find((i) => i.id === calendarId);
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
      const item = items.find((i) => i.id === calendarId);
      if (item) {
        const next = new Date(e.target.value);
        next.setDate(next.getDate() - item.replacementInterval);
        setCalendarLastDate(next.toISOString().slice(0, 10));
      }
    }
  };

  const handleCalendarSave = (id: number) => {
    setItems((items) =>
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
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            margin: "1.5rem 0",
            color: dark ? "#f5f5f5" : "#23272f",
          }}
        >
          Replacement Tracker
        </h1>
        <button
          className="icon-btn"
          aria-label="Toggle dark mode"
          onClick={() => setDark((d) => !d)}
          style={{ fontSize: "1.5rem" }}
        >
          {dark ? "🌙" : "☀️"}
        </button>
      </div>

      <form
        onSubmit={handleAdd}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "2.5rem",
          maxWidth: 700,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
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
          style={{ width: 80 }}
        />
        <span style={{ color: dark ? "#f5f5f5" : "#23272f", fontSize: "1rem" }}>
          days
        </span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
        <button className="replace-btn" type="submit">
          Add
        </button>
      </form>

      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {(sortedItems ?? []).length === 0 && (
          <div
            style={{
              color: dark ? "#888" : "#bbb",
              textAlign: "center",
              marginTop: "3rem",
            }}
          >
            No items yet. Add something to track!
          </div>
        )}
        {(sortedItems ?? []).map((item, idx, arr) => {
          const daysLeft = calculateDaysLeft(
            item.lastReplaced,
            item.replacementInterval
          );
          const nextDate = calculateNextDate(
            item.lastReplaced,
            item.replacementInterval
          );

          return (
            <React.Fragment key={item.id}>
              <div className="card">
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditSave(item.id);
                            if (e.key === "Escape") handleEditCancel();
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
                        <button
                          className="icon-btn"
                          title="Cancel"
                          onClick={handleEditCancel}
                        >
                          ❌
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                          {item.name}
                        </span>
                        {item.category !== "None" && (
                          <span
                            style={{
                              marginLeft: 4,
                              padding: "2px 8px",
                              borderRadius: 8,
                              background: dark ? "#444" : "#eee",
                              color: dark ? "#f5f5f5" : "#23272f",
                              fontSize: "0.85rem",
                            }}
                          >
                            {item.category}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      color: dark ? "#ccc" : "#666",
                      fontSize: "0.97rem",
                      marginTop: 2,
                    }}
                  >
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
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color:
                        daysLeft < 0
                          ? dark
                            ? "#ff7b7b"
                            : "#d32f2f"
                          : dark
                          ? "#f5f5f5"
                          : "#23272f",
                    }}
                  >
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
                  <div
                    style={{
                      color: dark ? "#ccc" : "#666",
                      fontSize: "0.97rem",
                    }}
                  >
                    Next: {nextDate}
                  </div>
                  <div className="actions-row">
                    {editingId !== item.id && (
                      <>
                        <button
                          className="icon-btn"
                          title="Rename"
                          aria-label="Edit"
                          onClick={() => handleEditClick(item.id, item.name)}
                        >
                          {/* Pencil SVG, black/white */}
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M15.232 5.232l3.536 3.536M9 13l6.071-6.071a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.943l-4.243 1.414 1.414-4.243a4 4 0 01.943-1.414z" />
                          </svg>
                        </button>
                        <button
                          className="icon-btn"
                          title="Set last or next replacement date"
                          aria-label="Calendar"
                          onClick={() =>
                            handleCalendarClick(
                              item.id,
                              item.lastReplaced,
                              item.replacementInterval
                            )
                          }
                        >
                          {/* Calendar SVG, black/white */}
                          <svg
                            width="20"
                            height="20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <path d="M16 2v4M8 2v4M3 10h18" />
                          </svg>
                        </button>
                        <button
                          className="replace-btn"
                          onClick={() => handleReplace(item.id)}
                        >
                          Replace
                        </button>
                        <button
                          className="delete-btn"
                          title="Delete"
                          aria-label="Delete"
                          onClick={() => setDeleteId(item.id)}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Calendar date picker inline */}
                {calendarId === item.id && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "1rem",
                      alignItems: "center",
                      marginTop: "1.1rem",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <label style={{ fontSize: "0.97rem" }}>
                        Last replaced:
                      </label>
                      <input
                        type="date"
                        value={calendarLastDate}
                        onChange={handleCalendarLastChange}
                        max={new Date().toISOString().slice(0, 10)}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <label style={{ fontSize: "0.97rem" }}>
                        Next replacement:
                      </label>
                      <input
                        type="date"
                        value={calendarNextDate}
                        onChange={handleCalendarNextChange}
                        min={calendarLastDate}
                      />
                    </div>
                    <button
                      className="icon-btn"
                      title="Save date"
                      onClick={() => handleCalendarSave(item.id)}
                    >
                      💾
                    </button>
                    <button
                      className="icon-btn"
                      title="Cancel"
                      onClick={handleCalendarCancel}
                    >
                      ❌
                    </button>
                  </div>
                )}
              </div>
              {idx < arr.length - 1 && <hr />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteId !== null && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2
              style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: 12 }}
            >
              Delete Item?
            </h2>
            <p style={{ marginBottom: 24 }}>
              Are you sure you want to delete this item? This action cannot be
              undone.
            </p>
            <div
              style={{ display: "flex", gap: "1rem", justifyContent: "center" }}
            >
              <button
                className="replace-btn"
                style={{ background: "#ededed", color: "#23272f" }}
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="delete-btn"
                style={{
                  background: "#111",
                  color: "#fff",
                  borderColor: "#111",
                }}
                onClick={() => handleDelete(deleteId)}
              >
                ×
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
