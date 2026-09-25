import assert from "node:assert/strict";
import { createSeedState } from "../src/lib/mockData";
import { assertPublishable } from "../src/lib/policy";
import {
  accessLevel,
  buildHandoffSummary,
  dataQuality,
  datedTrends,
  healthVault,
  isApproved,
  shareStatus,
} from "../src/lib/vault";
import type { RecordShare } from "../src/lib/types";

const state = createSeedState();
const patient = { role: "patient" as const, id: "patient-arun", name: "Arun Kumar" };
const priya = { role: "doctor" as const, id: "doctor-2", name: "Dr. Priya Nair" };
const rahul = { role: "doctor" as const, id: "doctor-3", name: "Dr. Rahul Menon" };

const own = healthVault(state, patient, "patient-arun");
assert.equal(own.access, "own");
assert.equal(JSON.stringify(own).includes("ai_draft"), false);
assert.equal(own.findings.every((item) => !("jev" in item)), true);

assert.equal(accessLevel(state, priya, "patient-arun"), "treating");
assert.equal(accessLevel(state, rahul, "patient-arun"), null);
assert.throws(() => healthVault(state, rahul, "patient-arun"), /Forbidden/);

const expired: RecordShare = {
  id: "s1",
  patient_id: "patient-arun",
  shared_with_doctor_id: "doctor-3",
  access_token: "MA-TEST",
  permissions: ["allergies"],
  expires_at: "2020-01-01T00:00:00.000Z",
  purpose: "Consultation",
  status: "ACTIVE",
  created_at: "2020-01-01T00:00:00.000Z",
  revoked_at: null,
};
assert.equal(shareStatus(expired, new Date("2026-01-01")), "EXPIRED");
assert.throws(() => healthVault({ ...state, shares: [expired] }, rahul, "patient-arun", new Date("2026-01-01")), /Forbidden/);

const revoked = { ...expired, status: "REVOKED" as const, revoked_at: "2026-01-01T00:00:00.000Z", expires_at: "2099-01-01T00:00:00.000Z" };
assert.equal(shareStatus(revoked), "REVOKED");

const active = { ...expired, expires_at: "2099-01-01T00:00:00.000Z", permissions: ["allergies"] as RecordShare["permissions"] };
const shared = healthVault({ ...state, shares: [active] }, rahul, "patient-arun", new Date("2026-09-01"));
assert.equal(shared.findings.length, 0);
assert.equal(shared.reports.length, 0);
assert.ok(shared.allergies.some((item) => item.substance === "Penicillin"));
assert.equal(shared.allergies.some((item) => item.substance === "No known drug allergies"), false);

const hidden = state.findings.find((item) => item.doctor_decision === "pending");
assert.ok(hidden);
assert.equal(isApproved(hidden), false);
assert.equal(own.findings.some((item) => item.id === hidden.id), false);

const missingSource = { ...hidden, checks: { ...hidden.checks, source_found: false }, source: { ...hidden.source, excerpt: "", page: 0, line_start: 0 } };
assert.throws(() => assertPublishable("A note.", missingSource), /no pinned source/);

const hb = state.findings.find((item) => item.id === "f-hb");
assert.ok(hb);
assert.equal(hb.source.page, 1);
assert.equal(hb.source.line_start, 8);

const graphEdges = state.visits.length;
assert.ok(graphEdges >= 3);

const trend = datedTrends(state, "patient-arun").find((item) => item.metric === "Hemoglobin");
assert.ok(trend);
assert.deepEqual(trend.points.map((point) => point.value), [11.2, 10.6, 9.8]);
assert.equal(trend.delta, -0.8);

const quality = dataQuality(state, "patient-arun");
assert.ok(quality.conflicts.some((item) => item.code === "CONFLICTING_ALLERGY"));
assert.ok(quality.missing_information.some((item) => item.code === "MISSING_REFERENCE_RANGE"));
assert.ok(quality.incomplete_trends.some((item) => item.code === "INCOMPLETE_TREND"));

const handoff = buildHandoffSummary(state, "patient-arun");
assert.equal(handoff.includes("iron-deficiency"), false);
assert.equal(handoff.includes("ai_draft"), false);

const rdw = state.findings.find((item) => item.id === "f-rdw");
assert.ok(rdw);
assert.equal(rdw.patient_visible, false);
assert.throws(() => assertPublishable("Within range.", rdw), /reference range/);

const structured = state.findings.length;
assert.ok(structured > 0);
assert.equal(state.system.gemini, true);

console.log("vault checks passed");
