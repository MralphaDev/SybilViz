# funding_graph.py
from collections import defaultdict

def build_funding_graph(transactions):
    """
    transactions: list of dicts, 每个 dict 至少有 'from', 'to', 'amount', 'timestamp'
    返回: nodes, edges
    """
    nodes = {tx["from"] for tx in transactions} | {tx["to"] for tx in transactions}
    edges = [{"source": tx["from"], "target": tx["to"], "amount": tx["amount"], "timestamp": tx["timestamp"]}
             for tx in transactions]
    return nodes, edges

def find_clusters(suspicious_set, edges):
    """
    suspicious_set: set of wallet_id（可疑钱包集合）
    edges: list of dict，每个 dict 至少有 source, target
    返回: clusters: list of set，每个 cluster 是 connected component
    """
    adj = defaultdict(list)
    for e in edges:
        if e["source"] in suspicious_set and e["target"] in suspicious_set:
            adj[e["source"]].append(e["target"])
            adj[e["target"]].append(e["source"])  # 无向图

    visited = set()
    clusters = []

    def dfs(node, comp):
        visited.add(node)
        comp.add(node)
        for neighbor in adj[node]:
            if neighbor not in visited:
                dfs(neighbor, comp)

    for wallet in suspicious_set:
        if wallet not in visited:
            comp = set()
            dfs(wallet, comp)
            clusters.append(comp)

    return clusters