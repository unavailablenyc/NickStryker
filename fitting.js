const form = document.querySelector("#fitting-form");
const params = new URLSearchParams(location.search);
const requested = params.get("piece");
const select = form.querySelector("[name=piece]");

if (requested) {
  const match = [...select.options].find((option) => option.value === requested);
  if (match) select.value = requested;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const email = String(data.get("email") || "").trim();
  const phone = String(data.get("phone") || "").trim();
  const piece = String(data.get("piece") || "").trim();
  const when = String(data.get("when") || "").trim();
  const note = String(data.get("note") || "").trim();
  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : "",
    `Piece: ${piece}`,
    when ? `When: ${when}` : "",
    "",
    note,
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
  const subject = `Fitting request — ${name}`;
  location.href = `mailto:nickstryker@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
