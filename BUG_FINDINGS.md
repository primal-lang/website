# Bug Findings

## High

### [b/resource-and-configuration-parity/platform-detection/linux-arch-assumed-x86-64] Linux architecture is assumed to be x86-64, so aarch64 Linux installs a binary it cannot execute

- **Location:** `public/install.sh:259` (`linux)   echo "x86-64" ;;`); related: `public/install.sh:256-270`, `public/install.sh:588`, `public/install.sh:791-819`
- **Severity:** High
- **Confidence:** High
- **Defect:** `detect_arch` derives the architecture from the operating system alone and never consults `uname -m` on Linux. On an aarch64 Linux host the installer downloads `primal-linux-x86-64`, moves it over `~/.local/bin/primal`, marks it executable, edits the shell config, and only then fails at the last step with `Installation verification failed`. The user is left with a non-executable file named `primal` on their `PATH`, a `PATH` entry pointing at it, and — if a working release was already installed — no working `primal` at all. The two sibling platforms both refuse up front instead: macOS on Intel is turned away at `public/install.sh:262-264` with "Intel Macs are not supported", and the Windows installer refuses non-AMD64 at `public/install.ps1:404-405` with "32-bit Windows is not supported". Linux has no equivalent guard.
- **Trigger:** Run the documented one-liner `curl -fsSL https://primal-lang.org/install.sh | bash` on any aarch64 Linux machine. This is not exotic: AWS Graviton, Ampere hosts, 64-bit Raspberry Pi OS, Asahi Linux, and — most commonly — any Linux container on an Apple Silicon Mac, where `docker run` defaults to the `linux/arm64` platform.
- **Evidence / verification:** Reproduced against a copy of the script in an isolated workspace with `uname` stubbed to report `Linux` / `aarch64`: `detect_os` returned `linux` and `detect_arch linux` returned `x86-64`, so `download_binary` composes `.../bin/primal-linux-x86-64`. Tracing the rest of `main`: the download succeeds (the artifact exists, it is simply for the wrong machine), `install_binary` runs unconditionally at `public/install.sh:792`, and `verify_installation` at `public/install.sh:817` is the first thing that can notice, by which point the move has already happened. Refutation attempt: searched for any other architecture gate on the Linux path — `is_apple_silicon` (`public/install.sh:243-249`) is only reachable from the `macos` branch of `detect_arch`, and nothing else in the file reads `uname -m`. The comment at `public/install.sh:251-255` confirms the omission is deliberate for the artifact-naming scheme but does not add the refusal that macOS and Windows both have. Remaining assumption: the SDK publishes no `primal-linux-arm64` artifact, which is what the single-binary-per-OS comment asserts.
- **Suggested fix:** Read `uname -m` on the Linux branch and refuse anything that is not `x86_64`/`amd64` before any download, with a message in the same shape as the Intel Mac and 32-bit Windows refusals. Keep the check in `detect_arch` so it runs before the rail opens, matching how the other two platforms are handled.

## Medium

### [a/error-handling/binary-installation/no-rollback-on-verification-failure] A failed install destroys the previously working binary, because the move happens before verification

- **Location:** `public/install.sh:607-616`; related: `public/install.sh:791-819`
- **Severity:** Medium
- **Confidence:** High
- **Defect:** `install_binary` moves the freshly downloaded file straight over `$BINARY_PATH`, overwriting any existing installation, and `verify_installation` only runs afterwards. Nothing keeps a copy of the previous binary and nothing restores it, so when verification fails the user ends up worse off than before they ran the installer: the working release is gone, an unusable file sits in its place still marked executable and still on `PATH`, and the rail reports only `Installation failed` / `check ~/.local/bin/primal` without saying that the prior installation was destroyed.
- **Trigger:** Any upgrade where the downloaded artifact cannot run. Guaranteed on aarch64 Linux (see the High finding above). Also reachable when a captive portal or corporate proxy answers the download with an HTTP 200 HTML page (`curl -f` only rejects status >= 400, and nothing checks that the payload is a binary), or when the install directory sits on a `noexec` mount.
- **Evidence / verification:** Traced `main` line by line: `download_binary` (`public/install.sh:785`) → `install_binary` (`public/install.sh:792`), whose `mv "$DOWNLOAD_FILE" "$BINARY_PATH"` at `public/install.sh:612` is unconditional and has no backup step → `verify_installation` (`public/install.sh:817`) → `error_exit` on failure. `error_exit` (`public/install.sh:181-198`) prints and exits; it has no restore path. Refutation attempt: looked for a staged install, a `.bak` copy, an atomic swap, or an `EXIT`/`ERR` trap that could roll back — there is no `trap` anywhere in the file, and `$BINARY_PATH` is written only at `public/install.sh:612`. The Windows installer has the same ordering (`public/install.ps1:874` before `public/install.ps1:899`), so this is not a shell-specific oversight. Reproduction of the full end-to-end sequence in the disposable workspace was blocked by a tooling outage (see Exclusions and Limitations); the path is established by tracing plus the confirmed aarch64 trigger.
- **Suggested fix:** Verify before committing. Move the downloaded file into the install directory under a temporary name, `chmod +x` it, run the `--version` check against that path, and only then rename it over `$BINARY_PATH`. On failure, delete the temporary file and leave the existing installation untouched. If a previous binary must be replaced before it can be tested, save it aside first and restore it when verification fails.

### [b/contract-mismatches/path-management/symlinked-config-replaced-by-temp-file] Uninstall replaces a symlinked shell config with a private regular file, detaching managed dotfiles while reporting the entry removed

