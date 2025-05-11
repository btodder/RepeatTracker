import React, { useState } from "react";
import useLocalStorage from "use-local-storage";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Dark mode hook (simple version)
function useDarkMode() {
  const [dark, setDark] = useState(
    () =>
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  React.useEffect(() => {
    document.body.classList.toggle("dark-mode", dark);
    document.body.classList.toggle("light-mode", !dark);
  }, [dark]);
  return [dark, setDark] as const;
}

type Item = {
  id: number;
  name: string;
  replacementInterval: number;
  lastReplaced: string;
  category: string;
};

const categories = ["Hygiene", "Expiration", "Performance", "None"];

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

function getStatusColor(daysLeft: number, dark: boolean) {
  if (daysLeft < 0)
    return dark ? "border-red-500 bg-red-900/40" : "border-red-600 bg-red-50";
  if (daysLeft <= 7)
    return dark
      ? "border-yellow-500 bg-yellow-900/40"
      : "border-yellow-500 bg-yellow-50";
  return dark
    ? "border-green-500 bg-green-900/40"
    : "border-green-600 bg-green-50";
}

const App: React.FC = () => {
  const [items, setItems] = useLocalStorage<Item[]>("replacement-items", []);
  const [name, setName] = useState("");
  const [interval, setInterval] = useState(30);
  const [category, setCategory] = useState(categories[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>("");
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
    <div className="max-w-3xl mx-auto p-4 font-sans min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Replacement Tracker
        </h1>
        <button
          className="rounded-full px-3 py-1 border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          onClick={() => setDark((d) => !d)}
          aria-label="Toggle dark mode"
        >
          {dark ? "🌙" : "☀️"}
        </button>
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-2 mb-8 items-center justify-center"
      >
        <input
          className="border rounded px-3 py-2 flex-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          required
        />
        <input
          className="border rounded px-3 py-2 w-24 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          type="number"
          min={1}
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
          required
        />
        <span className="text-gray-600 dark:text-gray-300 text-sm">days</span>
        <select
          className="border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition font-semibold"
          type="submit"
        >
          Add
        </button>
      </form>

      <div className="space-y-10">
        {(sortedItems ?? []).length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500">
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
          const statusColor = getStatusColor(daysLeft, dark);

          return (
            <React.Fragment key={item.id}>
              <div
                className={`border-l-4 rounded-xl shadow-md px-6 py-5 ${statusColor} flex flex-col gap-2`}
                style={{ background: dark ? "#23272f" : "#fff" }}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    {editingId === item.id ? (
                      <>
                        <input
                          className="border rounded px-2 py-1 text-lg mr-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                          value={editName}
                          onChange={handleEditChange}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditSave(item.id);
                            if (e.key === "Escape") handleEditCancel();
                          }}
                        />
                        <button
                          className="text-green-600 hover:text-green-800 mr-1 h-8 w-8 flex items-center justify-center rounded"
                          title="Save"
                          style={{ fontSize: "1.2em" }}
                          onClick={() => handleEditSave(item.id)}
                        >
                          💾
                        </button>
                        <button
                          className="text-gray-500 hover:text-gray-700 h-8 w-8 flex items-center justify-center rounded"
                          title="Cancel"
                          style={{ fontSize: "1.2em" }}
                          onClick={handleEditCancel}
                        >
                          ❌
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          {item.name}
                        </span>
                        {item.category !== "None" && (
                          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {item.category}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Replace every <strong>{item.replacementInterval}</strong>{" "}
                    days. Last replaced:{" "}
                    {new Date(item.lastReplaced).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
                  <div className="font-bold text-lg text-gray-800 dark:text-gray-200">
                    {daysLeft < 0 ? (
                      <span className="text-red-600 dark:text-red-400">
                        Overdue by {Math.abs(daysLeft)} days
                      </span>
                    ) : (
                      <span>
                        {daysLeft}{" "}
                        <span className="font-normal text-base">days</span> left
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-0">
                    Next: {nextDate}
                  </div>
                  {/* Action buttons row */}
                  <div className="flex flex-row gap-2 items-center">
                    {/* Edit */}
                    {editingId !== item.id && (
                      <button
                        className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        title="Rename"
                        aria-label="Edit"
                        onClick={() => handleEditClick(item.id, item.name)}
                        style={{ fontSize: "1.2em" }}
                      >
                        ✏️
                      </button>
                    )}
                    {/* Calendar */}
                    {editingId !== item.id && (
                      <button
                        className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        title="Set last or next replacement date"
                        aria-label="Calendar"
                        onClick={() =>
                          handleCalendarClick(
                            item.id,
                            item.lastReplaced,
                            item.replacementInterval
                          )
                        }
                        style={{ fontSize: "1.2em" }}
                      >
                        📅
                      </button>
                    )}
                    {/* Replace Now */}
                    {editingId !== item.id && (
                      <button
                        className="h-8 px-3 flex items-center justify-center rounded bg-green-500 text-white hover:bg-green-600 transition text-sm font-semibold"
                        onClick={() => handleReplace(item.id)}
                      >
                        Replace
                      </button>
                    )}
                    {/* Delete */}
                    {editingId !== item.id && (
                      <button
                        className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                        title="Delete"
                        aria-label="Delete"
                        onClick={() => setDeleteId(item.id)}
                        style={{
                          fontSize: "1.3em",
                          color: "#111",
                          background: "none",
                          border: "none",
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Calendar date picker inline */}
                {calendarId === item.id && (
                  <div className="flex flex-col sm:flex-row items-center mt-2 space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-gray-700 dark:text-gray-300 text-sm">
                        Last replaced:
                      </label>
                      <input
                        type="date"
                        className="border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        value={calendarLastDate}
                        onChange={handleCalendarLastChange}
                        max={new Date().toISOString().slice(0, 10)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-gray-700 dark:text-gray-300 text-sm">
                        Next replacement:
                      </label>
                      <input
                        type="date"
                        className="border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        value={calendarNextDate}
                        onChange={handleCalendarNextChange}
                        min={calendarLastDate}
                      />
                    </div>
                    <button
                      className="text-green-600 hover:text-green-800"
                      title="Save date"
                      onClick={() => handleCalendarSave(item.id)}
                    >
                      💾
                    </button>
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      title="Cancel"
                      onClick={handleCalendarCancel}
                    >
                      ❌
                    </button>
                  </div>
                )}
              </div>
              {/* Divider line between items */}
              {idx < arr.length - 1 && (
                <hr className="my-8 border-t border-gray-300 dark:border-gray-700" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-xs text-center">
            <h2 className="font-bold text-lg mb-3 text-gray-900 dark:text-gray-100">
              Delete Item?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-5">
              Are you sure you want to delete this item? This action cannot be
              undone.
            </p>
            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-600"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-black text-white hover:bg-red-600"
                onClick={() => handleDelete(deleteId)}
              >
                Delete
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
