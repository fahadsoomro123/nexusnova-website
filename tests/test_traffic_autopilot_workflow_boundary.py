from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
AUTOPILOT = ROOT / ".github/workflows/traffic-autopilot.yml"
VALIDATOR = ROOT / ".github/workflows/traffic-autopilot-validate.yml"

ALLOWED_PRIVATE_OUTPUTS = (
    "assets/data/live-tech-pulse.json",
    "assets/data/social-growth-history.json",
    "assets/generated/social-growth-feed.jpg",
    "assets/generated/social-growth-vertical.jpg",
)


class TrafficAutopilotWorkflowBoundaryTests(unittest.TestCase):
    def test_only_named_generated_files_are_allowlisted(self):
        workflow = AUTOPILOT.read_text(encoding="utf-8")
        start = workflow.index("      - name: Enforce review-only publishing boundary")
        end = workflow.index("      - name: Publish run summary", start)
        boundary = workflow[start:end]
        self.assertIn('git status --porcelain --untracked-files=no', boundary)
        self.assertIn('*) disallowed=', boundary, "Unknown tracked file changes must still fail the gate")
        for path in ALLOWED_PRIVATE_OUTPUTS:
            self.assertIn(path, boundary, f"Expected generated output missing from narrow allowlist: {path}")
        self.assertIn("if [ -n \"$disallowed\" ]; then", boundary)

    def test_review_outputs_are_kept_in_private_artifact_only_when_fresh(self):
        workflow = AUTOPILOT.read_text(encoding="utf-8")
        start = workflow.index("      - name: Upload private run diagnostics")
        end = workflow.index("\n      - name:", start + 1)
        upload = workflow[start:end]
        self.assertIn("social-growth-metrics.json", upload)
        self.assertIn("retention-days: 14", upload)
        for path in ALLOWED_PRIVATE_OUTPUTS[1:]:
            self.assertNotIn(
                path,
                upload,
                f"Tracked social output must not be bundled as fresh in the always-uploaded artifact: {path}",
            )
        self.assertNotIn("social-growth-publish.json", upload)

        detect_start = workflow.index("      - name: Detect fresh Social Growth v2 review output")
        detect_end = workflow.index("      - name: Publish run summary", detect_start)
        detect = workflow[detect_start:detect_end]
        self.assertIn("id: fresh-social-growth", detect)
        self.assertIn("if: always()", detect)
        self.assertIn("if [ ! -f social-growth-publish.json ]", detect)
        self.assertIn('echo "fresh=false" >> "$GITHUB_OUTPUT"', detect)
        self.assertIn('echo "fresh=true" >> "$GITHUB_OUTPUT"', detect)
        self.assertIn("campaign missing from generated history", detect)

        fresh_start = workflow.index("      - name: Upload fresh Social Growth review artifacts")
        fresh_upload = workflow[fresh_start:]
        self.assertIn("if: always() && steps.fresh-social-growth.outputs.fresh == 'true'", fresh_upload)
        self.assertIn("social-growth-publish.json", fresh_upload)
        for path in ALLOWED_PRIVATE_OUTPUTS[1:]:
            self.assertIn(path, fresh_upload, f"Fresh review artifact must include: {path}")
        self.assertIn("if-no-files-found: error", fresh_upload)
        self.assertIn("retention-days: 14", fresh_upload)

    def test_public_distribution_remains_disabled_in_daily_pipeline(self):
        workflow = AUTOPILOT.read_text(encoding="utf-8")
        self.assertIn("Automatic public publishing is disabled.", workflow)
        self.assertIn("No commit, push, IndexNow submission or social distribution is performed by this workflow.", workflow)
        self.assertNotIn("python .github/scripts/distribute_social_growth.py", workflow)

    def test_validator_runs_this_regression_test(self):
        workflow = VALIDATOR.read_text(encoding="utf-8")
        self.assertIn("tests/test_traffic_autopilot_workflow_boundary.py", workflow)
        self.assertIn("python tests/test_traffic_autopilot_workflow_boundary.py", workflow)


if __name__ == "__main__":
    unittest.main()
