import os
import numpy as np
from datetime import datetime
from pathlib import Path
import pandas as pd
from sklearn.metrics import silhouette_score
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fund_graph_construct import build_nodes, build_edges
from clustering import find_connected_components
from behv_analysis import analyze_similarity
from behv_analysis import tx_distance, amt_distance, time_distance
from dbscan import run_dbscan_on_clusters
from behv_analysis import behavior_sim, variant_similarity, wallet_behavior_similarity
from entity_identification.syb_entity_id import identify_sybil_entities
from itertools import combinations

# ---------- 新增: 找同方向 wallets ----------
from sklearn.preprocessing import normalize
from sklearn.metrics.pairwise import cosine_similarity

# ---------- FastAPI ----------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

print("first time to code with gemini copilot")


# ---------- 配置 ----------
BASE_DIR = Path(__file__).resolve().parent
CSV_FOLDER = BASE_DIR / "wallets"

ACTION_MAP = {
    "Claim": "C",
    "Batch Claim Token": "B",
    "Transfer": "T",
    "Swap": "S",
    "Approve": "A",
    "Batch Transfer": "BT"
}

# ---------- 读取 CSV ----------
csv_data = []

for filename in os.listdir(str(CSV_FOLDER)):
    if not filename.endswith(".csv"):
        continue

    wallet_id = filename.replace("export-", "").replace(".csv", "").lower()
    
    try:
        df = pd.read_csv(CSV_FOLDER / filename)
        
        # --------- 清洗列名 ----------
        df.columns = df.columns.str.strip()          # 去掉前后空格
        df.columns = df.columns.str.replace("\ufeff", "")  # 去掉 BOM 隐藏字符（Excel CSV 常见）
        
        # 如果 CSV 有列但没数据，df 也可能为空
        if df.empty:
            raise ValueError("Empty CSV with columns but no data")
    except (pd.errors.EmptyDataError, ValueError):
        # 如果 CSV 为空，也添加一个占位记录，保证 wallet_id 被记录

            csv_data.append({
                "from": "none",
                "to": "none",
                "amount": 0.0,
                "timestamp": "0",  # ⚠️ 必须是字符串
                "method": "-",
                "wallet_id": wallet_id
            })
            continue

        # 先把时间列转换成 datetime
    df['timestamp_dt'] = pd.to_datetime(df.get("DateTime (UTC)", df.get("timestamp")), errors='coerce')
    df = df.sort_values('timestamp_dt')  # 排序 DataFrame
    for _, row in df.iterrows():

        timestamp_str = str(row.get("DateTime (UTC)", row.get("timestamp")))
        if pd.isna(timestamp_str) or str(timestamp_str).strip() == "":
            timestamp_str = "1970-01-01T00:00:00"

        try:
            ts = datetime.fromisoformat(timestamp_str)
        except ValueError:
            ts = datetime.strptime(timestamp_str, "%Y/%m/%d %H:%M")

        csv_data.append({
            "from": row["From"].lower(),
            "to": row["To"].lower(),
            #"amount": float(str(row["Amount"]).replace(" BNB", "").strip()),
            #"amount":float(str(row["Amount"]).replace(" BNB", "").replace(" ETH", "").strip()),
            "amount": float(re.sub(r"[^0-9.]", "", str(row["Amount"]))),
            "timestamp": ts.isoformat(),
            "method": row["Method"],
            "wallet_id": wallet_id
        })


# ---------- suspicious wallets (CSV addresses only) ----------
suspicious_wallets = set(tx["wallet_id"] for tx in csv_data)

# ---------- 行为分析 ----------
nodes = build_nodes(csv_data, suspicious_wallets, ACTION_MAP)
# ---------- 转成 wallet_id -> node 映射，方便查找 ----------
nodes_map = {
    n["id"]: {
        "behavior_vector": n["behavior_vector"],
        "variant": n["variant"]
    }
    for n in nodes
}

    
# ---------- edges ----------
edges = build_edges(csv_data, suspicious_wallets)

# ---------- clustering ----------
clusters = find_connected_components(nodes, edges)
num_clusters = len(clusters)

#print(f"Total ICCs found: {num_clusters}")
'''for i, cluster in enumerate(clusters):
    print(f"Cluster {i+1}: {cluster}")'''
    
