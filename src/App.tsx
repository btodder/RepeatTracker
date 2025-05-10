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

const App: React.FC = () => {
  const [items, setItems] = useLocalStorage<Item[]>("items", [
    {
      id: 1,
      name: "Water Filter",
      replacementInterval: 90,
      lastReplaced: "2025-04-01",
      category: "Home",
    },
    {
      id: 2,
      name: "HVAC Filter",
      replacementInterval: 180,
      lastReplaced: "2025-03-15",
      category: "Home",
    },
    {
      id: 3,
      name: "Toothbrush",
      replacementInterval: 90,
      lastReplaced: "2025-02-20",
      category: "Personal",
    },
    {
      id: 4,
      name: "Contact Lenses",
      replacementInterval: 30,
      lastReplaced: "2025-04-25",
      category: "Personal",
    },
    {
      id: 5,
      name: "Car Oil Change",
      replacementInterval: 120,
      lastReplaced: "2025-01-10",
      category: "Auto",
    },
  ]);

  const [newItem, setNewItem] = useState<Omit<Item, "id">>({
    name: "",
    replacementInterval: 90,
    lastReplaced: new Date().toISOString().split("T")[0],
    category: "Home",
  });

  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("daysLeft");

  const calculateDaysLeft = (
    lastReplaced: string,
    interval: number
  ): number => {
    const lastDate = new Date(lastReplaced);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + interval);

    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateNextDate = (
    lastReplaced: string,
    interval: number
  ): string => {
    const lastDate = new Date(lastReplaced);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + interval);
    return nextDate.toLocaleDateString();
  };

  const handleAddItem = () => {
    if (newItem.name.trim() === "") return;

    setItems([
      ...items,
      {
        id: items.length + 1,
        ...newItem,
      },
    ]);

    setNewItem({
      name: "",
      replacementInterval: 90,
      lastReplaced: new Date().toISOString().split("T")[0],
      category: "Home",
    });
  };

  const handleReplace = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, lastReplaced: new Date().toISOString().split("T")[0] }
          : item
      )
    );
  };

  const handleDelete = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const getStatusColor = (daysLeft: number): string => {
    if (daysLeft < 0) return "bg-red-100 border-red-500";
    if (daysLeft < 7) return "bg-orange-100 border-orange-500";
    if (daysLeft < 30) return "bg-yellow-100 border-yellow-500";
    return "bg-green-100 border-green-500";
  };

  const filteredItems =
    filterCategory === "All"
      ? items
      : items.filter((item) => item.category === filterCategory);

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "daysLeft") {
      return (
        calculateDaysLeft(a.lastReplaced, a.replacementInterval) -
        calculateDaysLeft(b.lastReplaced, b.replacementInterval)
      );
    } else if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "category") {
      return a.category.localeCompare(b.category);
    }
    return 0;
  });

  const categories = [
    "All",
    ...Array.from(new Set(items.map((item) => item.category))),
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-800">
        Replacement Tracker Dashboard
      </h1>
      {/* Add new item form */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Add New Item</h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Item name"
              className="w-full p-2 border rounded"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            />
          </div>
          <div className="w-32">
            <input
              type="number"
              placeholder="Days"
              className="w-full p-2 border rounded"
              value={newItem.replacementInterval}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  replacementInterval: Number(e.target.value),
                })
              }
            />
          </div>
          <div className="w-40">
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={newItem.lastReplaced}
              onChange={(e) =>
                setNewItem({ ...newItem, lastReplaced: e.target.value })
              }
            />
          </div>
          <div className="w-32">
            <select
              className="w-full p-2 border rounded"
              value={newItem.category}
              onChange={(e) =>
                setNewItem({ ...newItem, category: e.target.value })
              }
            >
              <option value="Home">Home</option>
              <option value="Personal">Personal</option>
              <option value="Auto">Auto</option>
              <option value="Tech">Tech</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={handleAddItem}
          >
            Add
          </button>
        </div>
      </div>
      {/* Filters and sorting */}
      <div className="flex justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Category:</span>
          <select
            className="p-1 border rounded"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map((category: string) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Sort by:</span>
          <select
            className="p-1 border rounded"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="daysLeft">Days Left</option>
            <option value="name">Name</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>
      {/* Items list */}
      <div className="space-y-3">
        {sortedItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No items found. Add some items to track!
          </p>
        ) : (
          sortedItems.map((item: Item) => {
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
              <div
                key={item.id}
                className={`border-l-4 rounded shadow p-4 ${statusColor} flex flex-col sm:flex-row sm:items-center sm:justify-between`}
              >
                <div className="mb-2 sm:mb-0">
                  <div className="flex items-center">
                    <span className="font-medium text-lg">{item.name}</span>
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-200">
                      {item.category}
                    </span>
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
                      <span>{daysLeft} days left</span>
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
            );
          })
        )}
      </div>
      <SpeedInsights /> {/* <-- Add this just before the closing div */}
    </div>
  );
};

export default App;
