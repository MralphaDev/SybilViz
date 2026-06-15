import { useEffect, useState } from "react";
import axios from "axios";

export default function useGraph() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [clusters, setClusters] = useState([]);

  const [similarities, setSimilarities] = useState({
    behavior: {},
    variant: {},
    weighted: {}
  });

  const [dbscan, setDbscan] = useState({});

  const [sybil_entities, setSybilEntities] = useState([]);
  const [aggregated_relations, setAggregatedRelations] = useState([]);

  const [noiseAnalysis, setNoiseAnalysis] = useState({});

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/graph")
      .then(res => {

        setNodes(res.data.nodes || []);
        setEdges(res.data.edges || []);
        setClusters(res.data.clusters || []);

        setSimilarities(res.data.similarities || {
          behavior: {},
          variant: {},
          weighted: {}
        });

        setDbscan(res.data.dbscan || {});

        // ==============================
        // FIX 1: sybil_entities normalize
        // ==============================
        const rawSybil = res.data.sybil_entities || {};

        const sybilArray = Object.entries(rawSybil).map(
          ([clusterId, data]) => ({
            clusterId,
            ...data
          })
        );

        setSybilEntities(sybilArray);

        // ==============================
        // FIX 2: aggregated relations safe
        // ==============================
        setAggregatedRelations(
          Array.isArray(res.data.aggregated_relations)
            ? res.data.aggregated_relations
            : []
        );

        // ==============================
        // FIX 3: flatten noise analysis
        // ==============================
        const allNoise = {};

        Object.values(rawSybil).forEach(cluster => {
          if (!cluster?.noise_analysis) return;

          Object.entries(cluster.noise_analysis).forEach(
            ([addr, val]) => {
              allNoise[addr] = val;
            }
          );
        });

        setNoiseAnalysis(allNoise);

        console.log("Graph data loaded:", res.data);
      })
      .catch(err => console.error(err));
  }, []);

  return {
    nodes,
    edges,
    clusters,
    similarities,
    dbscan,
    sybil_entities,
    aggregated_relations,
    noiseAnalysis
  };
}