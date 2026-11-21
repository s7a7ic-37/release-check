export function verdict(results) {
  return results.length === 2
    && ["baseline", "candidate"].every(id => results.some(result => result.id === id && result.status === "passed"))
    ? "ready"
    : "blocked";
}
