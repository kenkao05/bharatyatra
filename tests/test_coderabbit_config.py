"""
Tests for .coderabbit.yaml configuration file.

Validates that the CodeRabbit code review configuration is correctly structured
and contains the expected settings introduced in this PR.
"""

import os
import pytest
import yaml

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", ".coderabbit.yaml")
EXPECTED_TOOLS = {"gitleaks", "semgrep", "eslint"}


@pytest.fixture(scope="module")
def config():
    """Load and return the parsed .coderabbit.yaml configuration."""
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)


# ---------------------------------------------------------------------------
# File-level tests
# ---------------------------------------------------------------------------

class TestFilePresence:
    def test_file_exists(self):
        """The .coderabbit.yaml file must exist in the repository root."""
        assert os.path.isfile(CONFIG_PATH), (
            f".coderabbit.yaml not found at {CONFIG_PATH}"
        )

    def test_file_is_not_empty(self):
        """The configuration file must not be empty."""
        assert os.path.getsize(CONFIG_PATH) > 0, ".coderabbit.yaml is empty"

    def test_file_is_valid_yaml(self):
        """The file must parse as valid YAML without errors."""
        with open(CONFIG_PATH, "r") as f:
            parsed = yaml.safe_load(f)
        assert parsed is not None, "YAML parsed to None (empty document)"

    def test_file_parses_to_dict(self, config):
        """Top-level YAML document must be a mapping (dict), not a list or scalar."""
        assert isinstance(config, dict), (
            f"Expected dict at top level, got {type(config).__name__}"
        )


# ---------------------------------------------------------------------------
# Top-level structure tests
# ---------------------------------------------------------------------------

class TestTopLevelStructure:
    def test_reviews_key_present(self, config):
        """Top-level 'reviews' key must be present."""
        assert "reviews" in config, "Missing top-level 'reviews' key"

    def test_only_expected_top_level_keys(self, config):
        """Only the 'reviews' top-level key is defined in this config."""
        assert set(config.keys()) == {"reviews"}, (
            f"Unexpected top-level keys: {set(config.keys()) - {'reviews'}}"
        )

    def test_reviews_value_is_dict(self, config):
        """The 'reviews' value must be a mapping."""
        assert isinstance(config["reviews"], dict), (
            f"Expected 'reviews' to be a dict, got {type(config['reviews']).__name__}"
        )


# ---------------------------------------------------------------------------
# Profile tests
# ---------------------------------------------------------------------------

class TestReviewProfile:
    def test_profile_key_present(self, config):
        """'profile' key must exist under 'reviews'."""
        assert "profile" in config["reviews"], (
            "Missing 'profile' key under 'reviews'"
        )

    def test_profile_is_assertive(self, config):
        """Profile must be set to 'assertive'."""
        assert config["reviews"]["profile"] == "assertive", (
            f"Expected profile 'assertive', got '{config['reviews']['profile']}'"
        )

    def test_profile_is_string(self, config):
        """Profile value must be a string."""
        assert isinstance(config["reviews"]["profile"], str), (
            f"Expected profile to be str, got {type(config['reviews']['profile']).__name__}"
        )

    def test_profile_is_not_lenient(self, config):
        """Profile must not be a lenient/passive setting (regression: default is 'chill')."""
        lenient_profiles = {"chill", "default", "moderate", "passive"}
        profile = config["reviews"]["profile"]
        assert profile not in lenient_profiles, (
            f"Profile '{profile}' is a lenient setting; expected 'assertive'"
        )


# ---------------------------------------------------------------------------
# Tools section tests
# ---------------------------------------------------------------------------

class TestToolsSection:
    def test_tools_key_present(self, config):
        """'tools' key must exist under 'reviews'."""
        assert "tools" in config["reviews"], (
            "Missing 'tools' key under 'reviews'"
        )

    def test_tools_value_is_dict(self, config):
        """'tools' value must be a mapping."""
        assert isinstance(config["reviews"]["tools"], dict), (
            f"Expected 'tools' to be a dict, got {type(config['reviews']['tools']).__name__}"
        )

    def test_all_expected_tools_present(self, config):
        """All three required tools (gitleaks, semgrep, eslint) must be configured."""
        tools = config["reviews"]["tools"]
        missing = EXPECTED_TOOLS - set(tools.keys())
        assert not missing, f"Missing tools in configuration: {missing}"

    def test_no_unexpected_tools(self, config):
        """No tools other than the expected set should be configured."""
        tools = config["reviews"]["tools"]
        extra = set(tools.keys()) - EXPECTED_TOOLS
        assert not extra, f"Unexpected tools found: {extra}"

    def test_exactly_three_tools_configured(self, config):
        """Exactly three tools must be configured."""
        tools = config["reviews"]["tools"]
        assert len(tools) == 3, (
            f"Expected 3 tools, found {len(tools)}: {list(tools.keys())}"
        )


