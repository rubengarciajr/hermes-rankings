import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#041C1C",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            background: "#ffbd38",
            borderRadius: 88,
            boxShadow: "0 0 32px #ffbd38",
            display: "flex",
          }}
        />
      </div>
    ),
    size,
  );
}
