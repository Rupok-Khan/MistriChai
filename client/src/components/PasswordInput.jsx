import React, { useState } from "react";

export default function PasswordInput({ className = "", inputClassName = "form-control", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`password-input-wrap ${className}`.trim()}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={inputClassName}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
