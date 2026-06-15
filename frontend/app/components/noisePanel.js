import { useState } from "react";
import { motion } from "framer-motion";
import NoiseAnalysisModal from "./noiseModal";

/* ================= HELPERS ================= */
function shortenAddress(addr, start = 6, end = 4) {
  if (!addr) return "";
  if (addr.length <= start + end) return addr;
  return `${addr.slice(0, start)}...${addr.slice(-end)}`;
}

export default function NoisePanel({
  noise = [],
  noiseAnalysis = {},
  funders
}) {
  const [selectedNoise, setSelectedNoise] = useState(null);

  const safeNoise = Array.isArray(noise) ? noise : [];

  return (
    <>
      {/* ================= NOISE LIST ================= */}
      {safeNoise.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-3 bg-gray-800 rounded-lg shadow-inner border-l-4 border-orange-500"
        >
          <p className="text-orange-300 font-semibold">
            Isolated / Noise Accounts:
          </p>

          <ul className="mt-1 flex flex-wrap gap-1">
            {safeNoise.slice(0, 10).map((n, i) => (
              <li
                key={i}
                onClick={() => setSelectedNoise(n)}
                title={n}
                className="bg-orange-600/70 text-white px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-orange-500"
              >
                {shortenAddress(n)}
              </li>
            ))}
          </ul>

          <p className="mt-1 text-gray-400 text-xs italic">
            Total isolated accounts: {safeNoise.length}
          </p>
        </motion.div>
      )}

      {/* ================= MODAL ================= */}
      <NoiseAnalysisModal
        selectedNoise={selectedNoise}
        setSelectedNoise={setSelectedNoise}
        noiseAnalysis={noiseAnalysis}
      />
    </>
  );
}