import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 12,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            background: "#ffbd38",
            borderRadius: 28,
            boxShadow: "0 0 16px #ffbd38",
            display: "flex",
          }}
        />
      </div>
    ),
    size,
  );
}
