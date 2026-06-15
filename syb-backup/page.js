"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import axios from "axios";

export default function Home() {
  const svgRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/graph").then(res => {
     // console.log("Graph data:", res.data);
      setNodes(res.data.nodes || []);
      console.log("Nodes:", res.data.nodes);
      setEdges(res.data.edges || []);
    });
  }, []);

useEffect(() => {
  if (!svgRef.current || nodes.length === 0 || edges.length === 0) return;

  const width = window.innerWidth * 0.8;
  const height = window.innerHeight * 0.9;
  const svg = d3.select(svgRef.current);
  svg.selectAll("*").remove();
  const g = svg.append("g");

  // ---------- Arrow Definition ----------
  const defs = svg.append("defs");
  defs.append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 28)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#ff9800");

  // ---------- 計算 degree ----------
  const degreeMap = {};
  edges.forEach(e => {
    degreeMap[e.source.id] = (degreeMap[e.source.id] || 0) + 1;
    degreeMap[e.target.id] = (degreeMap[e.target.id] || 0) + 1;
  });

  const HIGH_DEGREE = 8;
  const highNodes = nodes.filter(d => (degreeMap[d.id] || 0) >= HIGH_DEGREE);
  const lowNodes = nodes.filter(d => (degreeMap[d.id] || 0) < HIGH_DEGREE);

  const centerX = width / 2;
  const centerY = height / 2;


// ── 高連線節點：放在水平居中一條直線上 ────────────────────────────────
const highCount = highNodes.length;
const highLineY = centerY;  // 固定在畫布垂直中心

if (highCount > 0) {
  // 總寬度根據節點數動態計算，越多越寬；間距明顯拉大
  const totalWidth = Math.max(800, highCount * 280);  // ← 這裡調間距：280越大間距越大
  const spacing = totalWidth / Math.max(highCount - 1, 1);
  const startX = centerX - totalWidth / 2;

  highNodes.forEach((d, i) => {
    const x = startX + i * spacing;
    const y = highLineY + (Math.random() - 0.5) * 30;  // 小垂直擾動，可註解掉要完全平直

    d.x = x;
    d.y = y;
    d.fx = null;   // 不固定，讓拖拽和模擬都能影響
    d.fy = null;
  });
}

  // ── 低連線節點：外圍大範圍 ────────────────────────────────
  const outerMinR = 520;
  const outerMaxR = 900;

  lowNodes.forEach(d => {
    const angle = Math.random() * Math.PI * 2;
    const r = outerMinR + Math.random() * (outerMaxR - outerMinR);
    d.x = centerX + Math.cos(angle) * r;
    d.y = centerY + Math.sin(angle) * r;
    d.fx = null;
    d.fy = null;
  });

  // ── Simulation ──────────────────────────────────────────────
  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges)
      .id(d => d.id)
      .distance(380)
      .strength(0.5)
    )
    .force("charge", d3.forceManyBody()
      .strength(d => -90 - (degreeMap[d.id] || 0) * 30)
      .distanceMax(800)
    )
    .force("collision", d3.forceCollide()
      .radius(d => (degreeMap[d.id] || 0) >= HIGH_DEGREE ? 72 : 52)
      .strength(0.8)
    )
    .force("radialLow", d3.forceRadial(
      d => (degreeMap[d.id] || 0) >= HIGH_DEGREE ? 0 : outerMinR + 80,
      centerX, centerY
    ).strength(0.4))
    .force("center", d3.forceCenter(centerX, centerY).strength(0.02))
    .alpha(0.5)              // 初始能量低 → 減少開場抖動
    .alphaDecay(0.04)
    .alphaMin(0.001)
    .velocityDecay(0.65);    // 加大速度衰減 → 拖拽後快速穩定

  // ---------- Edges ----------
// 不用 .id 来过滤，直接用 source/target
const filteredEdges = edges.filter(e => e.source !== e.target);


  const link = g.append("g")
    .selectAll("line")
    .data(filteredEdges)
    .join("line")
    .attr("stroke-width", 2)
    .attr("stroke", d => {

      if (d.type === "funding") return "#ff9800";
      return "#888";
    })
    .attr("marker-end", "url(#arrow)")
    .style("cursor", "pointer")