- **Location:** `public/install.sh:563-572`; related: `public/install.sh:660-667`
- **Severity:** Medium
- **Confidence:** High
- **Defect:** `remove_from_path` filters the shell config through `mktemp` and then `mv`s the temporary file over the original path. `mv` replaces the destination *entry*, so when `~/.bashrc` is a symlink — the normal arrangement under GNU Stow, chezmoi, yadm, or any hand-rolled dotfiles repo — the symlink is destroyed and becomes a regular file. Two things then go wrong at once: the user's dotfile management is silently broken, and the Primal `PATH` entry survives in the real file that the repository still tracks, even though the rail reports `entry removed from ~/.bashrc`. The file's permissions are also replaced by `mktemp`'s, dropping a conventional `644` config to `600`.
- **Trigger:** Run `install.sh --uninstall` on a machine whose shell config file is a symlink into a dotfiles repository.
- **Evidence / verification:** Reproduced in an isolated fake `HOME`: `~/.bashrc` was created as a symlink to `~/dotfiles/bashrc` (mode 644) containing the installer's comment and export line. After `remove_from_path`, `~/.bashrc` was a `regular file mode=600` with no link target, `~/dotfiles/bashrc` still contained `# Added by Primal SDK installer` and the `export PATH=...` line (grep count 1), and the function returned 0 — which drives the `entry removed` success branch at `public/install.sh:662-663`. Refutation attempt: checked whether the copy could be following the link instead — `mv` was given the destination path directly with no `--no-dereference`/`--dereference` handling and no `readlink` resolution anywhere in the file, and the observed inode type change confirms the symlink itself was replaced. Also checked the Windows counterpart: it edits the registry-backed user `PATH` (`public/install.ps1:664-676`) and has no analogous exposure.
- **Suggested fix:** Resolve the config path with `readlink -f` (or equivalent) before writing, and rewrite the file in place rather than replacing the directory entry — for example write the filtered content back with `cat "$temp_file" > "$config_file"`, which follows the symlink and preserves the original mode and ownership. Delete the temporary file afterwards.

### [a/error-handling/installer-main-flow/unrouted-errexit-aborts-mid-rail] Failures in the mutating steps bypass `error_exit`, leaving a raw shell error inside a half-drawn rail

- **Location:** `public/install.sh:792`; related: `public/install.sh:607-616`, `public/install.sh:518-552`, `public/install.sh:804`, `public/install.sh:650-652`, `public/install.sh:591-592`
- **Severity:** Medium
- **Confidence:** High
- **Defect:** `install_binary`, `add_to_path`, `uninstall`'s `rm -f`, and the two `mktemp` calls all run at the top level of `main` under a bare `set -e`, with no error routing. When any of them fails, bash prints its own diagnostic and exits immediately: the step that was open never settles, so on a terminal the dangling `◇ Installed` node gets the shell's error text appended to it, and the run ends with no failed node, no `Installation failed` summary, and none of the hints `error_exit` exists to provide. This directly contradicts the contract the file states for itself at `public/install.sh:386-388` ("a message of theirs would be printed straight into the middle of the rail, over the step that is still open. Callers report the failure themselves once the step is settled") and at `public/install.sh:736-737`.
- **Trigger:** Any failure in a mutating step. Concretely: `--install-dir` pointing anywhere unwritable or whose parent is not a directory (`mkdir -p` fails inside `install_binary`); a read-only or full `$HOME` (the `>>` appends in `add_to_path` fail); a read-only install directory during `--uninstall` (`rm -f` fails); an unwritable `TMPDIR` (`mktemp` fails).
- **Evidence / verification:** Traced the errexit contexts. The call sites at `public/install.sh:792` and `public/install.sh:804` sit in `main`'s straight-line body and in an `else` branch respectively — neither is a condition context, so errexit is live, unlike `download_file` which is deliberately shielded by `if ! download_file` at `public/install.sh:594`. Confirmed in bash that errexit fires on the constructs involved, including assignment from a failing command substitution (`v=$(f)` where `f` exits 1 aborted the script with status 1 and never reached the following statement). Refutation attempt: searched for any `trap`, `|| error_exit`, or `if !` wrapper around these four call sites — there are none; `trap` does not appear anywhere in the file. Also confirmed the shielded paths really are shielded, so the inconsistency is between call sites rather than absent throughout. Reproduction of the rendered rail output was blocked by a tooling outage (see Exclusions and Limitations).
- **Suggested fix:** Give the mutating steps the same treatment the download already gets: have `install_binary`, `add_to_path`, and the uninstall removal report failure through `error_exit` with a specific message and hint — either by returning a status and wrapping the call in `if ! ...`, or by checking each `mkdir`/`mv`/`chmod`/append individually. Redirect the underlying command's own stderr so it cannot paint over the open step.

### [b/contract-mismatches/shell-config-selection/config-file-not-sourced-by-shell] The chosen shell config file may be one the user's shell never reads, yet success is reported and never re-attempted

