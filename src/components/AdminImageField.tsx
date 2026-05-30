"use client";

interface AdminImageFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSize?: (width: number, height: number) => void;
  placeholder?: string;
  required?: boolean;
}

function readImageSize(url: string, onSize?: (width: number, height: number) => void) {
  if (!onSize || !url) return;
  const image = new window.Image();
  image.onload = () => onSize(image.naturalWidth || 0, image.naturalHeight || 0);
  image.src = url;
}

export default function AdminImageField({ label, value, onChange, onSize, placeholder = "https://...", required }: AdminImageFieldProps) {

  const updateValue = (nextValue: string) => {
    onChange(nextValue);
    readImageSize(nextValue, onSize);
  };

  return (
    <div className="admin-image-field">
      {label && <label>{label}</label>}
      <input
        value={value}
        onChange={(event) => updateValue(event.target.value)}
        className="admin-input"
        placeholder={placeholder}
        required={required}
      />
      {value && (
        <div className="admin-image-preview">
          <img src={value} alt="" />
        </div>
      )}
    </div>
  );
}