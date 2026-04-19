import React from "react";

export default function Alert({ type = "danger", children }) {
  if (!children) return null;
  return <div className={`alert alert-${type}`}>{children}</div>;
}