- **Location:** `public/install.sh:492-516`; related: `public/install.sh:796-812`, `public/install.sh:829-831`
- **Severity:** Medium
- **Confidence:** Medium
- **Defect:** `get_shell_config_file` maps `$SHELL` to a fixed filename without checking whether that file is on the startup path for the shell it belongs to. In several ordinary configurations the installer writes the `PATH` entry into a file the shell never sources, then reports `◆ Shell PATH` / `added to <file>` and tells the user to `source <file> && primal --version`. Sourcing works in that one shell, so the failure only surfaces later: every new shell has no `primal`. Three concrete cases — zsh with `ZDOTDIR` set, where zsh reads `$ZDOTDIR/.zshrc` and the installer writes `~/.zshrc`; bash on macOS, where Terminal starts login shells that read `~/.bash_profile` while `get_shell_config_file` prefers an existing `~/.bashrc`; and csh/tcsh, which fall through to `*)` and receive `export PATH=...` in `~/.profile`, syntax they cannot parse in a file they do not read. The gap is then permanent, because `add_to_path` is guarded by `if [[ -z "$installed_version" ]]` at `public/install.sh:797`, so a later upgrade never retries it.
- **Trigger:** Install with `ZDOTDIR` exported (common when zsh dotfiles live under `~/.config/zsh`); or with `SHELL=/bin/bash` on macOS with a `~/.bashrc` that `~/.bash_profile` does not source; or with any csh-family login shell.
- **Evidence / verification:** Reproduced the `ZDOTDIR` case in an isolated fake `HOME`: with `SHELL=/usr/bin/zsh` and `ZDOTDIR=$HOME/.config/zsh`, `get_shell_config_file` returned `$HOME/.zshrc` while the file zsh reads is `$ZDOTDIR/.zshrc`. Confirmed by reading `public/install.sh:496-515` that `ZDOTDIR` appears nowhere in the file and that the bash branch tests `~/.bashrc` first, and that the `*)` fallback emits `export` syntax unconditionally at `public/install.sh:548`. Traced the reporting path: `add_to_path` sets `PATH_WAS_MODIFIED=true` at `public/install.sh:551` purely because the append succeeded, so `public/install.sh:806-807` prints the success detail regardless of whether the file is ever read. Refutation attempt: checked whether `path_contains_install_dir` or the `Verified` step could catch it — `path_contains_install_dir` inspects the *current* process `PATH` before the edit, and `verify_installation` invokes `$BINARY_PATH` by absolute path, so neither can detect that the persisted entry is inert. Remaining uncertainty, and the reason confidence is Medium: how frequently each of the three environments occurs among users, not whether the defect path exists.
- **Suggested fix:** Honour `ZDOTDIR` for zsh. For bash, prefer the file the platform's login shells actually read (`~/.bash_profile` on macOS) or write to both. For unknown shells, either skip the edit and tell the user which line to add, or emit syntax appropriate to the shell family rather than assuming POSIX `export`. Separately, re-run the `PATH` check on upgrades instead of only on fresh installs so a missing entry can be repaired.

## Low

### [a/error-handling/path-management/no-op-reported-as-removal] Uninstall reports the `PATH` entry removed whenever a shell config file merely exists

- **Location:** `public/install.sh:555-573`; related: `public/install.sh:660-667`
- **Severity:** Low
- **Confidence:** High
- **Defect:** `remove_from_path` returns the exit status of its final `mv`, which succeeds whenever the config file exists — whether or not it contained a Primal entry. Its own comment at `public/install.sh:554` claims it "Returns non-zero when there was no shell config file to clean up", but the only non-zero return is the missing-file case at `public/install.sh:559-561`. `uninstall` treats the 0 as proof of work and prints `◆ Shell PATH` / `entry removed from ~/.bashrc`, so a user who never had the entry, or who installed to a different `--install-dir` than they are now uninstalling, is told something was cleaned up that never existed.
- **Trigger:** Run `install.sh --uninstall` on any machine that has a shell config file but no Primal `PATH` entry — including every run where the user removed the line by hand, and every run where `--install-dir` differs from the one used at install time.
- **Evidence / verification:** Reproduced in an isolated fake `HOME` with a `~/.bashrc` containing only `export EDITOR=vim` and an `ll` alias: `remove_from_path` returned 0 and the file's SHA-256 was unchanged, which selects the success branch at `public/install.sh:662-663`. Refutation attempt: checked whether the caller independently confirms removal — `uninstall` branches solely on the function's status at `public/install.sh:661` and does not compare the file before and after, and the `grep -vF` pipeline's own status is discarded by `|| true` at `public/install.sh:570`. Cross-checked the intended contract against the Windows installer, whose `Remove-FromPath` returns `$false` when there is no entry (`public/install.ps1:664-667`), so the shell version diverges from the behaviour the sibling script defines.
- **Suggested fix:** Detect whether the filter actually changed anything — compare the filtered output with the original, or count matching lines before filtering — and return non-zero when nothing was removed, so the existing failure branch reports "no entry found" instead of a false success.

### [a/resource-management/binary-installation/downloaded-file-leaked-on-failure] The downloaded binary is left in `TMPDIR` on every failure between download and move

- **Location:** `public/install.sh:591`; related: `public/install.sh:599`, `public/install.sh:607-616`
- **Severity:** Low
- **Confidence:** High
- **Defect:** `DOWNLOAD_FILE` is created by `mktemp` and removed on exactly one path — the download-failure branch at `public/install.sh:599`. There is no `EXIT` trap, so any abort after a successful download but before `mv` completes leaves the full multi-megabyte artifact in `TMPDIR` indefinitely. Repeated failed attempts accumulate one copy each.
- **Trigger:** A failure inside `install_binary` (unwritable install directory, full disk), or interrupting the run with Ctrl-C after the download finishes.
- **Evidence / verification:** Searched the file for cleanup of `DOWNLOAD_FILE`: it is assigned at `public/install.sh:591` and removed only at `public/install.sh:599`, and `trap` does not appear anywhere in the script. `install_binary` at `public/install.sh:607-616` consumes it via `mv` with no cleanup on the failure path, and as established in the errexit finding above those failures abort `main` outright. Refutation attempt: checked whether the operating system would reclaim it — `mktemp` without `-u` creates a persistent named file in `TMPDIR`, not an unlinked or `O_TMPFILE` handle, so it survives until a system tmp cleaner removes it, which is not guaranteed for a user's `TMPDIR`.
- **Suggested fix:** Register a single `trap` on `EXIT` (and `INT`/`TERM`) that removes `DOWNLOAD_FILE` and `DOWNLOAD_ERROR_LOG` if they still exist, and clear the variables once the move succeeds so the trap becomes a no-op on the happy path.

### [a/logic-errors/download-progress-parsing/error-text-discarded-with-progress] curl's explanation of a mid-transfer failure is discarded when it arrives in the same chunk as a progress update

