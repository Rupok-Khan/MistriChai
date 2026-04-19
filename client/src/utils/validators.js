export function isEmail(x) {
  return typeof x === "string" && x.includes("@");
}

export function isValidMobile(x) {
  return typeof x === "string" && x.replace(/\D/g, "").length >= 10;
}
