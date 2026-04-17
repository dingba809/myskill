# Pitfalls and Checks

## Common pitfalls
- Letting the finished skill depend on a temporary staging directory.
- Turning plan examples or assumptions into claimed product fields, options, or syntax.
- Capturing pages with too much navigation noise and too little article structure.
- Mirroring the website tree directly instead of reorganizing by likely user tasks.
- Writing oversized tutorial-style references that are hard to scan during actual use.
- Forgetting metadata constraints until generation time.

## Specific lessons from previous runs
- SmartDNS taught that a skill can look complete while still depending on temporary capture paths; self-containment must be checked explicitly.
- SmartDNS and sing-box both showed that overview pages alone are not enough; object-level pages are often required for accurate config behavior.
- Earlier drafting risked inventing fields from planning examples; every config detail must be traceable to official docs.
- Page extraction quality matters: noisy captures lead to weak references and more hallucination pressure later.
- `short_description` length limits are easy to violate unless checked before or during metadata generation.

## Pre-completion checklist
- Confirm the source was official and appropriate for a config-focused skill.
- Confirm the final references are stored inside the skill directory.
- Confirm `SKILL.md` points to the right references and states hard guardrails.
- Confirm no runtime instruction mentions temporary capture folders, raw capture folders, or source-dump paths.
- Confirm no undocumented fields or syntax are presented as facts.
- Confirm metadata values satisfy the generator constraints.
- Confirm the finished file set is small, purposeful, and self-contained.

## Verification commands to run
```bash
python3 /home/zhoubo/.codex/skills/.system/skill-creator/scripts/quick_validate.py <skill-dir>
python3 <self-containment-check-script> <skill-dir>
find <skill-dir> -maxdepth 3 -type f | sort
sed -n '1,220p' <skill-dir>/SKILL.md
sed -n '1,200p' <skill-dir>/agents/openai.yaml
```
