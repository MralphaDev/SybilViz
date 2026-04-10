# dbscan.py
import numpy as np
from sklearn.cluster import DBSCAN

def run_dbscan_on_clusters(nodes, clusters, similarities, min_samples=3, similarity_threshold=0.9):
    """
    对每个 cluster 内基于 weighted similarity 做精细 DBSCAN，只聚合 similarity >= similarity_threshold 的钱包。
    - similarities: dict "walletA-walletB" -> similarity
    - min_samples: DBSCAN 核心点最少邻居数量
    - similarity_threshold: 聚类阈值，>= threshold 才归为同一个 subcluster
    返回 dict: {cluster_index: {wallet_id: dbscan_label}}
    """
    cluster_dbscan_results = {}
    eps = 1 - similarity_threshold  # DBSCAN 的 eps 参数是距离，距离 = 1 - similarity

    for c_idx, cluster in enumerate(clusters):
        n = len(cluster)
        if n < 2: # 少于 2 个钱包无法聚类，直接标记为 -1
            cluster_dbscan_results[c_idx] = {cluster[0]: -1}
            continue

        # 构建相似度矩阵
        sim_matrix = np.ones((n, n))
        for i in range(n):
            for j in range(i + 1, n):
                key1 = f"{cluster[i]}-{cluster[j]}"
                key2 = f"{cluster[j]}-{cluster[i]}"
                sim = similarities.get(key1) or similarities.get(key2) or 0
                sim_matrix[i, j] = sim
                sim_matrix[j, i] = sim

        # 转换成距离矩阵：distance = 1 - similarity
        distance_matrix = 1 - sim_matrix

        # DBSCAN eps = 1 - threshold
    

        db = DBSCAN(eps=eps, min_samples=min_samples, metric='precomputed')
        labels = db.fit_predict(distance_matrix)

        # 保存结果
        cluster_dbscan_results[c_idx] = {wallet: int(labels[i]) for i, wallet in enumerate(cluster)}

        # 打印 subcluster 情况
        subclusters = {}
        for wallet, label in cluster_dbscan_results[c_idx].items():
            subclusters.setdefault(label, []).append(wallet)
        num_sub = len([k for k in subclusters.keys() if k != -1])
       # print(f"Cluster {c_idx}: eps={eps:.2f}, subclusters={num_sub}, labels={subclusters}")

    return cluster_dbscan_results