- **Location:** `public/install.sh:347-353`; related: `public/install.sh:598-600`
- **Severity:** Low
- **Confidence:** Medium
- **Defect:** The reader splits curl's stderr on carriage returns and treats each chunk as *either* a progress update *or* an error line. Because curl writes `\r` at the start of each bar update and its final error message after the last update, the trailing chunk contains both a percentage and the error text. The percentage matches first, so the `elif` that would have recorded the message never runs and nothing is appended to `DOWNLOAD_ERROR_LOG`. `download_binary` then finds an empty log and falls back to the generic `Failed to download v<version>`, defeating the intent stated at `public/install.sh:595-597` precisely when curl had something useful to say.
- **Trigger:** Any download that fails after the transfer has started and progress has been reported — a dropped connection, a reset, or a truncated response (`curl: (18)`, `curl: (56)`).
- **Evidence / verification:** Reproduced the loop deterministically against a synthetic stream shaped like curl's output, `\r<bar> 12.3%\r<bar> 63.2%\ncurl: (18) transfer closed with 4096 bytes remaining to read\n`: `DOWNLOAD_ERROR_LOG` ended up with 0 lines and the message `download_binary` would show was the generic `Failed to download v9.9.9`. A control run with a failure that produces no progress at all, `curl: (7) Failed to connect to host`, was captured correctly, which localises the defect to the either/or branch rather than the logging. Refutation attempt: checked whether `download_binary` has a second source for the reason — `public/install.sh:598` reads only that log file, and the pipeline's own exit status is carried separately by `PIPESTATUS` at `public/install.sh:355`, so no explanation survives elsewhere. Remaining uncertainty, and the reason confidence is Medium: the exact byte layout was modelled rather than captured from a live failing transfer, so some curl builds may separate the error with its own `\r`.
- **Suggested fix:** Stop treating the two cases as exclusive. Strip the progress prefix from each chunk and inspect the remainder, or split the chunk on newlines and classify each line on its own, so a line that is not a percentage is still logged even when it shares a chunk with one.

### [b/validation-and-coercion/path-management/install-dir-interpolated-unquoted] `INSTALL_DIR` is written into the shell config unquoted and matched as a regex, so some paths silently point `PATH` elsewhere

- **Location:** `public/install.sh:527`; related: `public/install.sh:489`, `public/install.sh:532-533`, `public/install.sh:568-570`
- **Severity:** Low
- **Confidence:** High
- **Defect:** The line appended to the shell config is built as `export PATH="${INSTALL_DIR}:\$PATH"`, so `INSTALL_DIR` lands inside double quotes in a file the shell later evaluates. A path containing `$` or a backtick is re-expanded at every shell startup, pointing `PATH` at a directory that is not where the binary was installed, while the installer reports success. Separately, `path_contains_install_dir` interpolates the same value into `grep -q "^${INSTALL_DIR}$"` as a regular expression rather than a fixed string, so metacharacters make the membership test unreliable — `.` in the default `~/.local/bin` matches any character, and a bracket expression can match a different entry entirely or fail to compile. The test also does not normalise a trailing slash, so `--install-dir ~/.local/bin/` never matches the existing `PATH` entry and a duplicate is appended.
- **Trigger:** Install with `--install-dir` set to a path containing `$`, a backtick, or a bracket expression — for example `--install-dir '/opt/tools$USER/bin'`, which writes `export PATH="/opt/tools$USER/bin:$PATH"` and resolves at shell startup to a directory that does not hold the binary. Or install with a trailing slash on an install directory already present in `PATH`.
- **Evidence / verification:** Read the three interpolation sites. `public/install.sh:527` places the raw value inside a double-quoted assignment that is echoed verbatim to the config file at `public/install.sh:548`, with no escaping step anywhere between the argument parse at `public/install.sh:713` and the write. `public/install.sh:489` passes the value to `grep -q` with an anchored pattern and no `-F`, unlike `add_to_path` and `remove_from_path`, which correctly use `grep -qF`/`grep -vF` at `public/install.sh:532-533` and `public/install.sh:568-570`. Refutation attempt: checked for validation or quoting of `--install-dir` — the parser at `public/install.sh:709-715` rejects only an empty value or one beginning with `--`, and no other code inspects the path. Cross-checked the Windows counterpart, which compares normalised `PATH` entries with `-contains` and `TrimEnd('\')` (`public/install.ps1:615-626`) and so has neither exposure. Note the value is supplied by the user running the installer, not by any remote input, so this is a correctness defect rather than a security boundary: the documented `curl … | bash` form cannot pass arguments at all.
- **Suggested fix:** Use `grep -qF` with an exact-line match for the membership test and normalise trailing slashes before comparing. When writing the config line, either reject install directories containing characters that are unsafe to interpolate, or emit the path single-quoted so the shell cannot re-expand it.

### [a/null-and-numeric-hazards/path-display/empty-home-prefixes-tilde] With `HOME` empty, every displayed path is shown as if it were inside the home directory

- **Location:** `public/install.sh:201-203`
- **Severity:** Low
- **Confidence:** High
- **Defect:** `display_path` shortens home-relative paths with `${1/#$HOME/\~}`. When `HOME` is empty the pattern is empty too, and a `#`-anchored replacement against an empty pattern matches the zero-length prefix of every string, so `~` is prepended unconditionally. Absolute paths outside the home directory are then reported to the user as home-relative ones, in the `installed to` detail and in the `Next` command the rail ends on — a path the user can copy that does not resolve to where the binary actually is. The pattern is also unquoted, so glob metacharacters in `HOME` are interpreted rather than matched literally.
- **Trigger:** Run the installer in an environment without `HOME` — `env -i bash`, a minimal container, a systemd unit, or a CI runner — combined with an explicit `--install-dir` so the run gets far enough to print paths.
- **Evidence / verification:** Reproduced by calling the function with `HOME=""`: `display_path /opt/tools/bin` returned `~/opt/tools/bin`. Refutation attempt: checked whether an empty `HOME` would abort the run before any path is displayed — it would only do so on the default install path, where `INSTALL_DIR` becomes `/.local/bin` and `mkdir -p` fails; with `--install-dir` pointing somewhere writable the install succeeds and the misrendered paths are printed at `public/install.sh:794`, `public/install.sh:835-838`, and inside the `Next` line at `public/install.sh:824-830`. Also confirmed no caller guards `HOME`: it is read unguarded at `public/install.sh:5` and throughout `get_shell_config_file`.
- **Suggested fix:** Return the path unchanged when `HOME` is empty, and quote the pattern (`${1/#"$HOME"/\~}`) so it is matched literally rather than as a glob.

