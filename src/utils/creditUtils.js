const getNoCreditsMessage = () => {
  const now = new Date();
  const currentDay = now.getDate();
  const daysToAdd = 3 - ((currentDay - 1) % 3);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  
  let nextDate;
  if (currentDay + daysToAdd > daysInMonth) {
    nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else {
    nextDate = new Date(now.getFullYear(), now.getMonth(), currentDay + daysToAdd);
  }
  
  const showDate = new Date(nextDate);
  showDate.setDate(showDate.getDate() - 1);
  
  const formattedDate = showDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  
  return `You have used all your credits. You can check again after ${formattedDate}.`;
};

module.exports = {
  getNoCreditsMessage
};
