import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#222",
          borderRadius: 8,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: "#FF2D55",
            lineHeight: 1,
            fontFamily: "system-ui",
          }}
        >
          S
        </span>
      </div>
    ),
    { ...size },
  );
}
