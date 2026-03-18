// This project uses Yarn node-modules linker (not PnP).
// Some tooling probes for `.pnp.cjs` and may crash if it is missing.
// Keeping this stub avoids ENOENT without enabling PnP.
module.exports = {}

