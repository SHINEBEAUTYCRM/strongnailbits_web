"use client";

export default function SaveButton() {
  return (
    <button
      onClick={() =>
        (window as /* eslint-disable-line @typescript-eslint/no-explicit-any */ any).__shineBoardSave?.()
      }
      style={{
        background: "#a855f7",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "6px 16px",
        fontSize: 13,
        fontFamily: "Outfit, sans-serif",
        cursor: "pointer",
        fontWeight: 500,
      }}
    >
      Зберегти
    </button>
  );
}
