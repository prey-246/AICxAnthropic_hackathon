export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="tabs-wrap">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`tab-btn ${activeTab === tab ? "active" : ""}`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
