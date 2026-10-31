import unittest

from run_cpu import result_row


class SummaryTests(unittest.TestCase):
    def test_handle_summary_excludes_setup_and_uses_domain_metrics(self):
        summary = {"metrics": {
            "http_reqs": {"values": {"rate": 101}},
            "benchmark_requests": {"values": {"rate": 100}},
            "benchmark_endpoint_latency": {"values": {"avg": 5, "med": 4, "p(95)": 9, "p(99)": 12}},
            "benchmark_request_errors": {"values": {"rate": 0.02}},
        }}
        row = result_row(summary, "mixed", 10, 1, 99)
        self.assertEqual(row["requestsPerSecond"], 100)
        self.assertEqual(row["p99Ms"], 12)
        self.assertEqual(row["errorRate"], 0.02)
        self.assertEqual(row["exitCode"], 99)

    def test_missing_metrics_are_not_reported_as_zero_errors(self):
        row = result_row({}, "write", 1, 1, 1)
        self.assertIsNone(row["errorRate"])
        self.assertIsNone(row["requestsPerSecond"])

    def test_legacy_export_rate(self):
        row = result_row({"metrics": {"benchmark_request_errors": {"value": 0.03}}}, "write", 1, 1, 0)
        self.assertEqual(row["errorRate"], 0.03)


if __name__ == "__main__":
    unittest.main()
