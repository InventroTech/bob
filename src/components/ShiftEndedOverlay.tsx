/** Full-screen notice shown by useShiftAutoLogout right before it logs the RM out. */

export function ShiftEndedOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 max-w-sm rounded-lg bg-white p-8 text-center shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Your shift has ended</h2>
        <p className="mt-2 text-sm text-slate-600">Logging you out...</p>
      </div>
    </div>
  );
}
