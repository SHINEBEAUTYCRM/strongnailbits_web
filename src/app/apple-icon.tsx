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
          borderRadius: 36,
          background: "linear-gradient(135deg, #FF3B5C 0%, #B8203F 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: "white",
            lineHeight: 1,
          }}
        >
          S
        </span>
      </div>
    ),
    { ...size },
  );
}
