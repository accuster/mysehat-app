//store/constant.ts
export const API_BASE_URL =  "https://app.mysehat.ai/api/v1";

// ✅ Base URL for admin portal (where profile images are stored)
export const ADMIN_BASE_URL = 'https://admin.mysehat.ai';
export const USER_PROFILE_IMAGE_BASE_URL = "https://app.mysehat.ai";

// store/constants.ts
// const ENV = {
//   production: {
//     API_BASE_URL: "https://app.mysehat.ai/api/v1",
//   },
//   staging: {
//     API_BASE_URL: "https://staging.mysehat.ai/api/v1",
//   },
//   development: {
//     API_BASE_URL: "http://127.0.0.1:4007/api/v1",
//   },
// };




// const ENV = {
//   production: {
//     API_BASE_URL: "https://app.mysehat.ai/api/v1",
//     ADMIN_BASE_URL: "https://admin.mysehat.ai",
//   },
//   staging: {
//     API_BASE_URL: "https://staging.mysehat.ai/api/v1",
//     ADMIN_BASE_URL: "https://staging-admin.mysehat.ai",
//   },
//   development: {
//     API_BASE_URL: "http://127.0.0.1:4007/api/v1",
//     ADMIN_BASE_URL: "http://127.0.0.1:4008", // local admin
//   },
// };


// const getEnvVars = () => {
//   if (__DEV__) return ENV.development;
//   return ENV.production;
// };

// export const { API_BASE_URL } = getEnvVars();
// export const { API_BASE_URL, ADMIN_BASE_URL } = getEnvVars();