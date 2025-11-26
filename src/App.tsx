import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

interface Zekr {
  id: string;
  text: string;
}

interface AppData {
  azkar: Zekr[];
  interval_seconds: number;
  daily_count: number;
  last_reset_date: string;
  last_notification_time: number;
}

function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [newZekr, setNewZekr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [autostart, setAutostart] = useState(false);

  const fetchData = async () => {
    try {
      const result = await invoke<AppData>("get_data");
      setData(result);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const fetchAutostart = async () => {
    try {
      const result = await invoke<boolean>("get_autostart");
      setAutostart(result);
    } catch (error) {
      console.error("Failed to fetch autostart:", error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAutostart();

    const unlisten = listen("data-updated", () => {
      fetchData();
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleAddZekr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZekr.trim()) return;
    try {
      const result = await invoke<AppData>("add_zekr", { text: newZekr });
      setData(result);
      setNewZekr("");
    } catch (error) {
      console.error("Failed to add zekr:", error);
    }
  };

  const handleRemoveZekr = async (id: string) => {
    try {
      const result = await invoke<AppData>("remove_zekr", { id });
      setData(result);
    } catch (error) {
      console.error("Failed to remove zekr:", error);
    }
  };

  const startEditing = (zekr: Zekr) => {
    setEditingId(zekr.id);
    setEditText(zekr.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    try {
      const result = await invoke<AppData>("update_zekr", { id, text: editText });
      setData(result);
      setEditingId(null);
      setEditText("");
    } catch (error) {
      console.error("Failed to update zekr:", error);
    }
  };

  const handleIntervalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (val > 0) {
      try {
        const result = await invoke<AppData>("set_interval", { seconds: val });
        setData(result);
      } catch (error) {
        console.error("Failed to set interval:", error);
      }
    }
  };

  const handleAutostartToggle = async () => {
    try {
      await invoke("set_autostart", { enable: !autostart });
      setAutostart(!autostart);
    } catch (error) {
      console.error("Failed to set autostart:", error);
    }
  };

  if (!data) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <header>
        <h1>Azkar App</h1>
        <div className="stats">
          <div className="stat-box">
            <span className="stat-label">Today's Azkar</span>
            <span className="stat-value">{data.daily_count}</span>
          </div>
        </div>
      </header>

      <main>
        <section className="settings-section">
          <h2>Settings</h2>
          <div className="setting-item">
            <label>Notification Interval (seconds):</label>
            <input
              type="number"
              min="1"
              value={data.interval_seconds}
              onChange={handleIntervalChange}
            />
          </div>
          <div className="setting-item">
            <span>Start with Windows:</span>
            <div className="toggle-wrapper">
              <input
                type="checkbox"
                id="autostart-toggle"
                checked={autostart}
                onChange={handleAutostartToggle}
              />
              <label htmlFor="autostart-toggle"></label>
            </div>
          </div>
        </section>

        <section className="azkar-section">
          <h2>My Azkar List</h2>
          <form onSubmit={handleAddZekr} className="add-form">
            <input
              type="text"
              placeholder="Add new Zekr..."
              value={newZekr}
              onChange={(e) => setNewZekr(e.target.value)}
            />
            <button type="submit">Add</button>
          </form>
          <ul className="azkar-list">
            {data.azkar.map((zekr) => (
              <li key={zekr.id}>
                {editingId === zekr.id ? (
                  <div className="edit-mode">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(zekr.id)} className="save-btn">✓</button>
                    <button onClick={cancelEditing} className="cancel-btn">✕</button>
                  </div>
                ) : (
                  <>
                    <span onClick={() => startEditing(zekr)} className="zekr-text" title="Click to edit">
                      {zekr.text}
                    </span>
                    <button onClick={() => handleRemoveZekr(zekr.id)} className="delete-btn">
                      ×
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
