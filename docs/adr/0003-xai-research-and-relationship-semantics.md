# ADR 0003: xAI research and organization relationship semantics

- Status: Accepted
- Date: 2026-08-10

## Context

Berri combines deterministic SocialAPI data with model-derived classification and research. The earlier implementation used overlapping nested and flat ICP formats, treated ambiguous bio mentions as employment, persisted fallback classifications, and could assign one discovered organization to an entire batch of people.

## Decision

Use `grok-4.5` for classification, schema conversion, and Web/X research. Live research and strict schema conversion are separate provider stages so tool narration or citations cannot corrupt the structured object. X Search covers January 1 of the current year through the current date; prompts prioritize the latest 2026 information while allowing older sources for enduring facts. Structured responses receive one schema-only retry, and malformed batches can split into smaller independently validated batches. Provider responses are validated before any write. Failed or incomplete classification does not create a fallback graph state.

The canonical person-to-organization relationships are:

- `WORKS_AT`: explicit current employment, founding, or leadership.
- `WORKED_AT`: explicit former employment.
- `MEMBER_OF`: non-employment membership or an ambiguous but meaningful organization connection. Its `kinds` property may contain `dao`, `community`, `school`, `guild`, `collection`, `advisor`, `ambassador`, `investor`, or `unknown`.
- `AFFILIATED_WITH`: an official affiliation returned by SocialAPI.

There is no `ASSOCIATED_WITH` relationship. A person may have each relationship with many organizations and may simultaneously have multiple relationship types with the same organization. Relationship identity is therefore `(person, organization, relationship type)`, not merely `(person, organization)`.

Model-owned relationship snapshots reconcile only `WORKS_AT`, `WORKED_AT`, and `MEMBER_OF` edges that are not user-confirmed. They never delete or replace `AFFILIATED_WITH`. xAI affiliate research supplies discovery candidates to classification; an otherwise ambiguous researched connection becomes `MEMBER_OF` with `unknown`. Only accounts returned by SocialAPI's official affiliation endpoint receive `AFFILIATED_WITH` edges.

ICP analysis has one flat Zod schema and one replace-style persistence path. Its cache lifetime is 60 days. The application does not persist model, token, search-count, latency, cache-status, or estimated-cost telemetry, and the domain schema does not add evidence fields or evidence filtering.

Multi-agent research and Collections are deferred because they are not required for this beta workflow.

## Consequences

- Multiple current jobs and multiple simultaneous relationship meanings are retained.
- Ambiguous connections are represented without overstating employment.
- SocialAPI remains authoritative for official X affiliations.
- A fresh canonical ICP snapshot clears stale fields instead of mixing generations.
- Provider failures remain visible and retryable instead of becoming incorrect durable data.
