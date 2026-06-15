import os
from datetime import datetime
from pathlib import Path
import pandas as pd
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from funding_graph import build_funding_graph, find_clusters
from typing import Optional

# ---------- FastAPI 初始化 ----------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ---------- 配置 ----------
BASE_DIR = Path(__file__).resolve().parent
CSV_FOLDER = BASE_DIR / "wallets"

ACTION_MAP = {
    "Claim": "C",
    "Batch Claim Token": "B",
    "Transfer": "T",
    "Swap": "S",
    "Approve": "A"
}

# ---------- 读取 CSV 数据 ----------
#for each CSV file, it processes every row and “prints” (actually stores) 
#only the specified columns in the dictionary:

example_data = []

for filename in os.listdir(str(CSV_FOLDER)):
    if not filename.endswith(".csv"):
        continue

    wallet_id = filename.replace("export-", "").replace(".csv", "").lower()
    df = pd.read_csv(CSV_FOLDER / filename)

    for _, row in df.iterrows():
        timestamp_str = str(row.get("DateTime (UTC)", row.get("timestamp")))
        try:
            ts = datetime.fromisoformat(timestamp_str)
        except ValueError:
            ts = datetime.strptime(timestamp_str, "%Y/%m/%d %H:%M")

        example_data.append({
            "from": row["From"].lower(),
            "to": row["To"].lower(),
            "amount": float(str(row["Amount"]).replace(" BNB", "").strip()),
            "timestamp": ts.isoformat(),
            "method": row["Method"],
            "wallet_id": wallet_id
        })

# ---------- 收集所有 unique wallet ----------
all_wallets = set(
    tx["wallet_id"] for tx in example_data
) | set(tx["from"] for tx in example_data) | set(tx["to"] for tx in example_data)

# ---------- 初始化 nodes ----------
nodes = {w: {"id": w, "behavior_vector": None, "variant": None, "cluster_id": None} for w in all_wallets}

# ---------- 填充 CSV wallet 的行为向量和 variant ----------
for wallet_id in set(tx["wallet_id"] for tx in example_data):
    wallet_txs = [tx for tx in example_data if tx["wallet_id"] == wallet_id]
    wallet_txs.sort(key=lambda x: x["timestamp"])

    tx_cnt = len(wallet_txs)
    avg_amt = sum(tx["amount"] for tx in wallet_txs) / tx_cnt if tx_cnt else 0
    peers = len(set(tx["to"] for tx in wallet_txs))

    first_tx = wallet_txs[0] if wallet_txs else None
    new = 1 if first_tx else 0
    t_min = int(datetime.fromisoformat(first_tx["timestamp"]).timestamp() / 60) if first_tx else 0
    a = first_tx["amount"] if first_tx else 0

    variant_str = "->".join([ACTION_MAP.get(tx["method"], "U") for tx in wallet_txs])

    nodes[wallet_id]["behavior_vector"] = [tx_cnt, avg_amt, peers, new, t_min, a]
    nodes[wallet_id]["variant"] = variant_str

# ---------- 生成 edges ----------
edges = [
    {
        "source": tx["from"],
        "target": tx["wallet_id"],
        "amount": tx["amount"],
        "timestamp": tx["timestamp"],
        "type": "funding"
    }
    for tx in example_data
]


# ---------- FastAPI endpoints ----------
@app.get("/graph")
def get_graph():
    return {"nodes": list(nodes.values()), "edges": edges}

# ---------- 构建 funding graph ----------
funding_nodes, funding_edges = build_funding_graph(example_data)

# ---------- 默认 suspicious_set = CSV 中所有 wallet_id ----------
suspicious_set = set(tx["wallet_id"] for tx in example_data)

# ---------- 找 cluster ----------
clusters = find_clusters(suspicious_set, funding_edges)

# ---------- 给 nodes 标记 cluster_id ----------
for idx, cluster in enumerate(clusters, 1):
    for wallet in cluster:
        if wallet in nodes:
            nodes[wallet]["cluster_id"] = idx

# ---------- 打印 clusters ----------
print(f"Found {len(clusters)} clusters")
for i, c in enumerate(clusters, 1):
    print(f"Cluster {i} ({len(c)} wallets): {c}")


@app.get("/funding_clusters")
def get_funding_clusters(wallets: Optional[str] = None):
    """
    可选传入 wallets=逗号分隔字符串，生成动态 clusters，并返回 cluster 内 edges
    """
    # 默认 suspicious set = CSV 中所有 wallet_id
    if wallets:
        suspicious_set_dynamic = set(wallets.split(","))
    else:
        suspicious_set_dynamic = set(tx["wallet_id"] for tx in example_data)

    # 找 clusters
    clusters_dynamic = find_clusters(suspicious_set_dynamic, funding_edges)

    # 构建 cluster 内部 edges
    clusters_with_edges = []
    for cluster in clusters_dynamic:
        cluster_edges = [
            e for e in funding_edges
            if e["source"] in cluster and e["target"] in cluster
        ]
        clusters_with_edges.append({
            "wallets": list(cluster),
            "edges": cluster_edges
        })

    # ---------- 打印 clusters 到控制台 ----------
    print(f"Suspicious set: {suspicious_set_dynamic}")
    print(f"Found {len(clusters_dynamic)} clusters")
    for i, c in enumerate(clusters_dynamic, 1):
        print(f"Cluster {i} ({len(c)} wallets): {c}")
        

    return {
        #"clusters": clusters_with_edges,
        #"count": len(clusters_dynamic),
        "example_data": example_data    
    }