## Audit Details

### Audit Status

**Partial.** Unmet completion conditions:

1. **One unverified candidate remains.** `C-023` — whether the installed binary consumes bytes from the `curl … | bash` script pipe when invoked as `$BINARY_PATH --version` — could not be resolved. Settling it requires the `primal` binary, and obtaining it means contacting GitHub, which was not approved for this run. Recorded under Exclusions and Limitations rather than reported as a finding.
2. **Planned end-to-end reproductions were blocked.** Three scenario runs prepared in the disposable workspace (happy-path install; unwritable install directory; corrupt-download upgrade) could not be executed: the harness's command-safety classifier was unavailable for the duration of the audit and rejected every non-trivial shell invocation. The findings that would have used them are established by tracing plus the micro-verifications that did run; the two affected findings say so explicitly.

Every other completion condition was met: the included-file and meaningful-flow inventories are enumerated with exact counts, every included file was inspected, every meaningful flow was traced, the dedicated high-risk pass and all three taxonomy tiers were covered, a separate refutation attempt was performed for every finding, a final discovery pass produced no new candidates, and the final worktree comparison confirmed no pre-existing state changed.

### Initial Worktree Snapshot

- **Repository:** `/home/max/Repositories/personal/primal-website`
- **Branch:** `main`
- **Commit:** `bdf0261a843f62c4bdc1f3c32412edd7f09c3b02`
- **Initial worktree state:** clean. `git status --porcelain=v1 -uall` produced no output — no staged changes, no unstaged changes, no untracked files. Staged and unstaged diff hashes were both `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (the SHA-256 of empty input). 87 tracked files.
- **External snapshot manifest digest:** `snapshot.txt` = `0487bbc2cdd2951001112b391e14d115ed119162c5d00b10b0861c59172101bf`; `index-manifest.txt` (full `git ls-files -s` index listing) = `f99fab696f077b21fb1cc890ffeb43768b6c8e7cc38bb1cd35d8b685b28e9511`. Both stored outside the repository, under the session scratchpad.
- **Ignored paths captured:** one — `.firebase/hosting.cHVibGlj.cache`, recorded with its content hash, mode, and type. No ignored-path category was excluded from the preservation guarantee.
- **Pre-existing report:** none. `BUG_FINDINGS.md` did not exist at snapshot time, so no approval to replace an existing report was required and none was requested; this file is newly created.
- **Final comparison result:** **pass at the time it ran, then superseded by concurrent user edits.** After all verification and immediately before this report was written, `git status --short` was empty, both diff hashes were unchanged at `e3b0c44…`, and branch and commit were still `main` / `bdf0261a…` — no captured pre-existing state had changed. A re-check after writing this report shows two further changes: `public/install.ps1` deleted and `public/start/index.html` modified (its Windows install path and the `data-os` switching script removed). **Neither was made by this audit** — the only file this audit wrote inside the repository is `BUG_FINDINGS.md`, and all verification ran in a disposable workspace outside the worktree under an isolated `HOME`. They are concurrent user-authored edits made in the editor while the audit was running, and they have been left exactly as found; nothing was reverted, restored, or cleaned up. Branch and commit are unchanged.
- **Effect on this report:** the audit was performed against commit `bdf0261a…`, where `public/install.ps1` is tracked and `public/start/index.html` still documents the Windows path. The three findings that cite `install.ps1` as parity evidence — `[b/…/linux-arch-assumed-x86-64]`, `[a/…/no-op-reported-as-removal]`, and `[b/…/install-dir-interpolated-unquoted]` — cite it as it exists at that commit, and those citations remain accurate for the audited state. If dropping the Windows installer is intended, the parity arguments still hold on their own terms (each defect is established against `install.sh` alone), but `install.ps1` will no longer be present as a corroborating reference.

### Audit Coverage

**Scope: Named paths — `public/install.sh`.**

Base-ref detection ran first, before the scope question. Candidate list: local `main` (dropped, it is the current branch); `origin/main`, which is simultaneously the remote default reported by `git symbolic-ref --quiet refs/remotes/origin/HEAD` and the configured upstream from `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`. `git merge-base origin/main HEAD` returned `bdf0261a…`, which is `HEAD` itself, and `git rev-list --count` gave 0 commits ahead, so that candidate was discarded for producing an empty diff. **No base ref was detected.** The user was asked with the no-base-ref option set and chose a named path: `install.sh`, resolved to `public/install.sh` (the repository also tracks `public/install.ps1`; `find` confirmed `public/install.sh` is the only `install.sh`).

Named paths is not a change-based scope, so there is **no baseline state** and no attribution step: every defect established within the included set is reportable, and no candidate could be dispositioned pre-existing.

**Seed set (1 file):** `public/install.sh`.

**One-hop first-party dependent expansion (+4 files):**

| File | Why it is a dependent |
| --- | --- |
| `public/start/index.html` | Publishes the documented invocation `curl -fsSL https://primal-lang.org/install.sh \| bash` and states the contract users rely on ("installs the `primal` binary to `~/.local/bin` and updates your shell configuration"). |
| `firebase.json` | Hosting configuration that determines how `install.sh` is served — headers, caching, ignore list, absence of rewrites. |
| `scripts/deploy.sh` | Publishes the file (`firebase deploy --only hosting`). |
| `public/install.ps1` | Parallel resource: the documented Windows counterpart of the same install contract, inspected as evidence of intended behaviour for parity checks. |

