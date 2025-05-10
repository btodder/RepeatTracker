import React, { useState } from "react";
import useLocalStorage from "use-local-storage";
import { SpeedInsights } from "@vercel/speed-insights/react";

type Item = {
  id: number;
  name: string;
  replacementInterval: number;
  lastReplaced: string;
  category: string;
};

const categories = ["Appliances", "Car", "Home", "Personal", "Tech", "Other"];

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

function getStatusColor(daysLeft: number) {
  if (daysLeft < 0) return "border-red-600 bg-red-50";
  if (daysLeft <= 7) return "border-yellow-500 bg-yellow-50";
  return "border-green-600 bg-green-50";
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

  // Delete item
  const handleDelete = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
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
    <div className="max-w-4xl mx-auto p-4 font-sans">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-800">
        Replacement Tracker Dashboard
      </h1>

      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-2 mb-8 items-center justify-center"
      >
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          required
        />
        <input
          className="border rounded px-3 py-2 w-28"
          type="number"
          min={1}
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
          required
        />
        <span className="text-gray-600 text-sm">days</span>
        <select
          className="border rounded px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          type="submit"
        >
          Add
        </button>
      </form>

      <div className="space-y-8">
        {(sortedItems ?? []).length === 0 && (
          <div className="text-center text-gray-400">
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
          const statusColor = getStatusColor(daysLeft);

          return (
            <React.Fragment key={item.id}>
              <div
                className={`border-l-4 rounded shadow p-4 ${statusColor} flex flex-col sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="mb-2 sm:mb-0">
                  <div className="flex items-center">
                    {editingId === item.id ? (
                      <>
                        <input
                          className="border rounded px-2 py-1 text-lg mr-2"
                          value={editName}
                          onChange={handleEditChange}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditSave(item.id);
                            if (e.key === "Escape") handleEditCancel();
                          }}
                        />
                        <button
                          className="text-green-600 hover:text-green-800 mr-1"
                          title="Save"
                          onClick={() => handleEditSave(item.id)}
                        >
                          💾
                        </button>
                        <button
                          className="text-gray-500 hover:text-gray-700"
                          title="Cancel"
                          onClick={handleEditCancel}
                        >
                          ❌
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-lg">{item.name}</span>
                        <button
                          className="ml-1 text-blue-500 hover:text-blue-700 p-1 rounded"
                          title="Rename"
                          onClick={() => handleEditClick(item.id, item.name)}
                          style={{ fontSize: "1.1em" }}
                        >
                          ✏️
                        </button>
                        <button
                          className="ml-1 text-gray-500 hover:text-gray-700 p-1 rounded"
                          title="Set last or next replacement date"
                          onClick={() =>
                            handleCalendarClick(
                              item.id,
                              item.lastReplaced,
                              item.replacementInterval
                            )
                          }
                          style={{ fontSize: "1.1em" }}
                        >
                          📅
                        </button>
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-200">
                          {item.category}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    Replace every {item.replacementInterval} days. Last
                    replaced: {new Date(item.lastReplaced).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="font-bold text-lg">
                    {daysLeft < 0 ? (
                      <span className="text-red-600">
                        Overdue by {Math.abs(daysLeft)} days
                      </span>
                    ) : (
                      <span>
                        {daysLeft}{" "}
                        <span className="font-normal text-base">days</span> left
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Next: {nextDate}</div>
                  <div className="flex space-x-2 mt-2">
                    <button
                      className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
                      onClick={() => handleReplace(item.id)}
                    >
                      Replace Now
                    </button>
                    <button
                      className="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar date picker modal/inline */}
              {calendarId === item.id && (
                <div className="flex flex-col sm:flex-row items-center mt-2 space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-gray-700 text-sm">
                      Last replaced:
                    </label>
                    <input
                      type="date"
                      className="border rounded px-2 py-1"
                      value={calendarLastDate}
                      onChange={handleCalendarLastChange}
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-gray-700 text-sm">
                      Next replacement:
                    </label>
                    <input
                      type="date"
                      className="border rounded px-2 py-1"
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

              {/* Divider line between items */}
              {idx < arr.length - 1 && (
                <hr className="my-8 border-t border-gray-300" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <SpeedInsights />
    </div>
  );
};

export default App;
