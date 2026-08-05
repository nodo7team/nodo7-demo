# Support ticket — activation codes created via Reseller API expire immediately

Sent to the panel provider on 2026-08-05. Kept here so the findings are not lost
if the ticket thread is.

---

**Subject:** Reseller API — `create_activecode` always sets `exp_date`, codes never reach OnWatch state

---

Hello,

I am automating demo provisioning through the Reseller API. Activation codes
created through the API are unusable in the app, while identical codes created
by hand in the panel work correctly. I have narrowed the difference down to a
single field and would like to know the correct API call.

## Account

| | |
|---|---|
| Reseller username | `paneldemos` |
| Member ID | `1681` |
| Group | `20` — SUPER RESELLERS CON API |
| Panel | `dns.nodo7.xyz:8080` |

Relevant permissions returned by `user_info`:

```
enable_activecode:     1
force_batch_code:      1
generate_mass_trial:   0
default_code_length:   10
min_code_length:       10
max_code_length:       12
```

## The problem

Activation codes created with `create_activecode` are created **already
expired or already counting down**. The app does not accept them, because there
is no pending activation left to perform.

Codes created manually in the panel are created in **OnWatch** state — the
duration starts when the customer first watches — and they work.

## Side-by-side evidence

Both use package `7` (DEMO 1 HORA FULL), same reseller, same day.

| Field | ID 54190 — created in panel — **works** | ID 54181 — created via API — **fails** |
|---|---|---|
| `code` | `1462484569` | `1849649048` |
| `exp_date` | `null` | `1785901654` |
| Batch (Lote) | `paneldemos` | *(empty)* |
| Transaction ID | `4WT6RSCKQ6RB` | *(empty)* |
| Expiration shown in panel | **OnWatch**, Dur: 1 hours | Start 04-08-2026 / End 04-08-2026 |
| Remaining shown in panel | ∞ | Expired |
| `enabled` / `admin_enabled` | 1 / 1 | 1 / 1 |
| `is_trial` | 1 | 1 |
| `package_id` | 7 | 7 |
| `bouquet` | 42 entries | 40 entries |

Everything else is identical. The only meaningful difference is `exp_date`,
and the absence of a batch and transaction ID.

## The exact request I send

```
POST http://dns.nodo7.xyz:8080/<access>/reseller/index.php
Content-Type: application/x-www-form-urlencoded

api_key=<redacted>
action=create_activecode
package=7
trial=1
is_isplock=0
code=1849649048
reseller_notes=Demo customer name
```

Response:

```json
{ "status": "STATUS_SUCCESS", "data": { "id": 54181, ... } }
```

The call reports success. The code is stored exactly as submitted and appears
in `get_activecodes`, but with `exp_date` already set.

## Parameter combinations I tested

Every one of these produced a non-null `exp_date`. Times are unix seconds.

| Test ID | Parameters | Resulting `exp_date` | `is_trial` |
|---|---|---|---|
| 54201 | `package=7`, `trial` omitted | creation time (immediately expired) | 0 |
| 54202 | `package=7`, `trial=0` | creation time (immediately expired) | 0 |
| 54203 | `package=7`, `trial=1` | creation time + 1 hour | 1 |
| 54204 | `package=7`, `trial=0`, `is_trial=0` | creation time | 0 |
| 54205 | `package=6`, `trial=0` | creation time | 0 |

I also tried supplying `bouquets_selected[]` explicitly and `allowed_ips[]`
empty. Neither changed `exp_date`.

## Batch endpoints I looked for

Since my group has `force_batch_code: 1`, and working codes carry a batch and a
transaction ID, I assume the panel uses a batch creation path. I probed these
action names. All returned `STATUS_FAILURE` with an empty message — the same
response as a deliberately invalid action name, so I believe none of them
exist:

```
create_activecodes        batch_create_activecode   create_batch_activecode
mass_activecode           create_mass_activecode    generate_activecodes
batch_activecode          create_activecode_batch   gen_activecode
generate_activecode       gen_activecodes           create_code
create_codes              gen_code                  gen_codes
batch_code                batch_codes               create_batch
gen_batch                 generate_batch            mass_trial
gen_mass_trial            generate_mass_trial       create_mass_trial
mass_trials               create_trial              gen_trial
gen_trials                get_batches               get_codes
```

`create_activecode` is the only activation-code creation action that responds
differently from an unknown action.

## Documentation discrepancy

The published documentation shows the `create_activecode` response containing a
`code` field:

```json
{ "status": "STATUS_SUCCESS",
  "data": { "id": 892, "code": "PROMO-2025-ABCD", "package_id": 1, ... } }
```

In practice the response contains no `code` field at all. This is workable — I
submit my own code and it is stored — but the documentation should probably be
corrected.

## My questions

1. **Is there a Reseller API endpoint to create activation codes as a batch**,
   producing codes in OnWatch state with a transaction ID, the same way the
   panel UI does? If so, what is the action name and its parameters?

2. **If there is no batch endpoint, can `create_activecode` produce a pending
   code** with `exp_date = null`? Is there a parameter I am missing?

3. **Does `force_batch_code: 1` on my group affect this?** Should activation
   codes created through the API behave differently because of it, and is that
   setting adjustable?

4. If none of the above is possible today, **is it on the roadmap?** Automated
   demo provisioning is unusable for activation codes without it.

Username/password lines created with `create_line` work perfectly, so this is
specific to activation codes.

Thank you.
