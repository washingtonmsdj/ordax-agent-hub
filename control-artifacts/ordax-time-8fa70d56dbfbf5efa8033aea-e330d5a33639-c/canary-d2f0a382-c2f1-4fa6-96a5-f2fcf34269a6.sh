#!/bin/sh
set -eu
umask 077
w="${ORDAX_DEVELOP_WORKSPACE_ROOT:-/mnt/platform/state/control-plane/development/workspace}"
p="${ORDAX_DEVELOP_PERSIST_ROOT:-/mnt/platform/state/control-plane/development}"
h="${ORDAX_DEVELOP_WORKSPACE_HELPER:-/ordax/control-plane/ordax-development-workspace}"
a="${ORDAX_DEVELOP_ADAPTER_ROOT:-/ordax/control-plane/development-adapters}"
c="$p/checkpoints"
s="$a/command/ordax-module-sync"
m=ordax.time
o=ordax.time
b=ordax-time-8fa70d56dbfbf5efa8033aea-e330d5a33639-c
d=8fa70d56dbfbf5efa8033aeacb53a34da14e9531f94d0cd0732d03984a40046e
r=TIME_READY
fail(){ printf 'ORDAX_MAILBOX_FAST_APPLY=FAIL reason=%s\n' "$1" >&2; exit "${2:-1}"; }
hex(){ [ "${#1}" -eq 64 ] && printf %s "$1"|grep -Eq '^[0-9a-f]{64}$'; }
reg(){ [ -f "$1" ]&&[ ! -L "$1" ]&&[ "$(stat -c %h "$1" 2>/dev/null||echo 0)" = 1 ]; }
cur(){ x=/mnt/platform/state/development/sync/$1/current; if [ ! -e "$x" ]&&[ ! -L "$x" ];then echo absent;return;fi; reg "$x"||return 1; [ "$(stat -c %a:%u:%g "$x")" = 600:0:0 ]||return 1; v=$(tr -d '\r\n'<"$x"); [ "$v" = baseline ]||hex "$v"||return 1; echo "$v"; }
put(){ rel=$1; want=$2; bytes=$3; src=$4; effect=$5; x=$w/$rel; reg "$x"||fail slot-unsafe 31; [ "$(stat -c %a:%u:%g "$x")" = 600:0:0 ]||fail slot-mode 32; have=$(sha256sum "$x"|awk '{print $1}'); size=$(stat -c %s "$x"); if [ "$have" != "$want" ]||[ "$size" != "$bytes" ];then /bin/busybox base64 "$src"|tr -d '\n'|"$h" patch "$w" "$rel" "$have" "$c" "$effect"||fail workspace-patch 33;fi; [ "$(sha256sum "$x"|awk '{print $1}')" = "$want" ]&&[ "$(stat -c %s "$x")" = "$bytes" ]||fail slot-readback 34; }
[ "$(id -u 2>/dev/null||echo 1)" = 0 ]||fail root-required 20
[ -d "$w" ]&&[ ! -L "$w" ]||fail workspace-invalid 21
[ -d "$c" ]&&[ ! -L "$c" ]||fail checkpoint-invalid 22
[ -x "$h" ]&&[ ! -L "$h" ]||fail helper-invalid 23
[ -x "$s" ]&&[ ! -L "$s" ]||fail adapter-invalid 24
/bin/busybox --list|grep -Fxq wget||fail busybox-wget-missing 26
/bin/busybox --list|grep -Fxq base64||fail busybox-base64-missing 27
t=$(mktemp -d /tmp/otc.XXXXXX)||fail tmp-create 28
trap 'rm -rf "$t"' EXIT HUP INT TERM
f0=$t/f0
/bin/busybox wget -q -O "$f0" https://raw.githubusercontent.com/washingtonmsdj/novo-ordax-os/e330d5a33639f69843f2417b02e20f2513f37427/pendrive/platform/services/time/bin/time-readiness||fail source-fetch-0 29
[ "$(stat -c %s "$f0")" = 6509 ]||fail source-size-0 29
[ "$(sha256sum "$f0"|awk '{print $1}')" = 15410bcc89998592e1463518d974b00b639a365d0f378e2a6e1f22e90cc1bd86 ]||fail source-hash-0 29
f1=$t/f1
/bin/busybox wget -q -O "$f1" https://raw.githubusercontent.com/washingtonmsdj/novo-ordax-os/e330d5a33639f69843f2417b02e20f2513f37427/pendrive/platform/runtime/readiness/lib/readiness.sh||fail source-fetch-1 29
[ "$(stat -c %s "$f1")" = 35338 ]||fail source-size-1 29
[ "$(sha256sum "$f1"|awk '{print $1}')" = 9e6c598cd6437d05054c860bcb91b33d0a60671e484fb460a140837b02ad6260 ]||fail source-hash-1 29
f2=$t/f2
/bin/busybox wget -q -O "$f2" https://raw.githubusercontent.com/washingtonmsdj/novo-ordax-os/e330d5a33639f69843f2417b02e20f2513f37427/pendrive/platform/runtime/schemas/readiness/ordax.readiness.json||fail source-fetch-2 29
[ "$(stat -c %s "$f2")" = 1213 ]||fail source-size-2 29
[ "$(sha256sum "$f2"|awk '{print $1}')" = b3b0f354db3e284a78c4b7acad66a6e92f61603c375d9ca8e551857d996e4996 ]||fail source-hash-2 29
f3=$t/f3
/bin/busybox wget -q -O "$f3" https://raw.githubusercontent.com/washingtonmsdj/novo-ordax-os/e330d5a33639f69843f2417b02e20f2513f37427/pendrive/platform/runtime/schemas/readiness/ordax.time-readiness.json||fail source-fetch-3 29
[ "$(stat -c %s "$f3")" = 1491 ]||fail source-size-3 29
[ "$(sha256sum "$f3"|awk '{print $1}')" = a7db1f109bfdb3aac5919754a070ccb738e99a8debcd8837f44cb11701067413 ]||fail source-hash-3 29
fm=$t/meta
/bin/busybox wget -q -O "$fm" https://raw.githubusercontent.com/washingtonmsdj/ordax-agent-hub/f82e280c5dcd6630a72c8a06bbc85512339e26bd/control-artifacts/ordax-time-8fa70d56dbfbf5efa8033aea-e330d5a33639-c/meta||fail meta-fetch 29
[ "$(stat -c %s "$fm")" = 2656 ]||fail meta-size 29
[ "$(sha256sum "$fm"|awk '{print $1}')" = c9edd08ec0fefdddd8f819f9bce5f821d663e9ed5a9bb003cd4c4df7194a6fc1 ]||fail meta-hash 29
boot=$(cat /proc/sys/kernel/random/boot_id)
tb=$(cur "$m")||fail target-before 25
nb=$(cur ordax.network)||fail network-before 25
rb=$(cur ordax.remote-core)||fail remote-before 25
sb=$(cur ordax.surface)||fail surface-before 25
cb=$(cur ordax.control-plane)||fail control-before 25
put sync-module.chunk-0000 15410bcc89998592e1463518d974b00b639a365d0f378e2a6e1f22e90cc1bd86 6509 "$f0" mb-d2f0a382c2f14fa696a5-c0000
put sync-module.chunk-0001 9e6c598cd6437d05054c860bcb91b33d0a60671e484fb460a140837b02ad6260 35338 "$f1" mb-d2f0a382c2f14fa696a5-c0001
put sync-module.chunk-0002 b3b0f354db3e284a78c4b7acad66a6e92f61603c375d9ca8e551857d996e4996 1213 "$f2" mb-d2f0a382c2f14fa696a5-c0002
put sync-module.chunk-0003 a7db1f109bfdb3aac5919754a070ccb738e99a8debcd8837f44cb11701067413 1491 "$f3" mb-d2f0a382c2f14fa696a5-c0003
put sync-module.meta c9edd08ec0fefdddd8f819f9bce5f821d663e9ed5a9bb003cd4c4df7194a6fc1 2656 "$fm" mb-d2f0a382c2f14fa696a5-meta
out=$("$s" "$w")||{ z=$?;printf '%s\n' "$out";fail module-sync "$z";}
printf '%s\n' "$out"
mark="ORDAX_MODULE_SYNC=PASS module=$m bundle_id=$b bundle_digest=$d owner=$o readiness=$r publish=atomic rollback=automatic"
printf '%s\n' "$out"|grep -Fqx "$mark"||fail module-sync-receipt 40
ta=$(cur "$m")||fail target-after 41
[ "$ta" = "$d" ]||fail promotion-mismatch 42
[ "$(cur ordax.network)" = "$nb" ]||fail unrelated-network 43
[ "$(cur ordax.remote-core)" = "$rb" ]||fail unrelated-remote 43
[ "$(cur ordax.surface)" = "$sb" ]||fail unrelated-surface 43
[ "$(cur ordax.control-plane)" = "$cb" ]||fail unrelated-control 43
[ "$(cat /proc/sys/kernel/random/boot_id)" = "$boot" ]||fail unexpected-reboot 44
f=/run/ordax/readiness/time.env;reg "$f"||fail time-readiness-file 45;[ "$(stat -c %a:%u:%g "$f")" = 644:0:0 ]||fail time-readiness-mode 46;[ "$(grep -c '^state=READY$' "$f" 2>/dev/null||echo 0)" = 1 ]||fail time-not-ready 47;[ "$(grep -c '^producer=ordax.time$' "$f" 2>/dev/null||echo 0)" = 1 ]||fail time-producer 48;echo TIME_READY=READY
printf 'ORDAX_MAILBOX_FAST_APPLY=PASS module=%s bundle_id=%s bundle_digest=%s\n' "$m" "$b" "$d"
printf 'READINESS=%s\nPREVIOUS_ACTIVE_RELEASE=%s\nACTIVE_RELEASE=%s\nUNRELATED_MODULE_MUTATION=NO\nREBOOT=NO\n' "$r" "$tb" "$ta"
