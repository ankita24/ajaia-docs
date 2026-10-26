# AI-Native Workflow Note — Ajaia

## Overview

I used ChatGPT as an AI engineering assistant while building Ajaia, a collaborative document editor inspired by Google Docs. I remained responsible for the implementation, integration, testing, and technical decisions.

My goal was to use AI to accelerate development while keeping the application intentionally scoped and verifying important behavior manually.

## AI Tools Used

- **ChatGPT:** Used for implementation guidance, React and TypeScript code suggestions, Supabase SQL and Row-Level Security (RLS) debugging, error analysis, and incremental code reviews.
- **VS Code and browser developer tools:** Used to implement the changes, inspect compiler and runtime errors, and verify application behavior.
- **Supabase Dashboard and SQL Editor:** Used to inspect the database schema, review security policies, and investigate failed database operations.

## Where AI Materially Accelerated Development

### 1. Database debugging and access control

AI helped diagnose a Supabase `42501` error that prevented document creation. We inspected the existing RLS policies and adjusted the document insertion and reading policies so authenticated owners could create and read their documents while shared-document access remained subject to authorization rules.

### 2. Feature implementation

AI accelerated the implementation of the document-sharing workflow, including recipient lookup by email, Viewer and Editor permissions, duplicate-share handling, collaborator management, and access revocation.

It also helped structure the document editor, autosave behavior, and TXT/Markdown import workflow.

### 3. Iterative debugging

Instead of generating the entire application in one pass, I used AI to investigate specific problems as they appeared. Examples included duplicate TypeScript imports, mismatched permission values, and incorrectly nested JSX in the collaborator interface.

This incremental approach made it easier to isolate problems and preserve existing functionality.

## AI-Generated Output Changed or Rejected

I did not treat generated code as correct simply because it compiled or looked plausible.

- **Duplicate imports:** An added Supabase import caused a Vite compilation error because the module was already imported. I removed the duplicate.
- **Permission conventions:** Initial sharing code used permission values that did not match the existing database authorization function. I aligned the implementation with the application's `viewer` and `editor` conventions.
- **Duplicate sharing:** The initial implementation returned a database constraint error when sharing with an existing recipient. I changed the behavior to handle existing shares and update permissions when appropriate.
- **Collaborator interface:** The first layout placed the collaborators heading and loading states inside the collaborator loop. I restructured the JSX to display the heading once and render collaborators as separate rows.
- **Feature scope:** I intentionally deferred email invitations and email delivery rather than introducing another service and additional configuration under time pressure.

## How I Verified Correctness and Reliability

I used a combination of manual testing, database inspection, and browser diagnostics.

- Created documents and verified that they persisted after navigating away and reopening them.
- Renamed documents and checked that their titles appeared in the dashboard.
- Imported a TXT file, edited its contents, and verified persistence.
- Inspected Supabase document records and compared document IDs and titles with the values passed by the sharing interface.
- Tested sharing records, duplicate-share handling, Viewer and Editor permission changes, and the recipient's Shared with me dashboard.
- Inspected RLS policies and the database function used to determine whether a user can edit a document.
- Used browser developer tools to investigate compilation and database errors.

These checks helped identify implementation issues that would otherwise have been easy to overlook. They do not replace automated tests or a complete security review.

## Current Limitations and Next Steps

The implemented scope prioritizes document creation, rich-text editing, autosave, persistence, TXT/Markdown import, and basic sharing permissions.

The following remain incomplete or require further verification:

- Complete end-to-end verification that the exact intended document content is consistently loaded for both owners and recipients.
- Automated tests covering document operations, sharing, permission changes, and access revocation.
- A final review of all RLS policies and authorization edge cases.
- Email notifications for new shares and permission changes.
- Final deployment, setup documentation, and submission packaging.

Given another two to four hours, I would prioritize end-to-end sharing tests, automated authorization tests, and a clean reviewer setup experience before attempting optional collaboration features.

## Reflection

The most useful aspect of AI in this project was reducing the time spent investigating unfamiliar errors and turning requirements into concrete implementation steps. The process also demonstrated why AI-generated code requires context: suggestions must be reconciled with the existing schema, permission model, and application structure.

I treated AI as a tool for accelerating implementation and problem-solving, while relying on manual verification and direct inspection of the application and database to assess whether the changes worked.
