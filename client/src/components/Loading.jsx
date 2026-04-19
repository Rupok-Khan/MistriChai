import React from "react";

export default function Loading({ text="Loading..." }) {
  return (
    <div className="eco-card p-4 text-center">
      <div className="spinner-border" role="status" />
      <div className="small-muted mt-2">{text}</div>
    </div>
  );
}
