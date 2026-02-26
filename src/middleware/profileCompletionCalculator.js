const ACCOUNT_CREATE_PERCENT = 20;
const EMERGENCY_CONTACT_PERCENT = 40;
const REMAINING_PERCENT = 40;

const TOTAL_FIELDS = 11; // basic + public
const PER_FIELD_PERCENT = REMAINING_PERCENT / TOTAL_FIELDS;

const isValid = (val) =>
  val !== undefined && val !== null && val !== "" && val !== 0;

const calculateProfileCompletion = (user) => {
  let percent = ACCOUNT_CREATE_PERCENT;

  let completedFields = 0;

  // basic
  const basic = user.basic_details || {};
  const basicFields = [
    "profile_pic",
    "first_name",
    "last_name",
    "phone_number",
    "email",
    "occupation",
  ];

  basicFields.forEach((field) => {
    if (isValid(basic[field])) completedFields++;
  });

  // public
  const pub = user.public_details || {};
  const publicFields = ["public_pic", "nick_name", "address", "age", "gender"];

  publicFields.forEach((field) => {
    if (isValid(pub[field])) completedFields++;
  });

  percent += completedFields * PER_FIELD_PERCENT;

  // emergency contact
  if (
    Array.isArray(user.emergency_contacts) &&
    user.emergency_contacts.length > 0
  ) {
    percent += EMERGENCY_CONTACT_PERCENT;
  }

  return Math.min(Math.round(percent), 100);
};

module.exports = calculateProfileCompletion;