.on("click", (_, d) => {
  console.log("Clicked edge:", d);
  setSelected({ type: "edge", data: d }); // 直接存对象
}

);


  // ---------- Nodes ----------
  const nodeGroup = g.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .style("cursor", "pointer")
    .on("click", (_, d) => setSelected({ type: "node", ...d }))
    .call(d3.drag()
  .on("start", function(event, d) {
    if (!event.active) sim.alphaTarget(0.3).restart(); // wake simulation
    d.fx = d.x;  // fix at current position
    d.fy = d.y;
  })
  .on("drag", function(event, d) {
    d.fx = event.x; // move fixed position with mouse
    d.fy = event.y;
  })
  .on("end", function(event, d) {
    if (!event.active) sim.alphaTarget(0); // relax simulation
    // KEEP fixed after drag
    // Node will stay where you leave it
    // d.fx = d.x;
    // d.fy = d.y;
  })
);


  nodeGroup.append("circle")
    .attr("r", 26)
    .attr("fill", "none")
    .attr("stroke", "#ff9800")
    .attr("stroke-width", 2.5)
    .attr("stroke-dasharray", "6 6");

  nodeGroup.append("circle")
    .attr("r", 18)
    .attr("fill", d => d.behavior_vector && d.behavior_vector[0] >= 3 ? "#ff5722" : "#111");

  nodeGroup.append("text")
    .text(d => d.id ? d.id.slice(0, 6) : "")
    .attr("fill", "#fff")
    .attr("font-size", 10)
    .attr("text-anchor", "middle")
    .attr("dy", 4);

  // ---------- Token Animation ----------
  const tokenGroup = g.append("g");
  const tokens = tokenGroup.selectAll("circle")
    .data(filteredEdges)
    .join("circle")
    .attr("r", 3)
    .attr("fill", "#ff9800")
    .each(d => d.t = Math.random());

  sim.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  svg.call(d3.zoom()
    .scaleExtent([0.2, 4])
    .on("zoom", e => g.attr("transform", e.transform)));

  // 獨立 token 動畫
  function animateTokens() {
    tokens.each(function(d) {
      if (!d.source?.x || !d.target?.x) return;
      d.t += 0.001;
      if (d.t > 1) d.t = 0;
      const x = d.source.x + (d.target.x - d.source.x) * d.t;
      const y = d.source.y + (d.target.y - d.source.y) * d.t;
      d3.select(this).attr("cx", x).attr("cy", y);
    });
    requestAnimationFrame(animateTokens);
  }

  animateTokens();

}, [nodes, edges]);

  return (
    <div style={{
      display: "flex",
      background: "#121212",
      color: "#fff",
      height: "100vh",
      padding: 20,
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ flex: "1 1 auto" }}>
        <svg ref={svgRef} width="100%" height="90%" />
      </div>

      <div style={{
        width: 300,
        marginLeft: 20,
        background: "#1c1c1c",
        padding: 12,
        borderRadius: 6,
        overflowY: "auto"
      }}>
        <h3>Info Panel</h3>
        {!selected && <p style={{ opacity: 0.6 }}>Click a node or edge</p>}

        {selected?.type === "node" && (
          <>
            <p><b>Address</b></p>
            <p style={{ fontSize: 12 }}>{selected.id ?? "N/A"}</p>
          </>
        )}

      {selected?.type === "node" && selected.behavior_vector && (
        <>
          <p><b>Behavior Vector</b></p>
          <pre style={{ fontSize: 11 }}>
            {JSON.stringify({
              "Transaction Count": selected.behavior_vector[0],
              "Average Tx Amount": selected.behavior_vector[1],
              "Num of Interacted Peers": selected.behavior_vector[2],
              "is_New_Wallet?": selected.behavior_vector[3],
              "Block_number": selected.behavior_vector[4],
            }, null, 2)}
          </pre>
        </>
      )}


        {selected?.type === "node" && selected.variant && (
        <>
          <p><b>Process Variant</b></p>
          <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
            {selected.variant}
          </pre>

          <p><b>Legend</b></p>
          <ul style={{ fontSize: 11, paddingLeft: 16 }}>
            <li><b>C</b> → Claim</li>
            <li><b>B</b> → Batch Claim Token</li>
            <li><b>T</b> → Transfer</li>
            <li><b>S</b> → Swap</li>
            <li><b>A</b> → Approve</li>
          </ul>
        </>
      )}


{selected?.type === "edge" && (
  <>
    <p><b>Funding Edge</b></p>
    <p style={{ fontSize: 12 }}>
      {selected.data.source?.id ?? selected.data.source} → {selected.data.target?.id ?? selected.data.target}
    </p>
    <p>Amount: {selected.data.amount} bnb</p>
    <p>Timestamp: {selected.data.timestamp}</p>
    <p>Type: {selected.data.type}</p>
  </>
)}




      </div>
    </div>
  );
}
