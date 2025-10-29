const DEV_MODE = import.meta.env.VITE_APP_MODE;
console.log(DEV_MODE)
let BACKEND_URL;

if (DEV_MODE === "DEV") {
  BACKEND_URL = "http://localhost:3000/dev";
} else if (DEV_MODE === "PROD") {
  BACKEND_URL = "https://5hy89vzv02.execute-api.ap-south-1.amazonaws.com/dev";
}

export default BACKEND_URL;
