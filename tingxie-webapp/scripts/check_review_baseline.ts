import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

type Fixture = {
    id: string;
    category: string;
    synthetic: boolean;
    submission: {
        title: string;
        body: string;
        metadata: {
            declaredTopic: string;
            attachments: unknown[];
            rewriteCandidate?: string;
        };
    };
    expected: {
        decision: "pass" | "needs_revision";
        findingCodes: string[];
    };
};

type FixtureFile = {
    schemaVersion: number;
    description: string;
    cases: Fixture[];
};

const fixturePath = path.join(process.cwd(), "tests", "fixtures", "review-baseline.json");
const fixtureFile = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as FixtureFile;
const requiredCategories = new Set([
    "complete",
    "incomplete",
    "under-80-word",
    "off-topic",
    "repeated-identical-phrase/error",
    "tense-heavy",
    "placeholder",
    "multimodal-mismatch-metadata",
    "polished-rewrite-drift",
]);

assert.equal(fixtureFile.schemaVersion, 1);
assert.ok(fixtureFile.description.includes("Synthetic"));
assert.equal(fixtureFile.cases.length, requiredCategories.size);

const ids = new Set<string>();
for (const fixture of fixtureFile.cases) {
    assert.ok(!ids.has(fixture.id), `Duplicate fixture id: ${fixture.id}`);
    ids.add(fixture.id);
    assert.ok(requiredCategories.delete(fixture.category), `Unexpected or duplicate category: ${fixture.category}`);
    assert.equal(fixture.synthetic, true, `${fixture.id} must be explicitly synthetic`);
    assert.ok(fixture.submission.title.trim());
    assert.ok(fixture.submission.body.trim());
    assert.ok(fixture.submission.metadata.declaredTopic.trim());
    assert.ok(Array.isArray(fixture.submission.metadata.attachments));

    if (fixture.category === "complete") {
        assert.equal(fixture.expected.decision, "pass");
        assert.deepEqual(fixture.expected.findingCodes, []);
    } else {
        assert.equal(fixture.expected.decision, "needs_revision");
        assert.ok(fixture.expected.findingCodes.length > 0);
    }

    if (fixture.category === "under-80-word") {
        const wordCount = fixture.submission.body.trim().split(/\s+/u).length;
        assert.ok(wordCount < 80, `Under-80 fixture has ${wordCount} words`);
    } else {
        const wordCount = fixture.submission.body.trim().split(/\s+/u).length;
        assert.ok(wordCount >= 80, `${fixture.id} unexpectedly has only ${wordCount} words`);
    }

    if (fixture.category === "multimodal-mismatch-metadata") {
        assert.ok(fixture.submission.metadata.attachments.length > 0);
    }

    if (fixture.category === "polished-rewrite-drift") {
        assert.ok(fixture.submission.metadata.rewriteCandidate?.trim());
    }
}

assert.deepEqual([...requiredCategories], [], "Missing required fixture categories");
console.log(`Validated ${fixtureFile.cases.length} privacy-safe review baseline fixtures.`);
