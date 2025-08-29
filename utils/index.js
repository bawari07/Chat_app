export const FourDigit = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const FiveDigit = () => {
  const digit = Math.random?.()?.toString?.()?.replace("0.", "") || "19354";

  let newDigit = "";

  while (newDigit?.length < 5) {
    newDigit += digit[newDigit?.length];

    if (newDigit?.length >= 5) {
      return newDigit;
    }
  }
};
