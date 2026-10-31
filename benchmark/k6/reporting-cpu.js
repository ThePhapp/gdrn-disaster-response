export { default, setup, options } from './reporting.js';

// Write metrics only: setup_data contains the authentication token.
export function handleSummary(data) {
  if (!__ENV.K6_SUMMARY_PATH) throw new Error('K6_SUMMARY_PATH is required by the CPU runner.');
  return { [__ENV.K6_SUMMARY_PATH]: JSON.stringify({ metrics: data.metrics }, null, 2) };
}
