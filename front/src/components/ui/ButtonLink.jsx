import React from "react";
import { Link } from "react-router-dom";

const ButtonLink = ({ to, children, className }) => (
  <Link
    to={to}
    className={`block w-full md:inline-block md:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full ${className}`}
  >
    {children}
  </Link>
);

export { ButtonLink };

