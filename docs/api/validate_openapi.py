"""Validate the reviewed runtime documentation, without starting the app.

Dependencies: PyYAML 6.0.3, openapi-spec-validator 0.7.2,
openapi-schema-validator 0.6.3 (already available in the review environment).
Run at repo root: python docs/api/validate_openapi.py
The historical P00 validator remains separate: validate_phase1_contract.py.
"""
from pathlib import Path
import re

import yaml
from openapi_spec_validator import validate_spec
from openapi_schema_validator import OAS30Validator

ROOT = Path(__file__).resolve().parents[2]


class UniqueKeyLoader(yaml.SafeLoader):
    pass


def unique_mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError(f"Duplicate YAML key: {key}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)
spec = yaml.load((ROOT / "docs/openapi.yaml").read_text(encoding="utf-8"), Loader=UniqueKeyLoader)
validate_spec(spec)


def resolve(value):
    if isinstance(value, dict):
        if "$ref" in value:
            assert value["$ref"].startswith("#/"), "Snapshot must be self-contained"
            target = spec
            for part in value["$ref"][2:].split("/"):
                target = target[part.replace("~1", "/").replace("~0", "~")]
            return resolve(target)
        return {k: resolve(v) for k, v in value.items()}
    if isinstance(value, list):
        return [resolve(v) for v in value]
    return value


resolve(spec)  # All refs must resolve, including schemas without examples.
operations = {}
for path, item in spec["paths"].items():
    for method, operation in item.items():
        if method not in {"get", "post", "put", "patch", "delete", "head", "options"}:
            continue
        eid = operation["operationId"]
        assert eid not in operations, f"Duplicate operationId: {eid}"
        operations[eid] = (method, path)
        expected_security = [] if eid == "E01" else [{"bearerAuth": []}]
        assert operation.get("security", spec["security"]) == expected_security, eid
        assert operation["x-roles"], eid
        if eid != "E01":
            assert {"401", "403"} <= set(operation["responses"]), eid

# Parse the current controller annotation style; do not substitute the planned API.
implemented = {}
for source in (ROOT / "src/main/java/com/gdrn").glob("*/api/*Controller.java"):
    text = source.read_text(encoding="utf-8")
    header = text.split("public class", 1)[0]
    prefix_match = re.search(r'@RequestMapping\(\s*(?:value\s*=\s*)?"([^"]+)"', header)
    prefix = prefix_match.group(1) if prefix_match else ""
    for method, args, annotation in re.findall(
        r'@(Get|Post|Put|Patch|Delete)Mapping(?:\((.*?)\))?\s*@Operation\((.*?)\)', text, re.S
    ):
        eid_match = re.search(r'operationId\s*=\s*"(E\d+)"', annotation)
        assert eid_match, source
        suffix_match = re.match(r'\s*(?:value\s*=\s*)?"([^"]+)"', args)
        suffix = suffix_match.group(1) if suffix_match else ""
        eid = eid_match.group(1)
        assert eid not in implemented, eid
        implemented[eid] = (method.lower(), prefix + suffix)
assert operations == implemented, f"Controller mismatch: spec={operations}, code={implemented}"

checked = 0


def check(schema, example):
    global checked
    OAS30Validator(resolve(schema), format_checker=OAS30Validator.FORMAT_CHECKER).validate(example)
    checked += 1


for schema in spec["components"]["schemas"].values():
    if "example" in schema:
        check(schema, schema["example"])
for path_item in spec["paths"].values():
    for op in path_item.values():
        for parameter in op.get("parameters", []):
            parameter = resolve(parameter)
            if "example" in parameter:
                check(parameter["schema"], parameter["example"])
        for message in [op.get("requestBody", {}), *op["responses"].values()]:
            for media in resolve(message).get("content", {}).values():
                if "example" in media:
                    check(media["schema"], media["example"])
                for example in media.get("examples", {}).values():
                    if "value" in example:
                        check(media["schema"], example["value"])

print(f"PASS: OpenAPI {spec['openapi']}; {len(operations)} operations match controllers; "
      f"all local refs resolve; security metadata present; {checked} examples valid.")