**Included first-party files: 5. Inspected: 5. Skipped: 0.** Invariant `included = inspected + skipped` → `5 = 5 + 0`. ✓

Deterministic selection rules and commands: seed from the user-named path, resolved with `find . -name 'install.sh' -not -path '*/.git/*'` and `git ls-files | grep -i install`; dependents from `grep -rn "install\.sh" .` excluding `.git` (which returned exactly `public/install.sh` and `public/start/index.html`), plus the hosting and deploy configuration that serves the file, plus the parallel Windows installer. Inventory-manifest digest: `f99fab696f077b21fb1cc890ffeb43768b6c8e7cc38bb1cd35d8b685b28e9511`. No included path was skipped.

**Counts per module:** installer scripts 2 (`public/install.sh`, `public/install.ps1`); site content 1 (`public/start/index.html`); hosting and release configuration 2 (`firebase.json`, `scripts/deploy.sh`).

**Excluded paths and categories:** the remaining 82 tracked files are outside the named scope and were not inspected — `public/try/js/primal.js` (generated Dart output, also excluded as a vendored artifact), the 60+ `public/reference/**/index.html` pages, `public/try/js/try.js` and `public/try/samples/*.prm`, `public/js/highlight.js`, `public/css/template.css`, the other site sections, and repository metadata. `.firebase/hosting.cHVibGlj.cache` is ignored build output. `.claude/skills/sync-sdk/SKILL.md` and `LICENSE.md`/`README.md` were read as orienting context but are not dependents of the seed and were not audited; the sync-sdk skill documents nothing about the installer or the SDK release artifact layout.

**Findings attribution note:** defects located *in* `public/install.ps1` are outside this scope — it is neither the seed nor a dependent of it — and none are reported. It was read only to establish the intended cross-platform contract, which three findings cite as parity evidence.

**Meaningful flows: 16 total, 16 traced, 0 skipped.** Invariant `total = traced + skipped` → `16 = 16 + 0`. ✓

| ID | Entry point | Material result / side effect | Status |
| --- | --- | --- | --- |
| FL-01 | `main` with no arguments | Resolves the latest release, downloads, installs to `~/.local/bin`, edits the shell config, verifies | Traced |
| FL-02 | `main --version <v>` | Installs the pinned release, skipping latest-version resolution | Traced |
| FL-03 | `main` over an existing installation | Replaces the binary; deliberately skips the `PATH` step | Traced |
| FL-04 | `main` when installed == target | Early exit reporting "Already up to date", no writes | Traced |
| FL-05 | `main --install-dir <p>` | Redirects `INSTALL_DIR`/`BINARY_PATH` and the persisted `PATH` entry | Traced |
| FL-06 | `main --uninstall` → `uninstall` | Removes the binary and the shell-config `PATH` entry | Traced |
| FL-07 | `main --help` → `show_help` | Prints usage, exits 0, no writes | Traced |
| FL-08 | `detect_os` / `detect_arch` | Refuses unsupported OS and Intel macOS before the rail opens | Traced |
| FL-09 | `get_latest_version` / `github_api_error_exit` | Classifies GitHub API failure by HTTP status and aborts with a hint | Traced |
| FL-10 | `download_binary` failure path | Surfaces the downloader's own error, removes temporary files, aborts | Traced |
| FL-11 | `main` downloader precheck | Aborts when neither curl nor wget is present | Traced |
| FL-12 | Rail output layer | TTY vs redirected rendering, UTF-8 vs ASCII glyph fallback, in-place redraw | Traced |
| FL-13 | `main` argument loop | Option parsing, missing-value rejection, unknown-option abort | Traced |
| FL-14 | `verify_installation` | Executes the installed binary as proof it runs; aborts when it does not | Traced |
| FL-15 | Firebase Hosting serving `/install.sh` | Path resolution, security headers, caching of the served script | Traced |
| FL-16 | `public/start/index.html` install instruction | The published one-line invocation and the contract it states | Traced |

**Taxonomy coverage.** All three tiers inspected. Tier A: logic errors (F8; version parsing, progress-bar arithmetic, and the `grep`/`sed` tag fallback traced and refuted), null and numeric hazards (F9), boundary and encoding cases (UTF-8 locale detection, empty download log, zero-byte and huge sizes, `read -d $'\r'` chunking), error handling (F2, F5; every `error_exit` call site and errexit context traced), concurrency (only the benign two-installer `PATH` race exists — no shared mutable state otherwise), resource management (F6), state and lifecycle (rail state variables across subshell boundaries, `BINARY_PATH` resolution ordering). Tier B: contract mismatches (F4, F7), validation and coercion (F10; `--version` and `--install-dir` argument handling), resource and configuration parity (F1; every `case` dispatch checked for missing arms against `public/install.ps1`), security defects (download transport, redirect following, config-file injection reachability, secret exposure — all refuted, see C-026/C-027). Tier C: dead or unreachable behaviour (the `PATH_WAS_MODIFIED` false branch was checked and is reachable), API or library misuse (`curl`/`wget`/`mktemp`/`mv`/`grep` flag usage, `PIPESTATUS` ordering), debt markers (none — no `TODO`, `FIXME`, or `HACK` in the included set).

### Candidate Dispositions

