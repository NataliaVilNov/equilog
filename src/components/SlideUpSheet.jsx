// The bottom-sheet backdrop + slide-up panel chrome, extracted here because the weekly
// board's new note/done/vet sheets would otherwise be the 4th-6th near-identical copy of
// this markup (StablePanel.jsx and UserPanel.jsx each already build it inline; MorePanel.jsx
// established the .sheet-overlay/.sheet/.sheet-head classes this reuses). StablePanel/
// UserPanel are not migrated to this component here — out of scope for this change, just an
// opportunity now available.
export function SlideUpSheet({ title, onClose, children }) {
  return (
    <div
      className="sheet-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="ib" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