def find_same_direction_wallets_in_cluster(nodes_map, cluster_wallets, similarity_threshold=0.99):
    # 只取 nodes_map 中存在的 wallet
    valid_wallets = [w for w in cluster_wallets if w in nodes_map]
    vectors = np.array([nodes_map[w]["behavior_vector"] for w in valid_wallets], dtype=float)

    if len(vectors) < 2:
        return []

    vectors_norm = normalize(vectors, norm='l2')
    cos_sim_matrix = cosine_similarity(vectors_norm)

    n = len(valid_wallets)
    selected_wallets = []
    for i in range(n):
        wallet_i = valid_wallets[i]
        is_good = True
        for j in range(n):
            if i == j:
                continue
            if cos_sim_matrix[i, j] < similarity_threshold:
                is_good = False
                break
        if is_good:
            selected_wallets.append(wallet_i)

    return selected_wallets

    vectors = np.array([nodes_map[w]["behavior_vector"] for w in cluster_wallets if w in nodes_map], dtype=float)
    if len(vectors) < 2:
        return []

    vectors_norm = normalize(vectors, norm='l2')
    cos_sim_matrix = cosine_similarity(vectors_norm)

    n = len(cluster_wallets)
    selected_wallets = []
    for i in range(n):
        wallet_i = cluster_wallets[i]
        is_good = True
        for j in range(n):
            if i == j:
                continue
            if cos_sim_matrix[i, j] < similarity_threshold:
                is_good = False
                break
        if is_good:
            selected_wallets.append(wallet_i)

    return selected_wallets
# ---------- Similarities ----------
similarities = analyze_similarity(nodes)

# ---------- DBSCAN on each cluster ----------
# min_samples=3, eps_percentile=40 可以调节
dbscan_results = run_dbscan_on_clusters(nodes, clusters, similarities['weighted'], min_samples=2)

# 打印到 console
'''print("\n--- DBSCAN results within each cluster ---")
for c_idx, cluster_res in dbscan_results.items():
    subclusters = {}
    for wallet, label in cluster_res.items():
        subclusters.setdefault(label, []).append(wallet)
    print(f"Cluster {c_idx}: {len(subclusters)} subclusters -> {subclusters}")'''




@app.get("/graph")
def get_graph():
    api_dbscan = {}
    subg_vectors_map = {}  # 存每个 cluster 的 subg 的 vectors/variants/cohesion

    for c_idx, cluster_res in dbscan_results.items():
        # 重编号子群 label 从 0 开始
        non_noise_labels = sorted(l for l in set(cluster_res.values()) if l != -1)
        label_map = {old:new for new, old in enumerate(non_noise_labels)}

        cluster_output = {"subgroups": {}, "noise": []}

        for wallet, label in cluster_res.items():
            if label == -1:
                cluster_output["noise"].append(wallet)
            else:
                new_label = label_map[label]
                cluster_output["subgroups"].setdefault(new_label, []).append(wallet)

        api_dbscan[c_idx] = cluster_output

        # ----------------------
        # 计算每个子群 cohesion
        subg_vectors_map[c_idx] = {}
        for subg_label, wallets in cluster_output["subgroups"].items():
            if len(wallets) < 2:
                subg_vectors_map[c_idx][subg_label] = {
                    "vectors": [nodes_map[w]["behavior_vector"] for w in wallets if w in nodes_map],
                    "cohesion": None
                }
                continue

            valid_wallets = [w for w in wallets if w in nodes_map]

            sims = []
            for w1, w2 in combinations(valid_wallets, 2):
                sim = wallet_behavior_similarity(nodes_map[w1], nodes_map[w2], variant_weight=0.5)
                sims.append(sim)
            cohesion = float(np.mean(sims)) if sims else None

            subg_vectors_map[c_idx][subg_label] = {
                "wallets": valid_wallets,
                #"wallets": wallets,
                #"vectors": [nodes_map[w]["behavior_vector"] for w in wallets if w in nodes_map],
                #"variants": [nodes_map[w]["variant"] for w in wallets if w in nodes_map],
                "cohesion": cohesion

            }

       

        # ----------------------
        # 移除临时 wallets 字段
        for sg_label in cluster_output["subgroups"].keys():
            subg_vectors_map[c_idx][sg_label].pop("wallets", None)
        
        for sg_label in cluster_output["subgroups"].keys():
            subg_vectors_map[c_idx][sg_label].pop("variants", None)
            subg_vectors_map[c_idx][sg_label].pop("vectors", None)
            subg_vectors_map[c_idx][sg_label].pop("fund", None)

    # Identify sybil entities
    sybil_entities = identify_sybil_entities(
        api_dbscan,
        nodes,
        edges,
        variant_weight=0.5,
        eps=0.1,
        min_samples=2,
        global_dbscan=True
    )
    
    
    
        # 找每个 cluster 内同方向钱包
    same_direction_map = {}
    for c_idx, cluster_wallets in enumerate(clusters):
        same_dir_wallets = find_same_direction_wallets_in_cluster(nodes_map, cluster_wallets, similarity_threshold=0.99)
        if same_dir_wallets:
            same_direction_map[c_idx] = same_dir_wallets

    return {
        "nodes": nodes,
        "edges": edges,
        "clusters": clusters,
        "num_clusters": num_clusters,
        "similarities": similarities,
        "dbscan": api_dbscan,
        "sybil_entities": sybil_entities,
        #"global_result": global_result,
        #"aggregated_relations": aggregated_relations,
        #"subg_vectors": subg_vectors_map,
        #"same_direction_wallets": same_direction_map,  # <--- 新增字段
    }