| ID | Primary location | Category | Disposition | Finding / reason |
| --- | --- | --- | --- | --- |
| C-001 | `install.sh:259` | resource-and-configuration-parity | Finding | `[b/…/linux-arch-assumed-x86-64]` |
| C-002 | `install.sh:607-616` | error-handling | Finding | `[a/…/no-rollback-on-verification-failure]` |
| C-003 | `install.sh:555-573` | error-handling | Finding | `[a/…/no-op-reported-as-removal]` |
| C-004 | `install.sh:563-572` | contract-mismatches | Finding | `[b/…/symlinked-config-replaced-by-temp-file]` |
| C-005 | `install.sh:792` | error-handling | Finding | `[a/…/unrouted-errexit-aborts-mid-rail]` |
| C-006 | `install.sh:804` | error-handling | Merged | Same root cause as C-005 |
| C-007 | `install.sh:591-592` | error-handling | Merged | Same root cause as C-005 |
| C-008 | `install.sh:650-652` | error-handling | Merged | Same root cause as C-005 |
| C-009 | `install.sh:591` | resource-management | Finding | `[a/…/downloaded-file-leaked-on-failure]` |
| C-010 | `install.sh:506-508` | contract-mismatches | Finding | `[b/…/config-file-not-sourced-by-shell]` |
| C-011 | `install.sh:497-505` | contract-mismatches | Merged | Same root cause as C-010 (macOS login shells) |
| C-012 | `install.sh:512-515` | contract-mismatches | Merged | Same root cause as C-010 (csh family) |
| C-013 | `install.sh:797` | contract-mismatches | Merged | Same root cause as C-010 (never re-attempted) |
| C-014 | `install.sh:347-353` | logic-errors | Finding | `[a/…/error-text-discarded-with-progress]` |
| C-015 | `install.sh:201-203` | null-and-numeric-hazards | Finding | `[a/…/empty-home-prefixes-tilde]` |
| C-016 | `install.sh:527` | validation-and-coercion | Finding | `[b/…/install-dir-interpolated-unquoted]` |
| C-017 | `install.sh:489` | validation-and-coercion | Merged | Same root cause as C-016 (regex interpolation) |
| C-018 | `install.sh:489` | validation-and-coercion | Merged | Same root cause as C-016 (trailing slash) |
| C-019 | `install.sh:765` | error-handling | Refuted | Verified errexit fires on the failed assignment; the parent exits without re-reporting, so the rail is not closed twice |
| C-020 | `install.sh:742` | error-handling | Refuted | `RAIL_STARTED` is false in the subshell, so the plain `Error:` form is used, then errexit aborts — correct |
| C-021 | `install.sh:355` | api-or-library-misuse | Refuted | `${PIPESTATUS[0]}` is expanded before `return` executes and no command intervenes |
| C-022 | `install.sh:346-356` | error-handling | Refuted | Call site is `if ! download_file`, which suppresses errexit through the whole call chain, so the status reaches the caller |
| C-023 | `install.sh:478`, `install.sh:623` | api-or-library-misuse | **Unverified** | Cannot determine whether `primal --version` reads stdin, which under `curl \| bash` is the script pipe; needs the binary |
| C-024 | `install.sh:421-425` | api-or-library-misuse | Refuted | A BEGIN-only awk program reads no input, so it cannot consume the script pipe |
| C-025 | `install.sh:760-772` | validation-and-coercion | Refuted | An unvalidated `--version` fails loudly on the download with an actionable hint; no silent incorrect result |
| C-026 | `install.sh:588` | security-defects | Refuted | Scheme and host are a fixed prefix; `..` normalises within the repository path, so the download cannot be redirected off github.com |
| C-027 | `install.sh:584-605` | security-defects | Refuted | HTTPS to a pinned host and path; absence of a checksum is a hardening gap with no established incorrect behaviour |
| C-028 | `install.sh:360-369` | error-handling | Refuted | Intended: the comment at 596-597 documents that `wget -q` leaves nothing and the generic fallback covers it |
| C-029 | `install.sh:421-425` | boundary-and-encoding-cases | Refuted | A locale-specific decimal separator is correct rendering, not an incorrect result |
| C-030 | `install.sh:300-316` | boundary-and-encoding-cases | Refuted | Loop is bounded by `width`; curl cannot report a percentage outside 0-100 |
| C-031 | `install.sh:470` | logic-errors | Refuted | Traced greedy matching for v-prefixed, bare, and non-numeric tags; all three parse correctly |
| C-032 | `install.sh:466` | error-handling | Refuted | jq's parse error is cosmetic noise; the empty result is caught by the version regex at 768 |
| C-033 | `install.sh:530-551` | concurrency | Refuted | Worst case is a duplicate `PATH` entry; no incorrect behaviour |
| C-034 | `install.sh:106-124` | boundary-and-encoding-cases | Refuted | Wrapped progress line on a very narrow terminal is a redraw artifact only |
| C-035 | `install.sh:612` | boundary-and-encoding-cases | Refuted | A directory at `BINARY_PATH` fails loudly at the Verified step via empty `--version` output |
| C-036 | `install.sh:494` | null-and-numeric-hazards | Refuted | Unset `$SHELL` falls through to `*)` → `~/.profile`, which is the intended default |
| C-037 | `install.sh:478`, `install.sh:623` | api-or-library-misuse | Refuted | No timeout on the version probe; a pre-existing hung binary is not a defect this logic introduces |
| C-038 | `firebase.json:26-31` | resource-and-configuration-parity | Refuted | No explicit `Cache-Control` for `.sh`; default CDN caching of an installer script is not an incorrect result |
| C-039 | `start/index.html:107` | contract-mismatches | Refuted | `show_help` documents the file-invocation form accurately; the piped form's inability to pass flags is not an incorrect asserted contract |

**Counts:** findings 10, merged 8, refuted 20, pre-existing 0, unverified 1. **Total candidates 39.**
Invariant `total = findings + merged + refuted + pre-existing + unverified` → `39 = 10 + 8 + 20 + 0 + 1`. ✓
Reported findings 10 = findings count 10. ✓

### Verification Performed

The repository has no test suite, no package manager, and no linter — it is a static site with CDN dependencies — so verification was direct execution of the audited logic in a disposable workspace outside the repository, built from a copy of `public/install.sh` whose SHA-256 was confirmed identical to the audited file (`5caf2fe84775760aee5c3c2526b7478bd6e7bd13f67fb033760884b483150bf9`). Network access was stubbed throughout: a fake `curl` on `PATH` served a canned GitHub API response and wrote a synthetic binary, so **no external service was contacted**. Every run used an isolated fake `HOME` and `TMPDIR`.

