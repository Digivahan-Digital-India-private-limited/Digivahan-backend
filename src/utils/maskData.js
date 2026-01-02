const maskName = (name = "") => {
  if (!name) return "";
  const parts = name.split(" ");
  return parts
    .map((p) => p.charAt(0) + "*".repeat(p.length - 1))
    .join(" ");
};

const maskVehicleNumber = (num = "") => {
  if (num.length <= 3) return "***";
  return num.slice(0, 2) + "****" + num.slice(-2);
};

const maskAlphaNumeric = (value = "", visible = 4) => {
  if (!value) return "";
  return "*".repeat(value.length - visible) + value.slice(-visible);
};

module.exports = {
  maskName,
  maskVehicleNumber,
  maskAlphaNumeric,
};
