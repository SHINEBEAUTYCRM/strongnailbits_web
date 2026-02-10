import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#222",
          borderRadius: 40,
        }}
      >
        <span
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: "#FF2D55",
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
