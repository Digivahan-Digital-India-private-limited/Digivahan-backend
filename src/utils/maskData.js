const maskName = (name = "") => {
  if (!name || typeof name !== "string") return "";

  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => (p.length > 1 ? p.charAt(0) + "*".repeat(p.length - 1) : p))
    .join(" ");
};

const maskVehicleNumber = (num = "") => {
  if (!num || typeof num !== "string") return "";

  if (num.length <= 4) return "*".repeat(num.length);

  return num.slice(0, 2) + "*".repeat(num.length - 4) + num.slice(-2);
};

const maskAlphaNumeric = (value = "", visible = 4) => {
  if (!value || typeof value !== "string") return "";

  if (value.length <= visible) {
    return "*".repeat(value.length);
  }

  return "*".repeat(value.length - visible) + value.slice(-visible);
};

module.exports = {
  maskName,
  maskVehicleNumber,
  maskAlphaNumeric,
};
