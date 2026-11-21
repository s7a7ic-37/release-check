const candidate = location.pathname.replace(/\/$/, "").split("/").at(-1) === "candidate";
const total = document.getElementById("total");
const fee = document.getElementById("fee");
const status = document.getElementById("status");

document.querySelectorAll('[name="fulfilment"]').forEach(input => {
  input.addEventListener("change", () => {
    const collection = document.querySelector('[name="fulfilment"]:checked').value === "collection";
    fee.textContent = collection ? "£0.00" : "£3.00";
    // The candidate intentionally keeps the old total when the fee changes.
    if (!candidate || !collection) total.textContent = collection ? "£12.00" : "£15.00";
    status.textContent = "";
  });
});
document.getElementById("confirm").addEventListener("click", () => {
  status.textContent = "Sample order confirmed.";
});
