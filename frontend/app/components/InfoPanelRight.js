// InfoPanelRight.js
import React, { useState } from "react";

export default function InfoPanelRight({ selected, clusters, dbscan, similarities,setHighlightNodes }) {
  const [page, setPage] = useState(0);
  const [activeCluster, setActiveCluster] = useState(null);
  const [activeDbscan, setActiveDbscan] = useState(null);
  const [showSubgroupWindow, setShowSubgroupWindow] = useState(false);
  const [currentSubgroup, setCurrentSubgroup] = useState(null);
  //const [highlightNodes, setHighlightNodes] = useState(null);

  const clustersPerPage = 2;
  const totalPages = clusters ? Math.ceil(clusters.length / clustersPerPage) : 1;
  const displayedClusters = clusters?.slice(page * clustersPerPage, page * clustersPerPage + clustersPerPage) || [];

    const labels = [
  "Total TX Count",
  "First Block timestamp",
  "First Funding Amount"
];

const labeledVector = selected?.data?.behavior_vector.map(
  (value, index) => `${labels[index] || `Feature ${index + 1}`}: ${value}`
);

  // Subgroup 窗口拖动
  const makeDraggable = (e) => {
    const div = e.currentTarget;
    div.style.cursor = "grabbing";
    const startX = e.clientX - div.offsetLeft;
    const startY = e.clientY - div.offsetTop;

    function onMouseMove(eMove) {
      div.style.left = `${eMove.clientX - startX}px`;
      div.style.top = `${eMove.clientY - startY}px`;
    }
    function onMouseUp() {
      div.style.cursor = "grab";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
<div
  style={{
    width: 350,
    height: "90vh",
    background: "#1c1c1c",
    padding: 14,
    borderRadius: 15,
    overflowY: "auto",
  }}
>
  <h3>Info Panel</h3>

  {!selected && !activeCluster && (
    <p style={{ opacity: 0.6 }}>Click node or edge</p>
  )}

 {selected?.type === "node" && (
        <>
          <p><b>Wallet</b></p>
          <p style={{ fontSize: 12 }}>{selected.data.id}</p>

          <p><b>Behavior Vector</b></p>
          <pre style={{ fontSize: 11 }}>
            {labeledVector.join("\n")}
          </pre>
          <br/>

          <p><b>Variant</b></p>
          <pre style={{ fontSize: 11 }}>
            {selected.data.variant}
          </pre>
        </>
      )}

  {/* Edge info */}
  {selected?.type === "edge" && (
    <>
      <p><b>Funding Edge</b></p>
      <p style={{ fontSize: 12 }}>
        {(selected.data.source?.id || selected.data.source)} → {(selected.data.target?.id || selected.data.target)}
      </p>
      <p>Amount: {selected.data.amount}</p>
      <p>{selected.data.timestamp}</p>
    </>
  )}

  {/* Cluster list */}
  {clusters && !activeCluster && (
    <>
      <p
        style={{
          fontWeight: 600,
          marginBottom: 12,
          color: "#fff",
          fontSize: 14,
        }}
      >
        Clusters (Page {page + 1}/{totalPages})
      </p>

      {displayedClusters.map((cluster, idx) => (
        <div
          key={idx}
          onClick={() => setActiveCluster(cluster)}
          style={{
            marginBottom: 10,
            padding: 12,
            background: "linear-gradient(90deg, #222 0%, #2a2a2a 100%)",
            borderRadius: 8,
            cursor: "pointer",
            boxShadow: "0 2px 5px rgba(0,0,0,0.5)",
            transition: "transform 0.15s ease, background 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
            e.currentTarget.style.background =
              "linear-gradient(90deg, #333 0%, #3a3a3a 100%)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.background =
              "linear-gradient(90deg, #222 0%, #2a2a2a 100%)";
          }}
        >
          <span style={{ color: "#FFD700", fontWeight: 600 }}>
            Cluster {page * clustersPerPage + idx + 1}
          </span>{" "}
          <span style={{ color: "#ccc" }}>({cluster.length} wallets)</span>
        </div>
      ))}

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
        <button
          onClick={() => setPage(Math.max(page - 1, 0))}
          disabled={page === 0}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "none",
            background: page === 0 ? "#555" : "linear-gradient(90deg, #444, #666)",
            color: "#fff",
            cursor: page === 0 ? "not-allowed" : "pointer",
          }}
        >
          Prev
        </button>
        <button
          onClick={() => setPage(Math.min(page + 1, totalPages - 1))}
          disabled={page >= totalPages - 1}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "none",
            background:
              page >= totalPages - 1
                ? "#555"
                : "linear-gradient(90deg, #444, #666)",
            color: "#fff",
            cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </>
  )}

  {/* Active Cluster */}
  {activeCluster && !activeDbscan && (
    <>
      <p
        style={{
          fontWeight: 600,
          marginBottom: 8,
          color: "#fff",
          fontSize: 14,
        }}
      >
        Cluster Detail ({activeCluster.length} wallets)
      </p>

      <div
        style={{
          maxHeight: 240,
          overflowY: "auto",
          padding: 10,
          background: "#1a1a1a",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        <pre
          style={{
            fontSize: 12,
            color: "#ddd",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {activeCluster.join("\n")}
        </pre>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <button
          onClick={() => setActiveCluster(null)}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "none",
            background: "linear-gradient(90deg, #444, #666)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Back to clusters
        </button>
        <button
          onClick={() => {
            const idx = clusters.findIndex(
              (c) => JSON.stringify(c) === JSON.stringify(activeCluster)
            );
            setActiveDbscan(dbscan[idx]);
          }}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "none",
            background: "linear-gradient(90deg,#0066ff,#0099ff)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          DBSCAN
        </button>
      </div>
    </>
  )}

  {/* DBSCAN Subgroups */}
  {activeDbscan && (
    <>
      <p
        style={{
          fontWeight: 600,
          marginBottom: 8,
          color: "#fff",
          fontSize: 14,
        }}
      >
        DBSCAN Subgroups
      </p>

      {!showSubgroupWindow && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {Object.entries(activeDbscan.subgroups).map(([label, wallets]) => (
            <button
              key={label}
              onClick={() => {
                setCurrentSubgroup(wallets);
                setHighlightNodes(new Set(wallets));
                setShowSubgroupWindow(true);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: "#222",
                color: "#FFD700",
                cursor: "pointer",
              }}
            >
              Subgroup {label} ({wallets.length})
            </button>
          ))}

          {activeDbscan.noise.length > 0 && (
            <button
              onClick={() => {
                setCurrentSubgroup(activeDbscan.noise);
                setHighlightNodes(new Set(activeDbscan.noise));
                setShowSubgroupWindow(true);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                background: "#400",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Noise ({activeDbscan.noise.length})
            </button>
          )}
        </div>
      )}

      {showSubgroupWindow && currentSubgroup && (
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "20%",
            width: 400,
            height: 300,
            background: "#1a1a1a",
            padding: 16,
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.8)",
            overflowY: "auto",
            zIndex: 9999,
            cursor: "grab",
          }}
          onMouseDown={makeDraggable}
        >
          <p style={{ fontWeight: 600, color: "#fff", marginBottom: 12 }}>
            Addresses ({currentSubgroup.length})
          </p>
          <pre
            style={{
              fontSize: 12,
              color: "#ccc",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {currentSubgroup.join("\n")}
          </pre>
          <button
            onClick={() => {
              setShowSubgroupWindow(false);
              setActiveDbscan(null);
              setHighlightNodes(null);
              setCurrentSubgroup(null);
            }}
            style={{
              marginTop: 12,
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              background: "linear-gradient(90deg,#444,#666)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>
      )}
    </>
  )}

  {/* Similarities */}
  {selected?.type === "node" && similarities && (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>Top Similar Wallets</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {["behavior", "variant", "weighted"].map((type) => (
          <div
            key={type}
            style={{
              flex: 1,
              minWidth: 140,
              background: "#1f1f1f",
              borderRadius: 6,
              padding: 10,
              maxHeight: 160,
              overflowY: "auto",
              boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
              marginTop: type === "weighted" ? 8 : 0,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, color: "#aaa" }}>
              {type === "weighted" ? "Weighted Similarity (≥80%)" : type.charAt(0).toUpperCase() + type.slice(1)}
            </p>
            <ul style={{ paddingLeft: 16, fontSize: 11, margin: 0 }}>
              {Object.entries(similarities[type])
                .filter(([key, sim]) => key.includes(selected.data.id) && (type !== "weighted" || sim >= 0.70))
                .sort((a, b) => b[1] - a[1])
                .map(([key, sim]) => {
                  const other = key.replace(selected.data.id, "").replace("-", "").replace(",", "");
                  return (
                    <li key={key} style={{ marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                      <span>{other}</span>
                      <span
                        style={{
                          background: "#333",
                          color: "#0f0",
                          padding: "0 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {sim.toFixed(3)}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
  );
}