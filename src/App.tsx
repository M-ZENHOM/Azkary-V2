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
  const [intervalUnit, setIntervalUnit] = useState<"seconds" | "minutes" | "hours">("minutes");
  const [intervalValue, setIntervalValue] = useState<number | string>("");

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

  useEffect(() => {
    if (data) {
      const currentSecondsInState = 
        intervalUnit === "hours" ? Number(intervalValue) * 3600 :
        intervalUnit === "minutes" ? Number(intervalValue) * 60 :
        Number(intervalValue);
      
      if (Math.abs(currentSecondsInState - data.interval_seconds) > 0.5) {
         if (data.interval_seconds % 3600 === 0) {
           setIntervalUnit("hours");
           setIntervalValue(data.interval_seconds / 3600);
         } else if (data.interval_seconds % 60 === 0) {
           setIntervalUnit("minutes");
           setIntervalValue(data.interval_seconds / 60);
         } else {
           setIntervalUnit("seconds");
           setIntervalValue(data.interval_seconds);
         }
      }
    }
  }, [data]);

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

  const updateInterval = async (val: number, unit: string) => {
    let seconds = 0;
    if (unit === "hours") seconds = val * 3600;
    else if (unit === "minutes") seconds = val * 60;
    else seconds = val;

    seconds = Math.round(seconds);
    if (seconds < 1) return;

    try {
      const result = await invoke<AppData>("set_interval", { seconds });
      setData(result);
    } catch (error) {
      console.error("Failed to set interval:", error);
    }
  };

  const handleIntervalValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIntervalValue(val);
    
    const num = parseFloat(val);
    if (!isNaN(num)) {
      updateInterval(num, intervalUnit);
    }
  };

  const handleIntervalUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as "seconds" | "minutes" | "hours";
    const currentVal = Number(intervalValue);
    
    let seconds = 0;
    if (intervalUnit === "hours") seconds = currentVal * 3600;
    else if (intervalUnit === "minutes") seconds = currentVal * 60;
    else seconds = currentVal;

    if (data && Math.abs(seconds - data.interval_seconds) < 0.5) {
      seconds = data.interval_seconds;
    }
    
    let newVal = 0;
    if (newUnit === "hours") newVal = seconds / 3600;
    else if (newUnit === "minutes") newVal = seconds / 60;
    else newVal = seconds;
    
    newVal = Math.round(newVal * 10000) / 10000;
    
    setIntervalUnit(newUnit);
    setIntervalValue(newVal);
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
            <label>Notification Interval:</label>
            <div className="interval-input-group">
              <input
                type="number"
                min="0.1"
                step="any"
                value={intervalValue}
                onChange={handleIntervalValueChange}
                className="interval-input"
              />
              <select 
                value={intervalUnit} 
                onChange={handleIntervalUnitChange}
                className="interval-select"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>
          <div className="setting-item">
            <label htmlFor="autostart-toggle">Run on Startup</label>
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