Executed and confirmed:

- **Linux architecture selection** — with `uname` stubbed to report `Linux`/`aarch64`, `detect_os` returned `linux` and `detect_arch linux` returned `x86-64`. Establishes C-001.
- **`remove_from_path` status with no Primal entry** — returned 0 against an unmodified `~/.bashrc` (SHA-256 unchanged). Establishes C-003.
- **`remove_from_path` against a symlinked config** — `~/.bashrc` went from `symbolic link` to `regular file mode=600`, the managed target still contained the installer's comment and export line, and the function returned 0. Establishes C-004.
- **`get_shell_config_file` with `ZDOTDIR`** — returned `$HOME/.zshrc` while zsh reads `$ZDOTDIR/.zshrc`. Establishes C-010.
- **`display_path` with an empty `HOME`** — `/opt/tools/bin` rendered as `~/opt/tools/bin`. Establishes C-015.
- **Progress/error chunk classification** — the real loop body from `download_with_curl` fed a synthetic curl stream in which the error follows the last progress update produced an empty error log and the generic fallback message; a control stream with the error alone was captured correctly. Establishes C-014 and localises it to the either/or branch.
- **errexit on assignment from a failing command substitution** — `v=$(f)` with `f` exiting 1 aborted the script with status 1 and never reached the next statement. Refutes C-019 and confirms the mechanism behind C-005.

Refutation work: every finding received a separate refutation attempt after its reachability analysis, documented in its own **Evidence / verification** section — searching for a preventing guard, invariant, caller contract, or later check that would catch the defect, and cross-checking `public/install.ps1` where a parity claim is made. Twenty candidates were refuted outright and are recorded above with the specific evidence that disproved them. A final discovery pass over `public/install.sh` produced no new candidates.

Worktree integrity was checked before and after verification: `git status --short` empty, staged and unstaged diff hashes both `e3b0c44…`, matching the initial snapshot.

### Exclusions and Limitations

- **Unverified candidate C-023 — installed binary and the `curl \| bash` script pipe.** `get_installed_version` (`public/install.sh:478`) and `verify_installation` (`public/install.sh:623`) invoke `$BINARY_PATH --version` without redirecting stdin. Under the documented `curl -fsSL … | bash`, the script's stdin *is* the pipe carrying the remainder of the script, and bash reads a non-seekable script one byte at a time precisely because it cannot push bytes back. Any child that reads stdin therefore consumes script text the shell has not parsed yet. Whether `primal --version` reads stdin cannot be determined from this repository. **Blocker:** the binary is not present and fetching it requires contacting GitHub, which was not approved for this run. **Unresolved question:** does `primal --version` perform any read on stdin? Redirecting these two invocations from `/dev/null` would make the question moot regardless of the answer. Not reported as a finding, per the rule that unverified candidates are never promoted.
- **Blocked end-to-end reproductions.** Three prepared scenario runs — happy-path fresh install, unwritable install directory (`mkdir -p` failure inside `install_binary`), and a corrupt-download upgrade over a working binary — could not be executed. The harness's command-safety classifier was unavailable for the whole session and rejected every non-trivial shell invocation after the micro-verification batch had already run; roughly a dozen retries over the course of the audit all failed with the same unavailability error. Affected findings are `[a/…/no-rollback-on-verification-failure]` and `[a/…/unrouted-errexit-aborts-mid-rail]`; both are established by tracing plus the errexit micro-verification, and both state the gap in their evidence section. The scenario scripts remain reproducible from the descriptions in this report.
- **Modelled rather than captured curl output.** The byte layout used to establish `[a/…/error-text-discarded-with-progress]` was modelled on curl's documented `\r`-prefixed progress-bar updates rather than captured from a live failing transfer, because inducing a mid-transfer failure needs a local server the blocked classifier prevented starting. This is the sole reason that finding is Medium rather than High confidence.
- **Scope boundary.** Only `public/install.sh` and its four one-hop dependents were audited. `public/install.ps1` was read as parity evidence, and defects located in it are out of scope and unreported; the same is true of the 82 tracked files outside the named scope, which were not inspected at all. This audit says nothing about the playground, the reference pages, or the generated compiler.
- **No baseline attribution.** Named paths has no baseline state, so no finding here is claimed to be newly introduced or pre-existing — the distinction does not apply to this scope.
- **External behaviour assumed, not observed.** The GitHub release artifact layout (`bin/primal-<os>-<arch>` under a `v<version>` tag), the set of published architectures, and the GitHub API response shape were taken from the two installers' agreement with each other; nothing was fetched to confirm them. The `sync-sdk` skill documents nothing about installer artifacts.

### Summary

**By severity:** Critical 0, High 1, Medium 4, Low 5. **Total 10.**

**By confidence:** High 8, Medium 2, Low 0. **Total 10.**

| Severity | High confidence | Medium confidence | Low confidence | Total |
| --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 |
| High | 1 | 0 | 0 | 1 |
| Medium | 3 | 1 | 0 | 4 |
| Low | 4 | 1 | 0 | 5 |
| **Total** | **8** | **2** | **0** | **10** |

**Unique affected files: 1**

- `public/install.sh` — all 10 findings.

The strongest thread running through them is that the installer commits before it checks: the wrong artifact is selected for aarch64 Linux, moved over a working binary, and only then found unrunnable, with no rollback and no temporary-file cleanup. The second thread is success reported without evidence — the shell-config edit and the uninstall `PATH` removal both print a confident result derived from "the write succeeded" rather than from "the entry is now effective" or "something was actually removed". Three findings cite `public/install.ps1`, which already handles the same case correctly, as evidence of the intended contract.
