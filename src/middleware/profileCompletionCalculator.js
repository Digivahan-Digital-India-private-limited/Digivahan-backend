const PROFILE_FIELDS = {
  basic_details: [
    "profile_pic",
    "first_name",
    "last_name",
    "phone_number",
    "email",
    "occupation",
  ],
  public_details: ["public_pic", "nick_name", "address", "age", "gender"],
  emergency_contacts: [
    "first_name",
    "last_name",
    "relation",
    "phone_number",
    "email",
  ],
};

const TOTAL_FIELDS =
  PROFILE_FIELDS.basic_details.length + PROFILE_FIELDS.public_details.length;
const PER_FIELD_PERCENT = Math.floor(100 / TOTAL_FIELDS);

// Calculator profile percentage function
const calculateProfileCompletion = (user) => {
  let completed = 0;

  // ✅ basic details check
  PROFILE_FIELDS.basic_details.forEach((field) => {
    const val = user.basic_details?.[field];
    if (val !== undefined && val !== null && val !== "" && val !== 0) {
      completed++;
    }
  });

  // ✅ public details check
  PROFILE_FIELDS.public_details.forEach((field) => {
    const val = user.public_details?.[field];
    if (val !== undefined && val !== null && val !== "" && val !== 0) {
      completed++;
    }
  });

  // ✅ emergency contact check (minimum 1 required)
  const hasEmergencyContact =
    Array.isArray(user.emergency_contacts) &&
    user.emergency_contacts.length >= 1;

  // 🔥 FINAL DECISION
  if (completed === TOTAL_FIELDS && hasEmergencyContact) {
    return 100;
  }

  return Math.min(completed * PER_FIELD_PERCENT, 99);
};

module.exports = calculateProfileCompletion;
