const getISTDateTime = (addHours = 0) => {
  /* GET CURRENT IST DATE OBJECT */

  const now = new Date();

  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );

  /* OPTIONAL: ADD HOURS (for pickup scheduling etc) */

  if (addHours > 0) {
    ist.setHours(ist.getHours() + addHours);
  }

  /* FORMAT DATE */

  const year = ist.getFullYear();

  const month = String(ist.getMonth() + 1).padStart(2, "0");

  const day = String(ist.getDate()).padStart(2, "0");

  const date = `${year}-${month}-${day}`;

  /* FORMAT TIME */

  const hours = String(ist.getHours()).padStart(2, "0");

  const minutes = String(ist.getMinutes()).padStart(2, "0");

  const seconds = String(ist.getSeconds()).padStart(2, "0");

  const time = `${hours}:${minutes}:${seconds}`;

  /* FORMAT DATETIME */

  const datetime = `${year}-${month}-${day} ${hours}:${minutes}`;

  /* RETURN ALL FORMATS */

  return {
    date, // YYYY-MM-DD

    time, // HH:mm:ss

    datetime, // YYYY-MM-DD HH:mm
  };
};

module.exports = getISTDateTime;
