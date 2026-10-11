#!/bin/sh
# Push autonomy-log only when the verifier says so (E88: a push chained after
# `echo EXIT=$?` went out red). Run from the repo root after `git commit`.
# Pushes on exit 2 (correct, unpublished), refuses on anything else, then
# requires exit 0 once published. Witnessed red on a dirty tree, 2026-10-10.
python check_agents.py; rc=$?
if [ "$rc" -ne 2 ]; then echo "NOT PUSHING: checker exit $rc"; exit 1; fi
git push -q origin main || exit 1
git fetch -q; python check_agents.py; rc=$?
echo "POST-PUSH checker exit $rc, HEAD $(git rev-parse --short HEAD)"; exit $rc
