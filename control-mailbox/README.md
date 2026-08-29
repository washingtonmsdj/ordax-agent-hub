# OrdaX Control Mailbox

This directory is a transport surface for the OrdaX development Control Plane.

It is **not** an execution engine and it never contains device credentials, Supabase service-role credentials, private keys, or plaintext SYSTEM scripts.

The active mailbox file is `request.json`. Requests are encrypted for the enrolled developer device. The OrdaX backend independently verifies the GitHub source commit, the configured repository/path/authorized GitHub identity, request expiry, payload hash and device binding before it can enqueue a SYSTEM job. Actual execution remains exclusively in the OrdaX Development Agent through the existing Control Plane lease/fencing/audit path.

Public repository visibility is intentional: confidentiality comes from per-device encryption; GitHub authentication supplies the transport writer identity. Production/release devices are not eligible for this development transport.
