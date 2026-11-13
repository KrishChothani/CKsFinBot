const DEV_MODE = import.meta.env.VITE_APP_MODE || "DEV";

let BACKEND_URL = "http://localhost:2590";
if (DEV_MODE === "PROD") {
  BACKEND_URL = "https://5hy89vzv02.execute-api.ap-south-1.amazonaws.com/dev";
}

export default BACKEND_URL;
