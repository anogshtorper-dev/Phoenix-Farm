export default function TabNavigation({ activeTab, onTabChange, tabs }) {
  return (
    <div className="flex gap-6 border-b border-slate-200 mb-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 font-medium text-sm transition-all ${
            activeTab === tab.id
              ? 'text-slate-900 border-b-2 border-slate-800 -mb-4 pb-4'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}