import { motion, AnimatePresence } from "framer-motion";

export default function NoiseAnalysisModal({
  selectedNoise,
  setSelectedNoise,
  noiseAnalysis = {}
}) {
  const data = noiseAnalysis?.[selectedNoise];

  if (!selectedNoise || !data) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSelectedNoise(null)}
      >
        <motion.div
          className="bg-gray-900 text-white p-6 rounded-xl w-[780px] max-h-[85vh] overflow-y-auto shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-orange-400">
              Noise Wallet Deep Analysis
            </h2>

            <button
              onClick={() => setSelectedNoise(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-4 break-all">
            Wallet: {selectedNoise}
          </p>

          {/* ================= GRAPH ================= */}
          <Section title="Graph-based Risk">
            <Row label="Influence from outgoing paths (forward graph)">
              {data.forward_E.toFixed(4)}
            </Row>

            <Row label="Influence from incoming paths (backward graph)">
              {data.backward_E.toFixed(4)}
            </Row>

            <Row label="Total graph risk score">
              {(
                data.forward_x + data.backward_x
              ).toFixed(4)}
            </Row>
          </Section>

          {/* ================= BEHAVIOR ================= */}
          <Section title="Behavior Similarity">
            <Row label="Behavior risk score">
              {data.behavior_E.toFixed(4)}
            </Row>

            <Row label="Behavior intensity">
              {data.behavior_x.toFixed(4)}
            </Row>

            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2">
                Most similar Sybil wallets (top matches)
              </p>

              {data.similar_wallets?.length ? (
                <ul className="space-y-1">
                  {data.similar_wallets.map(([addr, sim], i) => (
                    <li key={i} className="text-xs text-gray-300">
                      <span className="text-orange-400">{addr}</span>
                      {" → similarity "}
                      <span className="text-white">
                        {sim.toFixed(4)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">
                  No strong Sybil behavior matches found
                </p>
              )}
            </div>
          </Section>


          {/* ================= FINAL ================= */}
          <Section title="Final Decision (Ensemble Model)">
            <Row label="Graph-based contamination score">
              {data.C_graph.toFixed(4)}
            </Row>

            <Row label="Behavior-based contamination score">
              {data.C_beh.toFixed(4)}
            </Row>

            <Row label="Unified contamination score">
              {data.C_uni.toFixed(4)}
            </Row>

            <div className="mt-3 p-3 bg-orange-500/20 rounded">
              <p className="text-orange-300 font-bold">
                FINAL RISK SCORE: {data.final_contamination.toFixed(4)}
              </p>
            </div>
          </Section>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= HELPERS ================= */

function Section({ title, children }) {
  return (
    <div className="mb-5 border-b border-gray-700 pb-3">
      <h3 className="text-orange-300 font-semibold mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between text-sm text-gray-300">
      <span>{label}</span>
      <span className="text-white">{children}</span>
    </div>
  );
}