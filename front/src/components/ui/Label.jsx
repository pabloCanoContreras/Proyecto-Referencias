export function Label({ htmlFor, children, className = "" }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 ${className}`}
    >
      {children}
    </label>
  );
}
