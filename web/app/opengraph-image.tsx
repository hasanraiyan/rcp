import { ImageResponse } from "next/og";

export const alt = "RCP — Your REST API is already the tool.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#0d0f12",
          color: "#eceee8",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: "#f0a93d",
            }}
          />
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>RCP</div>
          <div style={{ fontSize: 20, color: "#9aa0aa" }}>REST Connector Protocol</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 56, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.1 }}>
            <div style={{ display: "flex" }}>Your REST API is</div>
            <div style={{ display: "flex" }}>already the tool.</div>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 22, color: "#9aa0aa" }}>
            <span style={{ color: "#5b9ae8" }}>GET</span>
            <span>/manifest</span>
            <span style={{ color: "#4fbb86" }}>200</span>
            <span style={{ marginLeft: 16 }}>→</span>
            <span style={{ color: "#4fbb86" }}>POST</span>
            <span>/orders</span>
            <span style={{ color: "#4fbb86" }}>200</span>
          </div>
        </div>

        <div style={{ fontSize: 18, color: "#9aa0aa" }}>rcp.hasanraiyan.me</div>
      </div>
    ),
    { ...size },
  );
}
