from .entity_id_no_cex import group_by_upper_funder, fund_backtracking
from .entity_id_cex import analyze_subgroup_clusters_global
from behv_analysis import wallet_behavior_similarity
from collections import deque, defaultdict
import math


# =========================================================
# math utils
# =========================================================

def safe_log_odds(p, eps=1e-6):
    p = min(max(p, eps), 1 - eps)
    return math.log(p / (1 - p))


def sigmoid(x):
    return 1 / (1 + math.exp(-x))

def safe_prob(p, eps=1e-3):
    return min(max(p, eps), 1 - eps)
# =========================================================
# behavioral contamination (UNCHANGED)
# =========================================================

def compute_behavioral_contamination(noise_node, cluster_wallets, wallet_data_map, sim_func, tau=0.2,top_k=100):
    x_beh = 0.0
    # 存储候选
    similar_list = []

    for w in cluster_wallets:
        wn = wallet_data_map.get(w.lower())
        if not wn:
            continue

        sim = sim_func(noise_node, wn)

        if sim >= tau:
            x_beh += sim
            similar_list.append((w, sim))

    # 排序取 top-k
    similar_list.sort(key=lambda x: x[1], reverse=True)
    similar_list = similar_list[:top_k]

    E_beh = 1 - math.exp(-x_beh)

    return x_beh, E_beh, similar_list


# =========================================================
# graph traversal utilities (UNCHANGED)
# =========================================================

def forward_track(start, edges_by_source):
    visited = set()
    queue = deque([(start, 0)])
    result = []

    while queue:
        node, hop = queue.popleft()

        if node in visited:
            continue
        visited.add(node)

        result.append((node, hop))

        for nxt in edges_by_source.get(node, []):
            queue.append((nxt, hop + 1))

    return result


def backward_track(start, edges_by_target):
    visited = set()
    queue = deque([(start, 0)])
    result = []

    while queue:
        node, hop = queue.popleft()

        if node in visited:
            continue
        visited.add(node)

        result.append((node, hop))

        for prev in edges_by_target.get(node, []):
            queue.append((prev, hop + 1))

    return result


# =========================================================
# GRAPH CONTAMINATION (FIXED LOGIC)
# =========================================================

def compute_contamination(path_nodes, sybil_set):
    """
    Only Sybil nodes contribute to contamination
    x(w) = sum_{v in Sybil} 1/k^2
    """
    x_graph = 0.0

    for node, k in path_nodes:
        if k == 0:
            continue

        # ONLY Sybil nodes contribute (FIX)
        if node in sybil_set:
            x_graph += 1 / (k ** 2)

    return x_graph, 1 - math.exp(-x_graph)


# =========================================================
# MAIN FUNCTION (STRUCTURE PRESERVED)
# =========================================================

def identify_sybil_entities(
    dbscan_clusters,
    nodes,
    edges,
    variant_weight=0.5,
    eps=0.2,
    min_samples=2,
    global_dbscan=False,
    TH_CONTAMINATION=0.7
):

    all_results = {}

    # ---------------------------
    # Global DBSCAN (unchanged)
    # ---------------------------
    global_result = None
    if global_dbscan:
        global_result = analyze_subgroup_clusters_global(
            dbscan_clusters,
            nodes,
            variant_weight=variant_weight,
            eps=eps,
            min_samples=min_samples
        )

    # ---------------------------
    # wallet map
    # ---------------------------
    wallet_data_map = {n["id"].lower(): n for n in nodes}

    # ---------------------------
    # edges maps
    # ---------------------------
    edges_by_source = defaultdict(list)
    edges_by_target = defaultdict(list)

    for e in edges:
        s = e["source"].lower()
        t = e["target"].lower()
        edges_by_source[s].append(t)
        edges_by_target[t].append(s)

    # =========================================================
    # cluster loop
    # =========================================================
    for cluster_idx, cluster_data in dbscan_clusters.items():

        subgroups = cluster_data["subgroups"]
        noise = cluster_data["noise"]

        subgroup_to_funder, funder_to_subgroups = group_by_upper_funder(subgroups, edges)

        cluster_wallets = [
            w for ws in subgroups.values() for w in ws
        ]

        # =====================================================
        # SYBIL SET (CRITICAL FIX)
        # =====================================================
        sybil_set = set()
        for ws in subgroups.values():
            for w in ws:
                sybil_set.add(w.lower())

        recovered_noise = []
        noise_analysis = {}

        # =====================================================
        # noise loop
        # =====================================================
        for noise_addr in noise:

            noise_lower = noise_addr.lower()

            # ---------------------------
            # GRAPH MODULE (FIXED)
            # ---------------------------
            forward_paths = forward_track(noise_lower, edges_by_source)
            backward_paths = backward_track(noise_lower, edges_by_target)

            f_x, f_E = compute_contamination(forward_paths, sybil_set)
            b_x, b_E = compute_contamination(backward_paths, sybil_set)

            x_graph = f_x + b_x
            E_graph = 1 - math.exp(-x_graph)
            z_graph = safe_log_odds(E_graph)

            # ---------------------------
            # BEHAVIOR MODULE
            # ---------------------------
            noise_node = wallet_data_map.get(noise_lower)

            if noise_node:
                def sim_func(a, b):
                    return wallet_behavior_similarity(
                        a, b,
                        variant_weight=variant_weight
                    )

                x_beh, E_beh, similar_list = compute_behavioral_contamination(
                    noise_node,
                    cluster_wallets,
                    wallet_data_map,
                    sim_func,
                    tau=0.8,
                    top_k=10
                )
            else:
                x_beh, E_beh = 0.0, 0.0

            z_beh = safe_log_odds(E_beh)

            # ===========================
            # INTENSITY FUSION (CORRECT)
            # ===========================

            x_total = x_graph + x_beh
            C_uni = 1 - math.exp(-x_total)

            # ---------------------------
            # MULTI-VIEW ENSEMBLE
            # ---------------------------
            C_graph = E_graph
            C_beh = E_beh
            C_final = max(C_graph, C_beh, C_uni)

            contamination_score = C_final

            # ---------------------------
            # diagnostics
            # ---------------------------
            noise_analysis[noise_addr] = {
                "forward_hops": forward_paths,
                "backward_hops": backward_paths,

                "forward_x": f_x,
                "forward_E": f_E,
                "backward_x": b_x,
                "backward_E": b_E,

                "behavior_x": x_beh,
                "behavior_E": E_beh,
                "similar_wallets": similar_list,

                "C_graph": C_graph,
                "C_beh": C_beh,
                "C_uni": C_uni,
                "final_contamination": C_final
            }

            # ---------------------------
            # decision
            # ---------------------------
            if contamination_score >= TH_CONTAMINATION:
                recovered_noise.append(noise_addr)

        # ---------------------------
        # save cluster result
        # ---------------------------
        all_results[cluster_idx] = {
            "subgroup_to_funder": subgroup_to_funder,
            "funder_to_subgroups": funder_to_subgroups,
            "noise": noise,
            "recovered_noise": recovered_noise,
            "noise_analysis": noise_analysis
        }

    return all_results