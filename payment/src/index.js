import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Importing CSS styles
import App from "./App"; // Main application component
import { Toaster } from "react-hot-toast"; // Importing the Toaster component properly

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App /> 
    <Toaster /> {/* Add the Toaster component for notifications */}
  </React.StrictMode>
);
