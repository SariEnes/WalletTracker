export const formatAmount = (val: any) => {
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) return "0";
  if (num < 0.001) return "< 0.001";
  return num.toFixed(4);
};
