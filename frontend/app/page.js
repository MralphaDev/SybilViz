"use client";

import { useState, useEffect } from "react";
import GraphCanvas from "./components/GraphCanvas";
import InfoPanel from "./components/InfoPanel";
import useGraph from "./components/useGraph";
import ClustersView from "./components/clustersView";
import WalletVerifier from "./components/wallet_verifier";

export default function Home() {
  const { nodes, edges, clusters, similarities, dbscan, sybil_entities, aggregated_relations, noiseAnalysis } = useGraph();
  const [selected, setSelected] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [highlightNodes, setHighlightNodes] = useState(null); // Set of wallet ids 闪烁节点
  const [mounted, setMounted] = useState(false);
  

  useEffect(() => {
    setMounted(true);
  }, []);

  // Loading 页面：在未挂载或 nodes 为空时显示
  if (!mounted || nodes.length === 0) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 9999,
          overflow: "hidden",
          background: "radial-gradient(circle at center, #02030f 0%, #000 80%)",
        }}
      >
        {/* 宇宙 glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 500,
            height: 500,
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(120,0,255,0.25), transparent 70%)",
            filter: "blur(120px)",
          }}
        />

        {/* 星点 */}
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              background: "white",
              borderRadius: "50%",
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: 0.3,
              animation: `twinkle ${2 + Math.random() * 3}s infinite`,
            }}
          />
        ))}

        {/* 中心三角形 + 核心 */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 200,
            height: 200,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* 外环 */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 140,
              height: 140,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "2px dashed rgba(255,255,255,0.2)",
              animation: "spinDash 6s linear infinite, pulseRing 3s ease-in-out infinite",
              boxShadow: "0 0 25px rgba(168,85,247,0.4)",
            }}
          />

          {/* 内核光圈 */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 80,
              height: 80,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)",
              animation: "pulseCore 2.5s ease-in-out infinite",
            }}
          />

          {/* 三角形 */}
          {[0, 1, 2].map((i) => {
            const colors = ["#a855f7", "#ec4899", "#f97316"];
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 0,
                  height: 0,
                  borderLeft: "25px solid transparent",
                  borderRight: "25px solid transparent",
                  borderBottom: `45px solid ${colors[i]}`,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  filter: `drop-shadow(0 0 18px ${colors[i]})`,
                  animation: `
                    rotateTri 6s linear infinite,
                    breatheTri 3s ease-in-out infinite
                  `,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            );
          })}

          {/* LOADING 文本 */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: 12,
              letterSpacing: "4px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              textShadow: "0 0 12px rgba(168,85,247,0.9)",
              animation: "loadingPulse 2s ease-in-out infinite",
            }}
          >
            LOADING
          </div>
        </div>

        {/* Keyframes */}
        <style>{`
          @keyframes rotateTri { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
          @keyframes breatheTri { 0%,100% { margin-top: -10px; opacity: 0.8; } 50% { margin-top: 20px; opacity: 1; } }
          @keyframes spinDash { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
          @keyframes pulseRing { 0%,100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; } 50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; } }
          @keyframes pulseCore { 0%,100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.6; } 50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; } }
          @keyframes twinkle { 0%,100% { opacity: 0.1; } 50% { opacity: 0.6; } }
          @keyframes loadingPulse { 0%,100% { opacity: 0.6; letter-spacing: 4px; } 50% { opacity: 1; letter-spacing: 6px; } }
        `}</style>
      </div>
    );
  }
  
  return (
    <div
      style={{
        display: "flex",
        background: "#121212",
        color: "#fff",
      }}
    > 
      {/* Wallet Verifier Panel */}
      <div className="fixed top-4 left-4 z-50">
        <WalletVerifier />
      </div>

      {/* 左侧图 */}
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selected={selected}
        onSelect={setSelected}
        clusters={clusters}
        highlightNodes={highlightNodes}
        setHighlightNodes={setHighlightNodes}
      />

      {/* Heatmap toggle button */}
      {mounted && (
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          style={{
            position: "absolute",
            top: 30,
            right: 35,
            padding: "8px 14px",
            background: "#444",
            color: "white",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          {showHeatmap ? "Close Heatmap" : "Show Heatmap"}
        </button>
      )}

      {/* Heatmap modal */}
      {mounted && showHeatmap && (
        <ClustersView
          clusters={clusters}
          similarities={similarities}
          onClose={() => setShowHeatmap(false)}
        />
      )}

      {/* 左侧信息面板 */}
      {mounted && (
        <InfoPanel
          selected={selected}
          clusters={clusters}
          similarities={similarities}
          dbscan={dbscan}
          sybil_entities={sybil_entities}
          aggregated_relations={aggregated_relations}
          setHighlightNodes={setHighlightNodes}
          noiseAnalysis={noiseAnalysis}
        />
      )}
    </div>
  );
}