# ---------------------------------------------------------------------------
# Per-tool enabled flag tests
# ---------------------------------------------------------------------------

class TestToolEnabledFlags:
    @pytest.mark.parametrize("tool_name", sorted(EXPECTED_TOOLS))
    def test_tool_has_enabled_key(self, config, tool_name):
        """Each tool must have an 'enabled' key."""
        tools = config["reviews"]["tools"]
        assert "enabled" in tools[tool_name], (
            f"Tool '{tool_name}' is missing the 'enabled' key"
        )

    @pytest.mark.parametrize("tool_name", sorted(EXPECTED_TOOLS))
    def test_tool_is_enabled(self, config, tool_name):
        """Each tool's 'enabled' flag must be True."""
        tools = config["reviews"]["tools"]
        assert tools[tool_name]["enabled"] is True, (
            f"Tool '{tool_name}' expected enabled=True, "
            f"got {tools[tool_name]['enabled']!r}"
        )

    @pytest.mark.parametrize("tool_name", sorted(EXPECTED_TOOLS))
    def test_enabled_value_is_boolean(self, config, tool_name):
        """'enabled' must be a Python bool (True), not the string 'true' or integer 1."""
        tools = config["reviews"]["tools"]
        value = tools[tool_name]["enabled"]
        assert isinstance(value, bool), (
            f"Tool '{tool_name}' enabled value is {type(value).__name__!r}, "
            f"expected bool"
        )

    @pytest.mark.parametrize("tool_name", sorted(EXPECTED_TOOLS))
    def test_tool_has_no_extra_keys(self, config, tool_name):
        """Each tool entry should only contain the 'enabled' key (no unknown keys)."""
        tools = config["reviews"]["tools"]
        extra = set(tools[tool_name].keys()) - {"enabled"}
        assert not extra, (
            f"Tool '{tool_name}' has unexpected keys: {extra}"
        )

    def test_gitleaks_enabled(self, config):
        """gitleaks must be explicitly enabled for secret scanning."""
        assert config["reviews"]["tools"]["gitleaks"]["enabled"] is True

    def test_semgrep_enabled(self, config):
        """semgrep must be explicitly enabled for static analysis."""
        assert config["reviews"]["tools"]["semgrep"]["enabled"] is True

    def test_eslint_enabled(self, config):
        """eslint must be explicitly enabled for JavaScript linting."""
        assert config["reviews"]["tools"]["eslint"]["enabled"] is True


# ---------------------------------------------------------------------------
# Regression / boundary tests
# ---------------------------------------------------------------------------

class TestRegressionAndBoundary:
    def test_reviews_section_has_exactly_two_keys(self, config):
        """'reviews' must have exactly 'profile' and 'tools' — no missing or extra keys."""
        reviews_keys = set(config["reviews"].keys())
        assert reviews_keys == {"profile", "tools"}, (
            f"Unexpected keys in 'reviews': {reviews_keys}"
        )

    def test_yaml_safe_load_does_not_produce_dangerous_types(self):
        """safe_load must be used; the document must not contain executable objects."""
        with open(CONFIG_PATH, "r") as f:
            content = f.read()
        # Ensure no YAML tags that could produce non-primitive objects
        assert "!!" not in content, (
            "YAML file contains type tags ('!!') which may produce unexpected types"
        )

    def test_config_is_fully_boolean_not_string_true(self, config):
        """Verify PyYAML correctly deserialises YAML `true` to Python True for all tools."""
        tools = config["reviews"]["tools"]
        for tool_name, tool_cfg in tools.items():
            value = tool_cfg.get("enabled")
            assert value is not None and value is True and isinstance(value, bool), (
                f"Tool '{tool_name}': 'enabled' should be bool True, got {value!r}"
            )

    def test_missing_tool_would_fail(self, config):
        """Boundary: a tool not in the config is absent (validates lookup logic)."""
        tools = config["reviews"]["tools"]
        assert "bandit" not in tools, (
            "'bandit' should not be present in this configuration"
        )

    def test_profile_case_sensitive(self, config):
        """'assertive' must be lowercase — YAML values are case-sensitive."""
        profile = config["reviews"]["profile"]
        assert profile == profile.lower(), (
            f"Profile value '{profile}' is not lowercase"
        )
        assert profile == "assertive"