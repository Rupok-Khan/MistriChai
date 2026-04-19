import React from "react";

export default function FormInput({ label, type="text", value, onChange, required=false, placeholder, ...rest }) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <input
        type={type}
        className="form-control"
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        {...rest}
      />
    </div>
  );
}
