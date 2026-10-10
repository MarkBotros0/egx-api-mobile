// Every test runs against a fake backend base URL; no test may reach the network.
process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.test/api";
